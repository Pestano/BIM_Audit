import React from 'react';

type ButtonVariant = 'primary' | 'danger' | 'secondary' | 'neutral';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Estilo del botón:
   * - "primary": acción principal (azul de marca) — ej. "Crear proyecto"
   * - "danger": acción destructiva — ej. "Sí, eliminar"
   * - "secondary": acción secundaria/cancelar (blanco con borde)
   * - "neutral": cierre neutro sobre fondo oscuro — ej. "Cerrar"
   */
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-marca-600 text-white hover:bg-marca-700',
  danger: 'bg-fallo-600 text-white hover:bg-fallo-700',
  secondary: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100',
  neutral: 'bg-zinc-500 text-white hover:bg-zinc-600',
};

/**
 * Botón estándar de la app (usado en los modales de confirmación).
 * Cambiar el aspecto de TODOS los botones de este tipo se hace aquí,
 * en un solo sitio, en vez de en cada modal por separado.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
  >
    {children}
  </button>
);
