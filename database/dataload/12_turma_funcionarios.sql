INSERT INTO turma_funcionarios
    (id_turma_funcionario, turma_id, usuario_id)
VALUES
    (1,  1, 3),
    (2,  2, 4),
    (3,  2, 5),
    (4,  3, 3),
    (5,  3, 4),
    (6,  4, 8),
    (7,  4, 9),
    (8,  5, 10),
    (9,  6, 13),
    (10, 6, 14),
    (11, 6, 15)
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('turma_funcionarios', 'id_turma_funcionario'),
    COALESCE(MAX(id_turma_funcionario), 1),
    TRUE
)
FROM turma_funcionarios;