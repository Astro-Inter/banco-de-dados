CREATE OR REPLACE FUNCTION carrega_home_gestor(
    p_firebase_uid TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    WITH contexto AS (
        SELECT u.id_usuario, u.nome AS username,
               w.id_workspace, w.nome AS workspace_name
        FROM usuario u
        INNER JOIN unidade un ON un.id_unidade = u.unidade_id
        INNER JOIN workspace w ON w.id_workspace = un.workspace_id
        WHERE u.firebase_uid = p_firebase_uid
          AND NULLIF(BTRIM(p_firebase_uid), '') IS NOT NULL
          AND u.tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
          AND u.status = 'ATIVO'
    ), eventos_gestor AS (
        SELECT e.id_evento, e.titulo, e.status
        FROM evento e
        INNER JOIN contexto ctx ON ctx.id_usuario = e.gestor_id
        WHERE e.status <> 'CANCELADO'
    ), participacoes AS (
        SELECT e.id_evento, e.titulo, u.id_usuario,
               u.nome AS collaborator_name,
               ce.id_conclusao_evento, ce.status AS status_conclusao,
               ce.data_conclusao, ce.data_validacao
        FROM eventos_gestor e
        INNER JOIN turma t ON t.evento_id = e.id_evento
        INNER JOIN turma_funcionario tf ON tf.turma_id = t.id_turma
        INNER JOIN usuario u ON u.id_usuario = tf.usuario_id
        INNER JOIN unidade un ON un.id_unidade = u.unidade_id
        INNER JOIN contexto ctx ON ctx.id_workspace = un.workspace_id
        LEFT JOIN conclusao_evento ce
            ON ce.turma_funcionario_id = tf.id_turma_funcionario
        WHERE u.tipo = 'COLABORADOR' AND u.status = 'ATIVO'
    ), validacoes AS (
        SELECT id_conclusao_evento, collaborator_name, titulo, data_conclusao
        FROM participacoes
        WHERE status_conclusao = 'PENDENTE'
          AND data_conclusao IS NOT NULL
          AND data_validacao IS NULL
    ), primeiras_validacoes AS (
        SELECT id_conclusao_evento, collaborator_name, titulo, data_conclusao
        FROM validacoes
        ORDER BY data_conclusao, id_conclusao_evento
        LIMIT 3
    ), eventos_atuais AS (
        SELECT e.id_evento
        FROM eventos_gestor e
        WHERE e.status = 'ATIVO'
          AND EXISTS (
              SELECT 1
              FROM turma t
              WHERE t.evento_id = e.id_evento
                AND t.data_inicial <= LOCALTIMESTAMP
                AND t.data_termino >= LOCALTIMESTAMP
          )
    )
    SELECT JSONB_BUILD_OBJECT(
        'username', ctx.username,
        'workspace_name', ctx.workspace_name,
        'pending_validations', COALESCE((
            SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
                'id', v.id_conclusao_evento,
                'collaborator_name', v.collaborator_name,
                'event_title', v.titulo
            ) ORDER BY v.data_conclusao, v.id_conclusao_evento)
            FROM primeiras_validacoes v
        ), '[]'::JSONB),
        'indicators', JSONB_BUILD_OBJECT(
            'pending_validations', (SELECT COUNT(*) FROM validacoes),
            'current_events', (SELECT COUNT(*) FROM eventos_atuais),
            'collaborators_with_pending_events', (
                SELECT COUNT(DISTINCT p.id_usuario)
                FROM participacoes p
                INNER JOIN eventos_atuais e ON e.id_evento = p.id_evento
                WHERE p.id_conclusao_evento IS NULL
                   OR p.status_conclusao = 'REJEITADO'
                   OR (p.status_conclusao = 'PENDENTE'
                       AND p.data_conclusao IS NULL)
            )
        )
    )
    FROM contexto ctx;
$$;

COMMENT ON FUNCTION carrega_home_gestor(TEXT) IS
'Retorna JSONB com a parte PostgreSQL da Home Mobile de um GESTOR ou GESTOR_WORKSPACE ativo identificado pelo Firebase UID: nome, workspace, até três validações pendentes e indicadores. Restringe os dados aos eventos não cancelados do próprio gestor e aos colaboradores ativos do mesmo workspace. Validação pendente é uma conclusão PENDENTE com data_conclusao preenchida e sem data_validacao; seu ID é id_conclusao_evento. Prioriza os envios mais antigos, com desempate pelo ID, e contabiliza todas as validações no indicador. Evento atual é ATIVO com ao menos uma turma em andamento. Conta colaboradores distintos com pendências em qualquer turma desses eventos: ausência de conclusão, rejeição ou PENDENTE ainda não enviado. Datas e horários seguem o fuso da sessão PostgreSQL. O backend acrescenta pending_forms da fonte de formulários e resolve viewed via Redis. Retorna NULL para UID ausente ou vazio, usuário inexistente, inativo ou de outro perfil.';
