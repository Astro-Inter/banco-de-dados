-- Analisa a listagem de eventos ativos administrados por um gestor.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_evento, titulo, nr_id
FROM evento
WHERE gestor_id = (SELECT MIN(gestor_id) FROM evento)
  AND status = 'ATIVO'
ORDER BY id_evento DESC;

CREATE INDEX IF NOT EXISTS idx_evento_gestor_status
    ON evento (gestor_id, status);

COMMENT ON INDEX idx_evento_gestor_status IS
'Otimiza a consulta dos eventos administrados por um gestor, filtrados por status.';
