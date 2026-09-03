-- Analisa a listagem de usuários ativos vinculados a um cargo.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_usuario, nome, unidade_id, criado_em
FROM usuarios
WHERE cargo_id = (SELECT MIN(id_cargo) FROM cargos)
  AND status = 'ATIVO'
ORDER BY nome;

CREATE INDEX IF NOT EXISTS idx_usuarios_cargo_status
    ON usuarios (cargo_id, status);

COMMENT ON INDEX idx_usuarios_cargo_status IS
'Otimiza listagens e filtros de usuários por cargo e situação cadastral.';
