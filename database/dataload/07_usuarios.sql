INSERT INTO usuarios
    (nome, email, senha_hash, tipo, cargo_id, unidade_id, cpf, modalidade, status)
SELECT
    dados.nome,
    dados.email,
    dados.senha_hash,
    dados.tipo,
    c.id_cargo,
    u.id_unidade,
    dados.cpf,
    dados.modalidade,
    dados.status
FROM (
    VALUES
        ('11222333000144', 'Ana Martins', 'ana.martins@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR_WORKSPACE', 'Gestor de Segurança', 'Matriz São Paulo', '10000000001', 'PRESENCIAL', 'ATIVO'),
        ('11222333000144', 'Carlos Souza', 'carlos.souza@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR', 'Gestor de Segurança', 'Matriz São Paulo', '10000000002', 'PRESENCIAL', 'ATIVO'),
        ('11222333000144', 'João Pereira', 'joao.pereira@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '10000000003', 'PRESENCIAL', 'ATIVO'),
        ('11222333000144', 'Maria Oliveira', 'maria.oliveira@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '10000000004', 'PRESENCIAL', 'ATIVO'),
        ('11222333000144', 'Roberto Lima', 'roberto.lima@brasilfer.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Técnico de Manutenção', 'Unidade Guarulhos', '10000000005', 'PRESENCIAL', 'ATIVO'),
        ('22333444000155', 'Beatriz Almeida', 'beatriz.almeida@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR_WORKSPACE', 'Gestor de Segurança', 'Sede São Paulo', '20000000001', 'HÍBRIDO', 'ATIVO'),
        ('22333444000155', 'Fernanda Rocha', 'fernanda.rocha@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR', 'Gestor de Segurança', 'Sede São Paulo', '20000000002', 'PRESENCIAL', 'ATIVO'),
        ('22333444000155', 'Lucas Andrade', 'lucas.andrade@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '20000000003', 'HÍBRIDO', 'ATIVO'),
        ('22333444000155', 'Pedro Santos', 'pedro.santos@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Eletricista', 'Canteiro Osasco', '20000000004', 'PRESENCIAL', 'ATIVO'),
        ('22333444000155', 'Juliana Ribeiro', 'juliana.ribeiro@horizonte.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Trabalhador em Altura', 'Canteiro Osasco', '20000000005', 'PRESENCIAL', 'ATIVO'),
        ('33444555000166', 'Camila Fernandes', 'camila.fernandes@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR_WORKSPACE', 'Gestor de Segurança', 'Matriz Campinas', '30000000001', 'HÍBRIDO', 'ATIVO'),
        ('33444555000166', 'Rafael Nogueira', 'rafael.nogueira@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'GESTOR', 'Gestor de Segurança', 'Matriz Campinas', '30000000002', 'PRESENCIAL', 'ATIVO'),
        ('33444555000166', 'Mariana Costa', 'mariana.costa@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '30000000003', 'HÍBRIDO', 'ATIVO'),
        ('33444555000166', 'Diego Carvalho', 'diego.carvalho@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Centro de Distribuição Ribeirão Preto', '30000000004', 'PRESENCIAL', 'ATIVO'),
        ('33444555000166', 'Sofia Mendes', 'sofia.mendes@verdecampo.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Centro de Distribuição Ribeirão Preto', '30000000005', 'PRESENCIAL', 'ATIVO')
) AS dados(cnpj, nome, email, senha_hash, tipo, nome_cargo, nome_unidade, cpf, modalidade, status)
INNER JOIN workspaces w
    ON w.cnpj = dados.cnpj
INNER JOIN cargos c
    ON c.workspace_id = w.id_workspace
   AND c.nome = dados.nome_cargo
INNER JOIN unidades u
    ON u.workspace_id = w.id_workspace
   AND u.nome = dados.nome_unidade
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    senha_hash = EXCLUDED.senha_hash,
    tipo = EXCLUDED.tipo,
    cargo_id = EXCLUDED.cargo_id,
    unidade_id = EXCLUDED.unidade_id,
    cpf = EXCLUDED.cpf,
    modalidade = EXCLUDED.modalidade,
    status = EXCLUDED.status;