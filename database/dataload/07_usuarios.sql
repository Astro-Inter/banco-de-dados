INSERT INTO usuarios
    (id_usuario, nome, email, senha_hash, tipo, cargo_id, unidade_id, cpf, modalidade, status)
VALUES
    (1,  'Ana Martins',       'ana.martins@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR_WORKSPACE', 1,  1, '10000000001', 'PRESENCIAL', 'ATIVO'),
    (2,  'Carlos Souza',      'carlos.souza@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR',           1,  1, '10000000002', 'PRESENCIAL', 'ATIVO'),
    (3,  'João Pereira',      'joao.pereira@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',      2,  1, '10000000003', 'PRESENCIAL', 'ATIVO'),
    (4,  'Maria Oliveira',    'maria.oliveira@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',      3,  2, '10000000004', 'PRESENCIAL', 'ATIVO'),
    (5,  'Roberto Lima',      'roberto.lima@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',      4,  2, '10000000005', 'PRESENCIAL', 'ATIVO'),
    (6,  'Beatriz Almeida',   'beatriz.almeida@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR_WORKSPACE', 5,  3, '20000000001', 'HÍBRIDO',     'ATIVO'),
    (7,  'Fernanda Rocha',    'fernanda.rocha@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR',           5,  3, '20000000002', 'PRESENCIAL', 'ATIVO'),
    (8,  'Lucas Andrade',     'lucas.andrade@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',      6,  3, '20000000003', 'HÍBRIDO',     'ATIVO'),
    (9,  'Pedro Santos',      'pedro.santos@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',      7,  4, '20000000004', 'PRESENCIAL', 'ATIVO'),
    (10, 'Juliana Ribeiro',   'juliana.ribeiro@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',      8,  4, '20000000005', 'PRESENCIAL', 'ATIVO'),
    (11, 'Camila Fernandes',  'camila.fernandes@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR_WORKSPACE', 9,  5, '30000000001', 'HÍBRIDO',     'ATIVO'),
    (12, 'Rafael Nogueira',   'rafael.nogueira@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR',           9,  5, '30000000002', 'PRESENCIAL', 'ATIVO'),
    (13, 'Mariana Costa',     'mariana.costa@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',     10,  5, '30000000003', 'HÍBRIDO',     'ATIVO'),
    (14, 'Diego Carvalho',    'diego.carvalho@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',     11,  6, '30000000004', 'PRESENCIAL', 'ATIVO'),
    (15, 'Sofia Mendes',      'sofia.mendes@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO',     12,  6, '30000000005', 'PRESENCIAL', 'ATIVO')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('usuarios', 'id_usuario'),
    COALESCE(MAX(id_usuario), 1),
    TRUE
)
FROM usuarios;