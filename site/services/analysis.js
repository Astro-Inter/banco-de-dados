// Espelha analyzer/impact/weights.js: a configuração dos pesos é central e não
// deve ser ajustada caso a caso pelas telas.
const impactWeights = Object.freeze({
  dataload: 1,
  index: 2,
  trigger: 3,
  view: 2,
  function: 3,
  procedure: 3,
  table: 2,
  'log-table': 2,
  foreignKey: 4,
  primaryKey: 4,
  constraint: 2,
  removedObject: 5,
  indirectDependency: 3
});

const impactLevels = Object.freeze([
  { max: 3, label: 'BAIXA' },
  { max: 8, label: 'MÉDIA' },
  { max: 15, label: 'ALTA' },
  { max: Infinity, label: 'CRÍTICA' }
]);

function key(value = '') {
  return String(value).toLowerCase().replace(/^(dbo|public)\./, '');
}

function containsIdentifier(code = '', identifier = '') {
  if (!identifier) return true;
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`, 'i').test(code);
}

function directReferenceMatches(object, target, element) {
  if (!element) return true;
  const elementKey = key(element);

  if (object.type === 'index' && key(object.table) === key(target.name)) {
    return (object.columns ?? []).some((column) => key(column) === elementKey);
  }

  if (object.type === 'table') {
    return (object.columns ?? []).some((column) => key(column.references) === key(target.name)
      && (!column.referencesColumn || key(column.referencesColumn) === elementKey));
  }

  // Se o snapshot não tiver o código do dependente, mantenha uma análise
  // conservadora com base no grafo em vez de ignorar a dependência.
  if (!object.code) return true;
  return containsIdentifier(object.code, element);
}

function collectAffected(objects, target, element) {
  const byName = new Map(objects.map((object) => [key(object.name), object]));
  const affected = [];
  const visited = new Set([target.id]);
  const queue = [];

  for (const name of target.usedBy ?? []) {
    const object = byName.get(key(name));
    if (!object || visited.has(object.id) || !directReferenceMatches(object, target, element)) continue;
    visited.add(object.id);
    affected.push({ ...object, depth: 1 });
    queue.push({ object, depth: 1 });
  }

  while (queue.length) {
    const current = queue.shift();
    for (const name of current.object.usedBy ?? []) {
      const next = byName.get(key(name));
      if (!next || visited.has(next.id)) continue;
      visited.add(next.id);
      affected.push({ ...next, depth: current.depth + 1 });
      queue.push({ object: next, depth: current.depth + 1 });
    }
  }

  return affected;
}

export function findObjectPath(objects, originName, destinationName) {
  const byName = new Map(objects.map((object) => [key(object.name), object]));
  const origin = byName.get(key(originName));
  const destination = byName.get(key(destinationName));
  if (!origin || !destination) return [];

  const queue = [[origin]];
  const visited = new Set([origin.id]);

  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    if (current.id === destination.id) {
      return path.map((object) => ({ id: object.id, name: object.name, type: object.type }));
    }

    const adjacent = [...(current.usedBy ?? []), ...(current.dependencies ?? [])];
    for (const name of adjacent) {
      const next = byName.get(key(name));
      if (!next || visited.has(next.id)) continue;
      visited.add(next.id);
      queue.push([...path, next]);
    }
  }

  return [];
}

export function analyzeImpactClient(database, request) {
  const target = database.objects.find((object) => key(object.name) === key(request.object));
  if (!target) throw new Error('Objeto não encontrado para análise.');

  const element = String(request.element ?? '').trim() || null;
  const affected = collectAffected(database.objects, target, element);
  let score = request.changeType === 'remove-object' ? impactWeights.removedObject : 0;
  const reasons = [];

  if (request.changeType === 'remove-object') {
    reasons.push(`A remoção de ${target.name} adiciona +${impactWeights.removedObject} ao risco base.`);
  }

  for (const object of affected) {
    const weight = impactWeights[object.type] ?? 1;
    score += weight;
    const scope = object.depth === 1 ? 'diretamente' : `indiretamente no nível ${object.depth}`;
    reasons.push(`${object.type} ${object.name} é afetado ${scope} (+${weight}).`);
    if (object.depth > 1) {
      score += impactWeights.indirectDependency;
      reasons.push(`${object.name} adiciona custo de dependência indireta (+${impactWeights.indirectDependency}).`);
    }
  }

  if (element && target.type === 'table') {
    const column = target.columns?.find((item) => key(item.name) === key(element));
    if (!column) {
      reasons.push(`A coluna ${element} não foi encontrada em ${target.name}; revise o nome informado.`);
    } else {
      if (column.primaryKey) {
        score += impactWeights.primaryKey;
        reasons.push(`A coluna ${column.name} faz parte da chave primária (+${impactWeights.primaryKey}).`);
      }
      if (column.references) {
        score += impactWeights.foreignKey;
        reasons.push(`A coluna ${column.name} possui chave estrangeira (+${impactWeights.foreignKey}).`);
      }
      if (column.unique || column.check || column.default != null || column.notNull) {
        score += impactWeights.constraint;
        reasons.push(`A coluna ${column.name} possui restrições/default relevantes (+${impactWeights.constraint}).`);
      }
    }
  }

  const level = impactLevels.find((entry) => score <= entry.max)?.label ?? 'CRÍTICA';
  const files = [...new Set([target.file, ...affected.map((object) => object.file)].filter(Boolean))];
  const changeLabel = element ? `${target.name}.${element}` : target.name;
  const suggestions = [
    `Revisar a alteração principal em ${target.file}.`,
    ...affected.map((object) => `Revisar ${object.file}, pois ${object.name} ${object.depth === 1 ? 'depende diretamente' : 'é alcançado indiretamente'} de ${changeLabel}.`)
  ];

  return {
    change: {
      object: target.name,
      element,
      changeType: request.changeType || 'alter',
      newValue: request.newValue || null
    },
    score,
    level,
    directDependencies: affected.filter((object) => object.depth === 1).length,
    indirectDependencies: affected.filter((object) => object.depth > 1).length,
    files,
    affected: affected.map(({ id, name, type, file, depth }) => ({
      id, name, type, file, depth,
      reason: depth === 1 ? 'Dependência direta' : `Dependência indireta (nível ${depth})`
    })),
    reasons: reasons.length ? reasons : ['Nenhum objeto dependente foi identificado para esta alteração.'],
    suggestions: [...new Set(suggestions)]
  };
}
