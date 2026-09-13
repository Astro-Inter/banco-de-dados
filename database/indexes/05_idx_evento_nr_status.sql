-- Analisa a listagem de eventos ativos relacionados a uma NR.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_evento, gestor_id, titulo
FROM evento
WHERE nr_id = (SELECT MIN(nr_id) FROM evento WHERE nr_id IS NOT NULL)
  AND status = 'ATIVO'
ORDER BY id_evento DESC;

CREATE INDEX IF NOT EXISTS idx_evento_nr_status
    ON evento (nr_id, status);

COMMENT ON INDEX idx_evento_nr_status IS
'Otimiza a consulta de eventos vinculados a uma NR, filtrados por status.';
