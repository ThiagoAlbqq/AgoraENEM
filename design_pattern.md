# Design Pattern & Architecture Guidelines
## Project: ApodiSync - Sistema de Digitalização e Automação Offline-First

### 1. Visão Geral da Arquitetura
O sistema resolve o problema de zonas de sombra (sem internet) na indústria cimenteira utilizando uma arquitetura Híbrida:
- **Frontend (PWA Offline-First):** Responsável pela coleta de dados em campo, captura de imagens de documentos/medidores e preenchimento de formulários.
- **Backend (API Rest + LLM):** Responsável por receber a sincronização, processar as imagens através de uma LLM de Visão (ex: Gemini 1.5 Flash ou GPT-4o-mini) e estruturar os dados em JSON para os sistemas da empresa.

### 2. Stack Tecnológica Sugerida
- **Frontend:** React + Vite + TailwindCSS.
- **Armazenamento Local:** Dexie.js (Wrapper robusto para IndexedDB).
- **PWA:** vite-plugin-pwa (gerenciamento de Service Workers).
- **Backend:** Node.js (Express) ou Java (Spring Boot) - focado apenas em receber o payload e fazer a ponte com a API da LLM.

### 3. UX/UI Industrial (Design System)
- **Acessibilidade Operacional (EPIs):** Inputs e Botões com mínimo de 48x48px (Touch Targets grandes) para facilitar o toque de operadores usando luvas de proteção.
- **Alto Contraste e Clareza:** Paleta de cores industriais (Cinza Chumbo para fundo, Laranja/Amarelo para alertas, Verde para status online/sincronizado). Tipografia grande e legível sob a luz do sol (modo claro padrão).
- **Feedback Visual (Micro-interações):** Como as ações são locais, o usuário precisa de confirmação imediata. Animações sutis (toast notifications ou checkmarks animados) ao salvar offline e ao sincronizar.

### 4. Fluxos de Negócio e Sincronização
1. **Captura:** O PWA deve invocar a câmera nativa de forma responsiva (`<input type="file" accept="image/*" capture="environment">`).
2. **Armazenamento:** A imagem é lida como Base64 (ou Blob) e armazenada no Dexie.js junto com um ID, timestamp e o status `is_synced: false`.
3. **Observabilidade de Rede:** Implementar listeners (`window.addEventListener('online' / 'offline')`) para atualizar a UI em tempo real, informando ao operador se ele está conectado.
4. **Sincronização:** Quando a rede volta, o operador (ou um script automático) dispara a sincronização. Os dados não sincronizados são enviados via POST ao Backend, recebem a confirmação e são marcados como `is_synced: true` no Dexie.js.

### 5. Padrões de Código (Clean Code)
- **Modularização Frontend:**
  - `/components`: UI reutilizável (Botões, Cards, StatusBadge).
  - `/hooks`: Custom hooks estratégicos (`useNetworkStatus`, `useOfflineDB`).
  - `/services`: Lógica de acesso ao IndexedDB e chamadas HTTP.
- **Resiliência:** Falhas na chamada da API (ex: internet caindo durante o upload) devem ser tratadas graciosamente. O dado volta para a fila de "pendentes" sem quebrar a tela do usuário.
- **Segurança Backend:** O servidor backend descarta a imagem logo após a extração pela LLM (Zero Data Retention) e apenas tramita o JSON estruturado.
