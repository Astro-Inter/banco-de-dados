-- Analisa a consulta das evidências vinculadas a uma conclusão de evento.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_evidencia, nome_original, caminho_objeto, mime_type, tamanho_byte
FROM evidencia
WHERE conclusao_evento_id = (
    SELECT MIN(conclusao_evento_id)
    FROM evidencia
)
ORDER BY id_evidencia;

CREATE INDEX IF NOT EXISTS idx_evidencia_conclusao_evento
    ON evidencia (conclusao_evento_id);

COMMENT ON INDEX idx_evidencia_conclusao_evento IS
'Otimiza a consulta das evidências associadas a uma conclusão de evento.';
