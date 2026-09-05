INSERT INTO usuarios
    (nome, email, firebase_uid, tipo, cargo_id, unidade_id, cpf,
     modalidade, status, criado_em)
SELECT
    dados.nome,
    dados.email,
    dados.firebase_uid,
    dados.tipo,
    c.id_cargo,
    u.id_unidade,
    dados.cpf,
    dados.modalidade,
    dados.status,
    dados.criado_em::TIMESTAMP
FROM (
    VALUES
        ('11222333000144', 'Ana Almeida', 'ana.almeida.001@example.com', '4j2BYgDlrLa111YZ1YH5vOSKtgh1', 'GESTOR_WORKSPACE', 'Gestor de Segurança', 'Matriz São Paulo', '90000000001', 'PRESENCIAL', 'ATIVO', '2026-01-01 09:00:00'),
        ('22333444000155', 'Ana Barbosa', 'ana.barbosa.002@example.com', 'xaGupa4ytNT49njxGPS6NHBXYbz1', 'GESTOR_WORKSPACE', 'Gestor de Segurança', 'Sede São Paulo', '90000000002', 'HÍBRIDO', 'ATIVO', '2026-02-02 09:00:00'),
        ('33444555000166', 'Ana Carvalho', 'ana.carvalho.003@example.com', 'Frfz9zfCq7MkHcWpfMxcKpiDMxv2', 'GESTOR_WORKSPACE', 'Gestor de Segurança', 'Matriz Campinas', '90000000003', 'REMOTO', 'ATIVO', '2026-03-03 09:00:00'),
        ('11222333000144', 'Ana Dias', 'ana.dias.004@example.com', 'HkiPhaMyFqT1DFsC6x8QmrmO34o2', 'GESTOR', 'Gestor de Segurança', 'Unidade Guarulhos', '90000000004', 'PRESENCIAL', 'ATIVO', '2026-04-04 09:00:00'),
        ('22333444000155', 'Ana Ferreira', 'ana.ferreira.005@example.com', '2Gt7147LMbfH15eCoQEcZCOByVN2', 'GESTOR', 'Gestor de Segurança', 'Canteiro Osasco', '90000000005', 'HÍBRIDO', 'ATIVO', '2026-05-05 09:00:00'),
        ('33444555000166', 'Ana Gomes', 'ana.gomes.006@example.com', 'aYchIKAmfEchLYYgv7jUSUYe6gy2', 'GESTOR', 'Gestor de Segurança', 'Centro de Distribuição Ribeirão Preto', '90000000006', 'REMOTO', 'ATIVO', '2026-06-06 09:00:00'),
        ('11222333000144', 'Ana Lima', 'ana.lima.007@example.com', 'j9aM4mLUSWbnUQYyyEwKHCB0O2U2', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '90000000007', 'PRESENCIAL', 'ATIVO', '2026-07-07 09:00:00'),
        ('22333444000155', 'Ana Martins', 'ana.martins.008@example.com', 'G7bcqglJLLS3MuhpUchw9pi1at73', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '90000000008', 'HÍBRIDO', 'ATIVO', '2026-08-08 09:00:00'),
        ('33444555000166', 'Ana Oliveira', 'ana.oliveira.009@example.com', 'WMFkJYRhnRcrPppKS8zKTkSxIQS2', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '90000000009', 'REMOTO', 'ATIVO', '2026-01-09 09:00:00'),
        ('11222333000144', 'Ana Rocha', 'ana.rocha.010@example.com', 'K8gtm8id7rgqB4poxWxfGdy7sWt1', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '90000000010', 'PRESENCIAL', 'ATIVO', '2026-02-10 09:00:00'),
        ('22333444000155', 'Beatriz Almeida', 'beatriz.almeida.011@example.com', 'pnpQfEgKLDcYAHjUBeHIUdD59C63', 'FUNCIONARIO', 'Eletricista', 'Canteiro Osasco', '90000000011', 'HÍBRIDO', 'ATIVO', '2026-03-11 09:00:00'),
        ('33444555000166', 'Beatriz Barbosa', 'beatriz.barbosa.012@example.com', 'A9vo3NScCSOMi6MBxc4QXM8cts63', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Centro de Distribuição Ribeirão Preto', '90000000012', 'REMOTO', 'ATIVO', '2026-04-12 09:00:00'),
        ('11222333000144', 'Beatriz Carvalho', 'beatriz.carvalho.013@example.com', 'qkoqc3mRiBS0uHivwEKo8bPbnKp2', 'FUNCIONARIO', 'Técnico de Manutenção', 'Matriz São Paulo', '90000000013', 'PRESENCIAL', 'ATIVO', '2026-05-13 09:00:00'),
        ('22333444000155', 'Beatriz Dias', 'beatriz.dias.014@example.com', 'Nw00jxl45fdolBBHPbHZ5HNfgtj1', 'FUNCIONARIO', 'Trabalhador em Altura', 'Sede São Paulo', '90000000014', 'HÍBRIDO', 'ATIVO', '2026-06-14 09:00:00'),
        ('33444555000166', 'Beatriz Ferreira', 'beatriz.ferreira.015@example.com', 'Q6vTJU69OPODkxGiOnbPADquuW73', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Matriz Campinas', '90000000015', 'REMOTO', 'PRE_CADASTRADO', '2026-07-15 09:00:00'),
        ('11222333000144', 'Beatriz Gomes', 'beatriz.gomes.016@example.com', 'Is6nKCgy9PTnxTBPqY85YToGQr42', 'FUNCIONARIO', 'Soldador', 'Unidade Guarulhos', '90000000016', 'PRESENCIAL', 'ATIVO', '2026-08-16 09:00:00'),
        ('22333444000155', 'Beatriz Lima', 'beatriz.lima.017@example.com', 'WDaJRXFbp9YrzBsxmbGJh9sH4nf2', 'FUNCIONARIO', 'Engenheiro Civil', 'Canteiro Osasco', '90000000017', 'HÍBRIDO', 'ATIVO', '2026-01-17 09:00:00'),
        ('33444555000166', 'Beatriz Martins', 'beatriz.martins.018@example.com', 'J5cB4Ucps0ONUlvcORltgiky1bD2', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Centro de Distribuição Ribeirão Preto', '90000000018', 'REMOTO', 'ATIVO', '2026-02-18 09:00:00'),
        ('11222333000144', 'Beatriz Oliveira', 'beatriz.oliveira.019@example.com', 'yzwGxq0h2tM5JnnOerdte7g4K5i1', 'FUNCIONARIO', 'Operador de Máquinas', 'Matriz São Paulo', '90000000019', 'PRESENCIAL', 'ATIVO', '2026-03-19 09:00:00'),
        ('22333444000155', 'Beatriz Rocha', 'beatriz.rocha.020@example.com', 'UhCbidwdBee1GPAXvtRo6yX8wK63', 'FUNCIONARIO', 'Eletricista', 'Sede São Paulo', '90000000020', 'HÍBRIDO', 'DESATIVADO', '2026-04-20 09:00:00'),
        ('33444555000166', 'Camila Almeida', 'camila.almeida.021@example.com', 'ASDTpKjLjvOTCsUtSYJX75OaipV2', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Matriz Campinas', '90000000021', 'REMOTO', 'ATIVO', '2026-05-21 09:00:00'),
        ('11222333000144', 'Camila Barbosa', 'camila.barbosa.022@example.com', 'raF1i3JDTMUDVrM6LdQk7bIDedt1', 'FUNCIONARIO', 'Técnico de Manutenção', 'Unidade Guarulhos', '90000000022', 'PRESENCIAL', 'ATIVO', '2026-06-22 09:00:00'),
        ('22333444000155', 'Camila Carvalho', 'camila.carvalho.023@example.com', '10b5CDxwUfPh4WJ9FQR9ZX1W1WV2', 'FUNCIONARIO', 'Trabalhador em Altura', 'Canteiro Osasco', '90000000023', 'HÍBRIDO', 'ATIVO', '2026-07-23 09:00:00'),
        ('33444555000166', 'Camila Dias', 'camila.dias.024@example.com', 'AtJaxpZoRVeV7nlq6Z7uJ676ZnH3', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Centro de Distribuição Ribeirão Preto', '90000000024', 'REMOTO', 'ATIVO', '2026-08-24 09:00:00'),
        ('11222333000144', 'Camila Ferreira', 'camila.ferreira.025@example.com', 'naDSUX73r0RRLxiNvaaEXTOjOjG3', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '90000000025', 'PRESENCIAL', 'ATIVO', '2026-01-25 09:00:00'),
        ('22333444000155', 'Camila Gomes', 'camila.gomes.026@example.com', 'v0gqNDchLWY0sxHhnZaxyrUXQWp2', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '90000000026', 'HÍBRIDO', 'ATIVO', '2026-02-26 09:00:00'),
        ('33444555000166', 'Camila Lima', 'camila.lima.027@example.com', 'OLhp2KMTMbQm8i6HGdrz3MgioLu1', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '90000000027', 'REMOTO', 'ATIVO', '2026-03-27 09:00:00'),
        ('11222333000144', 'Camila Martins', 'camila.martins.028@example.com', '21dzkyQNJrR694UsV2WYE4xJj483', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '90000000028', 'PRESENCIAL', 'ATIVO', '2026-04-01 09:00:00'),
        ('22333444000155', 'Camila Oliveira', 'camila.oliveira.029@example.com', 'e4584ucMQaOLpDRnx4uStBod41v2', 'FUNCIONARIO', 'Eletricista', 'Canteiro Osasco', '90000000029', 'HÍBRIDO', 'ATIVO', '2026-05-02 09:00:00'),
        ('33444555000166', 'Camila Rocha', 'camila.rocha.030@example.com', '31g07wFsCVRrFR49loimAuv2DYz1', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Centro de Distribuição Ribeirão Preto', '90000000030', 'REMOTO', 'PRE_CADASTRADO', '2026-06-03 09:00:00'),
        ('11222333000144', 'Daniel Almeida', 'daniel.almeida.031@example.com', '0DcetJoY7hVbph4lPZ9ZImc8TPq2', 'FUNCIONARIO', 'Técnico de Manutenção', 'Matriz São Paulo', '90000000031', 'PRESENCIAL', 'ATIVO', '2026-07-04 09:00:00'),
        ('22333444000155', 'Daniel Barbosa', 'daniel.barbosa.032@example.com', '0lMaAQXx8ThUNpn7GHObrsOANM22', 'FUNCIONARIO', 'Trabalhador em Altura', 'Sede São Paulo', '90000000032', 'HÍBRIDO', 'ATIVO', '2026-08-05 09:00:00'),
        ('33444555000166', 'Daniel Carvalho', 'daniel.carvalho.033@example.com', 'Cak3XBqN8xVy1tjTJMCMDuZ7u3y2', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Matriz Campinas', '90000000033', 'REMOTO', 'ATIVO', '2026-01-06 09:00:00'),
        ('11222333000144', 'Daniel Dias', 'daniel.dias.034@example.com', 'lREPIWQRBfVHxZBFePRTrn2MyNT2', 'FUNCIONARIO', 'Soldador', 'Unidade Guarulhos', '90000000034', 'PRESENCIAL', 'ATIVO', '2026-02-07 09:00:00'),
        ('22333444000155', 'Daniel Ferreira', 'daniel.ferreira.035@example.com', 'Be2tdCX1LufPR1u9f2AmCLdINIG3', 'FUNCIONARIO', 'Engenheiro Civil', 'Canteiro Osasco', '90000000035', 'HÍBRIDO', 'ATIVO', '2026-03-08 09:00:00'),
        ('33444555000166', 'Daniel Gomes', 'daniel.gomes.036@example.com', 'iwTK2qllXRgpR1YAQEVDWIzTpZ93', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Centro de Distribuição Ribeirão Preto', '90000000036', 'REMOTO', 'ATIVO', '2026-04-09 09:00:00'),
        ('11222333000144', 'Daniel Lima', 'daniel.lima.037@example.com', '5tTj68qiZ0QymVD32uqLZMbM4yz1', 'FUNCIONARIO', 'Operador de Máquinas', 'Matriz São Paulo', '90000000037', 'PRESENCIAL', 'ATIVO', '2026-05-10 09:00:00'),
        ('22333444000155', 'Daniel Martins', 'daniel.martins.038@example.com', '2drK2AdRPBVE2VGLMacW7JI1ap73', 'FUNCIONARIO', 'Eletricista', 'Sede São Paulo', '90000000038', 'HÍBRIDO', 'ATIVO', '2026-06-11 09:00:00'),
        ('33444555000166', 'Daniel Oliveira', 'daniel.oliveira.039@example.com', 'FXma07J9OTNPKzfy995AGREyFPC3', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Matriz Campinas', '90000000039', 'REMOTO', 'ATIVO', '2026-07-12 09:00:00'),
        ('11222333000144', 'Daniel Rocha', 'daniel.rocha.040@example.com', 'IrjxW0FOjqPau00amblP6cLiuvB3', 'FUNCIONARIO', 'Técnico de Manutenção', 'Unidade Guarulhos', '90000000040', 'PRESENCIAL', 'DESATIVADO', '2026-08-13 09:00:00'),
        ('22333444000155', 'Eduarda Almeida', 'eduarda.almeida.041@example.com', 'nHATuprZ9JbZ3oDp8PxpQ9TUPCE3', 'FUNCIONARIO', 'Trabalhador em Altura', 'Canteiro Osasco', '90000000041', 'HÍBRIDO', 'ATIVO', '2026-01-14 09:00:00'),
        ('33444555000166', 'Eduarda Barbosa', 'eduarda.barbosa.042@example.com', 'HvjLJ20ic0d9hzd8nNuCRVAlz063', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Centro de Distribuição Ribeirão Preto', '90000000042', 'REMOTO', 'ATIVO', '2026-02-15 09:00:00'),
        ('11222333000144', 'Eduarda Carvalho', 'eduarda.carvalho.043@example.com', 'qniXO9gnu4VyTJy7T9IaaIS8daJ3', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '90000000043', 'PRESENCIAL', 'ATIVO', '2026-03-16 09:00:00'),
        ('22333444000155', 'Eduarda Dias', 'eduarda.dias.044@example.com', '4uUUacQ34zObowbljvGuINs8iRA3', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '90000000044', 'HÍBRIDO', 'ATIVO', '2026-04-17 09:00:00'),
        ('33444555000166', 'Eduarda Ferreira', 'eduarda.ferreira.045@example.com', 'p3gRlHqDlCeNa9YKgDzmWchyheE3', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '90000000045', 'REMOTO', 'PRE_CADASTRADO', '2026-05-18 09:00:00'),
        ('11222333000144', 'Eduarda Gomes', 'eduarda.gomes.046@example.com', 'KaSZBDZgV9N2GIehJeidTGYYoCl1', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '90000000046', 'PRESENCIAL', 'ATIVO', '2026-06-19 09:00:00'),
        ('22333444000155', 'Eduarda Lima', 'eduarda.lima.047@example.com', 'QWvcQ1QnhDai8vMRLAavVENBa5r1', 'FUNCIONARIO', 'Eletricista', 'Canteiro Osasco', '90000000047', 'HÍBRIDO', 'ATIVO', '2026-07-20 09:00:00'),
        ('33444555000166', 'Eduarda Martins', 'eduarda.martins.048@example.com', 'J3u2xps6IxQZ7gUxxjFep5T2rNM2', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Centro de Distribuição Ribeirão Preto', '90000000048', 'REMOTO', 'ATIVO', '2026-08-21 09:00:00'),
        ('11222333000144', 'Eduarda Oliveira', 'eduarda.oliveira.049@example.com', 'e0hJtsS7IvP6di0YZVB7emMA5N52', 'FUNCIONARIO', 'Técnico de Manutenção', 'Matriz São Paulo', '90000000049', 'PRESENCIAL', 'ATIVO', '2026-01-22 09:00:00'),
        ('22333444000155', 'Eduarda Rocha', 'eduarda.rocha.050@example.com', 'W1YNQeG3egNtHrzEleQltA82IGX2', 'FUNCIONARIO', 'Trabalhador em Altura', 'Sede São Paulo', '90000000050', 'HÍBRIDO', 'ATIVO', '2026-02-23 09:00:00'),
        ('33444555000166', 'Felipe Almeida', 'felipe.almeida.051@example.com', 'x3PNV1u5fMTZO1dcgn9Xf6we5Xl1', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Matriz Campinas', '90000000051', 'REMOTO', 'ATIVO', '2026-03-24 09:00:00'),
        ('11222333000144', 'Felipe Barbosa', 'felipe.barbosa.052@example.com', 'BPpHeBczMaPWQNzgMDPFC5np6T63', 'FUNCIONARIO', 'Soldador', 'Unidade Guarulhos', '90000000052', 'PRESENCIAL', 'ATIVO', '2026-04-25 09:00:00'),
        ('22333444000155', 'Felipe Carvalho', 'felipe.carvalho.053@example.com', '3q0vylTV8IVgrUEcjjzJ8ZFnRTk1', 'FUNCIONARIO', 'Engenheiro Civil', 'Canteiro Osasco', '90000000053', 'HÍBRIDO', 'ATIVO', '2026-05-26 09:00:00'),
        ('33444555000166', 'Felipe Dias', 'felipe.dias.054@example.com', 'rtrjFfbpATPTaFalciauBjydZP83', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Centro de Distribuição Ribeirão Preto', '90000000054', 'REMOTO', 'ATIVO', '2026-06-27 09:00:00'),
        ('11222333000144', 'Felipe Ferreira', 'felipe.ferreira.055@example.com', 'PcXGwDPCGeSmcsuawSjlHZLZLAy1', 'FUNCIONARIO', 'Operador de Máquinas', 'Matriz São Paulo', '90000000055', 'PRESENCIAL', 'ATIVO', '2026-07-01 09:00:00'),
        ('22333444000155', 'Felipe Gomes', 'felipe.gomes.056@example.com', 'cHpZHy6MO6Ptt2bUAnr7NiIOgIw2', 'FUNCIONARIO', 'Eletricista', 'Sede São Paulo', '90000000056', 'HÍBRIDO', 'ATIVO', '2026-08-02 09:00:00'),
        ('33444555000166', 'Felipe Lima', 'felipe.lima.057@example.com', 'SdvsQ0jJ6BMIkMesF6t4yKBUmMv2', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Matriz Campinas', '90000000057', 'REMOTO', 'ATIVO', '2026-01-03 09:00:00'),
        ('11222333000144', 'Felipe Martins', 'felipe.martins.058@example.com', '67ZcNdGqFrTlDg49Hy2JHYEDp793', 'FUNCIONARIO', 'Técnico de Manutenção', 'Unidade Guarulhos', '90000000058', 'PRESENCIAL', 'ATIVO', '2026-02-04 09:00:00'),
        ('22333444000155', 'Felipe Oliveira', 'felipe.oliveira.059@example.com', 'EN6ofAoIziRreZrzrGMHeaX8s8w2', 'FUNCIONARIO', 'Trabalhador em Altura', 'Canteiro Osasco', '90000000059', 'HÍBRIDO', 'ATIVO', '2026-03-05 09:00:00'),
        ('33444555000166', 'Felipe Rocha', 'felipe.rocha.060@example.com', '5XYtoT2w2hUs5TVcedF6Lm2PkmF2', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Centro de Distribuição Ribeirão Preto', '90000000060', 'REMOTO', 'DESATIVADO', '2026-04-06 09:00:00'),
        ('11222333000144', 'Gabriela Almeida', 'gabriela.almeida.061@example.com', 'l9PSpLVqSaYqc5lSeuHQvWeGzey1', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '90000000061', 'PRESENCIAL', 'ATIVO', '2026-05-07 09:00:00'),
        ('22333444000155', 'Gabriela Barbosa', 'gabriela.barbosa.062@example.com', 'CHEAoCwakJPQB8XLSWyOMlngujl1', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '90000000062', 'HÍBRIDO', 'ATIVO', '2026-06-08 09:00:00'),
        ('33444555000166', 'Gabriela Carvalho', 'gabriela.carvalho.063@example.com', 'QejR7SgmH7gLE8XSagWwCvpjQJv2', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '90000000063', 'REMOTO', 'ATIVO', '2026-07-09 09:00:00'),
        ('11222333000144', 'Gabriela Dias', 'gabriela.dias.064@example.com', '4uP4SKFusha1h31pKuWmhEBFHee2', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '90000000064', 'PRESENCIAL', 'ATIVO', '2026-08-10 09:00:00'),
        ('22333444000155', 'Gabriela Ferreira', 'gabriela.ferreira.065@example.com', 'pCMn5R8iLwgFj3lg5MQaCXFWbKF2', 'FUNCIONARIO', 'Eletricista', 'Canteiro Osasco', '90000000065', 'HÍBRIDO', 'ATIVO', '2026-01-11 09:00:00'),
        ('33444555000166', 'Gabriela Gomes', 'gabriela.gomes.066@example.com', 'FiBUGSPmf3hYQeGVLyZ3R8oxZyD2', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Centro de Distribuição Ribeirão Preto', '90000000066', 'REMOTO', 'ATIVO', '2026-02-12 09:00:00'),
        ('11222333000144', 'Gabriela Lima', 'gabriela.lima.067@example.com', 'dVb361djogV6Vf7g2BNjDbEK3672', 'FUNCIONARIO', 'Técnico de Manutenção', 'Matriz São Paulo', '90000000067', 'PRESENCIAL', 'ATIVO', '2026-03-13 09:00:00'),
        ('22333444000155', 'Gabriela Martins', 'gabriela.martins.068@example.com', 'pf6UcyQwFiThWSHP6rC1KUGglMz1', 'FUNCIONARIO', 'Trabalhador em Altura', 'Sede São Paulo', '90000000068', 'HÍBRIDO', 'ATIVO', '2026-04-14 09:00:00'),
        ('33444555000166', 'Gabriela Oliveira', 'gabriela.oliveira.069@example.com', 'm0tAnIgYeDTKyzOAiK45JiVsXNp1', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Matriz Campinas', '90000000069', 'REMOTO', 'ATIVO', '2026-05-15 09:00:00'),
        ('11222333000144', 'Gabriela Rocha', 'gabriela.rocha.070@example.com', 'pSQnd5BIYdQdUlKL9MelHFHw85q1', 'FUNCIONARIO', 'Soldador', 'Unidade Guarulhos', '90000000070', 'PRESENCIAL', 'ATIVO', '2026-06-16 09:00:00'),
        ('22333444000155', 'Henrique Almeida', 'henrique.almeida.071@example.com', 'RfP2BXObnEe3ezaWeal5nuWkb0D2', 'FUNCIONARIO', 'Engenheiro Civil', 'Canteiro Osasco', '90000000071', 'HÍBRIDO', 'ATIVO', '2026-07-17 09:00:00'),
        ('33444555000166', 'Henrique Barbosa', 'henrique.barbosa.072@example.com', 'LMPWmU5OcyRKBKSFahTtKvLArRG2', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Centro de Distribuição Ribeirão Preto', '90000000072', 'REMOTO', 'ATIVO', '2026-08-18 09:00:00'),
        ('11222333000144', 'Henrique Carvalho', 'henrique.carvalho.073@example.com', 'o9JLZ5yx8HYELS7TiNDSNppQk523', 'FUNCIONARIO', 'Operador de Máquinas', 'Matriz São Paulo', '90000000073', 'PRESENCIAL', 'ATIVO', '2026-01-19 09:00:00'),
        ('22333444000155', 'Henrique Dias', 'henrique.dias.074@example.com', 'N1CyCCc5TFTftghePgMSQXyFKK32', 'FUNCIONARIO', 'Eletricista', 'Sede São Paulo', '90000000074', 'HÍBRIDO', 'ATIVO', '2026-02-20 09:00:00'),
        ('33444555000166', 'Henrique Ferreira', 'henrique.ferreira.075@example.com', 'daB6nAzTu5QS9bl8SMIi9M7C4zu2', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Matriz Campinas', '90000000075', 'REMOTO', 'PRE_CADASTRADO', '2026-03-21 09:00:00'),
        ('11222333000144', 'Henrique Gomes', 'henrique.gomes.076@example.com', 'oAyxo2Iz7iagRhHFUUJAYpH05Ao2', 'FUNCIONARIO', 'Técnico de Manutenção', 'Unidade Guarulhos', '90000000076', 'PRESENCIAL', 'ATIVO', '2026-04-22 09:00:00'),
        ('22333444000155', 'Henrique Lima', 'henrique.lima.077@example.com', 'xvvb5hEkYPhywpy2WMWmb8i4grq1', 'FUNCIONARIO', 'Trabalhador em Altura', 'Canteiro Osasco', '90000000077', 'HÍBRIDO', 'ATIVO', '2026-05-23 09:00:00'),
        ('33444555000166', 'Henrique Martins', 'henrique.martins.078@example.com', 'sSPeks3oOAebo6DnDsAAxMWUtLQ2', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Centro de Distribuição Ribeirão Preto', '90000000078', 'REMOTO', 'ATIVO', '2026-06-24 09:00:00'),
        ('11222333000144', 'Henrique Oliveira', 'henrique.oliveira.079@example.com', 'cZbUuBahZiTMSDCOe1Ki2I3V3M13', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '90000000079', 'PRESENCIAL', 'ATIVO', '2026-07-25 09:00:00'),
        ('22333444000155', 'Henrique Rocha', 'henrique.rocha.080@example.com', '2hftv1TrsrV7vtVAYuB1j6pDHvL2', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '90000000080', 'HÍBRIDO', 'DESATIVADO', '2026-08-26 09:00:00'),
        ('33444555000166', 'Isabela Almeida', 'isabela.almeida.081@example.com', 'wUwOn7UQkqTWKXqJZkenl9QefJB3', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '90000000081', 'REMOTO', 'ATIVO', '2026-01-27 09:00:00'),
        ('11222333000144', 'Isabela Barbosa', 'isabela.barbosa.082@example.com', 'qzrshh9OlkNTv3AccQv3aFm70fr1', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '90000000082', 'PRESENCIAL', 'ATIVO', '2026-02-01 09:00:00'),
        ('22333444000155', 'Isabela Carvalho', 'isabela.carvalho.083@example.com', 'sR43eHENC7YgqFNk7jfkkqce9LA3', 'FUNCIONARIO', 'Eletricista', 'Canteiro Osasco', '90000000083', 'HÍBRIDO', 'ATIVO', '2026-03-02 09:00:00'),
        ('33444555000166', 'Isabela Dias', 'isabela.dias.084@example.com', 'lvMagBUkC0QxCpMDNNch6hLalnK2', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Centro de Distribuição Ribeirão Preto', '90000000084', 'REMOTO', 'ATIVO', '2026-04-03 09:00:00'),
        ('11222333000144', 'Isabela Ferreira', 'isabela.ferreira.085@example.com', 'oYVOCoLPOKfWzs7WGH0ytUbHA0I2', 'FUNCIONARIO', 'Técnico de Manutenção', 'Matriz São Paulo', '90000000085', 'PRESENCIAL', 'ATIVO', '2026-05-04 09:00:00'),
        ('22333444000155', 'Isabela Gomes', 'isabela.gomes.086@example.com', '2chyWalcTgg0QrKSw5a8zJQybFx2', 'FUNCIONARIO', 'Trabalhador em Altura', 'Sede São Paulo', '90000000086', 'HÍBRIDO', 'ATIVO', '2026-06-05 09:00:00'),
        ('33444555000166', 'Isabela Lima', 'isabela.lima.087@example.com', 'tpj1aoqDcMW92jZCLnHn9BeWs3j1', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Matriz Campinas', '90000000087', 'REMOTO', 'ATIVO', '2026-07-06 09:00:00'),
        ('11222333000144', 'Isabela Martins', 'isabela.martins.088@example.com', 'F3FWYskrFZU7H0ScXfnWhDQfgFm2', 'FUNCIONARIO', 'Soldador', 'Unidade Guarulhos', '90000000088', 'PRESENCIAL', 'ATIVO', '2026-08-07 09:00:00'),
        ('22333444000155', 'Isabela Oliveira', 'isabela.oliveira.089@example.com', 'XcNUMF6Qelc0mVIHbEQSjumPbld2', 'FUNCIONARIO', 'Engenheiro Civil', 'Canteiro Osasco', '90000000089', 'HÍBRIDO', 'ATIVO', '2026-01-08 09:00:00'),
        ('33444555000166', 'Isabela Rocha', 'isabela.rocha.090@example.com', 'k8mhVPmA8WdTEBiaTF0PoyAShoS2', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Centro de Distribuição Ribeirão Preto', '90000000090', 'REMOTO', 'PRE_CADASTRADO', '2026-02-09 09:00:00'),
        ('11222333000144', 'João Almeida', 'joao.almeida.091@example.com', 'dbMavNergNXwaouwcYyoBolj5Ks2', 'FUNCIONARIO', 'Operador de Máquinas', 'Matriz São Paulo', '90000000091', 'PRESENCIAL', 'ATIVO', '2026-03-10 09:00:00'),
        ('22333444000155', 'João Barbosa', 'joao.barbosa.092@example.com', '6GzcW9SeSXTENIZUdpeLBOGxv9r1', 'FUNCIONARIO', 'Eletricista', 'Sede São Paulo', '90000000092', 'HÍBRIDO', 'ATIVO', '2026-04-11 09:00:00'),
        ('33444555000166', 'João Carvalho', 'joao.carvalho.093@example.com', 'aP4CCGTIpDgmMEIwh28OYJYmqHq1', 'FUNCIONARIO', 'Aplicador de Defensivos', 'Matriz Campinas', '90000000093', 'REMOTO', 'ATIVO', '2026-05-12 09:00:00'),
        ('11222333000144', 'João Dias', 'joao.dias.094@example.com', 'LBhYv4GeyhanWYn5VHSgONKyrEb2', 'FUNCIONARIO', 'Técnico de Manutenção', 'Unidade Guarulhos', '90000000094', 'PRESENCIAL', 'ATIVO', '2026-06-13 09:00:00'),
        ('22333444000155', 'João Ferreira', 'joao.ferreira.095@example.com', 'JTx9byiG3CUkZ0NsnMCtNjHn3fK2', 'FUNCIONARIO', 'Trabalhador em Altura', 'Canteiro Osasco', '90000000095', 'HÍBRIDO', 'ATIVO', '2026-07-14 09:00:00'),
        ('33444555000166', 'João Gomes', 'joao.gomes.096@example.com', 'ZfdeWRqAKVWbILfrjjZOBzOJkl92', 'FUNCIONARIO', 'Operador de Máquinas Agrícolas', 'Centro de Distribuição Ribeirão Preto', '90000000096', 'REMOTO', 'ATIVO', '2026-08-15 09:00:00'),
        ('11222333000144', 'João Lima', 'joao.lima.097@example.com', 'A12ldPf3CSQWua0EqxWHEo9x6dE2', 'FUNCIONARIO', 'Soldador', 'Matriz São Paulo', '90000000097', 'PRESENCIAL', 'ATIVO', '2026-01-16 09:00:00'),
        ('22333444000155', 'João Martins', 'joao.martins.098@example.com', 'Ocla7HEmfifGglIT53nFBctjqPw1', 'FUNCIONARIO', 'Engenheiro Civil', 'Sede São Paulo', '90000000098', 'HÍBRIDO', 'ATIVO', '2026-02-17 09:00:00'),
        ('33444555000166', 'João Oliveira', 'joao.oliveira.099@example.com', 'O7BfeFKNUUZx2ucQ2pD6Mh80iz92', 'FUNCIONARIO', 'Engenheiro Agrônomo', 'Matriz Campinas', '90000000099', 'REMOTO', 'ATIVO', '2026-03-18 09:00:00'),
        ('11222333000144', 'João Rocha', 'joao.rocha.100@example.com', 'tfa7iOJ6OUNjwNEdevZPbwLiQOI3', 'FUNCIONARIO', 'Operador de Máquinas', 'Unidade Guarulhos', '90000000100', 'PRESENCIAL', 'DESATIVADO', '2026-04-19 09:00:00')
) AS dados(
    cnpj, nome, email, firebase_uid, tipo, nome_cargo, nome_unidade,
    cpf, modalidade, status, criado_em
)
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
    firebase_uid = EXCLUDED.firebase_uid,
    tipo = EXCLUDED.tipo,
    cargo_id = EXCLUDED.cargo_id,
    unidade_id = EXCLUDED.unidade_id,
    cpf = EXCLUDED.cpf,
    modalidade = EXCLUDED.modalidade,
    status = EXCLUDED.status,
    criado_em = EXCLUDED.criado_em;

-- SCRUM-172: 100 funcionários do TXT, mantendo nome, e-mail e Firebase UID.
-- CPF não informado no arquivo de origem; cargo, modalidade e datas são dados de teste.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM unidades u
        INNER JOIN workspaces w ON w.id_workspace = u.workspace_id
        WHERE u.id_unidade = 1
          AND w.cnpj = '11222333000144'
    ) THEN
        RAISE EXCEPTION 'SCRUM-172: a unidade 1 deve pertencer ao workspace Brasilfer.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM usuarios
        WHERE unidade_id = 1 AND status = 'ATIVO'
          AND tipo IN ('GESTOR', 'GESTOR_WORKSPACE')
    ) THEN
        RAISE EXCEPTION 'SCRUM-172: a unidade 1 precisa de um gestor ativo para os eventos.';
    END IF;
END;
$$;

INSERT INTO usuarios
    (nome, email, firebase_uid, tipo, cargo_id, unidade_id, cpf,
     modalidade, status, criado_em)
SELECT
    dados.nome, dados.email, dados.firebase_uid, 'FUNCIONARIO',
    c.id_cargo, u.id_unidade, NULL, 'PRESENCIAL', 'ATIVO',
    TIMESTAMP '2026-09-01 09:00:00'
FROM (
    VALUES
        ('Lucas Silva', 'lucas.c689bedf0fc64d4c.1@example.com', 'IcK6qNc4f9aVA9DY8Re99UHhAFk1', 'Soldador'),
        ('Ana Silva', 'ana.c689bedf0fc64d4c.2@example.com', 'sOKxjLFDSnSRfThtbfC5v5fSUR83', 'Soldador'),
        ('Pedro Silva', 'pedro.c689bedf0fc64d4c.3@example.com', 'ls8vyvwYIGP3N3Pv9CqhlJZdnOi1', 'Soldador'),
        ('Maria Silva', 'maria.c689bedf0fc64d4c.4@example.com', '2k8EbvQOole1VcTGJA3DuJ9qiVj2', 'Soldador'),
        ('João Silva', 'joao.c689bedf0fc64d4c.5@example.com', 'YoExxfhP4eYEmVVLEAZ7ECHou243', 'Soldador'),
        ('Julia Silva', 'julia.c689bedf0fc64d4c.6@example.com', 'jUx0T1loZrXrhO9BbR1JDruEBDI2', 'Soldador'),
        ('Gabriel Silva', 'gabriel.c689bedf0fc64d4c.7@example.com', '0lQ4HzTiQFO8AkflpnEkaCgyDmm2', 'Soldador'),
        ('Beatriz Silva', 'beatriz.c689bedf0fc64d4c.8@example.com', 'mItga3S7pHUgOwFyGxcGmQxI2393', 'Soldador'),
        ('Rafael Silva', 'rafael.c689bedf0fc64d4c.9@example.com', 'r07bwczX3fhmEj5U2rD4lJknymz1', 'Soldador'),
        ('Laura Silva', 'laura.c689bedf0fc64d4c.10@example.com', 'GOMhrvBgJ0TAG9goRzcWP89FCPv2', 'Soldador'),
        ('Felipe Silva', 'felipe.c689bedf0fc64d4c.11@example.com', 'lPo8EUYVeLZl1KqsNxPf9Stln6c2', 'Soldador'),
        ('Mariana Silva', 'mariana.c689bedf0fc64d4c.12@example.com', 'RSb3yQkTCmPJLFzR0azT9rIe27m2', 'Soldador'),
        ('Bruno Silva', 'bruno.c689bedf0fc64d4c.13@example.com', 'zuZlDf4xVfXmvcsmGZukHCu8H3A3', 'Soldador'),
        ('Camila Silva', 'camila.c689bedf0fc64d4c.14@example.com', 'g9Wgd6SC6NMGa0rhYHRhbgpxmaV2', 'Soldador'),
        ('Gustavo Silva', 'gustavo.c689bedf0fc64d4c.15@example.com', 'kNqfFRNdqzMmgrpEoDWBDxKAysC3', 'Soldador'),
        ('Amanda Silva', 'amanda.c689bedf0fc64d4c.16@example.com', 'n9KDc0oyaWQetjujR7RfkqMsYn62', 'Soldador'),
        ('Diego Silva', 'diego.c689bedf0fc64d4c.17@example.com', '0UB1UyPejkb3FcqDby7DHo6wrCB2', 'Soldador'),
        ('Isabela Silva', 'isabela.c689bedf0fc64d4c.18@example.com', 'QoZEEF1UDDNsPzt9TK1cbgZDjDv2', 'Soldador'),
        ('Vinicius Silva', 'vinicius.c689bedf0fc64d4c.19@example.com', 'DhP7pwYSBPOSfrIKpxlLAhwsJzB2', 'Soldador'),
        ('Leticia Silva', 'leticia.c689bedf0fc64d4c.20@example.com', '6MdFs9NXeYXZQC2R6F0erP3fBCI2', 'Soldador'),
        ('Lucas Santos', 'lucas.c689bedf0fc64d4c.21@example.com', 'mZKvitZtsCRCMTMTwceulg7v6Gw2', 'Soldador'),
        ('Ana Santos', 'ana.c689bedf0fc64d4c.22@example.com', 'sMHtsTRcJuXiM0P0yyF6L6WRpdv2', 'Soldador'),
        ('Pedro Santos', 'pedro.c689bedf0fc64d4c.23@example.com', 'ojWceBfaYjaCzek78QlNqTpug182', 'Soldador'),
        ('Maria Santos', 'maria.c689bedf0fc64d4c.24@example.com', '4mnKzdOanSRkujN3wDGwlJWUf3j1', 'Soldador'),
        ('João Santos', 'joao.c689bedf0fc64d4c.25@example.com', 'dLEhcKcnUJOzWGC8ySsZDpMSPRf2', 'Soldador'),
        ('Julia Santos', 'julia.c689bedf0fc64d4c.26@example.com', 'v6pq4as8G7QIDOi3teF8MRCwCdx1', 'Soldador'),
        ('Gabriel Santos', 'gabriel.c689bedf0fc64d4c.27@example.com', 'CczvV6VcQ4aiePlsK2A976rZGun2', 'Soldador'),
        ('Beatriz Santos', 'beatriz.c689bedf0fc64d4c.28@example.com', 'm5rTHT0CpQXLEJZiiU94R66gE443', 'Soldador'),
        ('Rafael Santos', 'rafael.c689bedf0fc64d4c.29@example.com', 'dA2vxPp9llSx4aEHk1RDs6FaaX72', 'Soldador'),
        ('Laura Santos', 'laura.c689bedf0fc64d4c.30@example.com', 'XJqTu71xNAQq2unntmhxfJB79mh2', 'Soldador'),
        ('Felipe Santos', 'felipe.c689bedf0fc64d4c.31@example.com', 'jjDIIIvDmqSSVVxZwCSwcQ8A63v1', 'Soldador'),
        ('Mariana Santos', 'mariana.c689bedf0fc64d4c.32@example.com', 'EFv7TKvxJOQ16oAqAQEVHlX7B0j1', 'Soldador'),
        ('Bruno Santos', 'bruno.c689bedf0fc64d4c.33@example.com', 'GcPf0vF5clXzgL8oGfEZAXQmqgh2', 'Soldador'),
        ('Camila Santos', 'camila.c689bedf0fc64d4c.34@example.com', 'VBNafEzTqWcd5lHDJ23ukssdBlt1', 'Soldador'),
        ('Gustavo Santos', 'gustavo.c689bedf0fc64d4c.35@example.com', 'cN0tdDybTQWa8xUvRvCsYVfQ5pC3', 'Soldador'),
        ('Amanda Santos', 'amanda.c689bedf0fc64d4c.36@example.com', 'vqLPrkGAMqf3Mkixtla5AufswJs1', 'Soldador'),
        ('Diego Santos', 'diego.c689bedf0fc64d4c.37@example.com', 'DEVgwakP34Oq7lRvnGZDZuM7hNY2', 'Soldador'),
        ('Isabela Santos', 'isabela.c689bedf0fc64d4c.38@example.com', 'oNC69duGZEUpNtGUHLnc4L5vNQp2', 'Soldador'),
        ('Vinicius Santos', 'vinicius.c689bedf0fc64d4c.39@example.com', 'f4fPrh2LJTWP7CoGcsjrg6nOEH72', 'Soldador'),
        ('Leticia Santos', 'leticia.c689bedf0fc64d4c.40@example.com', 'XSEfwBef4ob4eaBxwNRCtYivAkx1', 'Soldador'),
        ('Lucas Oliveira', 'lucas.c689bedf0fc64d4c.41@example.com', 'mLLON39LBMMCT0vcfEynLq7mpmC3', 'Operador de Máquinas'),
        ('Ana Oliveira', 'ana.c689bedf0fc64d4c.42@example.com', 'lLVYSBEzt1RKIyUY9LlYJSrSGBk1', 'Operador de Máquinas'),
        ('Pedro Oliveira', 'pedro.c689bedf0fc64d4c.43@example.com', '9CjXOVxJF0MIrRLRa0mAd05Jma63', 'Operador de Máquinas'),
        ('Maria Oliveira', 'maria.c689bedf0fc64d4c.44@example.com', 'EgoTnVC2NfTBh1m5J83Z798mtjI3', 'Operador de Máquinas'),
        ('João Oliveira', 'joao.c689bedf0fc64d4c.45@example.com', 'pd31cnH8LzZrN2bA89z9TievBv62', 'Operador de Máquinas'),
        ('Julia Oliveira', 'julia.c689bedf0fc64d4c.46@example.com', 'LQtR4cpKFITSgdftZ7Rh9NZYPA63', 'Operador de Máquinas'),
        ('Gabriel Oliveira', 'gabriel.c689bedf0fc64d4c.47@example.com', 'efMfvTGGnph3Ff5ldKZg3krybKs1', 'Operador de Máquinas'),
        ('Beatriz Oliveira', 'beatriz.c689bedf0fc64d4c.48@example.com', 'ct7B1NDUboOi0wRUfizuy9Fes1n2', 'Operador de Máquinas'),
        ('Rafael Oliveira', 'rafael.c689bedf0fc64d4c.49@example.com', 'KtwONFwRi8Vak4qUhgNdN3XtEkw1', 'Operador de Máquinas'),
        ('Laura Oliveira', 'laura.c689bedf0fc64d4c.50@example.com', '19Glg1F40JZeClj5gPHW1R0H81F2', 'Operador de Máquinas'),
        ('Felipe Oliveira', 'felipe.c689bedf0fc64d4c.51@example.com', 'e8LP7QkIHKUm3TUrWDIaDa3n1ZC2', 'Operador de Máquinas'),
        ('Mariana Oliveira', 'mariana.c689bedf0fc64d4c.52@example.com', 'iJL0eoFafTWZaO8RmNEHQDQqTL93', 'Operador de Máquinas'),
        ('Bruno Oliveira', 'bruno.c689bedf0fc64d4c.53@example.com', 'lQissYDkT9bBZRwpvDe8byXLWFI3', 'Operador de Máquinas'),
        ('Camila Oliveira', 'camila.c689bedf0fc64d4c.54@example.com', 'xpToio0FM6f0scWwoBv0ZsUGe0g1', 'Operador de Máquinas'),
        ('Gustavo Oliveira', 'gustavo.c689bedf0fc64d4c.55@example.com', 'bo0bMg1AfQYbjyp39us4xczhGYy1', 'Operador de Máquinas'),
        ('Amanda Oliveira', 'amanda.c689bedf0fc64d4c.56@example.com', '6XWwCiSRFXMaO657387vdcIWHrs2', 'Operador de Máquinas'),
        ('Diego Oliveira', 'diego.c689bedf0fc64d4c.57@example.com', 'suBOjTW2CLTDF10FhJApRNfM3L12', 'Operador de Máquinas'),
        ('Isabela Oliveira', 'isabela.c689bedf0fc64d4c.58@example.com', 'qlF9h5HYEdQlcLL09ySDkHlf5Pw2', 'Operador de Máquinas'),
        ('Vinicius Oliveira', 'vinicius.c689bedf0fc64d4c.59@example.com', 'GT8hQOD1buNfLNvI8OmUsnsl5Wd2', 'Operador de Máquinas'),
        ('Leticia Oliveira', 'leticia.c689bedf0fc64d4c.60@example.com', 'daaR01cpQANgVkgoKvxDN2HxmfP2', 'Operador de Máquinas'),
        ('Lucas Souza', 'lucas.c689bedf0fc64d4c.61@example.com', '1WCIvh2fjlaNhZoHUrJJexW9JFh1', 'Operador de Máquinas'),
        ('Ana Souza', 'ana.c689bedf0fc64d4c.62@example.com', 'uMdXv865NxdFmK8bzkrZu6y4TMI2', 'Operador de Máquinas'),
        ('Pedro Souza', 'pedro.c689bedf0fc64d4c.63@example.com', 'IiqolNO08MSX79XQzyfgj3TU0cL2', 'Operador de Máquinas'),
        ('Maria Souza', 'maria.c689bedf0fc64d4c.64@example.com', 'yVDUNhCbBuSfcWcaHKaNan9a4GB3', 'Operador de Máquinas'),
        ('João Souza', 'joao.c689bedf0fc64d4c.65@example.com', 'AAKrJ35ZLYULthAn2axZGB8MsYv1', 'Operador de Máquinas'),
        ('Julia Souza', 'julia.c689bedf0fc64d4c.66@example.com', 'yB8U1hCJmehBQiJ9SumVsfdTQqK2', 'Operador de Máquinas'),
        ('Gabriel Souza', 'gabriel.c689bedf0fc64d4c.67@example.com', 'mLDWWXl2D2Qq9PsLfqlfhRnvX623', 'Operador de Máquinas'),
        ('Beatriz Souza', 'beatriz.c689bedf0fc64d4c.68@example.com', 'EYbhIEKqWWW9h8lhdgcSrQi1xcI3', 'Operador de Máquinas'),
        ('Rafael Souza', 'rafael.c689bedf0fc64d4c.69@example.com', 'R0x2MTXrq7Ucix1Elwn6b8R08qo2', 'Operador de Máquinas'),
        ('Laura Souza', 'laura.c689bedf0fc64d4c.70@example.com', 'rGqS3VPCrybBXwYuWf3d0xga4SL2', 'Operador de Máquinas'),
        ('Felipe Souza', 'felipe.c689bedf0fc64d4c.71@example.com', 'CDhweHEuYvRDK5zIaCjzIg21ulf1', 'Operador de Máquinas'),
        ('Mariana Souza', 'mariana.c689bedf0fc64d4c.72@example.com', 'DhzaoXembJMtBG8aLegN5Lqjj2T2', 'Operador de Máquinas'),
        ('Bruno Souza', 'bruno.c689bedf0fc64d4c.73@example.com', 'zdVZllS4GNbpJFWyR5EYkzQ9xhf2', 'Operador de Máquinas'),
        ('Camila Souza', 'camila.c689bedf0fc64d4c.74@example.com', 'KTZCAcpcbVhd3DSFsQPFfu52u0w2', 'Operador de Máquinas'),
        ('Gustavo Souza', 'gustavo.c689bedf0fc64d4c.75@example.com', 'k0vCi6rBrGOWNB128z7BTOB7bfg1', 'Operador de Máquinas'),
        ('Amanda Souza', 'amanda.c689bedf0fc64d4c.76@example.com', 'dWeMQ34ZYVb6fX4LnVGbR0WNJui2', 'Operador de Máquinas'),
        ('Diego Souza', 'diego.c689bedf0fc64d4c.77@example.com', 'inSbqIXoKZOjf0Y3wMkJoGbxNTt1', 'Operador de Máquinas'),
        ('Isabela Souza', 'isabela.c689bedf0fc64d4c.78@example.com', 'a3D557o3mpbCMBmRsgj4IrKBywg2', 'Operador de Máquinas'),
        ('Vinicius Souza', 'vinicius.c689bedf0fc64d4c.79@example.com', 'ZtzTECOoQzZ25ToxaE8QlCMLkS02', 'Operador de Máquinas'),
        ('Leticia Souza', 'leticia.c689bedf0fc64d4c.80@example.com', 'dtNtF18HNCR1wrWKXsUofDAkBTz1', 'Operador de Máquinas'),
        ('Lucas Lima', 'lucas.c689bedf0fc64d4c.81@example.com', 'EYPwnZMx1lSBMXnm6N5lYAdOCaC2', 'Operador de Máquinas'),
        ('Ana Lima', 'ana.c689bedf0fc64d4c.82@example.com', 'iZLYsJ7dJHbIrj2v13vQqZYwVDj1', 'Operador de Máquinas'),
        ('Pedro Lima', 'pedro.c689bedf0fc64d4c.83@example.com', 'ma4M6hbY2AcLBIwloyyecmyD4gf2', 'Operador de Máquinas'),
        ('Maria Lima', 'maria.c689bedf0fc64d4c.84@example.com', 'RccqrbF9RtPZkFGAogWa2gVOrUO2', 'Operador de Máquinas'),
        ('João Lima', 'joao.c689bedf0fc64d4c.85@example.com', 'TMAcbf0crTZQ9iBvXrWyqPkdUU22', 'Operador de Máquinas'),
        ('Julia Lima', 'julia.c689bedf0fc64d4c.86@example.com', 'xpXVbOs27GMNfv22aGWLCd9B9Te2', 'Operador de Máquinas'),
        ('Gabriel Lima', 'gabriel.c689bedf0fc64d4c.87@example.com', 'tngHueuN4oY76GF7CDxeWASZMWo1', 'Operador de Máquinas'),
        ('Beatriz Lima', 'beatriz.c689bedf0fc64d4c.88@example.com', 'RmlP9IYFGLeC7ih4PXkuD3vLHXi1', 'Operador de Máquinas'),
        ('Rafael Lima', 'rafael.c689bedf0fc64d4c.89@example.com', 'LMmmL0pg8RXlFsrudb6cCj7et6x2', 'Operador de Máquinas'),
        ('Laura Lima', 'laura.c689bedf0fc64d4c.90@example.com', 'DHnq0LqUs7WTOixgoBIByOeESUv1', 'Operador de Máquinas'),
        ('Felipe Lima', 'felipe.c689bedf0fc64d4c.91@example.com', 'zsjjd0ZYcDYcODKnes3bP91CRfv2', 'Operador de Máquinas'),
        ('Mariana Lima', 'mariana.c689bedf0fc64d4c.92@example.com', 'aTZTaOjbwPQgSJEobkKdDSUY8ex1', 'Operador de Máquinas'),
        ('Bruno Lima', 'bruno.c689bedf0fc64d4c.93@example.com', '2X6LmSRluNSzdr1k6YpIeJJXAxz2', 'Operador de Máquinas'),
        ('Camila Lima', 'camila.c689bedf0fc64d4c.94@example.com', 'eVBpcIQx65RhOFDEc109gGOnEiF3', 'Operador de Máquinas'),
        ('Gustavo Lima', 'gustavo.c689bedf0fc64d4c.95@example.com', 'klCmJ6v7oMNyEFm6qHzXpTFeHD22', 'Operador de Máquinas'),
        ('Amanda Lima', 'amanda.c689bedf0fc64d4c.96@example.com', '5RRgAGvxWTMfc9lh5rd8Wz3ik6C2', 'Operador de Máquinas'),
        ('Diego Lima', 'diego.c689bedf0fc64d4c.97@example.com', 'r9GJ5KyOYAgWGvlXCJnFhfvBy2f1', 'Operador de Máquinas'),
        ('Isabela Lima', 'isabela.c689bedf0fc64d4c.98@example.com', 'trGPJDngu6OrfznWqbSFADT2c273', 'Operador de Máquinas'),
        ('Vinicius Lima', 'vinicius.c689bedf0fc64d4c.99@example.com', 'uKkEOpvO95cK9P7XiApJNIm8jap2', 'Operador de Máquinas'),
        ('Leticia Lima', 'leticia.c689bedf0fc64d4c.100@example.com', 'gl1Dhgq14ENbKnMcEfyxhSGhHJS2', 'Operador de Máquinas')
) AS dados(nome, email, firebase_uid, nome_cargo)
INNER JOIN unidades u ON u.id_unidade = 1
INNER JOIN cargos c
    ON c.workspace_id = u.workspace_id AND c.nome = dados.nome_cargo
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    firebase_uid = EXCLUDED.firebase_uid,
    tipo = EXCLUDED.tipo,
    cargo_id = EXCLUDED.cargo_id,
    unidade_id = EXCLUDED.unidade_id,
    modalidade = EXCLUDED.modalidade,
    status = EXCLUDED.status,
    criado_em = EXCLUDED.criado_em;
