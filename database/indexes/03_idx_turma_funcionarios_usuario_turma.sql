-- Analisa a consulta das turmas e participações de um usuário.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT id_turma_funcionario, turma_id
FROM turma_funcionarios
WHERE usuario_id = (SELECT MIN(usuario_id) FROM turma_funcionarios)
ORDER BY turma_id;

CREATE INDEX IF NOT EXISTS idx_turma_funcionarios_usuario_turma
    ON turma_funcionarios (usuario_id, turma_id);

COMMENT ON INDEX idx_turma_funcionarios_usuario_turma IS
'Otimiza a consulta das turmas e do histórico de treinamentos de um usuário.';
