# CliqueTickets 🎫

Sistema moderno de Gestão de Chamados (Service Desk) com foco em experiência do usuário (UX/UI), gestão visual (Kanban) e métricas em tempo real (SLA).

O sistema foi desenvolvido para ser multi-tenancy (preparado para múltiplas organizações), seguro e altamente customizável.

---

## 🚀 Tecnologias Utilizadas

### Frontend (SPA)
- **React.js (Vite)**: Biblioteca principal para construção da interface.
- **CSS Modules / Global CSS**: Estilização premium com tema escuro (Dark Mode) e suporte a Glassmorphism.
- **Lucide React**: Biblioteca de ícones moderna e leve.
- **React Router**: Navegação entre páginas.

### Backend (API REST)
- **Node.js + Express**: Servidor rápido e escalável.
- **SQLite**: Banco de dados relacional (leve e em arquivo local para facilitar o deploy e desenvolvimento).
- **JWT (JSON Web Tokens)**: Autenticação segura e gestão de sessão.
- **IMAPFlow + Mailparser**: Integração IMAP e parsing de e-mails.
- **OpenRouter (LLM)**: Classificação inteligente para abertura automática de tickets.

---

## ✨ Funcionalidades Principais

### 1. Dashboard Executivo & Operacional
- **Cards de Métricas**: Visualização rápida de Tickets Ativos, Finalizados, e Status de SLA (OK, Risco, Estourado).
- **Visão por Área**: Cards compactos mostrando o volume de tickets por departamento (Financeiro, Suporte, etc.) com indicadores de saúde (SLA).
- **Fila Unificada**: Painel lateral para acesso rápido aos tickets da fila.

### 2. Gestão Visual (Kanban)
- **Drag & Drop**: Movimentação de tickets entre colunas com atualização automática de status.
- **Colunas customizáveis por área**: Renomear, reordenar e criar colunas (admin).
- **SLA Visual**: Badges coloridas indicando o tempo restante ou se o prazo já estourou.
- **Filtros Avançados**: Filtragem por prioridade, responsável e texto.

### 3. Wizard de Abertura de Tickets
- **Passo a Passo (6 Etapas)**: Fluxo guiado para garantir o preenchimento correto.
    1. **Origem**: Canal (Email, Tel, Chat) e Solicitante.
    2. **Cliente**: Identificação do cliente (com flag VIP automática).
    3. **Produto**: Seleção do produto afetado.
    4. **Categoria**: Classificação do problema (Área -> Categoria -> Subcategoria).
    5. **Detalhes**: Título, Descrição, Prioridade, Impacto e **Campos Personalizados**.
    6. **Responsável**: Atribuição automática ou manual.

### 4. Painel Administrativo
- **Gestão de Produtos**: Cadastro de produtos e serviços suportados.
- **Clientes e SLA**: Definição de políticas de SLA (prazos) por prioridade e perfil de cliente (VIP).
- **Campos Personalizados**: Criação de campos dinâmicos (Texto, Número, Data, Lista) vinculados a Áreas específicas.
- **Usuários**: Controle de acesso e permissões.
- **Conexão de E-mail (IMAP)**: Criação automática de tickets por e-mail com IA.

### 5. Log de Atividades e Auditoria
- Histórico completo de alterações em cada ticket (troca de status, novos comentários, anexos).
- Quem fez o que e quando (Rastreabilidade).

### 6. Abertura Automática por E-mail (IMAP + IA)
- Conecte caixas IMAP (Gmail, Outlook, Zoho ou genérico).
- IA classifica categoria, subcategoria, impacto e descrição.
- Evita duplicados por Message-ID.

---

## 🛠️ Instalação e Configuração

### Pré-requisitos
- **Node.js** (v18.17+ recomendado, v20 LTS ideal).
- **Git** instalado.

### Passo a Passo

#### 1. Clonar o Repositório
```bash
git clone https://github.com/rolfmarquardtjr/clickticket.git
cd clickticket
```

#### 2. Configurar o Backend (Servidor)
Abra um terminal na pasta raiz e navegue para a pasta `server`:
```bash
cd server
npm install
```

Crie o arquivo `server/.env`:
```
OPENROUTER_API_KEY=sk-or-v1-XXXXXX
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
EMAIL_POLL_INTERVAL_SEC=60
```

Para rodar o servidor:
```bash
npm start
# O servidor rodará na porta 3001 (http://localhost:3001)
# O banco de dados (database.sqlite) será criado automaticamente na primeira execução.
```

#### 3. Configurar o Frontend (Interface)
Abra **outro terminal** na pasta raiz e navegue para a pasta `frontend`:
```bash
cd frontend
npm install
```

Para rodar a interface:
```bash
npm run dev
# A aplicação abrirá geralmente na porta 5173 (http://localhost:5173)
```

---

## 📂 Estrutura do Projeto

### `/server` (Backend)
- **`index.js`**: Ponto de entrada da API. Configura rotas e middleware.
- **`database.js`**: Configuração do SQLite e scripts de criação de tabelas (Migrations simplificadas).
- **`auth.js`**: Lógica de login e verificação de token JWT.
- **`slaEngine.js`**: Motor de cálculo de prazos e horas úteis.
- **`routes/`**: Controladores de cada entidade (tickets, reports, users, etc.).
- **`services/`**: Ingestão IMAP e classificação via IA.
- **`uploads/`**: Pasta onde os anexos dos tickets são salvos.

### `/frontend` (Frontend)
- **`src/api/`**: Camada de serviço para comunicação com o Backend.
- **`src/components/`**: Componentes reutilizáveis (Wizard, Kanban, Modais, Cards).
- **`src/pages/`**: Páginas principais (Dashboard, Admin, Login).
- **`src/context/`**: Gerenciamento de estado global (Autenticação).
- **`src/index.css`**: Variáveis CSS globais, tokens de design e temas.

---

## 🔐 Segurança e Multi-tenancy

O sistema utiliza um modelo de **Organization ID (`org_id`)**.
- Todo dado (ticket, cliente, produto) pertence a uma Organização.
- O Token JWT do usuário contém o `org_id` dele.
- O Backend filtra **automaticamente** todas as consultas SQL usando esse `org_id`, garantindo que um cliente nunca veja dados de outro.

---

## 📝 Próximos Passos (Backlog)
- [ ] Implementar notificações em tempo real (WebSockets).
- [ ] Integração com WhatsApp.
- [ ] Dashboards customizáveis pelo usuário.
