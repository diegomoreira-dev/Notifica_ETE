# 🎓 Notifica ETE – Sistema de Notificações Disciplinares

Sistema para gestão de notificações disciplinares em Escolas: login seguro, cadastro de alunos, registro de notificações por nível (Leve, Média, Grave), envio de mensagem pelo WhatsApp Web, geração de PDF e portal em que o responsável consulta o histórico com um código de 6 dígitos.

---

## 📑 Sumário

- [O que o sistema faz](#-o-que-o-sistema-faz)
- [Tecnologias e bibliotecas](#️-tecnologias-e-bibliotecas)
- [Estrutura geral](#-estrutura-geral)
- [Como configurar e rodar](#️-como-configurar-e-rodar)
- [Banco de dados](#-banco-de-dados-resumo)
- [Segurança em poucas linhas](#-segurança-em-poucas-linhas)
- [Fluxo rápido de uso](#-fluxo-rápido-de-uso)
- [Licença e uso](#-licença-e-uso)

---

## 🚀 O que o sistema faz

### Para quem usa no dia a dia (operadores)
- 🔐 **Login** com e-mail e senha.
- 📊 **Painel** com totais de alunos e notificações, contagem por nível e por status, alertas e lista de notificações recentes.
- 👥 **Alunos** – Cadastro, edição, exclusão e lista com filtros. Importação em lote por planilha (Excel). Código de 6 dígitos para o portal do responsável.
- 🔔 **Notificações** – Cadastro e edição com nível (Leve, Média, Grave), descrição, status e vínculo ao aluno. Filtros por turma, nível, status e datas.
- 📱 **WhatsApp** – Botão que monta a mensagem e abre o WhatsApp Web para envio, com opção de conferir e editar antes.
- 📄 **PDF** – Geração de PDF da notificação com dados do aluno e da ocorrência.
- 📤 **Relatórios** – Relatórios de alunos, de notificações e consolidado, com filtros e exportação em PDF e Excel.
- 👤 **Perfil** – Alteração de nome de exibição e de senha.
- 👥 **Gestão de usuários** (Admin) – Listar usuários, convidar por e-mail, definir papel (admin/operador) e excluir, via Edge Function dedicada no Supabase.

### Para o responsável
- 🌐 **Portal** – Página pública: o responsável digita o código de 6 dígitos e vê os dados do aluno e a timeline de notificações, sem precisar de login.

---

## 🛠️ Tecnologias e bibliotecas

- **Frontend:** HTML5, CSS3 e JavaScript (sem framework).
- **Backend e auth:** [Supabase](https://supabase.com) (PostgreSQL + Autenticação + Edge Functions). As chamadas são feitas pelo cliente Supabase JS.
- **Bibliotecas usadas no navegador:**
  - **Supabase JS** – Conexão com o projeto, autenticação e acesso às tabelas.
  - **Font Awesome 6** – Ícones.
  - **jsPDF** – Geração de PDF (notificações e relatórios).
  - **SheetJS (XLSX)** – Leitura/escrita de Excel (importação de alunos, relatórios em Excel).

---

## 📁 Estrutura geral

```
.
├── index.html              # Página inicial (links para área do operador e portal do responsável)
├── pages/                  # Páginas: login, painel, alunos, notificações, relatórios,
│                           #   perfil, gestão de usuários, portal, definir/redefinir/esqueci senha
├── src/
│   ├── js/                 # Scripts por página + supabase-global.js (API global do Supabase)
│   └── styles/             # Estilos (principal, painel, formulários, componentes, login, portal...)
├── assets/                 # Imagens (logo, favicon, fundo)
├── scripts/
│   └── build-vercel.js     # Gera src/js/supabase-config.js a partir das env vars no deploy
├── package.json
└── vercel.json              # Headers de segurança e config de deploy
```

> ⚠️ O arquivo `src/js/supabase-config.js` **não é versionado** (está no `.gitignore`) porque carrega a URL e a chave anônima do projeto Supabase. Ele é gerado automaticamente no deploy pelo `scripts/build-vercel.js`, ou criado manualmente para rodar localmente — veja a seção abaixo.

O banco é configurado no Supabase a partir de um script SQL próprio do projeto (tabelas `alunos` e `notificacoes`, políticas RLS etc.), que **não está incluído neste repositório** por conter dados de ambiente específicos. Veja a seção [Banco de dados](#-banco-de-dados-resumo) para a estrutura mínima necessária para recriá-lo.

---

## ⚙️ Como configurar e rodar

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) 14 ou superior (usado apenas para servir os arquivos estáticos e rodar o script de build — não há backend Node).
- Uma conta no [Supabase](https://supabase.com).

### 2. Criar o projeto no Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, crie as tabelas `alunos` e `notificacoes` (ver estrutura em [Banco de dados](#-banco-de-dados-resumo)) e configure as políticas de RLS.
3. Em **Authentication → Users**, crie pelo menos um usuário (e-mail e senha) para testar o login.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** — você vai precisar delas no próximo passo.
5. (Opcional, para a tela de Gestão de Usuários) publique a Edge Function responsável por convidar/gerenciar usuários, que é a única parte do sistema autorizada a usar a chave `service_role`.

### 3. Rodar localmente

Clone o repositório e instale as dependências de desenvolvimento (apenas os servidores estáticos):

```bash
git clone https://github.com/diegomoreira-dev/Notifica_ETE.git
cd Notifica_ETE
npm install
```

Como `src/js/supabase-config.js` não vem no repositório, crie esse arquivo manualmente antes de abrir a aplicação:

```bash
cat > src/js/supabase-config.js << 'EOF'
window.__SUPABASE_CONFIG__ = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_CHAVE_ANON_PUBLIC"
};
EOF
```

Depois, suba um servidor estático apontando para a raiz do projeto:

```bash
npm start        # usa "npx serve ."
# ou
npm run dev       # usa "npx live-server --port=3000" com live reload
```

Abra `index.html` (ou o endereço indicado pelo servidor) no navegador.

### 4. Deploy (ex.: Vercel)
1. Conecte o repositório à Vercel.
2. Em **Settings → Environment Variables**, defina:
   - `SUPABASE_URL` – URL do projeto Supabase.
   - `SUPABASE_ANON_KEY` – chave anônima (anon public) do projeto.
3. O comando de build (`npm run build`, já configurado no `vercel.json`) executa `scripts/build-vercel.js`, que gera `src/js/supabase-config.js` a partir dessas variáveis durante o deploy — você **não** precisa (nem deve) commitar esse arquivo.
4. O `vercel.json` já define o diretório de saída (raiz do projeto) e os headers de segurança (`X-Frame-Options`, `X-Content-Type-Options` etc.).

---

## 📊 Banco de dados (resumo)

- **alunos** – `id`, `nome`, `data_nascimento`, `matricula`, `turma`, `responsavel`, `telefone_responsavel`, `codigo_portal` (código único de 6 dígitos para o portal).
- **notificacoes** – `id`, `aluno_id` (FK → alunos), `data_hora`, `nivel` (Leve/Média/Grave), `descricao`, `status` (ativo/pendente/resolvido), `registrado_por`.

A segurança dos dados é garantida pelas políticas RLS no Supabase; no front é usada apenas a chave anônima.

> 💡 Se você reaproveitar este projeto, recomenda-se versionar um script `schema.sql` "limpo" (sem dados fictícios ou e-mails pessoais) na raiz ou em `/sql`, para que outros desenvolvedores consigam recriar o banco sem depender de um arquivo externo.

---

## 🔒 Segurança em poucas linhas

- Login e sessão via Supabase Auth; após 8 horas de uso o sistema exige novo login (ajustável em `MAX_SESSION_AGE_MS`, em `src/js/supabase-global.js`).
- Acesso aos dados controlado por RLS no Supabase; a chave que fica no front é a **anon** (pública por design).
- A chave **service_role** nunca é usada no front; a Edge Function de gestão de usuários é o único ponto que a utiliza, do lado do servidor.
- `vercel.json` já aplica headers de segurança padrão (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, etc.) em todas as rotas.

---

## 🎯 Fluxo rápido de uso

1. **Alunos** – Fazer login → Alunos → Novo aluno ou importar planilha → Salvar.
2. **Notificação** – Notificações → Nova notificação → Preencher aluno, nível, descrição, etc. → Salvar.
3. **WhatsApp** – Na lista de notificações, usar o botão de WhatsApp → Conferir mensagem → Abrir no WhatsApp Web.
4. **PDF** – Na notificação, usar o botão de PDF para baixar.
5. **Relatórios** – Relatórios → Escolher tipo, filtros → Aplicar → Exportar PDF ou Excel.
6. **Portal (responsável)** – Na página inicial, acessar o portal → Digitar o código de 6 dígitos → Ver histórico.

---

## 📝 Licença e uso

Distribuído sob a licença **MIT** (ver `LICENSE`). Projeto desenvolvido no curso Técnico de Desenvolvimento de Sistemas da ETEGEC, para uso em Escolas. Para dúvidas ou suporte, abra uma [issue](https://github.com/diegomoreira-dev/Notifica_ETE/issues) no repositório.
