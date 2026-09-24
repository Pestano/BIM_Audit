import React, { useState, useEffect, useMemo } from 'react';
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
  Info, 
  Database, 
  Eye, 
  CheckCheck,
  Compass,
  FileCode,
  Sliders,
  FolderTree,
  Calendar,
  Grid,
  FileSpreadsheet,
  LayoutDashboard
} from 'lucide-react';
import { Project, ProjectFile, AuditConfig, ModelDiscipline } from '../../types';
import { DashboardView } from './DashboardView';
import { DocumentationView } from './DocumentationView';
import { Elements3DView } from './Elements3DView';
import { runAudit, auditPhase2, extractProjectPhases, extractProjectDesignOptions } from '../../lib/auditEngine';
import { 
  getDisciplineLabel, 
  getDisciplineColorClasses,
  ensureFileMetadata,
  unifyProjectFilesList,
  calculatePhase2ElementCount,
  calculate3DElementCount,
  calculate3DCategoryCount,
  getConfigPhaseData,
  getAnnotationPhaseData
} from '../../utils/modelUtils';
import { exportConfigPageToExcel, exportAnnotationPageToExcel, export3DPageToExcel } from '../../utils/exportUtils';
import { ModelVisualDashboard } from './ModelVisualDashboard';

interface GeneralConfigViewProps {
  currentProject: Project;
  selectedFileId: string | null;
  currentFaseProp?: 'configuracion' | 'anotacion' | 'elementos3d';
  onChangeFase?: (fase: 'configuracion' | 'anotacion' | 'elementos3d') => void;
  onSelectFile: (fileId: string) => void;
  onNavigateToManagement: () => void;
  onOpenWarningModal: (typeName: string, ids: string[]) => void;
  onOpenGridsModal: (grids: any[]) => void;
}

export const GeneralConfigView: React.FC<GeneralConfigViewProps> = ({
  currentProject,
  selectedFileId,
  currentFaseProp,
  onChangeFase,
  onSelectFile,
  onNavigateToManagement,
  onOpenWarningModal,
  onOpenGridsModal
}) => {
  // Asegurar lista limpia y unificada sin duplicados de la misma disciplina
  const files: ProjectFile[] = useMemo(() => {
    return unifyProjectFilesList((currentProject?.files || []).map(ensureFileMetadata));
  }, [currentProject?.files]);

  // Archivo actualmente seleccionado (o el primero si no hay uno seleccionado)
  const activeFile = files.find(f => f.id === selectedFileId) || files[0];

  const activeConfigData = activeFile ? (getConfigPhaseData(activeFile) || activeFile.data) : undefined;
  const activeAnotacionData = activeFile ? (getAnnotationPhaseData(activeFile) || activeFile.data) : undefined;

  // Estado para alternar fases (controlado opcionalmente por prop)
  const [internalFase, setInternalFase] = useState<'configuracion' | 'anotacion' | 'elementos3d'>(
    currentFaseProp || (activeFile?.has3DData && !activeFile?.hasConfigData && !activeFile?.hasAnotacionData ? 'elementos3d' : (activeFile?.hasAnotacionData && !activeFile?.hasConfigData ? 'anotacion' : 'configuracion'))
  );

  const currentFase = currentFaseProp !== undefined ? currentFaseProp : internalFase;

  const handleSetFase = (fase: 'configuracion' | 'anotacion' | 'elementos3d') => {
    setInternalFase(fase);
    if (onChangeFase) onChangeFase(fase);
  };

  // Sincronizar fase si el modelo activo solo tiene datos de una de las fases
  useEffect(() => {
    if (activeFile) {
      if (activeFile.has3DData && !activeFile.hasConfigData && !activeFile.hasAnotacionData && currentFase !== 'elementos3d') {
        handleSetFase('elementos3d');
      } else if (activeFile.hasAnotacionData && !activeFile.hasConfigData && !activeFile.has3DData && currentFase !== 'anotacion') {
        handleSetFase('anotacion');
      } else if (activeFile.hasConfigData && !activeFile.hasAnotacionData && !activeFile.has3DData && currentFase !== 'configuracion') {
        handleSetFase('configuracion');
      }
    }
  }, [activeFile?.id, activeFile?.hasConfigData, activeFile?.hasAnotacionData, activeFile?.has3DData]);

  // Estado local para alternar entre vista de auditoría y vista de inspección de datos
  const [showAuditMode, setShowAuditMode] = useState(true);
  const [showVisualDashboard, setShowVisualDashboard] = useState(false);

  useEffect(() => {
    if (currentFase === 'elementos3d') setShowAuditMode(false);
  }, [currentFase]);

  // Ejecutar auditoría sobre el modelo activo para Configuración General
  const auditReport = useMemo(() => {
    return (activeFile && activeFile.hasConfigData && activeConfigData) ? runAudit(activeConfigData, currentProject?.auditConfig, activeFile) : null;
  }, [activeFile, activeConfigData, currentProject?.auditConfig]);

  // Ejecutar auditoría sobre el modelo activo para Elementos de Anotación
  const phase2AuditReport = useMemo(() => {
    return (activeFile && activeFile.hasAnotacionData && activeAnotacionData) 
      ? auditPhase2(activeAnotacionData, currentProject?.auditConfig, activeFile) 
      : null;
  }, [activeFile, activeAnotacionData, currentProject?.auditConfig]);

  // Resumen de resultados de auditoría para el modelo activo según la fase activa
  const { goodCount, alertCount, failedCount } = useMemo(() => {
    if (currentFase === 'elementos3d') return { goodCount: 0, alertCount: 0, failedCount: 0 };
    if (currentFase === 'anotacion') {
      if (!phase2AuditReport) return { goodCount: 0, alertCount: 0, failedCount: 0 };
      return {
        goodCount: phase2AuditReport.summary.good,
        alertCount: phase2AuditReport.summary.alert,
        failedCount: phase2AuditReport.summary.failed
      };
    }
    if (!auditReport) return { goodCount: 0, alertCount: 0, failedCount: 0 };
    const auditResultsList = Object.values(auditReport.results) as { status: 'BUENO' | 'ALERTA' | 'FALLO' }[];
    return {
      goodCount: auditResultsList.filter(r => r.status === 'BUENO').length,
      alertCount: auditResultsList.filter(r => r.status === 'ALERTA').length,
      failedCount: auditResultsList.filter(r => r.status === 'FALLO').length
    };
  }, [currentFase, auditReport, phase2AuditReport]);

  const renderStatusBadge = (status?: 'BUENO' | 'ALERTA' | 'FALLO', text?: string) => {
    if (!showAuditMode || !status) return null;
    
    const isGeneric = !text || ['conforme', 'revisar', 'no conforme', 'fallo'].includes(text.toLowerCase().trim());
    let displayText = isGeneric ? null : text;
    if (displayText) {
      displayText = displayText.replace(/\(?advertencia\)?/gi, '').trim();
      if (!displayText) displayText = null;
    }

    if (status === 'BUENO') {
      return (
        <span 
          title="Conforme" 
          className={`inline-flex items-center justify-center gap-1 font-black rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs ${
            displayText ? 'text-[10px] px-1.5 py-0.5' : 'p-1 px-1.5'
          }`}
        >
          <CheckCircle2 size={displayText ? 11 : 13} className="text-emerald-600 shrink-0" />
          {displayText && <span>{displayText}</span>}
        </span>
      );
    }
    if (status === 'ALERTA') {
      return (
        <span 
          title="Revisar" 
          className={`inline-flex items-center justify-center gap-1 font-black rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs ${
            displayText ? 'text-[10px] px-1.5 py-0.5' : 'p-1 px-1.5'
          }`}
        >
          <AlertTriangle size={displayText ? 11 : 13} className="text-amber-500 shrink-0" />
          {displayText && <span>{displayText}</span>}
        </span>
      );
    }
    return (
      <span 
        title="No conforme" 
        className={`inline-flex items-center justify-center gap-1 font-black rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs ${
          displayText ? 'text-[10px] px-1.5 py-0.5' : 'p-1 px-1.5'
        }`}
      >
        <XCircle size={displayText ? 11 : 13} className="text-rose-600 shrink-0" />
        {displayText && <span>{displayText}</span>}
      </span>
    );
  };

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

  const handleExportExcel = () => {
    if (!activeFile) return;

    const baseName = activeFile.customName || activeFile.name || 'modelo';

    if (currentFase === 'elementos3d') {
      if (activeFile.model3DData) export3DPageToExcel(activeFile.model3DData, baseName);
      return;
    }

    if (currentFase === 'anotacion') {
      if (activeAnotacionData) exportAnnotationPageToExcel(activeAnotacionData, baseName);
      return;
    }

    if (activeConfigData) exportConfigPageToExcel(activeConfigData, baseName);
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
          Para realizar la auditoría de <strong className="text-slate-600 font-bold not-italic">Configuración General</strong>, primero debes importar los modelos de Revit (Estructura, Arquitectura, Instalaciones, etc.).
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
      {/* ============================================================ */}
      {/* TARJETA ÚNICA DE ENCABEZADO UNIFICADO                        */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 space-y-5">
        {/* FILA 1: Títulos de jerarquía, fase y controles de modo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-300">
                {currentFase === 'elementos3d' ? 'ELEMENTOS 3D' : (currentFase === 'anotacion' ? 'ELEMENTOS DE ANOTACIÓN' : 'CONFIGURACIÓN GENERAL')}
              </span>
            </div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">
              {showAuditMode ? 'RESULTADO AUDITORÍA' : 'DATOS DEL MODELO'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 text-[10px] font-black uppercase tracking-wide transition-all shadow-2xs"
              title="Exportar esta página a Excel; cada tarjeta se crea como una hoja independiente"
            >
              <FileSpreadsheet size={14} />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => setShowVisualDashboard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 text-[10px] font-black uppercase tracking-wide transition-all shadow-2xs"
              title="Abrir resumen visual del modelo"
            >
              <LayoutDashboard size={14} />
              <span>Resumen visual</span>
            </button>

            {/* Selector de Fase */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => handleSetFase('configuracion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  currentFase === 'configuracion' 
                    ? 'bg-white text-zinc-900 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span>Config. General</span>
              </button>
              <button
                onClick={() => handleSetFase('anotacion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  currentFase === 'anotacion' 
                    ? 'bg-white text-zinc-900 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span>Elem. Anotación</span>
              </button>
              <button
                onClick={() => handleSetFase('elementos3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  currentFase === 'elementos3d' 
                    ? 'bg-white text-zinc-900 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span>Elementos 3D</span>
              </button>
            </div>

            {/* Selector de Modo: Auditoría vs Datos Modelo */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => setShowAuditMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  showAuditMode 
                    ? 'bg-white text-zinc-900 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ShieldCheck size={12} className={showAuditMode ? 'text-zinc-900' : 'text-zinc-400'} />
                <span>Auditoría</span>
              </button>
              <button
                onClick={() => setShowAuditMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  !showAuditMode 
                    ? 'bg-white text-zinc-900 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Eye size={12} className={!showAuditMode ? 'text-zinc-900' : 'text-zinc-400'} />
                <span>Datos</span>
              </button>
            </div>
          </div>
        </div>

        {/* FILA 2: Pestañas de selección de modelos con badges normativos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {files.map(file => {
            const isActive = file.id === activeFile?.id;
            const discColor = getDisciplineColorClasses(file.modelType);

            const fileHasThisPhase = currentFase === 'elementos3d' ? file.has3DData : (currentFase === 'anotacion' ? file.hasAnotacionData : file.hasConfigData);

            let fileFailed = 0;
            let fileAlerts = 0;

            if (currentFase === 'anotacion' && file.hasAnotacionData) {
              const fAudit2 = auditPhase2(getAnnotationPhaseData(file) || file.data, currentProject?.auditConfig, file);
              fileFailed = fAudit2.summary.failed;
              fileAlerts = fAudit2.summary.alert;
            } else if (currentFase === 'configuracion' && file.hasConfigData) {
              const fileAudit = runAudit(getConfigPhaseData(file) || file.data, currentProject?.auditConfig, file);
              fileFailed = fileAudit ? Object.values(fileAudit.results).filter(r => r.status === 'FALLO').length : 0;
              fileAlerts = fileAudit ? Object.values(fileAudit.results).filter(r => r.status === 'ALERTA').length : 0;
            }

            return (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                  isActive
                    ? `${discColor.activeTab}`
                    : `${discColor.inactiveTab}`
                }`}
                title={`Modelo: ${file.customName || file.name}`}
              >
                <span className={isActive ? 'text-white' : 'opacity-80'}>
                  {getDisciplineIcon(file.modelType, 14)}
                </span>

                <div className="flex flex-col text-left">
                  <span className="leading-tight text-xs font-black">
                    {file.customName || getDisciplineLabel(file.modelType)}
                  </span>
                  <span className={`text-[9.5px] font-mono leading-none ${isActive ? 'text-white/80' : 'text-zinc-400'}`}>
                    {currentFase === 'elementos3d'
                      ? (file.has3DData ? `${(file.model3DElementCount ?? calculate3DElementCount(file.model3DData)).toLocaleString()} elem.` : 'Sin datos')
                      : currentFase === 'anotacion' 
                        ? (file.hasAnotacionData ? `${(file.anotacionElementCount || calculatePhase2ElementCount(getAnnotationPhaseData(file) || file.data)).toLocaleString()} elem.` : 'Sin datos')
                        : (file.hasConfigData ? `${(file.configElementCount || file.elementCount).toLocaleString()} elem.` : 'Sin datos')}
                  </span>
                </div>

                {/* Badge de estado del modelo */}
                {!fileHasThisPhase ? (
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    Pendiente
                  </span>
                ) : currentFase === 'elementos3d' ? (
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    Datos
                  </span>
                ) : fileFailed > 0 ? (
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-fallo-500/80 text-white' : 'bg-fallo-100 text-fallo-700'
                  }`} title={`${fileFailed} fallos normativos detectados`}>
                    {fileFailed} {fileFailed === 1 ? 'fallo' : 'fallos'}
                  </span>
                ) : fileAlerts > 0 ? (
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-alerta-400/80 text-white' : 'bg-alerta-100 text-alerta-800'
                  }`} title={`${fileAlerts} alertas detectadas`}>
                    {fileAlerts} {fileAlerts === 1 ? 'alerta' : 'alertas'}
                  </span>
                ) : (
                  <CheckCircle2 size={13} className={isActive ? 'text-white' : 'text-ok-500'} />
                )}
              </button>
            );
          })}

          {/* Botón para añadir otro modelo directamente */}
          <button
            onClick={onNavigateToManagement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-200 transition-all shrink-0"
            title="Importar o gestionar modelos"
          >
            <Plus size={13} />
            <span>Añadir modelo</span>
          </button>
        </div>

        {/* FILA 3: Metadatos del modelo activo y badges de salud de auditoría */}
        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800">
              {getDisciplineIcon(activeFile?.modelType, 20)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-zinc-900">
                  {activeFile?.customName || activeFile?.name}
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getDisciplineColorClasses(activeFile?.modelType).badge}`}>
                  {getDisciplineLabel(activeFile?.modelType)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 font-medium flex-wrap">
                <span className="font-mono text-zinc-600 font-bold">
                  {currentFase === 'elementos3d'
                    ? (activeFile?.model3DFileName || activeFile?.name)
                    : currentFase === 'anotacion' 
                      ? (activeFile?.anotacionFileName || activeFile?.name) 
                      : (activeFile?.configFileName || activeFile?.name)}
                </span>
                <span>•</span>
                <span>
                  Exportado: {currentFase === 'elementos3d'
                    ? (activeFile?.model3DCreatedAt || activeFile?.createdAt || activeFile?.date)
                    : currentFase === 'anotacion' 
                      ? (activeFile?.anotacionCreatedAt || activeFile?.createdAt || activeFile?.date) 
                      : (activeFile?.configCreatedAt || activeFile?.createdAt || activeFile?.date)}
                </span>
                <span>•</span>
                <span className="font-mono font-bold text-zinc-700">
                  {currentFase === 'elementos3d'
                    ? `${(activeFile?.model3DElementCount ?? calculate3DElementCount(activeFile?.model3DData)).toLocaleString()} elementos`
                    : currentFase === 'anotacion' 
                      ? `${(activeFile?.anotacionElementCount || calculatePhase2ElementCount(activeAnotacionData as any)).toLocaleString()} elementos`
                      : `${(activeFile?.configElementCount || activeFile?.elementCount || 0).toLocaleString()} elementos`}
                </span>
                {currentFase === 'elementos3d' && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold text-zinc-700">
                      {calculate3DCategoryCount(activeFile?.model3DData).toLocaleString()} categorías
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Resumen de salud del modelo en auditoría */}
          {showAuditMode && currentFase !== 'elementos3d' && (
            <div className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200 self-stretch sm:self-auto justify-between sm:justify-start flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-zinc-800 border border-zinc-200 shadow-2xs">
                <CheckCheck size={13} className="text-zinc-800" />
                <span className="text-xs font-bold">{goodCount} Conformes</span>
              </div>

              {failedCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 text-white border border-zinc-900">
                  <XCircle size={13} className="text-white" />
                  <span className="text-xs font-bold">{failedCount} {failedCount === 1 ? 'Fallo' : 'Fallos'}</span>
                </div>
              )}

              {alertCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-900 border border-zinc-300">
                  <AlertTriangle size={13} className="text-zinc-800" />
                  <span className="text-xs font-bold">{alertCount} {alertCount === 1 ? 'Alerta' : 'Alertas'}</span>
                </div>
              )}

              {failedCount === 0 && alertCount === 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200">
                  <CheckCircle2 size={13} className="text-zinc-700" />
                  <span className="text-xs font-bold">100% Conforme</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MATRIZ DE TARJETAS DE RESUMEN DE INFORMACIÓN (10 CATEGORÍAS) */}
      {/* Mostrado antes de las tarjetas de información detallada       */}
      {/* ============================================================ */}
      {activeFile?.hasConfigData && currentFase === 'configuracion' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {/* 1. Nomenclatura */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <FileCode size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">1. Nomenclat.</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-base font-black font-mono text-zinc-900 truncate max-w-[70px]" title={activeFile.name}>
                {activeConfigData?.modelo?.nombre_archivo ? 'OK' : '---'}
              </span>
              {renderStatusBadge(auditReport?.results.nomenclatura?.status)}
            </div>
          </div>

          {/* 2. Tamaño */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Database size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">2. Tamaño</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.informacion_general?.tamano_archivo_mb ? `${activeConfigData.codechecking.informacion_general.tamano_archivo_mb.toFixed(0)} MB` : '0 MB'}
              </span>
              {renderStatusBadge(auditReport?.results.tamano?.status)}
            </div>
          </div>

          {/* 3. Coordenadas */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Compass size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">3. Coordenadas</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.posicion_coordenadas?.sistema_coordenadas ? 'Coord' : 'PBP'}
              </span>
              {renderStatusBadge(auditReport?.results.coordenadas?.status)}
            </div>
          </div>

          {/* 4. Subproyectos */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <FolderTree size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">4. Subproy.</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.subproyectos?.cantidad_worksets || activeConfigData?.codechecking?.subproyectos?.existentes?.length || 0}
              </span>
              {renderStatusBadge(auditReport?.results.subproyectos?.status)}
            </div>
          </div>

          {/* 5. Warnings */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <AlertTriangle size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">5. Warnings</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.warnings?.total_incidencias || 0}
              </span>
              {renderStatusBadge(auditReport?.results.warnings?.status)}
            </div>
          </div>

          {/* 6. Filtros Vista */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Sliders size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">6. Filtros</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.filtros_vista?.total_filtros || activeConfigData?.codechecking?.filtros_vista?.nombres_filtros?.length || 0}
              </span>
              {renderStatusBadge(auditReport?.results.filtros?.status)}
            </div>
          </div>

          {/* 7. Opciones de Diseño */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Layers size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">7. Opciones</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {extractProjectDesignOptions(activeConfigData as any).length || activeConfigData?.codechecking?.opciones_diseno?.cantidad || 0}
              </span>
              {renderStatusBadge(auditReport?.results.opcionesDiseno?.status)}
            </div>
          </div>

          {/* 8. Fases */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Calendar size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">8. Fases</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {extractProjectPhases(activeConfigData as any).length}
              </span>
              {renderStatusBadge(auditReport?.results.fases?.status)}
            </div>
          </div>

          {/* 9. Niveles */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Layers size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">9. Niveles</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.niveles?.listado?.length || 0}
              </span>
              {renderStatusBadge(auditReport?.results.niveles?.status)}
            </div>
          </div>

          {/* 10. Rejillas */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
              <Grid size={12} className="shrink-0 text-zinc-400" />
              <span className="truncate">10. Rejillas</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-zinc-900">
                {activeConfigData?.codechecking?.rejillas?.listado?.length || 0}
              </span>
              {renderStatusBadge(auditReport?.results.rejillas?.status)}
            </div>
          </div>
        </div>
      )}

      {/* Renderizado de las tarjetas detalladas dependiendo de la fase */}
      {activeFile && (
        <motion.div
          key={activeFile.id + currentFase + (showAuditMode ? '_audit' : '_info')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentFase === 'elementos3d' ? (
            activeFile.has3DData ? (
              <Elements3DView data={activeFile.model3DData} showAudit={showAuditMode} />
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border border-zinc-200 shadow-xs max-w-xl mx-auto my-6">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-800 mx-auto mb-4"><Layers size={28} /></div>
                <h3 className="text-lg font-black text-zinc-900">Fase de Elementos 3D no cargada</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Este modelo aún no tiene cargado el JSON de <strong>Elementos 3D</strong>.</p>
                <button onClick={onNavigateToManagement} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"><Plus size={15} /><span>Introducir Elementos 3D</span></button>
              </div>
            )
          ) : currentFase === 'configuracion' ? (
            activeFile.hasConfigData ? (
              <DashboardView
                bimData={activeConfigData!}
                auditConfig={currentProject.auditConfig}
                activeFile={activeFile}
                onOpenWarningModal={onOpenWarningModal}
                onOpenGridsModal={onOpenGridsModal}
                showAudit={showAuditMode}
                hideSummaryBanner={true}
              />
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border border-zinc-200 shadow-xs max-w-xl mx-auto my-6">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-800 mx-auto mb-4"><Layers size={28} /></div>
                <h3 className="text-lg font-black text-zinc-900">Fase de Configuración General no cargada</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Este modelo ({activeFile.customName || activeFile.name}) aún no tiene cargado el archivo JSON correspondiente a la auditoría de <strong>Configuración General</strong>.</p>
                <button onClick={onNavigateToManagement} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"><Plus size={15} /><span>Introducir Configuración General</span></button>
              </div>
            )
          ) : (
            activeFile.hasAnotacionData ? (
              <DocumentationView bimData={activeAnotacionData!} activeFile={activeFile} auditConfig={currentProject?.auditConfig} showAudit={showAuditMode} />
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border border-zinc-200 shadow-xs max-w-xl mx-auto my-6">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-800 mx-auto mb-4"><Layers size={28} /></div>
                <h3 className="text-lg font-black text-zinc-900">Fase de Elementos de Anotación no cargada</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Este modelo ({activeFile.customName || activeFile.name}) aún no tiene cargado el archivo JSON correspondiente a la auditoría de <strong>Elementos de Anotación</strong>.</p>
                <button onClick={onNavigateToManagement} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"><Plus size={15} /><span>Introducir Elementos de Anotación</span></button>
              </div>
            )
          )}
        </motion.div>
      )}

      <ModelVisualDashboard
        isOpen={showVisualDashboard}
        onClose={() => setShowVisualDashboard(false)}
        projectName={currentProject.name}
        file={activeFile}
        auditResults={{ ...auditReport?.results, ...phase2AuditReport?.results }}
      />
    </div>
  );
};
