-- Analisa a listagem de usuários ativos pertencentes a uma unidade.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_usuario, nome, cargo_id, criado_em
FROM usuario
WHERE unidade_id = (SELECT MIN(id_unidade) FROM unidade)
  AND status = 'ATIVO'
ORDER BY nome;

CREATE INDEX IF NOT EXISTS idx_usuario_unidade_status
    ON usuario (unidade_id, status);

COMMENT ON INDEX idx_usuario_unidade_status IS
'Otimiza listagens e filtros de usuários por unidade e situação cadastral.';
