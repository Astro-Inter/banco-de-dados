INSERT INTO turmas
    (evento_id, nome, data_inicial, data_termino)
SELECT
    e.id_evento,
    dados.nome_turma,
    dados.data_inicial::TIMESTAMP,
    dados.data_termino::TIMESTAMP
FROM (
    VALUES
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma A - Matriz', '2026-05-12 08:00:00', '2026-05-12 12:00:00'),
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos', '2026-05-14 13:00:00', '2026-05-14 17:00:00'),
        ('carlos.souza@brasilfer.local', 'Segurança na operação de máquinas', 'Turma Única - Máquinas', '2026-09-10 08:00:00', '2026-09-10 17:00:00'),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede', '2026-06-03 08:00:00', '2026-06-03 16:00:00'),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma B - Canteiro', '2026-06-05 08:00:00', '2026-06-05 16:00:00'),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', '2026-09-22 08:30:00', '2026-09-22 16:30:00'),
        ('rafael.nogueira@verdecampo.local', 'Integração geral de segurança', 'Turma de Integração Cancelada', '2026-08-25 09:00:00', '2026-08-25 12:00:00')
) AS dados(gestor_email, titulo_evento, nome_turma, data_inicial, data_termino)
INNER JOIN usuarios gestor
    ON gestor.email = dados.gestor_email
INNER JOIN eventos e
    ON e.gestor_id = gestor.id_usuario
   AND e.titulo = dados.titulo_evento
ON CONFLICT (evento_id, nome) DO UPDATE
SET data_inicial = EXCLUDED.data_inicial,
    data_termino = EXCLUDED.data_termino;