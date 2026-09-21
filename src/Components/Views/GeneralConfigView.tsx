import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Layers, 
  Building2, 
  Wrench, 
  Trees, 
  Network, 
  FileBox, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Database,
  Eye,
  CheckCheck
} from 'lucide-react';
import { Project, ProjectFile, ModelDiscipline, RevitBimData } from '../../types';
import { DashboardView } from './DashboardView';
import { AnnotationDashboardView } from './AnnotationDashboardView';
import { runAudit } from '../../lib/auditEngine';
import { 
  getDisciplineLabel, 
  getDisciplineColorClasses,
  ensureFileMetadata 
} from '../../utils/modelUtils';

interface GeneralConfigViewProps {
  currentProject: Project;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onNavigateToManagement: () => void;
  onOpenWarningModal: (typeName: string, ids: string[]) => void;
  onOpenGridsModal: (grids: any[]) => void;
}

export const GeneralConfigView: React.FC<GeneralConfigViewProps> = ({
  currentProject,
  selectedFileId,
  onSelectFile,
  onNavigateToManagement,
  onOpenWarningModal,
  onOpenGridsModal
}) => {
  // Estado para alternar fases
  const [currentFase, setCurrentFase] = useState<'configuracion' | 'anotacion'>('configuracion');
  
  // Estado local para alternar entre vista de auditoría y vista de inspección de datos
  const [showAuditMode, setShowAuditMode] = useState(true);

  // Asegurar metadatos en todos los archivos del proyecto
  const files: ProjectFile[] = (currentProject?.files || []).map(ensureFileMetadata);

  // Archivo actualmente seleccionado (o el primero si no hay uno seleccionado)
  const activeFile = files.find(f => f.id === selectedFileId) || files[0];

  // Ejecutar auditoría sobre el modelo activo (solo si tiene datos de Fase 1)
  const auditReport = activeFile && (activeFile.data as RevitBimData)?.codechecking?.informacion_general 
    ? runAudit(activeFile.data as RevitBimData, currentProject?.auditConfig, activeFile) 
    : null;

  // Resumen de resultados de auditoría para el modelo activo
  const auditResultsList = auditReport ? Object.values(auditReport.results) : [];
  const failedCount = auditResultsList.filter(r => r.status === 'FALLO').length;
  const alertCount = auditResultsList.filter(r => r.status === 'ALERTA').length;
  const goodCount = auditResultsList.filter(r => r.status === 'BUENO').length;

  const getDisciplineIcon = (type?: ModelDiscipline, size = 15) => {
    switch (type) {
      case 'estructura': return <Layers size={size} />;
      case 'arquitectura': return <Building2 size={size} />;
      case 'instalaciones': return <Wrench size={size} />;
      case 'urbanizacion': return <Trees size={size} />;
      case 'federado': return <Network size={size} />;
      default: return <FileBox size={size} />;
    }
  };

  // Si no hay modelos importados aún
  if (files.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 bg-marca-50 rounded-2xl flex items-center justify-center text-marca-600 mx-auto mb-4">
          <Database size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-800">No hay modelos importados en este proyecto</h3>
        <p className="text-xs italic text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          Para realizar la auditoría de <strong className="text-slate-600 font-bold not-italic">Configuración General</strong> o <strong className="text-slate-600 font-bold not-italic">Elementos de Anotación</strong>, primero debes importar los modelos de Revit.
        </p>
        <button
          onClick={onNavigateToManagement}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-marca-600 hover:bg-marca-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-marca-200 transition-all"
        >
          <Plus size={18} />
          <span>Ir a Archivos importados</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ENCABEZADO DE LA PÁGINA */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {showAuditMode ? 'RESULTADO AUDITORÍA' : 'DATOS DEL MODELO'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de Fase */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setCurrentFase('configuracion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  currentFase === 'configuracion' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Config. General</span>
              </button>
              <button
                onClick={() => setCurrentFase('anotacion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  currentFase === 'anotacion' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Elem. Anotación</span>
              </button>
            </div>

            {/* Selector de Modo: Auditoría vs Datos Modelo */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setShowAuditMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  showAuditMode 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ShieldCheck size={12} className={showAuditMode ? 'text-marca-600' : 'text-slate-400'} />
                <span>Auditoría</span>
              </button>
              <button
                onClick={() => setShowAuditMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  !showAuditMode 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye size={12} className={!showAuditMode ? 'text-marca-600' : 'text-slate-400'} />
                <span>Datos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Pestañas de Modelos */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {files.map(file => {
            const isActive = file.id === activeFile?.id;
            const discColor = getDisciplineColorClasses(file.modelType);

            const fileAudit = (file.data as RevitBimData)?.codechecking?.informacion_general 
              ? runAudit(file.data as RevitBimData, currentProject?.auditConfig, file) 
              : null;
            const fileFailed = fileAudit ? Object.values(fileAudit.results).filter(r => r.status === 'FALLO').length : 0;
            const fileAlerts = fileAudit ? Object.values(fileAudit.results).filter(r => r.status === 'ALERTA').length : 0;

            return (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                  isActive
                    ? `${discColor.activeTab}`
                    : `${discColor.inactiveTab}`
                }`}
                title={`Modelo: ${file.customName || file.name} (${file.name})`}
              >
                <span className={isActive ? 'text-white' : 'opacity-80'}>
                  {getDisciplineIcon(file.modelType)}
                </span>

                <div className="flex flex-col text-left">
                  <span className="leading-tight text-xs font-black">
                    {file.customName || getDisciplineLabel(file.modelType)}
                  </span>
                  <span className={`text-etiqueta font-mono leading-none ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                    {file.elementCount.toLocaleString()} elem.
                  </span>
                </div>

                {fileFailed > 0 ? (
                  <span className={`text-etiqueta font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-fallo-500/80 text-white' : 'bg-fallo-100 text-fallo-700'
                  }`} title={`${fileFailed} fallos normativos detectados`}>
                    {fileFailed} {fileFailed === 1 ? 'fallo' : 'fallos'}
                  </span>
                ) : fileAlerts > 0 ? (
                  <span className={`text-etiqueta font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-alerta-400/80 text-white' : 'bg-alerta-100 text-alerta-800'
                  }`} title={`${fileAlerts} advertencias detectadas`}>
                    {fileAlerts} {fileAlerts === 1 ? 'alerta' : 'alertas'}
                  </span>
                ) : (
                  <CheckCircle2 size={13} className={isActive ? 'text-white' : 'text-ok-500'} />
                )}
              </button>
            );
          })}

          <button
            onClick={onNavigateToManagement}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-marca-600 bg-slate-50 hover:bg-marca-50 border border-dashed border-slate-200 hover:border-marca-300 transition-all shrink-0"
            title="Importar o añadir otro modelo"
          >
            <Plus size={14} />
            <span>Añadir modelo</span>
          </button>
        </div>
      </div>

      {/* Subcabecera informativa del modelo activo */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700">
            {getDisciplineIcon(activeFile?.modelType, 22)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-800">
                {activeFile?.customName || activeFile?.name}
              </h3>
              <span className={`text-etiqueta font-black uppercase px-2 py-0.5 rounded-md border ${getDisciplineColorClasses(activeFile?.modelType).badge}`}>
                {getDisciplineLabel(activeFile?.modelType)}
              </span>
              <span className="text-dato font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Fase: {currentFase === 'configuracion' ? 'Configuración General' : 'Anotación y Documentación'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
              <span className="font-mono text-slate-500 font-bold">{activeFile?.name}</span>
              <span>•</span>
              <span>Exportado: {activeFile?.createdAt || activeFile?.date}</span>
              <span>•</span>
              <span className="font-mono font-bold text-slate-600">{activeFile?.elementCount.toLocaleString()} elementos</span>
            </div>
          </div>
        </div>

        {showAuditMode && auditReport && currentFase === 'configuracion' && (
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 self-stretch sm:self-auto justify-between sm:justify-start flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-slate-700 border border-slate-100 shadow-xs">
              <CheckCheck size={14} className="text-ok-600" />
              <span className="text-xs font-bold">{goodCount} Conformes</span>
            </div>

            {failedCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-fallo-50 text-fallo-700 border border-fallo-100">
                <XCircle size={14} className="text-fallo-600" />
                <span className="text-xs font-bold">{failedCount} {failedCount === 1 ? 'Fallo' : 'Fallos'}</span>
              </div>
            )}

            {alertCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-alerta-50 text-alerta-800 border border-alerta-200">
                <AlertTriangle size={14} className="text-alerta-600" />
                <span className="text-xs font-bold">{alertCount} {alertCount === 1 ? 'Alerta' : 'Alertas'}</span>
              </div>
            )}

            {failedCount === 0 && alertCount === 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-ok-50 text-ok-700 border border-ok-100">
                <CheckCircle2 size={14} className="text-ok-600" />
                <span className="text-xs font-bold">100% Conforme</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Renderizado de las tarjetas dependiendo de la fase */}
      {activeFile && (
        <motion.div
          key={activeFile.id + currentFase + (showAuditMode ? '_audit' : '_info')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentFase === 'configuracion' ? (
            <DashboardView
              bimData={activeFile.data as RevitBimData}
              auditConfig={currentProject.auditConfig}
              activeFile={activeFile}
              onOpenWarningModal={onOpenWarningModal}
              onOpenGridsModal={onOpenGridsModal}
              showAudit={showAuditMode}
            />
          ) : (
            <AnnotationDashboardView
              bimData={activeFile.data as any}
              showAudit={showAuditMode}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};

export default GeneralConfigView;