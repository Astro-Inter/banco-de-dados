INSERT INTO unidade_enderecos
    (unidade_id, cep, rua, cidade, bairro, estado, complemento)
SELECT
    u.id_unidade,
    dados.cep,
    dados.rua,
    dados.cidade,
    dados.bairro,
    dados.estado,
    dados.complemento
FROM (
    VALUES
        ('11222333000144', 'Matriz São Paulo', '05001000', 'Avenida Francisco Matarazzo', 'São Paulo', 'Água Branca', 'SP', 'Galpão industrial A'),
        ('11222333000144', 'Unidade Guarulhos', '07024000', 'Avenida Guarulhos', 'Guarulhos', 'Vila Augusta', 'SP', 'Portaria 2'),
        ('22333444000155', 'Sede São Paulo', '04551000', 'Avenida Brigadeiro Faria Lima', 'São Paulo', 'Itaim Bibi', 'SP', 'Escritório administrativo'),
        ('22333444000155', 'Canteiro Osasco', '06016000', 'Avenida dos Autonomistas', 'Osasco', 'Centro', 'SP', 'Canteiro de obras'),
        ('33444555000166', 'Matriz Campinas', '13010000', 'Avenida Francisco Glicério', 'Campinas', 'Centro', 'SP', 'Prédio principal'),
        ('33444555000166', 'Centro de Distribuição Ribeirão Preto', '14020000', 'Avenida Presidente Vargas', 'Ribeirão Preto', 'Jardim América', 'SP', 'Armazém central')
) AS dados(cnpj, nome_unidade, cep, rua, cidade, bairro, estado, complemento)
INNER JOIN workspaces w
    ON w.cnpj = dados.cnpj
INNER JOIN unidades u
    ON u.workspace_id = w.id_workspace
   AND u.nome = dados.nome_unidade
ON CONFLICT (unidade_id) DO UPDATE
SET cep = EXCLUDED.cep,
    rua = EXCLUDED.rua,
    cidade = EXCLUDED.cidade,
    bairro = EXCLUDED.bairro,
    estado = EXCLUDED.estado,
    complemento = EXCLUDED.complemento;