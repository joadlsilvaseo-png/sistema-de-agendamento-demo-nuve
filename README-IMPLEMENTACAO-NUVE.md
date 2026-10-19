# Nuvé — Personalização e gestão de clientes

Esta entrega adiciona uma API para a Central de Personalização e para a Gestão de Clientes. O frontend atual da Nuvé é uma demonstração estática; antes da primeira validação funcional, é necessário conectar uma instalação Firebase de teste e uma base PostgreSQL de desenvolvimento.

## O que já existia e o que foi conectado

- `admin-clientes.html` já existia, mas `admin-clientes.js` lia e gravava apenas dados demonstrativos em `localStorage`, criava clientes artificiais a partir de agendamentos locais e calculava métricas financeiras simuladas. Foi substituído por consulta autenticada ao Firestore. A tela não cria perfis artificiais nem exibe faturamento.
- A Nuvé não tinha configuração Firebase, backend, banco, migrações ou regras Firestore versionadas. Foram adicionados os arquivos iniciais para o serviço necessário a estas duas funcionalidades.
- A Isabele foi consultada apenas como referência. O backend, as migrações e os arquivos da Nuvé são independentes; nenhum arquivo da Isabele foi alterado.
- As telas atuais de agenda, serviços, dashboard, cadastro e confirmação continuam sendo uma demonstração local. Esta entrega não transforma esses fluxos em operação real.

## Arquitetura

- Cada instalação usa seu próprio `NUVE_INSTALLATION_ID`, banco PostgreSQL e projeto Firebase. A API não aceita um ID de instalação vindo do navegador; o identificador é fixado no ambiente do backend.
- Firebase Authentication autentica a administradora. O backend verifica o ID token com revogação e consulta `usuarios/{uid}` no Firestore. Só aceita `role: "admin"` e `ativo: true`.
- A Gestão de Clientes lê `clientes/{uid}` e `agendamentos` via Firebase Admin SDK. O backend retorna apenas nome, telefone, e-mail, datas, serviço e status. Não altera e-mail, usuário de autenticação, dados financeiros ou agendamentos.
- Observações internas ficam em `public.nuve_client_notes`, no PostgreSQL, e só são lidas ou alteradas por endpoints administrativos.
- A identidade visual é armazenada em `public.nuve_branding`. Logos são validadas e reprocessadas para WebP com Sharp, guardadas em `BYTEA` e servidas em uma rota separada com URL baseada no hash do conteúdo.
- As rotas públicas de identidade retornam somente nome, descrição, fontes, cores e URL da logo publicada. Uploads não publicados não são acessíveis pela rota pública.
- Não foram adicionados Firebase Storage, Cloud Functions, FCM ou novas integrações financeiras.

## Rotas da API

| Método e rota | Acesso | Uso |
|---|---|---|
| `GET /api/public/branding` | Público | Identidade publicada, sem identificadores internos |
| `GET /api/public/branding/logo/:sha256` | Público | Bytes WebP da logo publicada e versionada |
| `GET /api/admin/me` | Firebase admin | Conferir a sessão administrativa |
| `GET /api/admin/branding` | Firebase admin | Ler rascunho publicado no editor |
| `PUT /api/admin/branding` | Firebase admin | Salvar e publicar identidade validada |
| `POST /api/admin/branding/logo` | Firebase admin | Validar, reprocessar e guardar uma logo em estágio |
| `GET /api/admin/clients?limit=20&cursor=...&q=...` | Firebase admin | Listar, buscar e paginar perfis Firestore |
| `GET /api/admin/clients/:uid` | Firebase admin | Consultar perfil e histórico por UID validado |
| `PUT /api/admin/clients/:uid/note` | Firebase admin | Salvar observação interna |
| `GET /api/health` | Público | Verificação simples da API e da conexão PostgreSQL |

## Estrutura da migração

`infra/migrations/001_branding_and_client_notes.sql` cria:

- `nuve_branding`: nome, descrição, cores, fontes e referência à logo atual, por instalação.
- `nuve_branding_logos`: bytes `BYTEA`, MIME WebP, tamanho, SHA-256, estado de publicação e autoria do upload.
- `nuve_client_notes`: observações internas por instalação e UID.

A migração **não foi executada**. Aplicá-la somente em um banco PostgreSQL de desenvolvimento após revisão. A aplicação do banco de produção não faz parte desta entrega.

## Configuração local de teste

1. Crie ou selecione um **projeto Firebase de teste** da Nuvé e habilite o método de autenticação por e-mail e senha. Este repositório não contém os dados de configuração nem credenciais de serviço.
2. Configure `firebase-config.js` com a configuração web pública desse projeto. Ela é pública por natureza; nunca coloque nela o JSON da conta de serviço.
3. Crie um usuário de teste na Firebase Authentication e, no Firestore de teste, crie `usuarios/{UID_DO_ADMIN}` com:

   ```json
   { "role": "admin", "ativo": true }
   ```

4. Para validar clientes, crie perfis reais de teste em `clientes/{UID}` com campos `nome`, `telefone`, `email`, `role: "cliente"` e `dataCadastro`. Os agendamentos podem usar qualquer um dos campos de vínculo já reconhecidos: `clienteId`, `idCliente`, `usuarioId`, `uidCliente` ou `userId`.
5. Copie `infra/backend/.env.example` para `.env` local e configure `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `NUVE_INSTALLATION_ID` e `NUVE_ALLOWED_ORIGINS`. A conta de serviço deve pertencer ao projeto de teste correto, ter acesso apenas ao Firebase Auth/Firestore necessários e ficar fora do repositório.
6. Use um PostgreSQL **local/de desenvolvimento**, aplique nele a migração versionada e instale as dependências do backend:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/migrations/001_branding_and_client_notes.sql
   npm --prefix infra/backend install
   npm --prefix infra/backend test
   npm --prefix infra/backend start
   ```

7. No Live Server, preencha `runtime-config.js` com `apiBaseUrl: "http://localhost:3010"` e ajuste `NUVE_ALLOWED_ORIGINS` para a origem exata do Live Server. Não use dados nem credenciais da Isabele.

As regras Firestore não são ampliadas por esta implementação: as leituras e escritas administrativas passam pela API com Admin SDK e verificação de papel. Como não havia regras Nuvé versionadas nem fluxo real de cadastro, a definição/revisão das regras completas para o futuro fluxo de clientes permanece pendente antes de publicar um app conectado.

## Controles implementados

- Cores aceitam apenas hexadecimal `#RRGGBB`, campos conhecidos e combinação com contraste mínimo 4,5:1 para títulos, textos e texto de botão.
- Fontes são limitadas a DM Sans e Playfair Display, já usadas no projeto. URLs ou CSS fornecidos pela administradora são rejeitados.
- Upload aceita apenas MIME e conteúdo real PNG, JPEG ou WebP, até 5 MB. Sharp limita a 16 megapixels, reorienta, remove metadados por reprocessamento e converte para WebP de até 1 MB. SVG não é aceito.
- Logo é enviada para estágio; somente o `PUT` de identidade a publica. Se o salvamento seguinte falhar, a logo anterior permanece publicada. Uploads de estágio com mais de 24 horas são limpos no próximo upload.
- API usa CORS por allowlist, valida token em cada endpoint privado, confere o documento admin no servidor e não retorna mensagens internas de erros 500.
- Pesquisa de clientes compara nome, telefone e e-mail sem carregar todos os documentos numa única resposta. A busca examina até 500 documentos por lote de API e fornece cursor para continuar; refine a busca em bases grandes.
- Histórico é agrupado por UID, sem correspondência por nome. Até 200 registros por campo de vínculo são consultados; a interface indica quando o resultado pode ser parcial.

## Pendências antes de uma validação integrada

- Configurar projeto Firebase, credencial administrativa local, usuário admin e dados de teste.
- Criar base PostgreSQL local e aplicar a migração em desenvolvimento.
- Definir host da API, domínio Vercel e CORS para preview e produção. Não foi criado rewrite Vercel nem alterado domínio porque o endpoint/ambiente da API Nuvé ainda não existe.
- Avaliar regras Firestore completas para Auth, perfil próprio e os fluxos futuros de agenda; esta implementação não torna a agenda demonstrativa real.
- Validar visualmente em celular depois de conectar o backend. Refinamentos de layout não fazem parte desta etapa.
