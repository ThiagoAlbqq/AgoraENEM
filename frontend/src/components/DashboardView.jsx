import React from 'react';
import { Award, Compass, Sparkles, UserCheck, AlertTriangle, FileText, ChevronRight } from 'lucide-react';

export default function DashboardView({ redacoes, onSelectRedacao, onNavigateToUpload }) {
  const totalCount = redacoes.length;
  const correctedList = redacoes.filter(r => r.is_synced && r.nota_final !== null && r.nota_final !== undefined);
  
  const avgScore = correctedList.length > 0
    ? Math.round(correctedList.reduce((acc, r) => acc + (r.nota_final || 0), 0) / correctedList.length)
    : 0;

  const identifiedCount = redacoes.filter(r => r.is_synced && r.nome_detectado && r.nome_aluno).length;
  const unidentifiedCount = redacoes.filter(r => r.is_synced && (!r.nome_detectado || !r.nome_aluno)).length;

  // Compute average per ENEM competency C1-C5
  const calcCompAvg = (key) => {
    if (correctedList.length === 0) return 0;
    const sum = correctedList.reduce((acc, r) => {
      const c = r.extracted_data?.avaliacoes?.enem?.[key];
      return acc + (c?.nota || 0);
    }, 0);
    return Math.round(sum / correctedList.length);
  };

  const compStats = [
    { label: 'C1 - Norma Culta', avg: calcCompAvg('competencia_1'), color: '#dfa88f' }, // Peach
    { label: 'C2 - Tema & Repertório', avg: calcCompAvg('competencia_2'), color: '#9fc9a2' }, // Mint
    { label: 'C3 - Argumentação', avg: calcCompAvg('competencia_3'), color: '#9fbbe0' }, // Pastel Blue
    { label: 'C4 - Coesão', avg: calcCompAvg('competencia_4'), color: '#c0a8dd' }, // Lavender
    { label: 'C5 - Intervenção', avg: calcCompAvg('competencia_5'), color: '#c08532' } // Warm Gold
  ];

  return (
    <div className="space-y-6">
      
      {/* Hero Band / Editorial Welcome */}
      <div className="bg-[#ffffff] border border-[#e6e5e0] rounded-xl p-4 sm:p-8 shadow-none relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-medium bg-[#e6e5e0] text-[#26251e] mb-2 sm:mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#f54e00]" />
              Multi-Agente IA (Vision OCR + Evaluator)
            </div>
            <h2 className="text-xl sm:text-3xl font-normal text-[#26251e] tracking-tight">
              Painel Geral de Desempenho
            </h2>
            <p className="text-xs sm:text-sm text-[#5a5852] mt-1 max-w-xl leading-relaxed">
              Análise textual cruzada baseada na Matriz do ENEM (0-1000) e Rubricas Qualitativas Sisedu (Projeto Ágora Escolar).
            </p>
          </div>

          <button
            onClick={onNavigateToUpload}
            className="w-full sm:w-auto px-5 py-3 bg-[#f54e00] hover:bg-[#d04200] text-white font-medium text-xs uppercase tracking-wider rounded-md transition-all shrink-0 cursor-pointer text-center"
          >
            + Nova Correção em Lote
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards (White cards, hairline borders, timeline pastels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#ffffff] border border-[#e6e5e0] p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between text-[#807d72] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Redações</span>
            <FileText className="w-4 h-4 text-[#807d72]" />
          </div>
          <div className="text-2xl sm:text-3xl font-normal font-mono text-[#26251e]">{totalCount}</div>
          <div className="text-xs text-[#807d72] mt-1 font-mono">{correctedList.length} corrigidas com sucesso</div>
        </div>

        <div className="bg-[#ffffff] border border-[#e6e5e0] p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between text-[#807d72] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Média Geral ENEM</span>
            <Award className="w-4 h-4 text-[#f54e00]" />
          </div>
          <div className="text-2xl sm:text-3xl font-normal font-mono text-[#f54e00]">{avgScore > 0 ? avgScore : '—'}</div>
          <div className="text-xs text-[#807d72] mt-1 font-mono">escala 0 a 1000 pontos</div>
        </div>

        <div className="bg-[#ffffff] border border-[#e6e5e0] p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between text-[#807d72] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alunos Identificados</span>
            <UserCheck className="w-4 h-4 text-[#1f8a65]" />
          </div>
          <div className="text-2xl sm:text-3xl font-normal font-mono text-[#26251e]">{identifiedCount}</div>
          <div className="text-xs text-[#807d72] mt-1 font-mono">vinculados a nome e turma</div>
        </div>

        <div className="bg-[#ffffff] border border-[#e6e5e0] p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between text-[#26251e] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sem Nome (Guardadas)</span>
            <AlertTriangle className="w-4 h-4 text-[#c08532]" />
          </div>
          <div className="text-2xl sm:text-3xl font-normal font-mono text-[#26251e]">{unidentifiedCount}</div>
          <div className="text-xs text-[#807d72] mt-1 font-mono">necessitam atribuição de nome</div>
        </div>
      </div>

      {/* ENEM Competencies Average Chart (Signature AI Pastel Timeline Palette) */}
      <div className="bg-[#ffffff] border border-[#e6e5e0] p-4 sm:p-6 rounded-xl space-y-4">
        <h3 className="text-base sm:text-lg font-normal text-[#26251e] tracking-tight flex items-center gap-2">
          <Award className="w-4 h-4 text-[#f54e00]" />
          Média Geral por Competência do ENEM (C1 a C5)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {compStats.map((item, idx) => (
            <div key={idx} className="bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-[#26251e] truncate">{item.label}</div>
              <div className="text-xl font-normal font-mono text-[#26251e]">
                {item.avg} <span className="text-xs text-[#807d72] font-mono">/ 200</span>
              </div>
              <div className="w-full bg-[#e6e5e0] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(item.avg / 200) * 100}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class Comparison Panel (Desempenho Comparativo por Turma) */}
      <div className="bg-[#ffffff] border border-[#e6e5e0] p-6 rounded-xl space-y-4">
        <h3 className="text-lg font-normal text-[#26251e] tracking-tight flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#807d72]" />
          Desempenho Comparativo por Turma Escolar
        </h3>

        {(() => {
          const normalizeTurmaName = (rawName) => {
            if (!rawName || typeof rawName !== 'string') return 'Sem Turma Definida';
            let cleaned = rawName.trim();
            if (!cleaned) return 'Sem Turma Definida';
            
            // Standardize degree symbol ° (U+00B0) and ordinal º (U+00BA)
            cleaned = cleaned.replace(/[°º]/g, 'º');
            
            // Standardize spacing (e.g., "3º G" -> "3º G", "3ºG" -> "3º G")
            cleaned = cleaned.replace(/(\d+)\s*º\s*([a-zA-Z])/gi, '$1º $2');
            cleaned = cleaned.replace(/\s+/g, ' ').toUpperCase();
            
            return cleaned;
          };

          const turmaStatsMap = {};
          correctedList.forEach((r) => {
            const rawTurma = r.turma_aluno || r.extracted_data?.turma || 'Sem Turma Definida';
            const normalizedTurma = normalizeTurmaName(rawTurma);

            if (!turmaStatsMap[normalizedTurma]) {
              turmaStatsMap[normalizedTurma] = { count: 0, totalScore: 0, displayName: normalizedTurma };
            }
            turmaStatsMap[normalizedTurma].count += 1;
            turmaStatsMap[normalizedTurma].totalScore += (r.nota_final || 0);
          });

          const turmaStats = Object.keys(turmaStatsMap).map((key) => ({
            turma: turmaStatsMap[key].displayName,
            count: turmaStatsMap[key].count,
            avgScore: Math.round(turmaStatsMap[key].totalScore / turmaStatsMap[key].count)
          }));

          if (turmaStats.length === 0) {
            return (
              <div className="p-4 text-center text-xs text-[#807d72] bg-[#fafaf7] rounded-lg border border-[#e6e5e0]">
                Ainda não existem dados de turmas corrigidas para exibir o comparativo.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {turmaStats.map((item, idx) => (
                <div key={idx} className="bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-[#26251e] truncate">{item.turma}</span>
                    <span className="text-[10px] font-mono text-[#807d72] bg-[#e6e5e0] px-1.5 py-0.5 rounded">
                      {item.count} aluno(s)
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#f54e00]">
                    {item.avgScore} <span className="text-xs font-normal text-[#807d72]">pts</span>
                  </div>
                  <div className="w-full bg-[#e6e5e0] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f54e00] rounded-full transition-all duration-500"
                      style={{ width: `${(item.avgScore / 1000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Recent Redações List */}
      <div className="bg-[#ffffff] border border-[#e6e5e0] p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-normal text-[#26251e] tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#807d72]" />
            Redações Recentes
          </h3>
        </div>

        <div className="space-y-2">
          {redacoes.slice(0, 5).map((item) => {
            const isIdentified = item.nome_detectado && item.nome_aluno;
            const ext = item.extracted_data || {};
            const enemScore = ext.avaliacoes?.enem?.nota_total_enem ?? item.nota_final;

            return (
              <div
                key={item.id}
                onClick={() => item.is_synced && onSelectRedacao(item)}
                className="bg-[#fafaf7] border border-[#e6e5e0] hover:border-[#cfcdc4] p-3.5 rounded-lg flex items-center justify-between gap-4 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-[#ffffff] border border-[#e6e5e0] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#807d72]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#26251e] truncate">
                        {isIdentified ? item.nome_aluno : '⚠️ Nome Não Identificado (Guardada)'}
                      </span>
                      {item.turma_aluno && (
                        <span className="text-[10px] font-mono text-[#5a5852] bg-[#e6e5e0] px-1.5 py-0.5 rounded">
                          {item.turma_aluno}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#807d72] truncate max-w-[300px]">
                      {ext.texto_transcrito ? ext.texto_transcrito.substring(0, 60) + '...' : 'Aguardando avaliação...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.is_synced && enemScore !== null && enemScore !== undefined ? (
                    <span className="px-3 py-1 rounded-full bg-[#e6e5e0] text-[#26251e] font-mono font-bold text-xs">
                      {enemScore} pts
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-[#dfa88f] text-[#26251e] text-[10px] font-mono font-medium">
                      PENDENTE
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#807d72]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
