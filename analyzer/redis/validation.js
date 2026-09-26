export function validateRedisDocument(document, modeling = false) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('O documento deve ser um objeto JSON.');
  const strings = (items) => Array.isArray(items) && items.every((item) => typeof item === 'string');
  const text = (item, keys) => item && keys.every((key) => typeof item[key] === 'string' && item[key].trim());
  if (modeling) {
    for (const key of ['principles', 'decisions']) {
      if (!Array.isArray(document[key]) || !document[key].every((item) => text(item, ['title', 'description']))) throw new Error(`${key} deve conter títulos e descrições.`);
    }
    if (!Array.isArray(document.flows) || !document.flows.every((flow) => text(flow, ['id', 'title', 'status']) && Array.isArray(flow.steps) && flow.steps.length > 0 && flow.steps.every((step) => text(step, ['title', 'description']) && (step.keyId === undefined || typeof step.keyId === 'string')))) throw new Error('flows deve conter fluxos com id, title, status e etapas descritivas.');
    if (new Set(document.flows.map((flow) => flow.id)).size !== document.flows.length) throw new Error('ID de fluxo duplicado.');
    return;
  }
  if (!text(document, ['id', 'title', 'key', 'type', 'category', 'status', 'description', 'ttl', 'producer', 'consumer'])) throw new Error('Informe id, title, key, type, category, status, description, ttl, producer e consumer como texto não vazio.');
  if (!['Implementado', 'Proposta'].includes(document.status)) throw new Error('status deve ser Implementado ou Proposta.');
  if (!['List', 'String'].includes(document.type)) throw new Error('type deve ser List ou String.');
  for (const key of ['commands', 'notes']) if (!strings(document[key])) throw new Error(`${key} deve ser uma lista de textos.`);
  if (!Array.isArray(document.fields) || !document.fields.every((field) => text(field, ['name', 'type', 'description']))) throw new Error('fields deve conter name, type e description.');
  if (document.example === undefined) throw new Error('Informe um exemplo ilustrativo.');
  if (!Array.isArray(document.evidence) || !document.evidence.every((entry) => text(entry, ['repo', 'file', 'symbol']))) throw new Error('evidence deve conter repo, file e symbol.');
}
