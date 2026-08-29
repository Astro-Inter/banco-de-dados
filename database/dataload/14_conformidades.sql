INSERT INTO conformidades
    (id_conformidade, usuario_id, nr_id, aplicavel,
     data_validade, origem, conclusao_evento_id)
VALUES
    (1, 3,  6,  TRUE,  '2028-05-12', 'CONCLUSAO_EVENTO', 1),
    (2, 4,  6,  TRUE,  '2028-05-14', 'CONCLUSAO_EVENTO', 2),
    (3, 5,  6,  TRUE,  '2028-05-14', 'CONCLUSAO_EVENTO', 3),
    (4, 8,  35, TRUE,  '2028-06-03', 'CONCLUSAO_EVENTO', 6),
    (5, 9,  35, TRUE,  '2028-06-03', 'CONCLUSAO_EVENTO', 7),
    (6, 10, 35, TRUE,  '2028-06-05', 'CONCLUSAO_EVENTO', 8),
    (7, 13, 31, TRUE,  NULL,         'REGISTRO_MANUAL', NULL),
    (8, 14, 31, FALSE, NULL,         'ANALISE_CARGO', NULL),
    (9, 15, 12, TRUE,  NULL,         'ANALISE_CARGO', NULL)
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('conformidades', 'id_conformidade'),
    COALESCE(MAX(id_conformidade), 1),
    TRUE
)
FROM conformidades;