import React, { useState, useRef } from 'react';
import { Camera, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { saveDocumentOffline } from '../db/db';

export default function ScannerDocumento({ onDocumentSaved }) {
  const [docType, setDocType] = useState('Nota Fiscal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64String = e.target?.result;
      if (typeof base64String === 'string') {
        try {
          await saveDocumentOffline(docType, base64String);
          
          setFeedback({
            type: 'success',
            message: `Documento tipo "${docType}" armazenado no banco local IndexedDB.`
          });
          
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          if (onDocumentSaved) {
            onDocumentSaved();
          }
        } catch (error) {
          setFeedback({
            type: 'error',
            message: 'Falha crítica ao gravar no banco local.'
          });
        } finally {
          setIsProcessing(false);
        }
      }
    };

    reader.onerror = () => {
      setFeedback({
        type: 'error',
        message: 'Erro durante leitura binária do arquivo.'
      });
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 shadow-none">
      {/* Section Title - H3 Hierarchy (14px, 600 weight) */}
      <h3 className="text-[14px] font-semibold text-text-primary tracking-tight uppercase flex items-center gap-2 mb-4">
        <Camera className="w-4 h-4 text-text-secondary" />
        Digitalização de Campo
      </h3>

      {/* Selector - H4 Micro Headers Hierarchy (11px, 600 weight, uppercase, secondary text) */}
      <div className="mb-4">
        <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Classificação do Documento
        </label>
        
        {/* Selection buttons styled with 1px border and custom transitions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDocType('Nota Fiscal')}
            className={`h-[36px] flex items-center justify-center gap-2 px-3 rounded text-[12px] font-medium border transition-technical cursor-pointer ${
              docType === 'Nota Fiscal'
                ? 'bg-bg-subtle border-text-primary text-text-primary'
                : 'bg-transparent border-border-subtle text-text-secondary hover:bg-bg-subtle'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Nota Fiscal
          </button>
          
          <button
            type="button"
            onClick={() => setDocType('Checklist')}
            className={`h-[36px] flex items-center justify-center gap-2 px-3 rounded text-[12px] font-medium border transition-technical cursor-pointer ${
              docType === 'Checklist'
                ? 'bg-bg-subtle border-text-primary text-text-primary'
                : 'bg-transparent border-border-subtle text-text-secondary hover:bg-bg-subtle'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Checklist
          </button>
        </div>
      </div>

      {/* Hidden input for camera interface */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Core Action Capture Button.
          Industrial Accessibility note: Standard buttons are 36px, but this action-critical
          button uses a 44px height to facilitate easy glove touch target in the field. */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleButtonClick}
        className="w-full h-[44px] bg-text-primary hover:bg-text-primary/90 text-text-inverse font-medium text-[12px] uppercase tracking-wider rounded transition-technical flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processando Arquivo...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Capturar Imagem
          </>
        )}
      </button>

      {/* Feedback Alerts styled with low-saturation colors and sharp layouts */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded border text-[11px] flex items-start gap-2 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-success-bg border-success-text/20 text-success-text'
              : 'bg-danger-bg border-danger-text/20 text-danger-text'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="leading-tight">
            <span className="font-bold uppercase block text-[10px] tracking-wide mb-0.5">
              {feedback.type === 'success' ? 'Persistido Offline' : 'Erro'}
            </span>
            <span className="font-medium">{feedback.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
