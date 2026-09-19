import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, Search, Check, ChevronRight, ChevronLeft, 
  GraduationCap, AlertTriangle, FileText, CheckCircle2,
  Sparkles, Filter, ExternalLink, ArrowRight, RefreshCw, Save
} from 'lucide-react';
import { authService } from '../services/authService';

const TURMAS_ESCOLA = [
  '2° A - MANHÃ',
  '2° B - MANHÃ',
  '2° C - MANHÃ',
  '3° A - MANHÃ',
  '3° B - MANHÃ',
  '3° C - MANHÃ',
  '3° D - MANHÃ',
  '3° E - TARDE',
  '3° F - TARDE',
  '3° G - TARDE',
  'Sem Turma'
];

export default function ValidacaoRapidaView({ 
  redacoes = [], 
  onSelectRedacao, 
  onRedacaoUpdated,
  onRefresh
}) {
  const [estudantes, setEstudantes] = useState([]);
  const [isLoadingEstudantes, setIsLoadingEstudantes] = useState(false);
  const [viewMode, setViewMode] = useState('esteira'); // 'esteira' | 'tabela'
  
  // Filtros
  const [filterType, setFilterType] = useState('todas'); // 'todas' | 'pendentes' | 'vinculadas'
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado Esteira
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualNome, setManualNome] = useState('');
  const [manualTurma, setManualTurma] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Carregar lista de estudantes uma única vez para cache local rápido
  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      setIsLoadingEstudantes(true);
      try {
        const list = await authService.fetchEstudantes();
        if (isMounted) setEstudantes(list || []);
      } catch (err) {
        console.warn('Erro ao carregar estudantes para validação rápida:', err);
      } finally {
        if (isMounted) setIsLoadingEstudantes(false);
      }
    }
    loadStudents();
    return () => { isMounted = false; };
  }, []);

  // Lista filtrada de redações
  const filteredRedacoes = useMemo(() => {
    return redacoes.filter(r => {
      const hasStudent = Boolean(r.user_id && r.nome_aluno);
      if (filterType === 'pendentes' && hasStudent) return false;
      if (filterType === 'vinculadas' && !hasStudent) return false;
      
      const turma = (r.turma_aluno || r.extracted_data?.turma || '').toLowerCase();
      if (selectedTurmaFilter !== 'todas' && turma !== selectedTurmaFilter.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nome = (r.nome_aluno || '').toLowerCase();
        const idStr = String(r.id);
        return nome.includes(q) || turma.includes(q) || idStr.includes(q);
      }

      return true;
    });
  }, [redacoes, filterType, selectedTurmaFilter, searchQuery]);

  // Redação atual na esteira
  const currentRedacao = filteredRedacoes[currentIndex] || null;

  // Sincronizar campos quando a redação atual mudar na esteira
  useEffect(() => {
    if (currentRedacao) {
      setSelectedStudentId(currentRedacao.user_id ? String(currentRedacao.user_id) : '');
      setManualNome(currentRedacao.nome_aluno || currentRedacao.extracted_data?.aluno || '');
      setManualTurma(currentRedacao.turma_aluno || currentRedacao.extracted_data?.turma || 'Sem Turma');
      setStudentSearch('');
    }
  }, [currentRedacao]);

  // Lista filtrada de estudantes para autocomplete
  const filteredEstudantesOptions = useMemo(() => {
    if (!studentSearch.trim()) return estudantes.slice(0, 50);
    const q = studentSearch.toLowerCase().trim();
    return estudantes.filter(e => 
      (e.nome || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.turma || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [estudantes, studentSearch]);

  // Salvar validação da redação atual
  const handleSaveAndNext = async () => {
    if (!currentRedacao) return;

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        user_id: selectedStudentId ? Number(selectedStudentId) : null,
        nome_aluno: manualNome.trim() || 'Estudante Não Identificado',
        turma_aluno: manualTurma.trim() || 'Sem Turma'
      };

      // Atualização otimista imediata no componente pai
      if (onRedacaoUpdated) {
        onRedacaoUpdated({
          ...currentRedacao,
          user_id: payload.user_id,
          nome_aluno: payload.nome_aluno,
          turma_aluno: payload.turma_aluno,
          nome_detectado: true
        });
      }

      // Envia em segundo plano para o servidor
      await authService.vincularAluno(currentRedacao.id, payload);

      setFeedbackMsg(`Redação #${currentRedacao.id} validada com sucesso!`);
      setTimeout(() => setFeedbackMsg(null), 3000);

      // Avança para a próxima automaticamente
      if (currentIndex < filteredRedacoes.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err) {
      console.error('Erro ao salvar validação:', err);
      setFeedbackMsg(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectStudent = (st) => {
    setSelectedStudentId(String(st.id));
    setManualNome(st.nome);
    if (st.turma) setManualTurma(st.turma);
    setStudentSearch('');
  };

  // Contadores rápidos
  const totalCount = redacoes.length;
  const vinculadasCount = redacoes.filter(r => r.user_id && r.nome_aluno).length;
  const pendentesCount = totalCount - vinculadasCount;
  const percentualConcluido = totalCount > 0 ? Math.round((vinculadasCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header Principal */}
      <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#9fc9a2] bg-[#9fc9a2]/15 text-[#1f8a65]">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Validação Pedagógica de Alunos</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#26251e] tracking-tight">
              Conferência de Alunos & Turmas
            </h2>
            <p className="text-xs text-[#807d72] max-w-2xl leading-relaxed">
              Verifique rapidamente os nomes e turmas detectados pela IA em cada redação para garantir que as notas caiam no portal correto de cada aluno.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 bg-[#fafaf7] border border-[#e6e5e0] p-3 rounded-lg text-xs font-mono shrink-0">
            <div>
              <span className="text-[10px] text-[#807d72] block uppercase">Validadas</span>
              <strong className="text-[#1f8a65] text-sm">{vinculadasCount} / {totalCount}</strong>
            </div>
            <div className="h-6 w-px bg-[#e6e5e0]" />
            <div>
              <span className="text-[10px] text-[#807d72] block uppercase">Progresso</span>
              <strong className="text-[#26251e] text-sm">{percentualConcluido}%</strong>
            </div>
            <div className="h-6 w-px bg-[#e6e5e0]" />
            <div>
              <span className="text-[10px] text-[#807d72] block uppercase">Pendentes</span>
              <strong className="text-[#f54e00] text-sm">{pendentesCount}</strong>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-[#e6e5e0] h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#1f8a65] h-full transition-all duration-500 rounded-full"
            style={{ width: `${percentualConcluido}%` }}
          />
        </div>
      </div>

      {/* Barra de Filtros e Modo de Visualização */}
      <div className="bg-[#fafaf7] border border-[#e6e5e0] p-3.5 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        
        {/* Toggle Modo Esteira / Modo Tabela */}
        <div className="flex items-center gap-1 bg-[#ffffff] border border-[#e6e5e0] p-1 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('esteira')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === 'esteira' ? 'bg-[#26251e] text-white shadow-xs' : 'text-[#807d72] hover:text-[#26251e]'
            }`}
          >
            Modo Esteira (Foco 1 por 1)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tabela')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              viewMode === 'tabela' ? 'bg-[#26251e] text-white shadow-xs' : 'text-[#807d72] hover:text-[#26251e]'
            }`}
          >
            Modo Tabela (Lista Completa)
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentIndex(0); }}
            className="bg-[#ffffff] border border-[#e6e5e0] px-2.5 py-1.5 rounded-md text-xs text-[#26251e] focus:outline-none cursor-pointer"
          >
            <option value="todas">Todas as Redações ({redacoes.length})</option>
            <option value="pendentes">Apenas Sem Aluno Vinculado ({pendentesCount})</option>
            <option value="vinculadas">Apenas Vinculadas ({vinculadasCount})</option>
          </select>

          {/* Turma Filter */}
          <select
            value={selectedTurmaFilter}
            onChange={(e) => { setSelectedTurmaFilter(e.target.value); setCurrentIndex(0); }}
            className="bg-[#ffffff] border border-[#e6e5e0] px-2.5 py-1.5 rounded-md text-xs text-[#26251e] focus:outline-none cursor-pointer"
          >
            <option value="todas">Todas as Turmas</option>
            {TURMAS_ESCOLA.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Busca */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#807d72] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar redação..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
              className="pl-8 pr-2.5 py-1.5 bg-[#ffffff] border border-[#e6e5e0] rounded-md text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] w-40 sm:w-48"
            />
          </div>
        </div>

      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-3 bg-[#9fc9a2]/20 border border-[#9fc9a2] text-[#1f8a65] text-xs font-mono font-medium rounded-lg flex items-center justify-between animate-fadeIn">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-[#1f8a65] font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODO 1: ESTEIRA RÁPIDA (FOCO PASSO A PASSO 1 POR 1)      */}
      {/* ======================================================== */}
      {viewMode === 'esteira' && (
        filteredRedacoes.length === 0 ? (
          <div className="p-12 text-center bg-[#ffffff] border border-[#e6e5e0] rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#1f8a65] mx-auto" />
            <h3 className="text-sm font-semibold text-[#26251e]">Nenhuma redação pendente com os filtros selecionados</h3>
            <p className="text-xs text-[#807d72]">Todas as correções deste filtro já foram validadas ou não foram encontradas.</p>
          </div>
        ) : currentRedacao && (
          <div className="space-y-4">
            
            {/* Navegador da Esteira */}
            <div className="flex items-center justify-between bg-[#ffffff] border border-[#e6e5e0] p-3 rounded-xl shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#807d72]">Redação</span>
                <span className="px-2 py-0.5 rounded bg-[#26251e] text-white font-mono font-bold text-xs">
                  {currentIndex + 1} de {filteredRedacoes.length}
                </span>
                <span className="text-xs font-mono text-[#807d72]">ID #{currentRedacao.id}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="px-2.5 py-1.5 border border-[#e6e5e0] bg-[#ffffff] hover:bg-[#fafaf7] text-[#26251e] text-xs rounded-md disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={currentIndex >= filteredRedacoes.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="px-2.5 py-1.5 border border-[#e6e5e0] bg-[#ffffff] hover:bg-[#fafaf7] text-[#26251e] text-xs rounded-md disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card Central de Validação */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Lado Esquerdo (6 Colunas): Resumo da Redação */}
              <div className="lg:col-span-6 bg-[#ffffff] border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e6e5e0]">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#807d72] block">Redação Avaliada</span>
                      <h3 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                        <span>ID #{currentRedacao.id}</span>
                        <span className="text-xs font-mono font-normal text-[#807d72]">
                          • {new Date(currentRedacao.data_captura).toLocaleDateString('pt-BR')}
                        </span>
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-[#807d72] block">Nota ENEM</span>
                      <span className="text-xl font-black font-mono text-[#f54e00]">
                        {currentRedacao.nota_final} pts
                      </span>
                    </div>
                  </div>

                  {/* Informações extraídas originalmente pelo OCR */}
                  <div className="bg-[#fafaf7] border border-[#e6e5e0] p-3.5 rounded-lg space-y-2 text-xs">
                    <div className="text-[10px] font-mono uppercase font-bold text-[#a09c92]">
                      Dados Lidos no Cabeçalho pela IA:
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        <span className="text-[#807d72] block text-[10px]">Nome Lido:</span>
                        <strong className="text-[#26251e] truncate block">
                          {currentRedacao.extracted_data?.aluno || currentRedacao.nome_aluno || 'Não identificado'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#807d72] block text-[10px]">Turma Lida:</span>
                        <strong className="text-[#26251e] truncate block">
                          {currentRedacao.extracted_data?.turma || currentRedacao.turma_aluno || 'Geral'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Trecho Transcrito da Redação para Conferência */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono font-medium text-[#807d72] uppercase block">
                      Início da Transcrição do Aluno:
                    </span>
                    <div className="p-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-lg text-xs font-serif text-[#5a5852] leading-relaxed max-h-44 overflow-y-auto custom-scrollbar italic">
                      "{currentRedacao.texto_digitado || currentRedacao.extracted_data?.texto_transcrito || 'Texto não transcrito.'}"
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e6e5e0] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectRedacao && onSelectRedacao(currentRedacao)}
                    className="text-xs font-medium text-[#f54e00] hover:underline flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Ver Avaliação Pedagógica Completa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lado Direito (6 Colunas): Formulário de Vinculação & Validação */}
              <div className="lg:col-span-6 bg-[#ffffff] border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xs">
                <div>
                  <h4 className="text-sm font-semibold text-[#26251e] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1f8a65]" />
                    <span>Confirmar Estudante Oficial</span>
                  </h4>
                  <p className="text-xs text-[#807d72]">
                    Selecione o aluno oficial cadastrado ou ajuste o nome e a turma manualmente.
                  </p>
                </div>

                {/* Busca e Seleção de Aluno com Autocomplete */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-[#26251e] block">
                    1. Vincular Aluno da Escola:
                  </label>
                  
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#807d72] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar entre os 700+ alunos da escola..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#ffffff] border border-[#e6e5e0] rounded-md text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e]"
                    />
                  </div>

                  {/* Dropdown de sugestões */}
                  {studentSearch.trim() && (
                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-[#e6e5e0] rounded-md bg-[#ffffff] divide-y divide-[#f1f5f9] shadow-md">
                      {filteredEstudantesOptions.length === 0 ? (
                        <div className="p-2.5 text-xs text-[#807d72] font-mono text-center">
                          Nenhum aluno encontrado com "{studentSearch}".
                        </div>
                      ) : (
                        filteredEstudantesOptions.map(st => (
                          <div
                            key={st.id}
                            onClick={() => handleSelectStudent(st)}
                            className="p-2 hover:bg-[#fafaf7] cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <strong className="text-[#26251e] block">{st.nome}</strong>
                              <span className="text-[10px] text-[#807d72] font-mono">{st.email}</span>
                            </div>
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#e6e5e0] text-[#26251e]">
                              {st.turma || 'Sem Turma'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Campos Manuais Editáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#807d72] block">
                      Nome do Aluno:
                    </label>
                    <input
                      type="text"
                      value={manualNome}
                      onChange={(e) => setManualNome(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fafaf7] border border-[#e6e5e0] rounded-md text-xs text-[#26251e] font-semibold focus:outline-none focus:border-[#26251e]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#807d72] block">
                      Turma do Aluno:
                    </label>
                    <select
                      value={manualTurma}
                      onChange={(e) => setManualTurma(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fafaf7] border border-[#e6e5e0] rounded-md text-xs text-[#26251e] font-semibold focus:outline-none focus:border-[#26251e] cursor-pointer"
                    >
                      {TURMAS_ESCOLA.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status do Vínculo Atual */}
                <div className="p-3 rounded-lg border text-xs font-mono flex items-center justify-between bg-[#fafaf7] border-[#e6e5e0]">
                  <span className="text-[#807d72]">Conta Vinculada:</span>
                  {selectedStudentId ? (
                    <span className="text-[#1f8a65] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ID de Usuário #{selectedStudentId}
                    </span>
                  ) : (
                    <span className="text-[#c08532] font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Vínculo Manual
                    </span>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="pt-3 border-t border-[#e6e5e0] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentIndex < filteredRedacoes.length - 1) {
                        setCurrentIndex(prev => prev + 1);
                      }
                    }}
                    className="px-4 py-2 bg-[#ffffff] border border-[#e6e5e0] text-[#5a5852] hover:text-[#26251e] text-xs font-medium rounded-md transition-colors cursor-pointer"
                  >
                    Pular
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || !manualNome.trim()}
                    onClick={handleSaveAndNext}
                    className="px-5 py-2 bg-[#1f8a65] hover:bg-[#187052] text-white text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Confirmar & Próxima</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )
      )}

      {/* ======================================================== */}
      {/* MODO 2: TABELA GERAL DE VALIDAÇÃO (EM LOTE)              */}
      {/* ======================================================== */}
      {viewMode === 'tabela' && (
        <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#e6e5e0] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#26251e] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#1f8a65]" />
              <span>Lista de Correções para Validação</span>
            </h3>
            <span className="text-xs font-mono text-[#807d72]">
              {filteredRedacoes.length} redações listadas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e5e0] bg-[#fafaf7] text-[#807d72] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">ID</th>
                  <th className="py-3 px-4">Estudante Detectado / Vinculado</th>
                  <th className="py-3 px-4">Turma</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Nota Final</th>
                  <th className="py-3 px-4 text-center w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filteredRedacoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#807d72] font-mono">
                      Nenhuma redação encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredRedacoes.map((r, idx) => {
                    const isLinked = Boolean(r.user_id && r.nome_aluno);
                    return (
                      <tr key={r.id} className="hover:bg-[#fafaf7] transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#807d72]">
                          #{r.id}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#26251e]">
                            {r.nome_aluno || r.extracted_data?.aluno || 'Estudante Não Identificado'}
                          </div>
                          {r.user_id && (
                            <span className="text-[10px] font-mono text-[#1f8a65]">
                              ID de Usuário: #{r.user_id}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#5a5852]">
                          {r.turma_aluno || r.extracted_data?.turma || 'Sem Turma'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isLinked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#9fc9a2]/30 border border-[#9fc9a2] text-[#1f8a65]">
                              Vinculado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#dfa88f]/30 border border-[#dfa88f] text-[#f54e00]">
                              Pendente
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#f54e00]">
                          {r.nota_final} pts
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('esteira');
                              setCurrentIndex(idx);
                            }}
                            className="px-2.5 py-1 bg-[#ffffff] border border-[#e6e5e0] hover:border-[#26251e] text-[#26251e] text-[11px] font-mono rounded transition-colors cursor-pointer"
                          >
                            Conferir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
