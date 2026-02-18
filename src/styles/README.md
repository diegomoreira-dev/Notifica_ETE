# Organização dos Arquivos CSS

## Estrutura de Estilos

O projeto está organizado em arquivos CSS modulares para facilitar manutenção e reutilização:

### 📁 Arquivos Base

#### `main.css`
- Reset e configurações globais
- Variáveis CSS (cores, sombras, bordas)
- Layout principal (container, header, footer)
- Estilos de navegação
- Cards, botões e badges básicos
- Modais e alertas
- Tabelas padrão

#### `dashboard.css`
- Estilos específicos do dashboard
- Grid de estatísticas
- Cards de ação rápida
- Notificações recentes
- Animações do dashboard

#### `painel.css`
- Estilos específicos do painel
- Cards de notificações por nível
- Grid de níveis (Leve, Média, Grave)
- Seção de alertas

#### `components.css` ⭐ NOVO
- Componentes reutilizáveis
- Classes utilitárias modernas
- Layout helpers (flex, grid)
- Espaçamento (margin, padding)
- Componentes de UI específicos do projeto

### 📁 Arquivos Especializados

#### `forms.css`
- Estilos de formulários
- Inputs, selects, textareas
- Validação e feedback
- Progress bars

#### `utilities.css`
- Classes utilitárias gerais
- Helpers de layout
- Espaçamento
- Tipografia

#### `login.css`
- Estilos específicos da página de login
- Background e overlay
- Card de login

#### `portal-responsavel.css`
- Estilos do portal do responsável
- Timeline de notificações
- Cards de consulta

#### `index.css`
- Estilos da página inicial
- Hero section
- Features grid

---

## 🎨 Classes Utilitárias Principais

### Layout

```css
.flex-gap           /* display: flex com gap de 1rem */
.flex-gap-sm        /* display: flex com gap pequeno (0.25rem) */
.flex-end           /* justify-content: flex-end */
.flex-between       /* justify-content: space-between */
.flex-1             /* flex: 1 */
.grid-2             /* Grid de 2 colunas */
.grid-auto          /* Grid auto-fit responsivo */
.grid-responsive    /* Grid responsivo com minmax */
```

### Espaçamento

```css
.mb-1, .mb-1-5, .mb-2     /* Margin bottom */
.mt-1, .mt-1-5, .mt-2     /* Margin top */
.ml-0-5                    /* Margin left */
.p-1, .p-1-5, .p-2        /* Padding */
```

### Componentes

```css
.alert-horizontal          /* Alert com layout flex */
.empty-state              /* Estado vazio com ícone */
.loading-container        /* Container de loading */
.notification-item        /* Item de notificação */
.notification-header      /* Header da notificação */
.notification-badges      /* Badges da notificação */
.info-row                 /* Linha de informação */
.stat-box                 /* Box de estatística */
.template-section         /* Seção de template */
.password-field           /* Campo de senha com toggle */
```

### Tamanhos

```css
.min-w-120, .min-w-150, .min-w-200  /* Min width */
.max-w-600, .max-w-700, .max-w-900  /* Max width */
.w-100-mb-1                         /* Width 100% + margin */
```

### Tipografia

```css
.text-muted           /* Cor cinza suave */
.text-dark            /* Cor escura */
.text-primary         /* Cor primária do projeto */
.text-success         /* Cor de sucesso */
.small-text           /* Texto pequeno */
.fw-500, .fw-600      /* Font weight */
.fs-0-9, .fs-1-1      /* Font size */
```

### Utilitários

```css
.bg-light             /* Background claro */
.rounded-8, .rounded-12  /* Border radius */
.overflow-wrapper     /* Overflow-x: auto */
.form-input-readonly  /* Input readonly estilizado */
.helper-text          /* Texto de ajuda */
.font-mono            /* Font monospace */
```

---

## 🔧 Modais

Classes de tamanho de modal:

```css
.modal-small .modal-content { max-width: 600px }
.modal-medium .modal-content { max-width: 700px }
.modal-wide .modal-content { max-width: 900px }
```

Uso:
```html
<div class="modal modal-wide">
    <div class="modal-content">
        <!-- conteúdo -->
    </div>
</div>
```

---

## 📊 Stat Boxes

Classes para boxes de estatísticas com cores específicas:

```css
.stat-box             /* Box padrão */
.stat-box.stat-leve   /* Box amarelo (notificações leves) */
.stat-box.stat-media  /* Box laranja (notificações médias) */
.stat-box.stat-grave  /* Box vermelho (notificações graves) */
```

---

## 🎯 Boas Práticas

1. **Evite estilos inline** - Use classes CSS sempre que possível
2. **Reutilize componentes** - Verifique `components.css` antes de criar novos estilos
3. **Mantenha a consistência** - Use as variáveis CSS definidas em `main.css`
4. **Organize por funcionalidade** - Cada arquivo tem um propósito específico
5. **Use classes semânticas** - Nomes descritivos facilitam manutenção

---

## 📝 Ordem de Importação Recomendada

```html
<link rel="stylesheet" href="../src/styles/main.css">
<link rel="stylesheet" href="../src/styles/dashboard.css">
<link rel="stylesheet" href="../src/styles/utilities.css">
<link rel="stylesheet" href="../src/styles/forms.css">
<link rel="stylesheet" href="../src/styles/components.css">
```

---

## 🚀 Próximos Passos de Melhoria

- [ ] Migrar para CSS Variables para todos os valores
- [ ] Implementar tema escuro
- [ ] Adicionar mais variantes de espaçamento
- [ ] Criar mais componentes reutilizáveis
- [ ] Documentar padrões de nomenclatura

---

Última atualização: 2026-02-06
