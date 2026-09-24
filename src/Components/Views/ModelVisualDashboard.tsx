import React, { useMemo } from 'react';
import { X, Download, FileText, Layers3 } from 'lucide-react';
import { ProjectFile } from '../../types';
import { get3DCategories, getConfigPhaseData, getAnnotationPhaseData } from '../../utils/modelUtils';
import { exportToHTML, exportToPDF } from '../../utils/exportUtils';

interface ModelVisualDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  file?: ProjectFile;
  auditResults?: Record<string, { status: 'BUENO' | 'ALERTA' | 'FALLO' }>;
}

interface SummaryCardItem {
  label: string;
  value: string | number;
  section: 'Configuración' | 'Anotación' | 'Elementos 3D';
}

const CHART_COLORS = [
  '#8ec5f7', '#58c27d', '#f1d44f', '#f97352', '#a96ee5', '#27c1b8', '#f59c3d', '#38a5f6', '#ec4899', '#22d3ee', '#84cc16', '#f97316'
];

const normalize = (value: any) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatInt = (value: number) =>
  Number(value || 0).toLocaleString('es-ES');

const formatMetric = (value: number, unit = '') => {
  const formatted = Number(value || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return unit ? `${formatted} ${unit}` : formatted;
};

const parseNumber = (value: any): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getProjectParamValue = (configData: any, patterns: string[]): string => {
  const params = configData?.codechecking?.informacion_general?.parametros_informacion_proyecto || [];
  const found = params.find((param: any) => {
    const name = normalize(param?.nombre);
    return patterns.some(pattern => name.includes(pattern));
  });
  return found?.valor ? String(found.valor) : '—';
};


const cleanModelNameWithoutLocalSuffix = (value: string): string => {
  let clean = String(value || '').trim();
  clean = clean.replace(/\.[a-zA-Z0-9]+$/i, '');
  clean = clean.replace(/_(CONFIGURACION|CONFIG|DOCUMENTACION|ANOTACION|ELEMENTOS?3D|3D)[^_]*$/i, '');
  clean = clean.replace(/[-_ ]LOCAL$/i, '');

  // En los modelos de esta aplicación la nomenclatura BIM utiliza guiones.
  // Si tras el código aparece un sufijo local separado por "_", se elimina.
  if (clean.includes('_') && (clean.match(/-/g) || []).length >= 5) {
    clean = clean.split('_')[0];
  }

  return clean || '—';
};

const getModelJsonName = (file?: ProjectFile): string => {
  if (!file) return '—';
  return (
    getConfigPhaseData(file)?.modelo?.nombre_archivo ||
    getAnnotationPhaseData(file)?.modelo?.nombre_archivo ||
    file.model3DData?.modelo?.nombre_archivo ||
    file.name ||
    '—'
  );
};

const getModelSummaryCards = (file?: ProjectFile): SummaryCardItem[] => {
  if (!file) return [];

  const configData = getConfigPhaseData(file);
  const annotationData = getAnnotationPhaseData(file);
  const model3DData = file.model3DData;

  const cards: SummaryCardItem[] = [];

  if (file.hasConfigData && configData) {
    const cc = configData.codechecking || {};
    cards.push(
      { label: 'Tamaño', value: `${Math.round(cc?.informacion_general?.tamano_archivo_mb || 0)} MB`, section: 'Configuración' },
      { label: 'Subproyectos', value: cc?.subproyectos?.cantidad_worksets ?? cc?.subproyectos?.existentes?.length ?? 0, section: 'Configuración' },
      { label: 'Warnings', value: cc?.warnings?.total_incidencias ?? 0, section: 'Configuración' },
      { label: 'Filtros', value: cc?.filtros_vista?.total_filtros ?? cc?.filtros_vista?.nombres_filtros?.length ?? 0, section: 'Configuración' },
      { label: 'Opciones', value: cc?.opciones_diseno?.cantidad ?? 0, section: 'Configuración' },
      { label: 'Fases', value: cc?.fases?.cantidad ?? cc?.fases?.listado?.length ?? 0, section: 'Configuración' },
      { label: 'Niveles', value: cc?.niveles?.cantidad ?? cc?.niveles?.listado?.length ?? 0, section: 'Configuración' },
      { label: 'Rejillas', value: cc?.rejillas?.cantidad ?? cc?.rejillas?.listado?.length ?? 0, section: 'Configuración' }
    );
  }

  if (file.hasAnotacionData && annotationData) {
    const cc = annotationData.codechecking || {};
    cards.push(
      { label: 'Vistas', value: cc?.vistas?.cantidad ?? 0, section: 'Anotación' },
      { label: 'Plantillas', value: cc?.plantillas_vista?.cantidad ?? 0, section: 'Anotación' },
      { label: 'Planos', value: cc?.planos?.cantidad ?? 0, section: 'Anotación' },
      { label: 'Tablas', value: cc?.tablas?.cantidad ?? 0, section: 'Anotación' },
      { label: 'Habitaciones', value: cc?.habitaciones?.cantidad ?? 0, section: 'Anotación' },
      { label: 'CAD', value: cc?.vinculos_cad?.cantidad ?? 0, section: 'Anotación' },
      { label: 'Grupos anot.', value: cc?.grupos_anotacion?.cantidad ?? 0, section: 'Anotación' },
      { label: 'Parámetros', value: cc?.parametros_proyecto_y_compartidos?.cantidad ?? cc?.parametros_proyecto?.cantidad ?? 0, section: 'Anotación' }
    );
  }

  if (file.has3DData && model3DData) {
    const rvtLinks = model3DData?.['EXPORTACIONES ELEMENTOS 3D']?.['Vinculos RVT']?.cantidad ?? 0;
    cards.push(
      { label: 'Elem. 3D', value: get3DCategories(model3DData).reduce((acc, item) => acc + item.cantidad, 0), section: 'Elementos 3D' },
      { label: 'Categorías 3D', value: get3DCategories(model3DData).length, section: 'Elementos 3D' },
      { label: 'Vínculos RVT', value: rvtLinks, section: 'Elementos 3D' }
    );
  }

  return cards;
};

const getCategoryBreakdown = (file?: ProjectFile) => {
  const categories = get3DCategories(file?.model3DData);
  const total = categories.reduce((sum, item) => sum + item.cantidad, 0);

  return categories
    .map((category, index) => ({
      name: category.name,
      value: category.cantidad,
      percent: total > 0 ? (category.cantidad / total) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
};

const getLevelBreakdown = (file?: ProjectFile) => {
  const source = file?.model3DData?.['EXPORTACIONES ELEMENTOS 3D'];
  const levelCountMap = new Map<string, number>();

  Object.values(source || {}).forEach((category: any) => {
    Object.entries(category?.familias || {}).forEach(([, family]: any) => {
      Object.entries(family?.tipos || {}).forEach(([, type]: any) => {
        const elements = Array.isArray(type?.elementos) ? type.elementos : [];
        elements.forEach((element: any) => {
          const level = element?.nivel || element?.nivel_base || element?.nivel_referencia || element?.nivel_superior || 'Sin nivel';
          levelCountMap.set(level, (levelCountMap.get(level) || 0) + 1);
        });
      });
    });
  });

  return Array.from(levelCountMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 16);
};

const getMaterialBreakdown = (file?: ProjectFile) => {
  const source = file?.model3DData?.['EXPORTACIONES ELEMENTOS 3D'];
  const materialMap = new Map<string, number>();

  Object.values(source || {}).forEach((category: any) => {
    Object.entries(category?.familias || {}).forEach(([, family]: any) => {
      Object.entries(family?.tipos || {}).forEach(([, type]: any) => {
        const elements = Array.isArray(type?.elementos) ? type.elementos : [];
        elements.forEach((element: any) => {
          const namesFromObjects = Array.isArray(element?.materiales)
            ? element.materiales.map((item: any) => item?.nombre).filter(Boolean)
            : [];
          const namesFromStrings = Array.isArray(element?.materiales_nombres)
            ? element.materiales_nombres.filter(Boolean)
            : [];
          const names = Array.from(new Set([...namesFromObjects, ...namesFromStrings]));
          names.forEach((name: string) => {
            materialMap.set(name, (materialMap.get(name) || 0) + 1);
          });
        });
      });
    });
  });

  return Array.from(materialMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 14);
};

const getRoomAreas = (file?: ProjectFile) => {
  const annotationData = getAnnotationPhaseData(file as ProjectFile);
  const rooms = annotationData?.codechecking?.habitaciones?.listado || [];
  const map = new Map<string, number>();
  let total = 0;

  rooms.forEach((room: any) => {
    const name = String(room?.nombre || 'Sin nombre');
    const area = parseNumber(room?.area_m2 ?? room?.area ?? room?.superficie ?? 0);
    total += area;
    map.set(name, (map.get(name) || 0) + area);
  });

  const items = Array.from(map.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  return {
    total,
    count: rooms.length,
    items,
  };
};

const getVolumeAndAreaTotals = (file?: ProjectFile) => {
  const source = file?.model3DData?.['EXPORTACIONES ELEMENTOS 3D'];
  let volume = 0;
  let area = 0;

  Object.values(source || {}).forEach((category: any) => {
    Object.entries(category?.familias || {}).forEach(([, family]: any) => {
      Object.entries(family?.tipos || {}).forEach(([, type]: any) => {
        const elements = Array.isArray(type?.elementos) ? type.elementos : [];
        elements.forEach((element: any) => {
          volume += parseNumber(element?.volumen);
          area += parseNumber(element?.area);
        });
      });
    });
  });

  return { volume, area };
};

const DonutChart: React.FC<{ data: { name: string; value: number; color: string; percent?: number }[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  if (!total) {
    return <div className="min-h-[320px] flex items-center justify-center text-[#6f89ad] text-sm">Sin datos</div>;
  }

  return (
    <div className="min-h-[330px] grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-5">
      <div className="h-full flex items-center justify-center">
        <div className="relative w-[270px] h-[270px] max-w-full shrink-0">
          <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
            <circle cx="120" cy="120" r={radius} fill="transparent" stroke="#203246" strokeWidth="34" />
            {data.map((item) => {
              const dash = (item.value / total) * circumference;
              const gap = circumference - dash;
              const offset = -accumulated;
              accumulated += dash;
              return (
                <circle
                  key={item.name}
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="34"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[48px] font-black tracking-tight text-[#9cc9f4]">{formatInt(total)}</div>
            <div className="text-[13px] uppercase tracking-[0.22em] text-[#6f89ad]">elementos</div>
          </div>
        </div>
      </div>

      <div className="h-full flex flex-col justify-center space-y-3 pr-2">
        {data.slice(0, 12).map((item) => (
          <div key={item.name} className="grid grid-cols-[14px_minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
            <span className="w-3.5 h-3.5 rounded-[4px]" style={{ backgroundColor: item.color }} />
            <span className="text-zinc-700 uppercase tracking-wide text-[12px] break-words">{item.name}</span>
            <span className="text-zinc-900 font-bold font-mono">{formatInt(item.value)}</span>
            <span className="text-zinc-500 font-mono text-[12px] w-12 text-right">{(item.percent || 0).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarsChart: React.FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => {
  const max = Math.max(...data.map(item => item.value), 0);

  if (!data.length) {
    return <div className="h-[260px] flex items-center justify-center text-[#6f89ad] text-sm">Sin datos por nivel</div>;
  }

  return (
    <div className="space-y-3 pt-3">
      {data.map((item) => (
        <div key={item.name} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
          <span className="text-[12px] text-zinc-600 uppercase tracking-wide truncate">{item.name}</span>
          <div className="w-full h-5 rounded-full bg-white overflow-hidden border border-zinc-200">
            <div className="h-full rounded-full" style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%`, backgroundColor: item.color }} />
          </div>
          <span className="text-[12px] font-bold font-mono text-zinc-900">{formatInt(item.value)}</span>
        </div>
      ))}
    </div>
  );
};

const TileChart: React.FC<{ items: { name: string; value: number; color: string }[]; emptyText: string; unit?: string }> = ({ items, emptyText, unit = '' }) => {
  const max = Math.max(...items.map(item => item.value), 0);

  if (!items.length) {
    return <div className="h-[240px] flex items-center justify-center text-[#6f89ad] text-sm">{emptyText}</div>;
  }

  return (
    <div className="grid grid-cols-12 auto-rows-[72px] gap-2.5 pt-3">
      {items.map((item, index) => {
        const weight = max > 0 ? item.value / max : 0;
        const colSpan = Math.min(6, Math.max(2, Math.round(weight * 6) + 1));
        const rowSpan = weight > 0.66 ? 2 : 1;
        return (
          <div
            key={item.name + index}
            className="rounded-2xl border border-zinc-200 bg-white p-3 flex flex-col justify-between overflow-hidden"
            style={{
              gridColumn: `span ${colSpan} / span ${colSpan}`,
              gridRow: `span ${rowSpan} / span ${rowSpan}`,
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-600 line-clamp-2">{item.name}</div>
            <div className="text-zinc-900 font-black font-mono text-lg leading-tight">{formatMetric(item.value, unit)}</div>
          </div>
        );
      })}
    </div>
  );
};


interface TreemapRect {
  name: string;
  value: number;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  percent: number;
}

const buildTreemapRects = (
  items: { name: string; value: number; color: string }[],
  x = 0,
  y = 0,
  w = 100,
  h = 100
): TreemapRect[] => {
  const positive = items.filter(item => item.value > 0);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (!positive.length || total <= 0) return [];

  const recurse = (
    slice: typeof positive,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): TreemapRect[] => {
    const sliceTotal = slice.reduce((sum, item) => sum + item.value, 0);
    if (slice.length === 1) {
      const item = slice[0];
      return [{ ...item, x: sx, y: sy, w: sw, h: sh, percent: (item.value / total) * 100 }];
    }

    let running = 0;
    let splitIndex = 1;
    const half = sliceTotal / 2;
    for (let i = 0; i < slice.length - 1; i += 1) {
      running += slice[i].value;
      splitIndex = i + 1;
      if (running >= half) break;
    }

    const first = slice.slice(0, splitIndex);
    const second = slice.slice(splitIndex);
    const firstTotal = first.reduce((sum, item) => sum + item.value, 0);
    const ratio = firstTotal / sliceTotal;

    if (sw >= sh) {
      const firstW = sw * ratio;
      return [
        ...recurse(first, sx, sy, firstW, sh),
        ...recurse(second, sx + firstW, sy, sw - firstW, sh),
      ];
    }

    const firstH = sh * ratio;
    return [
      ...recurse(first, sx, sy, sw, firstH),
      ...recurse(second, sx, sy + firstH, sw, sh - firstH),
    ];
  };

  return recurse(positive, x, y, w, h);
};

const MaterialsTreemap: React.FC<{ items: { name: string; value: number; color: string }[] }> = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const rects = buildTreemapRects(items);

  if (!rects.length) {
    return <div className="h-[320px] flex items-center justify-center text-[#6f89ad] text-sm">Sin datos de materiales</div>;
  }

  return (
    <div className="pt-4 flex flex-col flex-1 min-h-0">
      <div className="relative w-full min-h-[360px] flex-1 rounded-2xl overflow-hidden border border-zinc-200 bg-white">
        {rects.map((rect, index) => {
          const small = rect.w < 17 || rect.h < 17;
          const verySmall = rect.w < 10 || rect.h < 10;
          return (
            <div
              key={`${rect.name}-${index}`}
              className="absolute border border-zinc-200 p-2 overflow-hidden flex flex-col justify-between"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
                backgroundColor: rect.color,
              }}
              title={`${rect.name}: ${rect.value} usos (${rect.percent.toFixed(1)}%)`}
            >
              {!verySmall && (
                <div className={`font-black uppercase leading-tight text-[#08111c] ${small ? 'text-[8px]' : 'text-[11px]'}`}>
                  {rect.name}
                </div>
              )}
              {!small && (
                <div className="font-mono font-black text-[#08111c] text-sm">
                  {rect.percent.toFixed(1)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-[#6f89ad]">
        Proporción calculada sobre {formatInt(total)} asignaciones de material detectadas en los elementos 3D.
      </div>
    </div>
  );
};

  const CoordinatesSummary: React.FC<{ configData: any }> = ({ configData }) => {
  const coords = configData?.codechecking?.coordenadas;
  const survey = coords?.punto_reconocimiento;
  const base = coords?.punto_base_proyecto;

  const ValueRow = ({ label, value, unit = 'm' }: { label: string; value: any; unit?: string }) => (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-zinc-100 last:border-0">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className="text-[12px] font-bold font-mono text-zinc-900">
        {Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: unit === '°' ? 2 : 3, maximumFractionDigits: unit === '°' ? 2 : 3 })} {unit}
      </span>
    </div>
  );

  return (
    <div className="h-full min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col">
      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-black">Coordenadas</div>
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-black pb-1.5 border-b border-zinc-100">Punto reconocimiento</div>
          <ValueRow label="Norte / Sur" value={survey?.norte_sur_m} />
          <ValueRow label="Este / Oeste" value={survey?.este_oeste_m} />
          <ValueRow label="Elevación" value={survey?.elevacion_m} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-black pb-1.5 border-b border-zinc-100">Punto base proyecto</div>
          <ValueRow label="Norte / Sur" value={base?.norte_sur_m} />
          <ValueRow label="Este / Oeste" value={base?.este_oeste_m} />
          <ValueRow label="Elevación" value={base?.elevacion_m} />
          <ValueRow label="Ángulo norte" value={base?.angulo_norte_grados} unit="°" />
        </div>
      </div>
    </div>
  );
};

const SUMMARY_AUDIT_KEYS: Record<string, string> = {
  'Tamaño': 'tamano', Subproyectos: 'subproyectos', Warnings: 'warnings',
  Filtros: 'filtros', Opciones: 'opcionesDiseno', Fases: 'fases', Niveles: 'niveles',
  Rejillas: 'rejillas', Vistas: 'vistas', Plantillas: 'plantillas_vista',
  Planos: 'planos', Tablas: 'tablas', Habitaciones: 'habitaciones', CAD: 'vinculos_cad',
  'Grupos anot.': 'grupos_anotacion', 'Parámetros': 'parametros',
};

const SummaryCard: React.FC<{ label: string; value: string | number; section: string; status?: 'BUENO' | 'ALERTA' | 'FALLO' }> = ({ label, value, status }) => (
  <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 min-h-[72px] flex flex-col justify-between">
    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</div>
    <div title={status === 'BUENO' ? 'Correcto' : status === 'FALLO' ? 'Fallo' : status === 'ALERTA' ? 'Alerta' : 'Sin evaluación de auditoría'}
      className={`text-3xl font-black text-center font-mono mt-1.5 leading-none ${status === 'BUENO' ? 'text-green-600' : status === 'FALLO' ? 'text-red-600' : status === 'ALERTA' ? 'text-orange-600' : 'text-zinc-900'}`}>{value}</div>
  </div>
);

export const ModelVisualDashboard: React.FC<ModelVisualDashboardProps> = ({ isOpen, onClose, projectName, file, auditResults }) => {
  const configData = useMemo(() => (file ? getConfigPhaseData(file) : undefined), [file]);
  const cards = useMemo(() => getModelSummaryCards(file), [file]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(file), [file]);
  const levelBreakdown = useMemo(() => getLevelBreakdown(file), [file]);
  const materials = useMemo(() => getMaterialBreakdown(file), [file]);
  const rooms = useMemo(() => getRoomAreas(file), [file]);
  const totals = useMemo(() => getVolumeAndAreaTotals(file), [file]);

  const projectEstado = useMemo(() => getProjectParamValue(configData, ['status', 'estado', 'estado del proyecto', 'estado proyecto']), [configData]);
  const projectCliente = useMemo(() => getProjectParamValue(configData, ['client', 'cliente', 'nombre del cliente', 'nombre cliente']), [configData]);
  const projectEdificio = useMemo(() => getProjectParamValue(configData, ['building name', 'nombre del edificio', 'nombre edificio', 'edificio']), [configData]);
  const projectNumero = useMemo(() => getProjectParamValue(configData, ['project number', 'numero de proyecto', 'numero proyecto', 'proyecto numero', 'numero']), [configData]);
  const projectNombre = useMemo(() => getProjectParamValue(configData, ['project name', 'nombre de proyecto', 'nombre del proyecto', 'nombre proyecto', 'projectname']), [configData]);
  
  const modelRevitVersion = useMemo(() => configData?.modelo?.revit_version || '—', [configData]);
  const modelAuthor = useMemo(() => {
    return getProjectParamValue(configData, ['author', 'autor', 'model author', 'autor del modelo']);
  }, [configData]);

  const modelName = file?.customName || file?.name || 'Modelo';
  const modelJsonName = useMemo(() => getModelJsonName(file), [file]);
  const modelCleanName = useMemo(() => cleanModelNameWithoutLocalSuffix(modelJsonName), [modelJsonName]);
  const levelsCount = configData?.codechecking?.niveles?.cantidad ?? configData?.codechecking?.niveles?.listado?.length ?? levelBreakdown.length;
  const reportId = `visual-model-report-${file?.id || 'current'}`;

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-zinc-100/90 backdrop-blur-sm p-4 md:p-6" onClick={onClose}>
      <div className="w-full h-full rounded-[28px] overflow-hidden border border-zinc-200 bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center">
              <Layers3 size={18} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-black">Reporte del modelo</div>
              <div className="text-xl font-black text-zinc-900">Resumen del modelo</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToPDF(reportId, `dashboard_visual_${modelName}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-black uppercase tracking-wider"
            >
              <Download size={14} />
              <span>PDF</span>
            </button>
            <button
              onClick={() => exportToHTML(reportId, `dashboard_visual_${modelName}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-black uppercase tracking-wider"
            >
              <FileText size={14} />
              <span>HTML</span>
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 flex items-center justify-center">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <div id={reportId} className="p-6 md:p-8 space-y-4 bg-zinc-50 min-h-full">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-3 rounded-2xl border border-zinc-200 bg-white p-5 min-h-[150px]">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Proyecto</div>
                <div className="mt-5 text-3xl font-black text-zinc-900 leading-tight break-words">{projectName}</div>
                <div className="mt-4 space-y-1">
                    <div className="text-[12px] text-zinc-600"><span className="font-bold text-zinc-900">Estado:</span> {projectEstado}</div>
                    <div className="text-[12px] text-zinc-600"><span className="font-bold text-zinc-900">Cliente:</span> {projectCliente}</div>
                    <div className="text-[12px] text-zinc-600"><span className="font-bold text-zinc-900">Edificio:</span> {projectEdificio}</div>
                    <div className="text-[12px] text-zinc-600"><span className="font-bold text-zinc-900">Núm. Proy:</span> {projectNumero}</div>
                    <div className="text-[12px] text-zinc-600 break-words"><span className="font-bold text-zinc-900">Nombre Proy. (JSON):</span> {projectNombre}</div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-6 rounded-2xl border border-zinc-200 bg-white p-5 min-h-[150px]">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Información del modelo</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="text-zinc-500">Nombre: <span className="text-zinc-900 font-bold break-all">{modelJsonName}</span></div>
                  <div className="text-zinc-500">Nombre sin sufijo local: <span className="text-zinc-900 font-bold break-all">{modelCleanName}</span></div>
                  <div className="text-zinc-500">Disciplina: <span className="text-zinc-900 font-bold">{file.modelType || '—'}</span></div>
                  <div className="text-zinc-500">Versión del modelo: <span className="text-zinc-900 font-bold">{modelRevitVersion}</span></div>
                  <div className="text-zinc-500">Autor: <span className="text-zinc-900 font-bold">{modelAuthor}</span></div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-3 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Tamaño</div>
                  <div className="mt-4 text-3xl font-black text-zinc-900 font-mono">{Math.round(configData?.codechecking?.informacion_general?.tamano_archivo_mb || 0)} MB</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Niveles</div>
                  <div className="mt-4 text-3xl font-black text-zinc-900 font-mono">{formatInt(levelsCount || 0)}</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Volumen 3D</div>
                  <div className="mt-4 text-3xl font-black text-zinc-900 font-mono">{totals.volume > 0 ? formatMetric(totals.volume, 'm³') : '—'}</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Área habitaciones</div>
                  <div className="mt-4 text-3xl font-black text-zinc-900 font-mono">{rooms.total > 0 ? formatMetric(rooms.total, 'm²') : '—'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-4 items-stretch">
              <div className="min-w-0">
                <CoordinatesSummary configData={configData} />
              </div>
              <div className="min-w-0 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] auto-rows-fr gap-2.5">
                {cards.map((card) => (
                  <SummaryCard key={`${card.section}-${card.label}`} {...card} status={auditResults?.[SUMMARY_AUDIT_KEYS[card.label]]?.status} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.7fr] gap-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Elementos por categoría</div>
                <DonutChart data={categoryBreakdown} />
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Elementos por nivel</div>
                <BarsChart data={levelBreakdown} />
              </div>
            </div>

            <div className={`grid grid-cols-1 ${rooms.items.length > 0 ? 'xl:grid-cols-2' : ''} gap-4`}>
              <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Mapa de materiales</div>
                <MaterialsTreemap items={materials} />
              </div>

              {rooms.items.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Superficies</div>
                  <div className="rounded-2xl border border-zinc-200 bg-white mt-4 p-5 text-center">
                    <div className="text-4xl font-black text-zinc-900 font-mono">{formatMetric(rooms.total, 'm²')}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mt-1">Superficie total</div>
                    <div className="text-[12px] text-zinc-500 mt-1">{formatInt(rooms.count)} espacios en total</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black mt-5">Superficie por tipo de espacio</div>
                  <TileChart items={rooms.items} emptyText="Sin habitaciones" unit="m²" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
