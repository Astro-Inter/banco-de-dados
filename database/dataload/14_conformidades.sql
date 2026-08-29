WITH dados (
    participante_email, nr_id, aplicavel, data_validade, origem,
    gestor_email, titulo_evento, nome_turma
) AS (
    VALUES
        ('joao.pereira@brasilfer.local', 6, TRUE, '2028-05-12', 'CONCLUSAO_EVENTO', 'carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma A - Matriz'),
        ('maria.oliveira@brasilfer.local', 6, TRUE, '2028-05-14', 'CONCLUSAO_EVENTO', 'carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos'),
        ('roberto.lima@brasilfer.local', 6, TRUE, '2028-05-14', 'CONCLUSAO_EVENTO', 'carlos.souza@brasilfer.local', 'Reciclagem de uso de EPI', 'Turma B - Guarulhos'),
        ('lucas.andrade@horizonte.local', 35, TRUE, '2028-06-03', 'CONCLUSAO_EVENTO', 'fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede'),
        ('pedro.santos@horizonte.local', 35, TRUE, '2028-06-03', 'CONCLUSAO_EVENTO', 'fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma A - Sede'),
        ('juliana.ribeiro@horizonte.local', 35, TRUE, '2028-06-05', 'CONCLUSAO_EVENTO', 'fernanda.rocha@horizonte.local', 'Capacitação para trabalho em altura', 'Turma B - Canteiro'),
        ('mariana.costa@verdecampo.local', 31, TRUE, NULL, 'REGISTRO_MANUAL', NULL, NULL, NULL),
        ('diego.carvalho@verdecampo.local', 31, FALSE, NULL, 'ANALISE_CARGO', NULL, NULL, NULL),
        ('sofia.mendes@verdecampo.local', 12, TRUE, NULL, 'ANALISE_CARGO', NULL, NULL, NULL)
),
resolvidos AS (
    SELECT
        participante.id_usuario AS usuario_id,
        dados.nr_id,
        dados.aplicavel,
        dados.data_validade::DATE AS data_validade,
        dados.origem,
        ce.id_conclusao_evento AS conclusao_evento_id
    FROM dados
    INNER JOIN usuarios participante
        ON participante.email = dados.participante_email
    LEFT JOIN usuarios gestor
        ON gestor.email = dados.gestor_email
    LEFT JOIN eventos e
        ON e.gestor_id = gestor.id_usuario
       AND e.titulo = dados.titulo_evento
    LEFT JOIN turmas t
        ON t.evento_id = e.id_evento
       AND t.nome = dados.nome_turma
    LEFT JOIN turma_funcionarios tf
        ON tf.turma_id = t.id_turma
       AND tf.usuario_id = participante.id_usuario
    LEFT JOIN conclusao_eventos ce
        ON ce.turma_funcionario_id = tf.id_turma_funcionario
)
INSERT INTO conformidades
    (usuario_id, nr_id, aplicavel, data_validade, origem, conclusao_evento_id)
SELECT
    resolvidos.usuario_id,
    resolvidos.nr_id,
    resolvidos.aplicavel,
    resolvidos.data_validade,
    resolvidos.origem,
    resolvidos.conclusao_evento_id
FROM resolvidos
WHERE NOT EXISTS (
    SELECT 1
    FROM conformidades c
    WHERE c.usuario_id = resolvidos.usuario_id
      AND c.nr_id = resolvidos.nr_id
      AND c.origem = resolvidos.origem
      AND c.conclusao_evento_id IS NOT DISTINCT FROM resolvidos.conclusao_evento_id
);