import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileJson, 
  Trash2, 
  RefreshCw, 
  Edit3, 
  Check, 
  X, 
  Layers, 
  Building2, 
  Wrench, 
  Trees, 
  Network, 
  FileBox, 
  Plus, 
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Info,
  Database,
  FileCode,
  FileText,
  Table2,
  DoorOpen,
  Eye,
  Sliders,
  Copy,
  Pin
} from 'lucide-react';
import { Project, ProjectFile, RevitBimData, ModelDiscipline } from '../../types';
import { readJsonFile } from '../../utils/fileUtils';
import { auditModelName } from '../../lib/auditEngine';
import { 
  MODEL_DISCIPLINES, 
  detectModelDiscipline, 
  getDisciplineLabel, 
  getDisciplineColorClasses,
  ensureFileMetadata,
  isPhase2Data,
  normalizeBimData,
  calculatePhase2ElementCount,
  unifyProjectFilesList,
  hasAnnotationData,
  hasGeneralConfigData,
  calculate3DElementCount
} from '../../utils/modelUtils';

interface ManagementViewProps {
  currentProject: Project;
  selectedFileId: string | null;
  onSelectFileForDashboard: (fileId: string, targetPhase?: 'configuracion' | 'anotacion' | 'elementos3d') => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAddNewFileToProject: (newFile: ProjectFile) => void;
  onUpdateFileData: (fileId: string, phase: 'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D', newData: RevitBimData, rawData: any, elementCount: number, meta: { fileName: string; importedAt: string; exportedAt: string }) => void;
  onUpdateFileMetadata: (fileId: string, customName: string, modelType: ModelDiscipline) => void;
  onDeleteFile: (fileId: string, phase?: 'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D') => void;
  onClearAllFiles?: () => void;
  onClearPhaseFiles?: (phase: 'Configuración General' | 'Elementos de Anotación') => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  currentProject,
  selectedFileId,
  onSelectFileForDashboard,
  onAddNewFileToProject,
  onUpdateFileData,
  onUpdateFileMetadata,
  onDeleteFile,
  onClearAllFiles,
  onClearPhaseFiles
}) => {
  const [updatingFileId, setUpdatingFileId] = useState<string | null>(null);
  const [updatingPhase, setUpdatingPhase] = useState<'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D' | null>(null);
  const updateInputRef = useRef<HTMLInputElement>(null);

  // Estados para modal de nuevo modelo
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [modalTargetPhase, setModalTargetPhase] = useState<'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D'>('Configuración General');
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalBimData, setModalBimData] = useState<RevitBimData | null>(null);
  const [modalRawData, setModalRawData] = useState<any | null>(null);
  const [modalCustomName, setModalCustomName] = useState('');
  const [modalModelType, setModalModelType] = useState<ModelDiscipline>('estructura');
  const [modalError, setModalError] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Estado para drag and drop en la vista general
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Estado para edición en línea de nombre de modelo
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editTypeInput, setEditTypeInput] = useState<ModelDiscipline>('estructura');

  // Filtros de disciplina para cada sección
  const [selectedConfigFilter, setSelectedConfigFilter] = useState<string>('todos');
  const [selectedAnotacionFilter, setSelectedAnotacionFilter] = useState<string>('todos');
  const [selected3DFilter, setSelected3DFilter] = useState<string>('todos');

  // Normalizar los archivos del proyecto con metadatos y unificación sin duplicados
  const projectFiles = unifyProjectFilesList((currentProject?.files || []).map(ensureFileMetadata));

  // Separar archivos por fase de auditoría
  const configuracionFiles = projectFiles.filter(f => f.hasConfigData);
  const anotacionFiles = projectFiles.filter(f => f.hasAnotacionData);
  const model3DFiles = projectFiles.filter(f => f.has3DData);
  const filtered3DFiles = selected3DFilter === 'todos' ? model3DFiles : model3DFiles.filter(f => f.modelType === selected3DFilter);

  // Disciplinas base para el resumen
  const coreDisciplines: ModelDiscipline[] = ['estructura', 'arquitectura', 'instalaciones', 'urbanizacion', 'federado'];

  const formatReliableDateTime = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getDisciplineIcon = (type?: ModelDiscipline) => {
    switch (type) {
      case 'estructura': return <Layers size={16} className="text-zinc-800" />;
      case 'arquitectura': return <Building2 size={16} className="text-zinc-800" />;
      case 'instalaciones': return <Wrench size={16} className="text-zinc-800" />;
      case 'urbanizacion': return <Trees size={16} className="text-zinc-800" />;
      case 'federado': return <Network size={16} className="text-zinc-800" />;
      default: return <FileBox size={16} className="text-zinc-600" />;
    }
  };

  // Manejador para abrir modal de importación con fase y disciplina preseleccionadas
  const openImportForDiscipline = (phase: 'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D' = 'Configuración General', disc?: ModelDiscipline) => {
    setModalTargetPhase(phase);
    setModalFile(null);
    setModalBimData(null);
    setModalRawData(null);
    setModalError(null);
    if (disc) {
      setModalModelType(disc);
      const discDef = MODEL_DISCIPLINES.find(d => d.key === disc);
      setModalCustomName(discDef ? discDef.defaultName : '');
    } else {
      setModalModelType('estructura');
      setModalCustomName('');
    }
    setIsImportModalOpen(true);
  };

  // Procesar archivo JSON cargado
  const processJsonFile = async (file: File, targetPhase?: 'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D', preselectedDisc?: ModelDiscipline) => {
    try {
      setModalError(null);
      const rawJson = await readJsonFile(file);
      
      const bim = normalizeBimData(rawJson);
      setModalRawData(rawJson);

      // Si no se especificó targetPhase, inferir según el contenido
      const inferredPhase = targetPhase || (isPhase2Data(rawJson) ? 'Elementos de Anotación' : 'Configuración General');
      setModalTargetPhase(inferredPhase);

      setModalFile(file);
      setModalBimData(bim);

      // Si se preseleccionó una disciplina, respetarla; de lo contrario autodetectar
      const finalDisc = preselectedDisc || detectModelDiscipline(file.name, bim);
      setModalModelType(finalDisc);

      // Sugerir nombre legible basado en la disciplina o el nombre del archivo
      const discDef = MODEL_DISCIPLINES.find(d => d.key === finalDisc);
      const suggestedName = discDef ? discDef.defaultName : file.name.replace(/\.json$/i, '').toUpperCase();
      setModalCustomName(suggestedName);

      setIsImportModalOpen(true);
    } catch (err: any) {
      setModalError(`Error al leer el archivo JSON: ${err?.message || 'Comprueba que el archivo tenga un formato JSON válido.'}`);
    }
  };

  // Procesar archivo seleccionado mediante input file en el modal
  const handleModalFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processJsonFile(file, modalTargetPhase, modalModelType);
    if (e.target) e.target.value = '';
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent, targetPhase: 'Configuración General' | 'Elementos de Anotación' | 'Elementos 3D' = 'Configuración General', targetDiscipline?: ModelDiscipline) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.json')) {
      await processJsonFile(file, targetPhase, targetDiscipline);
    }
  };

  // Limpiar modelos de una fase
  const handleClearPhaseModels = (phase: 'Configuración General' | 'Elementos de Anotación') => {
    const phaseName = phase === 'Configuración General' ? 'Configuración General' : 'Elementos de Anotación';
    if (window.confirm(`¿Seguro que deseas eliminar todos los modelos de ${phaseName}?`)) {
      if (onClearPhaseFiles) {
        onClearPhaseFiles(phase);
      } else {
        onClearAllFiles?.();
      }
    }
  };

  // Confirmar importación desde el modal
  const confirmModalImport = () => {
    if (!modalFile || !modalBimData) {
      setModalError('Debes seleccionar un archivo JSON para este modelo.');
      return;
    }

    let totalElements = 0;
    if (modalTargetPhase === 'Elementos 3D') {
      totalElements = calculate3DElementCount(modalRawData);
    } else if (modalTargetPhase === 'Elementos de Anotación') {
      totalElements = calculatePhase2ElementCount(modalBimData);
    } else {
      totalElements = modalBimData.codechecking?.subproyectos?.existentes?.reduce(
        (acc: number, w: any) => acc + (w.num_elementos || 0), 0
      ) || 0;
    }

    // Metadatos fiables: el nombre viene del File real, la exportación del JSON y
    // la importación se genera en este instante dentro de la app.
    const importedAt = new Date().toISOString();
    const exportedAt = typeof modalRawData?.fecha_exportacion === 'string'
      ? modalRawData.fecha_exportacion
      : (typeof modalBimData.fecha_exportacion === 'string' ? modalBimData.fecha_exportacion : '');

    const is3D = modalTargetPhase === 'Elementos 3D';
    const isPhase2 = !is3D && (modalTargetPhase === 'Elementos de Anotación' || isPhase2Data(modalBimData));
    const hasConfig = !is3D && (!isPhase2 || hasGeneralConfigData(modalBimData));
    const hasAnot = !is3D && (isPhase2 || hasAnnotationData(modalBimData));

    const newFile: ProjectFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: modalFile.name,
      customName: modalCustomName.trim() || getDisciplineLabel(modalModelType),
      modelType: modalModelType,
      auditPhase: hasConfig && hasAnot ? 'Unificado' : modalTargetPhase,
      date: new Date(importedAt).toLocaleDateString('es-ES'),
      createdAt: importedAt,
      elementCount: totalElements,
      hasConfigData: hasConfig,
      hasAnotacionData: hasAnot,
      has3DData: is3D,
      model3DFileName: is3D ? modalFile.name : undefined,
      model3DImportedAt: is3D ? importedAt : undefined,
      model3DExportedAt: is3D ? exportedAt : undefined,
      model3DCreatedAt: is3D ? exportedAt : undefined,
      model3DElementCount: is3D ? totalElements : undefined,
      model3DData: is3D ? modalRawData : undefined,
      configFileName: hasConfig ? modalFile.name : undefined,
      configImportedAt: hasConfig ? importedAt : undefined,
      configExportedAt: hasConfig ? exportedAt : undefined,
      configCreatedAt: hasConfig ? exportedAt : undefined,
      configElementCount: hasConfig ? totalElements : undefined,
      anotacionFileName: hasAnot ? modalFile.name : undefined,
      anotacionImportedAt: hasAnot ? importedAt : undefined,
      anotacionExportedAt: hasAnot ? exportedAt : undefined,
      anotacionCreatedAt: hasAnot ? exportedAt : undefined,
      anotacionElementCount: hasAnot ? totalElements : undefined,
      configData: hasConfig ? modalBimData : undefined,
      anotacionData: hasAnot ? modalBimData : undefined,
      data: modalBimData
    };

    onAddNewFileToProject(newFile);
    setIsImportModalOpen(false);
    setModalFile(null);
    setModalBimData(null);
    setModalRawData(null);
  };

  // Reemplazar / actualizar JSON existente. La fase se conoce por el botón pulsado,
  // por lo que no dependemos de inferencias del contenido para actualizar metadatos.
  const handleUpdateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !updatingFileId || !updatingPhase) return;

    try {
      const rawJson = await readJsonFile(file);
      const bimData = normalizeBimData(rawJson);

      let totalElements = 0;
      if (updatingPhase === 'Elementos 3D') {
        totalElements = calculate3DElementCount(rawJson);
      } else if (updatingPhase === 'Elementos de Anotación') {
        totalElements = calculatePhase2ElementCount(bimData);
      } else {
        totalElements = bimData.codechecking?.subproyectos?.existentes?.reduce(
          (acc: number, w: any) => acc + (w.num_elementos || 0), 0
        ) || 0;
      }

      const importedAt = new Date().toISOString();
      const exportedAt = typeof rawJson?.fecha_exportacion === 'string'
        ? rawJson.fecha_exportacion
        : (typeof bimData.fecha_exportacion === 'string' ? bimData.fecha_exportacion : '');

      onUpdateFileData(updatingFileId, updatingPhase, bimData, rawJson, totalElements, {
        fileName: file.name,
        importedAt,
        exportedAt
      });
      setUpdatingFileId(null);
      setUpdatingPhase(null);
    } catch (err) {
      alert('Error al procesar el archivo JSON. Comprueba el formato.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Iniciar edición en línea
  const startEditing = (file: ProjectFile) => {
    setEditingFileId(file.id);
    setEditNameInput(file.customName || file.name);
    setEditTypeInput(file.modelType || 'estructura');
  };

  // Guardar edición en línea
  const saveEditing = (fileId: string) => {
    onUpdateFileMetadata(fileId, editNameInput.trim() || 'Modelo', editTypeInput);
    setEditingFileId(null);
  };

  // Archivos filtrados por categoría
  const filteredConfigFiles = configuracionFiles.filter(f => {
    if (selectedConfigFilter === 'todos') return true;
    return f.modelType === selectedConfigFilter;
  });

  const filteredAnotacionFiles = anotacionFiles.filter(f => {
    if (selectedAnotacionFilter === 'todos') return true;
    return f.modelType === selectedAnotacionFilter;
  });

  return (
    <motion.div 
      key="management"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="space-y-6 max-w-7xl mx-auto relative"
    >
      {/* Overlay al arrastrar archivo sobre la página */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-zinc-900/10 border-4 border-dashed border-zinc-500 rounded-3xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-zinc-200 flex flex-col items-center gap-3">
            <Upload size={36} className="text-zinc-800 animate-bounce" />
            <p className="text-base font-black text-zinc-900">Suelta aquí el archivo JSON de tu modelo de Revit</p>
            <span className="text-xs font-bold text-zinc-500">Se clasificará automáticamente según su fase y disciplina</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. TÍTULO GENERAL DE LA PÁGINA: MODELOS DEL PROYECTO         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-zinc-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              MODELOS DEL PROYECTO
            </h1>
            <p className="text-xs italic text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Centro de control y organización de los modelos BIM del proyecto. Gestiona las fuentes de datos según su fase y tipo de auditoría.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-zinc-50 border border-zinc-200/70 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zinc-800 shadow-2xs border border-zinc-200">
                <Layers size={18} />
              </div>
              <div>
                <span className="text-micro font-black uppercase text-zinc-400 block leading-tight">
                  Modelos Registrados
                </span>
                <span className="text-lg font-black text-zinc-900 font-mono">
                  {projectFiles.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SECCIÓN UNIFICADA: CONFIGURACIÓN GENERAL                  */}
      {/* ============================================================ */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-zinc-200/80 space-y-6">
        {/* Cabecera de la Sección Configuración General */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-500">
                {configuracionFiles.length} {configuracionFiles.length === 1 ? 'modelo introducido' : 'modelos introducidos'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-300">
                Fase 1 • Configuración General
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              CONFIGURACIÓN GENERAL
            </h2>
            <p className="text-xs italic text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Introduce y gestiona los modelos Revit de tu proyecto (Estructura, Arquitectura, Instalaciones, etc.). Podrás auditar individualmente sus parámetros de configuración general.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {configuracionFiles.length > 0 && (
              <button
                onClick={() => handleClearPhaseModels('Configuración General')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 text-xs font-bold transition-all"
                title="Eliminar todos los modelos actuales de Configuración General"
              >
                <Trash2 size={16} />
                <span>Limpiar lista</span>
              </button>
            )}

            <button 
              onClick={() => openImportForDiscipline('Configuración General')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Introducir modelo</span>
            </button>
          </div>
        </div>

        {/* Disciplinas de Configuración General */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-micro font-black uppercase tracking-wider text-zinc-400">
              Disciplinas de Configuración General
            </span>
            <span className="text-micro font-bold text-zinc-400 hidden sm:inline">
              Arrastra un archivo .json sobre la disciplina correspondiente
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {coreDisciplines.map(discKey => {
              const matchingFiles = configuracionFiles.filter(f => f.modelType === discKey);
              const isUploaded = matchingFiles.length > 0;
              const discDef = MODEL_DISCIPLINES.find(d => d.key === discKey);

              return (
                <div 
                  key={discKey}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => handleDrop(e, 'Configuración General', discKey)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isUploaded 
                      ? 'bg-white border-zinc-200 shadow-sm' 
                      : 'bg-zinc-50/70 border-dashed border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-100">
                        {getDisciplineIcon(discKey)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-800">{discDef?.label}</h4>
                        <span className="text-dato font-bold text-zinc-400">
                          {isUploaded ? `${matchingFiles.length} cargado` : 'Sin introducir'}
                        </span>
                      </div>
                    </div>
                    {isUploaded ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 ring-4 ring-zinc-200" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                    )}
                  </div>

                  {isUploaded ? (
                    <button
                      onClick={() => onSelectFileForDashboard(matchingFiles[0].id)}
                      className="flex items-center justify-between text-nota font-bold text-zinc-800 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded-xl transition-all"
                    >
                      <span className="truncate max-w-[100px]">{matchingFiles[0].customName || matchingFiles[0].name}</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => openImportForDiscipline('Configuración General', discKey)}
                      className="flex items-center justify-center gap-1 text-nota font-bold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1.5 rounded-xl border border-zinc-200 transition-all shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>+ Introducir {discDef?.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla / Lista de modelos de Configuración General */}
        {configuracionFiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border-2 border-dashed border-zinc-200 shadow-sm max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-700 mx-auto">
              <Upload size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-800">Introduce los modelos de tu proyecto</h3>
              <p className="text-xs italic text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Añade los archivos JSON generados desde Revit para auditar la configuración general de cada disciplina del proyecto.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => openImportForDiscipline('Configuración General')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Introducir modelo JSON</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
                <button
                  onClick={() => setSelectedConfigFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedConfigFilter === 'todos' 
                      ? 'bg-zinc-900 text-white shadow-sm' 
                      : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200'
                  }`}
                >
                  Todos ({configuracionFiles.length})
                </button>
                {MODEL_DISCIPLINES.filter(d => configuracionFiles.some(f => f.modelType === d.key)).map(d => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedConfigFilter(d.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedConfigFilter === d.key 
                        ? 'bg-zinc-900 text-white shadow-sm' 
                        : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => openImportForDiscipline('Configuración General')}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  <Plus size={14} />
                  <span>Añadir otro modelo</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-left">
                <thead className="text-dato font-black uppercase text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4">Modelo & Disciplina</th>
                    <th className="px-6 py-4">Fase Auditoría</th>
                    <th className="px-6 py-4">Fecha Importación</th>
                    <th className="px-6 py-4">Exportación Revit</th>
                    <th className="px-6 py-4">Elementos</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filteredConfigFiles.map(file => {
                    const isEditing = editingFileId === file.id;
                    const discColor = getDisciplineColorClasses(file.modelType);

                    return (
                      <tr key={file.id} className="hover:bg-zinc-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2 max-w-xs">
                              <input
                                value={editNameInput}
                                onChange={(e) => setEditNameInput(e.target.value)}
                                className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-zinc-400 bg-white"
                                placeholder="Nombre del modelo"
                                autoFocus
                              />
                              <select
                                value={editTypeInput}
                                onChange={(e) => setEditTypeInput(e.target.value as ModelDiscipline)}
                                className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-zinc-200 bg-white"
                              >
                                {MODEL_DISCIPLINES.map(d => (
                                  <option key={d.key} value={d.key}>{d.label}</option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditing(file.id)}
                                  className="flex items-center gap-1 text-dato font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-2 py-1 rounded-md"
                                >
                                  <Check size={12} /> Guardar
                                </button>
                                <button
                                  onClick={() => setEditingFileId(null)}
                                  className="flex items-center gap-1 text-dato font-bold text-zinc-500 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-md"
                                >
                                  <X size={12} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 shrink-0 mt-0.5">
                                {getDisciplineIcon(file.modelType)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-zinc-900 text-sm">
                                    {file.customName || file.name}
                                  </span>
                                  <span className={`text-etiqueta font-black uppercase px-2 py-0.5 rounded-md border ${discColor.badge}`}>
                                    {getDisciplineLabel(file.modelType)}
                                  </span>
                                  {(() => {
                                    const rawName = file.data?.modelo?.nombre_archivo || file.name;
                                    const nAudit = auditModelName(rawName, currentProject?.auditConfig);
                                    return (
                                      <span 
                                        className={`text-micro font-black px-1.5 py-0.5 rounded border ${
                                          nAudit.status === 'BUENO'
                                            ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                                            : 'bg-zinc-900 text-white border-zinc-900'
                                        }`}
                                      >
                                        {nAudit.status === 'BUENO' ? '7B OK' : 'Nom.'}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-mono text-zinc-400 truncate max-w-xs" title={file.configFileName || file.name}>
                                    {file.configFileName || file.name}
                                  </span>
                                  <button
                                    onClick={() => startEditing(file)}
                                    className="text-zinc-400 hover:text-zinc-800 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Renombrar o cambiar disciplina"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-300 text-xs font-bold">
                            <span>Configuración General</span>
                          </span>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                          {formatReliableDateTime(file.configImportedAt || file.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-zinc-800">
                              {formatReliableDateTime(file.configExportedAt || file.configCreatedAt)}
                            </span>
                            <span className="text-micro text-zinc-400">
                              Revit {file.data?.modelo?.revit_version || '2025'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-200">
                            {(file.configElementCount || file.elementCount || 0).toLocaleString()} elem.
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectFileForDashboard(file.id, 'configuracion')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                              title="Auditar este modelo"
                            >
                              <SlidersHorizontal size={14} />
                              <span>Auditar</span>
                            </button>

                            <button
                              onClick={() => {
                                setUpdatingFileId(file.id);
                                setUpdatingPhase('Configuración General');
                                updateInputRef.current?.click();
                              }}
                              className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Actualizar con nueva exportación JSON de Revit"
                            >
                              <RefreshCw size={16} />
                            </button>

                            <button
                              onClick={() => onDeleteFile(file.id, 'Configuración General')}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Eliminar datos de Configuración General"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 3. SECCIÓN HABILITADA: ELEMENTOS DE ANOTACIÓN (FASE 2)       */}
      {/* Exacta paridad estructural y visual con CONFIGURACIÓN GENERAL*/}
      {/* ============================================================ */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-zinc-200/80 space-y-6">
        {/* Cabecera de la Sección Elementos de Anotación */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-500">
                {anotacionFiles.length} {anotacionFiles.length === 1 ? 'modelo introducido' : 'modelos introducidos'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-300">
                Fase 2 • Elementos de Anotación
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              ELEMENTOS DE ANOTACIÓN
            </h2>
            <p className="text-xs italic text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Introduce y gestiona los modelos Revit con la exportación de Vistas, Plantillas, Planos, Tablas, Habitaciones, Vínculos CAD, Parámetros y Grupos de Anotación.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {anotacionFiles.length > 0 && (
              <button
                onClick={() => handleClearPhaseModels('Elementos de Anotación')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 text-xs font-bold transition-all"
                title="Eliminar todos los modelos actuales de Elementos de Anotación"
              >
                <Trash2 size={16} />
                <span>Limpiar lista</span>
              </button>
            )}

            <button 
              onClick={() => openImportForDiscipline('Elementos de Anotación')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Introducir modelo</span>
            </button>
          </div>
        </div>

        {/* Disciplinas de Elementos de Anotación */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-micro font-black uppercase tracking-wider text-zinc-400">
              Disciplinas de Elementos de Anotación
            </span>
            <span className="text-micro font-bold text-zinc-400 hidden sm:inline">
              Arrastra un archivo .json sobre la disciplina correspondiente
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {coreDisciplines.map(discKey => {
              const matchingFiles = anotacionFiles.filter(f => f.modelType === discKey);
              const isUploaded = matchingFiles.length > 0;
              const discDef = MODEL_DISCIPLINES.find(d => d.key === discKey);

              return (
                <div 
                  key={discKey}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => handleDrop(e, 'Elementos de Anotación', discKey)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isUploaded 
                      ? 'bg-white border-zinc-200 shadow-sm' 
                      : 'bg-zinc-50/70 border-dashed border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-100">
                        {getDisciplineIcon(discKey)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-800">{discDef?.label}</h4>
                        <span className="text-dato font-bold text-zinc-400">
                          {isUploaded ? `${matchingFiles.length} cargado` : 'Sin introducir'}
                        </span>
                      </div>
                    </div>
                    {isUploaded ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 ring-4 ring-zinc-200" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                    )}
                  </div>

                  {isUploaded ? (
                    <button
                      onClick={() => onSelectFileForDashboard(matchingFiles[0].id)}
                      className="flex items-center justify-between text-nota font-bold text-zinc-800 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded-xl transition-all"
                    >
                      <span className="truncate max-w-[100px]">{matchingFiles[0].customName || matchingFiles[0].name}</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => openImportForDiscipline('Elementos de Anotación', discKey)}
                      className="flex items-center justify-center gap-1 text-nota font-bold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1.5 rounded-xl border border-zinc-200 transition-all shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>+ Introducir {discDef?.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla / Lista de modelos de Elementos de Anotación */}
        {anotacionFiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border-2 border-dashed border-zinc-200 shadow-sm max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-700 mx-auto">
              <FileCode size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-800">Introduce los modelos de Elementos de Anotación</h3>
              <p className="text-xs italic text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Añade los archivos JSON de Vistas, Plantillas, Planos, Tablas, Habitaciones, Vínculos CAD, Parámetros y Grupos de Anotación exportados desde Revit.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => openImportForDiscipline('Elementos de Anotación')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Introducir modelo JSON de Anotación</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
                <button
                  onClick={() => setSelectedAnotacionFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedAnotacionFilter === 'todos' 
                      ? 'bg-zinc-900 text-white shadow-sm' 
                      : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200'
                  }`}
                >
                  Todos ({anotacionFiles.length})
                </button>
                {MODEL_DISCIPLINES.filter(d => anotacionFiles.some(f => f.modelType === d.key)).map(d => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedAnotacionFilter(d.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedAnotacionFilter === d.key 
                        ? 'bg-zinc-900 text-white shadow-sm' 
                        : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => openImportForDiscipline('Elementos de Anotación')}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  <Plus size={14} />
                  <span>Añadir otro modelo</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-left">
                <thead className="text-dato font-black uppercase text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4">Modelo & Disciplina</th>
                    <th className="px-6 py-4">Fase Auditoría</th>
                    <th className="px-6 py-4">Fecha Importación</th>
                    <th className="px-6 py-4">Exportación Revit</th>
                    <th className="px-6 py-4">Elementos Anotación</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filteredAnotacionFiles.map(file => {
                    const isEditing = editingFileId === file.id;
                    const discColor = getDisciplineColorClasses(file.modelType);

                    return (
                      <tr key={file.id} className="hover:bg-zinc-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2 max-w-xs">
                              <input
                                value={editNameInput}
                                onChange={(e) => setEditNameInput(e.target.value)}
                                className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-zinc-400 bg-white"
                                placeholder="Nombre del modelo"
                                autoFocus
                              />
                              <select
                                value={editTypeInput}
                                onChange={(e) => setEditTypeInput(e.target.value as ModelDiscipline)}
                                className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-zinc-200 bg-white"
                              >
                                {MODEL_DISCIPLINES.map(d => (
                                  <option key={d.key} value={d.key}>{d.label}</option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditing(file.id)}
                                  className="flex items-center gap-1 text-dato font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-2 py-1 rounded-md"
                                >
                                  <Check size={12} /> Guardar
                                </button>
                                <button
                                  onClick={() => setEditingFileId(null)}
                                  className="flex items-center gap-1 text-dato font-bold text-zinc-500 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-md"
                                >
                                  <X size={12} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 shrink-0 mt-0.5">
                                {getDisciplineIcon(file.modelType)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-zinc-900 text-sm">
                                    {file.customName || file.name}
                                  </span>
                                  <span className={`text-etiqueta font-black uppercase px-2 py-0.5 rounded-md border ${discColor.badge}`}>
                                    {getDisciplineLabel(file.modelType)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-mono text-zinc-400 truncate max-w-xs" title={file.anotacionFileName || file.name}>
                                    {file.anotacionFileName || file.name}
                                  </span>
                                  <button
                                    onClick={() => startEditing(file)}
                                    className="text-zinc-400 hover:text-zinc-800 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Renombrar o cambiar disciplina"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-300 text-xs font-bold">
                            <span>Elementos de Anotación</span>
                          </span>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                          {formatReliableDateTime(file.anotacionImportedAt || file.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-zinc-800">
                              {formatReliableDateTime(file.anotacionExportedAt || file.anotacionCreatedAt)}
                            </span>
                            <span className="text-micro text-zinc-400">
                              Revit {file.data?.modelo?.revit_version || '2025'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-200">
                            {(file.anotacionElementCount || calculatePhase2ElementCount(file.data)).toLocaleString()} elem.
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectFileForDashboard(file.id, 'anotacion')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                              title="Auditar este modelo de anotación"
                            >
                              <SlidersHorizontal size={14} />
                              <span>Auditar</span>
                            </button>

                            <button
                              onClick={() => {
                                setUpdatingFileId(file.id);
                                setUpdatingPhase('Elementos de Anotación');
                                updateInputRef.current?.click();
                              }}
                              className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Actualizar con nueva exportación JSON de Revit"
                            >
                              <RefreshCw size={16} />
                            </button>

                            <button
                              onClick={() => onDeleteFile(file.id, 'Elementos de Anotación')}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Eliminar datos de Elementos de Anotación"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Input oculto para actualizar JSON existente */}
      <input 
        type="file" 
        accept=".json" 
        ref={updateInputRef} 
        onChange={handleUpdateFileUpload} 
        className="hidden" 
      />

      {/* ============================================================ */}
      {/* 4. ELEMENTOS 3D                                               */}
      {/* ============================================================ */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-zinc-200/80 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-zinc-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">ELEMENTOS 3D</h2>
            <p className="text-xs italic text-zinc-400 mt-1 max-w-2xl leading-relaxed">Introduce y gestiona los modelos Revit con la exportación de información 3D.</p>
          </div>
          <button onClick={() => openImportForDiscipline('Elementos 3D')} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus size={18} strokeWidth={2.5} /><span>Introducir modelo</span>
          </button>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-micro font-black uppercase tracking-wider text-zinc-400">Disciplinas de Elementos 3D</span>
            <span className="text-micro font-bold text-zinc-400 hidden sm:inline">Arrastra un archivo .json sobre la disciplina correspondiente</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {coreDisciplines.map(discKey => {
              const matchingFiles = model3DFiles.filter(f => f.modelType === discKey);
              const isUploaded = matchingFiles.length > 0;
              const discDef = MODEL_DISCIPLINES.find(d => d.key === discKey);
              return (
                <div key={`3d-${discKey}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => handleDrop(e, 'Elementos 3D', discKey)} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${isUploaded ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-50/70 border-dashed border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100/50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2"><div className="p-2 rounded-xl bg-zinc-100">{getDisciplineIcon(discKey)}</div><div><h4 className="text-xs font-black text-zinc-800">{discDef?.label}</h4><span className="text-dato font-bold text-zinc-400">{isUploaded ? `${matchingFiles.length} cargado` : 'Sin introducir'}</span></div></div>
                    <span className={`w-2.5 h-2.5 rounded-full ${isUploaded ? 'bg-zinc-800 ring-4 ring-zinc-200' : 'bg-zinc-300'}`} />
                  </div>
                  {isUploaded ? (
                    <div className="flex items-center justify-between text-nota font-bold text-zinc-800 bg-zinc-100 px-2.5 py-1.5 rounded-xl"><span className="truncate max-w-[120px]">{matchingFiles[0].customName || matchingFiles[0].name}</span><Check size={13} /></div>
                  ) : (
                    <button onClick={() => openImportForDiscipline('Elementos 3D', discKey)} className="flex items-center justify-center gap-1 text-nota font-bold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1.5 rounded-xl border border-zinc-200 transition-all shadow-2xs"><Plus size={13} /><span>Introducir {discDef?.label}</span></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {model3DFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
                <button onClick={() => setSelected3DFilter('todos')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selected3DFilter === 'todos' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200'}`}>
                  Todos ({model3DFiles.length})
                </button>
                {MODEL_DISCIPLINES.filter(d => model3DFiles.some(f => f.modelType === d.key)).map(d => (
                  <button key={`3d-filter-${d.key}`} onClick={() => setSelected3DFilter(d.key)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selected3DFilter === d.key ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <button onClick={() => openImportForDiscipline('Elementos 3D')} className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition-all">
                <Plus size={14} /><span>Añadir otro modelo</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-left">
                <thead className="text-dato font-black uppercase text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4">Modelo & Disciplina</th>
                    <th className="px-6 py-4">Fase Auditoría</th>
                    <th className="px-6 py-4">Fecha Importación</th>
                    <th className="px-6 py-4">Exportación Revit</th>
                    <th className="px-6 py-4">Elementos 3D</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filtered3DFiles.map(file => {
                    const discColor = getDisciplineColorClasses(file.modelType);
                    return (
                      <tr key={`3d-table-${file.id}`} className="hover:bg-zinc-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 shrink-0 mt-0.5">{getDisciplineIcon(file.modelType)}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-zinc-900 text-sm">{file.customName || file.name}</span>
                                <span className={`text-etiqueta font-black uppercase px-2 py-0.5 rounded-md border ${discColor.badge}`}>{getDisciplineLabel(file.modelType)}</span>
                              </div>
                              <span className="text-xs font-mono text-zinc-400 truncate max-w-xs block mt-0.5" title={file.model3DFileName || file.name}>{file.model3DFileName || file.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-300 text-xs font-bold">Elementos 3D</span></td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{formatReliableDateTime(file.model3DImportedAt || file.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-zinc-800">{formatReliableDateTime(file.model3DExportedAt || file.model3DCreatedAt)}</span>
                            <span className="text-micro text-zinc-400">Revit {file.data?.modelo?.revit_version || file.model3DData?.modelo?.revit_version || '2025'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-200">{(file.model3DElementCount || 0).toLocaleString()} elem.</span></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => onSelectFileForDashboard(file.id, 'elementos3d')} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all" title="Abrir datos de Elementos 3D">
                              <SlidersHorizontal size={14} /><span>Auditar</span>
                            </button>
                            <button onClick={() => { setUpdatingFileId(file.id); setUpdatingPhase('Elementos 3D'); updateInputRef.current?.click(); }} className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors" title="Actualizar con una nueva exportación JSON 3D">
                              <RefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => onDeleteFile(file.id, 'Elementos 3D')}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Eliminar datos de Elementos 3D"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* MODAL PARA IMPORTAR NUEVO MODELO ORGANIZADO */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Cabecera del modal */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Upload size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      {modalTargetPhase}
                    </span>
                    <h3 className="text-base font-black text-zinc-900">
                      Introducir Modelo de Revit
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mensaje de error si falla la lectura */}
              {modalError && (
                <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-2xl text-xs text-zinc-900 font-medium">
                  {modalError}
                </div>
              )}

              {/* Contenido del formulario */}
              <div className="space-y-4">
                {/* 0. Selector de Fase en el modal */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Fase de Auditoría Destino
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalTargetPhase('Configuración General')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        modalTargetPhase === 'Configuración General'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Configuración General
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTargetPhase('Elementos de Anotación')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        modalTargetPhase === 'Elementos de Anotación'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Elementos de Anotación
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTargetPhase('Elementos 3D')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        modalTargetPhase === 'Elementos 3D'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Elementos 3D
                    </button>
                  </div>
                </div>

                {/* 1. Archivo JSON */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    1. Archivo de Exportación (.json)
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    ref={modalFileInputRef}
                    onChange={handleModalFileSelected}
                    className="hidden"
                  />
                  {modalFile ? (
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <FileJson size={18} className="text-zinc-700 shrink-0" />
                          <span className="text-xs font-mono font-bold text-zinc-800 truncate">
                            {modalFile.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => modalFileInputRef.current?.click()}
                          className="text-xs font-bold text-zinc-700 hover:underline shrink-0 ml-2"
                        >
                          Cambiar archivo
                        </button>
                      </div>

                      {modalBimData && (
                        <div className="space-y-2 pt-2 border-t border-zinc-200">
                          {modalTargetPhase === 'Elementos 3D' ? (
                            <div className="flex items-center gap-3 text-dato font-bold text-zinc-600">
                              <span>JSON 3D preparado para importar</span>
                              <span>•</span>
                              <span>Revit: <strong className="text-zinc-800 font-mono">{modalBimData.modelo?.revit_version || '---'}</strong></span>
                            </div>
                          ) : modalTargetPhase === 'Elementos de Anotación' ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                                Elementos detectados para la auditoría:
                              </span>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-zinc-700">
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Vistas: <strong>{modalBimData.codechecking?.vistas?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Plantillas: <strong>{modalBimData.codechecking?.plantillas_vista?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Planos: <strong>{modalBimData.codechecking?.planos?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Tablas: <strong>{modalBimData.codechecking?.tablas?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Habitaciones: <strong>{modalBimData.codechecking?.habitaciones?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Vínculos CAD: <strong>{modalBimData.codechecking?.vinculos_cad?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Parámetros: <strong>{modalBimData.codechecking?.parametros_proyecto_y_compartidos?.cantidad ?? 0}</strong>
                                </div>
                                <div className="bg-white p-1.5 rounded border border-zinc-200">
                                  Grupos Anot.: <strong>{modalBimData.codechecking?.grupos_anotacion?.cantidad ?? 0}</strong>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 text-dato font-bold text-zinc-600">
                              <span>
                                Elementos: <strong className="text-zinc-900 font-mono">
                                  {(modalBimData.codechecking?.subproyectos?.existentes?.reduce(
                                    (acc: number, w: any) => acc + (w.num_elementos || 0), 0
                                  ) || 0).toLocaleString()}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Revit: <strong className="text-zinc-800 font-mono">{modalBimData.modelo?.revit_version || '---'}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => modalFileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.name.toLowerCase().endsWith('.json')) {
                          await processJsonFile(file, modalTargetPhase, modalModelType);
                        }
                      }}
                      className="w-full p-6 border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-700 bg-zinc-50/50 hover:bg-zinc-100/50 transition-all cursor-pointer"
                    >
                      <Upload size={24} />
                      <span className="text-xs font-bold">Haz clic o arrastra aquí el archivo .json</span>
                      <span className="text-dato text-zinc-400">Exportado directamente desde Revit</span>
                    </div>
                  )}
                </div>

                {/* 2. Disciplina / Tipo de Modelo */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    2. Tipo de Modelo / Disciplina
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MODEL_DISCIPLINES.map(d => {
                      const isSelected = modalModelType === d.key;
                      return (
                        <button
                          type="button"
                          key={d.key}
                          onClick={() => {
                            setModalModelType(d.key);
                            if (!modalCustomName || MODEL_DISCIPLINES.some(item => item.defaultName === modalCustomName)) {
                              setModalCustomName(d.defaultName);
                            }
                          }}
                          className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                            isSelected 
                              ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' 
                              : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <span className="text-xs font-bold">{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Nombre asignado al modelo */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    3. Nombre del Modelo para la Auditoría
                  </label>
                  <input
                    value={modalCustomName}
                    onChange={(e) => setModalCustomName(e.target.value)}
                    placeholder="ej: Modelo de Estructuras, Arquitectura Edificio A..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-900 focus:border-zinc-500 focus:bg-white transition-all outline-none"
                  />
                  <p className="text-dato text-zinc-400 mt-1">
                    Este nombre aparecerá en las pestañas de la página de auditoría.
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-2xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!modalFile}
                  onClick={confirmModalImport}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={15} />
                  <span>Guardar e Importar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
