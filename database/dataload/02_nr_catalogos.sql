INSERT INTO nr_catalogos
    (codigo_nr, titulo, tempo_reciclagem_meses, revogada)
VALUES
    (1,  'Disposições Gerais e Gerenciamento de Riscos Ocupacionais', 24, FALSE),
    (5,  'Comissão Interna de Prevenção de Acidentes e de Assédio', 12, FALSE),
    (6,  'Equipamento de Proteção Individual', 12, FALSE),
    (10, 'Segurança em Instalações e Serviços em Eletricidade', 24, FALSE),
    (11, 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais', 24, FALSE),
    (12, 'Segurança no Trabalho em Máquinas e Equipamentos', 24, FALSE),
    (18, 'Segurança e Saúde no Trabalho na Indústria da Construção', 24, FALSE),
    (20, 'Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis', 12, FALSE),
    (31, 'Segurança e Saúde no Trabalho na Agricultura, Pecuária, Silvicultura, Exploração Florestal e Aquicultura', 24, FALSE),
    (33, 'Segurança e Saúde nos Trabalhos em Espaços Confinados', 12, FALSE),
    (35, 'Trabalho em Altura', 24, FALSE)
ON CONFLICT DO NOTHING;