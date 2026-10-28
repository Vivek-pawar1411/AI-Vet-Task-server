import axios from "axios";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const providers = {
  openrouter: {
    baseUrl: () => process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: () => process.env.OPENROUTER_API_KEY,
  },
  nvidia: {
    baseUrl: () => process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: () => process.env.NVIDIA_API_KEY,
  },
};

const OPENROUTER_FREE_ROUTER = {
  id: "openrouter/free",
  name: "OpenRouter Free (automatic model selection)",
};
const MAX_MODELS_PER_PROVIDER = 2;
const PREFERRED_MODEL_PATTERNS = [
  /llama[-/. ]?3[. ]?3.*70b/i,
  /llama[-/. ]?3[. ]?1.*8b/i,
  /llama.*instruct/i,
  /mistral.*instruct/i,
  /qwen.*instruct/i,
  /gemma.*it/i,
  /deepseek.*chat/i,
];

function providerConfig(provider) {
  const config = providers[provider];
  if (!config) throw new AppError("Provider must be openrouter or nvidia", 400);
  const apiKey = config.apiKey();
  if (!apiKey) throw new AppError(`${provider} API key is missing in .env`, 503);
  return { baseUrl: config.baseUrl().replace(/\/$/, ""), apiKey };
}

function getOpenRouterFreeModels(models) {
  return models
    .filter((model) => {
      if (typeof model.id !== "string") return false;
      if (model.id.endsWith(":free")) return true;

      const promptPrice = Number(model.pricing?.prompt);
      const completionPrice = Number(model.pricing?.completion);
      return Number.isFinite(promptPrice)
        && Number.isFinite(completionPrice)
        && promptPrice === 0
        && completionPrice === 0;
    })
    .map((model) => ({ id: model.id, name: model.name || model.id, created: model.created }));
}

function limitModels(models, limit = MAX_MODELS_PER_PROVIDER) {
  return models
    .map((model, index) => ({
      id: model.id,
      name: model.name || model.id,
      index,
      priority: PREFERRED_MODEL_PATTERNS.findIndex((pattern) => pattern.test(`${model.id} ${model.name || ""}`)),
    }))
    .sort((left, right) => {
      const leftPriority = left.priority === -1 ? PREFERRED_MODEL_PATTERNS.length : left.priority;
      const rightPriority = right.priority === -1 ? PREFERRED_MODEL_PATTERNS.length : right.priority;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name }));
}

function getProviderHeaders(provider, apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(provider === "openrouter" ? {
      "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
      "X-Title": "AV Vet",
    } : {}),
  };
}

async function fetchProviderCatalog(provider, baseUrl, apiKey) {
  const response = await axios.get(`${baseUrl}/models`, {
    headers: getProviderHeaders(provider, apiKey),
    timeout: 15000,
  });

  const catalog = Array.isArray(response.data.data) ? response.data.data : [];
  return provider === "openrouter"
    ? getOpenRouterFreeModels(catalog)
    : catalog
      .filter((model) => typeof model.id === "string")
      .map((model) => ({ id: model.id, name: model.name || model.id }));
}

function handleProviderError(error, provider, model) {
  const status = error.response?.status;
  const modelLabel = model ? ` for model "${model}"` : "";
  console.error(`[AI Controller] ${provider} request failed${modelLabel} (${status || error.code || "network error"}).`);

  if (status === 401 || status === 403) {
    throw new AppError(`${provider} rejected the API credentials. Check the server configuration.`, 502);
  }
  if (status === 404) {
    throw new AppError(`${provider} could not find the requested model or endpoint${modelLabel}. Check the model ID and provider configuration.`, 502);
  }
  if (status === 410) {
    throw new AppError(`${provider} no longer serves the requested model or endpoint${modelLabel}. Choose a currently available model.`, 502);
  }
  if (status === 429) {
    throw new AppError(`${provider} is rate limiting requests. Please try again shortly.`, 429);
  }
  if (status) {
    throw new AppError(`${provider} request failed with status ${status}. Please try again or choose another model.`, 502);
  }
  if (error.code === "ECONNABORTED") {
    throw new AppError(`${provider} request timed out. Please try again.`, 504);
  }
  if (error.request) {
    throw new AppError(`Could not connect to ${provider}. Check the server network and try again.`, 502);
  }
  throw error;
}

export const listModels = asyncHandler(async (req, res) => {
  const provider = req.params.provider?.toLowerCase();
  if (!providers[provider]) throw new AppError("Provider must be openrouter or nvidia", 400);
  const { baseUrl, apiKey } = providerConfig(provider);

  try {
    const catalog = await fetchProviderCatalog(provider, baseUrl, apiKey);
    const models = limitModels(catalog);
    if (provider === "openrouter") models.unshift(OPENROUTER_FREE_ROUTER);
    res.json({ models });
  } catch (error) {
    handleProviderError(error, provider);
  }
});

export const createInference = asyncHandler(async (req, res) => {
  const { model, symptoms, pet } = req.body;
  const provider = typeof req.body.provider === "string" ? req.body.provider.toLowerCase() : "";
  if (!providers[provider]) throw new AppError("Provider must be openrouter or nvidia", 400);
  if (typeof model !== "string" || !model.trim()) throw new AppError("A model is required", 400);
  if (typeof symptoms !== "string" || !symptoms.trim() || symptoms.length > 5000) {
    throw new AppError("Symptoms are required and must be under 5000 characters", 400);
  }

  const petContext = pet && typeof pet === "object"
    ? `Pet context: name=${String(pet.name || "Pet").slice(0, 100)}, species=${String(pet.species || "Pet").slice(0, 60)}, breed=${String(pet.breed || "Unknown").slice(0, 100)}, age=${String(pet.age ?? "Unknown").slice(0, 30)}, weight=${String(pet.weight ?? "Unknown").slice(0, 30)}, medical notes=${String(pet.medicalNotes || "none").slice(0, 1000)}.`
    : "No pet details provided.";

  const { baseUrl, apiKey } = providerConfig(provider);

  try {
    const catalog = await fetchProviderCatalog(provider, baseUrl, apiKey);
    const isFreeRouter = provider === "openrouter" && model.trim() === OPENROUTER_FREE_ROUTER.id;
    const isAvailable = limitModels(catalog).some((item) => item.id === model.trim());
    if (!isFreeRouter && !isAvailable) {
      throw new AppError(
        provider === "openrouter"
          ? "That model is not in the current free-model shortlist. Refresh the model list and choose one of the displayed models."
          : "That NVIDIA model is not in the current shortlist. Refresh the model list and choose one of the displayed models.",
        400
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    handleProviderError(error, provider, model.trim());
  }

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: model.trim(),
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: "You are an informational veterinary support assistant, not a veterinarian. Never diagnose, prescribe, or recommend medication dosages. Give cautious general information, ask relevant follow-up questions, clearly identify emergency warning signs, and advise consulting a licensed veterinarian. State that your response is not a substitute for professional veterinary care.",
          },
          { role: "user", content: `${petContext}\n\nSymptoms: ${symptoms.trim()}` },
        ],
      },
      { headers: getProviderHeaders(provider, apiKey), timeout: 45000 }
    );

    const advice = response.data.choices?.[0]?.message?.content;
    if (typeof advice !== "string" || !advice.trim()) {
      throw new AppError("The AI provider returned an empty response. Try another model.", 502);
    }

    res.json({
      advice,
      model: response.data.model || model,
    });
  } catch (error) {
    handleProviderError(error, provider, model.trim());
  }
});