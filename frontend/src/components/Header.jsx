import React from 'react';
import { Wifi, WifiOff, Sparkles, RefreshCw, Search } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function Header({ pendingCount, isSyncing, onSync, searchQuery, setSearchQuery }) {
  const isOnline = useNetworkStatus();

  return (
    <header className="bg-[#f7f7f4] border-b border-[#e6e5e0] sticky top-0 z-20 px-6 h-16 flex items-center justify-between gap-4">
      
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-[#807d72] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Pesquisar por Aluno, Turma ou ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#ffffff] border border-[#e6e5e0] rounded-md pl-9 pr-3 py-2 text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] transition-colors"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {/* Network Status Badge (Mint / Peach Timeline Pastels) */}
        {isOnline ? (
          <span className="h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-mono font-medium bg-[#9fc9a2] text-[#26251e]">
            <Wifi className="w-3.5 h-3.5" />
            ONLINE
          </span>
        ) : (
          <span className="h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-mono font-medium bg-[#dfa88f] text-[#26251e]">
            <WifiOff className="w-3.5 h-3.5" />
            OFFLINE
          </span>
        )}

        {/* Primary CTA Trigger Button in Cursor Orange (#f54e00) */}
        <button
          type="button"
          disabled={!isOnline || isSyncing || pendingCount === 0}
          onClick={onSync}
          className={`h-10 px-4 rounded-md text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            isOnline && pendingCount > 0
              ? 'bg-[#f54e00] hover:bg-[#d04200] text-white'
              : 'bg-[#e6e5e0] text-[#a09c92] border border-[#e6e5e0] cursor-not-allowed'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Avaliando...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Corrigir Redações ({pendingCount})
            </>
          )}
        </button>
      </div>

    </header>
  );
}
