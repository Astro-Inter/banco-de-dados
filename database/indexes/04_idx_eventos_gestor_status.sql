-- Analisa a listagem de eventos ativos administrados por um gestor.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_evento, titulo, nr_id
FROM eventos
WHERE gestor_id = (SELECT MIN(gestor_id) FROM eventos)
  AND status = 'ATIVO'
ORDER BY id_evento DESC;

CREATE INDEX IF NOT EXISTS idx_eventos_gestor_status
    ON eventos (gestor_id, status);

COMMENT ON INDEX idx_eventos_gestor_status IS
'Otimiza a consulta dos eventos administrados por um gestor, filtrados por status.';
