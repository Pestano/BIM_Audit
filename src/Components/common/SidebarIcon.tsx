import React from 'react';

/**
 * Propiedades para el componente de icono de navegación lateral.
 */
interface SidebarIconProps {
  icon: React.ElementType; // Componente de icono Lucide
  active: boolean;         // Determina si el botón está seleccionado
  onClick: () => void;     // Función a ejecutar al hacer clic
  title: string;           // Tooltip descriptivo
  showBadge?: boolean;     // Punto rojo de notificación
}

/**
 * Botón con icono para la barra lateral de navegación principal.
 */
export const SidebarIcon: React.FC<SidebarIconProps> = ({ icon: Icon, active, onClick, title, showBadge }) => (
  <div className="relative">
    <button 
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-zinc-500 text-white shadow-sm' 
          : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
      }`}
    >
      <Icon size={20} strokeWidth={2.5} />
    </button>
    {showBadge && (
      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-zinc-400 border-2 border-white rounded-full" />
    )}
  </div>
);
