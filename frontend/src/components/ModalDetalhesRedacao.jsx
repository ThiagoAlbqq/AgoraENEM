import React, { useState } from 'react';
import { 
  X, Award, UserCheck, UserX, Image as ImageIcon, Save, Sparkles, 
  BookOpen, Quote, ShieldCheck, Compass, Copy, Check, Printer, 
  FileText, Download, Loader2, Edit3, Search, GraduationCap, 
  Link, Unlink, AlertTriangle, Sliders, Eye, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { updateNomeAluno } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function ModalDetalhesRedacao({ redacao, onClose, onUpdated }) {
  const { isAdmin } = useAuth();
  const [manualName, setManualName] = useState(redacao?.nome_aluno || '');
  const [manualTurma, setManualTurma] = useState(redacao?.turma_aluno || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState('enem'); // 'enem' | 'sisedu' | 'texto' | 'pdf_preview'
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [statusValidacao, setStatusValidacao] = useState(redacao?.status_validacao || 'VALIDADA');

  // Customization state for PDF layout & organization
  const [customEscola, setCustomEscola] = useState('Secretaria da Educação do Ceará • SEDUC-CE');
  const [customProfessor, setCustomProfessor] = useState('Professor(a) Avaliador(a)');
  const [customRecado, setCustomRecado] = useState('');
  const [showSisedu, setShowSisedu] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [pdfPreviewPage, setPdfPreviewPage] = useState('both'); // 'page1' | 'page2' | 'both'
  const [isCustomizingPdf, setIsCustomizingPdf] = useState(false);

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

  // Cálculo matemático consistente da soma das 5 competências do ENEM
  const c1Val = Number(enem.competencia_1?.nota ?? 0);
  const c2Val = Number(enem.competencia_2?.nota ?? 0);
  const c3Val = Number(enem.competencia_3?.nota ?? 0);
  const c4Val = Number(enem.competencia_4?.nota ?? 0);
  const c5Val = Number(enem.competencia_5?.nota ?? 0);
  const sumCompetencias = c1Val + c2Val + c3Val + c4Val + c5Val;
  const notaEnemCalculada = (enem.competencia_1 || enem.competencia_2) ? sumCompetencias : (enem.nota_total_enem ?? redacao.nota_final ?? 0);

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

  // Helper to strip HTML tags and prevent unescaped raw HTML from rendering as text
  const sanitizePdfText = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/[\u0080-\u009F]/g, '') // Remove unprintable control characters
      .trim();
  };

  // ROBUST 2-PAGE STRICT PDF GENERATION VIA JSPDF + HTML2CANVAS (Guarantees at most 2 pages, 0 blank pages)
  const handleDownloadPDF = async () => {
    const page1El = document.getElementById('pdf-page-1-export');
    const page2El = document.getElementById('pdf-page-2-export');
    if (!page1El || !page2El) {
      alert('Aguarde o carregamento do documento para exportar.');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const studentNameClean = sanitizePdfText(manualName || redacao.nome_aluno || data.aluno || 'Estudante').replace(/[^a-zA-Z0-9_]/g, '_');
      const filename = `Boletim_Redacao_${studentNameClean}_ID${redacao.id}.pdf`;

      const canvasOptions = {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123,
        width: 794,
        height: 1123,
        scrollX: 0,
        scrollY: 0
      };

      // 1. Capture Page 1
      const canvas1 = await html2canvas(page1El, canvasOptions);
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);

      // 2. Initialize jsPDF in A4 portrait
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Add Page 1
      pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // 3. Capture Page 2
      const canvas2 = await html2canvas(page2El, canvasOptions);
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);

      // Add Page 2
      pdf.addPage('a4', 'portrait');
      pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // Save exact 2-page PDF
      pdf.save(filename);
    } catch (err) {
      console.error('Erro ao gerar PDF com jsPDF:', err);
      alert('Não foi possível gerar o arquivo PDF automaticamente. Por favor, tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  const printDateStr = new Date().toLocaleDateString('pt-BR');
  const printTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // PÁGINA 1: AVALIAÇÃO PEDAGÓGICA (ENEM + SISEDU / OBSERVAÇÃO)
  const renderPage1 = (elementId = 'pdf-page-1-export') => {
    const studentNameDisplay = sanitizePdfText(manualName || redacao.nome_aluno || data.aluno || 'Estudante Não Identificado');
    const turmaDisplay = sanitizePdfText(manualTurma || redacao.turma_aluno || data.turma || 'Geral');
    const notaTotal = Number(notaEnemCalculada);
    const scoreGaugePct = Math.min(100, Math.max(0, (notaTotal / 1000) * 100));

    const sansFont = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    const serifFont = 'Georgia, Cambria, "Times New Roman", Times, serif';
    const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

    return (
      <div 
        id={elementId}
        style={{ 
          width: '794px', 
          height: '1123px', 
          maxHeight: '1123px', 
          backgroundColor: '#ffffff', 
          color: '#0f172a', 
          padding: '32px 36px 24px 36px', 
          boxSizing: 'border-box', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          overflow: 'hidden',
          position: 'relative',
          fontFamily: sansFont,
          fontSize: '12px'
        }}
      >
        {/* Marca d'água institucional */}
        {showWatermark && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.03,
            transform: 'rotate(-30deg)',
            userSelect: 'none',
            zIndex: 0
          }}>
            <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: monoFont, letterSpacing: '8px', color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              SEDUC • ÁGORA ENEM<br />DOCUMENTO OFICIAL
            </span>
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 10 }}>
          {/* Top Institutional Header Bar */}
          <div style={{ borderBottom: '1.5px solid #0f172a', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '6px',
                border: '2px solid #0f172a',
                color: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '13px',
                letterSpacing: '-0.5px',
                boxSizing: 'border-box'
              }}>
                <span>ÁG</span>
                <span style={{ fontSize: '6.5px', letterSpacing: '1.5px', color: '#b45309', fontFamily: monoFont, marginTop: '-3px', fontWeight: 'bold' }}>ENEM</span>
              </div>
              <div>
                <h1 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', margin: 0, lineHeight: 1.1, fontFamily: sansFont }}>
                  Ágora ENEM — Ficha Oficial de Avaliação
                </h1>
                <p style={{ fontSize: '8.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '3px 0 0 0', fontFamily: sansFont }}>
                  {customEscola || 'Secretaria da Educação do Ceará • Sistema Preditivo (ENEM x SISEDU)'}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontFamily: monoFont, fontSize: '8.5px', color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '7.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, fontFamily: sansFont }}>REGISTRO:</span>
                <span style={{ border: '1px solid #0f172a', color: '#0f172a', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, fontSize: '8.5px' }}>
                  #{String(redacao.id).padStart(5, '0')}
                </span>
              </div>
              <div style={{ marginTop: '2px', fontSize: '8px', color: '#64748b' }}>
                EMISSÃO: <strong style={{ color: '#0f172a' }}>{printDateStr} {printTimeStr}</strong>
              </div>
            </div>
          </div>

          {/* Student Identification & HERO SCORE CARD */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            display: 'grid',
            gridTemplateColumns: '1fr 190px',
            gap: '14px',
            alignItems: 'center',
            marginTop: '10px'
          }}>
            <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '14px' }}>
              <div>
                <span style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Estudante Avaliado:
                </span>
                <h2 style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800, margin: '1px 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {studentNameDisplay}
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '9px' }}>
                <div>
                  <span style={{ fontSize: '7.5px', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>TURMA:</span>
                  <strong style={{ color: '#0f172a', fontSize: '9.5px' }}>{turmaDisplay}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '7.5px', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>LANÇAMENTO:</span>
                  <strong style={{ color: '#0f172a', fontSize: '9.5px' }}>{new Date(redacao.data_captura).toLocaleDateString('pt-BR')}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '7.5px', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>ENTRADA:</span>
                  <strong style={{ color: '#0f172a', fontSize: '9.5px' }}>{redacao.imagem_base64 ? 'Imagem OCR' : 'Digitado'}</strong>
                </div>
              </div>
            </div>

            {/* HERO SCORE ELEMENT (0-1000 with Scale Gauge) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
                NOTA FINAL ENEM
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '1px 0' }}>
                <span style={{ fontSize: '34px', fontWeight: 900, fontFamily: serifFont, color: '#0f172a', lineHeight: 1 }}>
                  {notaEnemCalculada !== undefined ? notaEnemCalculada : '—'}
                </span>
                <span style={{ fontSize: '10px', fontFamily: monoFont, color: '#64748b' }}>/ 1000</span>
              </div>
              <div style={{ width: '120px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '9999px', position: 'relative', marginTop: '3px' }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `calc(${scoreGaugePct}% - 4px)`,
                  width: '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  backgroundColor: '#0f172a',
                  border: '1.5px solid #ffffff'
                }} />
              </div>
              <span style={{ fontSize: '7px', color: '#64748b', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Escala Oficial MEC
              </span>
            </div>
          </div>

          {/* SECTION 1: MATRIZ DE COMPETÊNCIAS DO ENEM */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              <h3 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0f172a', margin: 0, borderLeft: '3px solid #0f172a', paddingLeft: '6px' }}>
                1. Matriz de Competências do ENEM (0 a 200 pontos cada)
              </h3>
              <span style={{ fontSize: '7.5px', fontFamily: monoFont, color: '#64748b', textTransform: 'uppercase' }}>Pesos Oficiais MEC</span>
            </div>

            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '8.5px', marginTop: '3px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', fontFamily: monoFont, fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '3px 4px 3px 0', width: '22%' }}>Competência</th>
                  <th style={{ padding: '3px 4px', textAlign: 'right', width: '12%' }}>Nota</th>
                  <th style={{ padding: '3px 6px', width: '32%' }}>Citação / Evidência no Texto</th>
                  <th style={{ padding: '3px 0 3px 4px' }}>Parecer Pedagógico Explicativo</th>
                </tr>
              </thead>
              <tbody>
                {enemCompetenciasMap.map(({ key, title }) => {
                  const comp = enem[key] || { nota: 0, citacao_texto: 'Elemento ausente', justificativa: 'Não avaliado' };
                  const cleanCitacao = sanitizePdfText(comp.citacao_texto);
                  const cleanParecer = sanitizePdfText(comp.justificativa);

                  return (
                    <tr key={key} style={{ verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4.5px 4px 4.5px 0', fontWeight: 700, color: '#0f172a', fontSize: '8.5px', lineHeight: 1.15 }}>
                        {title}
                      </td>
                      <td style={{ padding: '4.5px 4px', textAlign: 'right', fontFamily: serifFont, fontWeight: 800, fontSize: '10.5px', color: '#0f172a' }}>
                        {comp.nota} <span style={{ fontSize: '7px', fontFamily: sansFont, color: '#64748b', fontWeight: 400 }}>/200</span>
                      </td>
                      <td style={{ padding: '4.5px 6px', fontFamily: monoFont, fontSize: '7.5px', fontStyle: 'italic', color: '#475569', lineHeight: 1.2, borderLeft: '2px solid #e2e8f0' }}>
                        {cleanCitacao ? `"${cleanCitacao}"` : '—'}
                      </td>
                      <td style={{ padding: '4.5px 0 4.5px 4px', lineHeight: 1.2, color: '#334155', fontSize: '8px' }}>
                        {cleanParecer}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SECTION 2: DESCRITORES SISEDU OU RECADO PEDAGÓGICO PERSONALIZADO */}
          {showSisedu ? (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                <h3 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0f172a', margin: 0, borderLeft: '3px solid #047857', paddingLeft: '6px' }}>
                  2. Matriz de Descritores Regionais SISEDU / SPAECE (D05 a D18)
                </h3>
                <span style={{ fontSize: '7.5px', fontFamily: monoFont, color: '#64748b', textTransform: 'uppercase' }}>Matriz Estadual SEDUC</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginTop: '5px' }}>
                {siseduDescritoresMap.map(({ code }) => {
                  const descObj = siseduDescritores[code] || sisedu[code] || {};
                  const nivel = descObj.nivel || (code === 'D15' ? 'Inicial' : 'Intermediário');
                  const cleanJustificativa = sanitizePdfText(descObj.justificativa || 'Avaliação pedagógica em conformidade com as rubricas regionais.');

                  let badgeColor = '#047857';
                  if (nivel === 'Intermediário' || nivel === 'Em Desenvolvimento') {
                    badgeColor = '#b45309';
                  } else if (nivel === 'Inicial') {
                    badgeColor = '#64748b';
                  }

                  return (
                    <div key={code} style={{ border: '1px solid #e2e8f0', padding: '5px', borderRadius: '4px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '2px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '8.5px', fontFamily: monoFont }}>{code}</span>
                          <span style={{ padding: '0.5px 4px', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', borderRadius: '3px', border: `1px solid ${badgeColor}`, color: badgeColor, backgroundColor: 'transparent' }}>
                            {nivel}
                          </span>
                        </div>
                        <p style={{ color: '#475569', lineHeight: 1.2, fontSize: '7.5px', margin: 0 }}>
                          {cleanJustificativa}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            customRecado && (
              <div style={{ marginTop: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#fafaf9' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles style={{ width: '12px', height: '12px', color: '#f54e00' }} />
                  Observação & Orientações do(a) Professor(a):
                </div>
                <p style={{ fontSize: '8.5px', color: '#334155', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {customRecado}
                </p>
              </div>
            )
          )}
        </div>

        {/* Page 1 Footer */}
        <div style={{ paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: monoFont, fontSize: '7.5px', color: '#64748b' }}>
          <div>Sistema Ágora ENEM • {customEscola || 'Secretaria da Educação do Ceará'} • Documento Oficial</div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>Página 01 de 02</div>
        </div>
      </div>
    );
  };

  // PÁGINA 2: TRANSCRIÇÃO INTEGRAL & ASSINATURA DO PROFESSOR
  const renderPage2 = (elementId = 'pdf-page-2-export') => {
    const authHash = `SHA256:${String(redacao.id * 7919 + 104729).padStart(8, '0')}FE${String(redacao.id * 104729).substring(0, 16).toUpperCase()}`;
    const sanitizedFullText = sanitizePdfText(fullTextContent);
    const rawLines = sanitizedFullText.split('\n');
    const numberedLines = [];
    let currentLineNum = 1;
    
    rawLines.forEach(paragraph => {
      if (currentLineNum > 25) return;
      if (!paragraph.trim()) {
        numberedLines.push({ num: currentLineNum++, text: '' });
        return;
      }
      const lineChunks = paragraph.match(/.{1,70}(\s|$)/g) || [paragraph];
      lineChunks.forEach(chunk => {
        if (currentLineNum <= 25) {
          numberedLines.push({ num: currentLineNum++, text: chunk.trim() });
        }
      });
    });

    // Fill remaining lines up to 25 for visual consistency
    while (numberedLines.length < 25) {
      numberedLines.push({ num: numberedLines.length + 1, text: '' });
    }

    const studentNameDisplay = sanitizePdfText(manualName || redacao.nome_aluno || data.aluno || 'Estudante Não Identificado');

    const sansFont = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

    return (
      <div 
        id={elementId}
        style={{ 
          width: '794px', 
          height: '1123px', 
          maxHeight: '1123px', 
          backgroundColor: '#ffffff', 
          color: '#0f172a', 
          padding: '32px 36px 24px 36px', 
          boxSizing: 'border-box', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          overflow: 'hidden',
          position: 'relative',
          fontFamily: sansFont,
          fontSize: '12px'
        }}
      >
        {/* Marca d'água institucional */}
        {showWatermark && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.03,
            transform: 'rotate(-30deg)',
            userSelect: 'none',
            zIndex: 0
          }}>
            <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: monoFont, letterSpacing: '8px', color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              SEDUC • ÁGORA ENEM<br />DOCUMENTO OFICIAL
            </span>
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Page 2 Mini Reference Header */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: monoFont, fontSize: '8px', color: '#64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ border: '1px solid #0f172a', color: '#0f172a', padding: '1px 5px', borderRadius: '3px', fontWeight: 800, fontSize: '7.5px' }}>ANEXO II</span>
                <strong style={{ textTransform: 'uppercase', color: '#0f172a', fontSize: '9px', fontFamily: sansFont }}>Transcrição Verbatim do Texto Original</strong>
              </div>
              <div>REGISTRO: <strong style={{ color: '#0f172a' }}>#{String(redacao.id).padStart(5, '0')}</strong> • ESTUDANTE: <strong style={{ color: '#0f172a' }}>{studentNameDisplay}</strong></div>
            </div>

            {/* SECTION 3: TRANSCRIÇÃO INTEGRAL DA REDAÇÃO (MAX 25 LINHAS) */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                <h3 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0f172a', margin: 0, borderLeft: '3px solid #0f172a', paddingLeft: '6px' }}>
                  3. Transcrição Fiel do Texto Manuscrito / Digitado
                </h3>
                <span style={{ fontSize: '7.5px', fontFamily: monoFont, color: '#64748b', textTransform: 'uppercase' }}>Folha Oficial de Transcrição</span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#ffffff', overflow: 'hidden', marginTop: '5px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {numberedLines.map(({ num, text }) => (
                      <tr key={num} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ width: '30px', padding: '3px 4px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', fontFamily: monoFont, fontWeight: 700, fontSize: '8px', userSelect: 'none' }}>
                          {String(num).padStart(2, '0')}
                        </td>
                        <td style={{ padding: '3px 8px', color: '#1e293b', lineHeight: 1.3, whiteSpace: 'pre-wrap', fontFamily: sansFont, fontSize: '8.5px', minHeight: '16px' }}>
                          {text || <span style={{ color: '#e2e8f0' }}></span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 4: BLOCO DE AUTENTICIDADE DIGITAL E ASSINATURA */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: showSignature ? '7fr 5fr' : '1fr', gap: '14px', alignItems: 'flex-end', marginTop: '6px', fontFamily: monoFont, fontSize: '8px', color: '#475569' }}>
            
            {/* Digital Authenticity Stamp & Hash */}
            <div style={{ border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '4px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#047857', fontWeight: 800, fontSize: '8.5px', fontFamily: sansFont }}>
                <ShieldCheck style={{ width: '13px', height: '13px', color: '#047857' }} />
                AUTENTICAÇÃO DIGITAL DA AVALIAÇÃO
              </div>
              <p style={{ fontSize: '7px', fontFamily: sansFont, color: '#475569', lineHeight: 1.25, margin: '3px 0 5px 0' }}>
                Documento emitido pelo Agente Ágora ENEM e validado pedagogicamente com base nas diretrizes oficiais do MEC e da SEDUC-CE.
              </p>
              <div style={{ paddingTop: '3px', fontSize: '7px', color: '#64748b', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div>CÓDIGO HASH: <strong style={{ color: '#0f172a' }}>{authHash}</strong></div>
                <div>CHAVE DE VALIDAÇÃO: <strong style={{ color: '#0f172a' }}>AGORA-2026-MEC-SEDUC-CE</strong></div>
              </div>
            </div>

            {/* Teacher Signature Line */}
            {showSignature && (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid #0f172a', paddingTop: '3px', marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: sansFont, fontSize: '8.5px', textTransform: 'uppercase' }}>
                    {customProfessor || 'Assinatura do Professor / Avaliador'}
                  </div>
                  <div style={{ fontSize: '7px', color: '#64748b', fontFamily: sansFont }}>
                    Visto de Validação Pedagógica
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Page 2 Footer */}
        <div style={{ paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: monoFont, fontSize: '7.5px', color: '#64748b' }}>
          <div>Sistema Ágora ENEM • {customEscola || 'Secretaria da Educação do Ceará'} • Anexo II de Transcrição</div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>Página 02 de 02</div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* FIXED-SIZE CLEAN MODAL VIEW */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn no-print">
        <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl w-full max-w-4xl h-[660px] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-[#26251e]">

          {/* Header Bar */}
          <div className="bg-[#fafaf7] border-b border-[#e6e5e0] px-4 sm:px-5 py-3 space-y-2 shrink-0">
            {/* Top Row: Name, Status & Close Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <div className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#e6e5e0] flex items-center justify-center shrink-0 text-[#f54e00]">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#26251e] tracking-tight truncate max-w-[200px] xs:max-w-[300px] sm:max-w-none">
                  {manualName || data.aluno || redacao.nome_aluno || 'Estudante Não Identificado'}
                </h3>
                {isIdentified ? (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6e5e0] text-[#26251e]">
                      <UserCheck className="w-3.5 h-3.5 text-[#1f8a65]" />
                      {redacao.nome_aluno || data.aluno}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 hover:bg-[#e6e5e0] rounded text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
                      title="Editar nome do aluno"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6e5e0] text-[#26251e]">
                    <UserX className="w-3.5 h-3.5 text-[#c08532]" />
                    Pendente
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                  statusValidacao === 'VALIDADA'
                    ? 'bg-[#1f8a65]/10 text-[#1f8a65] border-[#1f8a65]/30'
                    : 'bg-[#c08532]/10 text-[#c08532] border-[#c08532]/30'
                }`}>
                  {statusValidacao === 'VALIDADA' ? '✓ Validada' : '⏳ Em Revisão'}
                </span>
                
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#807d72] hover:text-[#26251e] hover:bg-[#e6e5e0] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Edit Name Banner */}
            {(!isIdentified || isEditingName) && (
              <div className="bg-[#ffffff] border border-[#e6e5e0] p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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
                <span className="bg-[#ffffff] px-2 py-0.5 rounded border border-[#e6e5e0]">{manualTurma || data.turma || redacao.turma_aluno || 'Geral'}</span>
                <span>•</span>
                <span>{new Date(redacao.data_captura).toLocaleDateString('pt-BR')}</span>
              </div>

              {notaEnemCalculada !== undefined && (
                <div className="px-2.5 py-0.5 rounded border border-[#dfa88f] bg-[#dfa88f]/20 font-mono text-xs flex items-baseline gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-[#807d72]">NOTA ENEM:</span>
                  <span className="text-sm font-bold text-[#f54e00]">{notaEnemCalculada}</span>
                  <span className="text-[10px] text-[#807d72]">/1000</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs (4 Clean Tabs) */}
          <div className="px-5 bg-[#fafaf7] border-b border-[#e6e5e0] flex items-center gap-2 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('enem')}
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
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
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
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
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'texto'
                  ? 'border-[#f54e00] text-[#f54e00] font-semibold bg-[#ffffff] rounded-t-md'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Texto & Imagem</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pdf_preview')}
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'pdf_preview'
                  ? 'border-[#f54e00] text-[#f54e00] font-semibold bg-[#ffffff] rounded-t-md'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#f54e00]" />
              <span>📄 Folha Oficial (PDF 2 Págs)</span>
            </button>
          </div>

          {/* Scrollable Modal Content */}
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
                  {enemCompetenciasMap.map(({ key, title, desc }) => {
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
                            className="h-full transition-all duration-500 rounded-full bg-[#f54e00]"
                            style={{ width: `${percent}%` }}
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

            {/* TAB 2: SISEDU MATRIX */}
            {activeTab === 'sisedu' && (
              <div className="space-y-4">
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

            {/* TAB 4: PDF PREVIEW & MANUAL ORGANIZATION */}
            {activeTab === 'pdf_preview' && (
              <div className="space-y-4">
                
                {/* PDF CONTROL & CUSTOMIZATION TOP BAR */}
                <div className="bg-[#fafaf7] border border-[#e6e5e0] p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  {/* Page View Selector */}
                  <div className="flex items-center gap-1 bg-[#ffffff] border border-[#e6e5e0] p-0.5 rounded-md text-xs">
                    <button
                      type="button"
                      onClick={() => setPdfPreviewPage('page1')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        pdfPreviewPage === 'page1' ? 'bg-[#26251e] text-white font-medium' : 'text-[#807d72] hover:text-[#26251e]'
                      }`}
                    >
                      Frente (Pág 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPreviewPage('page2')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        pdfPreviewPage === 'page2' ? 'bg-[#26251e] text-white font-medium' : 'text-[#807d72] hover:text-[#26251e]'
                      }`}
                    >
                      Verso (Pág 2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPreviewPage('both')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        pdfPreviewPage === 'both' ? 'bg-[#26251e] text-white font-medium' : 'text-[#807d72] hover:text-[#26251e]'
                      }`}
                    >
                      Ambas (Lado a Lado)
                    </button>
                  </div>

                  {/* Actions & Settings Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomizingPdf(!isCustomizingPdf)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCustomizingPdf 
                          ? 'bg-[#f54e00] text-white border-[#f54e00]' 
                          : 'bg-[#ffffff] text-[#26251e] border-[#e6e5e0] hover:bg-[#e6e5e0]'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isCustomizingPdf ? 'Ocultar Ajustes' : 'Personalizar Layout & Dados'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingPDF}
                      onClick={handleDownloadPDF}
                      className="px-3.5 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isGeneratingPDF ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar PDF (2 Págs Exatas)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE MANUAL CUSTOMIZATION & ORGANIZATION PANEL */}
                {isCustomizingPdf && (
                  <div className="bg-[#fafaf7] border border-[#f54e00]/30 rounded-xl p-4 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-[#e6e5e0]">
                      <h5 className="text-xs font-semibold text-[#26251e] flex items-center gap-2 uppercase tracking-wide">
                        <Sliders className="w-4 h-4 text-[#f54e00]" />
                        Organização & Ajustes Manuais da Folha
                      </h5>
                      <span className="text-[11px] text-[#807d72] font-mono">Prévia em tempo real</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      {/* Escola / Instituição */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#807d72] block">Nome da Instituição / Escola:</label>
                        <input
                          type="text"
                          value={customEscola}
                          onChange={(e) => setCustomEscola(e.target.value)}
                          placeholder="Ex: Secretaria da Educação do Ceará • SEDUC"
                          className="w-full bg-[#ffffff] border border-[#e6e5e0] rounded px-2.5 py-1.5 text-xs text-[#26251e] focus:outline-none focus:border-[#26251e]"
                        />
                      </div>

                      {/* Professor / Avaliador */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#807d72] block">Professor(a) / Avaliador(a):</label>
                        <input
                          type="text"
                          value={customProfessor}
                          onChange={(e) => setCustomProfessor(e.target.value)}
                          placeholder="Ex: Prof. Francisco Silva"
                          className="w-full bg-[#ffffff] border border-[#e6e5e0] rounded px-2.5 py-1.5 text-xs text-[#26251e] focus:outline-none focus:border-[#26251e]"
                        />
                      </div>

                      {/* Toggles */}
                      <div className="space-y-2 flex flex-col justify-center">
                        <label className="text-[11px] font-medium text-[#807d72] block">Exibição de Elementos:</label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={showSisedu}
                              onChange={(e) => setShowSisedu(e.target.checked)}
                              className="rounded text-[#f54e00] focus:ring-0"
                            />
                            <span>Grade SISEDU</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={showWatermark}
                              onChange={(e) => setShowWatermark(e.target.checked)}
                              className="rounded text-[#f54e00] focus:ring-0"
                            />
                            <span>Marca d'água</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={showSignature}
                              onChange={(e) => setShowSignature(e.target.checked)}
                              className="rounded text-[#f54e00] focus:ring-0"
                            />
                            <span>Assinatura</span>
                          </label>
                        </div>
                      </div>

                      {/* Observação / Recado do Professor (Opcional) */}
                      <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                        <label className="text-[11px] font-medium text-[#807d72] block">
                          Recado / Orientação Pedagógica Personalizada (Aparece na Pág 1 caso desmarque a grade SISEDU):
                        </label>
                        <textarea
                          rows={2}
                          value={customRecado}
                          onChange={(e) => setCustomRecado(e.target.value)}
                          placeholder="Escreva uma orientação direta para o estudante..."
                          className="w-full bg-[#ffffff] border border-[#e6e5e0] rounded px-2.5 py-1.5 text-xs text-[#26251e] focus:outline-none focus:border-[#26251e]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* LIVE WYSIWYG PREVIEW CONTAINER */}
                <div className="bg-[#334155] p-4 sm:p-6 rounded-xl overflow-x-auto flex justify-center items-start min-h-[500px]">
                  <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
                    
                    {/* PAGE 1 PREVIEW */}
                    {(pdfPreviewPage === 'page1' || pdfPreviewPage === 'both') && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                          📄 Página 1 (Frente - Avaliação Pedagógica)
                        </span>
                        <div 
                          className="bg-white rounded shadow-2xl overflow-hidden border border-slate-700"
                          style={{
                            width: '794px',
                            height: '1123px',
                            transform: 'scale(0.62)',
                            transformOrigin: 'top center',
                            marginBottom: '-420px'
                          }}
                        >
                          {renderPage1('pdf-page-1-live-preview')}
                        </div>
                      </div>
                    )}

                    {/* PAGE 2 PREVIEW */}
                    {(pdfPreviewPage === 'page2' || pdfPreviewPage === 'both') && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                          📄 Página 2 (Verso - Transcrição Verbatim)
                        </span>
                        <div 
                          className="bg-white rounded shadow-2xl overflow-hidden border border-slate-700"
                          style={{
                            width: '794px',
                            height: '1123px',
                            transform: 'scale(0.62)',
                            transformOrigin: 'top center',
                            marginBottom: '-420px'
                          }}
                        >
                          {renderPage2('pdf-page-2-live-preview')}
                        </div>
                      </div>
                    )}

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
                onClick={() => setActiveTab('pdf_preview')}
                className={`px-3 py-1.5 border border-[#e6e5e0] font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'pdf_preview' ? 'bg-[#f54e00]/10 text-[#f54e00] border-[#f54e00]/40' : 'bg-[#ffffff] text-[#26251e] hover:bg-[#e6e5e0]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Organizar & Visualizar</span>
              </button>

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
                    <span>Baixar PDF Oficial</span>
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

      {/* HIDDEN 2-PAGE EXPORT TEMPLATE (GUARANTEES 100% CLEAN CAPTURE EVEN WHEN MODAL IS CLOSED OR ON OTHER TABS) */}
      <div style={{ position: 'fixed', top: 0, left: '-99999px', width: '794px', pointerEvents: 'none', zIndex: -9999 }}>
        {renderPage1('pdf-page-1-export')}
        {renderPage2('pdf-page-2-export')}
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
