-- Analisa a busca reversa dos cargos associados a uma NR.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT cargo_id
FROM cargo_nrs
WHERE nr_id = (SELECT MIN(nr_id) FROM cargo_nrs)
ORDER BY cargo_id;

CREATE INDEX IF NOT EXISTS idx_cargo_nrs_nr_cargo
    ON cargo_nrs (nr_id, cargo_id);

COMMENT ON INDEX idx_cargo_nrs_nr_cargo IS
'Otimiza a busca dos cargos aos quais uma Norma Regulamentadora se aplica.';
