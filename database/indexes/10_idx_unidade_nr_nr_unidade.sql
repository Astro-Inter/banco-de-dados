-- Analisa a busca reversa das unidades associadas a uma NR.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT unidade_id
FROM unidade_nr
WHERE nr_id = (SELECT MIN(nr_id) FROM unidade_nr)
ORDER BY unidade_id;

CREATE INDEX IF NOT EXISTS idx_unidade_nr_nr_unidade
    ON unidade_nr (nr_id, unidade_id);

COMMENT ON INDEX idx_unidade_nr_nr_unidade IS
'Otimiza a busca das unidades às quais uma Norma Regulamentadora se aplica.';
