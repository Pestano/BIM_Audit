import React from 'react';
import { AuditCheckResult } from '../../lib/auditEngine';

interface CardProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  auditResult?: AuditCheckResult;
  scrollable?: boolean;
  contentClassName?: string;
  detailStyle?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  onClick,
  auditResult,
  scrollable = false,
  contentClassName = '',
  detailStyle = false,
}) => (
  <div
    onClick={onClick}
    className={detailStyle
      ? `bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs relative flex flex-col h-full min-h-0 ${className}`
      : `bg-white p-4 rounded-xl border border-slate-100 relative flex flex-col ${className}`
    }
  >
    <div className={`flex items-start justify-between ${detailStyle ? 'pb-3 border-b border-zinc-100 mb-3 shrink-0' : 'mb-2.5 shrink-0'}`}>
      <div className="min-w-0">
        <h3 className={detailStyle
          ? 'text-sm font-black text-zinc-900 uppercase tracking-normal'
          : 'text-slate-500 text-etiqueta font-semibold uppercase tracking-wider'
        }>
          {title}
        </h3>
        {detailStyle && subtitle && (
          <div className="text-[11px] font-mono text-zinc-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {subtitle}
          </div>
        )}
      </div>
      {!detailStyle && auditResult && null}
    </div>

    <div className={`w-full flex-1 min-h-0 ${scrollable ? 'overflow-y-auto custom-scrollbar pr-1' : ''} ${contentClassName}`}>
      {children}
    </div>
  </div>
);
