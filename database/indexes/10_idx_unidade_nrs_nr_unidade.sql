-- Analisa a busca reversa das unidades associadas a uma NR.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT unidade_id
FROM unidade_nrs
WHERE nr_id = (SELECT MIN(nr_id) FROM unidade_nrs)
ORDER BY unidade_id;

CREATE INDEX IF NOT EXISTS idx_unidade_nrs_nr_unidade
    ON unidade_nrs (nr_id, unidade_id);

COMMENT ON INDEX idx_unidade_nrs_nr_unidade IS
'Otimiza a busca das unidades às quais uma Norma Regulamentadora se aplica.';
