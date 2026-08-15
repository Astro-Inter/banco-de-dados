/**
 * Histórico de migrations gravado no banco alvo.
 *
 * A tabela existe apenas para controle da ferramenta e é criada sob demanda.
 * O nome vem da configuração central e é validado antes de chegar aqui
 * (`execution-config.js`), porque identificadores não podem ser parametrizados.
 */
export class MigrationHistory {
  constructor(adapter, table = '_astroworkspace_migrations') {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error('Nome inválido para a tabela de histórico.');
    this.adapter = adapter;
    this.table = table;
    this.ready = false;
  }

  #statements() {
    return this.adapter.migrationHistoryStatements(this.table);
  }

  async ensure() {
    if (this.ready) return;
    const statements = this.#statements();
    await this.adapter.query(statements.create);
    if (statements.index) await this.adapter.query(statements.index);
    this.ready = true;
  }

  async list() {
    await this.ensure();
    const result = await this.adapter.query(this.#statements().select);
    return (result?.rows ?? []).map((row) => ({
      file_path: row.file_path,
      file_name: row.file_name,
      checksum: row.checksum,
      executed_at: row.executed_at instanceof Date ? row.executed_at.toISOString() : row.executed_at,
      duration_ms: row.duration_ms,
      status: row.status,
      error_message: row.error_message ?? null
    }));
  }

  async record({ filePath, fileName, checksum, durationMs = null, status, errorMessage = null, databaseVersion = null }) {
    await this.ensure();
    await this.adapter.query(this.#statements().insert, [
      filePath,
      fileName,
      checksum,
      durationMs === null ? null : Math.round(durationMs),
      status,
      errorMessage,
      databaseVersion
    ]);
  }
}
