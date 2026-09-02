WITH dados (
    gestor_email, nr_id, titulo, descricao, link_externo,
    modo_conclusao, evidencia_obrigatoria, status,
    data_cancelamento, motivo_cancelamento
) AS (
    VALUES
        ('ana.dias.004@example.com', 6, 'Integração para uso de EPI', 'Treinamento prático sobre seleção, utilização, conservação e substituição de equipamentos de proteção individual.', 'https://treinamentos.astro.local/nr-06', 'FUNCIONARIO', FALSE, 'CONCLUIDO', NULL, NULL),
        ('ana.dias.004@example.com', 12, 'Operação segura de máquinas', 'Capacitação sobre inspeção, bloqueio e operação segura de máquinas industriais.', NULL, 'GESTOR', FALSE, 'ATIVO', NULL, NULL),
        ('ana.dias.004@example.com', 10, 'Manutenção elétrica industrial', 'Reciclagem de segurança para intervenções em instalações elétricas industriais.', 'https://treinamentos.astro.local/nr-10', 'LISTA_PRESENCA', FALSE, 'CONCLUIDO', NULL, NULL),
        ('ana.dias.004@example.com', 11, 'Movimentação segura de materiais', 'Orientações para transporte, armazenamento e movimentação de materiais na planta.', NULL, 'GESTOR', FALSE, 'CANCELADO', '2026-07-15 14:00:00', 'Treinamento remarcado por indisponibilidade do instrutor.'),
        ('ana.ferreira.005@example.com', 35, 'Capacitação para trabalho em altura', 'Capacitação obrigatória para profissionais que executam atividades acima de dois metros.', 'https://treinamentos.astro.local/nr-35', 'LISTA_PRESENCA', FALSE, 'CONCLUIDO', NULL, NULL),
        ('ana.ferreira.005@example.com', 18, 'Segurança no canteiro de obras', 'Boas práticas de prevenção de acidentes e organização das frentes de trabalho.', NULL, 'GESTOR', FALSE, 'ATIVO', NULL, NULL),
        ('ana.ferreira.005@example.com', 10, 'Segurança elétrica no canteiro', 'Treinamento para identificação e controle de riscos elétricos temporários no canteiro.', 'https://treinamentos.astro.local/nr-10-construcao', 'FUNCIONARIO', FALSE, 'CONCLUIDO', NULL, NULL),
        ('ana.ferreira.005@example.com', 33, 'Espaços confinados na construção', 'Preparação de equipes para entrada, monitoramento e resgate em espaços confinados.', NULL, 'GESTOR', FALSE, 'CANCELADO', '2026-07-18 10:00:00', 'Atividade suspensa para revisão do plano de resgate.'),
        ('ana.gomes.006@example.com', 31, 'Segurança nas atividades rurais', 'Treinamento sobre riscos ocupacionais nas operações agrícolas e medidas preventivas.', 'https://treinamentos.astro.local/nr-31', 'FUNCIONARIO', FALSE, 'CONCLUIDO', NULL, NULL),
        ('ana.gomes.006@example.com', 20, 'Manuseio de inflamáveis e defensivos', 'Orientações para armazenamento e manipulação segura de produtos inflamáveis e defensivos.', NULL, 'GESTOR', FALSE, 'ATIVO', NULL, NULL),
        ('ana.gomes.006@example.com', 12, 'Operação de máquinas agrícolas', 'Capacitação para inspeção e operação segura de tratores e implementos agrícolas.', 'https://treinamentos.astro.local/nr-12-agricola', 'LISTA_PRESENCA', FALSE, 'CONCLUIDO', NULL, NULL),
        ('ana.gomes.006@example.com', 6, 'Proteção individual no campo', 'Orientações sobre escolha e conservação de equipamentos de proteção para atividades rurais.', NULL, 'GESTOR', FALSE, 'CANCELADO', '2026-07-20 09:00:00', 'Turmas canceladas durante a atualização do conteúdo programático.')
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
