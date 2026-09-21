import React from 'react';
import { RevitBimData } from '../../types';

interface DocumentationViewProps {
  bimData: RevitBimData;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({ bimData }) => {
  if (!bimData.codechecking) return <div>No hay datos de Documentación</div>;

  const data = bimData.codechecking;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Vistas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">1. Vistas ({data.vistas?.cantidad || 0})</h3>
      </div>
      {/* 2. Plantillas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">2. Plantillas ({data.plantillas_vista?.cantidad || 0})</h3>
      </div>
      {/* 3. Planos */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">3. Planos ({data.planos?.cantidad || 0})</h3>
      </div>
      {/* 4. Tablas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">4. Tablas ({data.tablas?.cantidad || 0})</h3>
      </div>
      {/* 5. Habitaciones */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">5. Habitaciones ({data.habitaciones?.cantidad || 0})</h3>
      </div>
      {/* 6. Vinculos CAD */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">6. Vínculos CAD ({data.vinculos_cad?.cantidad || 0})</h3>
      </div>
      {/* 7. Parámetros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">7. Parámetros ({data.parametros_proyecto_y_compartidos?.cantidad || 0})</h3>
      </div>
      {/* 8. Grupos Anotación */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800">8. Grupos Anot. ({data.grupos_anotacion?.cantidad || 0})</h3>
      </div>
    </div>
  );
};
