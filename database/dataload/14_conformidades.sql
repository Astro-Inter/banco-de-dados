INSERT INTO conformidades
    (usuario_id, nr_id, aplicavel, data_validade, origem, conclusao_evento_id)
SELECT
    turma_funcionario.usuario_id,
    evento.nr_id,
    TRUE,
    conclusao.data_validade,
    'CONCLUSAO_EVENTO',
    conclusao.id_conclusao_evento
FROM conclusao_eventos conclusao
INNER JOIN turma_funcionarios turma_funcionario
    ON turma_funcionario.id_turma_funcionario = conclusao.turma_funcionario_id
INNER JOIN usuarios participante
    ON participante.id_usuario = turma_funcionario.usuario_id
INNER JOIN turmas turma
    ON turma.id_turma = turma_funcionario.turma_id
INNER JOIN eventos evento
    ON evento.id_evento = turma.evento_id
INNER JOIN usuarios gestor
    ON gestor.id_usuario = evento.gestor_id
WHERE conclusao.status = 'CONCLUIDO'
  AND evento.nr_id IS NOT NULL
  AND participante.email LIKE '%@example.com'
  AND (gestor.email IN (
      'ana.dias.004@example.com',
      'ana.ferreira.005@example.com',
      'ana.gomes.006@example.com'
  ) OR (gestor.unidade_id = 1 AND participante.unidade_id = 1
        AND participante.email ~ '^[^.]+[.]c689bedf0fc64d4c[.]([1-9][0-9]?|100)@example[.]com$'))
ON CONFLICT (conclusao_evento_id) DO UPDATE
SET usuario_id = EXCLUDED.usuario_id,
    nr_id = EXCLUDED.nr_id,
    aplicavel = EXCLUDED.aplicavel,
    data_validade = EXCLUDED.data_validade,
    origem = EXCLUDED.origem;

-- SCRUM-172: NRs aplicáveis ao cargo ainda sem conclusão permanecem sem validade.
-- Cada funcionário tem duas NRs aplicáveis: 60 registros por conclusão e 140 por análise.
INSERT INTO conformidades
    (usuario_id, nr_id, aplicavel, data_validade, origem, conclusao_evento_id)
SELECT participante.id_usuario, cargo_nr.nr_id, TRUE, NULL, 'ANALISE_CARGO', NULL
FROM usuarios participante
INNER JOIN cargo_nrs cargo_nr ON cargo_nr.cargo_id = participante.cargo_id
INNER JOIN unidade_nrs unidade_nr
    ON unidade_nr.unidade_id = participante.unidade_id AND unidade_nr.nr_id = cargo_nr.nr_id
WHERE participante.unidade_id = 1
  AND participante.tipo = 'FUNCIONARIO'
  AND participante.email ~ '^[^.]+[.]c689bedf0fc64d4c[.]([1-9][0-9]?|100)@example[.]com$'
  AND NOT EXISTS (
      SELECT 1 FROM conformidades existente
      WHERE existente.usuario_id = participante.id_usuario AND existente.nr_id = cargo_nr.nr_id
  );
