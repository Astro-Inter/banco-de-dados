export const impactWeights = Object.freeze({
  dataload: 1,
  table: 2,
  // Log Tables costumam apenas registrar histórico: quebram menos que uma
  // tabela transacional, mas ainda são tabelas físicas afetadas pela mudança.
  'log-table': 2,
  index: 2,
  trigger: 3,
  view: 2,
  function: 3,
  procedure: 3,
  foreignKey: 4,
  primaryKey: 4,
  constraint: 2,
  removedObject: 5,
  indirectDependency: 3
});

export const impactLevels = Object.freeze([
  { max: 3, label: 'BAIXA' },
  { max: 8, label: 'MÉDIA' },
  { max: 15, label: 'ALTA' },
  { max: Infinity, label: 'CRÍTICA' }
]);
