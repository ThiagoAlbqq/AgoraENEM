# 📊 ANALISE.md — Mapeamento Técnico e Diagnóstico do Projeto Ágora ENEM

**Projeto:** Plataforma de Avaliação de Redações (ENEM x Sisedu - Projeto Ágora)  
**Repositório:** `ThiagoAlbqq/AgoraENEM`  
**Data da Análise:** Setembro / 2026  
**Responsável:** Engenheiro de Software Sênior Full-Stack  

---

## 📋 1. Mapeamento Técnico do Projeto (Etapa 1)

### 1.1 Backend (`/backend`)
- **Linguagem & Runtime:** Node.js (ES Modules - `"type": "module"`).
- **Framework Web:** Express v4.19.2.
- **Dependências Chave:**
  - `@google/generative-ai` v0.24.1 (SDK oficial para Gemini 1.5 / 2.0 / Flash).
  - `cors` v2.8.5 (CORS habilitado para comunicação com frontend Vite).
  - `dotenv` v16.4.5 (Gestão de variáveis de ambiente).
  - `nodemon` v3.1.0 (Dev server).
- **Arquitetura de Código:**
  - Arquivo único monolítico: `backend/server.js` (505 linhas).
  - Ausência de divisão em camadas (`controllers`, `services`, `routes`, `middlewares`).
- **Arquitetura de Inteligência Artificial (Agente Único Unificado):**
  - **Agente Único Multimodal (`agenteAvaliadorUnificado`):** Executa a leitura visual da foto, a transcrição OCR 100% integral para `texto_transcrito`, a identificação de aluno/turma e a avaliação cruzada (ENEM C1-C5 + Sisedu) em **1 única chamada à API do Gemini**.
    - *Economia:* Reduz o consumo de requisições pela metade (1 chamada por foto), dobrando a vazão máxima no limite de 15 RPM.
- **Hospedagem & Deploy:** Configurado para Vercel Serverless Functions via `vercel.json` (`@vercel/node` no endpoint `/api/(.*)`).

---

### 1.2 Frontend (`/frontend`)
- **Framework & Ferramentas:** React v19.2.7 com Vite v8.1.1.
- **Linter:** Oxlint v1.71.0.
- **Gerenciamento de Estado & Persistência Local:**
  - IndexedDB encapsulado via **Dexie.js** v4.4.4.
  - Tabela principal: `redacoes` (armazena imagens base64, texto digitado, metadados do aluno, notas e status `is_synced`).
  - Estado global gerenciado via State Lifting no componente raiz `App.jsx`.
- **Estilização & Design System:**
  - TailwindCSS v4.3.3 (`@tailwindcss/vite`).
  - Lucide React Icons v1.25.0.
  - Design visual inspirado na paleta editorial do Cursor (Off-white `#f7f7f4`, Dark `#26251e`, Cursor Orange `#f54e00`, Pêssego `#dfa88f`, Menta `#9fc9a2`, Azul Pastel `#9fbbe0`).
- **Navegação & Componentes Ativos:**
  - `App.jsx` (Roteamento simples por estado `activeView`).
  - `Sidebar.jsx` (Navegação lateral retrátil com badges de status).
  - `Header.jsx` (Status de rede Online/Offline, busca global e trigger de sincronização).
  - `DashboardView.jsx` (Painel com KPIs, gráfico de médias por competência ENEM C1-C5 e lista recente).
  - `UploaderView.jsx` (Envio offline em lote de imagens manuscritas ou digitação em texto).
  - `RedacoesTableView.jsx` (Repositório de dados com filtros por status, nome e faixa de nota).
  - `ModalDetalhesRedacao.jsx` (Relatório pedagógico detalhado com barras de progresso, badges Sisedu, citações do aluno e visualização do texto transcrito em JetBrains Mono).
  - `ConfigView.jsx` (Painel informativo sobre chave Gemini API, agentes ativos e banco local).

---

## 🔍 2. Diagnóstico Técnico de Problemas (Etapa 2)

| Área | Severidade | Evidência (Arquivo & Linha) | Impacto no Sistema |
|---|---|---|---|
| **Otimização / Arquitetura** | **Info** | `backend/server.js` (L. 216-258) | **Agente 0 Desativado Intencionalmente:** A função `agenteDetectorCabecalho` foi mantida no arquivo como utilitário, porém desligada do pipeline principal para evitar consumo excessivo e duplicado de tokens com a API de visão do Gemini. |
| **Otimização / Deploy** | **Alta** | `frontend/src/services/syncService.js` (L. 23) e `backend/server.js` (L. 15) | **Payload Inflado / Limite da Vercel:** O serviço de sync envia todas as redações pendentes em uma única requisição com imagens Base64 (podendo atingir 30MB+). A Vercel limita o body de Serverless Functions a **4.5MB**, causando erro HTTP 413 Payload Too Large no deploy. |
| **Qualidade / Arquitetura** | **Média** | `frontend/src/components/` (`Dashboard.jsx`, `DashboardRedacoes.jsx`, `ScannerDocumento.jsx`, `UploaderRedacao.jsx`) | **Código Morto & Tabela Inexistente:** Componentes legados não utilizados no app. `Dashboard.jsx` tenta consultar `db.documentos`, que não existe no Dexie schema, gerando risco de crash se importado inadvertidamente. |
| **Otimização / Resiliência** | **Info** | `backend/server.js` (L. 175-182) | **Priorização por Cota da API (15 RPM / 500 RPD):** O modelo `gemini-3.5-flash-lite` é priorizado no topo da lista de fallback devido à sua cota superior (15 RPM / 500 RPD vs 5 RPM / 20 RPD dos demais modelos). |
| **Usabilidade / UX** | **Média** | `frontend/src/components/Header.jsx` (L. 42-60) & `RedacoesTableView.jsx` (L. 120-124) | **Ausência de Feedback e Tooltips:** Ao concluir a correção, o usuário não recebe toast de notificação de sucesso/erro. Linhas de redações pendentes na tabela não são clicáveis nem indicam que precisam ser sincronizadas primeiro. |
| **Qualidade / Manutenibilidade**| **Média** | `backend/server.js` (505 linhas em arquivo único) | **Falta de Modularização do Backend:** Ausência de separação das responsabilidades de parsing, fallback de modelos e prompts de IA. Dificulta manutenção e testes unitários. |
| **Qualidade / Testes** | **Baixa** | `package.json` em `/backend` e `/frontend` | **Ausência Total de Suíte de Testes:** Não existem testes unitários ou de integração para o parsing de JSON do Gemini, nem para a persistência do Dexie.js. |
