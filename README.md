# 🎓 NOTIFICA ETE - Sistema de Notificações Disciplinares

Sistema completo de gestão de notificações disciplinares para Escolas Técnicas Estaduais, com integração WhatsApp Web, geração de PDF e portal para responsáveis.

---

## 🚀 **Funcionalidades**

### **Para Operadores:**
- 🔐 **Autenticação** - Login seguro com Supabase
- 📊 **Dashboard** - Estatísticas e alertas em tempo real
- 👥 **Gestão de Alunos** - CRUD completo + importação Excel
- 🔔 **Gestão de Notificações** - CRUD completo com níveis (Leve, Média, Grave)
- 📱 **WhatsApp** - Envio de mensagens com modal de conferência
- 📄 **PDF** - Geração automática
- 📤 **Relátorios** - Excel e Pdf de relárotios de alunos e notificações
- 🔍 **Filtros** - Busca por turma, nível, status

### **Para Responsáveis:**
- 🌐 **Portal Público** - Consulta sem login
- 🔑 **Código Portal** - Acesso com 6 dígitos
- 📋 **Histórico Completo** - Timeline de notificações
- 📊 **Estatísticas** - Total, pendentes, resolvidas

---

## 🛠️ **Tecnologias Utilizadas**

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Bibliotecas:**
  - Supabase JS (autenticação e banco de dados)
  - jsPDF (geração de PDF)
  - SheetJS/XLSX (importação Excel)
  - Font Awesome (ícones)

---

## 📁 **Estrutura do Projeto**

```
PROJ_ PENALIDADES/
├── index.html                    # Página inicial
├── pages/                        # Páginas do sistema
│   ├── login.html               # Autenticação
│   ├── painel.html              # Dashboard
│   ├── alunos.html              # Gestão de alunos
│   ├── notificacoes.html        # Gestão de notificações
│   └── portal-responsavel.html  # Portal público
├── src/
│   ├── js/                      # JavaScript modular
│   │   ├── supabase-global.js  # API global do Supabase
│   │   ├── login.js            # Lógica de login
│   │   ├── painel.js           # Lógica do dashboard
│   │   ├── alunos.js           # Lógica de alunos
│   │   ├── notificacoes.js     # Lógica de notificações
│   │   └── portal-responsavel.js # Lógica do portal
│   └── styles/                  # CSS
│       ├── main.css            # Estilos principais
│       └── dashboard.css       # Estilos do dashboard
├── assets/                      # Imagens e uploads
├── script_supabase.sql         # Script de banco de dados
├── exemplo_importacao_alunos.csv # Exemplo para importação
└── README.md                    # Este arquivo
```

---

## ⚙️ **Configuração**

### **1. Configurar Supabase:**

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script `script_supabase.sql` no SQL Editor
3. Configure as credenciais: use `src/js/supabase-config.example.js` → copie para `supabase-config.js` e preencha URL e anon key (veja `docs/SEGURANCA.md`). Para publicar no **GitHub** e fazer deploy na **Vercel**, siga `docs/VERCEL_GITHUB.md`.

### **2. Criar Usuário Operador:**

No Supabase Authentication, crie um usuário:
- Email: `operador@escola.com`
- Senha: `sua-senha-segura`

### **3. Executar o Sistema:**

```bash
# Opção 1: Servidor local simples
python -m http.server 8000

# Opção 2: Live Server (VS Code)
# Clique com botão direito em index.html > Open with Live Server

# Opção 3: Deploy (Vercel/Netlify)
# Conecte o repositório e faça deploy
```

---

## 📊 **Estrutura do Banco de Dados**

### **Tabela: alunos**
- `id` - UUID (PK)
- `nome` - VARCHAR
- `data_nascimento` - DATE
- `matricula` - VARCHAR
- `turma` - VARCHAR
- `responsavel` - VARCHAR
- `telefone_responsavel` - VARCHAR
- `codigo_portal` - VARCHAR(6) - Código único para consulta

### **Tabela: notificacoes**
- `id` - UUID (PK)
- `aluno_id` - UUID (FK → alunos)
- `data_hora` - TIMESTAMP
- `nivel` - VARCHAR (Leve, Média, Grave)
- `descricao` - TEXT
- `status` - VARCHAR (ativo, pendente, resolvido)
- `registrado_por` - VARCHAR

---

## 📱 **Funcionalidades Especiais**

### **Importação de Alunos:**
- Suporte para Excel (.xlsx) e CSV
- Validação automática de dados
- Barra de progresso em tempo real
- Relatório de erros detalhado

### **WhatsApp:**
- Modal de conferência antes de enviar
- Mensagem editável
- Formatação profissional
- Inclui código portal para consulta

### **PDF:**
- Geração automática
- 3 assinaturas (Aluno, Notificador, Responsável)
- Layout profissional
- Dados completos do aluno e notificação

### **Portal do Responsável:**
- Acesso sem login
- Código de 6 dígitos
- Timeline visual
- Estatísticas

---

## 🎯 **Fluxo de Uso**

### **1. Cadastrar Alunos:**
```
Login → Alunos → Novo Aluno (ou Importar Excel) → Salvar
```

### **2. Registrar Notificação:**
```
Login → Notificações → Nova Notificação → Preencher → Salvar
```

### **3. Enviar WhatsApp:**
```
Notificações → Botão Verde → Conferir/Editar → Enviar
```

### **4. Gerar PDF:**
```
Notificações → Botão Azul → PDF baixa automaticamente
```

### **5. Consultar (Responsável):**
```
Portal → Digitar Código → Ver Histórico
```

---

## 🔒 **Segurança**

- ✅ Autenticação com Supabase Auth
- ✅ Row Level Security (RLS) no banco
- ✅ Chave **anon** no front (pública por design); **service_role** só na Edge Function
- ✅ Código JavaScript externo (CSP compatível)
- ✅ Validação de dados no frontend e backend
- ✅ Sem código inline (XSS protection)

**Ao publicar:** leia **`docs/SEGURANCA.md`** para entender as chaves do Supabase e como não commitar a chave no repositório (config opcional).

---

## 📈 **Performance**

- ✅ Código JavaScript cacheável
- ✅ Carregamento paralelo de scripts
- ✅ HTMLs 65% menores
- ✅ Queries otimizadas
- ✅ Lazy loading de dados

---

## 🎨 **Design**

- ✅ Interface moderna e responsiva
- ✅ Cores intuitivas por nível de notificação
- ✅ Ícones Font Awesome
- ✅ Animações suaves
- ✅ Mobile-friendly

---

## 📝 **Licença**

Este projeto foi desenvolvido para uso em Escolas Técnicas Estaduais.

---

## 👨‍💻 **Suporte**

Para dúvidas ou suporte, consulte a documentação ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para Escolas Técnicas Estaduais**

**Versão: 2.0 - Refatorado e Otimizado**
