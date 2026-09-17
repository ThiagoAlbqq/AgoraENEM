import React from 'react';
import { FileText, UserX, Award, Trash2, ChevronRight, AlertTriangle, Compass, CheckCircle2, Clock } from 'lucide-react';

export default function RedacoesTableView({ redacoes, filterTab, setFilterTab, onSelectRedacao, onDeleteRedacao, searchQuery }) {
  
  const filteredRedacoes = redacoes.filter((item) => {
    const ext = item.extracted_data || {};
    const aluno = item.nome_aluno || ext.aluno || '';
    const turma = item.turma_aluno || ext.turma || '';
    const idStr = String(item.id);

    const matchesSearch = !searchQuery.trim() || 
      aluno.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turma.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idStr.includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterTab === 'identificadas') return item.nome_detectado && item.nome_aluno;
    if (filterTab === 'sem_nome') return !item.nome_detectado || !item.nome_aluno;
    if (filterTab === 'excelentes') return item.nota_final >= 800;
    if (filterTab === 'baixas') return item.is_synced && item.nota_final < 600;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Table Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#ffffff] border border-[#e6e5e0] p-4 rounded-xl">
        <div>
          <h3 className="text-base font-normal text-[#26251e] tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-[#f54e00]" />
            Repositório Geral de Redações ({filteredRedacoes.length})
          </h3>
          <p className="text-xs text-[#807d72]">
            Tabela analítica de acompanhamento de alunos e notas ENEM / Sisedu
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setFilterTab('todas')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filterTab === 'todas'
                ? 'bg-[#26251e] text-white border-[#26251e]'
                : 'bg-[#fafaf7] border-[#e6e5e0] text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            Todas ({redacoes.length})
          </button>
          <button
            onClick={() => setFilterTab('identificadas')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filterTab === 'identificadas'
                ? 'bg-[#9fc9a2] text-[#26251e] border-[#9fc9a2]'
                : 'bg-[#fafaf7] border-[#e6e5e0] text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            Com Nome
          </button>
          <button
            onClick={() => setFilterTab('sem_nome')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1 ${
              filterTab === 'sem_nome'
                ? 'bg-[#dfa88f] text-[#26251e] border-[#dfa88f]'
                : 'bg-[#fafaf7] border-[#e6e5e0] text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#26251e]" />
            ⚠️ Sem Nome Guardadas
          </button>
          <button
            onClick={() => setFilterTab('excelentes')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filterTab === 'excelentes'
                ? 'bg-[#c08532] text-white border-[#c08532]'
                : 'bg-[#fafaf7] border-[#e6e5e0] text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            800+ pts
          </button>
        </div>
      </div>

      {/* Responsive Container: Mobile Cards (<md) vs Enterprise Table (>=md) */}
      <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl overflow-hidden shadow-none">
        
        {/* MOBILE CARD VIEW (<768px) */}
        <div className="block md:hidden divide-y divide-[#e6e5e0]">
          {filteredRedacoes.length === 0 ? (
            <div className="p-8 text-center text-[#807d72]">
              <FileText className="w-8 h-8 mx-auto mb-2 text-[#a09c92]" />
              Nenhuma redação encontrada para os filtros selecionados.
            </div>
          ) : (
            filteredRedacoes.map((item) => {
              const isIdentified = item.nome_detectado && item.nome_aluno;
              const ext = item.extracted_data || {};
              const enemScore = ext.avaliacoes?.enem?.nota_total_enem ?? item.nota_final;

              return (
                <div
                  key={item.id}
                  onClick={() => item.is_synced && onSelectRedacao(item)}
                  className={`p-4 space-y-3 hover:bg-[#fafaf7] transition-colors ${
                    item.is_synced ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#26251e]">
                        #{String(item.id).padStart(4, '0')}
                      </span>
                      {item.is_synced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#9fc9a2] text-[#26251e] text-[9px] font-mono font-medium">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          CORRIGIDO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dfa88f] text-[#26251e] text-[9px] font-mono font-medium">
                          <Clock className="w-2.5 h-2.5" />
                          PENDENTE
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {item.is_synced && enemScore !== null && enemScore !== undefined ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#e6e5e0] text-[#26251e] font-bold font-mono text-xs">
                          {enemScore} pts
                        </span>
                      ) : (
                        <span className="text-[#a09c92] font-mono text-xs">—</span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isIdentified ? (
                      <div className="font-semibold text-sm text-[#26251e]">
                        {item.nome_aluno}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#26251e] bg-[#dfa88f] px-2 py-0.5 rounded-full">
                        <UserX className="w-3 h-3 text-[#26251e]" />
                        Sem Nome (Guardada)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#807d72] font-mono pt-1 border-t border-[#f0efe9]">
                    <div className="flex items-center gap-3">
                      <span>Turma: <strong className="text-[#26251e]">{item.turma_aluno || ext.turma || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>{new Date(item.data_captura).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => item.is_synced && onSelectRedacao(item)}
                        className="p-1 text-[#807d72] hover:text-[#26251e]"
                        title="Ver Boletim"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRedacao(item.id)}
                        className="p-1 text-[#a09c92] hover:text-[#cf2d56]"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>=768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#fafaf7] border-b border-[#e6e5e0] text-[#807d72] uppercase font-mono text-[11px] tracking-wider">
                <th className="p-3.5 pl-4">ID</th>
                <th className="p-3.5">Aluno</th>
                <th className="p-3.5">Turma</th>
                <th className="p-3.5">Data Envio</th>
                <th className="p-3.5 text-center">Nota ENEM</th>
                <th className="p-3.5 text-center">Matriz Sisedu</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e5e0]">
              {filteredRedacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#807d72]">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#a09c92]" />
                    Nenhuma redação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRedacoes.map((item) => {
                  const isIdentified = item.nome_detectado && item.nome_aluno;
                  const ext = item.extracted_data || {};
                  const enemScore = ext.avaliacoes?.enem?.nota_total_enem ?? item.nota_final;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => item.is_synced && onSelectRedacao(item)}
                      className={`hover:bg-[#fafaf7] transition-colors ${
                        item.is_synced ? 'cursor-pointer' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="p-3.5 pl-4 font-mono font-bold text-[#26251e]">
                        #{String(item.id).padStart(4, '0')}
                      </td>

                      {/* Aluno */}
                      <td className="p-3.5">
                        {isIdentified ? (
                          <div className="font-semibold text-[#26251e] truncate max-w-[180px]">
                            {item.nome_aluno}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#26251e] bg-[#dfa88f] px-2 py-0.5 rounded-full">
                            <UserX className="w-3 h-3 text-[#26251e]" />
                            Sem Nome (Guardada)
                          </span>
                        )}
                      </td>

                      {/* Turma */}
                      <td className="p-3.5 text-[#5a5852] font-mono">
                        {item.turma_aluno || ext.turma ? (
                          <span className="bg-[#e6e5e0] px-2 py-0.5 rounded text-[11px] text-[#26251e]">
                            {item.turma_aluno || ext.turma}
                          </span>
                        ) : (
                          <span className="text-[#a09c92] italic">N/A</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="p-3.5 font-mono text-[#807d72] text-[11px]">
                        {new Date(item.data_captura).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Nota ENEM */}
                      <td className="p-3.5 text-center font-mono">
                        {item.is_synced && enemScore !== null && enemScore !== undefined ? (
                          <span className="px-3 py-1 rounded-full bg-[#e6e5e0] text-[#26251e] font-bold text-xs inline-block">
                            {enemScore} pts
                          </span>
                        ) : (
                          <span className="text-[#a09c92] font-mono">—</span>
                        )}
                      </td>

                      {/* Sisedu */}
                      <td className="p-3.5 text-center">
                        {item.is_synced ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#9fbbe0] text-[#26251e] text-[10px] font-mono font-medium">
                            <Compass className="w-3 h-3 text-[#26251e]" />
                            Avaliado
                          </span>
                        ) : (
                          <span className="text-[#a09c92] font-mono">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {item.is_synced ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#9fc9a2] text-[#26251e] text-[10px] font-mono font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            CORRIGIDO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dfa88f] text-[#26251e] text-[10px] font-mono font-medium">
                            <Clock className="w-3 h-3" />
                            PENDENTE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => item.is_synced && onSelectRedacao(item)}
                            className="p-1.5 text-[#807d72] hover:text-[#26251e] transition-colors"
                            title="Ver Boletim"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRedacao(item.id)}
                            className="p-1.5 text-[#a09c92] hover:text-[#cf2d56] transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
