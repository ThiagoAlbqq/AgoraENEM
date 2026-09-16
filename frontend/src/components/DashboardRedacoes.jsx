import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { syncOfflineDocuments } from '../services/syncService';
import { db, deleteRedacao } from '../db/db';
import ModalDetalhesRedacao from './ModalDetalhesRedacao';
import { Sparkles, Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, FileText, UserX, Award, Trash2, ChevronRight, AlertTriangle, Compass } from 'lucide-react';

export default function DashboardRedacoes({ refreshTrigger, onRefresh }) {
  const isOnline = useNetworkStatus();
  const [redacoes, setRedacoes] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRedacao, setSelectedRedacao] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [filterTab, setFilterTab] = useState('todas');

  const loadRedacoes = async () => {
    try {
      const allDocs = await db.redacoes.orderBy('data_captura').reverse().toArray();
      setRedacoes(allDocs);
    } catch (error) {
      console.error('Falha ao carregar redações:', error);
    }
  };

  useEffect(() => {
    loadRedacoes();
  }, [refreshTrigger]);

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const response = await syncOfflineDocuments();
      setSyncFeedback({
        type: response.successCount > 0 ? 'success' : 'info',
        message: response.message
      });
      loadRedacoes();
      if (onRefresh) onRefresh();
    } catch (error) {
      setSyncFeedback({
        type: 'error',
        message: `Falha no processamento: ${error.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja remover esta redação?')) {
      await deleteRedacao(id);
      loadRedacoes();
      if (onRefresh) onRefresh();
    }
  };

  // Metrics calculations
  const totalCount = redacoes.length;
  const pendingCount = redacoes.filter(r => !r.is_synced).length;
  const unidentifiedCount = redacoes.filter(r => r.is_synced && (!r.nome_detectado || !r.nome_aluno)).length;
  const identifiedCount = redacoes.filter(r => r.is_synced && r.nome_detectado && r.nome_aluno).length;

  const correctedList = redacoes.filter(r => r.is_synced && r.nota_final !== null && r.nota_final !== undefined);
  const avgScore = correctedList.length > 0
    ? Math.round(correctedList.reduce((acc, r) => acc + (r.nota_final || 0), 0) / correctedList.length)
    : 0;

  // Filtering list based on tab
  const filteredRedacoes = redacoes.filter(r => {
    if (filterTab === 'identificadas') return r.nome_detectado && r.nome_aluno;
    if (filterTab === 'sem_nome') return !r.nome_detectado || !r.nome_aluno;
    if (filterTab === 'excelentes') return r.nota_final >= 800;
    if (filterTab === 'baixas') return r.is_synced && r.nota_final < 600;
    return true;
  });

  const getNotaBadgeClass = (score) => {
    if (score >= 900) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 800) return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    if (score >= 600) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="space-y-4 text-slate-100">
      
      {/* Top Banner / Dashboard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Painel de Avaliação Cruzada (ENEM x Sisedu)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Correção automatizada via IA (Matriz ENEM + Rubricas Qualitativas Sisedu Projeto Ágora)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOnline ? (
              <span className="h-7 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Wifi className="w-3.5 h-3.5" />
                ONLINE
              </span>
            ) : (
              <span className="h-7 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <WifiOff className="w-3.5 h-3.5" />
                OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total de Redações</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{totalCount}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Média Geral ENEM</div>
            <div className="text-2xl font-black text-indigo-400 font-mono mt-0.5">
              {avgScore > 0 ? avgScore : '—'} <span className="text-xs text-slate-500 font-normal">pts</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Com Aluno Identificado</div>
            <div className="text-2xl font-black text-teal-400 font-mono mt-0.5">{identifiedCount}</div>
          </div>

          <div className={`p-3 rounded-xl border transition-all ${
            unidentifiedCount > 0 
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' 
              : 'bg-slate-950/60 border-slate-800/80'
          }`}>
            <div className="text-[10px] uppercase font-bold tracking-wider flex items-center justify-between text-amber-400">
              <span>⚠️ Sem Nome (Guardadas)</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-300 mt-0.5">{unidentifiedCount}</div>
          </div>
        </div>
      </div>

      {/* Sync Action & Queue Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Fila de Correção por IA (ENEM x Sisedu)
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            {pendingCount === 0 
              ? 'Todas as redações cadastradas foram avaliadas.' 
              : `${pendingCount} redação(ões) aguardando processamento.`}
          </p>
        </div>

        <button
          type="button"
          disabled={!isOnline || isSyncing || pendingCount === 0}
          onClick={handleSync}
          className={`h-11 px-5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isOnline && pendingCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Avaliando Redações...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Corrigir Redações ({pendingCount})
            </>
          )}
        </button>
      </div>

      {/* Sync Feedback Alert */}
      {syncFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs leading-tight animate-fadeIn ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="font-bold uppercase block text-[10px] tracking-wide mb-0.5">Notificação de Avaliação</span>
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setFilterTab('todas')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
            filterTab === 'todas'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Todas ({totalCount})
        </button>
        <button
          onClick={() => setFilterTab('identificadas')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
            filterTab === 'identificadas'
              ? 'bg-teal-600/20 border-teal-500 text-teal-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Com Nome ({identifiedCount})
        </button>
        <button
          onClick={() => setFilterTab('sem_nome')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors flex items-center gap-1 ${
            filterTab === 'sem_nome'
              ? 'bg-amber-600/20 border-amber-500 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ⚠️ Sem Nome Guardadas ({unidentifiedCount})
        </button>
        <button
          onClick={() => setFilterTab('excelentes')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
            filterTab === 'excelentes'
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Excelentes (800+)
        </button>
      </div>

      {/* Redações List */}
      <div className="space-y-3">
        {filteredRedacoes.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-bold text-sm text-slate-300">Nenhuma redação encontrada nesta visualização.</p>
            <p className="text-xs text-slate-500">Envie novas redações no módulo lateral para iniciar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredRedacoes.map((item) => {
              const isIdentified = item.nome_detectado && item.nome_aluno;
              const ext = item.extracted_data || {};
              const enemScore = ext.avaliacoes?.enem?.nota_total_enem ?? item.nota_final;

              return (
                <div
                  key={item.id}
                  onClick={() => item.is_synced && setSelectedRedacao(item)}
                  className={`bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 ${
                    item.is_synced ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                        {item.imagem_base64 ? (
                          <img src={item.imagem_base64} alt="Folha Redação" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isIdentified ? (
                            <span className="font-bold text-sm text-white truncate max-w-[200px]">
                              {item.nome_aluno}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              <UserX className="w-3 h-3 text-amber-400" />
                              Nome Não Identificado
                            </span>
                          )}

                          {(item.turma_aluno || ext.turma) && (
                            <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                              {item.turma_aluno || ext.turma}
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            ID #{String(item.id).padStart(4, '0')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 truncate max-w-[320px]">
                          {ext.texto_transcrito ? ext.texto_transcrito.substring(0, 70) + '...' : (item.tipo_input === 'texto' ? 'Redação Digitada' : 'Aguardando avaliação...')}
                        </p>
                      </div>
                    </div>

                    {/* Right: Scores & Actions */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                      {item.is_synced ? (
                        <div className="flex items-center gap-3">
                          {/* Grade Badge */}
                          {enemScore !== null && enemScore !== undefined && (
                            <div className={`px-3 py-1.5 rounded-xl border text-center font-mono ${getNotaBadgeClass(enemScore)}`}>
                              <div className="text-[9px] uppercase font-bold opacity-80">ENEM</div>
                              <div className="text-lg font-black">{enemScore}</div>
                            </div>
                          )}

                          {/* Sisedu Badge */}
                          <div className="px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] font-mono font-semibold flex items-center gap-1">
                            <Compass className="w-3 h-3 text-teal-400" />
                            Sisedu OK
                          </div>

                          <div className="flex items-center gap-1">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          </div>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          PENDENTE
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-2 text-slate-600 hover:text-rose-400 transition-colors"
                        title="Excluir Redação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Modal */}
      {selectedRedacao && (
        <ModalDetalhesRedacao
          redacao={selectedRedacao}
          onClose={() => setSelectedRedacao(null)}
          onUpdated={() => {
            loadRedacoes();
            setSelectedRedacao(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}

    </div>
  );
}
