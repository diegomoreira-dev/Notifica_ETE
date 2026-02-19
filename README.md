# 🎓 Notifica ETE – Sistema de Notificações Disciplinares

Sistema para gestão de notificações disciplinares em Escolas: login seguro, cadastro de alunos, registro de notificações por nível (Leve, Média, Grave), envio de mensagem pelo WhatsApp Web, geração de PDF e portal em que o responsável consulta o histórico com um código de 6 dígitos.

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
- 👥 **Gestão de usuários** (Admin) – Listar usuários, convidar por e-mail, definir papel (admin/operador) e excluir.

### Para o responsável
- 🌐 **Portal** – Página pública: o responsável digita o código de 6 dígitos e vê os dados do aluno e a timeline de notificações, sem precisar de login.

---

## 🛠️ Tecnologias e bibliotecas

- **Frontend:** HTML5, CSS3 e JavaScript (sem framework).
- **Backend e auth:** [Supabase](https://supabase.com) (PostgreSQL + Autenticação). As chamadas são feitas pelo cliente Supabase JS.
- **Bibliotecas usadas no navegador:**
  - **Supabase JS** – Conexão com o projeto, autenticação e acesso às tabelas.
  - **Font Awesome 6** – Ícones.
  - **jsPDF** – Geração de PDF (notificações e relatórios).
  - **SheetJS (XLSX)** – Leitura/escrita de Excel (importação de alunos, relatórios em Excel).


---

## 📁 Estrutura geral

- **index.html** – Página inicial (links para área do operador e portal do responsável).
- **pages/** – Páginas do sistema: login, painel, alunos, notificações, relatórios, perfil, gestão de usuários, portal do responsável, definir senha, redefinir senha e esqueci senha.
- **src/js/** – Scripts por página (login, painel, alunos, notificações, relatórios, perfil, gestão de usuários, portal, auth, etc.) e o arquivo que configura a API global do Supabase.
- **src/styles/** – Estilos (principal, painel, formulários, componentes, utilitários, login, portal, etc.).
- **assets/** – Imagens (logo, favicon, fundo, timbre quando houver).
- **scripts/** – Script de build usado no deploy (gera o arquivo de configuração do Supabase a partir de variáveis de ambiente).
- **vercel.json** – Configuração de deploy (headers, diretório de saída).

O banco é configurado no Supabase a partir de um script SQL (tabelas `alunos` e `notificacoes`, políticas RLS, etc.).

---

## ⚙️ Como configurar e rodar

### 1. Supabase
- Crie um projeto no [Supabase](https://supabase.com).
- Execute no SQL Editor o script que cria as tabelas, RLS e o que mais seu projeto usar.
- Na área do projeto, em **Authentication**, crie pelo menos um usuário (e-mail e senha) para testar o login.
- Para o sistema conectar ao projeto, é necessário informar a **URL do projeto** e a **chave anônima (anon)** em algum ponto da aplicação (por exemplo um arquivo de configuração que não vai para o repositório, ou variáveis de ambiente no deploy). O build da Vercel pode gerar esse arquivo a partir de variáveis de ambiente.

### 2. Rodar localmente
- Sirva a pasta do projeto com um servidor estático (por exemplo `npx serve .` ou a extensão Live Server no VS Code) e abra `index.html`.
- Garanta que a aplicação está recebendo a URL e a chave anônima do Supabase (por configuração local ou pelo mesmo mecanismo do deploy).

### 3. Deploy (ex.: Vercel)
- Conecte o repositório à Vercel e defina as variáveis de ambiente com a URL e a chave anônima do Supabase.
- Use o comando de build que gera o arquivo de configuração (ex.: `npm run build`) e o diretório de saída configurado (ex.: raiz do projeto). O `vercel.json` já define headers e diretório de saída.

---

## 📊 Banco de dados (resumo)

- **alunos** – id, nome, data_nascimento, matricula, turma, responsavel, telefone_responsavel, codigo_portal (código único de 6 dígitos para o portal).
- **notificacoes** – id, aluno_id (FK), data_hora, nivel (Leve/Média/Grave), descricao, status (ativo/pendente/resolvido), registrado_por.

A segurança dos dados é garantida pelas políticas RLS no Supabase; no front é usada apenas a chave anônima.

---

## 🔒 Segurança em poucas linhas

- Login e sessão via Supabase Auth; após um tempo de uso (ex.: 8 horas) o sistema pode exigir novo login.
- Acesso aos dados controlado por RLS no Supabase; a chave que fica no front é a **anon** (pública por design).
- A chave **service_role** não é usada no front; quando existe função serverless (Edge Function) para gestão de usuários, só ela usa essa chave.


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

Projeto desenvolvido para uso em Escolas Técnicas Estaduais. Para dúvidas ou suporte, consulte a documentação do projeto ou a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para Escolas Técnicas Estaduais**
