INSERT INTO turma_funcionarios (turma_id, usuario_id)
SELECT
    t.id_turma,
    participante.id_usuario
FROM (
    VALUES
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma A - Matriz', 'joao.pereira@brasilfer.local'),
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos', 'maria.oliveira@brasilfer.local'),
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos', 'roberto.lima@brasilfer.local'),
        ('carlos.souza@brasilfer.local', 'Segurança na operação de máquinas', 'Turma Única - Máquinas', 'joao.pereira@brasilfer.local'),
        ('carlos.souza@brasilfer.local', 'Segurança na operação de máquinas', 'Turma Única - Máquinas', 'maria.oliveira@brasilfer.local'),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede', 'lucas.andrade@horizonte.local'),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede', 'pedro.santos@horizonte.local'),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma B - Canteiro', 'juliana.ribeiro@horizonte.local'),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', 'mariana.costa@verdecampo.local'),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', 'diego.carvalho@verdecampo.local'),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', 'sofia.mendes@verdecampo.local')
) AS dados(gestor_email, titulo_evento, nome_turma, participante_email)
INNER JOIN usuarios gestor
    ON gestor.email = dados.gestor_email
INNER JOIN eventos e
    ON e.gestor_id = gestor.id_usuario
   AND e.titulo = dados.titulo_evento
INNER JOIN turmas t
    ON t.evento_id = e.id_evento
   AND t.nome = dados.nome_turma
INNER JOIN usuarios participante
    ON participante.email = dados.participante_email
ON CONFLICT (turma_id, usuario_id) DO NOTHING;