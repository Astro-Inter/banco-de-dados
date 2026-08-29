INSERT INTO turmas
    (id_turma, evento_id, nome, data_inicial, data_termino)
VALUES
    (1, 1, 'Turma A - Matriz', '2026-05-12 08:00:00', '2026-05-12 12:00:00'),
    (2, 1, 'Turma B - Guarulhos', '2026-05-14 13:00:00', '2026-05-14 17:00:00'),
    (3, 2, 'Turma Única - Máquinas', '2026-09-10 08:00:00', '2026-09-10 17:00:00'),
    (4, 3, 'Turma A - Sede', '2026-06-03 08:00:00', '2026-06-03 16:00:00'),
    (5, 3, 'Turma B - Canteiro', '2026-06-05 08:00:00', '2026-06-05 16:00:00'),
    (6, 4, 'Turma Aplicação Segura', '2026-09-22 08:30:00', '2026-09-22 16:30:00'),
    (7, 5, 'Turma de Integração Cancelada', '2026-08-25 09:00:00', '2026-08-25 12:00:00')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('turmas', 'id_turma'),
    COALESCE(MAX(id_turma), 1),
    TRUE
)
FROM turmas;