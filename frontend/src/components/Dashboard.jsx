import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { syncOfflineDocuments } from '../services/syncService';
import { db } from '../db/db';
import { CloudLightning, Wifi, WifiOff, RefreshCw, Check, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function Dashboard({ refreshTrigger, onRefresh }) {
  const isOnline = useNetworkStatus();
  const [documents, setDocuments] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const loadDocuments = async () => {
    try {
      const allDocs = await db.documentos.orderBy('data_captura').reverse().toArray();
      setDocuments(allDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
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
      loadDocuments();
      if (onRefresh) onRefresh();
    } catch (error) {
      setSyncFeedback({
        type: 'error',
        message: `Falha na sincronização: ${error.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedDoc(expandedDoc === id ? null : id);
  };

  const pendingCount = documents.filter(doc => !doc.is_synced).length;

  return (
    <div className="space-y-4">
      {/* Network Status Header Panel - Muted design, flat border, no heavy drop shadows */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-medium text-text-primary tracking-tight uppercase">ApodiSync</h2>
            <p className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider mt-0.5">
              Sistema de Digitalização e Automação Offline-First
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Network Status Indicator Badge - Low-saturation pastel badges */}
            {isOnline ? (
              <span className="h-[22px] inline-flex items-center gap-1 px-2.5 rounded-full text-[10px] font-mono font-medium bg-success-bg text-success-text">
                <Wifi className="w-3 h-3 shrink-0" />
                ONLINE
              </span>
            ) : (
              <span className="h-[22px] inline-flex items-center gap-1 px-2.5 rounded-full text-[10px] font-mono font-medium bg-danger-bg text-danger-text">
                <WifiOff className="w-3 h-3 shrink-0" />
                OFFLINE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sync Action Area */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Fila de Transmissão
            </h4>
            <p className="text-text-secondary text-[12px] mt-0.5">
              {pendingCount === 0 
                ? 'Todos os registros locais estão sincronizados.' 
                : `${pendingCount} documento(s) pendente(s) de envio.`}
            </p>
          </div>

          {/* Sync Trigger button. High accessibility target (44px), standard colors */}
          <button
            type="button"
            disabled={!isOnline || isSyncing || pendingCount === 0}
            onClick={handleSync}
            className={`h-[44px] px-4 rounded text-[12px] font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-technical cursor-pointer ${
              isOnline && pendingCount > 0
                ? 'bg-text-primary hover:bg-text-primary/90 text-text-inverse'
                : 'bg-bg-subtle text-text-muted border border-border-subtle cursor-not-allowed'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Transmitindo...
              </>
            ) : (
              <>
                <CloudLightning className="w-3.5 h-3.5" />
                Sincronizar ({pendingCount})
              </>
            )}
          </button>
        </div>

        {/* Sync Feedbacks alerts */}
        {syncFeedback && (
          <div
            className={`mt-3 p-3 rounded border text-[11px] leading-tight animate-fadeIn ${
              syncFeedback.type === 'success'
                ? 'bg-success-bg border-success-text/20 text-success-text'
                : syncFeedback.type === 'error'
                ? 'bg-danger-bg border-danger-text/20 text-danger-text'
                : 'bg-info-bg border-info-text/20 text-info-text'
            }`}
          >
            <span className="font-bold uppercase block text-[10px] tracking-wide mb-0.5">Notificação de Sincronização</span>
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Captured Documents List */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          Fila de Lançamento Local ({documents.length})
        </h4>

        {documents.length === 0 ? (
          <div className="bg-bg-surface border border-dashed border-border-subtle rounded-lg p-6 text-center text-text-secondary">
            <FileText className="w-8 h-8 mx-auto text-text-muted mb-2" />
            <p className="font-bold text-[12px]">Nenhum registro no banco local.</p>
            <p className="text-[11px] text-text-muted">Aponte a câmera no módulo lateral para iniciar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden transition-technical"
              >
                <div className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  
                  {/* Left component: doc info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border border-border-subtle overflow-hidden bg-bg-subtle flex items-center justify-center shrink-0">
                      {doc.imagem_base64 ? (
                        <img 
                          src={doc.imagem_base64} 
                          alt="Doc Thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-[12px]">
                          {doc.tipo_documento}
                        </span>
                        <span className="text-[10px] font-mono text-text-secondary bg-bg-subtle px-1 rounded">
                          ID: {String(doc.id).padStart(4, '0')}
                        </span>
                      </div>
                      <p className="text-text-secondary text-[11px] font-mono">
                        {new Date(doc.data_captura).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Right component: sync status and JSON drawer toggle */}
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 self-stretch sm:self-center">
                    
                    {/* Sync Status Badge (low-saturation color mapping, 10px monospace text) */}
                    <div>
                      {doc.is_synced ? (
                        <span className="h-[22px] inline-flex items-center gap-1 px-2.5 rounded-full text-[10px] font-mono font-medium bg-success-bg text-success-text">
                          <Check className="w-3 h-3 shrink-0" />
                          SYNCED
                        </span>
                      ) : (
                        <span className="h-[22px] inline-flex items-center gap-1 px-2.5 rounded-full text-[10px] font-mono font-medium bg-warning-bg text-warning-text">
                          <Clock className="w-3 h-3 shrink-0" />
                          PENDING
                        </span>
                      )}
                    </div>

                    {/* View JSON Toggle (Standard Ghost Button) */}
                    {doc.extracted_data && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(doc.id)}
                        className="h-[32px] px-2.5 rounded border border-border-subtle bg-transparent hover:bg-bg-subtle text-text-primary font-medium text-[11px] flex items-center gap-1 transition-technical cursor-pointer"
                      >
                        Dados OCR
                        {expandedDoc === doc.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Section showing extracted JSON code block */}
                {expandedDoc === doc.id && doc.extracted_data && (
                  <div className="border-t border-border-subtle bg-bg-code p-3">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 font-mono">
                      Data Extraction Object:
                    </p>
                    <pre className="text-green-400 p-3 rounded text-[11px] font-mono overflow-x-auto shadow-inner bg-black/30">
                      {JSON.stringify(doc.extracted_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
