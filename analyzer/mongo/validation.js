export function validateMongoDocument(document, modeling = false) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('O documento deve ser um objeto JSON.');
  if (modeling) {
    for (const key of ['principles', 'decisions']) {
      if (!Array.isArray(document[key]) || document[key].some((item) => !item || typeof item.title !== 'string' || typeof item.description !== 'string')) throw new Error(`${key} deve conter uma lista de títulos e descrições.`);
    }
    return;
  }
  for (const key of ['name', 'title', 'description', 'status', 'pattern']) {
    if (typeof document[key] !== 'string' || !document[key].trim()) throw new Error(`Informe ${key} como texto não vazio.`);
  }
  if (!Array.isArray(document.fields) || document.fields.some((field) => !field || typeof field.name !== 'string' || typeof field.type !== 'string' || typeof field.description !== 'string')) throw new Error('fields deve conter campos com name, type e description.');
  if (document.fields.some((field) => field.references !== undefined && (typeof field.references !== 'string' || !field.references.trim()))) throw new Error('references deve ser o nome de uma collection.');
  if (!document.example || typeof document.example !== 'object' || Array.isArray(document.example)) throw new Error('example deve ser um objeto JSON.');
  for (const key of ['notes', 'indexes']) {
    if (!Array.isArray(document[key]) || document[key].some((item) => typeof item !== 'string')) throw new Error(`${key} deve ser uma lista de textos.`);
  }
}
