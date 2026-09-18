import React, { useState } from 'react';
import { X, Award, UserCheck, UserX, Image as ImageIcon, Save, Sparkles, BookOpen, Quote, ShieldCheck, Compass, Copy, Check, Printer, FileText, Download, Loader2, Edit3, Search, GraduationCap, Link, Unlink, AlertTriangle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { updateNomeAluno } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function ModalDetalhesRedacao({ redacao, onClose, onUpdated }) {
  const { isAdmin } = useAuth();
  const [manualName, setManualName] = useState(redacao?.nome_aluno || '');
  const [manualTurma, setManualTurma] = useState(redacao?.turma_aluno || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState('enem'); // 'enem' | 'sisedu' | 'texto'
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [statusValidacao, setStatusValidacao] = useState(redacao?.status_validacao || 'VALIDADA');

  const [estudantesList, setEstudantesList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(redacao?.user_id || '');
  const [isLinkingStudent, setIsLinkingStudent] = useState(false);
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  React.useEffect(() => {
    if (isAdmin) {
      authService.getEstudantes().then(list => setEstudantesList(list)).catch(() => {});
    }
  }, [isAdmin]);

  const handleValidarRedacao = async () => {
    setIsValidating(true);
    try {
      await authService.validarRedacao(redacao.id);
      setStatusValidacao('VALIDADA');
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Erro ao validar redação.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleVincularAluno = async (studentId) => {
    setIsLinkingStudent(true);
    try {
      const selectedEstudante = estudantesList.find(s => String(s.id) === String(studentId));
      await authService.vincularAluno(redacao.id, {
        user_id: studentId ? Number(studentId) : null,
        nome_aluno: selectedEstudante ? selectedEstudante.nome : manualName
      });
      setSelectedStudentId(studentId);
      if (selectedEstudante) {
        setManualName(selectedEstudante.nome);
        if (selectedEstudante.turma) setManualTurma(selectedEstudante.turma);
      }
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Erro ao vincular aluno.');
    } finally {
      setIsLinkingStudent(false);
    }
  };

  if (!redacao) return null;

  const rawExtracted = redacao.extracted_data;
  let data = {};
  if (typeof rawExtracted === 'string') {
    try { data = JSON.parse(rawExtracted); } catch (e) { data = {}; }
  } else {
    data = rawExtracted || {};
  }

  const avaliacoes = data.avaliacoes || {};
  const enem = avaliacoes.enem || {};
  const sisedu = avaliacoes.sisedu || avaliacoes.sisedu_agora || {};
  const siseduDescritores = sisedu.descritores || sisedu || {};
  const devolutivaInicial = data.devolutiva_nivel_inicial || avaliacoes.devolutiva_nivel_inicial || sisedu.devolutiva_nivel_inicial;
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
      if (authService.getToken()) {
        await authService.syncLegacyToCloud().catch(() => {});
      }
      if (onUpdated) onUpdated();
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('minimalist-pdf-document');
    if (!element) return;

    setIsGeneratingPDF(true);
    try {
      const studentNameClean = (redacao.nome_aluno || data.aluno || 'Estudante').replace(/[^a-zA-Z0-9_]/g, '_');
      const filename = `Boletim_Redacao_${studentNameClean}_ID${redacao.id}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getNivelBadgeClass = (nivel) => {
    if (nivel === 'Adequado' || nivel === 'Avançado') return 'bg-emerald-500/15 text-emerald-700 border-emerald-400';
    if (nivel === 'Intermediário' || nivel === 'Em Desenvolvimento') return 'bg-amber-500/15 text-amber-700 border-amber-400';
    return 'bg-rose-500/20 text-rose-700 border-rose-400 font-bold';
  };

  const enemCompetenciasMap = [
    { key: 'competencia_1', title: 'Competência 1 - Norma Culta', desc: 'Domínio da modalidade escrita formal da língua portuguesa' },
    { key: 'competencia_2', title: 'Competência 2 - Tema e Repertório', desc: 'Compreensão do tema e aplicação das áreas do conhecimento' },
    { key: 'competencia_3', title: 'Competência 3 - Argumentação', desc: 'Projeto de texto, organização e interpretação de fatos e opiniões' },
    { key: 'competencia_4', title: 'Competência 4 - Coesão e Coerência', desc: 'Conhecimento dos mecanismos linguísticos para a argumentação' },
    { key: 'competencia_5', title: 'Competência 5 - Proposta de Intervenção', desc: 'Elaboração de proposta respeitando os Direitos Humanos' }
  ];

  const siseduDescritoresMap = [
    { code: 'D05', title: 'D05 — Interpretação Gráfica/Textual', desc: 'Interpretar texto com auxílio de material gráfico diverso' },
    { code: 'D06', title: 'D06 — Identificação do Tema/Tese', desc: 'Identificar o tema ou a tese de um texto dissertativo' },
    { code: 'D12', title: 'D12 — Coesão e Substituição Lexical', desc: 'Relações de coesão, repetições e substituições textuais' },
    { code: 'D13', title: 'D13 — Tese Principal e Central', desc: 'Localizar a tese principal ou argumento central' },
    { code: 'D14', title: 'D14 — Distinção de Partes do Texto', desc: 'Distinguir as partes principais das secundárias' },
    { code: 'D15', title: 'D15 — Reconhecimento de Posições Distintas', desc: 'Reconhecer posições distintas entre duas ou mais opiniões' },
    { code: 'D16', title: 'D16 — Articulação Tese e Argumentos', desc: 'Identificar a tese e os argumentos que a sustentam' },
    { code: 'D17', title: 'D17 — Escolha Vocabular e Sentido', desc: 'Efeito de sentido decorrente da escolha vocabular' },
    { code: 'D18', title: 'D18 — Pontuação e Recursos Expressivos', desc: 'Efeito de sentido decorrente do uso da pontuação' }
  ];

  const siseduDiscursivaMap = [
    { key: 'clareza_tese', title: 'Clareza da Tese' },
    { key: 'argumentacao', title: 'Argumentação' },
    { key: 'repertorio', title: 'Repertório' }
  ];

  const siseduEticoMoralMap = [
    { key: 'empatia_alteridade', title: 'Empatia e Alteridade' },
    { key: 'justificacao_moral', title: 'Justificação Moral' },
    { key: 'conclusao_critica', title: 'Conclusão Crítica / Propostas' }
  ];

  const printDateStr = new Date().toLocaleDateString('pt-BR');
  const printTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // MINIMALIST INK-SAVING OFFICIAL SHEET TEMPLATE (2-Page Duplex Layout)
  const renderMinimalistOfficialSheet = () => (
    <div id="minimalist-pdf-document" className="w-[720px] bg-transparent text-[#111111] space-y-6 font-sans text-xs">

      {/* ==================== PAGE 1: AVALIAÇÃO PEDAGÓGICA (ENEM + SISEDU) ==================== */}
      <div className="w-[720px] min-h-[960px] bg-[#ffffff] text-[#111111] p-6 font-sans text-xs border border-[#111111] rounded-lg box-border flex flex-col justify-between" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="space-y-4">
          {/* Institutional Top Header */}
          <div className="border-b-2 border-[#111111] pb-2 flex justify-between items-center" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#111111] uppercase font-mono">
                ÁGORA ENEM — FICHA DE AVALIAÇÃO DE REDAÇÃO
              </h1>
              <p className="text-[10px] font-mono text-[#555555] uppercase mt-0.5">
                SECRETARIA DA EDUCAÇÃO • SISTEMA PREDITIVO DE AVALIAÇÃO TEXTUAL (ENEM x SISEDU)
              </p>
            </div>

            <div className="text-right font-mono text-[9.5px] text-[#444444] border-l border-[#d0d0d0] pl-3 flex flex-col justify-center items-center">
              <div><strong className="text-[#111111]">REGISTRO:</strong> #{String(redacao.id).padStart(5, '0')}</div>
              <div><strong>EMISSÃO:</strong> {printDateStr} {printTimeStr}</div>
            </div>
          </div>

          {/* Identification & Summary Grid */}
          <div className="grid grid-cols-3 gap-3 border border-[#111111] p-3 rounded font-mono text-[10px]" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="col-span-2 space-y-1">
              <div className="flex flex-col column"><span className="text-[#666666] uppercase text-[9px] block font-sans font-bold">Estudante:</span> <strong className="text-sm text-[#111111] font-sans">{redacao.nome_aluno || data.aluno || 'Estudante Não Identificado'}</strong></div>
              <div className="flex gap-4 text-[10.5px] pt-1 justify-between">
                <span className="flex flex-col column"><span className="text-[#666666]">Turma:</span> <strong>{redacao.turma_aluno || data.turma || 'Sem Turma'}</strong></span>
                <span className="flex flex-col column items-center"><span className="text-[#666666]">Data Lançamento:</span> <strong>{new Date(redacao.data_captura).toLocaleDateString('pt-BR')}</strong></span>
                <span className="flex flex-col column items-end"><span className="text-[#666666]">Entrada:</span> <strong>{redacao.imagem_base64 ? 'Imagem OCR' : 'Digitado'}</strong></span>
              </div>
            </div>

            <div className="border-l border-[#111111] pl-3 text-center flex flex-col justify-center p-1.5">
              <div className="text-[9.5px] font-sans font-bold uppercase text-[#555555]">NOTA FINAL ENEM</div>
              <div className="text-2xl font-extrabold text-[#111111] leading-none my-0.5 font-mono">
                {enem.nota_total_enem !== undefined ? enem.nota_total_enem : '—'} <span className="text-xs font-normal text-[#666666]">/ 1000</span>
              </div>
              <div className="text-[8.5px] text-[#666666]">Escala Oficial MEC</div>
            </div>
          </div>

          {/* SECTION 1: TABELA COMPACTA DE COMPETÊNCIAS ENEM (C1 A C5) */}
          <div className="mt-5 space-y-3.5" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-[#111111] tracking-wider border-b border-[#111111] pb-1 font-mono">
              1. MATRIZ DE COMPETÊNCIAS DO ENEM (0 A 200 PONTOS CADA)
            </h2>

            <table className="w-full text-left border-collapse text-[10px] border border-[#111111]">
              <thead>
                <tr className="bg-[#f2f2f2] font-mono text-[9.5px] uppercase">
                  <th className="p-2 border-r border-b border-[#111111] w-1/4">Competência</th>
                  <th className="p-2 border-r border-b border-[#111111] text-center w-16">Nota</th>
                  <th className="p-2 border-r border-b border-[#111111] w-1/3">Citação Direta do Texto</th>
                  <th className="p-2 border-b border-[#111111]">Parecer Pedagógico</th>
                </tr>
              </thead>
              <tbody>
                {enemCompetenciasMap.map(({ key, title }, idx) => {
                  const comp = enem[key] || { nota: 0, citacao_texto: 'Elemento ausente', justificativa: 'Não avaliado' };
                  const isLast = idx === enemCompetenciasMap.length - 1;
                  const borderBottomClass = isLast ? '' : 'border-b border-[#111111]';
                  return (
                    <tr key={key} className="align-top" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <td className={`p-2 border-r ${borderBottomClass} border-[#111111] font-semibold text-[#111111]`}>
                        {title}
                      </td>
                      <td className={`p-2 border-r ${borderBottomClass} border-[#111111] text-center font-mono font-bold text-sm`}>
                        {comp.nota}
                      </td>
                      <td className={`p-2 border-r ${borderBottomClass} border-[#111111] font-mono text-[9px] italic bg-[#fafafa]`}>
                        {comp.citacao_texto ? `"${comp.citacao_texto}"` : '—'}
                      </td>
                      <td className={`p-2 ${borderBottomClass} border-[#111111] leading-tight text-[#222222] text-ce  `}>
                        {comp.justificativa}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SECTION 2: MATRIZ DESCRITORES SISEDU / SPAECE (D05 - D18) */}
          <div className="mt-5 space-y-3.5" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-[#111111] tracking-wider border-b border-[#111111] pb-1 font-mono">
              2. DESCRITORES DE DESEMPENHO SISEDU / SPAECE (D05 A D18)
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {siseduDescritoresMap.map(({ code, title }) => {
                const descObj = siseduDescritores[code] || sisedu[code] || {};
                const nivel = descObj.nivel || (code === 'D15' ? 'Inicial' : 'Intermediário');
                const justificativa = descObj.justificativa || 'Avaliação pedagógica em conformidade com as rubricas regionais.';
                return (
                  <div key={code} className="border border-[#111111] p-2 rounded font-mono text-[9px] flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between font-bold text-[#111111] border-b border-[#d0d0d0] pb-0.5 mb-1">
                        <span>{code}:</span>
                        <span className="underline">{nivel}</span>
                      </div>
                      <p className="text-[#333333] leading-tight text-[8.5px] font-sans">{justificativa}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PAGE BREAK PARA PÁGINA 2 (VERSO DA FOLHA) ==================== */}
      <div className="html2pdf__page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }} />

      {/* ==================== PAGE 2: TRANSCRIÇÃO INTEGRAL & ASSINATURA ==================== */}
      <div className="w-[720px] min-h-[960px] bg-[#ffffff] text-[#111111] p-6 font-sans text-xs border border-[#111111] rounded-lg box-border flex flex-col justify-between" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="space-y-4">
          {/* Page 2 Mini Reference Header */}
          <div className="border-b border-[#111111] pb-1.5 flex justify-between items-center font-mono text-[9.5px] text-[#444444]" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div><strong className="text-[#111111]">ANEXO II: TRANSCRIÇÃO INTEGRAL & VALIDAÇÃO</strong> — REGISTRO #{String(redacao.id).padStart(5, '0')}</div>
            <div>Estudante: <strong className="text-[#111111]">{redacao.nome_aluno || data.aluno || 'Estudante'}</strong></div>
          </div>

          {/* SECTION 3: TRANSCRIÇÃO INTEGRAL DA REDAÇÃO */}
          <div className="mt-5 space-y-3.5 flex-1" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase text-[#111111] tracking-wider border-b border-[#111111] pb-1 font-mono">
              3. TRANSCRIÇÃO INTEGRAL DO TEXTO DA REDAÇÃO (VERBATIM)
            </h2>
            <div className="p-4 border border-[#111111] bg-[#fafafa] font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#111111] min-h-[380px] rounded">
              {fullTextContent}
            </div>
          </div>
        </div>

        {/* Footer & Teacher Signature Box */}
        <div className="pt-8 flex justify-between items-end text-[10px] font-mono border-t border-[#111111] text-[#444444] mt-4" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div>
            <div>Documento gerado pelo Sistema Ágora ENEM em {printDateStr}.</div>
            <div>Validação Pedagógica Automática via Inteligência Artificial.</div>
          </div>

          <div className="text-center w-64 border-t border-[#111111] pt-2 mt-16">
            <div className="font-bold text-[#111111] font-sans text-xs">Assinatura do Professor / Avaliador</div>
            <div className="text-[9px] text-[#666666]">Visto de Validação Pedagógica</div>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* FIXED-SIZE CLEAN MODAL VIEW */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn no-print">
        <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl w-full max-w-4xl h-[650px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#26251e]">

          {/* Header Bar */}
          <div className="bg-[#fafaf7] border-b border-[#e6e5e0] px-4 sm:px-5 py-3 space-y-2 shrink-0">
            {/* Top Row: Name, Status & Close Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <div className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#e6e5e0] flex items-center justify-center shrink-0 text-[#f54e00]">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#26251e] tracking-tight truncate max-w-[200px] xs:max-w-[300px] sm:max-w-none">
                  {data.aluno || redacao.nome_aluno || 'Estudante Não Identificado'}
                </h3>
                {isIdentified ? (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6e5e0] text-[#26251e]">
                      <UserCheck className="w-3.5 h-3.5 text-[#1f8a65]" />
                      {redacao.nome_aluno || data.aluno}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setIsEditingName(!isEditingName)}
                      className="p-1.5 text-[#807d72] hover:text-[#f54e00] transition-colors rounded-md hover:bg-[#e6e5e0]"
                      title="Editar Aluno e Turma"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#dfa88f]/30 text-[#f54e00] shrink-0">
                    <UserX className="w-3 h-3" />
                    Sem Nome
                  </span>
                )}

              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[#e6e5e0] text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>


          {/* Edit Name Banner */}
          {(!isIdentified || isEditingName) && (
            <div className="bg-[#fafaf7] border-b border-[#e6e5e0] p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#26251e] text-xs">
                {!isIdentified ? (
                  <UserX className="w-4 h-4 text-[#c08532] shrink-0" />
                ) : (
                  <Edit3 className="w-4 h-4 text-[#f54e00] shrink-0" />
                )}
                <span>
                  {!isIdentified 
                    ? <strong>Aluno/Turma não identificados automaticamente:</strong> 
                    : <strong>Editando dados do Aluno:</strong>} Atribua os dados para vincular ao repositório:
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
                {isIdentified && isEditingName && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setManualName(redacao.nome_aluno || '');
                      setManualTurma(redacao.turma_aluno || '');
                    }}
                    className="px-3 py-1.5 bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[#26251e] font-medium text-xs rounded-md transition-colors flex items-center shrink-0 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </form>
            </div>
          )}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono text-[#807d72]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#ffffff] px-2 py-0.5 rounded border border-[#e6e5e0]">ID #{String(redacao.id).padStart(4, '0')}</span>
                <span>•</span>
                <span className="bg-[#ffffff] px-2 py-0.5 rounded border border-[#e6e5e0]">{data.turma || redacao.turma_aluno || 'Geral'}</span>
                <span>•</span>
                <span>{new Date(redacao.data_captura).toLocaleDateString('pt-BR')}</span>
              </div>

              {enem.nota_total_enem !== undefined && (
                <div className="px-2.5 py-0.5 rounded border border-[#dfa88f] bg-[#dfa88f]/20 font-mono text-xs flex items-baseline gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-[#807d72]">NOTA ENEM:</span>
                  <span className="text-sm font-bold text-[#f54e00]">{enem.nota_total_enem}</span>
                  <span className="text-[10px] text-[#807d72]">/1000</span>
                </div>
              )}

            </div>
          </div>

          {/* Navigation Tabs (3 Clean Tabs) */}
          <div className="px-5 bg-[#fafaf7] border-b border-[#e6e5e0] flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('enem')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'enem'
                  ? 'border-[#f54e00] text-[#f54e00] font-semibold bg-[#ffffff] rounded-t-md'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Matriz ENEM</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sisedu')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'sisedu'
                  ? 'border-[#f54e00] text-[#f54e00] font-semibold bg-[#ffffff] rounded-t-md'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Rubricas Sisedu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('texto')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'texto'
                  ? 'border-[#f54e00] text-[#f54e00] font-semibold bg-[#ffffff] rounded-t-md'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Texto & Imagem</span>
            </button>
          </div>

          {/* Scrollable Modal Content (Fixed Height Body) */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-[#ffffff] space-y-4">

            {/* TAB 1: ENEM MATRIX */}
            {activeTab === 'enem' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#e6e5e0]">
                  <h4 className="text-xs font-semibold text-[#807d72] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#f54e00]" />
                    Avaliação Oficial ENEM (0 a 200 pontos por Competência)
                  </h4>
                  <span className="text-[11px] font-mono text-[#807d72]">5 Competências</span>
                </div>

                <div className="space-y-3">
                  {enemCompetenciasMap.map(({ key, title, desc, color }) => {
                    const comp = enem[key] || { nota: 0, citacao_texto: 'Elemento ausente no texto', justificativa: 'Não avaliado' };
                    const percent = Math.min(100, Math.max(0, (comp.nota / 200) * 100));

                    return (
                      <div key={key} className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-xs sm:text-sm text-[#26251e]">{title}</div>
                            <div className="text-[11px] text-[#807d72]">{desc}</div>
                          </div>
                          <div className="text-right shrink-0 bg-[#ffffff] px-2.5 py-1 rounded-md border border-[#e6e5e0] font-mono">
                            <span className="font-bold text-sm text-[#26251e]">{comp.nota}</span>
                            <span className="text-[10px] text-[#807d72]"> / 200</span>
                          </div>
                        </div>

                        <div className="w-full bg-[#e6e5e0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: color }}
                          />
                        </div>

                        <p className="text-xs text-[#5a5852] leading-relaxed">
                          <strong className="text-[#26251e]">Parecer:</strong> {comp.justificativa}
                        </p>

                        {comp.citacao_texto && (
                          <div className="bg-[#ffffff] border-l-2 border-[#f54e00] p-2.5 rounded-r-md text-xs text-[#26251e] flex items-start gap-2 font-mono">
                            <Quote className="w-3.5 h-3.5 text-[#f54e00] shrink-0 mt-0.5" />
                            <div className="text-[11px]">
                              <span className="text-[9px] uppercase font-bold text-[#807d72] block font-sans">Trecho Citado:</span>
                              <span className="italic">"{comp.citacao_texto}"</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SISEDU MATRIX (DESCRITORES D05-D18 & DEVOLUTIVA INICIAL) */}
            {activeTab === 'sisedu' && (
              <div className="space-y-4">
                
                {/* DEVOLUTIVA DE INTERVENÇÃO PEDAGÓGICA (NÍVEL INICIAL) CARD */}
                {(devolutivaInicial || Object.values(siseduDescritores).some(d => d?.nivel === 'Inicial')) && (
                  <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-xl p-4 space-y-2 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Devolutiva de Intervenção Pedagógica — Nível Inicial (SISEDU)</span>
                    </div>
                    <p className="text-xs text-rose-900 leading-relaxed whitespace-pre-wrap font-sans">
                      {devolutivaInicial || "Atenção: O estudante apresentou descritores em Nível Inicial. Recomenda-se aplicar atividade direcionada de reescrita com suporte em conectores argumentativos e substituição lexical antes do próximo ciclo de avaliação."}
                    </p>
                  </div>
                )}

                {/* DESCRITORES OFICIAIS SISEDU/SPAECE (D05, D06, D12, D13, D14, D15, D16, D17, D18) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e6e5e0]">
                    <h4 className="text-xs font-semibold text-[#807d72] uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#f54e00]" />
                      Matriz de Descritores SISEDU / SPAECE (CE)
                    </h4>
                    <span className="text-[11px] font-mono text-[#807d72]">9 Descritores Chave</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {siseduDescritoresMap.map(({ code, title, desc }) => {
                      const descObj = siseduDescritores[code] || sisedu[code] || {};
                      const nivel = descObj.nivel || (code === 'D15' ? 'Inicial' : 'Intermediário');
                      const justificativa = descObj.justificativa || descObj.parecer || 'Avaliação pedagógica em conformidade com a rubrica regional.';
                      const citacao = descObj.citacao_texto;

                      return (
                        <div key={code} className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-3.5 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="font-semibold text-xs text-[#26251e]">{title}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getNivelBadgeClass(nivel)}`}>
                                {nivel}
                              </span>
                            </div>

                            <div className="text-[10.5px] text-[#807d72] mb-1 italic">{desc}</div>

                            <p className="text-xs text-[#5a5852] leading-relaxed my-1.5">
                              {justificativa}
                            </p>

                            {citacao && (
                              <div className="bg-[#ffffff] border-l-2 border-[#f54e00] p-2 text-[10px] text-[#26251e] rounded-r-md font-mono mt-2">
                                <span className="italic">"{citacao}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LEGACY DIMENSIONS FALLBACK (SE HOUVER DADOS LEGADOS) */}
                {sisedu.dimensao_discursiva && (
                  <div className="space-y-2.5 pt-3 border-t border-[#e6e5e0]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#e6e5e0]">
                      <h4 className="text-xs font-semibold text-[#807d72] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#807d72]" />
                        Dimensões Discursiva e Ético-Moral (Projeto Ágora)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {siseduDiscursivaMap.map(({ key, title }) => {
                        const item = sisedu.dimensao_discursiva?.[key] || { nivel: 'Intermediário', justificativa: '—' };
                        return (
                          <div key={key} className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-3 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-xs text-[#26251e]">{title}:</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getNivelBadgeClass(item.nivel)}`}>{item.nivel}</span>
                            </div>
                            <p className="text-[11px] text-[#5a5852]">{item.justificativa}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TRANSCRIPTION & IMAGE */}
            {activeTab === 'texto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#807d72] uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-[#26251e]" />
                    Imagem Original Enviada
                  </div>
                  {redacao.imagem_base64 ? (
                    <div className="rounded-md overflow-hidden border border-[#e6e5e0] bg-[#ffffff] flex items-center justify-center max-h-[380px]">
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

                <div className="bg-[#fafaf7] border border-[#e6e5e0] rounded-lg p-3.5 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#807d72] uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-[#26251e]" />
                      Texto Integral Transcrito
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="px-2.5 py-1 rounded bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[11px] text-[#26251e] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#1f8a65]" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#807d72]" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-md bg-[#ffffff] border border-[#e6e5e0] text-[#26251e] text-xs font-mono leading-relaxed whitespace-pre-wrap flex-1 max-h-[380px] overflow-y-auto custom-scrollbar select-text">
                    {fullTextContent}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Clean Footer Bar */}
          <div className="p-3.5 px-5 border-t border-[#e6e5e0] bg-[#fafaf7] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Quick Actions (Admin) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isIdentified ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Nome do Aluno..."
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="bg-[#ffffff] border border-[#e6e5e0] rounded px-2 py-1 text-xs text-[#26251e] w-36"
                  />
                  <input
                    type="text"
                    placeholder="Turma..."
                    value={manualTurma}
                    onChange={(e) => setManualTurma(e.target.value)}
                    className="bg-[#ffffff] border border-[#e6e5e0] rounded px-2 py-1 text-xs text-[#26251e] w-24"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName || !manualName.trim()}
                    className="px-2.5 py-1 bg-[#f54e00] hover:bg-[#d04200] text-white font-medium text-xs rounded transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Salvar
                  </button>
                </form>
              ) : (
                isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsStudentPickerOpen(true)}
                      className="text-xs font-mono text-[#f54e00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{selectedStudentId ? 'Aluno Vinculado (Alterar)' : 'Vincular a Aluno'}</span>
                    </button>

                    {statusValidacao !== 'VALIDADA' && (
                      <button
                        type="button"
                        onClick={handleValidarRedacao}
                        disabled={isValidating}
                        className="px-3 py-1 bg-[#1f8a65] hover:bg-[#176d50] text-white font-medium text-xs rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isValidating ? 'Validando...' : 'Validar & Liberar'}</span>
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Standard Footer Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                disabled={isGeneratingPDF}
                onClick={handleDownloadPDF}
                className="px-3.5 py-1.5 bg-[#26251e] hover:bg-[#000000] text-white font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-[#f54e00]" />
                    <span>Baixar PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[#26251e] font-medium text-xs rounded-md transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* HIDDEN PDF TEMPLATE (RENDERED OFF-SCREEN ONLY WHEN USER CLICKS DOWNLOAD PDF) */}
      <div className="fixed top-0 -left-[9999px] pointer-events-none z-[-100]">
        {renderMinimalistOfficialSheet()}
      </div>

      {/* STUDENT PICKER MODAL FOR PROFESSORS */}
      {isStudentPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#26251e]/40 backdrop-blur-xs animate-fadeIn no-print">
          <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4 text-[#26251e]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e6e5e0] pb-3">
              <div>
                <h4 className="text-base font-normal tracking-tight text-[#26251e] flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#f54e00]" />
                  Vincular Redação a Aluno Cadastrado
                </h4>
                <p className="text-xs text-[#807d72] mt-0.5">
                  Selecione o aluno que receberá esta avaliação em seu portal individual.
                </p>
              </div>
              <button
                onClick={() => setIsStudentPickerOpen(false)}
                className="p-1 rounded-md text-[#807d72] hover:text-[#26251e] bg-[#fafaf7] border border-[#e6e5e0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#807d72] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por nome, e-mail ou turma..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#ffffff] border border-[#e6e5e0] rounded-md text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] transition-colors"
              />
            </div>

            {/* Options List */}
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {/* Unlink Option */}
              <div
                onClick={() => { handleVincularAluno(''); setIsStudentPickerOpen(false); }}
                className={`p-3 rounded-lg border border-[#e6e5e0] transition-all cursor-pointer flex items-center justify-between ${
                  !selectedStudentId ? 'bg-[#f7f7f4] border-[#cfcdc4]' : 'bg-[#ffffff] hover:bg-[#fafaf7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Unlink className="w-4 h-4 text-[#807d72]" />
                  <div>
                    <span className="text-xs font-medium text-[#26251e] block">Não Vincular a Conta</span>
                    <span className="text-[10px] font-mono text-[#807d72]">Manter com nome manual e sem envio para portal de aluno</span>
                  </div>
                </div>
                {!selectedStudentId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e6e5e0] text-[#26251e]">
                    SELECIONADO
                  </span>
                )}
              </div>

              {/* Filtered Student Cards */}
              {(() => {
                const filteredEstudantes = estudantesList.filter(est => {
                  const query = studentSearchQuery.toLowerCase().trim();
                  if (!query) return true;
                  return (
                    (est.nome || '').toLowerCase().includes(query) ||
                    (est.email || '').toLowerCase().includes(query) ||
                    (est.turma || '').toLowerCase().includes(query)
                  );
                });

                if (filteredEstudantes.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-[#807d72] font-mono bg-[#fafaf7] rounded-md border border-[#e6e5e0]">
                      Nenhum estudante cadastrado encontrado.
                    </div>
                  );
                }

                return filteredEstudantes.map((est) => {
                  const isSelected = String(selectedStudentId) === String(est.id);
                  return (
                    <div
                      key={est.id}
                      onClick={() => { handleVincularAluno(est.id); setIsStudentPickerOpen(false); }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#9fc9a2]/20 border-[#9fc9a2]'
                          : 'bg-[#ffffff] border-[#e6e5e0] hover:bg-[#fafaf7]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#e6e5e0] flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4 text-[#26251e]" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#26251e]">{est.nome}</div>
                          <div className="text-[10px] font-mono text-[#807d72]">{est.email} • {est.turma || 'Sem Turma'}</div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#9fc9a2] text-[#26251e]">
                          ✓ VINCULADO
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-[#f54e00] hover:bg-[#d04200] text-white text-[10px] font-medium uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                        >
                          Vincular
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#e6e5e0] flex justify-end">
              <button
                type="button"
                onClick={() => setIsStudentPickerOpen(false)}
                className="px-4 py-1.5 bg-[#ffffff] border border-[#e6e5e0] text-[#26251e] font-medium text-xs rounded-md hover:bg-[#fafaf7] cursor-pointer"
              >
                Concluído
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
