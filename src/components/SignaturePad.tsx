import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Trash2, Check, RotateCcw, Maximize2, X } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (signatureDataUrl: string) => void;
  clientName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  clientName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsDrawing, setModalIsDrawing] = useState(false);
  const [modalIsEmpty, setModalIsEmpty] = useState(true);

  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const modalLastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize and handle canvas resolution
  const setupCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#38bdf8'; // Sky 400 stroke on dark, or high contrast stroke
    ctx.lineWidth = 2.5;
  }, []);

  // Update canvas sizing on resize
  useEffect(() => {
    if (canvasRef.current && !value) {
      setupCanvas(canvasRef.current);
    }
  }, [setupCanvas, value]);

  useEffect(() => {
    if (isModalOpen && modalCanvasRef.current) {
      setTimeout(() => {
        if (modalCanvasRef.current) {
          setupCanvas(modalCanvasRef.current);
          setModalIsEmpty(true);
        }
      }, 100);
    }
  }, [isModalOpen, setupCanvas]);

  // Helper to get coordinates
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Main canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getCoordinates(e, canvas);
    lastPosRef.current = pos;
    setIsDrawing(true);
    setIsEmpty(false);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPosRef.current) return;

    const currentPos = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    setIsDrawing(false);
    lastPosRef.current = null;

    // Save signature
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setIsEmpty(true);
    onChange('');
  };

  // Modal drawing handlers
  const startModalDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = modalCanvasRef.current;
    if (!canvas) return;

    const pos = getCoordinates(e, canvas);
    modalLastPosRef.current = pos;
    setModalIsDrawing(true);
    setModalIsEmpty(false);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const drawModal = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!modalIsDrawing) return;
    e.preventDefault();

    const canvas = modalCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !modalLastPosRef.current) return;

    const currentPos = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(modalLastPosRef.current.x, modalLastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    modalLastPosRef.current = currentPos;
  };

  const stopModalDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!modalIsDrawing) return;
    if (e) e.preventDefault();
    setModalIsDrawing(false);
    modalLastPosRef.current = null;
  };

  const saveModalSignature = () => {
    const canvas = modalCanvasRef.current;
    if (canvas && !modalIsEmpty) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
      setIsEmpty(false);
      setIsModalOpen(false);
    }
  };

  const clearModalSignature = () => {
    const canvas = modalCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setModalIsEmpty(true);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Assinatura Digital do Cliente
              {value && (
                <span className="normal-case px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center">
                  <Check className="w-3 h-3 mr-0.5" /> Assinado
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {clientName ? `Responsável: ${clientName}` : 'Assine com o dedo no celular ou com o mouse no computador'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center border border-slate-700"
            title="Expandir assinatura em tela cheia"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span className="hidden sm:inline">Tela Cheia</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={clearSignature}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors flex items-center"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Canvas / Preview Container */}
      {value ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[140px] group">
          <img
            src={value}
            alt="Assinatura do cliente"
            className="max-h-[120px] w-auto object-contain filter drop-shadow-md"
          />
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            Assinatura registrada. Clique em "Limpar" ou "Tela Cheia" para refazer.
          </div>
        </div>
      ) : (
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
            style={{ touchAction: 'none' }}
            className="w-full h-[140px] bg-slate-950 border border-slate-800 rounded-xl cursor-crosshair touch-none select-none block"
          />

          {/* Guide baseline line & placeholder prompt */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-600 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                Touchscreen / Mouse
              </span>
            </div>
            <div className="w-full border-b border-dashed border-slate-800/80 mb-2 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -top-5 text-[10px] text-slate-600 font-medium">
                Espaço para Assinatura do Cliente
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Touch Signature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-4 sm:p-6 justify-between animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-400" />
                Assinatura do Cliente (Tela Cheia)
              </h3>
              <p className="text-xs text-slate-400">
                {clientName ? `Cliente: ${clientName}` : 'Use o dedo no celular para assinar o relatório'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 my-4 relative flex items-center justify-center">
            <canvas
              ref={modalCanvasRef}
              onMouseDown={startModalDrawing}
              onMouseMove={drawModal}
              onMouseUp={stopModalDrawing}
              onMouseLeave={stopModalDrawing}
              onTouchStart={startModalDrawing}
              onTouchMove={drawModal}
              onTouchEnd={stopModalDrawing}
              onTouchCancel={stopModalDrawing}
              style={{ touchAction: 'none' }}
              className="w-full h-full max-h-[420px] bg-slate-900 border-2 border-slate-700 rounded-2xl cursor-crosshair touch-none select-none shadow-2xl block"
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none text-center">
              <div className="w-64 sm:w-96 border-b border-dashed border-slate-600 mb-1" />
              <span className="text-xs text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800">
                Assine acima da linha pontilhada
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={clearModalSignature}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Limpar
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveModalSignature}
                disabled={modalIsEmpty}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center shadow-lg shadow-emerald-950/50"
              >
                <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
                Confirmar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
