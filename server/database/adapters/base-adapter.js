/**
 * Contrato comum a todos os adapters de banco.
 *
 * A camada de execução (plano, validação e runner) nunca conhece um driver
 * específico: ela conversa apenas com esta interface. Para suportar SQL Server
 * ou MySQL no futuro, basta implementar uma subclasse e registrá-la em
 * `adapters/index.js` — nenhuma rota ou serviço precisa mudar.
 */
export class BaseAdapter {
  /** Identificador do dialeto, por exemplo `postgresql`. */
  static type = 'base';

  /** Rótulo exibido na interface. */
  static label = 'Banco de dados';

  /** Porta padrão sugerida no formulário de conexão. */
  static defaultPort = null;

  /**
   * @param {object} connection credenciais (permanecem apenas em memória)
   * @param {object} options    timeouts e demais opções de execução
   */
  constructor(connection, options = {}) {
    this.connection = connection;
    this.options = options;
  }

  /** Informações seguras da conexão. Nunca inclui a senha. */
  describe() {
    return {
      type: this.constructor.type,
      label: this.constructor.label,
      host: this.connection.host,
      port: this.connection.port,
      database: this.connection.database,
      user: this.connection.user,
      ssl: Boolean(this.connection.ssl)
    };
  }

  async connect() { throw new Error('connect() não implementado para este adapter.'); }

  /** Conecta, coleta a versão do servidor e devolve um resumo seguro. */
  async testConnection() { throw new Error('testConnection() não implementado para este adapter.'); }

  /** Executa o conteúdo completo de um script, sem fatiar por ponto e vírgula. */
  async execute() { throw new Error('execute() não implementado para este adapter.'); }

  async beginTransaction() { throw new Error('beginTransaction() não implementado para este adapter.'); }

  async commit() { throw new Error('commit() não implementado para este adapter.'); }

  async rollback() { throw new Error('rollback() não implementado para este adapter.'); }

  async disconnect() { throw new Error('disconnect() não implementado para este adapter.'); }

  /** SQL do histórico de migrations, específico de cada dialeto. */
  migrationHistoryStatements() { throw new Error('migrationHistoryStatements() não implementado para este adapter.'); }
}

/** Normaliza o erro de um driver para o formato exibido pela interface. */
export function toExecutionError(error, { sql = '' } = {}) {
  return {
    message: error?.message ?? 'Erro desconhecido durante a execução.',
    code: error?.code ?? null,
    position: error?.position ? Number(error.position) : null,
    line: error?.position && sql ? approximateLine(sql, Number(error.position)) : null,
    detail: error?.detail ?? null,
    hint: error?.hint ?? null
  };
}

/** Converte a posição (1-based, em caracteres) reportada pelo driver em linha. */
export function approximateLine(sql, position) {
  if (!Number.isFinite(position) || position < 1) return null;
  return sql.slice(0, position).split(/\r?\n/).length;
}
