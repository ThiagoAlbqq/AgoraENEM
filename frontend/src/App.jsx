import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import UploaderView from './components/UploaderView';
import RedacoesTableView from './components/RedacoesTableView';
import ConfigView from './components/ConfigView';
import ModalDetalhesRedacao from './components/ModalDetalhesRedacao';
import { db, deleteRedacao } from './db/db';
import { syncOfflineDocuments } from './services/syncService';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'novo' | 'tabela' | 'sem_nome' | 'config'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [redacoes, setRedacoes] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRedacao, setSelectedRedacao] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleRedacaoSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineDocuments();
      loadRedacoes();
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRedacao = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta redação?')) {
      await deleteRedacao(id);
      loadRedacoes();
    }
  };

  const pendingCount = redacoes.filter(r => !r.is_synced).length;
  const unidentifiedCount = redacoes.filter(r => r.is_synced && (!r.nome_detectado || !r.nome_aluno)).length;

  return (
    <div className="h-screen w-screen bg-[#f7f7f4] text-[#26251e] font-sans flex overflow-hidden select-none">
      
      {/* Enterprise Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view === 'sem_nome') setFilterTab('sem_nome');
          else if (view === 'tabela') setFilterTab('todas');
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        pendingCount={pendingCount}
        unidentifiedCount={unidentifiedCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Enterprise Top Header */}
        <Header
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSync={handleSync}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          
          {activeView === 'dashboard' && (
            <DashboardView
              redacoes={redacoes}
              onSelectRedacao={(r) => setSelectedRedacao(r)}
              onNavigateToUpload={() => setActiveView('novo')}
            />
          )}

          {activeView === 'novo' && (
            <UploaderView onRedacaoSaved={handleRedacaoSaved} />
          )}

          {(activeView === 'tabela' || activeView === 'sem_nome') && (
            <RedacoesTableView
              redacoes={redacoes}
              filterTab={activeView === 'sem_nome' ? 'sem_nome' : filterTab}
              setFilterTab={setFilterTab}
              onSelectRedacao={(r) => setSelectedRedacao(r)}
              onDeleteRedacao={handleDeleteRedacao}
              searchQuery={searchQuery}
            />
          )}

          {activeView === 'config' && (
            <ConfigView />
          )}

        </main>
      </div>

      {/* Detail Modal */}
      {selectedRedacao && (
        <ModalDetalhesRedacao
          redacao={selectedRedacao}
          onClose={() => setSelectedRedacao(null)}
          onUpdated={() => {
            loadRedacoes();
            setSelectedRedacao(null);
          }}
        />
      )}

    </div>
  );
}

export default App;
