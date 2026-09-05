WITH participantes AS (
    SELECT
        participante.id_usuario,
        unidade.workspace_id,
        ROW_NUMBER() OVER (
            PARTITION BY unidade.workspace_id
            ORDER BY participante.email
        ) AS ordem
    FROM usuarios participante
    INNER JOIN unidades unidade
        ON unidade.id_unidade = participante.unidade_id
    WHERE participante.tipo = 'FUNCIONARIO'
      AND participante.status = 'ATIVO'
      AND participante.email LIKE '%@example.com'
      -- O lote SCRUM-172 possui distribuição própria, sem alterar as turmas anteriores.
      AND participante.email !~ '^[^.]+[.]c689bedf0fc64d4c[.]([1-9][0-9]?|100)@example[.]com$'
),
turmas_disponiveis AS (
    SELECT
        turma.id_turma,
        unidade_gestor.workspace_id,
        ROW_NUMBER() OVER (
            PARTITION BY unidade_gestor.workspace_id
            ORDER BY evento.titulo, turma.nome
        ) AS ordem,
        COUNT(*) OVER (
            PARTITION BY unidade_gestor.workspace_id
        ) AS total_turmas
    FROM turmas turma
    INNER JOIN eventos evento
        ON evento.id_evento = turma.evento_id
    INNER JOIN usuarios gestor
        ON gestor.id_usuario = evento.gestor_id
    INNER JOIN unidades unidade_gestor
        ON unidade_gestor.id_unidade = gestor.unidade_id
    WHERE evento.status <> 'CANCELADO'
      AND evento.titulo NOT IN (
          'Integração de EPI - Unidade 1',
          'Movimentação de materiais - Unidade 1',
          'Operação de máquinas - Unidade 1',
          'Reciclagem de EPI - Unidade 1',
          'Bloqueio de máquinas - Unidade 1'
      )
      AND gestor.email IN (
          'ana.dias.004@example.com',
          'ana.ferreira.005@example.com',
          'ana.gomes.006@example.com'
      )
)
INSERT INTO turma_funcionarios (turma_id, usuario_id)
SELECT
    turma.id_turma,
    participante.id_usuario
FROM participantes participante
INNER JOIN turmas_disponiveis turma
    ON turma.workspace_id = participante.workspace_id
   AND (
       turma.ordem = MOD(participante.ordem - 1, turma.total_turmas) + 1
       OR turma.ordem = MOD(participante.ordem, turma.total_turmas) + 1
   )
ON CONFLICT (turma_id, usuario_id) DO NOTHING;

-- SCRUM-172: a posição no TXT determina o evento (20 pessoas) e a turma (10).
WITH gestor_unidade AS (
    -- IDs das unidades não dependem da ordem dos VALUES do dataload.
    SELECT email
    FROM usuarios
    WHERE unidade_id = 1 AND status = 'ATIVO'
      AND tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
    ORDER BY CASE WHEN tipo = 'GESTOR' THEN 0 ELSE 1 END, email
    LIMIT 1
),
eventos_lote (ordem, titulo) AS (
    VALUES
        (1, 'Integração de EPI - Unidade 1'),
        (2, 'Movimentação de materiais - Unidade 1'),
        (3, 'Operação de máquinas - Unidade 1'),
        (4, 'Reciclagem de EPI - Unidade 1'),
        (5, 'Bloqueio de máquinas - Unidade 1')
),
participantes_lote AS (
    SELECT id_usuario, SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 3)::INTEGER AS ordem
    FROM usuarios
    WHERE unidade_id = 1 AND tipo = 'FUNCIONARIO' AND status = 'ATIVO'
      AND email ~ '^[^.]+[.]c689bedf0fc64d4c[.]([1-9][0-9]?|100)@example[.]com$'
)
INSERT INTO turma_funcionarios (turma_id, usuario_id)
SELECT turma.id_turma, participante.id_usuario
FROM participantes_lote participante
INNER JOIN eventos_lote lote ON lote.ordem = (participante.ordem - 1) / 20 + 1
INNER JOIN usuarios gestor
    ON gestor.email = (SELECT email FROM gestor_unidade) AND gestor.unidade_id = 1
INNER JOIN eventos evento
    ON evento.gestor_id = gestor.id_usuario AND evento.titulo = lote.titulo
INNER JOIN turmas turma
    ON turma.evento_id = evento.id_evento
   AND turma.nome = CASE WHEN MOD(participante.ordem - 1, 20) < 10 THEN 'Turma A' ELSE 'Turma B' END
ON CONFLICT (turma_id, usuario_id) DO NOTHING;
