import React from 'react';
import { LayoutDashboard, PlusCircle, Database, AlertTriangle, Settings, Award, ChevronLeft, ChevronRight, Bot } from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, isCollapsed, setIsCollapsed, pendingCount, unidentifiedCount }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Métricas', icon: LayoutDashboard },
    { id: 'novo', label: 'Nova Correção (Lote)', icon: PlusCircle },
    { id: 'tabela', label: 'Banco de Redações', icon: Database },
    { id: 'sem_nome', label: 'Redações Sem Nome', icon: AlertTriangle, badge: unidentifiedCount },
    { id: 'config', label: 'Configurações & API', icon: Settings }
  ];

  return (
    <aside
      className={`bg-[#fafaf7] border-r border-[#e6e5e0] flex flex-col transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#e6e5e0] flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="bg-[#f54e00] p-2 rounded-md text-white shadow-none">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="font-normal text-base text-[#26251e] block tracking-tight">Ágora ENEM</span>
              <span className="text-[11px] text-[#807d72] font-mono block">Design Cursor v1.0</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#f54e00] p-2 rounded-md text-white shadow-none mx-auto">
            <Award className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[#5a5852] hover:text-[#26251e] transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* AI Multi-Agent Status Pill (Peach & Mint Pastels) */}
      {!isCollapsed && (
        <div className="m-3 p-3 bg-[#ffffff] border border-[#e6e5e0] rounded-lg flex items-center gap-2.5 text-xs text-[#5a5852]">
          <Bot className="w-4 h-4 text-[#f54e00] shrink-0" />
          <div>
            <span className="font-semibold text-[#26251e] block text-[11px]">Multi-Agente Ativo</span>
            <span className="text-[10px] text-[#807d72] font-mono">OCR Vision + Evaluator</span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#ffffff] text-[#26251e] border border-[#cfcdc4] font-semibold'
                  : 'text-[#5a5852] hover:text-[#26251e] hover:bg-[#efeee8] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#f54e00]' : 'text-[#807d72] group-hover:text-[#26251e]'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {!isCollapsed && item.badge > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#dfa88f] text-[#26251e]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#e6e5e0] text-[10px] font-mono text-[#807d72] uppercase tracking-widest text-center">
          Cursor Gothic // JetBrains Mono
        </div>
      )}
    </aside>
  );
}
