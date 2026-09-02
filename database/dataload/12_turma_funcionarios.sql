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
