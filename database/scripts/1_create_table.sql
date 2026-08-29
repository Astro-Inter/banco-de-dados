CREATE TABLE workspace (
    id_workspace BIGSERIAL,
    nome_empresa VARCHAR(180) NOT NULL,
    cnpj CHAR(14) NOT NULL
);

COMMENT ON TABLE workspace IS 'Empresa ou ambiente cliente responsável por unidades, usuários e eventos no Astro.';
COMMENT ON COLUMN workspace.id_workspace IS 'Identificador único do workspace, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN workspace.nome_empresa IS 'Nome da empresa responsável pelo workspace; deve possuir pelo menos dois caracteres úteis.';
COMMENT ON COLUMN workspace.cnpj IS 'CNPJ da empresa, armazenado de forma normalizada com exatamente 14 dígitos e sem pontuação.';


CREATE TABLE unidade (
    id_unidade BIGSERIAL,
    id_workspace BIGINT NOT NULL,
    nome_unidade VARCHAR(150) NOT NULL,
    cnpj CHAR(14) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE unidade IS 'Estabelecimento físico pertencente a um workspace, com endereço e situação cadastral.';
COMMENT ON COLUMN unidade.id_unidade IS 'Identificador único da unidade, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN unidade.id_workspace IS 'Workspace ao qual a unidade pertence; implementa o relacionamento de um workspace para várias unidades.';
COMMENT ON COLUMN unidade.nome_unidade IS 'Nome usado para identificar a unidade dentro do workspace.';
COMMENT ON COLUMN unidade.cnpj IS 'CNPJ do estabelecimento, armazenado com 14 dígitos e sem pontuação.';
COMMENT ON COLUMN unidade.ativo IS 'Indica se a unidade está ativa e disponível para utilização no sistema.';
COMMENT ON COLUMN unidade.criado_em IS 'Data e hora, com fuso, em que a unidade foi cadastrada.';
COMMENT ON COLUMN unidade.atualizado_em IS 'Data e hora, com fuso, da última atualização dos dados da unidade.';


CREATE TABLE endereco_unidade (
    id_unidade BIGINT NOT NULL,
    cep CHAR(8) NOT NULL,
    estado CHAR(2) NOT NULL,
    cidade VARCHAR(120) NOT NULL,
    bairro VARCHAR(120) NOT NULL,
    rua VARCHAR(180) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(120)
);

COMMENT ON TABLE endereco_unidade IS 'Endereço da unidade, separado para manter os dados cadastrais de localização organizados em uma relação 1:1.';
COMMENT ON COLUMN endereco_unidade.id_unidade IS 'Unidade proprietária do endereço; é PK e FK para garantir no máximo um endereço por unidade.';
COMMENT ON COLUMN endereco_unidade.cep IS 'CEP da unidade, armazenado com exatamente oito dígitos e sem hífen.';
COMMENT ON COLUMN endereco_unidade.estado IS 'Sigla da Unidade Federativa com duas letras maiúsculas, como SP ou RJ.';
COMMENT ON COLUMN endereco_unidade.cidade IS 'Nome da cidade em que a unidade está localizada.';
COMMENT ON COLUMN endereco_unidade.bairro IS 'Nome do bairro em que a unidade está localizada.';
COMMENT ON COLUMN endereco_unidade.rua IS 'Logradouro do endereço da unidade.';
COMMENT ON COLUMN endereco_unidade.numero IS 'Número do endereço; utiliza texto para aceitar valores como 120-A ou S/N.';
COMMENT ON COLUMN endereco_unidade.complemento IS 'Informação complementar opcional, como bloco, andar, sala ou referência.';


CREATE TABLE nr_catalogo (
    codigo_nr SMALLINT NOT NULL,
    titulo VARCHAR(220) NOT NULL,
    tempo_reciclagem_meses SMALLINT NOT NULL,
    revogada BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE nr_catalogo IS 'Catálogo central das Normas Regulamentadoras conhecidas pelo Astro.';
COMMENT ON COLUMN nr_catalogo.codigo_nr IS 'Código numérico da Norma Regulamentadora e chave natural utilizada para identificá-la.';
COMMENT ON COLUMN nr_catalogo.titulo IS 'Título oficial ou resumido da Norma Regulamentadora.';
COMMENT ON COLUMN nr_catalogo.tempo_reciclagem_meses IS 'Intervalo padrão, em meses, para reciclagem ou renovação relacionada à NR.';
COMMENT ON COLUMN nr_catalogo.revogada IS 'Indica se a NR foi revogada, permitindo preservar referências e histórico sem excluí-la.';


CREATE TABLE cargo (
    id_cargo BIGSERIAL,
    nome VARCHAR(150) NOT NULL
);

COMMENT ON TABLE cargo IS 'Cargo ocupacional utilizado por usuários e relacionado às NRs aplicáveis.';
COMMENT ON COLUMN cargo.id_cargo IS 'Identificador único do cargo, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN cargo.nome IS 'Nome do cargo ocupacional; deve possuir pelo menos dois caracteres úteis.';

CREATE TABLE usuario (
    id_usuario BIGSERIAL,
    id_unidade BIGINT NOT NULL,
    id_cargo BIGINT,
    nome VARCHAR(180) NOT NULL,
    email VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255),
    cpf CHAR(11),
    departamento VARCHAR(120),
    modalidade VARCHAR(40),
    status VARCHAR(20) NOT NULL DEFAULT 'PRE_CADASTRADO',
    tipo VARCHAR(25) NOT NULL
);

COMMENT ON TABLE usuario IS 'Conta autenticável do Astro, especializada pelo campo tipo em gestor, gestor do workspace ou funcionário.';
COMMENT ON COLUMN usuario.id_usuario IS 'Identificador único do usuário, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN usuario.id_unidade IS 'Unidade em que o usuário trabalha ou à qual sua conta está vinculada.';
COMMENT ON COLUMN usuario.id_cargo IS 'Cargo ocupacional do usuário; pode permanecer nulo para gestores ou durante o pré-cadastro.';
COMMENT ON COLUMN usuario.nome IS 'Nome completo do usuário apresentado nas telas e relatórios do Astro.';
COMMENT ON COLUMN usuario.email IS 'Endereço de e-mail utilizado para comunicação e autenticação do usuário.';
COMMENT ON COLUMN usuario.senha_hash IS 'Hash seguro da senha; nunca deve armazenar a senha original em texto puro e pode ser nulo no pré-cadastro.';
COMMENT ON COLUMN usuario.cpf IS 'CPF normalizado com 11 dígitos; pode ser nulo durante o pré-cadastro ou para perfis ainda incompletos.';
COMMENT ON COLUMN usuario.departamento IS 'Departamento ou área organizacional em que o usuário atua.';
COMMENT ON COLUMN usuario.modalidade IS 'Modalidade de trabalho ou vínculo do usuário, mantida como texto enquanto os valores possíveis não forem fechados.';
COMMENT ON COLUMN usuario.status IS 'Situação cadastral da conta: PRE_CADASTRADO, ATIVO ou DESATIVADO.';
COMMENT ON COLUMN usuario.tipo IS 'Perfil do usuário no Astro: GESTOR, GESTOR_WORKSPACE ou FUNCIONARIO.';


CREATE TABLE usuario_telefone (
    id_usuario BIGINT NOT NULL,
    telefone VARCHAR(15) NOT NULL
);

COMMENT ON TABLE usuario_telefone IS 'Valores do atributo multivalorado telefone da entidade usuario.';
COMMENT ON COLUMN usuario_telefone.id_usuario IS 'Usuário proprietário do número de telefone.';
COMMENT ON COLUMN usuario_telefone.telefone IS 'Telefone normalizado com 10 a 15 dígitos, incluindo DDD e, quando necessário, DDI.';


CREATE TABLE admin (
    id_admin BIGSERIAL,
    email VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL
);

COMMENT ON TABLE admin IS 'Administrador técnico da plataforma, separado dos usuários dos workspaces conforme o modelo conceitual.';
COMMENT ON COLUMN admin.id_admin IS 'Identificador único do administrador técnico, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN admin.email IS 'Endereço de e-mail utilizado na autenticação administrativa da plataforma.';
COMMENT ON COLUMN admin.senha_hash IS 'Hash seguro da senha administrativa; o tamanho mínimo reduz o risco de armazenar senha em texto puro.';


CREATE TABLE unidade_nr (
    id_unidade BIGINT NOT NULL,
    codigo_nr SMALLINT NOT NULL
);

COMMENT ON TABLE unidade_nr IS 'Tabela associativa do relacionamento N:N entre unidade e nr_catalogo.';
COMMENT ON COLUMN unidade_nr.id_unidade IS 'Unidade à qual a Norma Regulamentadora se aplica.';
COMMENT ON COLUMN unidade_nr.codigo_nr IS 'Norma Regulamentadora aplicável à unidade.';


CREATE TABLE cargo_nr (
    id_cargo BIGINT NOT NULL,
    codigo_nr SMALLINT NOT NULL
);

COMMENT ON TABLE cargo_nr IS 'Tabela associativa do relacionamento N:N entre cargo e nr_catalogo.';
COMMENT ON COLUMN cargo_nr.id_cargo IS 'Cargo relacionado à Norma Regulamentadora.';
COMMENT ON COLUMN cargo_nr.codigo_nr IS 'Norma Regulamentadora exigida ou aplicável ao cargo.';


CREATE TABLE evento (
    id_evento BIGSERIAL,
    id_gestor BIGINT NOT NULL,
    codigo_nr SMALLINT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    validade_meses SMALLINT NOT NULL,
    link_externo VARCHAR(2048),
    modo_conclusao VARCHAR(25) NOT NULL,
    evidencia_obrigatoria BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE evento IS 'Evento de treinamento ou conformidade; contém os dados comuns a todas as suas turmas.';
COMMENT ON COLUMN evento.id_evento IS 'Identificador único do evento, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN evento.id_gestor IS 'Usuário gestor responsável pela criação ou administração do evento.';
COMMENT ON COLUMN evento.codigo_nr IS 'Norma Regulamentadora relacionada ao conteúdo ou à obrigação atendida pelo evento.';
COMMENT ON COLUMN evento.titulo IS 'Título compartilhado por todas as turmas pertencentes ao evento.';
COMMENT ON COLUMN evento.descricao IS 'Descrição detalhada do evento, de seus objetivos ou de seu conteúdo.';
COMMENT ON COLUMN evento.validade_meses IS 'Quantidade de meses de validade da conclusão obtida no evento.';
COMMENT ON COLUMN evento.link_externo IS 'URL opcional de conteúdo, reunião, curso ou material externo relacionado ao evento.';
COMMENT ON COLUMN evento.modo_conclusao IS 'Forma de registro da conclusão: FUNCIONARIO, GESTOR ou LISTA_PRESENCA.';
COMMENT ON COLUMN evento.evidencia_obrigatoria IS 'Indica se a conclusão do evento exige o envio de pelo menos uma evidência.';


CREATE TABLE turma (
    id_turma BIGSERIAL,
    id_evento BIGINT NOT NULL,
    nome_turma VARCHAR(120) NOT NULL,
    inicio_em TIMESTAMPTZ NOT NULL,
    termino_em TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE turma IS 'Programação específica de um evento, contendo nome, data e horário próprios.';
COMMENT ON COLUMN turma.id_turma IS 'Identificador único da turma, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN turma.id_evento IS 'Evento ao qual a turma pertence.';
COMMENT ON COLUMN turma.nome_turma IS 'Nome usado para diferenciar a turma das demais turmas do mesmo evento.';
COMMENT ON COLUMN turma.inicio_em IS 'Data e horário de início da turma, com informação de fuso horário.';
COMMENT ON COLUMN turma.termino_em IS 'Data e horário de término da turma, com informação de fuso horário.';


CREATE TABLE turma_funcionario (
    id_turma_funcionario BIGSERIAL,
    id_turma BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL
);

COMMENT ON TABLE turma_funcionario IS 'Tabela associativa que materializa o relacionamento N:N entre turma e usuário funcionário.';
COMMENT ON COLUMN turma_funcionario.id_turma_funcionario IS 'Identificador único da participação do funcionário na turma; é referenciado pela conclusão do evento.';
COMMENT ON COLUMN turma_funcionario.id_turma IS 'Turma para a qual o funcionário foi distribuído.';
COMMENT ON COLUMN turma_funcionario.id_usuario IS 'Usuário participante da turma; a regra de negócio deve garantir que seu tipo seja FUNCIONARIO.';


CREATE TABLE conclusao_evento (
    id_conclusao BIGSERIAL,
    id_turma_funcionario BIGINT NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'PENDENTE',
    data_conclusao TIMESTAMPTZ,
    data_validacao TIMESTAMPTZ,
    data_validade DATE,
    motivo_rejeicao TEXT
);

COMMENT ON TABLE conclusao_evento IS 'Registro de conclusão e validação de um funcionário em uma turma de evento.';
COMMENT ON COLUMN conclusao_evento.id_conclusao IS 'Identificador único do registro de conclusão, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN conclusao_evento.id_turma_funcionario IS 'Participação do funcionário na turma à qual esta conclusão pertence.';
COMMENT ON COLUMN conclusao_evento.status IS 'Situação da conclusão: PENDENTE, CONCLUIDO ou REJEITADO.';
COMMENT ON COLUMN conclusao_evento.data_conclusao IS 'Data e horário em que o funcionário concluiu ou teve a conclusão registrada.';
COMMENT ON COLUMN conclusao_evento.data_validacao IS 'Data e horário em que a conclusão foi validada ou rejeitada.';
COMMENT ON COLUMN conclusao_evento.data_validade IS 'Último dia de validade da conclusão, calculado após sua aprovação.';
COMMENT ON COLUMN conclusao_evento.motivo_rejeicao IS 'Justificativa obrigatória quando o status da conclusão for REJEITADO.';


CREATE TABLE evidencia (
    id_evidencia BIGSERIAL,
    id_conclusao BIGINT NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(2048) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    tamanho_bytes BIGINT NOT NULL
);

COMMENT ON TABLE evidencia IS 'Metadados de arquivos anexados para comprovar a conclusão de um evento.';
COMMENT ON COLUMN evidencia.id_evidencia IS 'Identificador único da evidência, gerado automaticamente por uma sequência BIGSERIAL.';
COMMENT ON COLUMN evidencia.id_conclusao IS 'Conclusão de evento à qual o arquivo de evidência está associado.';
COMMENT ON COLUMN evidencia.nome_arquivo IS 'Nome original do arquivo apresentado ao usuário.';
COMMENT ON COLUMN evidencia.caminho_arquivo IS 'URL, caminho ou chave utilizada para localizar o arquivo no serviço de armazenamento.';
COMMENT ON COLUMN evidencia.mime_type IS 'Tipo MIME do arquivo, como application/pdf ou image/png.';
COMMENT ON COLUMN evidencia.tamanho_bytes IS 'Tamanho do arquivo em bytes, utilizado para validação de limite e auditoria do upload.';