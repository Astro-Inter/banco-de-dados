-- Analisa a consulta das evidências vinculadas a uma conclusão de evento.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_evidencia, nome_original, caminho_objeto, mime_type, tamanho_bytes
FROM evidencias
WHERE conclusao_evento_id = (
    SELECT MIN(conclusao_evento_id)
    FROM evidencias
)
ORDER BY id_evidencia;

CREATE INDEX IF NOT EXISTS idx_evidencias_conclusao_evento
    ON evidencias (conclusao_evento_id);

COMMENT ON INDEX idx_evidencias_conclusao_evento IS
'Otimiza a consulta das evidências associadas a uma conclusão de evento.';
