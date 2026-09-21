import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ClipboardCheck } from 'lucide-react';

interface GridsModalProps {
  isOpen: boolean;
  grids: string[];
  onClose: () => void;
}

export const GridsModal: React.FC<GridsModalProps> = ({ isOpen, grids, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Cabecera */}
            <div className="bg-alerta-500 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Listado de Rejillas</h3>
                  <p className="text-sm opacity-80">{grids.length} elementos encontrados</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3">
                {grids.sort().map((grid, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg text-xs font-black text-alerta-500 shadow-sm">
                      {grid}
                    </span>
                    <span className="text-sm font-bold text-slate-700 truncate">Rejilla {grid}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie */}
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
