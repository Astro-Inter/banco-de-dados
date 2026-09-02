CREATE TABLE workspaces (
    id_workspace BIGSERIAL,
    nome VARCHAR(255),
    cnpj VARCHAR(14)
);

COMMENT ON TABLE workspaces IS 'Empresas ou ambientes clientes que isolam os dados de cargos, unidades, usuários e eventos no Astro.';
COMMENT ON COLUMN workspaces.id_workspace IS 'Identificador interno e autoincrementado do workspace.';
COMMENT ON COLUMN workspaces.nome IS 'Nome empresarial ou nome de exibição do workspace.';
COMMENT ON COLUMN workspaces.cnpj IS 'CNPJ do workspace, armazenado somente com os 14 dígitos.';

CREATE TABLE cargos (
    id_cargo BIGSERIAL,
    workspace_id BIGINT,
    nome VARCHAR(255),
    ativo BOOLEAN
);

COMMENT ON TABLE cargos IS 'Cargos profissionais cadastrados dentro de um workspace.';
COMMENT ON COLUMN cargos.id_cargo IS 'Identificador interno e autoincrementado do cargo.';
COMMENT ON COLUMN cargos.workspace_id IS 'Workspace proprietário do cargo.';
COMMENT ON COLUMN cargos.nome IS 'Nome do cargo exercido pelo usuário.';

CREATE TABLE unidades (
    id_unidade BIGSERIAL,
    workspace_id BIGINT,
    nome VARCHAR(255),
    ativo BOOLEAN
);

COMMENT ON TABLE unidades IS 'Estabelecimentos ou unidades organizacionais pertencentes a um workspace.';
COMMENT ON COLUMN unidades.id_unidade IS 'Identificador interno e autoincrementado da unidade.';
COMMENT ON COLUMN unidades.workspace_id IS 'Workspace ao qual a unidade pertence.';
COMMENT ON COLUMN unidades.nome IS 'Nome de identificação da unidade.';

CREATE TABLE unidade_enderecos (
    unidade_id BIGINT,
    cep VARCHAR(8),
    rua VARCHAR(255),
    cidade VARCHAR(255),
    bairro VARCHAR(255),
    estado VARCHAR(2),
    complemento VARCHAR(255)
);

COMMENT ON TABLE unidade_enderecos IS 'Endereço opcional e único de cada unidade.';
COMMENT ON COLUMN unidade_enderecos.unidade_id IS 'Unidade à qual o endereço pertence; também identifica unicamente o endereço.';
COMMENT ON COLUMN unidade_enderecos.cep IS 'CEP do endereço, armazenado somente com os 8 dígitos.';
COMMENT ON COLUMN unidade_enderecos.rua IS 'Nome da rua, avenida ou logradouro da unidade.';
COMMENT ON COLUMN unidade_enderecos.cidade IS 'Cidade onde a unidade está localizada.';
COMMENT ON COLUMN unidade_enderecos.bairro IS 'Bairro onde a unidade está localizada.';
COMMENT ON COLUMN unidade_enderecos.estado IS 'Sigla da unidade federativa em duas letras maiúsculas.';
COMMENT ON COLUMN unidade_enderecos.complemento IS 'Informação complementar e opcional do endereço.';

CREATE TABLE conta (
    nome VARCHAR(255),
    email VARCHAR(255),
    senha_hash VARCHAR(255)
);

COMMENT ON TABLE conta IS 'Dados comuns de identificação e autenticação herdados por usuários e administradores.';
COMMENT ON COLUMN conta.nome IS 'Nome completo da conta.';
COMMENT ON COLUMN conta.email IS 'Endereço de e-mail usado para identificação e autenticação.';
COMMENT ON COLUMN conta.senha_hash IS 'Hash seguro da senha da conta.';

CREATE TABLE usuarios (
    id_usuario BIGSERIAL,
    tipo VARCHAR(50),
    cargo_id BIGINT,
    unidade_id BIGINT,
    cpf CHAR(11),
    modalidade VARCHAR(50),
    status VARCHAR(50),
    criado_em TIMESTAMP
) INHERITS (conta);

COMMENT ON TABLE usuarios IS 'Contas dos gestores, gestores de workspace e funcionários que utilizam o Astro.';
COMMENT ON COLUMN usuarios.id_usuario IS 'Identificador interno e autoincrementado do usuário.';
COMMENT ON COLUMN usuarios.tipo IS 'Perfil de acesso do usuário no Astro.';
COMMENT ON COLUMN usuarios.cargo_id IS 'Cargo ao qual o usuário está vinculado.';
COMMENT ON COLUMN usuarios.unidade_id IS 'Unidade na qual o usuário está alocado.';
COMMENT ON COLUMN usuarios.cpf IS 'CPF do usuário, armazenado somente com os 11 dígitos.';
COMMENT ON COLUMN usuarios.modalidade IS 'Modalidade de trabalho ou vínculo informada para o usuário.';
COMMENT ON COLUMN usuarios.status IS 'Situação atual do cadastro e do acesso do usuário.';

CREATE TABLE admin (
    id_admin BIGSERIAL
) INHERITS (conta);

COMMENT ON TABLE admin IS 'Administradores técnicos da plataforma, independentes dos usuários de cada workspace.';
COMMENT ON COLUMN admin.id_admin IS 'Identificador interno e autoincrementado do administrador.';

CREATE TABLE usuario_foto_perfil (
    usuario_id BIGINT,
    caminho_objeto VARCHAR(2048)
);

COMMENT ON TABLE usuario_foto_perfil IS
'Armazena a referência da foto de perfil do usuário mantida no bucket avatars do Supabase Storage.';

COMMENT ON COLUMN usuario_foto_perfil.usuario_id IS
'Identificador do usuário proprietário da foto de perfil.';

COMMENT ON COLUMN usuario_foto_perfil.caminho_objeto IS
'Caminho permanente da imagem dentro do bucket avatars do Supabase Storage. Não deve armazenar URL pública ou assinada.';

CREATE TABLE nr_catalogos (
    codigo_nr INTEGER,
    titulo VARCHAR(255),
    tempo_reciclagem_meses INTEGER,
    revogada BOOLEAN
);

COMMENT ON TABLE nr_catalogos IS 'Catálogo central de Normas Regulamentadoras conhecidas pelo Astro.';
COMMENT ON COLUMN nr_catalogos.codigo_nr IS 'Número oficial que identifica a Norma Regulamentadora.';
COMMENT ON COLUMN nr_catalogos.titulo IS 'Título oficial ou nome resumido da Norma Regulamentadora.';
COMMENT ON COLUMN nr_catalogos.tempo_reciclagem_meses IS 'Intervalo padrão, em meses, para reciclagem ou renovação relacionada à NR.';
COMMENT ON COLUMN nr_catalogos.revogada IS 'Indica se a Norma Regulamentadora foi revogada.';

CREATE TABLE cargo_nrs (
    cargo_id BIGINT,
    nr_id INTEGER
);

COMMENT ON TABLE cargo_nrs IS 'Associa cargos às Normas Regulamentadoras aplicáveis, materializando o relacionamento N:N.';
COMMENT ON COLUMN cargo_nrs.cargo_id IS 'Cargo participante da associação.';
COMMENT ON COLUMN cargo_nrs.nr_id IS 'Norma Regulamentadora associada ao cargo.';

CREATE TABLE unidade_nrs (
    unidade_id BIGINT,
    nr_id INTEGER
);

COMMENT ON TABLE unidade_nrs IS 'Associa unidades às Normas Regulamentadoras aplicáveis, materializando o relacionamento N:N.';
COMMENT ON COLUMN unidade_nrs.unidade_id IS 'Unidade participante da associação.';
COMMENT ON COLUMN unidade_nrs.nr_id IS 'Norma Regulamentadora associada à unidade.';

CREATE TABLE eventos (
    id_evento BIGSERIAL,
    gestor_id BIGINT,
    nr_id INTEGER,
    titulo VARCHAR(255),
    descricao TEXT,
    link_externo VARCHAR(2048),
    modo_conclusao VARCHAR(50),
    evidencia_obrigatoria BOOLEAN,
    status VARCHAR(50),
    data_cancelamento TIMESTAMP,
    motivo_cancelamento TEXT
);

COMMENT ON TABLE eventos IS 'Eventos de treinamento ou conformidade criados por gestores e posteriormente divididos em turmas.';
COMMENT ON COLUMN eventos.id_evento IS 'Identificador interno e autoincrementado do evento.';
COMMENT ON COLUMN eventos.gestor_id IS 'Usuário gestor responsável pela criação do evento.';
COMMENT ON COLUMN eventos.nr_id IS 'Norma Regulamentadora opcionalmente relacionada ao evento.';
COMMENT ON COLUMN eventos.titulo IS 'Título comum a todas as turmas do evento.';
COMMENT ON COLUMN eventos.descricao IS 'Descrição e orientações gerais do evento.';
COMMENT ON COLUMN eventos.link_externo IS 'Link opcional para conteúdo, reunião ou material externo.';
COMMENT ON COLUMN eventos.modo_conclusao IS 'Forma pela qual a participação será concluída: funcionário, gestor ou lista de presença.';
COMMENT ON COLUMN eventos.evidencia_obrigatoria IS 'Indica se a conclusão exige o envio de uma evidência.';
COMMENT ON COLUMN eventos.status IS 'Situação atual do evento em seu ciclo de vida.';
COMMENT ON COLUMN eventos.data_cancelamento IS 'Data e horário em que o evento foi cancelado, quando aplicável.';
COMMENT ON COLUMN eventos.motivo_cancelamento IS 'Justificativa registrada para o cancelamento do evento.';

CREATE TABLE turmas (
    id_turma BIGSERIAL,
    evento_id BIGINT,
    nome VARCHAR(255),
    data_inicial TIMESTAMP,
    data_termino TIMESTAMP
);

COMMENT ON TABLE turmas IS 'Turmas de um evento, cada uma com programação própria de data e horário.';
COMMENT ON COLUMN turmas.id_turma IS 'Identificador interno e autoincrementado da turma.';
COMMENT ON COLUMN turmas.evento_id IS 'Evento ao qual a turma pertence.';
COMMENT ON COLUMN turmas.nome IS 'Nome usado para distinguir a turma dentro do evento.';
COMMENT ON COLUMN turmas.data_inicial IS 'Data e horário de início da turma.';
COMMENT ON COLUMN turmas.data_termino IS 'Data e horário de encerramento da turma.';

CREATE TABLE turma_funcionarios (
    id_turma_funcionario BIGSERIAL,
    turma_id BIGINT,
    usuario_id BIGINT
);

COMMENT ON TABLE turma_funcionarios IS 'Participações de usuários funcionários nas turmas dos eventos.';
COMMENT ON COLUMN turma_funcionarios.id_turma_funcionario IS 'Identificador interno e autoincrementado da participação.';
COMMENT ON COLUMN turma_funcionarios.turma_id IS 'Turma na qual o funcionário foi incluído.';
COMMENT ON COLUMN turma_funcionarios.usuario_id IS 'Usuário funcionário participante da turma.';

CREATE TABLE conclusao_eventos (
    id_conclusao_evento BIGSERIAL,
    turma_funcionario_id BIGINT,
    status VARCHAR(50),
    data_conclusao TIMESTAMP,
    data_validacao TIMESTAMP,
    data_validade DATE,
    motivo_rejeicao TEXT
);

COMMENT ON TABLE conclusao_eventos IS 'Registros de conclusão e validação da participação de um funcionário em uma turma.';
COMMENT ON COLUMN conclusao_eventos.id_conclusao_evento IS 'Identificador interno e autoincrementado da conclusão.';
COMMENT ON COLUMN conclusao_eventos.turma_funcionario_id IS 'Participação em turma à qual a conclusão pertence.';
COMMENT ON COLUMN conclusao_eventos.status IS 'Situação da conclusão durante o processo de validação.';
COMMENT ON COLUMN conclusao_eventos.data_conclusao IS 'Data e horário em que a participação foi marcada como concluída.';
COMMENT ON COLUMN conclusao_eventos.data_validacao IS 'Data e horário em que a conclusão foi validada ou rejeitada.';
COMMENT ON COLUMN conclusao_eventos.data_validade IS 'Data até a qual a conclusão ou certificação permanece válida.';
COMMENT ON COLUMN conclusao_eventos.motivo_rejeicao IS 'Justificativa registrada quando a conclusão é rejeitada.';

CREATE TABLE evidencias (
    id_evidencia BIGSERIAL,
    conclusao_evento_id BIGINT,
    nome_original VARCHAR(255),
    caminho_objeto VARCHAR(2048),
    mime_type VARCHAR(127),
    tamanho_bytes BIGINT
);

COMMENT ON TABLE evidencias IS
'Armazena os metadados dos arquivos utilizados como evidência de conclusão de eventos. O conteúdo do arquivo permanece no Supabase Storage.';

COMMENT ON COLUMN evidencias.id_evidencia IS
'Identificador único da evidência gerado automaticamente pelo PostgreSQL.';

COMMENT ON COLUMN evidencias.conclusao_evento_id IS
'Identificador da conclusão de evento à qual o arquivo de evidência pertence.';

COMMENT ON COLUMN evidencias.nome_original IS
'Nome original do arquivo informado pelo dispositivo do usuário, utilizado apenas para exibição e download.';

COMMENT ON COLUMN evidencias.caminho_objeto IS
'Caminho permanente do objeto dentro do bucket evidencias do Supabase Storage. Não deve armazenar uma URL pública ou assinada.';

COMMENT ON COLUMN evidencias.mime_type IS
'Tipo de conteúdo do arquivo, como application/pdf, image/jpeg ou application/vnd.openxmlformats-officedocument.wordprocessingml.document.';

COMMENT ON COLUMN evidencias.tamanho_bytes IS
'Tamanho total do arquivo em bytes.';

CREATE TABLE conformidades (
    id_conformidade BIGSERIAL,
    usuario_id BIGINT,
    nr_id INTEGER,
    aplicavel BOOLEAN,
    data_validade DATE,
    origem VARCHAR(50),
    conclusao_evento_id BIGINT
);

COMMENT ON TABLE conformidades IS 'Estado de conformidade de um usuário em relação a uma Norma Regulamentadora.';
COMMENT ON COLUMN conformidades.id_conformidade IS 'Identificador interno e autoincrementado do registro de conformidade.';
COMMENT ON COLUMN conformidades.usuario_id IS 'Usuário ao qual a conformidade pertence.';
COMMENT ON COLUMN conformidades.nr_id IS 'Norma Regulamentadora avaliada no registro de conformidade.';
COMMENT ON COLUMN conformidades.aplicavel IS 'Indica se a NR é aplicável ao usuário no contexto avaliado.';
COMMENT ON COLUMN conformidades.data_validade IS 'Data limite da conformidade, quando houver validade definida.';
COMMENT ON COLUMN conformidades.origem IS 'Origem do registro, como conclusão de evento ou registro administrativo.';
COMMENT ON COLUMN conformidades.conclusao_evento_id IS 'Conclusão que originou a conformidade, quando existir.';

CREATE TABLE calendario (
    data_evento DATE,
    ano INTEGER,
    mes INTEGER,
    dia INTEGER,
    trimestre INTEGER
);

COMMENT ON TABLE calendario IS 'Tabela calendário que contém os dias do ano e seus respectivos atributos de data, utilizada principalmente para consultas, agregações e análises na camada de BI.';

COMMENT ON COLUMN calendario.data_evento IS 'Data completa representada pelo registro e identificador único do dia no calendário.';
COMMENT ON COLUMN calendario.ano IS 'Ano correspondente à data do calendário.';
COMMENT ON COLUMN calendario.mes IS 'Número do mês correspondente à data, de 1 a 12.';
COMMENT ON COLUMN calendario.dia IS 'Número do dia do mês correspondente à data.';
COMMENT ON COLUMN calendario.trimestre IS 'Trimestre do ano correspondente à data, de 1 a 4.';

CREATE TABLE acessos (
    data DATE,
    usuario_id INTEGER
);

COMMENT ON TABLE acessos IS
'Registra os acessos diários dos usuários para permitir o cálculo da métrica DAU (Daily Active Users).';

COMMENT ON COLUMN acessos.data IS
'Data em que o usuário acessou o sistema. Utilizada para agrupar e calcular os usuários ativos por dia.';

COMMENT ON COLUMN acessos.usuario_id IS
'Identificador do usuário que acessou o sistema na data registrada.';
