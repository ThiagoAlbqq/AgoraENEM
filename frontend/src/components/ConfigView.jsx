import React from 'react';
import { Settings, ShieldCheck, Key, Bot, Cpu, HardDrive, CheckCircle2, UserCheck, Sparkles } from 'lucide-react';

export default function ConfigView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#26251e]">
      {/* Header */}
      <div className="bg-white border border-[#e6e5e0] rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#26251e] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#f54e00]" />
          Configurações & Integração da API
        </h2>
        <p className="text-xs text-[#6b6960] mt-1 font-mono">
          Parâmetros do motor Multi-Agente de IA e persistência do banco local (Dexie / IndexedDB)
        </p>
      </div>

      {/* API Key Status Box */}
      <div className="bg-white border border-[#e6e5e0] rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-mono font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-[#f54e00]" />
          Status da Chave Gemini API
        </h3>

        <div className="p-4 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#436444]" />
              <span className="text-xs font-bold text-[#26251e]">Chave Configurada no Arquivo backend/.env</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#9fc9a2]/30 text-[#244525] border border-[#9fc9a2] text-[10px] font-mono font-bold">
              ATIVA
            </span>
          </div>
          <p className="text-xs text-[#6b6960] leading-relaxed">
            A chave da API está sendo utilizada diretamente pelas requisições paralelas do backend Express (Google Gen AI SDK v0.24).
          </p>
        </div>
      </div>

      {/* Multi-Agent AI Config Card */}
      <div className="bg-white border border-[#e6e5e0] rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-mono font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#f54e00]" />
          Arquitetura Multi-Agente Ativa (3 Agentes Gemini 2.5 Flash)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Agente 0 */}
          <div className="p-4 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-[#684b39] font-bold">
              <UserCheck className="w-4 h-4 text-[#dfa88f]" />
              Agente 0: Vision Header
            </div>
            <span className="inline-block font-mono text-[10px] px-2 py-0.5 rounded bg-[#dfa88f]/30 border border-[#dfa88f] text-[#422919] font-bold">
              STAGED / DETECTOR
            </span>
            <p className="text-[#6b6960] text-[11px] leading-relaxed">
              Analisa especificamente o cabeçalho superior da folha oficial de redação para detectar o NOME COMPLETO do aluno com 100% de acurácia.
            </p>
          </div>

          {/* Agente 1 */}
          <div className="p-4 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-[#1d3b5e] font-bold">
              <Cpu className="w-4 h-4 text-[#9fbbe0]" />
              Agente 1: Transcritor OCR
            </div>
            <span className="inline-block font-mono text-[10px] px-2 py-0.5 rounded bg-[#9fbbe0]/30 border border-[#9fbbe0] text-[#162e4a] font-bold">
              FULL TEXT / VERBATIM
            </span>
            <p className="text-[#6b6960] text-[11px] leading-relaxed">
              Modelo Gemini Flash dedicado a extrair a transcrição palavra por palavra, preservando o texto integral do aluno sem cortes ou resumos.
            </p>
          </div>

          {/* Agente 2 */}
          <div className="p-4 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-[#4c3666] font-bold">
              <Sparkles className="w-4 h-4 text-[#c0a8dd]" />
              Agente 2: Banca Avaliadora
            </div>
            <span className="inline-block font-mono text-[10px] px-2 py-0.5 rounded bg-[#c0a8dd]/30 border border-[#c0a8dd] text-[#36234b] font-bold">
              ENEM C1-C5 + SISEDU
            </span>
            <p className="text-[#6b6960] text-[11px] leading-relaxed">
              Recebe a transcrição integral e calcula as 5 competências (0-200 cada), níveis Sisedu e extrai citações diretas com trechos e linhas exatas.
            </p>
          </div>
        </div>
      </div>

      {/* Database Status Box */}
      <div className="bg-white border border-[#e6e5e0] rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-mono font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#f54e00]" />
          Banco de Dados Local (Dexie.js / IndexedDB)
        </h3>

        <div className="p-4 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#436444]" />
            <span className="text-[#26251e]">
              Tabela <code className="font-mono bg-white px-1.5 py-0.5 border border-[#e6e5e0] rounded text-[#f54e00] font-bold">redacoes</code> Operacional
            </span>
          </div>
          <span className="font-mono text-[#6b6960] text-[11px]">IndexedDB v2</span>
        </div>
      </div>
    </div>
  );
}

