-- Analisa a localização da conformidade de um usuário para uma NR específica.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_conformidade, aplicavel, data_validade, origem
FROM conformidades
WHERE (usuario_id, nr_id) = (
    SELECT usuario_id, nr_id
    FROM conformidades
    ORDER BY id_conformidade
    LIMIT 1
);

CREATE INDEX IF NOT EXISTS idx_conformidades_usuario_nr
    ON conformidades (usuario_id, nr_id);

COMMENT ON INDEX idx_conformidades_usuario_nr IS
'Otimiza a consulta das conformidades de um usuário por Norma Regulamentadora.';
