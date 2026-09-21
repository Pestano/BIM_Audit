import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ImportErrorBannerProps {
  error: string | null;  // Mensaje de error a mostrar (null si no hay error)
  onClose: () => void;   // Función para cerrar la notificación
}

/**
 * Banner flotante de alerta para notificar errores en la lectura del JSON importado.
 */
export const ImportErrorBanner: React.FC<ImportErrorBannerProps> = ({ error, onClose }) => (
  <AnimatePresence>
    {error && (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-fallo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-lg"
      >
        <AlertTriangle size={20} className="shrink-0" />
        <p className="text-sm font-semibold">{error}</p>
        <button
          onClick={onClose}
          className="ml-2 text-white/80 hover:text-white font-bold shrink-0"
        >
          ✕
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);