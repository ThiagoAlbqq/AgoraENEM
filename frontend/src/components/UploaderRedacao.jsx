import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Plus, Trash2, Edit3, User, GraduationCap } from 'lucide-react';
import { saveRedacaoOffline, saveMultipleRedacoesOffline } from '../db/db';

export default function UploaderRedacao({ onRedacaoSaved }) {
  const [mode, setMode] = useState('imagem'); // 'imagem' | 'texto'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [typedText, setTypedText] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualTurma, setManualTurma] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            base64: e.target?.result
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((newFiles) => {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    });
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveImages = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const itemsToSave = selectedFiles.map((f) => ({
        imagem_base64: f.base64,
        tipo_input: 'imagem',
        nome_manual: manualName.trim() || null,
        turma_manual: manualTurma.trim() || null
      }));

      await saveMultipleRedacoesOffline(itemsToSave);

      setFeedback({
        type: 'success',
        message: `${selectedFiles.length} redação(ões) salva(s) offline no banco local!`
      });

      setSelectedFiles([]);
      setManualName('');
      setManualTurma('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onRedacaoSaved) onRedacaoSaved();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'Falha ao salvar redações no banco local.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTypedText = async () => {
    if (!typedText.trim()) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      await saveRedacaoOffline({
        texto_digitado: typedText.trim(),
        tipo_input: 'texto',
        nome_manual: manualName.trim() || null,
        turma_manual: manualTurma.trim() || null
      });

      setFeedback({
        type: 'success',
        message: 'Redação em texto salva offline com sucesso!'
      });

      setTypedText('');
      setManualName('');
      setManualTurma('');
      if (onRedacaoSaved) onRedacaoSaved();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'Falha ao salvar redação digitada.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            Enviar Redações para Avaliação
          </h3>
          <p className="text-xs text-slate-400">
            Avaliação Cruzada: ENEM x Sisedu (Projeto Ágora Escolar)
          </p>
        </div>
      </div>

      {/* Input Mode Selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('imagem')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
            mode === 'imagem'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Fotos / Imagens (Lote)
        </button>

        <button
          type="button"
          onClick={() => setMode('texto')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
            mode === 'texto'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Digitar Redação
        </button>
      </div>

      {/* Optional Metadata Inputs: Student Name & Turma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <User className="w-3 h-3 text-indigo-400" />
            Nome do Aluno (Opcional)
          </label>
          <input
            type="text"
            placeholder="IA extrai se houver no cabeçalho..."
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-indigo-400" />
            Turma (Opcional)
          </label>
          <input
            type="text"
            placeholder="ex: 3º Ano A..."
            value={manualTurma}
            onChange={(e) => setManualTurma(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Mode 1: Image Batch Upload */}
      {mode === 'imagem' && (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-slate-950/90 group"
          >
            <ImageIcon className="w-8 h-8 mx-auto text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
            <p className="text-xs font-bold text-slate-200">
              Clique para selecionar uma ou <span className="text-indigo-400">múltiplas fotos de redação</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Suporta PNG, JPG, JPEG e WEBP (Envio individual ou em lote)
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Imagens Selecionadas ({selectedFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-rose-400 hover:text-rose-300 text-[10px] font-normal"
                >
                  Limpar tudo
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2 px-3 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate text-slate-200">{file.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">({file.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={isProcessing || selectedFiles.length === 0}
            onClick={handleSaveImages}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando no Banco Local...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Salvar {selectedFiles.length > 0 ? selectedFiles.length : ''} Redação(ões) Offline
              </>
            )}
          </button>
        </div>
      )}

      {/* Mode 2: Typed Text Input */}
      {mode === 'texto' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Texto Integral da Redação
            </label>
            <textarea
              rows={7}
              placeholder="Cole ou digite aqui o texto da redação do aluno para avaliação..."
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar"
            />
          </div>

          <button
            type="button"
            disabled={isProcessing || !typedText.trim()}
            onClick={handleSaveTypedText}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Salvar Redação Digitada Offline
              </>
            )}
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

    </div>
  );
}
