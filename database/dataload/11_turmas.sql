WITH eventos_base (gestor_email, titulo_evento, data_base) AS (
    VALUES
        ('ana.dias.004@example.com', 'Integração para uso de EPI', '2026-02-10'::DATE),
        ('ana.dias.004@example.com', 'Operação segura de máquinas', '2026-03-10'::DATE),
        ('ana.dias.004@example.com', 'Manutenção elétrica industrial', '2026-04-14'::DATE),
        ('ana.dias.004@example.com', 'Movimentação segura de materiais', '2026-07-22'::DATE),
        ('ana.ferreira.005@example.com', 'Capacitação para trabalho em altura', '2026-02-17'::DATE),
        ('ana.ferreira.005@example.com', 'Segurança no canteiro de obras', '2026-03-17'::DATE),
        ('ana.ferreira.005@example.com', 'Segurança elétrica no canteiro', '2026-04-21'::DATE),
        ('ana.ferreira.005@example.com', 'Espaços confinados na construção', '2026-07-24'::DATE),
        ('ana.gomes.006@example.com', 'Segurança nas atividades rurais', '2026-02-24'::DATE),
        ('ana.gomes.006@example.com', 'Manuseio de inflamáveis e defensivos', '2026-03-24'::DATE),
        ('ana.gomes.006@example.com', 'Operação de máquinas agrícolas', '2026-04-28'::DATE),
        ('ana.gomes.006@example.com', 'Proteção individual no campo', '2026-07-28'::DATE)
),
dados AS (
    SELECT
        eventos_base.gestor_email,
        eventos_base.titulo_evento,
        turma.nome_turma,
        eventos_base.data_base + turma.deslocamento AS data_turma
    FROM eventos_base
    CROSS JOIN (
        VALUES
            ('Turma A', 0),
            ('Turma B', 2)
    ) AS turma(nome_turma, deslocamento)
)
INSERT INTO turmas
    (evento_id, nome, data_inicial, data_termino)
SELECT
    e.id_evento,
    dados.nome_turma,
    dados.data_turma + TIME '08:00:00',
    dados.data_turma + TIME '12:00:00'
FROM dados
INNER JOIN usuarios gestor
    ON gestor.email = dados.gestor_email
INNER JOIN eventos e
    ON e.gestor_id = gestor.id_usuario
   AND e.titulo = dados.titulo_evento
ON CONFLICT (evento_id, nome) DO UPDATE
SET data_inicial = EXCLUDED.data_inicial,
    data_termino = EXCLUDED.data_termino;
