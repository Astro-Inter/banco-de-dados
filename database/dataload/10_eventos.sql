INSERT INTO eventos
    (id_evento, gestor_id, nr_id, titulo, descricao, link_externo,
     modo_conclusao, evidencia_obrigatoria, status,
     data_cancelamento, motivo_cancelamento)
VALUES
    (1, 2, 6,
     'Reciclagem de uso de EPI',
     'Treinamento de reciclagem sobre seleção, utilização, conservação e substituição de equipamentos de proteção individual.',
     'https://treinamentos.astro.local/nr-06',
     'FUNCIONARIO', TRUE, 'CONCLUIDO', NULL, NULL),
    (2, 2, 12,
     'Segurança na operação de máquinas',
     'Orientações práticas para operação segura, bloqueio e inspeção de máquinas industriais.',
     NULL,
     'GESTOR', FALSE, 'ATIVO', NULL, NULL),
    (3, 7, 35,
     'Capacitação para trabalho em altura',
     'Capacitação obrigatória para profissionais que realizam atividades acima de dois metros.',
     'https://treinamentos.astro.local/nr-35',
     'LISTA_PRESENCA', FALSE, 'CONCLUIDO', NULL, NULL),
    (4, 12, 31,
     'Segurança na aplicação de defensivos',
     'Treinamento sobre preparação, aplicação, armazenamento e descarte seguro de defensivos agrícolas.',
     'https://treinamentos.astro.local/nr-31',
     'FUNCIONARIO', TRUE, 'ATIVO', NULL, NULL),
    (5, 12, NULL,
     'Integração geral de segurança',
     'Integração institucional de segurança para novos funcionários da unidade.',
     NULL,
     'GESTOR', FALSE, 'CANCELADO',
     '2026-08-20 14:00:00', 'Evento reagendado devido à indisponibilidade do instrutor.')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('eventos', 'id_evento'),
    COALESCE(MAX(id_evento), 1),
    TRUE
)
FROM eventos;