INSERT INTO conclusao_eventos
    (id_conclusao_evento, turma_funcionario_id, status,
     data_conclusao, data_validacao, data_validade, motivo_rejeicao)
VALUES
    (1,  1,  'CONCLUIDO', '2026-05-12 12:00:00', '2026-05-13 09:00:00', '2028-05-12', NULL),
    (2,  2,  'CONCLUIDO', '2026-05-14 17:00:00', '2026-05-15 09:30:00', '2028-05-14', NULL),
    (3,  3,  'CONCLUIDO', '2026-05-14 17:00:00', '2026-05-15 10:00:00', '2028-05-14', NULL),
    (4,  4,  'PENDENTE',  NULL, NULL, NULL, NULL),
    (5,  5,  'PENDENTE',  NULL, NULL, NULL, NULL),
    (6,  6,  'CONCLUIDO', '2026-06-03 16:00:00', '2026-06-03 16:20:00', '2028-06-03', NULL),
    (7,  7,  'CONCLUIDO', '2026-06-03 16:00:00', '2026-06-03 16:20:00', '2028-06-03', NULL),
    (8,  8,  'CONCLUIDO', '2026-06-05 16:00:00', '2026-06-05 16:20:00', '2028-06-05', NULL),
    (9,  9,  'PENDENTE',  NULL, NULL, NULL, NULL),
    (10, 10, 'REJEITADO', '2026-09-22 16:30:00', '2026-09-23 09:00:00', NULL, 'Evidência apresentada não permite identificar o participante.'),
    (11, 11, 'PENDENTE',  NULL, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('conclusao_eventos', 'id_conclusao_evento'),
    COALESCE(MAX(id_conclusao_evento), 1),
    TRUE
)
FROM conclusao_eventos;