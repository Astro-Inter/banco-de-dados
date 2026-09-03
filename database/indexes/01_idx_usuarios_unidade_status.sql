-- Analisa a listagem de usuários ativos pertencentes a uma unidade.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_usuario, nome, cargo_id, criado_em
FROM usuarios
WHERE unidade_id = (SELECT MIN(id_unidade) FROM unidades)
  AND status = 'ATIVO'
ORDER BY nome;

CREATE INDEX IF NOT EXISTS idx_usuarios_unidade_status
    ON usuarios (unidade_id, status);

COMMENT ON INDEX idx_usuarios_unidade_status IS
'Otimiza listagens e filtros de usuários por unidade e situação cadastral.';
