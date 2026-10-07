CREATE OR REPLACE FUNCTION carrega_home_colaborador(
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
          AND u.tipo = 'COLABORADOR'
          AND u.status = 'ATIVO'
    ), participacoes AS (
        SELECT e.id_evento, e.titulo, t.data_termino::DATE AS limit_date,
               CASE
                   WHEN ce.status = 'CONCLUIDO' THEN 'DONE'
                   WHEN ce.status = 'PENDENTE'
                        AND ce.data_conclusao IS NOT NULL
                        AND ce.data_validacao IS NULL THEN 'ANALYSIS'
                   ELSE 'PENDING'
               END AS situacao
        FROM contexto ctx
        INNER JOIN turma_funcionario tf ON tf.usuario_id = ctx.id_usuario
        INNER JOIN turma t ON t.id_turma = tf.turma_id
        INNER JOIN evento e ON e.id_evento = t.evento_id
        INNER JOIN usuario gestor ON gestor.id_usuario = e.gestor_id
        INNER JOIN unidade un_gestor
            ON un_gestor.id_unidade = gestor.unidade_id
           AND un_gestor.workspace_id = ctx.id_workspace
        LEFT JOIN conclusao_evento ce
            ON ce.turma_funcionario_id = tf.id_turma_funcionario
        WHERE e.status <> 'CANCELADO'
          AND (e.status = 'ATIVO' OR ce.status = 'CONCLUIDO')
    ), eventos AS (
        SELECT id_evento, titulo,
               MIN(limit_date) FILTER (WHERE situacao = 'PENDING') AS limit_date,
               CASE
                   WHEN BOOL_OR(situacao = 'PENDING') THEN 'PENDING'
                   WHEN BOOL_OR(situacao = 'ANALYSIS') THEN 'ANALYSIS'
                   ELSE 'DONE'
               END AS situacao
        FROM participacoes
        GROUP BY id_evento, titulo
    ), metricas AS (
        SELECT COUNT(*) FILTER (WHERE situacao = 'PENDING') AS pending,
               COUNT(*) FILTER (WHERE situacao = 'ANALYSIS') AS under_analysis,
               COUNT(*) FILTER (WHERE situacao = 'DONE') AS done,
               COALESCE(BOOL_OR(
                   situacao = 'PENDING' AND limit_date <= CURRENT_DATE + 3
               ), FALSE) AS possui_urgencia
        FROM eventos
    ), pendentes AS (
        SELECT id_evento, titulo, limit_date
        FROM eventos
        WHERE situacao = 'PENDING'
        ORDER BY limit_date, id_evento
        LIMIT 3
    )
    SELECT JSONB_BUILD_OBJECT(
        'username', ctx.username,
        'workspace_name', ctx.workspace_name,
        'events_metrics', JSONB_BUILD_OBJECT(
            'pending', m.pending,
            'under_analysis', m.under_analysis,
            'done', m.done
        ),
        'status_message', CASE
            WHEN m.possui_urgencia THEN 'URGENT'
            WHEN m.pending > 0 THEN 'PENDENT'
            WHEN m.under_analysis > 0 THEN 'ANALYSIS'
            ELSE 'OK'
        END,
        'pending_events', COALESCE((
            SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
                'id', p.id_evento,
                'title', p.titulo,
                'limit_date', TO_CHAR(p.limit_date, 'YYYY-MM-DD')
            ) ORDER BY p.limit_date, p.id_evento)
            FROM pendentes p
        ), '[]'::JSONB)
    )
    FROM contexto ctx
    CROSS JOIN metricas m;
$$;

COMMENT ON FUNCTION carrega_home_colaborador(TEXT) IS
'Retorna JSONB com a parte PostgreSQL da Home Mobile de um colaborador ativo identificado pelo Firebase UID: nome, workspace, métricas por evento, status URGENT > PENDENT > ANALYSIS > OK e até três eventos pendentes ordenados pelo prazo e pelo ID. Cada evento conta uma vez: pendência prevalece sobre análise, que prevalece sobre conclusão validada. Considera em análise a conclusão PENDENTE com data_conclusao preenchida e sem data_validacao; ausência de conclusão, rejeição ou PENDENTE ainda não enviado representam pendências. Eventos cancelados são excluídos; eventos encerrados contam apenas conclusões validadas. Pendências com prazo em até três dias, inclusive vencidas, são urgentes. As datas seguem o fuso da sessão PostgreSQL. O backend acrescenta last_notifications da fonte de notificações e resolve viewed via Redis. Retorna NULL para UID ausente ou vazio, usuário inexistente, inativo ou de outro perfil.';
