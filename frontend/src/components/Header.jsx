import React from 'react';
import { Wifi, WifiOff, Sparkles, RefreshCw, Search, Menu } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function Header({ pendingCount, isSyncing, onSync, searchQuery, setSearchQuery, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const isOnline = useNetworkStatus();

  return (
    <header className="bg-[#f7f7f4] border-b border-[#e6e5e0] sticky top-0 z-20 px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Mobile Menu Hambúrguer Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[#26251e] md:hidden cursor-pointer shrink-0"
          title="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input */}
        <div className="relative w-full max-w-xs sm:max-w-sm md:w-80">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#807d72] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#ffffff] border border-[#e6e5e0] rounded-md pl-8 sm:pl-9 pr-2.5 py-1.5 sm:py-2 text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] transition-colors"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Network Status Badge */}
        {isOnline ? (
          <span className="h-7 sm:h-8 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-full text-[10px] sm:text-xs font-mono font-medium bg-[#9fc9a2] text-[#26251e]">
            <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">ONLINE</span>
          </span>
        ) : (
          <span className="h-7 sm:h-8 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-full text-[10px] sm:text-xs font-mono font-medium bg-[#dfa88f] text-[#26251e]">
            <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">OFFLINE</span>
          </span>
        )}

        {/* Primary CTA Trigger Button in Cursor Orange (#f54e00) */}
        <button
          type="button"
          disabled={!isOnline || isSyncing || pendingCount === 0}
          onClick={onSync}
          className={`h-8 sm:h-10 px-2.5 sm:px-4 rounded-md text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
            isOnline && pendingCount > 0
              ? 'bg-[#f54e00] hover:bg-[#d04200] text-white'
              : 'bg-[#e6e5e0] text-[#a09c92] border border-[#e6e5e0] cursor-not-allowed'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Avaliando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Corrigir ({pendingCount})</span>
            </>
          )}
        </button>
      </div>

    </header>
  );
}
