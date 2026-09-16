import React, { useState } from 'react';
import { X, Award, UserCheck, UserX, Image as ImageIcon, Save, Sparkles, BookOpen, Quote, ShieldCheck, Compass, Copy, Check, Printer, FileText } from 'lucide-react';
import { updateNomeAluno } from '../db/db';

export default function ModalDetalhesRedacao({ redacao, onClose, onUpdated }) {
  const [manualName, setManualName] = useState(redacao?.nome_aluno || '');
  const [manualTurma, setManualTurma] = useState(redacao?.turma_aluno || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [activeTab, setActiveTab] = useState('ficha'); // 'ficha' | 'enem' | 'sisedu' | 'texto'
  const [copiedText, setCopiedText] = useState(false);

  if (!redacao) return null;

  const data = redacao.extracted_data || {};
  const avaliacoes = data.avaliacoes || {};
  const enem = avaliacoes.enem || {};
  const sisedu = avaliacoes.sisedu_agora || {};
  const isIdentified = redacao.nome_detectado && redacao.nome_aluno;

  const fullTextContent = redacao.texto_digitado || data.texto_transcrito || 'Transcrição indisponível.';

  const handleCopyText = () => {
    navigator.clipboard.writeText(fullTextContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setIsSavingName(true);
    try {
      await updateNomeAluno(redacao.id, manualName.trim(), manualTurma.trim() || null);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingName(false);
    }
  };

  const getNivelBadgeClass = (nivel) => {
    if (nivel === 'Avançado') return 'bg-[#9fc9a2] text-[#26251e] border-[#9fc9a2]';
    if (nivel === 'Em Desenvolvimento') return 'bg-[#c0a8dd] text-[#26251e] border-[#c0a8dd]';
    return 'bg-[#dfa88f] text-[#26251e] border-[#dfa88f]';
  };

  const enemCompetenciasMap = [
    { key: 'competencia_1', title: 'Competência 1 - Norma Culta', desc: 'Domínio da modalidade escrita formal da língua portuguesa', color: '#dfa88f' },
    { key: 'competencia_2', title: 'Competência 2 - Tema e Repertório', desc: 'Compreensão do tema e aplicação das áreas do conhecimento', color: '#9fc9a2' },
    { key: 'competencia_3', title: 'Competência 3 - Argumentação', desc: 'Projeto de texto, organização e interpretação de fatos e opiniões', color: '#9fbbe0' },
    { key: 'competencia_4', title: 'Competência 4 - Coesão e Coerência', desc: 'Conhecimento dos mecanismos linguísticos para a argumentação', color: '#c0a8dd' },
    { key: 'competencia_5', title: 'Competência 5 - Proposta de Intervenção', desc: 'Elaboração de proposta respeitando os Direitos Humanos', color: '#c08532' }
  ];

  const siseduDiscursivaMap = [
    { key: 'clareza_tese', title: 'Clareza da Tese', desc: 'Opinião implícita (Inicial) -> Tese clara (Em Desenv.) -> Tese crítica (Avançado)' },
    { key: 'argumentacao', title: 'Argumentação', desc: 'Exemplos superficiais (Inicial) -> Organizados (Em Desenv.) -> Críticos/Interdisciplinares (Avançado)' },
    { key: 'repertorio', title: 'Repertório', desc: 'Cotidiano imediato (Inicial) -> Cultural básico (Em Desenv.) -> Filosófico/Científico (Avançado)' }
  ];

  const siseduEticoMoralMap = [
    { key: 'empatia_alteridade', title: 'Empatia e Alteridade', desc: 'Reconhece o outro superficialmente -> Considera múltiplas perspectivas -> Consciência ética complexa' },
    { key: 'justificacao_moral', title: 'Justificação Moral', desc: 'Opiniões intuitivas -> Justificativas racionais -> Fundamentadas em princípios' },
    { key: 'conclusao_critica', title: 'Conclusão Crítica / Propostas', desc: 'Ausentes (Inicial) -> Genéricas (Em Desenv.) -> Propostas concretas e viáveis (Avançado)' }
  ];

  const printDateStr = new Date().toLocaleDateString('pt-BR');
  const printTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Formal Institutional Sheet Render Component (PRISMA Document Design)
  const renderOfficialSheetContent = () => (
    <div className="space-y-6 text-[#26251e] bg-[#ffffff] p-6 rounded-xl border border-[#e6e5e0]">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-[#26251e] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">ÁGORA ENEM</h1>
            <div className="w-3 h-3 rounded-full bg-[#f54e00]" />
          </div>
          <p className="text-[10px] font-mono uppercase text-[#807d72] mt-1 tracking-wider">
            GOVERNO DO ESTADO • SECRETARIA DA EDUCAÇÃO | SISTEMA PREDITIVO DE AVALIAÇÃO TEXTUAL (ENEM x SISEDU)
          </p>
        </div>

        <div className="border border-[#e6e5e0] bg-[#fafaf7] p-3 rounded-lg text-left sm:text-right font-mono text-[10px] w-full sm:w-auto shrink-0">
          <div className="font-bold text-[#26251e] uppercase">DOCUMENTO OFICIAL PDF</div>
          <div className="text-[#807d72]">Emissão: {printDateStr}, {printTimeStr}</div>
          <div className="text-[#807d72]">Registro ID: #{String(redacao.id).padStart(6, '0')}</div>
        </div>
      </div>

      {/* Pill Badges Bar */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="bg-[#26251e] text-white px-3 py-1 rounded-md font-bold">
          ID: #{String(redacao.id).padStart(4, '0')}
        </span>
        <span className="bg-[#fafaf7] border border-[#e6e5e0] px-3 py-1 rounded-md font-bold">
          ALUNO: {data.aluno || redacao.nome_aluno || 'ESTUDANTE NÃO IDENTIFICADO'}
        </span>
        <span className="bg-[#fafaf7] border border-[#e6e5e0] px-3 py-1 rounded-md font-bold">
          TURMA: {data.turma || redacao.turma_aluno || 'SEM TURMA DEFINIDA'}
        </span>
        <span className="bg-[#9fc9a2] text-[#26251e] px-3 py-1 rounded-md font-bold">
          AVALIAÇÃO VALIDADA
        </span>
      </div>

      {/* Sheet Title */}
      <div className="border-l-4 border-[#f54e00] pl-3 py-1">
        <h2 className="text-lg font-bold text-[#26251e] tracking-tight uppercase">
          FICHA DE DIAGNÓSTICO E DESEMPENHO TEXTUAL DO ESTUDANTE
        </h2>
        <p className="text-xs text-[#807d72]">
          Análise pedagógica quantitativa (Matriz ENEM 0-1000) e qualitativa (Rubricas Sisedu Projeto Ágora)
        </p>
      </div>

      {/* 4 Metric KPI Summary Cards (IDEB PRISMA Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-xl">
          <div className="text-[10px] font-bold text-[#807d72] uppercase tracking-wider">NOTA TOTAL ENEM</div>
          <div className="text-3xl font-bold font-mono text-[#f54e00] mt-1">
            {enem.nota_total_enem !== undefined ? enem.nota_total_enem : '—'}
          </div>
          <div className="text-[10px] font-mono text-[#807d72] mt-0.5">Escala Oficial 0-1000</div>
        </div>

        <div className="bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-xl">
          <div className="text-[10px] font-bold text-[#807d72] uppercase tracking-wider">DIMENSÃO DISCURSIVA</div>
          <div className="text-base font-bold font-mono text-[#26251e] mt-1.5 truncate">
            {sisedu.dimensao_discursiva?.argumentacao?.nivel || 'Em Desenv.'}
          </div>
          <div className="text-[10px] font-mono text-[#807d72] mt-0.5">Argumentação Sisedu</div>
        </div>

        <div className="bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-xl">
          <div className="text-[10px] font-bold text-[#807d72] uppercase tracking-wider">DIMENSÃO ÉTICO-MORAL</div>
          <div className="text-base font-bold font-mono text-[#26251e] mt-1.5 truncate">
            {sisedu.dimensao_etico_moral?.conclusao_critica?.nivel || 'Avançado'}
          </div>
          <div className="text-[10px] font-mono text-[#807d72] mt-0.5">Direitos Humanos</div>
        </div>

        <div className="bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-xl">
          <div className="text-[10px] font-bold text-[#807d72] uppercase tracking-wider">REGISTRO DE CAPTURA</div>
          <div className="text-sm font-bold font-mono text-[#26251e] mt-2">
            {new Date(redacao.data_captura).toLocaleDateString('pt-BR')}
          </div>
          <div className="text-[10px] font-mono text-[#807d72] mt-0.5">Data de Lançamento</div>
        </div>
      </div>

      {/* SECTION 1: DADOS CADASTRAIS */}
      <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e6e5e0] pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#f54e00]" />
          DADOS CADASTRAIS & ESTRUTURA DE AVALIAÇÃO
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-xs font-mono">
          <div><span className="text-[#807d72]">Nome do Aluno:</span> <strong className="text-[#26251e]">{data.aluno || redacao.nome_aluno || 'Não cadastrado'}</strong></div>
          <div><span className="text-[#807d72]">Turma / Classe:</span> <strong className="text-[#26251e]">{data.turma || redacao.turma_aluno || 'Não informada'}</strong></div>
          <div><span className="text-[#807d72]">Formato de Origem:</span> <strong className="text-[#26251e]">{redacao.imagem_base64 ? 'Foto Manuscrita (Verbatim OCR)' : 'Texto Digitado'}</strong></div>
          <div><span className="text-[#807d72]">Motor de IA Responsável:</span> <strong className="text-[#26251e]">Agente Único Multimodal Gemini 3.5 Flash Lite</strong></div>
        </div>
      </div>

      {/* SECTION 2: QUADRO DE COMPETÊNCIAS ENEM */}
      <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e6e5e0] pb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#f54e00]" />
          QUADRO DETALHADO DE COMPETÊNCIAS DO ENEM (C1 A C5)
        </h3>

        <div className="space-y-4">
          {enemCompetenciasMap.map(({ key, title, desc, color }) => {
            const comp = enem[key] || { nota: 0, citacao_texto: 'Elemento ausente no texto', justificativa: 'Não avaliado' };
            const percent = Math.min(100, Math.max(0, (comp.nota / 200) * 100));

            return (
              <div key={key} className="bg-[#ffffff] border border-[#e6e5e0] p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-[#26251e] text-sm">{title}</strong>
                    <span className="text-[#807d72] text-[11px] block">{desc}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-base text-[#26251e]">{comp.nota}</span>
                    <span className="text-xs text-[#807d72]"> / 200</span>
                  </div>
                </div>

                <div className="w-full bg-[#e6e5e0] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                  />
                </div>

                {comp.citacao_texto && (
                  <div className="bg-[#fafaf7] border-l-3 border-[#26251e] p-2.5 rounded-r text-xs font-mono italic text-[#26251e]">
                    <span className="text-[10px] font-sans uppercase font-bold text-[#807d72] block not-italic mb-0.5">Trecho Citado Obrigatório:</span>
                    "{comp.citacao_texto}"
                  </div>
                )}

                <p className="text-xs text-[#5a5852] leading-relaxed bg-[#fafaf7] p-2.5 rounded border border-[#e6e5e0]">
                  <strong className="text-[#26251e]">Justificativa Pedagógica:</strong> {comp.justificativa}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: RUBRICAS SISEDU */}
      <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e6e5e0] pb-2 flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#807d72]" />
          RUBRICAS QUALITATIVAS SISEDU (PROJETO ÁGORA ESCOLAR)
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-[#807d72] uppercase mb-2">Dimensão Discursiva</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {siseduDiscursivaMap.map(({ key, title, desc }) => {
                const item = sisedu.dimensao_discursiva?.[key] || { nivel: 'Inicial', citacao_texto: 'Ausente', justificativa: 'Não avaliado' };
                return (
                  <div key={key} className="bg-[#ffffff] border border-[#e6e5e0] p-3.5 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#26251e]">{title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getNivelBadgeClass(item.nivel)}`}>
                        {item.nivel}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#807d72]">{desc}</p>
                    {item.citacao_texto && (
                      <div className="bg-[#fafaf7] border-l-2 border-[#26251e] p-2 text-[11px] font-mono italic text-[#26251e]">
                        "{item.citacao_texto}"
                      </div>
                    )}
                    <p className="text-[11px] text-[#5a5852] leading-tight">{item.justificativa}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#807d72] uppercase mb-2">Dimensão Ético-Moral</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {siseduEticoMoralMap.map(({ key, title, desc }) => {
                const item = sisedu.dimensao_etico_moral?.[key] || { nivel: 'Inicial', citacao_texto: 'Ausente', justificativa: 'Não avaliado' };
                return (
                  <div key={key} className="bg-[#ffffff] border border-[#e6e5e0] p-3.5 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#26251e]">{title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getNivelBadgeClass(item.nivel)}`}>
                        {item.nivel}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#807d72]">{desc}</p>
                    {item.citacao_texto && (
                      <div className="bg-[#fafaf7] border-l-2 border-[#26251e] p-2 text-[11px] font-mono italic text-[#26251e]">
                        "{item.citacao_texto}"
                      </div>
                    )}
                    <p className="text-[11px] text-[#5a5852] leading-tight">{item.justificativa}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: FULL TEXT TRANSCRIPTION */}
      <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e6e5e0] pb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#26251e]" />
          TRANSCRIÇÃO INTEGRAL DA REDAÇÃO DO ALUNO (VERBATIM OCR)
        </h3>
        <div className="p-4 bg-[#ffffff] border border-[#e6e5e0] rounded-md font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#26251e]">
          {fullTextContent}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#e6e5e0] pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-[#807d72] gap-2">
        <div>ÁGORA ENEM — Sistema de Avaliação de Redações • SEDUC / Projeto Ágora Escolar</div>
        <div>Documento PDF Oficial gerado com fontes Inter & JetBrains Mono</div>
      </div>
    </div>
  );

  return (
    <>
      {/* SCREEN MODAL VIEW */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn no-print">
        <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#26251e]">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-[#e6e5e0] bg-[#fafaf7] flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {isIdentified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6e5e0] text-[#26251e]">
                    <UserCheck className="w-3.5 h-3.5 text-[#1f8a65]" />
                    {data.aluno || redacao.nome_aluno}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#dfa88f] text-[#26251e]">
                    <UserX className="w-3.5 h-3.5" />
                    Sem Nome (Guardada em Pendentes)
                  </span>
                )}

                {(data.turma || redacao.turma_aluno) && (
                  <span className="text-xs font-mono text-[#5a5852] bg-[#e6e5e0] px-2.5 py-0.5 rounded-full">
                    {data.turma || redacao.turma_aluno}
                  </span>
                )}

                <span className="text-xs font-mono text-[#807d72] bg-[#ffffff] px-2 py-0.5 rounded border border-[#e6e5e0]">
                  ID #{String(redacao.id).padStart(4, '0')}
                </span>
              </div>

              <h3 className="text-xl font-normal text-[#26251e] tracking-tight mt-1">
                Relatório de Avaliação Cruzada (ENEM x Sisedu Projeto Ágora)
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {enem.nota_total_enem !== undefined && (
                <div className="px-4 py-2 rounded-lg border border-[#e6e5e0] bg-[#ffffff] text-center font-mono">
                  <div className="text-[10px] uppercase font-semibold text-[#807d72]">Nota ENEM</div>
                  <div className="text-2xl font-bold text-[#f54e00]">{enem.nota_total_enem} <span className="text-xs font-normal text-[#807d72]">/ 1000</span></div>
                </div>
              )}

              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-md bg-[#26251e] hover:bg-[#000000] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Baixar ou Imprimir Boletim em PDF"
              >
                <Printer className="w-4 h-4" />
                <span>PDF / Imprimir</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-md bg-[#fafaf7] hover:bg-[#e6e5e0] text-[#807d72] hover:text-[#26251e] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Unidentified Name Banner */}
          {!isIdentified && (
            <div className="bg-[#fafaf7] border-b border-[#e6e5e0] p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#26251e] text-xs">
                <UserX className="w-4 h-4 text-[#c08532] shrink-0" />
                <span>
                  <strong>Aluno/Turma não identificados automaticamente:</strong> Atribua os dados para vincular ao repositório:
                </span>
              </div>
              <form onSubmit={handleSaveName} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Nome do aluno..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="bg-[#ffffff] border border-[#e6e5e0] rounded-md px-3 py-1.5 text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] w-full sm:w-48"
                />
                <input
                  type="text"
                  placeholder="Turma (ex: 3º Ano A)..."
                  value={manualTurma}
                  onChange={(e) => setManualTurma(e.target.value)}
                  className="bg-[#ffffff] border border-[#e6e5e0] rounded-md px-3 py-1.5 text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] w-full sm:w-36"
                />
                <button
                  type="submit"
                  disabled={isSavingName || !manualName.trim()}
                  className="px-3 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-medium text-xs rounded-md transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </button>
              </form>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-[#e6e5e0] bg-[#fafaf7] flex gap-4 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('ficha')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'ficha'
                  ? 'border-[#f54e00] text-[#f54e00]'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <FileText className="w-4 h-4" />
              📄 Ficha Oficial (PDF)
            </button>

            <button
              onClick={() => setActiveTab('enem')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'enem'
                  ? 'border-[#f54e00] text-[#f54e00]'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <Award className="w-4 h-4" />
              Matriz ENEM (C1 a C5)
            </button>
            
            <button
              onClick={() => setActiveTab('sisedu')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'sisedu'
                  ? 'border-[#f54e00] text-[#f54e00]'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <Compass className="w-4 h-4" />
              Sisedu (Projeto Ágora Escolar)
            </button>

            <button
              onClick={() => setActiveTab('texto')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'texto'
                  ? 'border-[#f54e00] text-[#f54e00]'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Texto Integral Transcrito
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            {/* TAB 0: OFFICIAL FORMAL PDF PREVIEW */}
            {activeTab === 'ficha' && renderOfficialSheetContent()}

            {/* TAB 1: ENEM MATRIX */}
            {activeTab === 'enem' && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-[#807d72] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#f54e00]" />
                  Avaliação Oficial ENEM (0 a 200 pontos por Competência)
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {enemCompetenciasMap.map(({ key, title, desc, color }) => {
                    const comp = enem[key] || { nota: 0, citacao_texto: 'Elemento ausente no texto', justificativa: 'Não avaliado' };
                    const percent = Math.min(100, Math.max(0, (comp.nota / 200) * 100));

                    return (
                      <div key={key} className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm text-[#26251e]">{title}</div>
                            <div className="text-[11px] text-[#807d72]">{desc}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-xl text-[#26251e]">{comp.nota}</span>
                            <span className="text-xs text-[#807d72] font-mono"> / 200</span>
                          </div>
                        </div>

                        <div className="w-full bg-[#e6e5e0] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: color }}
                          />
                        </div>

                        {comp.citacao_texto && (
                          <div className="bg-[#ffffff] border-l-2 border-[#26251e] p-3 rounded-r-md text-xs text-[#26251e] flex items-start gap-2 font-mono">
                            <Quote className="w-3.5 h-3.5 text-[#807d72] shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[#807d72] block mb-0.5 font-sans">Citação Direta Obrigatória do Texto:</span>
                              <span className="italic">"{comp.citacao_texto}"</span>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-[#5a5852] leading-relaxed bg-[#ffffff] p-3 rounded-md border border-[#e6e5e0]">
                          <strong className="text-[#26251e]">Justificativa:</strong> {comp.justificativa}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SISEDU (PROJETO ÁGORA) MATRIX */}
            {activeTab === 'sisedu' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#807d72] uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#807d72]" />
                    Sisedu (Projeto Ágora) — Dimensão Discursiva
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {siseduDiscursivaMap.map(({ key, title, desc }) => {
                      const item = sisedu.dimensao_discursiva?.[key] || { nivel: 'Inicial', citacao_texto: 'Ausente', justificativa: 'Não avaliado' };

                      return (
                        <div key={key} className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="font-semibold text-xs text-[#26251e]">{title}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getNivelBadgeClass(item.nivel)}`}>
                                {item.nivel}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#807d72] mb-3">{desc}</p>

                            {item.citacao_texto && (
                              <div className="bg-[#ffffff] border-l-2 border-[#26251e] p-2.5 text-[11px] text-[#26251e] mb-2 rounded-r-md font-mono">
                                <span className="text-[9px] uppercase font-bold text-[#807d72] block mb-0.5 font-sans">Trecho Citado:</span>
                                <span className="italic">"{item.citacao_texto}"</span>
                              </div>
                            )}

                            <p className="text-[11px] text-[#5a5852] leading-relaxed bg-[#ffffff] p-2.5 rounded-md border border-[#e6e5e0]">
                              {item.justificativa}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#e6e5e0]">
                  <h4 className="text-xs font-semibold text-[#807d72] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#807d72]" />
                    Sisedu (Projeto Ágora) — Dimensão Ético-Moral
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {siseduEticoMoralMap.map(({ key, title, desc }) => {
                      const item = sisedu.dimensao_etico_moral?.[key] || { nivel: 'Inicial', citacao_texto: 'Ausente', justificativa: 'Não avaliado' };

                      return (
                        <div key={key} className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="font-semibold text-xs text-[#26251e]">{title}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getNivelBadgeClass(item.nivel)}`}>
                                {item.nivel}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#807d72] mb-3">{desc}</p>

                            {item.citacao_texto && (
                              <div className="bg-[#ffffff] border-l-2 border-[#26251e] p-2.5 text-[11px] text-[#26251e] mb-2 rounded-r-md font-mono">
                                <span className="text-[9px] uppercase font-bold text-[#807d72] block mb-0.5 font-sans">Trecho Citado:</span>
                                <span className="italic">"{item.citacao_texto}"</span>
                              </div>
                            )}

                            <p className="text-[11px] text-[#5a5852] leading-relaxed bg-[#ffffff] p-2.5 rounded-md border border-[#e6e5e0]">
                              {item.justificativa}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TRANSCRIPTION & IMAGE */}
            {activeTab === 'texto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#807d72] uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-[#26251e]" />
                    Imagem Original Enviada
                  </div>
                  {redacao.imagem_base64 ? (
                    <div className="rounded-md overflow-hidden border border-[#e6e5e0] bg-[#ffffff] flex items-center justify-center max-h-[500px]">
                      <img
                        src={redacao.imagem_base64}
                        alt="Folha da Redação"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[#807d72] text-xs italic bg-[#ffffff] rounded-md border border-[#e6e5e0]">
                      Redação enviada em texto digitado (sem imagem binária).
                    </div>
                  )}
                </div>

                <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-4 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#807d72] uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-[#26251e]" />
                      Texto Integral Transcrito (JetBrains Mono)
                    </div>
                    
                    <button
                      onClick={handleCopyText}
                      className="px-2.5 py-1 rounded bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[11px] text-[#26251e] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#1f8a65]" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#807d72]" />
                          Copiar Texto
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 rounded-md bg-[#ffffff] border border-[#e6e5e0] text-[#26251e] text-xs font-mono leading-relaxed whitespace-pre-wrap min-h-[250px] max-h-[500px] overflow-y-auto custom-scrollbar select-text">
                    {fullTextContent}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#e6e5e0] bg-[#fafaf7] flex justify-between items-center">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#26251e] hover:bg-[#000000] text-white font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Baixar PDF Oficial</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[#26251e] font-medium text-xs rounded-md transition-colors cursor-pointer"
            >
              Fechar Relatório
            </button>
          </div>

        </div>
      </div>

      {/* DEDICATED PRINT SHEET (HIDDEN NORMALLY, SHOWN ON PRINT) */}
      <div id="print-official-sheet" className="hidden">
        {renderOfficialSheetContent()}
      </div>
    </>
  );
}
