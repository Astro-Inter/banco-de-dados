# Documentação Redis

Este módulo documenta contratos de chaves, expiração e fluxos. Não conecta ao Redis nem executa comandos.

- `keys/*.json`: uma definição por família de chaves; `id` único, padrão `key`, tipo, finalidade, status, TTL, produtores, consumidores, comandos, estrutura, exemplo, observações e evidências de código.
- `docs/modeling.json`: responsabilidades, decisões em aberto e fluxos com etapas que podem apontar para um `keyId`.
- `analyzer/redis/`: validação e geração independente de `generated/redis.json`.
- `site/components/redis/`: catálogo, busca e fluxos.

Use **Editar documentação** no modo local para revisar e salvar o JSON. No modo estático, atualize os arquivos e rode `npm run build`. Para adicionar uma família, crie um JSON em `keys/` seguindo as definições existentes e rode `npm run analyze`.

## Base documental e revisão

O levantamento de 26/09/2026 consultou a proposta inicial de filas, tokens, sessões e cache e as cópias locais dos repositórios da pasta Astro. A documentação é independente e não sincroniza com fontes externas.

Operações concretas foram localizadas em `BANCO DE DADOS/astro-email-worker`: filas de IDs de usuários e e-mails, códigos por ID com TTL e códigos por e-mail sem TTL. O workflow agenda lotes a cada cinco minutos e permite disparo manual. O estado de implantação não foi consultado.

Em `IA/astro-ai-api`, `REDIS_URL` está declarada em `app/core/config.py` e `render.yaml`; não foi localizado cliente Redis nem operações sobre chaves. O cache de MCP em `app/infrastructure/mcp_fetch.py` usa memória local. Não foram localizados produtores das filas, validadores dos códigos, ranking ou contratos Redis em `WEB/astro-web` e nos demais arquivos consultados.

**Implementado** significa encontrado no código local; **Proposta** indica contrato ainda não localizado. Nomes entre `<...>` são variáveis, não nomes reais de chaves. Os exemplos são fictícios; valores de `.env`, credenciais e dados reais não foram copiados. Atualize `evidence` e os estados quando os contratos evoluírem.
