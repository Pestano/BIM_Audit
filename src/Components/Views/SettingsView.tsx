import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  ChevronLeft,
  MapPin,
  Layers,
  FileCode,
  AlertCircle,
  ShieldCheck,
  Building2,
  Check,
  Wrench,
  Trees,
  Network,
  FileBox,
  Globe,
  Copy,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Download,
  X,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Project, AuditConfig, ModelDiscipline, DisciplineAuditConfig } from '../../types';
import { MODEL_DISCIPLINES, getDisciplineLabel, getDisciplineColorClasses } from '../../utils/modelUtils';
import { auditModelName } from '../../lib/auditEngine';

interface SettingsViewProps {
  currentProject: Project;
  onSave: (config: AuditConfig) => void;
  onBack: () => void;
  onViewAudit: () => void;
}

const DEFAULT_DISCIPLINE_TEMPLATES: Record<ModelDiscipline, { worksets: string[]; levels: { nombre: string; elevacion_m: number; requiereEstructura?: boolean; requiereNivelEdificio?: boolean }[] }> = {
  estructura: {
    worksets: ["01_EST_CIMENTACION", "02_EST_ESTRUCTURA", "03_EST_FORJADOS", "04_EST_VINCULOS"],
    levels: [
      { nombre: "S-3_EST", elevacion_m: -7.1, requiereEstructura: true, requiereNivelEdificio: true },
      { nombre: "N+0 EST", elevacion_m: 3.7, requiereEstructura: true, requiereNivelEdificio: true },
      { nombre: "N+3", elevacion_m: 13.7, requiereEstructura: true, requiereNivelEdificio: false }
    ]
  },
  arquitectura: {
    worksets: ["01_ARQ_FACHADAS", "02_ARQ_COMPARTIMENTACION", "03_ARQ_CARPINTERIAS", "04_ARQ_ACABADOS"],
    levels: [
      { nombre: "S-3_ARQ", elevacion_m: -7.1, requiereEstructura: false, requiereNivelEdificio: true },
      { nombre: "N+0 ARQ", elevacion_m: 3.7, requiereEstructura: false, requiereNivelEdificio: true },
      { nombre: "N+3 ARQ", elevacion_m: 13.7, requiereEstructura: false, requiereNivelEdificio: true }
    ]
  },
  instalaciones: {
    worksets: ["01_MEP_CLIMATIZACION", "02_MEP_FONTANERIA", "03_MEP_ELECTRICIDAD", "04_MEP_SANEAMIENTO"],
    levels: [
      { nombre: "N+0 MEP", elevacion_m: 3.7, requiereEstructura: false, requiereNivelEdificio: true },
      { nombre: "N+3 MEP", elevacion_m: 13.7, requiereEstructura: false, requiereNivelEdificio: true }
    ]
  },
  urbanizacion: {
    worksets: ["01_URB_VIALIDAD", "02_URB_TOPOGRAFIA", "03_URB_REDES_EXTERIORES"],
    levels: [
      { nombre: "TERRENO", elevacion_m: 0.0, requiereEstructura: false, requiereNivelEdificio: false }
    ]
  },
  federado: {
    worksets: ["00_MODELOS_VINCULADOS", "01_PUNTOS_CONTROL", "02_REJILLAS_MAESTRAS"],
    levels: [
      { nombre: "N+0 EST", elevacion_m: 3.7, requiereEstructura: false, requiereNivelEdificio: true }
    ]
  },
  otro: {
    worksets: ["01_GENERAL", "02_VINCULOS"],
    levels: [
      { nombre: "N+0", elevacion_m: 0.0, requiereEstructura: false, requiereNivelEdificio: true }
    ]
  }
};

export const SettingsView: React.FC<SettingsViewProps> = ({ currentProject, onSave, onBack, onViewAudit }) => {
  // Inicialización inteligente garantizando que todas las disciplinas tengan sus subproyectos y niveles
  const [config, setConfig] = useState<AuditConfig>(() => {
    const existing = currentProject.auditConfig;
    const baseByDisc: Partial<Record<ModelDiscipline, DisciplineAuditConfig>> = existing?.byDiscipline || {};

    const initialByDiscipline: Partial<Record<ModelDiscipline, DisciplineAuditConfig>> = {
      estructura: baseByDisc.estructura || {
        expectedWorksets: existing?.expectedWorksets?.length ? [...existing.expectedWorksets] : [...DEFAULT_DISCIPLINE_TEMPLATES.estructura.worksets],
        expectedLevels: existing?.expectedLevels?.length ? [...existing.expectedLevels] : [...DEFAULT_DISCIPLINE_TEMPLATES.estructura.levels]
      },
      arquitectura: baseByDisc.arquitectura || {
        expectedWorksets: [...DEFAULT_DISCIPLINE_TEMPLATES.arquitectura.worksets],
        expectedLevels: [...DEFAULT_DISCIPLINE_TEMPLATES.arquitectura.levels]
      },
      instalaciones: baseByDisc.instalaciones || {
        expectedWorksets: [...DEFAULT_DISCIPLINE_TEMPLATES.instalaciones.worksets],
        expectedLevels: [...DEFAULT_DISCIPLINE_TEMPLATES.instalaciones.levels]
      },
      urbanizacion: baseByDisc.urbanizacion || {
        expectedWorksets: [...DEFAULT_DISCIPLINE_TEMPLATES.urbanizacion.worksets],
        expectedLevels: [...DEFAULT_DISCIPLINE_TEMPLATES.urbanizacion.levels]
      },
      federado: baseByDisc.federado || {
        expectedWorksets: [...DEFAULT_DISCIPLINE_TEMPLATES.federado.worksets],
        expectedLevels: [...DEFAULT_DISCIPLINE_TEMPLATES.federado.levels]
      },
      otro: baseByDisc.otro || {
        expectedWorksets: [...DEFAULT_DISCIPLINE_TEMPLATES.otro.worksets],
        expectedLevels: [...DEFAULT_DISCIPLINE_TEMPLATES.otro.levels]
      }
    };

    return {
      auditPhase: 'Configuración General',
      projectCode: existing?.projectCode || '',
      revitVersion: existing?.revitVersion || '',
      expectedCoordinates: existing?.expectedCoordinates || {
        basePoint: { norte_sur_m: 0, este_oeste_m: 0, elevacion_m: 0, angulo_norte_grados: 0 },
        surveyPoint: { norte_sur_m: 0, este_oeste_m: 0, elevacion_m: 0 }
      },
      expectedWorksets: existing?.expectedWorksets || initialByDiscipline.estructura!.expectedWorksets,
      expectedLevels: existing?.expectedLevels || initialByDiscipline.estructura!.expectedLevels,
      byDiscipline: initialByDiscipline
    };
  });

  // Pestaña de navegación (General y Coordenadas son comunes; Subproyectos y Niveles son por modelo)
  const [activeTab, setActiveTab] = useState<'general' | 'coordinates' | 'worksets' | 'levels'>('general');

  // Disciplina activa para configurar subproyectos o niveles específicos
  const [activeDiscipline, setActiveDiscipline] = useState<ModelDiscipline>('estructura');

  // Modal o feedback de guardado
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Probador interactivo de nomenclatura de modelos
  const [testModelName, setTestModelName] = useState('HMM-BCI-CO-ZZ-MOD-EST-R25_adrianapestano.rvt');

  // Estados de importación Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'worksets' | 'levels' | 'coordinates' | null>(null);
  const [showExcelHelp, setShowExcelHelp] = useState<'coordinates' | 'worksets' | 'levels' | null>(null);

  // Descarga de plantillas Excel (.xlsx) generadas en tiempo real
  const downloadExcelTemplate = (type: 'coordinates' | 'worksets' | 'levels') => {
    const wb = XLSX.utils.book_new();

    if (type === 'coordinates') {
      // Hoja 1: Punto base del proyecto
      const pbData = [
        ["Parámetro", "Valor numérico (m / °)"],
        ["Norte / Sur (m)", 4065795.696],
        ["Este / Oeste (m)", 372200.405],
        ["Elevación (m)", 20.630],
        ["Ángulo con respecto al Norte Real (°)", 25.384]
      ];
      const wsPb = XLSX.utils.aoa_to_sheet(pbData);
      XLSX.utils.book_append_sheet(wb, wsPb, "Punto base del proyecto");

      // Hoja 2: Punto de reconocimiento
      const srData = [
        ["Parámetro", "Valor numérico (m)"],
        ["Norte / Sur (m)", 4065795.696],
        ["Este / Oeste (m)", 372200.405],
        ["Elevación (m)", 20.630]
      ];
      const wsSr = XLSX.utils.aoa_to_sheet(srData);
      XLSX.utils.book_append_sheet(wb, wsSr, "Punto de reconocimiento");
      XLSX.writeFile(wb, "Plantilla_Coordenadas_Revit.xlsx");
    } else if (type === 'worksets') {
      const wsData = [
        ["Subproyecto"],
        ["01_EST_CIMENTACION"],
        ["02_EST_ESTRUCTURA"],
        ["03_EST_FORJADOS"],
        ["04_EST_VINCULOS"],
        ["05_EST_NIVELES_REJILLAS"]
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Subproyectos");
      XLSX.writeFile(wb, `Plantilla_Subproyectos_${activeDiscipline.toUpperCase()}.xlsx`);
    } else if (type === 'levels') {
      const wsData = [
        ["Nombre", "Elevación (m)", "Es Estructura (SI/NO)", "Nivel de Edificio (SI/NO)"],
        ["S-3_EST", -7.10, "SI", "SI"],
        ["N+0 EST", 3.70, "SI", "SI"],
        ["N+1", 7.20, "SI", "SI"],
        ["N+3 CUBIERTA", 13.70, "NO", "NO"]
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Niveles");
      XLSX.writeFile(wb, `Plantilla_Niveles_${activeDiscipline.toUpperCase()}.xlsx`);
    }
  };

  // Formulario para nuevo nivel manual
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelElev, setNewLevelElev] = useState('');
  const [newLevelReqStructure, setNewLevelReqStructure] = useState(false);
  const [newLevelReqBuilding, setNewLevelReqBuilding] = useState(false);

  // Formulario para nuevo subproyecto manual
  const [newWorksetName, setNewWorksetName] = useState('');

  // Auxiliares para obtener datos de la disciplina activa
  const currentDisciplineConfig = config.byDiscipline?.[activeDiscipline] || {
    expectedWorksets: [],
    expectedLevels: []
  };

  const updateDisciplineConfig = (updater: (prevDisc: DisciplineAuditConfig) => DisciplineAuditConfig) => {
    setConfig(prev => {
      const currentDisc = prev.byDiscipline?.[activeDiscipline] || { expectedWorksets: [], expectedLevels: [] };
      const updatedDisc = updater(currentDisc);
      const newByDiscipline = {
        ...(prev.byDiscipline || {}),
        [activeDiscipline]: updatedDisc
      };

      // Si la disciplina es estructura o coincide con la principal, mantenemos los arrays raíz sincronizados
      return {
        ...prev,
        byDiscipline: newByDiscipline,
        expectedWorksets: activeDiscipline === 'estructura' ? updatedDisc.expectedWorksets : prev.expectedWorksets,
        expectedLevels: activeDiscipline === 'estructura' ? updatedDisc.expectedLevels : prev.expectedLevels
      };
    });
  };

  const handleSave = () => {
    onSave(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Alternar propiedades de niveles para la disciplina activa
  const toggleLevelProperty = (index: number, property: 'requiereEstructura' | 'requiereNivelEdificio') => {
    updateDisciplineConfig(prev => {
      const updated = [...prev.expectedLevels];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          [property]: !updated[index][property]
        };
      }
      return { ...prev, expectedLevels: updated };
    });
  };

  // Marcar/Desmarcar masivo para la disciplina activa
  const setAllLevelsProperty = (property: 'requiereEstructura' | 'requiereNivelEdificio', value: boolean) => {
    updateDisciplineConfig(prev => ({
      ...prev,
      expectedLevels: prev.expectedLevels.map(l => ({
        ...l,
        [property]: value
      }))
    }));
  };

  // Copiar configuración de otra disciplina a la actual
  const copyFromDiscipline = (sourceDisc: ModelDiscipline, targetType: 'worksets' | 'levels' | 'both') => {
    const sourceConfig = config.byDiscipline?.[sourceDisc];
    if (!sourceConfig) return;

    const currentCount = targetType === 'levels' 
      ? currentDisciplineConfig.expectedLevels.length 
      : currentDisciplineConfig.expectedWorksets.length;

    if (currentCount > 0) {
      const sourceName = getDisciplineLabel(sourceDisc);
      const targetName = getDisciplineLabel(activeDiscipline);
      const itemType = targetType === 'levels' ? 'niveles' : 'subproyectos';
      const sourceCount = targetType === 'levels' ? sourceConfig.expectedLevels.length : sourceConfig.expectedWorksets.length;
      if (!window.confirm(`¿Deseas reemplazar los ${currentCount} ${itemType} actuales de ${targetName} por los ${sourceCount} ${itemType} de ${sourceName}?`)) {
        return;
      }
    }

    updateDisciplineConfig(prev => ({
      ...prev,
      expectedWorksets: targetType === 'levels' ? prev.expectedWorksets : [...sourceConfig.expectedWorksets],
      expectedLevels: targetType === 'worksets' ? prev.expectedLevels : sourceConfig.expectedLevels.map(l => ({ ...l }))
    }));
  };

  // Cargar plantilla por defecto para la disciplina activa
  const loadDefaultTemplate = () => {
    const tpl = DEFAULT_DISCIPLINE_TEMPLATES[activeDiscipline];
    if (!tpl) return;

    if (activeTab === 'worksets') {
      updateDisciplineConfig(prev => ({
        ...prev,
        expectedWorksets: [...tpl.worksets]
      }));
    } else if (activeTab === 'levels') {
      updateDisciplineConfig(prev => ({
        ...prev,
        expectedLevels: tpl.levels.map(l => ({ ...l }))
      }));
    }
  };

  // Manejo de importación Excel
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importType) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (importType === 'worksets') {
          // Asume nombres en la primera columna
          const newWorksets = data.slice(1).map(row => String(row[0] || '').trim()).filter(name => name && name !== 'undefined');
          if (newWorksets.length > 0) {
            updateDisciplineConfig(prev => ({ ...prev, expectedWorksets: newWorksets }));
          }
        } else if (importType === 'levels') {
          // Col 0: Nombre, Col 1: Elevación, Col 2: Es Estructura (opcional), Col 3: Es Nivel Edificio (opcional)
          const isTruthy = (val: any) => {
            if (typeof val === 'boolean') return val;
            const s = String(val || '').trim().toLowerCase();
            return s === 'si' || s === 's' || s === 'true' || s === '1' || s === 'yes' || s === 'y';
          };

          const newLevels = data.slice(1).map(row => ({
            nombre: String(row[0] || '').trim(),
            elevacion_m: parseFloat(String(row[1] || '0').replace(',', '.')) || 0,
            requiereEstructura: isTruthy(row[2]),
            requiereNivelEdificio: isTruthy(row[3])
          })).filter(l => l.nombre && l.nombre !== 'undefined');

          if (newLevels.length > 0) {
            updateDisciplineConfig(prev => ({ ...prev, expectedLevels: newLevels }));
          }
        } else if (importType === 'coordinates') {
          const pbSheet = wb.Sheets["Punto base del proyecto"] || wb.Sheets[wb.SheetNames[0]];
          const srSheet = wb.Sheets["Punto de reconocimiento"] || (wb.SheetNames.length > 1 ? wb.Sheets[wb.SheetNames[1]] : pbSheet);
          
          const findValInRows = (sheet: XLSX.WorkSheet | undefined, keywords: string[]) => {
            if (!sheet) return null;
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            for (const r of rows) {
              const label = String(r[0] || '').toLowerCase();
              if (keywords.some(k => label.includes(k))) {
                const val = parseFloat(String(r[1] || '0').replace(',', '.'));
                if (!isNaN(val)) return val;
              }
            }
            return null;
          };

          const getCellVal = (sheet: XLSX.WorkSheet | undefined, cell: string) => {
            if (!sheet || !sheet[cell]) return null;
            const val = sheet[cell].v ?? sheet[cell].w;
            const n = parseFloat(String(val).replace(',', '.'));
            return isNaN(n) ? null : n;
          };

          const pbNorte = findValInRows(pbSheet, ['norte', 'north', 'y']) ?? getCellVal(pbSheet, 'B1') ?? getCellVal(pbSheet, 'B2') ?? 0;
          const pbEste = findValInRows(pbSheet, ['este', 'east', 'x']) ?? getCellVal(pbSheet, 'B2') ?? getCellVal(pbSheet, 'B3') ?? 0;
          const pbElev = findValInRows(pbSheet, ['elevaci', 'elevat', 'cota', 'z']) ?? getCellVal(pbSheet, 'B3') ?? getCellVal(pbSheet, 'B4') ?? 0;
          const pbAngulo = findValInRows(pbSheet, ['angulo', 'angle', 'norte real', 'rotaci']) ?? getCellVal(pbSheet, 'B4') ?? getCellVal(pbSheet, 'B5') ?? 0;

          const srNorte = findValInRows(srSheet, ['norte', 'north', 'y']) ?? getCellVal(srSheet, 'B1') ?? getCellVal(srSheet, 'B2') ?? 0;
          const srEste = findValInRows(srSheet, ['este', 'east', 'x']) ?? getCellVal(srSheet, 'B2') ?? getCellVal(srSheet, 'B3') ?? 0;
          const srElev = findValInRows(srSheet, ['elevaci', 'elevat', 'cota', 'z']) ?? getCellVal(srSheet, 'B3') ?? getCellVal(srSheet, 'B4') ?? 0;

          setConfig(prev => ({
            ...prev,
            expectedCoordinates: {
              basePoint: {
                norte_sur_m: pbNorte,
                este_oeste_m: pbEste,
                elevacion_m: pbElev,
                angulo_norte_grados: pbAngulo,
              },
              surveyPoint: {
                norte_sur_m: srNorte,
                este_oeste_m: srEste,
                elevacion_m: srElev,
              }
            }
          }));
        }
      } catch (err) {
        console.error("Error al procesar archivo Excel:", err);
        alert("No se pudo leer el archivo Excel. Asegúrate de que tiene un formato válido.");
      } finally {
        setImportType(null);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getDisciplineIcon = (key: ModelDiscipline, size = 16) => {
    switch (key) {
      case 'estructura': return <Layers size={size} />;
      case 'arquitectura': return <Building2 size={size} />;
      case 'instalaciones': return <Wrench size={size} />;
      case 'urbanizacion': return <Trees size={size} />;
      case 'federado': return <Network size={size} />;
      default: return <FileBox size={size} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto py-4 sm:py-6 space-y-6"
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleExcelImport} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* Cabecera Principal de Configuración */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 hover:bg-white bg-slate-100/80 rounded-2xl transition-colors text-slate-500 hover:text-slate-800 shadow-2xs"
            title="Volver a la auditoría"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configuración de Auditoría</h2>
            <p className="text-xs italic text-slate-400 mt-0.5">
              Establece las tolerancias y requisitos para el proyecto <span className="font-bold text-slate-600 not-italic">{currentProject.name}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {savedSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex items-center gap-1.5 px-3 py-2 bg-ok-50 text-ok-700 border border-ok-200 rounded-xl text-xs font-bold"
            >
              <CheckCircle2 size={15} />
              <span>¡Guardado!</span>
            </motion.div>
          )}

          <button 
            onClick={onViewAudit}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-marca-600 text-marca-600 font-bold text-xs rounded-2xl hover:bg-marca-50 transition-all"
          >
            <ShieldCheck size={18} />
            <span>Ver Informe Auditoría</span>
          </button>

          <button 
            onClick={handleSave}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-marca-600 text-white font-bold text-xs rounded-2xl hover:bg-marca-700 shadow-lg shadow-marca-200 transition-all hover:scale-102 active:scale-98"
          >
            <Save size={18} />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>

      {/* Contenedor Principal con Sidebar y Panel de Ajustes */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de Ajustes estructurado en: Común a todos vs Específico por modelo */}
        <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
          {/* Grupo 1: Común a todos los modelos */}
          <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-dato font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe size={13} className="text-marca-500" />
                Común a todos los modelos
              </span>
              <span className="text-etiqueta font-extrabold px-1.5 py-0.5 rounded bg-marca-50 text-marca-600 border border-marca-100">
                Global
              </span>
            </div>

            <TabButton 
              active={activeTab === 'general'} 
              onClick={() => setActiveTab('general')} 
              icon={FileCode} 
              label="General" 
              sublabel="Código y versión de Revit"
            />
            <TabButton 
              active={activeTab === 'coordinates'} 
              onClick={() => setActiveTab('coordinates')} 
              icon={MapPin} 
              label="Coordenadas" 
              sublabel="Punto base y reconocimiento"
            />
          </div>

          {/* Grupo 2: Específico por modelo */}
          <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-dato font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers size={13} className="text-alerta-500" />
                Específico por modelo
              </span>
              <span className="text-etiqueta font-extrabold px-1.5 py-0.5 rounded bg-alerta-50 text-alerta-700 border border-alerta-100">
                Por Disciplina
              </span>
            </div>

            <TabButton 
              active={activeTab === 'worksets'} 
              onClick={() => setActiveTab('worksets')} 
              icon={Layers} 
              label="Subproyectos" 
              sublabel="Requeridos según modelo (EST, ARQ...)"
              count={config.byDiscipline?.[activeDiscipline]?.expectedWorksets.length || 0}
            />
            <TabButton 
              active={activeTab === 'levels'} 
              onClick={() => setActiveTab('levels')} 
              icon={Building2} 
              label="Niveles" 
              sublabel="Alturas y tipos según modelo"
              count={config.byDiscipline?.[activeDiscipline]?.expectedLevels.length || 0}
            />
          </div>
        </div>

        {/* Panel de Contenido */}
        <div className="flex-1 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs min-h-[600px]">
          {/* ================= PESTAÑA: GENERAL ================= */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <SectionHeader title="Ajustes de Identificación del Proyecto" />
                <p className="text-xs italic text-slate-400 mt-1">
                  Parámetros globales compartidos por todos los modelos para validar la nomenclatura y compatibilidad.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase">
                    Código de Proyecto (3 letras)
                  </label>
                  <p className="text-nota text-slate-400">
                    Se utiliza en el Bloque 1 de la nomenclatura del archivo (ej: <strong>HMM</strong>-BCI-CO-ZZ-MOD-EST-R25).
                  </p>
                  <input 
                    type="text" 
                    maxLength={3}
                    value={config.projectCode}
                    onChange={(e) => setConfig({ ...config, projectCode: e.target.value.toUpperCase() })}
                    placeholder="Ej: HMM"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-lg text-slate-800 focus:border-marca-500 focus:ring-0 transition-all"
                  />
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase">
                    Versión Revit esperada
                  </label>
                  <p className="text-nota text-slate-400">
                    Se utiliza en el Bloque 7 del nombre del archivo (ej: <strong>R25</strong> para Revit 2025).
                  </p>
                  <input 
                    type="text" 
                    value={config.revitVersion}
                    onChange={(e) => setConfig({ ...config, revitVersion: e.target.value.toUpperCase() })}
                    placeholder="Ej: R25"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-lg text-slate-800 focus:border-marca-500 focus:ring-0 transition-all"
                  />
                </div>
              </div>

              {/* Guía oficial de la estructura de 7 bloques de izquierda a derecha */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FileCode size={16} className="text-marca-600" />
                      Regla Oficial de Nomenclatura (Lectura de Izquierda a Derecha)
                    </h3>
                    <p className="text-xs italic text-slate-400 mt-0.5">
                      7 bloques separados por guión (<code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 not-italic">-</code>). Todo lo que haya tras una barra baja (<code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 not-italic">_</code>) es ignorado.
                    </p>
                  </div>
                  <span className="text-micro font-black px-2 py-1 rounded-md bg-marca-100 text-marca-800 border border-marca-200 shrink-0 self-start sm:self-auto">
                    7 Bloques Estrictos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">1. Código de proyecto</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">3 letras (Identificador del proyecto)</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">Ej: {config.projectCode || 'HMM'}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">2. Equipo responsable</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">2 a 3 letras (Empresa u organización)</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">Ej: BCI</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">3. Fase de creación</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">2 letras (Fase del modelo)</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">EN, EP, AN, PB, PE, CO, AB</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">4. Localizador / División</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">2 letras o cifras (Ubicación/sector)</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">Ej: ZZ, V1, B1, A2</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">5. Tipo de archivo</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">3 letras (Tipo de modelo)</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">MOD (Modelo BIM) o FED (Federado)</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">6. Disciplina</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">3 letras (Especialidad)</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">ARQ, EST, INS, URB, ZZZ</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between md:col-span-2 lg:col-span-3">
                    <div>
                      <span className="text-micro font-black text-marca-600 uppercase">7. Versión de Revit</span>
                      <p className="text-etiqueta font-bold text-slate-700 mt-1">Identificador del software para el proyecto</p>
                    </div>
                    <span className="text-micro font-mono text-slate-400 mt-2">Ej: {config.revitVersion || 'R25'}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-300 text-zinc-900 text-etiqueta flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-zinc-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Regla de sufijos de usuario tras barra baja (<code className="font-mono font-bold">_</code>):</span>
                    <span className="ml-1 text-zinc-700">
                      Cualquier texto adicional tras una barra baja (ej: <code className="font-mono font-bold text-black">_adrianapestano</code> o <code className="font-mono font-bold text-black">_copialocal</code>) se ignora automáticamente para la comprobación de los 7 bloques del modelo.
                    </span>
                  </div>
                </div>
              </div>

              {/* Probador interactivo en tiempo real de la nomenclatura */}
              {(() => {
                const testResult = auditModelName(testModelName, config);
                return (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={16} className="text-zinc-700" />
                          Probador Interactivo de Nomenclatura
                        </h3>
                        <p className="text-xs italic text-slate-400 mt-0.5">
                          Escribe o pega cualquier nombre de archivo para verificar en vivo su validación según los ajustes actuales.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-micro font-black text-slate-400 uppercase">Resultado:</span>
                        <span className={`px-2.5 py-1 rounded-full text-micro font-black uppercase tracking-wider flex items-center gap-1 ${
                          testResult.status === 'BUENO' ? 'bg-ok-100 text-ok-800 border border-ok-200' : 'bg-fallo-100 text-fallo-800 border border-fallo-200'
                        }`}>
                          {testResult.status === 'BUENO' ? <CheckCircle2 size={12} /> : <X size={12} />}
                          {testResult.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-micro font-black text-slate-400 uppercase">
                          Nombre a auditar
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-micro text-slate-400">Ejemplos:</span>
                          <button
                            type="button"
                            onClick={() => setTestModelName('HMM-BCI-CO-ZZ-MOD-EST-R25_adrianapestano.rvt')}
                            className="text-micro font-mono font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            Con sufijo _usuario
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestModelName('HMM-BCI-CO-V1-MOD-ARQ-R25.rvt')}
                            className="text-micro font-mono font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            ARQ limpio
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestModelName('HMM-BCI-PE-01-FED-ZZZ-R25.rvt')}
                            className="text-micro font-mono font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            Federado ZZZ
                          </button>
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={testModelName}
                        onChange={(e) => setTestModelName(e.target.value)}
                        placeholder="Ej: HMM-BCI-CO-ZZ-MOD-EST-R25_usuario.rvt"
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 font-mono text-sm text-slate-800 focus:bg-white focus:border-marca-500 focus:ring-0 transition-all"
                      />
                    </div>

                    {testResult.ignoredSuffix && (
                      <div className="bg-alerta-50 text-alerta-800 p-2.5 rounded-xl border border-alerta-200 text-etiqueta flex items-center justify-between">
                        <span>Sufijo local detectado tras barra baja: <strong>{testResult.ignoredSuffix}</strong></span>
                        <span className="font-bold text-micro uppercase bg-alerta-200/80 px-2 py-0.5 rounded text-alerta-900">Ignorado correctamente</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
                      {testResult.fields.map((f, idx) => (
                        <div 
                          key={idx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            f.ok ? 'bg-white border-slate-100' : 'bg-fallo-50/70 border-fallo-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-micro font-black shrink-0 ${
                              f.ok ? 'bg-slate-100 text-slate-500' : 'bg-fallo-100 text-fallo-700'
                            }`}>
                              {f.index}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-micro font-black text-slate-400 uppercase leading-none mb-1 truncate">
                                {f.name}
                              </span>
                              <span className={`text-etiqueta font-black font-mono truncate ${
                                f.ok ? 'text-slate-800' : 'text-fallo-700'
                              }`}>
                                {f.value}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {!f.ok && (
                              <span className="text-micro font-bold text-fallo-500 max-w-[90px] truncate" title={`Esperado: ${f.expected}`}>
                                {f.expected}
                              </span>
                            )}
                            {f.ok ? <CheckCircle2 size={14} className="text-ok-500 shrink-0" /> : <X size={14} className="text-fallo-500 shrink-0" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ================= PESTAÑA: COORDENADAS ================= */}
          {activeTab === 'coordinates' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <SectionHeader title="Coordenadas Maestras del Proyecto" />
                  <p className="text-xs italic text-slate-400 mt-2 leading-relaxed">
                    Valores geoespaciales comunes que deben coincidir exactamente en todos los modelos (EST, ARQ, INST, FED...).
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => setShowExcelHelp('coordinates')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-xs"
                    title="Ver estructura requerida y descargar plantilla Excel de coordenadas"
                  >
                    <HelpCircle size={15} className="text-marca-600" />
                    <span>¿Cómo debe ser el Excel?</span>
                  </button>
                  <button 
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        expectedCoordinates: {
                          basePoint: { norte_sur_m: 0, este_oeste_m: 0, elevacion_m: 0, angulo_norte_grados: 0 },
                          surveyPoint: { norte_sur_m: 0, este_oeste_m: 0, elevacion_m: 0 }
                        }
                      }));
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-fallo-50 text-fallo-600 rounded-xl hover:bg-fallo-100 transition-colors text-xs font-bold"
                  >
                    <Trash2 size={14} />
                    <span>Limpiar</span>
                  </button>
                  <button 
                    onClick={() => { setImportType('coordinates'); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-ok-600 text-white rounded-xl hover:bg-ok-700 shadow-sm shadow-ok-200 transition-all text-xs font-bold"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Importar Coordenadas Excel</span>
                  </button>
                </div>
              </div>

              {/* Punto Base del Proyecto */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={15} className="text-marca-600" />
                    Punto Base del Proyecto (Project Base Point)
                  </h4>
                  <span className="text-dato text-slate-400 font-bold">Común para todos los modelos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CoordInput 
                    label="Norte / Sur (m)" 
                    value={config.expectedCoordinates.basePoint.norte_sur_m} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, basePoint: { ...config.expectedCoordinates.basePoint, norte_sur_m: v } } })} 
                  />
                  <CoordInput 
                    label="Este / Oeste (m)" 
                    value={config.expectedCoordinates.basePoint.este_oeste_m} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, basePoint: { ...config.expectedCoordinates.basePoint, este_oeste_m: v } } })} 
                  />
                  <CoordInput 
                    label="Elevación (m)" 
                    value={config.expectedCoordinates.basePoint.elevacion_m} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, basePoint: { ...config.expectedCoordinates.basePoint, elevacion_m: v } } })} 
                  />
                  <CoordInput 
                    label="Ángulo al Norte Real (°)" 
                    value={config.expectedCoordinates.basePoint.angulo_norte_grados} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, basePoint: { ...config.expectedCoordinates.basePoint, angulo_norte_grados: v } } })} 
                  />
                </div>
              </div>

              {/* Punto de Reconocimiento */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={15} className="text-alerta-600" />
                    Punto de Reconocimiento (Survey Point)
                  </h4>
                  <span className="text-dato text-slate-400 font-bold">Común para todos los modelos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CoordInput 
                    label="Norte / Sur (m)" 
                    value={config.expectedCoordinates.surveyPoint.norte_sur_m} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, surveyPoint: { ...config.expectedCoordinates.surveyPoint, norte_sur_m: v } } })} 
                  />
                  <CoordInput 
                    label="Este / Oeste (m)" 
                    value={config.expectedCoordinates.surveyPoint.este_oeste_m} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, surveyPoint: { ...config.expectedCoordinates.surveyPoint, este_oeste_m: v } } })} 
                  />
                  <CoordInput 
                    label="Elevación (m)" 
                    value={config.expectedCoordinates.surveyPoint.elevacion_m} 
                    onChange={(v: number) => setConfig({ ...config, expectedCoordinates: { ...config.expectedCoordinates, surveyPoint: { ...config.expectedCoordinates.surveyPoint, elevacion_m: v } } })} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= PESTAÑA: SUBPROYECTOS (POR MODELO/DISCIPLINA) ================= */}
          {activeTab === 'worksets' && (
            <div className="space-y-6">
              {/* Barra de Selección de Disciplina/Modelo */}
              <div className="border-b border-slate-100 pb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <SectionHeader title="Subproyectos Requeridos por Disciplina" />
                    <p className="text-xs italic text-slate-400 mt-2 leading-relaxed">
                      Selecciona la disciplina para configurar o importar sus subproyectos esperados.
                    </p>
                  </div>
                  <span className="text-nota font-bold px-3 py-1 rounded-xl bg-alerta-50 text-alerta-800 border border-alerta-200 self-start">
                    Configuración independiente por modelo
                  </span>
                </div>

                {/* Tabs de Modelos / Disciplinas */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
                  {MODEL_DISCIPLINES.filter(d => d.key !== 'otro').map(disc => {
                    const isSelected = activeDiscipline === disc.key;
                    const discCount = config.byDiscipline?.[disc.key]?.expectedWorksets.length || 0;
                    const colors = getDisciplineColorClasses(disc.key);

                    return (
                      <button
                        key={disc.key}
                        onClick={() => setActiveDiscipline(disc.key)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                          isSelected
                            ? `${colors.activeTab}`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {getDisciplineIcon(disc.key, 15)}
                        <span>{disc.label}</span>
                        <span className={`text-dato font-black px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {discCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Barra de Acciones para la disciplina activa */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                    {getDisciplineIcon(activeDiscipline, 18)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      Subproyectos de {getDisciplineLabel(activeDiscipline)}
                    </h4>
                    <span className="text-xs text-slate-400 font-bold">
                      {currentDisciplineConfig.expectedWorksets.length} subproyectos configurados
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón de ayuda estructura Excel */}
                  <button 
                    onClick={() => setShowExcelHelp('worksets')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-xs"
                    title="Ver estructura requerida y descargar plantilla Excel de subproyectos"
                  >
                    <HelpCircle size={14} className="text-marca-600" />
                    <span>¿Cómo debe ser el Excel?</span>
                  </button>

                  {/* Copiar desde Estructura si está disponible */}
                  {activeDiscipline !== 'estructura' && (config.byDiscipline?.estructura?.expectedWorksets.length || 0) > 0 && (
                    <button
                      onClick={() => copyFromDiscipline('estructura', 'worksets')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-2xs"
                      title="Copiar subproyectos configurados en Estructura hacia esta disciplina"
                    >
                      <Copy size={13} />
                      <span>Copiar de Estructura</span>
                    </button>
                  )}

                  {/* Copiar desde Arquitectura si está disponible */}
                  {activeDiscipline !== 'arquitectura' && (config.byDiscipline?.arquitectura?.expectedWorksets.length || 0) > 0 && (
                    <button
                      onClick={() => copyFromDiscipline('arquitectura', 'worksets')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-2xs"
                      title="Copiar subproyectos configurados en Arquitectura hacia esta disciplina"
                    >
                      <Copy size={13} />
                      <span>Copiar de Arquitectura</span>
                    </button>
                  )}

                  {/* Cargar plantilla recomendada */}
                  <button
                    onClick={loadDefaultTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-marca-600 border border-marca-200 rounded-xl hover:bg-marca-50 transition-colors text-xs font-bold"
                    title="Cargar subproyectos sugeridos para esta disciplina"
                  >
                    <Sparkles size={13} />
                    <span>Cargar estándar</span>
                  </button>

                  {/* Borrar todos de esta disciplina */}
                  {currentDisciplineConfig.expectedWorksets.length > 0 && (
                    <button 
                      onClick={() => updateDisciplineConfig(prev => ({ ...prev, expectedWorksets: [] }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-fallo-50 text-fallo-600 rounded-xl hover:bg-fallo-100 transition-colors text-xs font-bold"
                    >
                      <Trash2 size={13} />
                      <span>Limpiar</span>
                    </button>
                  )}

                  {/* Importar Excel específico para esta disciplina */}
                  <button 
                    onClick={() => { setImportType('worksets'); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-ok-600 text-white rounded-xl hover:bg-ok-700 shadow-sm shadow-ok-200 transition-all text-xs font-bold"
                    title={`Importar listado de subproyectos para ${getDisciplineLabel(activeDiscipline)}`}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Importar Excel ({getDisciplineLabel(activeDiscipline)})</span>
                  </button>
                </div>
              </div>

              {/* Input para añadir subproyecto a la disciplina activa */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newWorksetName}
                  onChange={(e) => setNewWorksetName(e.target.value)}
                  placeholder={`Nuevo subproyecto para ${getDisciplineLabel(activeDiscipline)} (ej: 01_${activeDiscipline.substring(0, 3).toUpperCase()}...)...`}
                  className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-marca-500 focus:ring-0 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = newWorksetName.trim();
                      if (val) {
                        updateDisciplineConfig(prev => ({
                          ...prev,
                          expectedWorksets: [...prev.expectedWorksets, val]
                        }));
                        setNewWorksetName('');
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const val = newWorksetName.trim();
                    if (val) {
                      updateDisciplineConfig(prev => ({
                        ...prev,
                        expectedWorksets: [...prev.expectedWorksets, val]
                      }));
                      setNewWorksetName('');
                    }
                  }}
                  className="bg-marca-600 hover:bg-marca-700 text-white px-4 rounded-xl flex items-center justify-center font-bold text-xs shadow-md shadow-marca-200 transition-all"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline ml-1">Añadir</span>
                </button>
              </div>

              {/* Listado de subproyectos de la disciplina activa */}
              {currentDisciplineConfig.expectedWorksets.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-bold">
                    No hay subproyectos configurados para <span className="text-slate-800">{getDisciplineLabel(activeDiscipline)}</span>.
                  </p>
                  <p className="text-nota text-slate-400 mt-1">
                    Añade nombres arriba, cárgalos de Arquitectura o Estructura, carga la plantilla estándar o importa un archivo Excel con la columna de nombres.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {currentDisciplineConfig.expectedWorksets.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 group transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-dato font-mono text-slate-400 font-bold w-5">{i + 1}.</span>
                        <span className="text-xs font-bold text-slate-700">{w}</span>
                      </div>
                      <button 
                        onClick={() => updateDisciplineConfig(prev => ({
                          ...prev,
                          expectedWorksets: prev.expectedWorksets.filter((_, idx) => idx !== i)
                        }))}
                        className="text-slate-300 hover:text-fallo-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                        title="Eliminar este subproyecto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= PESTAÑA: NIVELES (POR MODELO/DISCIPLINA) ================= */}
          {activeTab === 'levels' && (
            <div className="space-y-6">
              {/* Barra de Selección de Disciplina/Modelo */}
              <div className="border-b border-slate-100 pb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <SectionHeader title="Niveles y Alturas Requeridas por Disciplina" />
                    <p className="text-xs italic text-slate-400 mt-2 leading-relaxed">
                      Cada disciplina (EST, ARQ, INST...) puede requerir niveles distintos y diferentes marcas de Estructura o Nivel de Edificio.
                    </p>
                  </div>
                  <span className="text-nota font-bold px-3 py-1 rounded-xl bg-alerta-50 text-alerta-800 border border-alerta-200 self-start">
                    Configuración independiente por modelo
                  </span>
                </div>

                {/* Tabs de Modelos / Disciplinas */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
                  {MODEL_DISCIPLINES.filter(d => d.key !== 'otro').map(disc => {
                    const isSelected = activeDiscipline === disc.key;
                    const discLevelsCount = config.byDiscipline?.[disc.key]?.expectedLevels.length || 0;
                    const colors = getDisciplineColorClasses(disc.key);

                    return (
                      <button
                        key={disc.key}
                        onClick={() => setActiveDiscipline(disc.key)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                          isSelected
                            ? `${colors.activeTab}`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {getDisciplineIcon(disc.key, 15)}
                        <span>{disc.label}</span>
                        <span className={`text-dato font-black px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {discLevelsCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcabecera y acciones para la disciplina activa */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                    {getDisciplineIcon(activeDiscipline, 18)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      Niveles para {getDisciplineLabel(activeDiscipline)}
                    </h4>
                    <span className="text-xs text-slate-400 font-bold">
                      {currentDisciplineConfig.expectedLevels.length} niveles configurados
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón de ayuda estructura Excel */}
                  <button 
                    onClick={() => setShowExcelHelp('levels')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-xs"
                    title="Ver estructura requerida y descargar plantilla Excel de niveles"
                  >
                    <HelpCircle size={14} className="text-marca-600" />
                    <span>¿Cómo debe ser el Excel?</span>
                  </button>

                  {/* Copiar desde Estructura si está disponible */}
                  {activeDiscipline !== 'estructura' && (config.byDiscipline?.estructura?.expectedLevels.length || 0) > 0 && (
                    <button
                      onClick={() => copyFromDiscipline('estructura', 'levels')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-2xs"
                      title="Copiar niveles configurados en Estructura hacia esta disciplina"
                    >
                      <Copy size={13} />
                      <span>Copiar de Estructura</span>
                    </button>
                  )}

                  {/* Copiar desde Arquitectura si está disponible */}
                  {activeDiscipline !== 'arquitectura' && (config.byDiscipline?.arquitectura?.expectedLevels.length || 0) > 0 && (
                    <button
                      onClick={() => copyFromDiscipline('arquitectura', 'levels')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold shadow-2xs"
                      title="Copiar niveles configurados en Arquitectura hacia esta disciplina"
                    >
                      <Copy size={13} />
                      <span>Copiar de Arquitectura</span>
                    </button>
                  )}

                  {/* Cargar estándar sugerido */}
                  <button
                    onClick={loadDefaultTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-marca-600 border border-marca-200 rounded-xl hover:bg-marca-50 transition-colors text-xs font-bold"
                    title="Cargar niveles estándar para esta disciplina"
                  >
                    <Sparkles size={13} />
                    <span>Cargar estándar</span>
                  </button>

                  {/* Borrar todos de esta disciplina */}
                  {currentDisciplineConfig.expectedLevels.length > 0 && (
                    <button 
                      onClick={() => updateDisciplineConfig(prev => ({ ...prev, expectedLevels: [] }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-fallo-50 text-fallo-600 rounded-xl hover:bg-fallo-100 transition-colors text-xs font-bold"
                    >
                      <Trash2 size={13} />
                      <span>Limpiar</span>
                    </button>
                  )}

                  {/* Importar Excel específico para esta disciplina */}
                  <button 
                    onClick={() => { setImportType('levels'); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-ok-600 text-white rounded-xl hover:bg-ok-700 shadow-sm shadow-ok-200 transition-all text-xs font-bold"
                    title={`Importar listado de niveles desde Excel para ${getDisciplineLabel(activeDiscipline)}`}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Importar Excel ({getDisciplineLabel(activeDiscipline)})</span>
                  </button>
                </div>
              </div>

              {/* Formulario para añadir nuevo nivel manual */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-dato font-black text-slate-500 uppercase tracking-wider block">
                  Añadir nuevo nivel a auditar en {getDisciplineLabel(activeDiscipline)}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <input 
                      value={newLevelName}
                      onChange={(e) => setNewLevelName(e.target.value)}
                      placeholder={`Nombre (ej: N+0 ${activeDiscipline.substring(0, 3).toUpperCase()})`} 
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-marca-500 focus:ring-0 transition-all" 
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input 
                      type="number" 
                      step="0.001" 
                      value={newLevelElev}
                      onChange={(e) => setNewLevelElev(e.target.value)}
                      placeholder="Cota en m (ej: 3.70)" 
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-marca-500 focus:ring-0 transition-all" 
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={newLevelReqStructure}
                        onChange={(e) => setNewLevelReqStructure(e.target.checked)}
                        className="rounded border-slate-300 text-marca-600 focus:ring-0" 
                      />
                      <span>Es Estructura</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={newLevelReqBuilding}
                        onChange={(e) => setNewLevelReqBuilding(e.target.checked)}
                        className="rounded border-slate-300 text-alerta-600 focus:ring-0" 
                      />
                      <span>Nivel Edificio</span>
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <button 
                      onClick={() => {
                        const name = newLevelName.trim();
                        const elev = parseFloat(newLevelElev) || 0;
                        if (name) {
                          updateDisciplineConfig(prev => ({
                            ...prev,
                            expectedLevels: [
                              ...prev.expectedLevels,
                              {
                                nombre: name,
                                elevacion_m: elev,
                                requiereEstructura: newLevelReqStructure,
                                requiereNivelEdificio: newLevelReqBuilding
                              }
                            ]
                          }));
                          setNewLevelName('');
                          setNewLevelElev('');
                        }
                      }}
                      className="w-full py-2 bg-marca-600 hover:bg-marca-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-marca-200 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={16} />
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botones de acción masiva sobre los niveles actuales */}
              {currentDisciplineConfig.expectedLevels.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-nota font-bold text-slate-400">
                    {currentDisciplineConfig.expectedLevels.length} niveles en {getDisciplineLabel(activeDiscipline)}:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => setAllLevelsProperty('requiereEstructura', false)}
                      className="text-dato font-bold text-slate-600 hover:text-marca-600 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-marca-50 transition-colors"
                    >
                      Desmarcar todo Estructura
                    </button>
                    <button 
                      onClick={() => setAllLevelsProperty('requiereEstructura', true)}
                      className="text-dato font-bold text-slate-600 hover:text-marca-600 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-marca-50 transition-colors"
                    >
                      Marcar todo Estructura
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      onClick={() => setAllLevelsProperty('requiereNivelEdificio', true)}
                      className="text-dato font-bold text-alerta-700 hover:text-alerta-800 px-2.5 py-1 rounded-lg bg-alerta-50 hover:bg-alerta-100 transition-colors"
                    >
                      Marcar todo Nivel Edificio
                    </button>
                    <button 
                      onClick={() => setAllLevelsProperty('requiereNivelEdificio', false)}
                      className="text-dato font-bold text-slate-600 hover:text-alerta-700 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-alerta-50 transition-colors"
                    >
                      Desmarcar todo Nivel Edificio
                    </button>
                  </div>
                </div>
              )}

              {/* Listado de niveles de la disciplina activa */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {currentDisciplineConfig.expectedLevels.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500 font-bold">
                      No hay niveles definidos para <span className="text-slate-800">{getDisciplineLabel(activeDiscipline)}</span>.
                    </p>
                    <p className="text-nota text-slate-400 mt-1">
                      Añade niveles arriba, cárgalos con la plantilla estándar, cópialos de Arquitectura o Estructura, o importa un archivo Excel.
                    </p>
                  </div>
                ) : (
                  currentDisciplineConfig.expectedLevels.map((l, i) => (
                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 font-bold w-5">{i + 1}.</span>
                        <span className="text-sm font-black text-slate-800 min-w-[130px]">{l.nombre}</span>
                        <span className="text-xs font-mono font-bold text-marca-600 bg-marca-100/70 px-2.5 py-1 rounded-lg">
                          {l.elevacion_m > 0 ? `+${l.elevacion_m.toFixed(3)}` : l.elevacion_m.toFixed(3)} m
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Selector interactivo: Es Estructura */}
                        <button 
                          type="button"
                          onClick={() => toggleLevelProperty(i, 'requiereEstructura')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            l.requiereEstructura 
                              ? 'bg-marca-600 text-white border-marca-600 shadow-xs shadow-marca-200' 
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                          }`}
                          title="Haz clic para exigir o no que este nivel tenga marcado 'Es Estructura' en Revit"
                        >
                          <Layers size={13} />
                          <span>Es Estructura</span>
                          {l.requiereEstructura && <Check size={13} strokeWidth={3} className="ml-0.5" />}
                        </button>

                        {/* Selector interactivo: Es Nivel de Edificio */}
                        <button 
                          type="button"
                          onClick={() => toggleLevelProperty(i, 'requiereNivelEdificio')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            l.requiereNivelEdificio 
                              ? 'bg-alerta-600 text-white border-alerta-600 shadow-xs shadow-alerta-200' 
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                          }`}
                          title="Haz clic para exigir o no que este nivel tenga marcado 'Es Nivel de Edificio' en Revit"
                        >
                          <Building2 size={13} />
                          <span>Nivel de Edificio</span>
                          {l.requiereNivelEdificio && <Check size={13} strokeWidth={3} className="ml-0.5" />}
                        </button>

                        <button 
                          onClick={() => updateDisciplineConfig(prev => ({
                            ...prev,
                            expectedLevels: prev.expectedLevels.filter((_, idx) => idx !== i)
                          }))}
                          className="text-slate-300 hover:text-fallo-500 p-1.5 rounded-lg hover:bg-white transition-all ml-1"
                          title="Eliminar nivel"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal explicativo de Estructura Excel */}
      <AnimatePresence>
        {showExcelHelp && (
          <ExcelHelpModal
            type={showExcelHelp}
            activeDiscipline={activeDiscipline}
            onClose={() => setShowExcelHelp(null)}
            onDownloadTemplate={downloadExcelTemplate}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, sublabel, count }: any) => (
  <button 
    onClick={onClick}
    className={`w-full text-left flex items-center justify-between p-3 rounded-2xl font-bold transition-all ${
      active 
        ? 'bg-marca-600 text-white shadow-md shadow-marca-200' 
        : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
        <Icon size={18} />
      </div>
      <div>
        <span className="text-xs font-black block leading-tight">{label}</span>
        {sublabel && (
          <span className={`text-dato block leading-tight font-normal ${active ? 'text-marca-100' : 'text-slate-400'}`}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`text-dato font-black px-2 py-0.5 rounded-full ${
        active ? 'bg-white text-marca-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
);

const CoordInput = ({ label, value, onChange }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-dato font-black text-slate-500 uppercase tracking-tight">{label}</label>
    <input 
      type="number" 
      step="0.001" 
      value={value || 0} 
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
      className="bg-white border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 focus:border-marca-500 focus:ring-0 transition-all" 
    />
  </div>
);

// === MODAL DE AYUDA Y PLANTILLAS DE EXCEL ===
interface ExcelHelpModalProps {
  type: 'coordinates' | 'worksets' | 'levels';
  activeDiscipline: ModelDiscipline;
  onClose: () => void;
  onDownloadTemplate: (type: 'coordinates' | 'worksets' | 'levels') => void;
}

const ExcelHelpModal: React.FC<ExcelHelpModalProps> = ({
  type: initialType,
  activeDiscipline,
  onClose,
  onDownloadTemplate
}) => {
  const [currentHelpTab, setCurrentHelpTab] = useState<'coordinates' | 'worksets' | 'levels'>(initialType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-ok-100 text-ok-700 rounded-2xl">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Estructura de los Archivos Excel a Importar
              </h3>
              <p className="text-xs italic text-slate-400 mt-0.5">
                Formato de columnas y hojas requerido para cada tipo de datos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selector de pestañas dentro del modal */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setCurrentHelpTab('coordinates')}
            className={`pb-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              currentHelpTab === 'coordinates'
                ? 'border-marca-600 text-marca-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin size={14} />
            <span>Coordenadas Maestras</span>
          </button>
          <button
            onClick={() => setCurrentHelpTab('worksets')}
            className={`pb-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              currentHelpTab === 'worksets'
                ? 'border-marca-600 text-marca-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={14} />
            <span>Subproyectos ({getDisciplineLabel(activeDiscipline)})</span>
          </button>
          <button
            onClick={() => setCurrentHelpTab('levels')}
            className={`pb-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              currentHelpTab === 'levels'
                ? 'border-marca-600 text-marca-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={14} />
            <span>Niveles ({getDisciplineLabel(activeDiscipline)})</span>
          </button>
        </div>

        {/* Contenido descriptivo según pestaña */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {currentHelpTab === 'coordinates' && (
            <div className="space-y-4">
              <div className="bg-marca-50/60 border border-marca-100 rounded-2xl p-4 text-xs text-marca-900 leading-relaxed">
                <strong>¿Cómo funciona?</strong> El importador lee las coordenadas maestras (comunes para todos los modelos del proyecto). Admite archivos con <strong>dos hojas</strong> (una para el Punto Base y otra para el Punto de Reconocimiento) o una sola hoja con las etiquetas en la columna A.
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Formato Estándar (2 Hojas en el mismo libro):
                </h4>
                
                {/* Ejemplo Hoja 1 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                  <div className="bg-slate-100 px-3 py-1.5 text-nota font-bold text-slate-600 border-b border-slate-200">
                    Hoja 1: <span className="text-marca-700 font-mono">Punto base del proyecto</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-1/2">Columna A (Parámetro)</th>
                        <th className="px-3 py-2 w-1/2">Columna B (Valor)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-nota">
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Norte / Sur (m)</td>
                        <td className="px-3 py-1.5 text-marca-700 font-bold">4065795.696</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Este / Oeste (m)</td>
                        <td className="px-3 py-1.5 text-marca-700 font-bold">372200.405</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Elevación (m)</td>
                        <td className="px-3 py-1.5 text-marca-700 font-bold">20.630</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Ángulo con respecto al Norte Real (°)</td>
                        <td className="px-3 py-1.5 text-marca-700 font-bold">25.384</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Ejemplo Hoja 2 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 text-nota font-bold text-slate-600 border-b border-slate-200">
                    Hoja 2: <span className="text-alerta-700 font-mono">Punto de reconocimiento</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-1/2">Columna A (Parámetro)</th>
                        <th className="px-3 py-2 w-1/2">Columna B (Valor)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-nota">
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Norte / Sur (m)</td>
                        <td className="px-3 py-1.5 text-alerta-700 font-bold">4065795.696</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Este / Oeste (m)</td>
                        <td className="px-3 py-1.5 text-alerta-700 font-bold">372200.405</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-sans text-slate-700">Elevación (m)</td>
                        <td className="px-3 py-1.5 text-alerta-700 font-bold">20.630</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentHelpTab === 'worksets' && (
            <div className="space-y-4">
              <div className="bg-ok-50/60 border border-ok-100 rounded-2xl p-4 text-xs text-ok-900 leading-relaxed">
                <strong>¿Cómo funciona?</strong> La importación de subproyectos (Worksets) se aplica a la <strong>disciplina seleccionada</strong> ({getDisciplineLabel(activeDiscipline)}). El Excel requiere una única columna con los nombres de los subproyectos esperados.
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Estructura de la Hoja de Subproyectos:
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-ok-600 text-white font-bold">
                      <tr>
                        <th className="px-3 py-2">Columna A: Subproyecto</th>
                        <th className="px-3 py-2 text-ok-100 text-nota font-normal">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-nota">
                      <tr className="bg-white">
                        <td className="px-3 py-2 font-bold text-slate-800">01_EST_CIMENTACION</td>
                        <td className="px-3 py-2 text-slate-400 font-sans text-nota">Nombre exacto del subproyecto</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-3 py-2 font-bold text-slate-800">02_EST_ESTRUCTURA</td>
                        <td className="px-3 py-2 text-slate-400 font-sans text-nota">Sin distinguir mayúsculas/minúsculas</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-3 py-2 font-bold text-slate-800">03_EST_FORJADOS</td>
                        <td className="px-3 py-2 text-slate-400 font-sans text-nota">Se valida presencia en el modelo auditado</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-3 py-2 font-bold text-slate-800">04_EST_VINCULOS</td>
                        <td className="px-3 py-2 text-slate-400 font-sans text-nota">Subproyecto para enlaces Revit/IFC</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-nota text-slate-500 mt-2">
                  * La primera fila corresponde al encabezado (<code className="text-slate-700 font-mono">Subproyecto</code>) y se omite automáticamente al importar.
                </p>
              </div>
            </div>
          )}

          {currentHelpTab === 'levels' && (
            <div className="space-y-4">
              <div className="bg-marca-50/60 border border-marca-100 rounded-2xl p-4 text-xs text-marca-900 leading-relaxed">
                <strong>¿Cómo funciona?</strong> La importación de niveles se asigna a la <strong>disciplina seleccionada</strong> ({getDisciplineLabel(activeDiscipline)}). Permite verificar la existencia del nivel, su cota exacta en metros y si debe tener marcadas las casillas de Estructura o Nivel de Edificio.
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Estructura de la Hoja de Niveles (4 Columnas):
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-marca-600 text-white font-bold text-nota">
                      <tr>
                        <th className="px-2.5 py-2">Col A: Nombre</th>
                        <th className="px-2.5 py-2">Col B: Elevación (m)</th>
                        <th className="px-2.5 py-2">Col C: Es Estructura</th>
                        <th className="px-2.5 py-2">Col D: Nivel Edificio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-nota">
                      <tr className="bg-white">
                        <td className="px-2.5 py-2 font-bold text-slate-800">S-3_EST</td>
                        <td className="px-2.5 py-2 text-marca-700">-7.10</td>
                        <td className="px-2.5 py-2 text-ok-700 font-bold">SI</td>
                        <td className="px-2.5 py-2 text-ok-700 font-bold">SI</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-2.5 py-2 font-bold text-slate-800">N+0 EST</td>
                        <td className="px-2.5 py-2 text-marca-700">3.70</td>
                        <td className="px-2.5 py-2 text-ok-700 font-bold">SI</td>
                        <td className="px-2.5 py-2 text-ok-700 font-bold">SI</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-2.5 py-2 font-bold text-slate-800">N+1</td>
                        <td className="px-2.5 py-2 text-marca-700">7.20</td>
                        <td className="px-2.5 py-2 text-ok-700 font-bold">SI</td>
                        <td className="px-2.5 py-2 text-ok-700 font-bold">SI</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-2.5 py-2 font-bold text-slate-800">N+3 CUBIERTA</td>
                        <td className="px-2.5 py-2 text-marca-700">13.70</td>
                        <td className="px-2.5 py-2 text-slate-400">NO</td>
                        <td className="px-2.5 py-2 text-slate-400">NO</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-nota text-slate-500 mt-2">
                  * Admite tanto punto (<code className="font-mono">3.70</code>) como coma (<code className="font-mono">3,70</code>) para decimales. Las columnas C y D son opcionales (escribe <code className="font-mono">SI</code> o déjalo vacío).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal con botón de descarga de plantilla */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => onDownloadTemplate(currentHelpTab)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ok-600 hover:bg-ok-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-ok-200 transition-all cursor-pointer"
          >
            <Download size={15} />
            <span>Descargar Plantilla Excel de Ejemplo (.xlsx)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
          >
            Entendido, cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
