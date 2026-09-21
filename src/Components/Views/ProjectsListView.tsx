import React from 'react';
import { 
  Database, 
  Search, 
  Download, 
  Plus, 
  Upload, 
  FolderOpen, 
  FileJson, 
  Clock, 
  Trash2, 
  ChevronRight,
  ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Project } from '../../types';

interface ProjectsListViewProps {
  projects: Project[];                                // Lista de proyectos
  searchQuery: string;                               // Texto del filtro de búsqueda
  setSearchQuery: (query: string) => void;           // Handler del filtro
  onSelectProject: (projectId: string) => void;      // Seleccionar un proyecto para abrirlo
  onDeleteProject: (projectId: string) => void;      // Iniciar borrado de proyecto
  onBackup: () => void;                              // Descargar copia de seguridad
  fileInputRef: React.RefObject<HTMLInputElement | null>;    // Referencia al input file escondido
  handleImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void; // Manejador del archivo importado
}

/**
 * Vista de Inicio que muestra la cuadrícula de todos los proyectos registrados.
 */
export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  searchQuery,
  setSearchQuery,
  onSelectProject,
  onDeleteProject,
  onBackup,
  fileInputRef,
  handleImportJson
}) => {
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Cabecera Principal */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-alerta-500 p-2 rounded-lg text-white shadow-lg shadow-alerta-100">
              <ClipboardCheck size={24} fill="white" fillOpacity={0.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">AUDITORIA MODELOS BIM</h1>
              <p className="text-xs italic text-slate-400 font-medium">Auditoría BIM interna BILBA</p>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar proyectos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-marca-500 transition-all"
            />
          </div>

          {/* Acciones Superiores */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackup}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-marca-600 text-white text-sm font-bold hover:bg-marca-700 shadow-lg shadow-marca-100 transition-all"
            >
              <Download size={18} />
              Backup
            </button>
          </div>
        </div>
      </header>

      {/* Grid de Tarjetas de Proyectos */}
      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tarjeta de Importar JSON */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-marca-400 hover:bg-marca-50/30 transition-all group h-[220px]"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-marca-500">
              <Upload size={32} />
            </div>
            <h3 className="font-bold text-slate-700 mb-1">IMPORTAR JSON</h3>
            <p className="text-xs italic text-slate-400">Carga un archivo json desde el ordenador</p>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportJson} 
              className="hidden" 
            />
          </div>

          {/* Lista de Proyectos Existentes */}
          {filteredProjects.map(project => (
            <motion.div 
              layoutId={project.id}
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white rounded-2xl border border-slate-100 flex flex-col h-[240px] overflow-hidden hover:border-marca-200 transition-all relative group cursor-pointer"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // Evita abrir el proyecto si se presiona el botón de borrar
                  onDeleteProject(project.id);
                }}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-fallo-500 hover:bg-fallo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                title="Eliminar proyecto"
              >
                <Trash2 size={18} />
              </button>

              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-marca-50 text-marca-600 p-2 rounded-lg">
                    <FolderOpen size={20} />
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg line-clamp-2 leading-tight mb-3 pr-8">
                  {project.name}
                </h3>
                <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <FileJson size={14} className="text-slate-400" />
                    <span>{project.files.length} archivos cargados</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>Última mod: {project.lastModified}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => onSelectProject(project.id)}
                className="w-full bg-slate-50 hover:bg-marca-600 hover:text-white py-4 px-6 flex items-center justify-between text-sm font-bold text-slate-600 transition-all border-t border-slate-100"
              >
                Abrir Proyecto
                <ChevronRight size={18} />
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};