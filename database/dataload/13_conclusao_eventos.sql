WITH participacoes AS (
    SELECT
        turma_funcionario.id_turma_funcionario,
        turma.data_termino,
        nr.tempo_reciclagem_meses,
        ROW_NUMBER() OVER (
            ORDER BY participante.email, evento.titulo, turma.nome
        ) AS ordem
    FROM turma_funcionarios turma_funcionario
    INNER JOIN usuarios participante
        ON participante.id_usuario = turma_funcionario.usuario_id
    INNER JOIN turmas turma
        ON turma.id_turma = turma_funcionario.turma_id
    INNER JOIN eventos evento
        ON evento.id_evento = turma.evento_id
    INNER JOIN usuarios gestor
        ON gestor.id_usuario = evento.gestor_id
    LEFT JOIN nr_catalogos nr
        ON nr.codigo_nr = evento.nr_id
    WHERE participante.email LIKE '%@example.com'
      AND gestor.email IN (
          'ana.dias.004@example.com',
          'ana.ferreira.005@example.com',
          'ana.gomes.006@example.com'
      )
),
dados AS (
    SELECT
        id_turma_funcionario,
        CASE
            WHEN MOD(ordem, 5) = 0 THEN 'PENDENTE'
            WHEN MOD(ordem, 5) = 1 THEN 'REJEITADO'
            ELSE 'CONCLUIDO'
        END AS status,
        CASE
            WHEN MOD(ordem, 5) = 0 THEN NULL
            ELSE data_termino
        END AS data_conclusao,
        CASE
            WHEN MOD(ordem, 5) = 0 THEN NULL
            ELSE data_termino + INTERVAL '1 day'
        END AS data_validacao,
        CASE
            WHEN MOD(ordem, 5) IN (0, 1) OR tempo_reciclagem_meses IS NULL THEN NULL
            ELSE (
                data_termino
                + MAKE_INTERVAL(months => tempo_reciclagem_meses)
            )::DATE
        END AS data_validade,
        CASE
            WHEN MOD(ordem, 5) = 1
                THEN 'Participação rejeitada para revisão dos dados de conclusão.'
            ELSE NULL
        END AS motivo_rejeicao
    FROM participacoes
)
INSERT INTO conclusao_eventos
    (turma_funcionario_id, status, data_conclusao,
     data_validacao, data_validade, motivo_rejeicao)
SELECT
    id_turma_funcionario,
    status,
    data_conclusao,
    data_validacao,
    data_validade,
    motivo_rejeicao
FROM dados
ON CONFLICT (turma_funcionario_id) DO UPDATE
SET status = EXCLUDED.status,
    data_conclusao = EXCLUDED.data_conclusao,
    data_validacao = EXCLUDED.data_validacao,
    data_validade = EXCLUDED.data_validade,
    motivo_rejeicao = EXCLUDED.motivo_rejeicao;
