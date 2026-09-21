import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { AuditCheckResult } from '../../lib/auditEngine';

/**
 * Propiedades para el contenedor Card de las métricas del Dashboard.
 */
interface CardProps {
  title: string;             // Título superior de la tarjeta (se muestra en mayúsculas pequeñas)
  children: React.ReactNode; // Contenido interno
  className?: string;        // Estilos de clase adicionales opcionales
  onClick?: () => void;      // Función de clic opcional
  auditResult?: AuditCheckResult; // Resultado de la auditoría para esta tarjeta
  scrollable?: boolean;      // Si el contenido debe tener scroll vertical interno
  contentClassName?: string; // Estilos adicionales para el contenedor de contenido
}

/**
 * Tarjeta contenedor con estilo estandarizado para cada sección del informe BIM.
 */
export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  className = "", 
  onClick, 
  auditResult,
  scrollable = false,
  contentClassName = ""
}) => (
  <div 
    onClick={onClick}
    className={`bg-white p-4 rounded-xl border border-slate-100 relative flex flex-col ${className}`}
  >
    <div className="flex justify-between items-start mb-2.5 shrink-0">
      <h3 className="text-slate-500 text-etiqueta font-semibold uppercase tracking-wider">
        {title}
      </h3>
      {auditResult && (
        <div title={auditResult.message}>
          {auditResult.status === 'BUENO' && <CheckCircle2 size={14} className="text-ok-500" />}
          {auditResult.status === 'FALLO' && <XCircle size={14} className="text-fallo-500" />}
          {auditResult.status === 'ALERTA' && <AlertTriangle size={14} className="text-alerta-500" />}
        </div>
      )}
    </div>
    <div className={`w-full flex-1 min-h-0 ${scrollable ? 'overflow-y-auto custom-scrollbar pr-1' : ''} ${contentClassName}`}>
      {children}
    </div>
  </div>
);
