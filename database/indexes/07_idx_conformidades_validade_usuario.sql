-- Analisa a fila de conformidades aplicáveis vencidas ou próximas do vencimento.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_conformidade, usuario_id, nr_id, data_validade
FROM conformidades
WHERE aplicavel IS TRUE
  AND data_validade IS NOT NULL
  AND data_validade <= CURRENT_DATE + 30
ORDER BY data_validade, usuario_id;

CREATE INDEX IF NOT EXISTS idx_conformidades_validade_usuario
    ON conformidades (data_validade, usuario_id)
    WHERE aplicavel IS TRUE
      AND data_validade IS NOT NULL;

COMMENT ON INDEX idx_conformidades_validade_usuario IS
'Otimiza a identificação de conformidades aplicáveis vencidas ou próximas do vencimento.';
