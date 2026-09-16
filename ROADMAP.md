# 🗺️ ROADMAP.md — Plano de Execução em Sprints

**Projeto:** Plataforma de Avaliação de Redações (ENEM x Sisedu - Projeto Ágora)  
**Repositório:** `ThiagoAlbqq/AgoraENEM`  
**Data:** Setembro / 2026  

---

## 🏃 Sprint 1 — Quick Wins & Estabilização (Concluído)

> **Objetivo:** Resolver gargalos funcionais, bugs de modelo, código morto e experiência do usuário sem alterações estruturais pesadas.

- [x] **Limpeza de Código Morto Frontend:**
  - Excluidos componentes legados: `Dashboard.jsx`, `DashboardRedacoes.jsx`, `ScannerDocumento.jsx`, `UploaderRedacao.jsx`.
- [x] **Agente 0 Mantido Desativado (Economia de Tokens):**
  - Mantido fora da execução principal do `/api/corrigir` para economizar consumo de tokens da API Gemini.
- [x] **Gestão de Cotas Gemini (15 RPM / 500 RPD):**
  - Mantido `gemini-3.5-flash-lite` no topo da lista de fallback para maximizar o limite de requisições por minuto/dia.
- [x] **UX & Toast Feedback:**
  - Adicionado toast de notificação no frontend para resultados do sync.

---

## 📦 Sprint 2 — Otimização de Performance & Deploy Vercel (Concluído)

> **Objetivo:** Garantir escalabilidade do envio em lote e preparar a infraestrutura para produção serverless.

- [x] **Chunking de Lote no Sync Service:**
  - Fracionado array de sincronização em grupos de no máximo 2 redações por requisição HTTP para respeitar o limite de 4.5MB da Vercel.
- [x] **Configuração do Vercel Serverless:**
  - Configurado `maxDuration: 60` no `vercel.json` para evitar timeouts serverless.

---

## 🏗️ Sprint 3 — Arquitetura Enterprise & Testabilidade (Concluído)

> **Objetivo:** Refatorar o backend em camadas sustentáveis e adicionar cobertura de testes automatizados.

- [x] **Modularização do Backend Express:**
  - Separados os módulos em `backend/src/config/`, `backend/src/services/`, `backend/src/controllers/` e `backend/src/routes/`.
- [x] **Implementação de Testes Automatizados (Vitest):**
  - Configurada suíte de testes com Vitest em `backend/src/services/aiService.test.js` com 100% de aprovação.

---

## 🔮 Sprint 4 — Escalabilidade & Novas Funcionalidades (Concluído)

> **Objetivo:** Expandir a plataforma com recursos avançados de relatórios e exportação.

- [x] **Exportação de Relatórios em PDF:**
  - Botão de exportação e impressão em PDF adicionado ao `ModalDetalhesRedacao.jsx`.
- [x] **Painel Comparativo por Turma:**
  - Painel de estatísticas e médias comparativas de desempenho por turma escolar adicionado ao `DashboardView.jsx`.
