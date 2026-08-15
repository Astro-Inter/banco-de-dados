// O modelo é tolerante: um arquivo parcialmente interpretado pode gerar um
// objeto sem nome. Normalizar aqui evita que um único objeto incompleto
// derrube o grafo inteiro.
function key(value) {
  return String(value ?? '').toLowerCase().replace(/^(dbo|public)\./, '');
}

function indexByName(objects) {
  return new Map(objects.filter((object) => key(object?.name)).map((object) => [key(object.name), object]));
}

export function buildDependencyGraph(objects) {
  const byName = indexByName(objects);
  const edges = [];
  for (const object of objects) {
    object.dependencies = [...new Set(object.dependencies ?? [])].filter((name) => key(name));
    object.usedBy = object.usedBy ?? [];
    for (const dependencyName of object.dependencies) {
      const dependency = byName.get(key(dependencyName));
      edges.push({ from: dependency?.id ?? `unknown:${key(dependencyName)}`, to: object.id, resolved: Boolean(dependency) });
      if (dependency && object.name && !dependency.usedBy.includes(object.name)) dependency.usedBy.push(object.name);
    }
  }
  return { edges };
}

export function traversal(objects, startName, direction = 'dependents') {
  const byName = indexByName(objects);
  const start = byName.get(key(startName));
  if (!start) return [];
  const visited = new Set([start.id]);
  const queue = [{ object: start, depth: 0 }];
  const result = [];
  while (queue.length) {
    const current = queue.shift();
    const nextNames = (direction === 'dependencies' ? current.object.dependencies : current.object.usedBy) ?? [];
    for (const nextName of nextNames) {
      const next = byName.get(key(nextName));
      if (!next || visited.has(next.id)) continue;
      visited.add(next.id);
      result.push({ ...next, depth: current.depth + 1 });
      queue.push({ object: next, depth: current.depth + 1 });
    }
  }
  return result;
}

export function findPath(objects, originName, destinationName) {
  const byName = indexByName(objects);
  const origin = byName.get(key(originName));
  const destination = byName.get(key(destinationName));
  if (!origin || !destination) return [];
  const queue = [[origin]];
  const visited = new Set([origin.id]);
  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    if (current.id === destination.id) return path.map((object) => ({ id: object.id, name: object.name, type: object.type }));
    const adjacent = [...(current.usedBy ?? []), ...(current.dependencies ?? [])];
    for (const name of adjacent) {
      const next = byName.get(key(name));
      if (next && !visited.has(next.id)) {
        visited.add(next.id);
        queue.push([...path, next]);
      }
    }
  }
  return [];
}
