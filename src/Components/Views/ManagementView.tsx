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
  FileCode
} from 'lucide-react';
import { Project, ProjectFile, RevitBimData, ModelDiscipline } from '../../types';
import { readJsonFile } from '../../utils/fileUtils';
import { auditModelName } from '../../lib/auditEngine';
import { 
  MODEL_DISCIPLINES, 
  detectModelDiscipline, 
  getDisciplineLabel, 
  getDisciplineColorClasses,
  ensureFileMetadata 
} from '../../utils/modelUtils';

interface ManagementViewProps {
  currentProject: Project;
  selectedFileId: string | null;
  onSelectFileForDashboard: (fileId: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAddNewFileToProject: (newFile: ProjectFile) => void;
  onUpdateFileData: (fileId: string, newData: RevitBimData, elementCount: number, newExportDate: string) => void;
  onUpdateFileMetadata: (fileId: string, customName: string, modelType: ModelDiscipline) => void;
  onDeleteFile: (fileId: string) => void;
  onClearAllFiles?: () => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  currentProject,
  selectedFileId,
  onSelectFileForDashboard,
  onAddNewFileToProject,
  onUpdateFileData,
  onUpdateFileMetadata,
  onDeleteFile,
  onClearAllFiles
}) => {
  const [updatingFileId, setUpdatingFileId] = useState<string | null>(null);
  const updateInputRef = useRef<HTMLInputElement>(null);

  // Estados para modal de nuevo modelo
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalBimData, setModalBimData] = useState<RevitBimData | null>(null);
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

  // Filtro de disciplina para la vista
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');

  // Normalizar los archivos del proyecto con metadatos
  const projectFiles = (currentProject?.files || []).map(ensureFileMetadata);

  // Disciplinas base para el resumen
  const coreDisciplines: ModelDiscipline[] = ['estructura', 'arquitectura', 'instalaciones', 'urbanizacion', 'federado'];

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

  // Manejador para abrir modal de importación con disciplina preseleccionada
  const openImportForDiscipline = (disc?: ModelDiscipline) => {
    setModalFile(null);
    setModalBimData(null);
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
  const processJsonFile = async (file: File, preselectedDisc?: ModelDiscipline) => {
    try {
      setModalError(null);
      const json = await readJsonFile(file);
      const bim = json as RevitBimData;

      if (!bim || typeof bim !== 'object' || !bim.codechecking) {
        setModalError('El archivo no contiene el bloque "codechecking". Verifica que sea un JSON exportado por el script de Revit.');
        return;
      }

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
    } catch (err) {
      setModalError('Error al leer el archivo JSON. Comprueba que el archivo no esté corrupto.');
    }
  };

  // Procesar archivo seleccionado mediante input file en el modal
  const handleModalFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processJsonFile(file, modalModelType);
    if (e.target) e.target.value = '';
  };

  // Manejar arrastre y suelta (Drag and Drop) general
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

  const handleDrop = async (e: React.DragEvent, targetDiscipline?: ModelDiscipline) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.json')) {
      await processJsonFile(file, targetDiscipline);
    } else if (file) {
      alert('Por favor, selecciona o arrastra un archivo con extensión .json generado desde Revit.');
    }
  };

  // Limpiar todos los modelos de prueba del proyecto
  const handleClearAllModels = () => {
    if (window.confirm("¿Seguro que deseas eliminar todos los modelos de prueba de este proyecto para empezar a introducir los tuyos propios?")) {
      onClearAllFiles?.();
    }
  };

  // Confirmar importación desde el modal
  const confirmModalImport = () => {
    if (!modalFile || !modalBimData) {
      setModalError('Debes seleccionar un archivo JSON para este modelo.');
      return;
    }

    const totalElements = modalBimData.codechecking?.subproyectos?.existentes?.reduce(
      (acc: number, w: any) => acc + (w.num_elementos || 0), 0
    ) || 0;

    const exportDate = modalBimData.fecha_exportacion ? new Date(modalBimData.fecha_exportacion) : new Date();
    const formattedDate = exportDate.toLocaleString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const newFile: ProjectFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: modalFile.name,
      customName: modalCustomName.trim() || getDisciplineLabel(modalModelType),
      modelType: modalModelType,
      auditPhase: 'Configuración General',
      date: new Date().toLocaleDateString('es-ES'),
      createdAt: formattedDate,
      elementCount: totalElements,
      data: modalBimData
    };

    onAddNewFileToProject(newFile);
    setIsImportModalOpen(false);
    setModalFile(null);
    setModalBimData(null);
  };

  // Reemplazar / actualizar JSON existente
  const handleUpdateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("File:", file, "updatingFileId:", updatingFileId);
    if (!file || !updatingFileId) return;

    try {
      const json = await readJsonFile(file);
      const bimData = json as RevitBimData;
      console.log("JSON read:", bimData);
      const totalElements = bimData.codechecking?.subproyectos?.existentes?.reduce(
        (acc: number, w: any) => acc + (w.num_elementos || 0), 0
      ) || 0;

      const exportDate = bimData.fecha_exportacion ? new Date(bimData.fecha_exportacion) : new Date();
      const formattedDate = exportDate.toLocaleString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      console.log("Calling onUpdateFileData");
      onUpdateFileData(updatingFileId, bimData, totalElements, formattedDate);
      setUpdatingFileId(null);
    } catch (err) {
      console.error("Error updating:", err);
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

  // Archivos filtrados
  const filteredFiles = projectFiles.filter(f => {
    if (selectedFilter === 'todos') return true;
    return f.modelType === selectedFilter;
  });

  return (
    <motion.div 
      key="management"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
      className="space-y-3 max-w-7xl mx-auto relative"
    >
      {/* Overlay al arrastrar archivo sobre la página */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-marca-600/10 border-4 border-dashed border-marca-500 rounded-3xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-marca-100 flex flex-col items-center gap-3">
            <Upload size={36} className="text-marca-600 animate-bounce" />
            <p className="text-base font-black text-slate-800">Suelta aquí el archivo JSON de tu modelo de Revit</p>
            <span className="text-xs font-bold text-slate-400">Se abrirá el formulario para clasificar su disciplina y nombre</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. TÍTULO GENERAL DE LA PÁGINA: MODELOS DEL PROYECTO         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              MODELOS DEL PROYECTO
            </h1>
            <p className="text-xs italic text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Centro de control y organización de los modelos BIM del proyecto. Gestiona las fuentes de datos según su fase y tipo de auditoría.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-marca-600 shadow-2xs border border-slate-100">
                <Layers size={18} />
              </div>
              <div>
                <span className="text-micro font-black uppercase text-slate-400 block leading-tight">
                  Modelos Registrados
                </span>
                <span className="text-lg font-black text-slate-800 font-mono">
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
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-6">
        {/* Cabecera de la Sección Configuración General */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-400">
                {projectFiles.length} {projectFiles.length === 1 ? 'modelo introducido' : 'modelos introducidos'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              CONFIGURACIÓN GENERAL
            </h2>
            <p className="text-xs italic text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Introduce y gestiona los modelos Revit de tu proyecto (Estructura, Arquitectura, Instalaciones, etc.). Podrás auditar individualmente sus parámetros de configuración general.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {projectFiles.length > 0 && onClearAllFiles && (
              <button
                onClick={handleClearAllModels}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-slate-500 hover:text-fallo-600 hover:bg-fallo-50 border border-slate-200 hover:border-fallo-200 text-xs font-bold transition-all"
                title="Eliminar todos los modelos actuales de Configuración General"
              >
                <Trash2 size={16} />
                <span>Limpiar lista</span>
              </button>
            )}

            <button 
              onClick={() => openImportForDiscipline()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-marca-600 hover:bg-marca-700 text-white text-sm font-bold shadow-lg shadow-marca-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Introducir modelo</span>
            </button>
          </div>
        </div>

        {/* Selector rápido / Resumen de las disciplinas principales */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-micro font-black uppercase tracking-wider text-slate-400">
              Disciplinas de Configuración General
            </span>
            <span className="text-micro font-bold text-slate-400 hidden sm:inline">
              Arrastra un archivo .json sobre la disciplina correspondiente
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {coreDisciplines.map(discKey => {
          const matchingFiles = projectFiles.filter(f => f.modelType === discKey);
          const isUploaded = matchingFiles.length > 0;
          const discDef = MODEL_DISCIPLINES.find(d => d.key === discKey);

          return (
            <div 
              key={discKey}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => handleDrop(e, discKey)}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isUploaded 
                  ? 'bg-white border-slate-200 shadow-sm' 
                  : 'bg-slate-50/70 border-dashed border-slate-200 hover:border-marca-300 hover:bg-marca-50/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100">
                    {getDisciplineIcon(discKey)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{discDef?.label}</h4>
                    <span className="text-dato font-bold text-slate-400">
                      {isUploaded ? `${matchingFiles.length} cargado` : 'Sin introducir'}
                    </span>
                  </div>
                </div>
                {isUploaded ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-ok-500 ring-4 ring-ok-100" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                )}
              </div>

              {isUploaded ? (
                <button
                  onClick={() => onSelectFileForDashboard(matchingFiles[0].id)}
                  className="flex items-center justify-between text-nota font-bold text-marca-600 hover:text-marca-700 bg-marca-50/70 hover:bg-marca-100/70 px-2.5 py-1.5 rounded-xl transition-all"
                >
                  <span className="truncate max-w-[100px]">{matchingFiles[0].customName || matchingFiles[0].name}</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  onClick={() => openImportForDiscipline(discKey)}
                  className="flex items-center justify-center gap-1 text-nota font-bold text-marca-600 hover:text-marca-700 bg-white hover:bg-marca-50 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-marca-200 transition-all shadow-2xs"
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

      {/* Zona principal: Si no hay modelos registrados */}
      {projectFiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border-2 border-dashed border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-marca-50 rounded-2xl flex items-center justify-center text-marca-600 mx-auto">
            <Upload size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">Introduce los modelos de tu proyecto</h3>
            <p className="text-xs italic text-slate-400 max-w-lg mx-auto leading-relaxed">
              Para auditar la <strong className="text-slate-600 font-bold not-italic">Configuración General</strong>, añade los archivos JSON generados desde Revit de tus modelos de Estructura, Arquitectura o Instalaciones.
            </p>
          </div>

          <div 
            onClick={() => openImportForDiscipline()}
            className="p-8 bg-slate-50 hover:bg-marca-50/50 border-2 border-dashed border-slate-200 hover:border-marca-400 rounded-2xl cursor-pointer transition-all flex flex-col items-center gap-2 group"
          >
            <FileJson size={36} className="text-slate-400 group-hover:text-marca-600 transition-colors" />
            <span className="text-sm font-bold text-slate-700 group-hover:text-marca-700">
              Haz clic aquí o arrastra un archivo .json de Revit
            </span>
            <span className="text-xs text-slate-400">
              Podrás asignar el nombre y disciplina en el siguiente paso
            </span>
          </div>

          <div className="pt-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              O introduce directamente por disciplina:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {coreDisciplines.map(discKey => {
                const discDef = MODEL_DISCIPLINES.find(d => d.key === discKey);
                return (
                  <button
                    key={discKey}
                    onClick={() => openImportForDiscipline(discKey)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-marca-50 text-slate-700 hover:text-marca-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-marca-200 transition-all"
                  >
                    <Plus size={13} />
                    <span>{discDef?.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Tabla de Modelos Importados */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Barra de filtros */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedFilter === 'todos' 
                    ? 'bg-marca-600 text-white shadow-sm' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Todos ({projectFiles.length})
              </button>
              {MODEL_DISCIPLINES.filter(d => projectFiles.some(f => f.modelType === d.key)).map(d => (
                <button
                  key={d.key}
                  onClick={() => setSelectedFilter(d.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedFilter === d.key 
                      ? 'bg-marca-600 text-white shadow-sm' 
                      : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openImportForDiscipline()}
                className="flex items-center gap-1.5 text-xs font-bold text-marca-600 hover:text-marca-700 bg-marca-50 hover:bg-marca-100 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus size={14} />
                <span>Añadir otro modelo</span>
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Fase: <strong className="text-slate-600 font-bold">Configuración General</strong>
              </span>
            </div>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                <FileJson size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-700">No hay modelos registrados con este criterio</h3>
              <p className="text-xs italic text-slate-400 mt-1 max-w-sm mx-auto">
                Selecciona otra categoría o introduce un nuevo modelo para esta disciplina.
              </p>
              <button
                onClick={() => openImportForDiscipline()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-marca-600 text-white rounded-xl text-xs font-bold hover:bg-marca-700 transition-colors"
              >
                <Plus size={15} /> Introducir modelo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-dato font-black uppercase text-slate-400 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4">Modelo & Disciplina</th>
                    <th className="px-6 py-4">Fase Auditoría</th>
                    <th className="px-6 py-4">Fecha Importación</th>
                    <th className="px-6 py-4">Exportación Revit</th>
                    <th className="px-6 py-4">Elementos</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredFiles.map(file => {
                    const isEditing = editingFileId === file.id;
                    const discColor = getDisciplineColorClasses(file.modelType);

                    return (
                      <tr key={file.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Nombre y Disciplina */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2 max-w-xs">
                              <input
                                value={editNameInput}
                                onChange={(e) => setEditNameInput(e.target.value)}
                                className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-marca-400 bg-white"
                                placeholder="Nombre del modelo"
                                autoFocus
                              />
                              <select
                                value={editTypeInput}
                                onChange={(e) => setEditTypeInput(e.target.value as ModelDiscipline)}
                                className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white"
                              >
                                {MODEL_DISCIPLINES.map(d => (
                                  <option key={d.key} value={d.key}>{d.label}</option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditing(file.id)}
                                  className="flex items-center gap-1 text-dato font-bold text-white bg-ok-600 hover:bg-ok-700 px-2 py-1 rounded-md"
                                >
                                  <Check size={12} /> Guardar
                                </button>
                                <button
                                  onClick={() => setEditingFileId(null)}
                                  className="flex items-center gap-1 text-dato font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md"
                                >
                                  <X size={12} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                                {getDisciplineIcon(file.modelType)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-800 text-sm">
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
                                            ? 'bg-ok-50 text-ok-700 border-ok-200'
                                            : 'bg-fallo-50 text-fallo-700 border-fallo-200'
                                        }`}
                                        title={
                                          nAudit.status === 'BUENO'
                                            ? `Nomenclatura conforme (7 bloques). ${nAudit.ignoredSuffix ? `Sufijo "${nAudit.ignoredSuffix}" ignorado.` : ''}`
                                            : `Nomenclatura no conforme (${nAudit.errorCount} errores en bloques)`
                                        }
                                      >
                                        {nAudit.status === 'BUENO' ? '7B OK' : 'Nom.'}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-mono text-slate-400 truncate max-w-xs" title={file.name}>
                                    {file.name}
                                  </span>
                                  <button
                                    onClick={() => startEditing(file)}
                                    className="text-slate-300 hover:text-marca-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Renombrar o cambiar disciplina"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Fase de Auditoría */}
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {file.auditPhase || 'Configuración General'}
                          </span>
                        </td>

                        {/* Fecha de importación */}
                        <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                          {file.date}
                        </td>

                        {/* Fecha de exportación Revit */}
                        <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                          {file.createdAt || file.date}
                        </td>

                        {/* Elementos */}
                        <td className="px-6 py-4 text-slate-700 font-mono font-bold text-xs">
                          {file.elementCount.toLocaleString()}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ir a Configuración General para este modelo */}
                            <button 
                              onClick={() => onSelectFileForDashboard(file.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-marca-50 text-marca-700 hover:bg-marca-600 hover:text-white transition-all text-xs font-bold"
                              title="Auditar en Configuración General"
                            >
                              <SlidersHorizontal size={14} />
                              <span>Auditar</span>
                            </button>

                            {/* Renombrar */}
                            <button 
                              onClick={() => startEditing(file)}
                              className="p-2 text-slate-400 hover:text-marca-600 hover:bg-marca-50 rounded-xl transition-all"
                              title="Editar nombre y disciplina"
                            >
                              <Edit3 size={16} />
                            </button>

                            {/* Actualizar JSON */}
                            <button 
                              onClick={() => {
                                setUpdatingFileId(file.id);
                                updateInputRef.current?.click();
                              }}
                              className="p-2 text-slate-400 hover:text-ok-600 hover:bg-ok-50 rounded-xl transition-all"
                              title="Actualizar archivo JSON con nueva exportación"
                            >
                              <RefreshCw size={16} />
                            </button>

                            {/* Eliminar */}
                            <button 
                              onClick={() => {
                                if (window.confirm(`¿Seguro que deseas eliminar el modelo "${file.customName || file.name}"?`)) {
                                  onDeleteFile(file.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-fallo-600 hover:bg-fallo-50 rounded-xl transition-all"
                              title="Eliminar modelo"
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
          )}
        </div>
      )}
      </section>

      {/* ============================================================ */}
      {/* 3. SECCIÓN PREPARADA: NUEVA SECCIÓN DE ANÁLISIS              */}
      {/* ============================================================ */}
      <section className="bg-slate-50/70 rounded-3xl p-6 sm:p-8 border-2 border-dashed border-slate-200/90 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-micro font-black uppercase tracking-wider bg-slate-200/80 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-300">
                Fase 2 • Próxima Incorporación
              </span>
              <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-300 flex items-center gap-1">
                <Sparkles size={12} className="text-zinc-600" />
                Nueva estructura JSON
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-700 tracking-tight">
              NUEVA SECCIÓN DE ANÁLISIS
            </h2>
            <p className="text-xs italic text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Módulo preparado para importar y analizar archivos JSON con esquemas de datos específicos y análisis complementarios de modelos.
            </p>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-500 flex items-center gap-2 shrink-0 shadow-2xs">
            <Info size={14} className="text-slate-400" />
            <span>Estructura independiente en preparación</span>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl p-6 border border-slate-200/60 flex flex-col sm:flex-row items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                Estructura de datos y validaciones independientes
              </h4>
              <p className="text-xs italic text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                Esta sección albergará los nuevos modelos y archivos JSON con esquema y estructura propia, manteniendo los datos y análisis completamente separados y jerarquizados respecto a la Configuración General.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Input oculto para actualizar JSON existente */}
      <input 
        type="file" 
        accept=".json" 
        ref={updateInputRef} 
        onChange={handleUpdateFileUpload} 
        className="hidden" 
      />

      {/* MODAL PARA IMPORTAR NUEVO MODELO ORGANIZADO */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-dato font-black uppercase tracking-wider text-marca-600 bg-marca-50 px-2.5 py-1 rounded-lg">
                    Fase 1: Configuración General
                  </span>
                  <h3 className="text-xl font-black text-slate-800 mt-2">Importar Modelo de Revit</h3>
                  <p className="text-xs italic text-slate-400 mt-0.5">
                    Asigna el archivo JSON al modelo correspondiente para su análisis individual.
                  </p>
                </div>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-fallo-50 border border-fallo-100 rounded-2xl flex items-center gap-2 text-xs text-fallo-600 font-bold">
                  <Info size={16} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* 1. Selección de Archivo JSON */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    1. Archivo JSON de Revit
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    ref={modalFileInputRef}
                    onChange={handleModalFileSelected}
                    className="hidden"
                  />
                  {modalFile ? (
                    <div className="p-3.5 bg-marca-50/60 border-2 border-marca-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileJson size={22} className="text-marca-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">{modalFile.name}</p>
                            <p className="text-dato text-slate-400 font-mono">{(modalFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => modalFileInputRef.current?.click()}
                          className="text-xs font-bold text-marca-600 hover:underline shrink-0 ml-2"
                        >
                          Cambiar archivo
                        </button>
                      </div>

                      {modalBimData && (
                        <div className="space-y-1.5 pt-2 border-t border-marca-100/80">
                          <div className="flex items-center gap-3 text-dato font-bold text-slate-600">
                            <span>
                              Elementos: <strong className="text-marca-700 font-mono">
                                {(modalBimData.codechecking?.subproyectos?.existentes?.reduce(
                                  (acc: number, w: any) => acc + (w.num_elementos || 0), 0
                                ) || 0).toLocaleString()}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Revit: <strong className="text-slate-700 font-mono">{modalBimData.modelo?.revit_version || '---'}</strong>
                            </span>
                          </div>
                          {(() => {
                            const raw = modalBimData.modelo?.nombre_archivo || modalFile.name;
                            const nAudit = auditModelName(raw, currentProject?.auditConfig);
                            return (
                              <div className="flex items-center justify-between text-micro font-bold pt-1">
                                <span className="text-slate-500">Nomenclatura (7 bloques):</span>
                                <span className={`px-2 py-0.5 rounded border ${
                                  nAudit.status === 'BUENO'
                                    ? 'bg-ok-100 text-ok-800 border-ok-200'
                                    : 'bg-fallo-100 text-fallo-800 border-fallo-200'
                                }`}>
                                  {nAudit.status === 'BUENO' ? 'Conforme (7B OK)' : `${nAudit.errorCount} fallos en bloques`}
                                </span>
                              </div>
                            );
                          })()}
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
                          await processJsonFile(file, modalModelType);
                        }
                      }}
                      className="w-full p-6 border-2 border-dashed border-slate-200 hover:border-marca-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-marca-600 bg-slate-50/50 hover:bg-marca-50/30 transition-all cursor-pointer"
                    >
                      <Upload size={24} />
                      <span className="text-xs font-bold">Haz clic o arrastra aquí el archivo .json</span>
                      <span className="text-dato text-slate-400">Exportado directamente desde Revit</span>
                    </div>
                  )}
                </div>

                {/* 2. Disciplina / Tipo de Modelo */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
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
                              ? 'bg-marca-600 text-white border-marca-600 shadow-md shadow-marca-200' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    3. Nombre del Modelo para la Auditoría
                  </label>
                  <input
                    value={modalCustomName}
                    onChange={(e) => setModalCustomName(e.target.value)}
                    placeholder="ej: Modelo de Estructuras, Arquitectura Edificio A..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-marca-500 focus:bg-white transition-all outline-none"
                  />
                  <p className="text-dato text-slate-400 mt-1">
                    Este nombre aparecerá en las pestañas de la página de Configuración General.
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!modalFile}
                  onClick={confirmModalImport}
                  className="flex-1 py-3 bg-marca-600 hover:bg-marca-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-lg shadow-marca-200 transition-all flex items-center justify-center gap-1.5"
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
