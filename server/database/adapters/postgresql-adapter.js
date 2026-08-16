import { BaseAdapter, toExecutionError } from './base-adapter.js';

/**
 * Adapter PostgreSQL sobre o driver `pg`.
 *
 * O driver é carregado sob demanda: quem só usa a documentação continua
 * abrindo o workspace mesmo sem o pacote instalado.
 */
export class PostgreSqlAdapter extends BaseAdapter {
  static type = 'postgresql';
  static label = 'PostgreSQL';
  static defaultPort = 5432;

  constructor(connection, options = {}) {
    super(connection, options);
    this.client = null;
  }

  async #driver() {
    try {
      const module = await import('pg');
      return module.default ?? module;
    } catch {
      throw new Error('O driver "pg" não está instalado. Execute npm install para habilitar a execução no PostgreSQL.');
    }
  }

  async connect() {
    if (this.client) return this.client;
    const { Client } = await this.#driver();
    const client = new Client({
      host: this.connection.host,
      port: this.connection.port,
      database: this.connection.database,
      user: this.connection.user,
      password: this.connection.password,
      ssl: this.connection.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: this.options.connectionTimeout ?? 10_000,
      application_name: 'astro-database-workspace'
    });
    await client.connect();
    this.client = client;
    const queryTimeout = Number(this.options.queryTimeout ?? 0);
    if (queryTimeout > 0) await client.query(`SET statement_timeout = ${Math.trunc(queryTimeout)}`);
    return client;
  }

  async testConnection() {
    const client = await this.connect();
    const { rows } = await client.query('SELECT version() AS version, current_database() AS database');
    return {
      ...this.describe(),
      database: rows[0]?.database ?? this.connection.database,
      version: rows[0]?.version ?? 'PostgreSQL'
    };
  }

  /**
   * Executa o arquivo inteiro em uma única simple query. O protocolo simples do
   * PostgreSQL aceita vários comandos e preserva corpos `$$ ... $$`, por isso
   * nunca fatiamos o script por ponto e vírgula.
   */
  async execute(sql) {
    const client = await this.connect();
    try {
      const result = await client.query(sql);
      const results = Array.isArray(result) ? result : [result];
      return { rowCount: results.reduce((total, item) => total + (item?.rowCount ?? 0), 0), commands: results.length };
    } catch (error) {
      const executionError = toExecutionError(error, { sql });
      const failure = new Error(executionError.message);
      failure.execution = executionError;
      throw failure;
    }
  }

  async query(sql, parameters = []) {
    const client = await this.connect();
    return client.query(sql, parameters);
  }

  async beginTransaction() { await this.query('BEGIN'); }

  async commit() { await this.query('COMMIT'); }

  async rollback() {
    try { await this.query('ROLLBACK'); } catch { /* a transação já pode ter sido abortada pelo servidor */ }
  }

  async disconnect() {
    if (!this.client) return;
    const client = this.client;
    this.client = null;
    try { await client.end(); } catch { /* encerrar a conexão nunca deve derrubar a interface */ }
  }

  migrationHistoryStatements(table) {
    return {
      create: `CREATE TABLE IF NOT EXISTS ${table} (
  id BIGSERIAL PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  database_version TEXT
)`,
      index: `CREATE INDEX IF NOT EXISTS ${table}_file_path_idx ON ${table} (file_path)`,
      select: `SELECT file_path, file_name, checksum, executed_at, duration_ms, status, error_message
FROM ${table}
ORDER BY executed_at DESC, id DESC`,
      insert: `INSERT INTO ${table} (file_path, file_name, checksum, duration_ms, status, error_message, database_version)
VALUES ($1, $2, $3, $4, $5, $6, $7)`
    };
  }
}
