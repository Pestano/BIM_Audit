import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Home, 
  Settings, 
  Trash2, 
  LayoutDashboard,
  BarChart3,
  User,
  ClipboardCheck,
  Edit3,
  Download
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { FullReportContainer } from './Components/Views/FullReportContainer';
import { exportToPDF, exportToHTML } from './utils/exportUtils';

// Tipos y Datos de Ejemplo
import { Project, ProjectFile, RevitBimData, AuditConfig } from './types';
import { MOCK_PROJECTS } from './mockData';
import { readJsonFile } from './utils/fileUtils';

// Componentes Comunes
import { SidebarIcon } from './Components/common/SidebarIcon';

// Modales
import { WarningModal } from './Components/modals/WarningModal';
import { DeleteConfirmModal } from './Components/modals/DeleteConfirmModal';
import { NewProjectModal } from './Components/modals/NewProjectModal';
import { ImportErrorBanner } from './Components/modals/ImportErrorBanner';
import { GridsModal } from './Components/modals/GridsModal';

// Vistas
import { ProjectsListView } from './Components/Views/ProjectsListView';
import { GeneralConfigView } from './Components/Views/GeneralConfigView';
import { ManagementView } from './Components/Views/ManagementView';
import { SettingsView } from './Components/Views/SettingsView';
import { ensureFileMetadata, detectModelDiscipline } from './utils/modelUtils';
import { SlidersHorizontal } from 'lucide-react';

export default function App() {
  // === ESTADOS GLOBALES ===
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'general_config' | 'management' | 'settings'>('general_config');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // === ESTADOS DE MODALES Y FORMULARIO ===
  const [showWarningModal, setShowWarningModal] = useState<{ isOpen: boolean; typeName: string; ids: string[] }>({
    isOpen: false, typeName: '', ids: []
  });
  const [showGridsModal, setShowGridsModal] = useState<{ isOpen: boolean; grids: string[] }>({
    isOpen: false, grids: []
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null; projectName: string }>({
    isOpen: false, projectId: null, projectName: ''
  });
  const [pendingImport, setPendingImport] = useState<{ file: ProjectFile; suggestedName: string } | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // === EFECTO DE CARGA INICIAL (LOCAL STORAGE) ===
  useEffect(() => {
    const saved = localStorage.getItem('bim_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = (Array.isArray(parsed) ? parsed : []).map(p => ({
          ...p,
          files: (p.files || []).map(ensureFileMetadata)
        }));
        setProjects(normalized);
      } catch (e) {
        console.error('No se pudo leer bim_projects de localStorage:', e);
        setProjects([]);
      }
    } else {
      const normalized = MOCK_PROJECTS.map(p => ({
        ...p,
        files: (p.files || []).map(ensureFileMetadata)
      }));
      setProjects(normalized);
      localStorage.setItem('bim_projects', JSON.stringify(normalized));
    }
  }, []);

  // === MÉTODOS AUXILIARES DE PERSISTENCIA Y PROYECTOS ===
  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('bim_projects', JSON.stringify(newProjects));
  };

  const deleteProject = (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;
    setDeleteConfirm({ isOpen: true, projectId, projectName: projectToDelete.name });
  };

  const confirmDeleteProject = () => {
    const projectId = deleteConfirm.projectId;
    if (!projectId) return;

    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveProjects(updatedProjects);

    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
      setCurrentPage('general_config');
    }

    setDeleteConfirm({ isOpen: false, projectId: null, projectName: '' });
  };

  // === LÓGICA DE IMPORTACIÓN JSON DE PROYECTO NUEVO ===
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await readJsonFile(file);
      const bimData = json as RevitBimData;

      if (!json || typeof json !== 'object' || !json.codechecking) {
        setImportError('El archivo no tiene el formato esperado (falta el bloque "codechecking"). Verifica que sea un JSON exportado por el script de auditoría.');
        return;
      }

      const exportDate = bimData.fecha_exportacion ? new Date(bimData.fecha_exportacion) : new Date();
      const detectedDisc = detectModelDiscipline(file.name, bimData);
      const newFile: ProjectFile = ensureFileMetadata({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        customName: file.name.replace(/\.json$/i, '').toUpperCase(),
        modelType: detectedDisc,
        auditPhase: 'Configuración General',
        date: new Date().toLocaleDateString('es-ES'),
        createdAt: exportDate.toLocaleString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        elementCount: Math.floor(Math.random() * 20000) + 5000,
        data: bimData
      });

      const suggestedName = file.name.replace('.json', '').toUpperCase();
      setProjectNameInput(suggestedName);
      setPendingImport({ file: newFile, suggestedName });
    } catch (err) {
      setImportError('Error al procesar el archivo JSON. Comprueba que el archivo no esté dañado o tenga un formato inválido.');
    } finally {
      // Limpiamos el input para permitir volver a subir el mismo archivo si se desea
      if (e.target) e.target.value = '';
    }
  };

  const confirmCreateProject = () => {
    if (!pendingImport) return;

    const finalName = projectNameInput.trim() || pendingImport.suggestedName;

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: finalName,
      lastModified: new Date().toLocaleDateString('es-ES'),
      files: [pendingImport.file]
    };

    saveProjects([newProject, ...projects]);
    setPendingImport(null);
    setProjectNameInput('');
  };

  // === DESCARGA DE BACKUP ===
  const handleBackup = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_proyectos_bim_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // PROYECTO Y ARCHIVO SELECCIONADO ACTUALMENTE
  const currentProject = (projects || []).find(p => p.id === currentProjectId);
  const currentFile = currentProject?.files?.find(f => f.id === (selectedFileId || currentProject?.files?.[0]?.id));
  const bimData = currentFile?.data;

  // COMPONENTE DE MODALES REUTILIZABLE
  const updateAuditConfig = (config: AuditConfig) => {
    if (!currentProjectId) return;
    const updatedProjects = projects.map(p => 
      p.id === currentProjectId ? { ...p, auditConfig: config } : p
    );
    saveProjects(updatedProjects);
  };

  const sharedModals = (
    <>
      <ImportErrorBanner error={importError} onClose={() => setImportError(null)} />
      <WarningModal 
        isOpen={showWarningModal.isOpen}
        typeName={showWarningModal.typeName}
        ids={showWarningModal.ids}
        onClose={() => setShowWarningModal({ ...showWarningModal, isOpen: false })}
      />
      <GridsModal 
        isOpen={showGridsModal.isOpen}
        grids={showGridsModal.grids}
        onClose={() => setShowGridsModal({ ...showGridsModal, isOpen: false })}
      />
      <DeleteConfirmModal 
        isOpen={deleteConfirm.isOpen}
        projectName={deleteConfirm.projectName}
        onConfirm={confirmDeleteProject}
        onClose={() => setDeleteConfirm({ isOpen: false, projectId: null, projectName: '' })}
      />
      <NewProjectModal 
        isOpen={!!pendingImport}
        projectNameInput={projectNameInput}
        onChangeInput={setProjectNameInput}
        onConfirm={confirmCreateProject}
        onClose={() => { setPendingImport(null); setProjectNameInput(''); }}
      />
    </>
  );

  // === RENDERIZADO SI NO HAY NINGÚN PROYECTO ABIERTO (PANTALLA DE INICIO) ===
  if (!currentProjectId || !currentProject) {
    return (
      <>
        <ProjectsListView 
          projects={projects}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectProject={(id) => {
            setCurrentProjectId(id);
            setCurrentPage('general_config');
          }}
          onDeleteProject={deleteProject}
          onBackup={handleBackup}
          fileInputRef={fileInputRef}
          handleImportJson={handleImportJson}
        />
        {sharedModals}
      </>
    );
  }

  // === RENDERIZADO DE LA VISTA INTERNA DEL PROYECTO SELECCIONADO ===
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Barra de Navegación Lateral */}
      <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 sticky top-0 h-screen">
        {/* Perfil de Usuario */}
        <div className="p-2.5 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors">
          <User size={24} strokeWidth={1.5} />
        </div>
        
        <div className="w-10 h-px bg-slate-100" />
        
        <nav className="flex flex-col gap-5 flex-1">
          <SidebarIcon 
            icon={(props: any) => <Home {...props} fill={props.active ? "white" : "none"} />} 
            active={false} 
            onClick={() => setCurrentProjectId(null)} 
            title="Inicio (Proyectos)"
            showBadge={true}
          />
          
          <SidebarIcon 
            icon={(props: any) => <SlidersHorizontal {...props} fill={props.active ? "white" : "none"} />} 
            active={currentPage === 'general_config'} 
            onClick={() => setCurrentPage('general_config')} 
            title="Configuración General"
          />
          
            <SidebarIcon 
            icon={(props: any) => <Database {...props} fill={props.active ? "white" : "none"} />} 
            active={currentPage === 'management'} 
            onClick={() => setCurrentPage('management')} 
            title="Modelos del Proyecto"
          />

          <div className="relative group">
            <SidebarIcon 
              icon={(props: any) => <Download {...props} />} 
              active={false} 
              onClick={() => {}} 
              title="Exportar Reporte"
            />
            <div className="absolute left-full ml-2 top-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 hidden group-hover:block z-50">
              <div className="text-[10px] font-black text-slate-400 uppercase p-2 border-b border-slate-100 mb-1">Informe Completo (Todos los modelos)</div>
              <button className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-sm" onClick={() => exportToPDF('full-report-content', 'reporte_completo')}>PDF Completo</button>
              <button className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-sm" onClick={() => exportToHTML('full-report-content', 'reporte_completo')}>HTML Completo</button>
              <div className="text-[10px] font-black text-slate-400 uppercase p-2 border-b border-slate-100 mt-2 mb-1">Informe Modelo Actual</div>
              <button className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-sm" onClick={() => exportToPDF('main-content', 'reporte_modelo')}>PDF Modelo Actual</button>
              <button className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-sm" onClick={() => exportToHTML('main-content', 'reporte_modelo')}>HTML Modelo Actual</button>
            </div>
          </div>
        </nav>

          <SidebarIcon 
            icon={(props: any) => <Settings {...props} fill={props.active ? "white" : "none"} />} 
            active={currentPage === 'settings'} 
            onClick={() => setCurrentPage('settings')} 
            title="Configuración de Auditoría" 
          />
          <button 
            onClick={() => setCurrentProjectId(null)}
            className="p-3 text-slate-400 hover:bg-fallo-50 hover:text-fallo-500 rounded-xl transition-all mx-auto"
            title="Salir del proyecto"
          >
            <Trash2 size={20} />
          </button>
        

        {/* Contenedor oculto para la exportación de todos los modelos */}
        {currentProject && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '100%' }}>
            <FullReportContainer 
              files={currentProject.files}
              auditConfig={currentProject.auditConfig}
            />
          </div>
        )}
      </aside>

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Cabecera del Proyecto */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-marca-50 rounded-xl flex items-center justify-center text-marca-600">
                <ClipboardCheck size={18} />
              </div>
              <div>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={currentProject?.name}
                  onChange={(e) => {
                    const newProjects = projects.map(p => 
                      p.id === currentProjectId ? { ...p, name: e.target.value } : p
                    );
                    saveProjects(newProjects);
                  }}
                  className="text-lg font-black text-slate-900 bg-transparent border-none p-0 m-0 focus:ring-0"
                />
                <Edit3 size={16} className="text-slate-400" />
              </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-0">
                  <span>Proyecto BIM</span>
                  <span>•</span>
                  <span className="text-marca-600">
                    {currentPage === 'general_config' && 'Auditoría de Modelos'}
                    {currentPage === 'management' && 'AUDITORIA'}
                    {currentPage === 'settings' && 'Configuración de Auditoría'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Zona dinámicamente según la pestaña activa */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50" id="main-content">
          <AnimatePresence mode="wait">
            {currentPage === 'general_config' && currentProject && (
              <GeneralConfigView 
                currentProject={currentProject}
                selectedFileId={selectedFileId}
                onSelectFile={(fileId) => setSelectedFileId(fileId)}
                onNavigateToManagement={() => setCurrentPage('management')}
                onOpenWarningModal={(typeName, ids) => setShowWarningModal({ isOpen: true, typeName, ids })}
                onOpenGridsModal={(grids) => setShowGridsModal({ isOpen: true, grids })}
              />
            )}

            {currentPage === 'management' && (
              <ManagementView 
                currentProject={currentProject}
                selectedFileId={selectedFileId}
                onSelectFileForDashboard={(fileId) => {
                  setSelectedFileId(fileId);
                  setCurrentPage('general_config');
                }}
                fileInputRef={fileInputRef}
                onAddNewFileToProject={(newFile) => {
                  const updatedProjects = projects.map(p => 
                    p.id === currentProject.id 
                      ? { ...p, files: [newFile, ...p.files], lastModified: new Date().toLocaleDateString('es-ES') } 
                      : p
                  );
                  saveProjects(updatedProjects);
                  setSelectedFileId(newFile.id);
                  setCurrentPage('general_config');
                }}
                onUpdateFileData={(fileId, newData, elementCount, newExportDate) => {
                  const updatedProjects = projects.map(p => 
                    p.id === currentProject.id 
                      ? { 
                          ...p, 
                          files: p.files.map(f => f.id === fileId ? { ...f, data: newData, elementCount, createdAt: newExportDate } : f),
                          lastModified: new Date().toLocaleDateString('es-ES')
                        } 
                      : p
                  );
                  saveProjects(updatedProjects);
                  // Eliminado el alert ya que la UI reaccionará al cambio de estado de proyectos
                }}
                onUpdateFileMetadata={(fileId, customName, modelType) => {
                  const updatedProjects = projects.map(p => 
                    p.id === currentProject.id 
                      ? { 
                          ...p, 
                          files: p.files.map(f => f.id === fileId ? { ...f, customName, modelType } : f),
                          lastModified: new Date().toLocaleDateString('es-ES')
                        } 
                      : p
                  );
                  saveProjects(updatedProjects);
                }}
                onDeleteFile={(fileId) => {
                  const updatedFiles = currentProject.files.filter(f => f.id !== fileId);
                  const updatedProjects = projects.map(p => 
                    p.id === currentProject.id 
                      ? { ...p, files: updatedFiles, lastModified: new Date().toLocaleDateString('es-ES') } 
                      : p
                  );
                  saveProjects(updatedProjects);
                  if (selectedFileId === fileId) {
                    setSelectedFileId(updatedFiles[0]?.id || null);
                  }
                }}
                onClearAllFiles={() => {
                  const updatedProjects = projects.map(p => 
                    p.id === currentProject.id 
                      ? { ...p, files: [], lastModified: new Date().toLocaleDateString('es-ES') } 
                      : p
                  );
                  saveProjects(updatedProjects);
                  setSelectedFileId(null);
                }}
              />
            )}

            {currentPage === 'settings' && currentProject && (
              <SettingsView 
                currentProject={currentProject}
                onSave={updateAuditConfig}
                onBack={() => setCurrentPage('general_config')}
                onViewAudit={() => setCurrentPage('general_config')}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modales Compartidos */}
      {sharedModals}
    </div>
  );
}