import path from 'node:path';
import { cleanName, findReferences, splitCommaAware, stripComments, unique } from './utils.js';
import { extractFileComments } from '../comments/index.js';

const identifier = String.raw`(?:\[[^\]]+\]|[\w]+)(?:\.(?:\[[^\]]+\]|[\w]+))?`;

/**
 * Uma tabela declarada em `database/logs` é documentada como `log-table`, mas
 * continua sendo uma tabela física — por isso `databaseType` permanece `table`.
 * A classificação vem da PASTA, nunca de prefixos como `log_` ou `audit_`, que
 * gerariam falsos positivos.
 */
export function tableTypeFor(file) {
  return file?.category === 'logs' ? 'log-table' : 'table';
}

const physicalTypes = { 'log-table': 'table' };

function base(file, type, name) {
  return {
    id: `${type}:${name.toLowerCase()}`,
    name,
    type,
    databaseType: physicalTypes[type] ?? type,
    file: file.path,
    category: file.category,
    code: file.content,
    description: null,
    dependencies: [],
    usedBy: [],
    warnings: []
  };
}

function parseDataType(dataType) {
  const match = dataType.match(/^([A-Za-z]+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?$/i);
  if (!match) return { dataType, size: null, precision: null, scale: null };
  const [, baseType, size, precision] = match;
  if (baseType.toUpperCase() === 'NUMERIC' || baseType.toUpperCase() === 'DECIMAL') {
    return { dataType, size: null, precision: size ?? null, scale: precision ?? null };
  }
  return { dataType, size: size ?? null, precision: null, scale: null };
}

function parseColumns(body) {
  const columns = [];
  const constraints = [];
  for (const part of splitCommaAware(body)) {
    const normalized = part.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    if (/^(CONSTRAINT\s+\S+\s+)?(PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(normalized)) {
      constraints.push(normalized);
      continue;
    }
    const match = normalized.match(/^([\[\]`"\w]+)\s+(.+?)(?=\s+(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|DEFAULT|REFERENCES|CHECK|CONSTRAINT|GENERATED)\b|$)(.*)$/i);
    if (!match) continue;
    const rest = match[3];
    const typeInfo = parseDataType(match[2].replace(/\s+/g, ''));
    const check = rest.match(/\bCHECK\s*\(([^)]+)\)/i)?.[1] ?? null;
    columns.push({
      name: cleanName(match[1]),
      dataType: typeInfo.dataType,
      size: typeInfo.size,
      precision: typeInfo.precision,
      scale: typeInfo.scale,
      nullable: !/\bNOT\s+NULL\b/i.test(rest) && !/\bPRIMARY\s+KEY\b/i.test(rest),
      notNull: /\bNOT\s+NULL\b/i.test(rest) || /\bPRIMARY\s+KEY\b/i.test(rest),
      primaryKey: /\bPRIMARY\s+KEY\b/i.test(rest),
      unique: /\bUNIQUE\b/i.test(rest),
      default: rest.match(/\bDEFAULT\s+(.+?)(?=\s+(?:NOT\s+NULL|NULL|PRIMARY|UNIQUE|CONSTRAINT|REFERENCES|CHECK)\b|$)/i)?.[1] ?? null,
      references: cleanName(rest.match(/\bREFERENCES\s+([\[\]`"\w.]+)/i)?.[1] ?? '') || null,
      referencesColumn: rest.match(/\bREFERENCES\s+[\[\]`"\w.]+\(([\[\]`"\w]+)\)/i)?.[1] ?? null,
      check: check ? check.replace(/\s+/g, ' ').trim() : null,
      // Preenchida depois pelos COMMENT ON COLUMN, que podem estar em outro arquivo.
      description: null
    });
  }
  for (const constraint of constraints) {
    const primary = constraint.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    const uniqueMatch = constraint.match(/UNIQUE\s*\(([^)]+)\)/i);
    const foreign = constraint.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\[\]`"\w.]+)(?:\s*\(([^)]+)\))?/i);
    const check = constraint.match(/CHECK\s*\(([^)]+)\)/i);
    for (const name of splitCommaAware(primary?.[1] ?? '')) {
      const column = columns.find((item) => item.name.toLowerCase() === cleanName(name).toLowerCase());
      if (column) { column.primaryKey = true; column.nullable = false; column.notNull = true; }
    }
    for (const name of splitCommaAware(uniqueMatch?.[1] ?? '')) {
      const column = columns.find((item) => item.name.toLowerCase() === cleanName(name).toLowerCase());
      if (column) column.unique = true;
    }
    if (foreign) {
      const refColumns = splitCommaAware(foreign[3] ?? '');
      splitCommaAware(foreign[1]).forEach((name, index) => {
        const column = columns.find((item) => item.name.toLowerCase() === cleanName(name).toLowerCase());
        if (column) {
          column.references = cleanName(foreign[2]);
          column.referencesColumn = refColumns[index] ? cleanName(refColumns[index]) : null;
        }
      });
    }
    if (check) {
      for (const name of splitCommaAware(check[1])) {
        const column = columns.find((item) => item.name.toLowerCase() === cleanName(name).toLowerCase());
        if (column) column.check = check[1].replace(/\s+/g, ' ').trim();
      }
    }
  }
  return { columns, constraints };
}

function parseParameters(header = '', dialect = 'sqlserver') {
  if (dialect === 'postgresql') {
    const body = header.match(/\(([^)]*)\)/)?.[1] ?? '';
    return splitCommaAware(body).map((parameter) => {
      const match = parameter.trim().match(/^(?:(IN|OUT|INOUT|VARIADIC)\s+)?(["\w]+)\s+(.+?)(?:\s+(?:DEFAULT|=)\s+(.+))?$/i);
      if (!match) return null;
      return { name: cleanName(match[2]), mode: (match[1] ?? 'IN').toUpperCase(), dataType: match[3].trim(), default: match[4] ?? null };
    }).filter(Boolean);
  }
  const matches = header.matchAll(/@([\w]+)\s+([A-Z]+(?:\s*\([^)]*\))?)(?:\s*=\s*([^,\s]+))?/gi);
  return [...matches].map((match) => ({ name: `@${match[1]}`, dataType: match[2].replace(/\s+/g, ''), default: match[3] ?? null }));
}

function parseTable(file, sql) {
  const expression = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${identifier})\\s*\\(`, 'gi');
  const type = tableTypeFor(file);
  const objects = [];
  let match;
  while ((match = expression.exec(sql))) {
    const name = cleanName(match[1]);
    const bodyStart = expression.lastIndex;
    let depth = 1;
    let cursor = bodyStart;
    let quote = null;
    for (; cursor < sql.length && depth > 0; cursor += 1) {
      const char = sql[cursor];
      if ((char === "'" || char === '"') && sql[cursor - 1] !== '\\') quote = quote === char ? null : (quote || char);
      if (quote) continue;
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
    }
    if (depth !== 0) {
      objects.push({ ...base(file, type, name), columns: [], constraints: [], warnings: ['Parênteses não balanceados no CREATE TABLE.'] });
      break;
    }
    const parsed = parseColumns(sql.slice(bodyStart, cursor - 1));
    const object = { ...base(file, type, name), ...parsed };
    const statementEnd = sql.indexOf(';', cursor);
    const suffix = sql.slice(cursor, statementEnd === -1 ? sql.length : statementEnd);
    object.inherits = splitCommaAware(suffix.match(/\bINHERITS\s*\(([^)]+)\)/i)?.[1] ?? '').map(cleanName);
    object.dependencies = unique([...parsed.columns.map((column) => column.references), ...object.inherits]);
    objects.push(object);
    expression.lastIndex = cursor;
  }
  return objects;
}

/**
 * Extrai constraints sem exigir que a tabela tenha sido declarada no mesmo
 * arquivo. A associação acontece no analyzer, depois que todos os arquivos
 * SQL já foram interpretados.
 */
export function extractAlterTableConstraints(file, sql) {
  const blocks = new RegExp(`ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?(${identifier})\\s+([\\s\\S]*?);`, 'gi');
  const constraints = [];
  let block;
  while ((block = blocks.exec(sql))) {
    const table = cleanName(block[1]);
    const actions = block[2];
    const additions = /(?:^|,)\s*ADD\s+(?:CONSTRAINT\s+([\[\]`"\w]+)\s+)?(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\b([\s\S]*?)(?=,\s*ADD\s+(?:CONSTRAINT\s+[\[\]`"\w]+\s+)?(?:PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\b|$)/gi;
    let addition;
    while ((addition = additions.exec(actions))) {
      const name = cleanName(addition[1] ?? '');
      const type = addition[2].replace(/\s+/g, ' ').toUpperCase();
      const rest = addition[3].trim();
      const columns = ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE'].includes(type)
        ? splitCommaAware(rest.match(/^\s*\(([^)]+)\)/)?.[1] ?? '').map(cleanName)
        : [];
      const referenced = type === 'FOREIGN KEY'
        ? rest.match(/^\s*\([^)]+\)\s+REFERENCES\s+([\[\]`"\w.]+)\s*\(([^)]+)\)/i)
        : null;
      constraints.push({
        file: file.path,
        table,
        name,
        type,
        columns,
        referencedTable: referenced ? cleanName(referenced[1]) : null,
        referencedColumns: referenced ? splitCommaAware(referenced[2]).map(cleanName) : [],
        checkExpression: type === 'CHECK' ? extractParenthesizedExpression(rest) : null,
        definition: `${name ? `CONSTRAINT ${name} ` : ''}${type} ${rest}`.replace(/\s+/g, ' ').trim()
      });
    }
  }
  return constraints;
}

function extractParenthesizedExpression(value) {
  const text = String(value ?? '').trim();
  if (!text.startsWith('(')) return null;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index + 1] === quote) index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')' && --depth === 0) return text.slice(1, index).trim();
  }
  return null;
}

/** Extrai mudanças de nulabilidade e valor padrão declaradas em ALTER COLUMN. */
export function extractAlterTableColumnChanges(file, sql) {
  const blocks = new RegExp(`ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?(${identifier})\\s+([\\s\\S]*?);`, 'gi');
  const changes = [];
  let block;
  while ((block = blocks.exec(sql))) {
    const table = cleanName(block[1]);
    const actions = block[2];
    const alterations = new RegExp(`(?:^|,)\\s*ALTER\\s+(?:COLUMN\\s+)?(${identifier})\\s+([\\s\\S]*?)(?=,\\s*(?:ALTER|ADD|DROP)\\b|$)`, 'gi');
    let alteration;
    while ((alteration = alterations.exec(actions))) {
      const column = cleanName(alteration[1]);
      const operation = alteration[2].trim();
      if (/^SET\s+NOT\s+NULL\b/i.test(operation)) {
        changes.push({ file: file.path, table, column, action: 'SET NOT NULL', value: null });
      } else if (/^DROP\s+NOT\s+NULL\b/i.test(operation)) {
        changes.push({ file: file.path, table, column, action: 'DROP NOT NULL', value: null });
      } else if (/^DROP\s+DEFAULT\b/i.test(operation)) {
        changes.push({ file: file.path, table, column, action: 'DROP DEFAULT', value: null });
      } else {
        const defaultMatch = operation.match(/^SET\s+DEFAULT\s+([\s\S]+)$/i);
        if (defaultMatch) changes.push({ file: file.path, table, column, action: 'SET DEFAULT', value: defaultMatch[1].trim() });
      }
    }
  }
  return changes;
}

function tableKey(value) {
  return cleanName(String(value ?? '')).toLowerCase();
}

function findColumn(table, columnName) {
  return (table?.columns ?? []).find((column) => tableKey(column.name) === tableKey(columnName));
}

const inheritedColumnOverrides = new WeakMap();

function cloneInheritedColumn(column, inheritedFrom) {
  return {
    ...column,
    primaryKey: false,
    unique: false,
    references: null,
    referencesColumn: null,
    inheritedFrom: column.inheritedFrom ?? inheritedFrom
  };
}

function ensureColumn(table, columnName, byName, visited = new Set()) {
  const existing = findColumn(table, columnName);
  if (existing) return existing;
  const key = tableKey(table.name);
  if (visited.has(key)) return null;
  visited.add(key);
  for (const parentName of table.inherits ?? []) {
    const parent = byName.get(tableKey(parentName));
    if (!parent) continue;
    const source = findColumn(parent, columnName) ?? ensureColumn(parent, columnName, byName, new Set(visited));
    if (!source) continue;
    const inherited = cloneInheritedColumn(source, parent.name);
    table.columns.push(inherited);
    return inherited;
  }
  return null;
}

/** Materializa colunas herdadas para que a documentação da tabela filha seja completa. */
export function materializeTableInheritance(objects) {
  const tables = objects.filter((object) => object?.databaseType === 'table' || ['table', 'log-table'].includes(object?.type));
  const byName = new Map(tables.map((table) => [tableKey(table.name), table]));

  function materialize(table, visited = new Set()) {
    const key = tableKey(table.name);
    if (visited.has(key)) return;
    visited.add(key);
    for (const parentName of table.inherits ?? []) {
      const parent = byName.get(tableKey(parentName));
      if (!parent) continue;
      materialize(parent, new Set(visited));
      for (const column of parent.columns ?? []) {
        const existing = findColumn(table, column.name);
        if (!existing) {
          table.columns.push(cloneInheritedColumn(column, parent.name));
          continue;
        }
        if (!existing.inheritedFrom) continue;
        const overrides = inheritedColumnOverrides.get(existing) ?? new Set();
        if (!overrides.has('nullable')) {
          existing.nullable = column.nullable;
          existing.notNull = column.notNull;
        }
        if (!overrides.has('default')) existing.default = column.default;
        existing.checks = unique([...(column.checks ?? []), ...(existing.checks ?? [])]);
        existing.check = existing.checks.length ? existing.checks.join(' AND ') : null;
      }
    }
  }

  tables.forEach((table) => materialize(table));
}

/** Consolida ALTER COLUMN mesmo quando a tabela foi criada em outro arquivo. */
export function applyAlterTableColumnChanges(objects, changes = []) {
  const tables = objects.filter((object) => object?.databaseType === 'table' || ['table', 'log-table'].includes(object?.type));
  const byName = new Map(tables.map((table) => [tableKey(table.name), table]));
  const issues = [];
  for (const change of changes) {
    const table = byName.get(tableKey(change.table));
    if (!table) {
      issues.push({ file: change.file, severity: 'warning', message: `ALTER TABLE referencia a tabela inexistente ${change.table}.` });
      continue;
    }
    const column = ensureColumn(table, change.column, byName);
    if (!column) {
      issues.push({ file: change.file, severity: 'warning', message: `ALTER COLUMN referencia a coluna inexistente ${change.table}.${change.column}.` });
      continue;
    }
    if (change.action === 'SET NOT NULL') {
      column.notNull = true;
      column.nullable = false;
    } else if (change.action === 'DROP NOT NULL') {
      column.notNull = false;
      column.nullable = true;
    } else if (change.action === 'SET DEFAULT') column.default = change.value;
    else if (change.action === 'DROP DEFAULT') column.default = null;
    if (column.inheritedFrom) {
      const overrides = inheritedColumnOverrides.get(column) ?? new Set();
      overrides.add(change.action.includes('DEFAULT') ? 'default' : 'nullable');
      inheritedColumnOverrides.set(column, overrides);
    }
  }
  return issues;
}

function expressionMentionsColumn(expression, columnName) {
  const escaped = String(columnName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}_$])${escaped}(?=$|[^\\p{L}\\p{N}_$])`, 'iu').test(expression);
}

/** Aplica constraints extraídas de qualquer arquivo às tabelas do snapshot. */
export function applyAlterTableConstraints(objects, constraints = []) {
  const tables = objects.filter((object) => object?.databaseType === 'table' || ['table', 'log-table'].includes(object?.type));
  const byName = new Map(tables.map((table) => [tableKey(table.name), table]));
  const issues = [];

  for (const constraint of constraints) {
    const table = byName.get(tableKey(constraint.table));
    if (!table) {
      issues.push({ file: constraint.file, severity: 'warning', message: `A constraint ${constraint.name || constraint.type} referencia a tabela inexistente ${constraint.table}.` });
      continue;
    }

    table.constraints = table.constraints ?? [];
    if (constraint.definition && !table.constraints.includes(constraint.definition)) table.constraints.push(constraint.definition);

    constraint.columns.forEach((columnName, index) => {
      const column = ensureColumn(table, columnName, byName);
      if (!column) {
        issues.push({ file: constraint.file, severity: 'warning', message: `A constraint ${constraint.name || constraint.type} referencia a coluna inexistente ${constraint.table}.${columnName}.` });
        return;
      }
      if (constraint.type === 'PRIMARY KEY') {
        column.primaryKey = true;
        column.nullable = false;
        column.notNull = true;
      } else if (constraint.type === 'UNIQUE') {
        column.unique = true;
      } else if (constraint.type === 'FOREIGN KEY') {
        column.references = constraint.referencedTable;
        column.referencesColumn = constraint.referencedColumns[index] ?? null;
      }
    });

    if (constraint.type === 'CHECK' && constraint.checkExpression) {
      for (const column of table.columns ?? []) {
        if (!expressionMentionsColumn(constraint.checkExpression, column.name)) continue;
        column.checks = unique([...(column.checks ?? []), constraint.checkExpression]);
        column.check = column.checks.join(' AND ');
      }
    }

    if (constraint.type === 'FOREIGN KEY' && constraint.referencedTable) {
      table.dependencies = unique([...(table.dependencies ?? []), constraint.referencedTable]);
    }
  }
  return issues;
}

function parseProgrammable(file, sql, keyword, type, dialect) {
  const expression = new RegExp(`CREATE\\s+(?:OR\\s+(?:ALTER|REPLACE)\\s+)?${keyword}\\s+(${identifier})([\\s\\S]*?)(?=\\bAS\\b|\\bRETURNS\\b|\\bLANGUAGE\\b)`, 'gi');
  const objects = [];
  let match;
  while ((match = expression.exec(sql))) {
    const name = cleanName(match[1]);
    const object = base(file, type, name);
    object.parameters = parseParameters(match[2], dialect);
    object.dependencies = findReferences(sql).filter((dependency) => dependency.toLowerCase() !== name.toLowerCase());
    object.operations = unique([...stripComments(sql).matchAll(/\b(SELECT|INSERT|UPDATE|DELETE)\b/gi)].map((item) => item[1].toUpperCase()));
    if (type === 'function') {
      object.returnType = dialect === 'postgresql'
        ? sql.match(/\bRETURNS\s+(.+?)(?=\s+(?:LANGUAGE|AS)\b)/i)?.[1]?.trim() ?? null
        : sql.match(/\bRETURNS\s+([A-Z]+(?:\s*\([^)]*\))?)/i)?.[1] ?? null;
      object.language = dialect === 'postgresql' ? sql.match(/\bLANGUAGE\s+(\w+)/i)?.[1] ?? null : null;
    }
    objects.push(object);
  }
  return objects;
}

/**
 * Índices descrevem `columns` como uma lista de nomes (strings), enquanto
 * tabelas descrevem `columns` como objetos com metadados. As duas formas são
 * intencionais; consumidores devem usar os utilitários de `site/services/search.js`
 * (`columnName`/`columnNames`) em vez de acessar `column.name` diretamente.
 */
function parseIndexes(file, sql) {
  const expression = new RegExp(`CREATE\\s+(UNIQUE\\s+)?(?:CLUSTERED\\s+|NONCLUSTERED\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([\\[\\]"\\w]+)\\s+ON\\s+(${identifier})(?:\\s+USING\\s+(\\w+))?\\s*\\(([^)]+)\\)`, 'gi');
  const objects = [];
  let match;
  while ((match = expression.exec(sql))) {
    const name = cleanName(match[2]);
    const where = sql.slice(match.index + match[0].length).match(/\bWHERE\s+([\s\S]*?)(?=;|$)/i)?.[1]?.trim() ?? null;
    objects.push({
      ...base(file, 'index', name),
      table: cleanName(match[3]),
      method: match[4] ?? null,
      columns: splitCommaAware(match[5]).map((column) => cleanName(column.replace(/\s+(ASC|DESC)(?:\s+NULLS\s+(?:FIRST|LAST))?$/i, ''))),
      unique: Boolean(match[1]),
      condition: where,
      dependencies: [cleanName(match[3])]
    });
  }
  return objects;
}

function parseTriggers(file, sql, dialect) {
  if (dialect !== 'postgresql') return [];
  const expression = new RegExp(
    `CREATE\\s+(CONSTRAINT\\s+)?TRIGGER\\s+(["\\w]+)\\s+` +
    `(BEFORE|AFTER|INSTEAD\\s+OF)\\s+` +
    `((?:INSERT|UPDATE|DELETE|TRUNCATE)(?:\\s+OR\\s+(?:INSERT|UPDATE|DELETE|TRUNCATE))*)` +
    `[\\s\\S]*?\\bON\\s+(${identifier})` +
    `[\\s\\S]*?\\bEXECUTE\\s+(?:FUNCTION|PROCEDURE)\\s+(${identifier})\\s*\\(`,
    'gi'
  );
  const objects = [];
  let match;
  while ((match = expression.exec(sql))) {
    const name = cleanName(match[2]);
    const table = cleanName(match[5]);
    const functionName = cleanName(match[6]);
    objects.push({
      ...base(file, 'trigger', name),
      table,
      function: functionName,
      timing: match[3].replace(/\s+/g, ' ').toUpperCase(),
      events: match[4].toUpperCase().split(/\s+OR\s+/),
      level: /\bFOR\s+EACH\s+STATEMENT\b/i.test(match[0]) ? 'STATEMENT' : 'ROW',
      constraint: Boolean(match[1]),
      dependencies: unique([table, functionName])
    });
  }
  return objects;
}

function parseDataLoad(file, sql) {
  if (file.category !== 'dataload') return [];
  const name = path.basename(file.path, '.sql');
  const operations = unique([...stripComments(sql).matchAll(/\b(INSERT|UPDATE|DELETE|MERGE|COPY)\b/gi)].map((item) => item[1].toUpperCase()));
  return [{
    ...base(file, 'dataload', name),
    dependencies: findReferences(sql),
    operations,
    statementCount: (sql.match(/;/g) ?? []).length
  }];
}

export function parseSqlDialectFile(file, dialect = 'sqlserver') {
  const sql = stripComments(file.content);
  if (!sql.trim()) return { objects: [], issues: [{ file: file.path, severity: 'warning', message: 'Arquivo SQL vazio.' }], comments: [] };
  // Os COMMENT ON são coletados aqui e aplicados pelo analyzer depois que todos
  // os arquivos foram lidos: a descrição pode estar em um script separado.
  const comments = extractFileComments({ path: file.path, content: sql }, dialect);
  try {
    const tables = parseTable(file, sql);
    const constraints = extractAlterTableConstraints(file, sql);
    const columnChanges = extractAlterTableColumnChanges(file, sql);
    const objects = [
      ...tables,
      ...parseProgrammable(file, sql, 'VIEW', 'view', dialect),
      ...parseProgrammable(file, sql, 'PROC(?:EDURE)?', 'procedure', dialect),
      ...parseProgrammable(file, sql, 'FUNCTION', 'function', dialect),
      ...parseIndexes(file, sql),
      ...parseTriggers(file, sql, dialect),
      ...parseDataLoad(file, sql)
    ];
    // Mantém o parser de um arquivo isolado autocontido; o analyzer reaplica
    // as mesmas alterações globalmente para resolver referências entre arquivos.
    applyAlterTableColumnChanges(objects, columnChanges);
    materializeTableInheritance(objects);
    applyAlterTableConstraints(objects, constraints);
    materializeTableInheritance(objects);
    const interpreted = objects.length || comments.length || file.category === 'scripts';
    const issues = interpreted ? [] : [{ file: file.path, severity: 'warning', message: 'Não foi possível interpretar completamente este arquivo.' }];
    return { objects, issues, comments, constraints, columnChanges };
  } catch (error) {
    // Um arquivo inválido não pode derrubar os demais: ele vira uma ocorrência.
    return { objects: [], issues: [{ file: file.path, severity: 'error', message: error.message }], comments, constraints: [], columnChanges: [] };
  }
}

export function parseSqlServerFile(file) {
  return parseSqlDialectFile(file, 'sqlserver');
}
