WITH dados (
    gestor_email, nr_id, titulo, descricao, link_externo,
    modo_conclusao, evidencia_obrigatoria, status,
    data_cancelamento, motivo_cancelamento
) AS (
    VALUES
        ('carlos.souza@brasilfer.local', 6, 'Reciclagem de uso de EPI', 'Treinamento de reciclagem sobre seleção, utilização, conservação e substituição de equipamentos de proteção individual.', 'https://treinamentos.astro.local/nr-06', 'FUNCIONARIO', TRUE, 'CONCLUIDO', NULL, NULL),
        ('carlos.souza@brasilfer.local', 12, 'Segurança na operação de máquinas', 'Orientações práticas para operação segura, bloqueio e inspeção de máquinas industriais.', NULL, 'GESTOR', FALSE, 'ATIVO', NULL, NULL),
        ('fernanda.rocha@horizonte.local', 35, 'Capacitação para trabalho em altura', 'Capacitação obrigatória para profissionais que realizam atividades acima de dois metros.', 'https://treinamentos.astro.local/nr-35', 'LISTA_PRESENCA', FALSE, 'CONCLUIDO', NULL, NULL),
        ('rafael.nogueira@verdecampo.local', 31, 'Segurança na aplicação de defensivos', 'Treinamento sobre preparação, aplicação, armazenamento e descarte seguro de defensivos agrícolas.', 'https://treinamentos.astro.local/nr-31', 'FUNCIONARIO', TRUE, 'ATIVO', NULL, NULL),
        ('rafael.nogueira@verdecampo.local', NULL, 'Integração geral de segurança', 'Integração institucional de segurança para novos funcionários da unidade.', NULL, 'GESTOR', FALSE, 'CANCELADO', '2026-08-20 14:00:00', 'Evento reagendado devido à indisponibilidade do instrutor.')
),
atualizados AS (
    UPDATE eventos e
    SET nr_id = dados.nr_id,
        descricao = dados.descricao,
        link_externo = dados.link_externo,
        modo_conclusao = dados.modo_conclusao,
        evidencia_obrigatoria = dados.evidencia_obrigatoria,
        status = dados.status,
        data_cancelamento = dados.data_cancelamento::TIMESTAMP,
        motivo_cancelamento = dados.motivo_cancelamento
    FROM dados
    INNER JOIN usuarios gestor
        ON gestor.email = dados.gestor_email
    WHERE e.gestor_id = gestor.id_usuario
      AND e.titulo = dados.titulo
    RETURNING e.id_evento
)
INSERT INTO eventos
    (gestor_id, nr_id, titulo, descricao, link_externo, modo_conclusao,
     evidencia_obrigatoria, status, data_cancelamento, motivo_cancelamento)
SELECT
    gestor.id_usuario,
    dados.nr_id,
    dados.titulo,
    dados.descricao,
    dados.link_externo,
    dados.modo_conclusao,
    dados.evidencia_obrigatoria,
    dados.status,
    dados.data_cancelamento::TIMESTAMP,
    dados.motivo_cancelamento
FROM dados
INNER JOIN usuarios gestor
    ON gestor.email = dados.gestor_email
WHERE NOT EXISTS (
    SELECT 1
    FROM eventos e
    WHERE e.gestor_id = gestor.id_usuario
      AND e.titulo = dados.titulo
);