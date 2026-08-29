INSERT INTO conclusao_eventos
    (turma_funcionario_id, status, data_conclusao,
     data_validacao, data_validade, motivo_rejeicao)
SELECT
    tf.id_turma_funcionario,
    dados.status,
    dados.data_conclusao::TIMESTAMP,
    dados.data_validacao::TIMESTAMP,
    dados.data_validade::DATE,
    dados.motivo_rejeicao
FROM (
    VALUES
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma A - Matriz', 'joao.pereira@brasilfer.local', 'CONCLUIDO', '2026-05-12 12:00:00', '2026-05-13 09:00:00', '2028-05-12', NULL),
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos', 'maria.oliveira@brasilfer.local', 'CONCLUIDO', '2026-05-14 17:00:00', '2026-05-15 09:30:00', '2028-05-14', NULL),
        ('carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos', 'roberto.lima@brasilfer.local', 'CONCLUIDO', '2026-05-14 17:00:00', '2026-05-15 10:00:00', '2028-05-14', NULL),
        ('carlos.souza@brasilfer.local', 'Segurança na operação de máquinas', 'Turma Única - Máquinas', 'joao.pereira@brasilfer.local', 'PENDENTE', NULL, NULL, NULL, NULL),
        ('carlos.souza@brasilfer.local', 'Segurança na operação de máquinas', 'Turma Única - Máquinas', 'maria.oliveira@brasilfer.local', 'PENDENTE', NULL, NULL, NULL, NULL),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede', 'lucas.andrade@horizonte.local', 'CONCLUIDO', '2026-06-03 16:00:00', '2026-06-03 16:20:00', '2028-06-03', NULL),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede', 'pedro.santos@horizonte.local', 'CONCLUIDO', '2026-06-03 16:00:00', '2026-06-03 16:20:00', '2028-06-03', NULL),
        ('fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma B - Canteiro', 'juliana.ribeiro@horizonte.local', 'CONCLUIDO', '2026-06-05 16:00:00', '2026-06-05 16:20:00', '2028-06-05', NULL),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', 'mariana.costa@verdecampo.local', 'PENDENTE', NULL, NULL, NULL, NULL),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', 'diego.carvalho@verdecampo.local', 'REJEITADO', '2026-09-22 16:30:00', '2026-09-23 09:00:00', NULL, 'Evidência apresentada não permite identificar o participante.'),
        ('rafael.nogueira@verdecampo.local', 'Segurança na aplicação de defensivos', 'Turma Aplicação Segura', 'sofia.mendes@verdecampo.local', 'PENDENTE', NULL, NULL, NULL, NULL)
) AS dados(gestor_email, titulo_evento, nome_turma, participante_email, status, data_conclusao, data_validacao, data_validade, motivo_rejeicao)
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
INNER JOIN turma_funcionarios tf
    ON tf.turma_id = t.id_turma
   AND tf.usuario_id = participante.id_usuario
ON CONFLICT (turma_funcionario_id) DO UPDATE
SET status = EXCLUDED.status,
    data_conclusao = EXCLUDED.data_conclusao,
    data_validacao = EXCLUDED.data_validacao,
    data_validade = EXCLUDED.data_validade,
    motivo_rejeicao = EXCLUDED.motivo_rejeicao;