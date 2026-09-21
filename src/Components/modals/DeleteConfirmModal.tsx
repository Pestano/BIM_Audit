import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { Button } from '../common/Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;        // Controla la visibilidad del modal
  projectName: string;   // Nombre del proyecto que se va a eliminar
  onConfirm: () => void;  // Acción a realizar si confirma la eliminación
  onClose: () => void;    // Cancelar/cerrar modal
}

/**
 * Modal de confirmación personalizado para eliminar proyectos de manera segura.
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  projectName,
  onConfirm,
  onClose
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Fondo oscuro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Contenido modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-fallo-50 p-6 border-b border-fallo-100">
            <div className="flex items-center gap-3 text-fallo-600 mb-2">
              <Trash2 size={24} />
              <h3 className="font-black uppercase tracking-tight">Eliminar proyecto</h3>
            </div>
          </div>

          <div className="p-8">
            <p className="text-sm text-slate-600">
              ¿Estás segura de que deseas eliminar el proyecto{' '}
              <span className="font-bold text-slate-900">"{projectName}"</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="danger" onClick={onConfirm}>Sí, eliminar</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);