-- Analisa a listagem de eventos ativos relacionados a uma NR.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_evento, gestor_id, titulo
FROM eventos
WHERE nr_id = (SELECT MIN(nr_id) FROM eventos WHERE nr_id IS NOT NULL)
  AND status = 'ATIVO'
ORDER BY id_evento DESC;

CREATE INDEX IF NOT EXISTS idx_eventos_nr_status
    ON eventos (nr_id, status);

COMMENT ON INDEX idx_eventos_nr_status IS
'Otimiza a consulta de eventos vinculados a uma NR, filtrados por status.';
