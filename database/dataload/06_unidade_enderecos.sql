INSERT INTO unidade_enderecos
    (unidade_id, cep, rua, cidade, bairro, estado, complemento)
VALUES
    (1, '05001000', 'Avenida Francisco Matarazzo', 'São Paulo', 'Água Branca', 'SP', 'Galpão industrial A'),
    (2, '07024000', 'Avenida Guarulhos', 'Guarulhos', 'Vila Augusta', 'SP', 'Portaria 2'),
    (3, '04551000', 'Avenida Brigadeiro Faria Lima', 'São Paulo', 'Itaim Bibi', 'SP', 'Escritório administrativo'),
    (4, '06016000', 'Avenida dos Autonomistas', 'Osasco', 'Centro', 'SP', 'Canteiro de obras'),
    (5, '13010000', 'Avenida Francisco Glicério', 'Campinas', 'Centro', 'SP', 'Prédio principal'),
    (6, '14020000', 'Avenida Presidente Vargas', 'Ribeirão Preto', 'Jardim América', 'SP', 'Armazém central')
ON CONFLICT DO NOTHING;