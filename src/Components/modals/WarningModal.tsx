import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';

interface WarningModalProps {
  isOpen: boolean;       // Controla la visibilidad del modal
  typeName: string;      // Título o categoría del warning de Revit
  ids: string[];         // Lista de IDs de Revit afectados
  onClose: () => void;   // Función para cerrar el modal
}

/**
 * Modal detallado que despliega la lista de IDs de elementos Revit afectados por un Warning.
 */
export const WarningModal: React.FC<WarningModalProps> = ({ isOpen, typeName, ids, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Fondo oscuro translúcido */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        {/* Ventana Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-fallo-50 p-6 border-b border-fallo-100">
            <div className="flex items-center gap-3 text-fallo-600 mb-2">
              <AlertTriangle size={24} />
              <h3 className="font-black uppercase tracking-tight">Detalle de Warnings</h3>
            </div>
            <p className="text-sm font-bold text-fallo-900/60">{typeName}</p>
          </div>

          <div className="p-8">
            <p className="text-sm text-slate-500 mb-4 font-medium">Elementos afectados (Revit IDs):</p>
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {ids.map(id => (
                <div 
                  key={id} 
                  className="bg-slate-50 border border-slate-100 py-2 px-3 rounded-lg text-center font-mono text-xs font-bold text-slate-700 hover:bg-marca-50 hover:text-marca-600 hover:border-marca-200 transition-colors cursor-default"
                >
                  {id}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button variant="neutral" onClick={onClose}>Cerrar</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);