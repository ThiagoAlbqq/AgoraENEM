# 🛠️ MELHORIAS.md — Plano Priorizado de Melhorias (Impacto x Esforço)

**Projeto:** Plataforma de Avaliação de Redações (ENEM x Sisedu - Projeto Ágora)  
**Repositório:** `ThiagoAlbqq/AgoraENEM`  
**Data:** Setembro / 2026  

---

## 🎯 Matriz de Priorização (Impacto × Esforço)

```
                       ALTO IMPACTO
                            │
      [M1] Agente 0 Vision 🚀│ [M2] Otimização Payload Sync 📦
      [M4] Modelos Gemini ⚡ │ [M6] Modularização Backend 🏗️
      [M5] Toast & UX Feed  │ [M7] Suíte de Testes Vitest 🧪
 ───────────────────────────┼───────────────────────────
      [M3] Limpeza Codebase │ [M8] Acessibilidade ARIA ♿
      [M9] CI/CD Actions    │
                            │
      BAIXO ESFORÇO         │         ALTO ESFORÇO
                       BAIXO IMPACTO
```

---

## 💡 Detalhamento das Propostas de Melhoria

### 🚀 Quick Wins (Alto Impacto, Baixo Esforço)

#### [M1] Economia de Tokens e Manutenção do Agente 0 Isolado
- **Pilar:** Otimização / Recursos
- **Decisão Arquitetural:** O Agente 0 (`agenteDetectorCabecalho`) é mantido apenas como função utilitária e **desativado no laço principal de correção** para evitar requisições extras e desperdício de tokens com a API Gemini Vision.
- **Impacto:** Menor tempo de resposta por redação e economia substancial na cota de tokens da API Gemini.
- **Esforço:** Nulo (Manter desativado no pipeline).

---

#### [M4] Priorização Estratégica dos Modelos Gemini por Cota de API
- **Pilar:** Otimização / Performance
- **Estratégia:** Priorizar `gemini-3.5-flash-lite` no topo da lista de fallback devido à sua cota de **15 RPM (Requests Per Minute)** e **500 RPD (Requests Per Day)** no dashboard da API, reservando `gemini-3.7-flash`, `gemini-3.5-flash`, `gemini-3.6-flash` e `gemini-3.8-flash` (que possuem limite menor de 5 RPM / 20 RPD) para situações de estouro.
- **Impacto:** Maximiza o volume de correções processadas sem atingir Rate Limit (HTTP 429).
- **Esforço:** Nulo.

---

#### [M3] Remoção de Código Morto e Componentes Legados
- **Pilar:** Qualidade do Software
- **Problema:** Existem componentes legados não importados em `frontend/src/components/` (`Dashboard.jsx`, `DashboardRedacoes.jsx`, `ScannerDocumento.jsx`, `UploaderRedacao.jsx`). `Dashboard.jsx` referencia a tabela obsoleta `db.documentos`.
- **Solução proposta:** Deletar os 4 arquivos obsoletos e manter apenas a arquitetura limpa em `DashboardView.jsx` e `UploaderView.jsx`.
- **Impacto esperado:** Redução no tamanho do projeto, facilidade de manutenção e eliminação de riscos de imports incorretos.
- **Esforço:** Baixo
- **Risco de regressão:** Baixo
- **Como validar:** Rodar `npm run build` e confirmar que o bundle compila limpo sem avisos.

---

#### [M5] Notificações Visuais (Toasts) e Melhoria no Feedback de Correção
- **Pilar:** Usabilidade
- **Problema:** O usuário clica em "Corrigir Redações" no cabeçalho e não recebe nenhuma notificação visual de sucesso ou erro quando a sincronização é concluída.
- **Solução proposta:** Adicionar um componente leve de Toast/Banner no `App.jsx` informando a quantidade de redações corrigidas com sucesso e eventuais falhas.
- **Impacto esperado:** Maior clareza e controle por parte do usuário.
- **Esforço:** Baixo
- **Risco de regressão:** Baixo
- **Como validar:** Sincronizar redações e verificar a exibição da notificação de sucesso.

---

### 📦 Melhorias de Médio Prazo (Alto Impacto, Médio Esforço)

#### [M2] Otimização de Payload no Sync e Compatibilidade com Vercel
- **Pilar:** Otimização / Qualidade
- **Problema:** O envio de múltiplas imagens em Base64 em um único payload JSON estoura o limite de 4.5MB da Vercel Serverless.
- **Solução proposta:**
  1. Implementar lote sequencial/chunking no `syncService.js` enviando no máximo 2 redações por requisição HTTP.
  2. Não retornar a imagem Base64 enviada de volta na resposta do backend.
- **Impacto esperado:** Garantia de funcionamento do deploy na Vercel sem erros de limite de payload (HTTP 413).
- **Esforço:** Médio
- **Risco de regressão:** Baixo
- **Como validar:** Simular sincronização de lote com 5+ imagens e checar o tamanho da requisição.

---

#### [M6] Reestruturação Arquitetural do Backend
- **Pilar:** Qualidade do Software
- **Problema:** Monolito `server.js` contendo lógica de servidor, prompt engineering, parsers de JSON e fallbacks.
- **Solução proposta:** Dividir o backend na seguinte estrutura:
  - `backend/src/config/` (Gemini SDK client e env vars)
  - `backend/src/services/` (Agente 0, Agente 1, Agente 2 e JSON Parser)
  - `backend/src/controllers/` (Handler da rota `/api/corrigir`)
  - `backend/src/routes/` (Express Routers)
- **Impacto esperado:** Manutenibilidade de nível enterprise, testabilidade isolada de cada agente e código limpo.
- **Esforço:** Médio
- **Risco de regressão:** Baixo
- **Como validar:** Rodar testes e verificar o startup do servidor.

---

#### [M7] Introdução de Suíte de Testes com Vitest
- **Pilar:** Qualidade do Software
- **Problema:** Ausência total de testes unitários ou de integração.
- **Solução proposta:** Configurar **Vitest** no frontend e backend para testar:
  - Sanitização e parsing do JSON do Gemini (`cleanAndParseJSON`).
  - Operações CRUD no Dexie.js (`saveRedacaoOffline`, `updateNomeAluno`).
- **Impacto esperado:** Prevenção de regressões em atualizações futuras.
- **Esforço:** Médio
- **Risco de regressão:** Baixo
- **Como validar:** Executar `npm test`.
