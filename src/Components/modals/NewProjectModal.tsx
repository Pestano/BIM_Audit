import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { Button } from '../common/Button';

interface NewProjectModalProps {
  isOpen: boolean;                        // Estado de apertura
  projectNameInput: string;              // Valor actual del campo de texto
  onChangeInput: (val: string) => void;  // Actualizador del input
  onConfirm: () => void;                 // Crear el proyecto
  onClose: () => void;                   // Cancelar
}

/**
 * Modal dialog para pedir el nombre del proyecto al importar un archivo JSON nuevo.
 */
export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  projectNameInput,
  onChangeInput,
  onConfirm,
  onClose
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-marca-50 p-6 border-b border-marca-100">
            <div className="flex items-center gap-3 text-marca-600 mb-2">
              <Plus size={24} />
              <h3 className="font-black uppercase tracking-tight">Nuevo proyecto</h3>
            </div>
          </div>

          <div className="p-8">
            <label className="text-sm text-slate-500 font-medium mb-2 block">
              Nombre del proyecto
            </label>
            <input
              type="text"
              autoFocus
              value={projectNameInput}
              onChange={(e) => onChangeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-marca-400"
            />
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={onConfirm}>Crear proyecto</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);