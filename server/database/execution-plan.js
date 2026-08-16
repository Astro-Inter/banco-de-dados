import { checksumOf, checksumStatus } from './checksum.js';
import { analyzeDestructiveOperations } from './destructive-analyzer.js';
import { defaultExecutionConfig } from './execution-config.js';
import { findNonTransactionalStatements, requiresAdministrativeExecution } from './sql-text.js';

/**
 * Planejador de execução.
 *
 * Consome o snapshot que o analyzer já produz (arquivos, objetos e grafo de
 * dependências) e devolve a ordem em que os arquivos devem ser executados.
 * A unidade de execução é o ARQUIVO: um `.sql` roda inteiro, então as arestas
 * entre objetos são projetadas em arestas entre arquivos.
 */

function key(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^(dbo|public)\./, '');
}

/** Prioridade base quando dois arquivos não dependem um do outro. */
export function basePriority(file, objects, baseOrder = defaultExecutionConfig.baseOrder) {
  const types = objects.map((object) => baseOrder.types[object.type]).filter((value) => Number.isFinite(value));
  if (types.length) return Math.min(...types);
  if (file.category === 'scripts') return baseOrder.structural;
  return baseOrder.categories[file.category] ?? 99;
}

function compareItems(a, b) {
  return a.basePriority - b.basePriority || a.path.localeCompare(b.path);
}

/** Componentes fortemente conexos (Tarjan) usados para explicar ciclos. */
function stronglyConnected(nodes, edgesFrom) {
  const indexes = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  const strongConnect = (node) => {
    indexes.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of edgesFrom.get(node) ?? []) {
      if (!indexes.has(next)) {
        strongConnect(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), indexes.get(next)));
      }
    }
    if (low.get(node) === indexes.get(node)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      components.push(component);
    }
  };

  for (const node of nodes) if (!indexes.has(node)) strongConnect(node);
  return components.filter((component) => component.length > 1);
}

/**
 * Ordenação topológica determinística: entre os arquivos liberados, sempre
 * vence a menor prioridade base e, em empate, o caminho em ordem alfabética.
 */
export function topologicalSort(items, dependencies) {
  const byPath = new Map(items.map((item) => [item.path, item]));
  const indegree = new Map(items.map((item) => [item.path, 0]));
  const dependents = new Map(items.map((item) => [item.path, []]));

  for (const [path, requiredPaths] of dependencies) {
    for (const required of requiredPaths) {
      if (!byPath.has(required) || required === path) continue;
      dependents.get(required).push(path);
      indegree.set(path, indegree.get(path) + 1);
    }
  }

  const ready = items.filter((item) => indegree.get(item.path) === 0).sort(compareItems);
  const ordered = [];
  while (ready.length) {
    const current = ready.shift();
    ordered.push(current);
    for (const next of dependents.get(current.path)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        ready.push(byPath.get(next));
        ready.sort(compareItems);
      }
    }
  }

  const blocked = items.filter((item) => !ordered.includes(item));
  const edgesFrom = new Map(items.map((item) => [item.path, (dependents.get(item.path) ?? []).filter((path) => blocked.some((blockedItem) => blockedItem.path === path))]));
  const cycles = blocked.length ? stronglyConnected(blocked.map((item) => item.path), edgesFrom) : [];
  return { ordered, blocked, cycles };
}

function historyFor(history, path) {
  return (history ?? [])
    .filter((entry) => entry.file_path === path && entry.status === 'success')
    .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))[0] ?? null;
}

const statusLabels = {
  pending: 'Pendente',
  'already-executed': 'Já executado',
  modified: 'Modificado',
  'admin-required': 'Requer execução administrativa',
  skipped: 'Ignorado',
  empty: 'Arquivo vazio'
};

export function buildExecutionPlan(database, { config = defaultExecutionConfig, history = [], decisions = {} } = {}) {
  const files = database?.files ?? [];
  const objects = database?.objects ?? [];
  const baseOrder = config.baseOrder ?? defaultExecutionConfig.baseOrder;

  const objectsByFile = new Map(files.map((file) => [file.path, []]));
  for (const object of objects) {
    if (!objectsByFile.has(object.file)) objectsByFile.set(object.file, []);
    objectsByFile.get(object.file).push(object);
  }
  const objectByName = new Map(objects.filter((object) => key(object.name)).map((object) => [key(object.name), object]));

  const missingDependencies = [];
  const dependencies = new Map();
  const items = files.map((file) => {
    const fileObjects = objectsByFile.get(file.path) ?? [];
    const content = String(file.content ?? '');
    const required = new Set();

    for (const object of fileObjects) {
      const missing = [];
      for (const dependencyName of object.dependencies ?? []) {
        const dependency = objectByName.get(key(dependencyName));
        if (!dependency) { missing.push(dependencyName); continue; }
        if (dependency.file && dependency.file !== file.path) required.add(dependency.file);
      }
      if (missing.length) {
        missingDependencies.push({ object: object.name ?? file.path.split('/').at(-1), type: object.type ?? 'objeto', file: file.path, missing });
      }
    }
    dependencies.set(file.path, [...required]);

    const destructive = analyzeDestructiveOperations(content, file.path);
    const nonTransactional = findNonTransactionalStatements(content);
    return {
      path: file.path,
      name: file.path.split('/').at(-1),
      category: file.category,
      checksum: checksumOf(content),
      size: content.length,
      objects: fileObjects.map((object) => ({ name: object.name ?? null, type: object.type ?? null, id: object.id ?? null })),
      types: [...new Set(fileObjects.map((object) => object.type).filter(Boolean))],
      basePriority: basePriority(file, fileObjects, baseOrder),
      dependsOn: [...required],
      destructive,
      nonTransactional,
      requiresAdmin: requiresAdministrativeExecution(content),
      empty: content.trim().length === 0
    };
  });

  const { ordered, blocked, cycles } = topologicalSort(items, dependencies);

  const cycleDetails = cycles.map((component) => ({
    files: component,
    objects: component.flatMap((path) => (objectsByFile.get(path) ?? []).map((object) => object.name).filter(Boolean))
  }));

  const planned = [...ordered, ...blocked].map((item, index) => {
    const previous = historyFor(history, item.path);
    const decision = decisions?.[item.path] ?? null;
    let status = 'pending';
    if (item.empty) status = 'empty';
    else if (item.requiresAdmin) status = 'admin-required';
    else if (previous) status = checksumStatus(item.checksum, previous) === 'already-executed' ? 'already-executed' : 'modified';
    if (status === 'modified' && decision === 'rerun') status = 'pending';
    if (status === 'modified' && decision === 'skip') status = 'skipped';
    if (decision === 'skip' && status === 'pending') status = 'skipped';

    return {
      ...item,
      order: index + 1,
      status,
      statusLabel: statusLabels[status] ?? status,
      rerun: status === 'pending' && Boolean(previous),
      decision,
      previousExecution: previous ? { executedAt: previous.executed_at, checksum: previous.checksum, status: previous.status } : null,
      willExecute: status === 'pending',
      blockedByCycle: blocked.some((blockedItem) => blockedItem.path === item.path)
    };
  });

  // O resumo conta objetos (um arquivo pode declarar duas tabelas); arquivos sem
  // objeto interpretado entram como "script".
  const countByType = {};
  for (const item of planned) {
    if (!item.objects.length) countByType.script = (countByType.script ?? 0) + 1;
    for (const object of item.objects) {
      const type = object.type ?? 'script';
      countByType[type] = (countByType[type] ?? 0) + 1;
    }
  }

  return {
    dialect: database?.dialect ?? null,
    generatedAt: new Date().toISOString(),
    transactionMode: config.transactionMode ?? defaultExecutionConfig.transactionMode,
    stopOnError: config.stopOnError !== false,
    items: planned,
    cycles: cycleDetails,
    hasCycles: cycleDetails.length > 0,
    missingDependencies,
    summary: {
      total: planned.length,
      willExecute: planned.filter((item) => item.willExecute).length,
      alreadyExecuted: planned.filter((item) => item.status === 'already-executed').length,
      modified: planned.filter((item) => item.status === 'modified').length,
      adminRequired: planned.filter((item) => item.status === 'admin-required').length,
      skipped: planned.filter((item) => item.status === 'skipped' || item.status === 'empty').length,
      destructive: planned.reduce((total, item) => total + item.destructive.length, 0),
      byType: countByType
    }
  };
}
