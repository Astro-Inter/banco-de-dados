import { randomUUID } from 'node:crypto';
import { checksumOf } from './checksum.js';
import { sanitizeMessage } from './log-sanitizer.js';

/**
 * Runner da migração.
 *
 * Regras que este módulo garante:
 * - só executa arquivos que o plano marcou como pendentes;
 * - o conteúdo é sempre relido pelo filesystem seguro (nunca vem do frontend);
 * - o arquivo inteiro vai para o driver, sem fatiar por ponto e vírgula;
 * - `stopOnError` interrompe a execução e marca o restante como não executado.
 */
const runs = new Map();
const maxRuns = 10;

export const runStates = Object.freeze({
  pending: 'Pendente',
  running: 'Executando',
  success: 'Sucesso',
  error: 'Erro',
  skipped: 'Ignorado',
  'already-executed': 'Já executado',
  modified: 'Modificado',
  'admin-required': 'Requer execução administrativa',
  'not-executed': 'Não executado',
  'rolled-back': 'Revertido',
  empty: 'Arquivo vazio'
});

function initialStatus(item) {
  if (item.willExecute) return 'pending';
  if (item.status === 'empty') return 'skipped';
  return item.status;
}

export function createRun(plan, { sessionId, transactionMode, stopOnError }) {
  const recreating = Boolean(plan.recreate?.statements?.length);
  const run = {
    id: randomUUID(),
    sessionId,
    state: 'running',
    transactionMode: recreating ? 'single' : transactionMode,
    recreateExistingObjects: recreating,
    stopOnError,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    items: plan.items.map((item) => ({
      order: item.order,
      path: item.path,
      name: item.name,
      category: item.category,
      checksum: item.checksum,
      types: item.types,
      status: initialStatus(item),
      statusLabel: runStates[initialStatus(item)] ?? initialStatus(item),
      durationMs: null,
      rowCount: null,
      transaction: null,
      error: null
    }))
  };
  runs.set(run.id, run);
  for (const key of [...runs.keys()].slice(0, Math.max(0, runs.size - maxRuns))) runs.delete(key);
  return run;
}

export function getRun(runId) {
  return runs.get(String(runId ?? '')) ?? null;
}

export function summarizeRun(run) {
  const items = run.items;
  const executed = items.filter((item) => item.status === 'success');
  return {
    executed: executed.length,
    alreadyExecuted: items.filter((item) => item.status === 'already-executed').length,
    skipped: items.filter((item) => ['skipped', 'admin-required', 'modified', 'empty'].includes(item.status)).length,
    notExecuted: items.filter((item) => item.status === 'not-executed').length,
    rolledBack: items.filter((item) => item.status === 'rolled-back').length,
    errors: items.filter((item) => item.status === 'error').length,
    totalMs: items.reduce((total, item) => total + (item.durationMs ?? 0), 0)
  };
}

export function serializeRun(run) {
  return {
    runId: run.id,
    state: run.state,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    transactionMode: run.transactionMode,
    recreateExistingObjects: run.recreateExistingObjects,
    stopOnError: run.stopOnError,
    error: run.error,
    items: run.items,
    summary: summarizeRun(run)
  };
}

function setStatus(item, status, extra = {}) {
  item.status = status;
  item.statusLabel = runStates[status] ?? status;
  Object.assign(item, extra);
}

/**
 * @param {object} run       criado por `createRun`
 * @param {object} plan      plano gerado no servidor
 * @param {object} session   sessão de conexão ativa
 * @param {Function} readFile leitor seguro (recebe o caminho relativo)
 */
export async function executeRun(run, { plan, session, readFile }) {
  const secrets = [session?.connection?.password].filter(Boolean);
  const single = run.transactionMode === 'single';
  const adapter = session.adapter;
  const databaseVersion = session.info?.version ?? null;
  const successfulHistory = [];
  let failedHistory = null;
  let stopped = false;

  if (single) {
    try {
      await adapter.beginTransaction();
      if (plan.recreate?.sql) await adapter.execute(plan.recreate.sql);
    } catch (error) {
      await adapter.rollback();
      run.error = sanitizeMessage(error.message, secrets);
      for (const item of run.items) if (item.status === 'pending') setStatus(item, 'not-executed');
      run.state = 'failed';
      run.finishedAt = new Date().toISOString();
      return run;
    }
  }

  for (const item of run.items) {
    const planned = plan.items.find((entry) => entry.path === item.path);
    if (!planned?.willExecute) continue;
    if (stopped) { setStatus(item, 'not-executed'); continue; }

    setStatus(item, 'running');
    const startedAt = process.hrtime.bigint();
    let transactional = false;
    try {
      const content = await readFile(item.path);
      const currentChecksum = checksumOf(content);
      if (currentChecksum !== planned.checksum) {
        throw new Error('O arquivo foi alterado depois que o plano foi gerado. Gere o plano novamente.');
      }

      transactional = run.transactionMode === 'per-script' && planned.nonTransactional.length === 0;
      if (transactional) await adapter.beginTransaction();
      const result = await adapter.execute(content);
      if (transactional) await adapter.commit();

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      setStatus(item, 'success', {
        durationMs: Math.round(durationMs),
        rowCount: result?.rowCount ?? null,
        transaction: transactional ? 'per-script' : run.transactionMode === 'single' ? 'single' : 'none'
      });
      const historyEntry = {
        filePath: item.path,
        fileName: item.name,
        checksum: planned.checksum,
        durationMs,
        status: 'success',
        databaseVersion
      };
      if (single) successfulHistory.push(historyEntry);
      else await session.history.record(historyEntry).catch(() => { /* o histórico não deve invalidar uma execução bem-sucedida */ });
    } catch (error) {
      if (transactional) await adapter.rollback();
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const details = error.execution ?? {};
      setStatus(item, 'error', {
        durationMs: Math.round(durationMs),
        error: {
          message: sanitizeMessage(error.message, secrets),
          code: details.code ?? null,
          position: details.position ?? null,
          line: details.line ?? null,
          detail: details.detail ? sanitizeMessage(details.detail, secrets) : null,
          hint: details.hint ? sanitizeMessage(details.hint, secrets) : null
        }
      });
      const historyEntry = {
        filePath: item.path,
        fileName: item.name,
        checksum: planned.checksum,
        durationMs,
        status: 'error',
        errorMessage: sanitizeMessage(error.message, secrets),
        databaseVersion
      };
      if (single) failedHistory = historyEntry;
      else await session.history.record(historyEntry).catch(() => {});
      if (single || run.stopOnError) stopped = true;
    }
  }

  if (single) {
    const failed = run.items.some((item) => item.status === 'error');
    try {
      if (failed) {
        await adapter.rollback();
        for (const item of run.items) if (item.status === 'success') setStatus(item, 'rolled-back', { transaction: 'single' });
        if (failedHistory) await session.history.record(failedHistory).catch(() => {});
      } else {
        await adapter.commit();
        for (const entry of successfulHistory) await session.history.record(entry).catch(() => {});
      }
    } catch (error) {
      run.error = sanitizeMessage(error.message, secrets);
    }
  }

  run.state = run.error || run.items.some((item) => item.status === 'error') ? 'failed' : 'finished';
  run.finishedAt = new Date().toISOString();
  return run;
}
