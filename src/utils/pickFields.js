export function pickFields(source, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => Object.hasOwn(source, field))
      .map((field) => [field, source[field]])
  );
}
