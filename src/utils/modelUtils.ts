import { ModelDiscipline, ProjectFile, RevitBimData } from '../types';

export const MODEL_DISCIPLINES: { key: ModelDiscipline; label: string; iconName: string; defaultName: string; color: string }[] = [
  { key: 'estructura', label: 'Estructura', iconName: 'Layers', defaultName: 'Modelo de Estructuras', color: 'zinc' },
  { key: 'arquitectura', label: 'Arquitectura', iconName: 'Building2', defaultName: 'Modelo de Arquitectura', color: 'zinc' },
  { key: 'instalaciones', label: 'Instalaciones (MEP)', iconName: 'Wrench', defaultName: 'Modelo de Instalaciones', color: 'zinc' },
  { key: 'urbanizacion', label: 'Urbanización', iconName: 'Trees', defaultName: 'Modelo de Urbanización', color: 'zinc' },
  { key: 'federado', label: 'Federado', iconName: 'Network', defaultName: 'Modelo Federado / Coordinación', color: 'zinc' },
  { key: 'otro', label: 'Otro Modelo', iconName: 'FileBox', defaultName: 'Modelo General', color: 'zinc' }
];

export function detectModelDiscipline(fileName: string, bimData?: RevitBimData): ModelDiscipline {
  const fileStr = (fileName || '').toUpperCase();
  const discData = (bimData?.modelo?.disciplina || '').toUpperCase();
  const modelName = (bimData?.modelo?.nombre_archivo || '').toUpperCase();
  const combined = `${fileStr} ${discData} ${modelName}`;

  // Comprobación por bloque de nomenclatura BIM (Bloque 6: Especialidad, Bloque 5: Tipo archivo)
  const candidateName = bimData?.modelo?.nombre_archivo || fileName || '';
  const cleanCandidate = candidateName.replace(/\.[a-zA-Z0-9]+$/i, '').split('_')[0] || '';
  const parts = cleanCandidate.split('-').map(p => p.trim().toUpperCase());

  if (parts.length >= 6) {
    const disciplineCode = parts[5];
    if (disciplineCode === 'EST') return 'estructura';
    if (disciplineCode === 'ARQ') return 'arquitectura';
    if (disciplineCode === 'INS') return 'instalaciones';
    if (disciplineCode === 'URB') return 'urbanizacion';
    if (disciplineCode === 'ZZZ') return 'federado';
  }
  if (parts.length >= 5 && parts[4] === 'FED') {
    return 'federado';
  }

  if (combined.includes('EST') || combined.includes('STRUC') || combined.includes('CIMENT')) {
    return 'estructura';
  }
  if (combined.includes('ARQ') || combined.includes('ARCH')) {
    return 'arquitectura';
  }
  if (combined.includes('MEP') || combined.includes('INS') || combined.includes('CLIM') || combined.includes('FONT') || combined.includes('ELEC') || combined.includes('PLUMB')) {
    return 'instalaciones';
  }
  if (combined.includes('URB') || combined.includes('TOPO') || combined.includes('SITE')) {
    return 'urbanizacion';
  }
  if (combined.includes('FED') || combined.includes('COORD') || combined.includes('COMPL') || combined.includes('ZZZ')) {
    return 'federado';
  }

  return 'otro';
}

export function getDisciplineLabel(disc?: ModelDiscipline): string {
  const found = MODEL_DISCIPLINES.find(d => d.key === disc);
  return found ? found.label : 'Modelo';
}

export function getDisciplineColorClasses(disc?: ModelDiscipline) {
  switch (disc) {
    case 'estructura':
      return {
        badge: 'bg-disciplina-estructura-50 text-disciplina-estructura-700 border-disciplina-estructura-200',
        activeTab: 'bg-disciplina-estructura-600 text-white border-disciplina-estructura-600 shadow-sm shadow-disciplina-estructura-200',
        inactiveTab: 'bg-white text-slate-600 border-slate-200 hover:border-disciplina-estructura-300 hover:text-disciplina-estructura-700',
        tag: 'bg-disciplina-estructura-100 text-disciplina-estructura-800'
      };
    case 'arquitectura':
      return {
        badge: 'bg-disciplina-arquitectura-50 text-disciplina-arquitectura-700 border-disciplina-arquitectura-200',
        activeTab: 'bg-disciplina-arquitectura-600 text-white border-disciplina-arquitectura-600 shadow-sm shadow-disciplina-arquitectura-200',
        inactiveTab: 'bg-white text-slate-600 border-slate-200 hover:border-disciplina-arquitectura-300 hover:text-disciplina-arquitectura-700',
        tag: 'bg-disciplina-arquitectura-100 text-disciplina-arquitectura-800'
      };
    case 'instalaciones':
      return {
        badge: 'bg-disciplina-instalaciones-50 text-disciplina-instalaciones-700 border-disciplina-instalaciones-200',
        activeTab: 'bg-disciplina-instalaciones-600 text-white border-disciplina-instalaciones-600 shadow-sm shadow-disciplina-instalaciones-200',
        inactiveTab: 'bg-white text-slate-600 border-slate-200 hover:border-disciplina-instalaciones-300 hover:text-disciplina-instalaciones-700',
        tag: 'bg-disciplina-instalaciones-100 text-disciplina-instalaciones-800'
      };
    case 'urbanizacion':
      return {
        badge: 'bg-disciplina-urbanizacion-50 text-disciplina-urbanizacion-700 border-disciplina-urbanizacion-200',
        activeTab: 'bg-disciplina-urbanizacion-600 text-white border-disciplina-urbanizacion-600 shadow-sm shadow-disciplina-urbanizacion-200',
        inactiveTab: 'bg-white text-slate-600 border-slate-200 hover:border-disciplina-urbanizacion-300 hover:text-disciplina-urbanizacion-700',
        tag: 'bg-disciplina-urbanizacion-100 text-disciplina-urbanizacion-800'
      };
    case 'federado':
      return {
        badge: 'bg-disciplina-federado-50 text-disciplina-federado-700 border-disciplina-federado-200',
        activeTab: 'bg-disciplina-federado-600 text-white border-disciplina-federado-600 shadow-sm shadow-disciplina-federado-200',
        inactiveTab: 'bg-white text-slate-600 border-slate-200 hover:border-disciplina-federado-300 hover:text-disciplina-federado-700',
        tag: 'bg-disciplina-federado-100 text-disciplina-federado-800'
      };
    default:
      return {
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
        activeTab: 'bg-slate-700 text-white border-slate-700 shadow-sm shadow-slate-200',
        inactiveTab: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800',
        tag: 'bg-slate-100 text-slate-800'
      };
  }
}

export function isPhase2Data(data: any): boolean {
  if (!data) return false;
  const target = data.codechecking || data.elementos_anotacion || data;
  return Boolean(
    target.vistas || 
    target.plantillas_vista || 
    target.planos || 
    target.tablas || 
    target.habitaciones || 
    target.vinculos_cad || 
    target.parametros_proyecto_y_compartidos || 
    target.parametros_proyecto || 
    target.parametros_compartidos || 
    target.grupos_anotacion
  );
}

export function hasAnnotationData(data: any): boolean {
  return isPhase2Data(data);
}

export function hasGeneralConfigData(data: any): boolean {
  if (!data) return false;
  const target = data.codechecking || data;
  return Boolean(
    target.coordenadas || 
    target.subproyectos || 
    target.niveles || 
    target.rejillas || 
    target.warnings || 
    target.filtros_vista || 
    target.opciones_diseno || 
    target.fases || 
    target.informacion_general
  );
}

export function calculateConfigElementCount(data: RevitBimData): number {
  const cc = data?.codechecking;
  if (!cc) return 0;
  const worksetsCount = cc.subproyectos?.existentes?.reduce(
    (acc: number, w: any) => acc + (w.num_elementos || 0), 0
  ) || 0;
  if (worksetsCount > 0) return worksetsCount;
  let count = 0;
  if (cc.niveles?.cantidad) count += cc.niveles.cantidad;
  if (cc.rejillas?.cantidad) count += cc.rejillas.cantidad;
  if (cc.warnings?.total_incidencias) count += cc.warnings.total_incidencias;
  return count;
}

export function calculatePhase2ElementCount(data: RevitBimData): number {
  const cc = data.codechecking;
  if (!cc) return 0;
  let total = 0;
  if (cc.vistas?.cantidad) total += cc.vistas.cantidad;
  if (cc.plantillas_vista?.cantidad) total += cc.plantillas_vista.cantidad;
  if (cc.planos?.cantidad) total += cc.planos.cantidad;
  if (cc.tablas?.cantidad) total += cc.tablas.cantidad;
  if (cc.habitaciones?.cantidad) total += cc.habitaciones.cantidad;
  if (cc.vinculos_cad?.cantidad) total += cc.vinculos_cad.cantidad;
  if (cc.grupos_anotacion?.cantidad) total += cc.grupos_anotacion.cantidad;
  if (cc.parametros_proyecto_y_compartidos?.cantidad) total += cc.parametros_proyecto_y_compartidos.cantidad;
  return total;
}

export function normalizeBimData(json: any): RevitBimData {
  if (!json || typeof json !== 'object') {
    throw new Error('Formato JSON no válido');
  }

  const codechecking = json.codechecking ? { ...json.codechecking } : (json.elementos_anotacion ? { ...json.elementos_anotacion } : {});

  // Si las claves de fase 2 están en la raíz, moverlas a codechecking
  const phase2Keys = [
    'vistas', 'plantillas_vista', 'planos', 'tablas', 
    'habitaciones', 'vinculos_cad', 'parametros_proyecto_y_compartidos', 
    'parametros_proyecto', 'parametros_compartidos', 'grupos_anotacion'
  ];

  for (const k of phase2Keys) {
    if (json[k] !== undefined && codechecking[k] === undefined) {
      codechecking[k] = json[k];
    }
  }

  // Normalizar parámetros si vienen separados
  if (!codechecking.parametros_proyecto_y_compartidos && (codechecking.parametros_proyecto || codechecking.parametros_compartidos)) {
    const projList = codechecking.parametros_proyecto?.listado || [];
    const compList = codechecking.parametros_compartidos?.listado || [];
    
    const combined = [
      ...projList.map((p: any) => ({ ...p, es_compartido: false, tipo_parametro: 'proyecto' })),
      ...compList.map((p: any) => ({ ...p, es_compartido: true, tipo_parametro: 'compartido' }))
    ];

    codechecking.parametros_proyecto_y_compartidos = {
      cantidad: combined.length,
      cantidad_proyecto: projList.length,
      cantidad_compartidos: compList.length,
      listado: combined
    };
  }

  return {
    fase_auditoria: json.fase_auditoria || (isPhase2Data(json) ? 'ElementosDeAnotacion' : 'ConfiguracionGeneral'),
    fecha_exportacion: json.fecha_exportacion || new Date().toISOString(),
    modelo: json.modelo || {
      nombre_archivo: json.nombre || 'modelo.rvt',
      disciplina: json.disciplina || 'GENERAL',
      revit_version: json.revit_version || '2025'
    },
    codechecking
  };
}


export interface Model3DCategorySummary {
  name: string;
  cantidad: number;
  cantidadFamilias: number;
  familias: Record<string, any>;
}

/** Devuelve únicamente las categorías 3D realmente exportadas.
 *  El exportador mantiene algunas categorías con cantidad 0 y "Vinculos RVT"
 *  como información auxiliar; no forman parte de cantidad_categorias_exportadas.
 */
export function get3DCategories(data: any): Model3DCategorySummary[] {
  const source = data?.['EXPORTACIONES ELEMENTOS 3D'];
  if (!source || typeof source !== 'object') return [];

  return Object.entries(source)
    .filter(([name, value]: [string, any]) => {
      const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalized !== 'vinculos rvt' && Number(value?.cantidad || 0) > 0;
    })
    .map(([name, value]: [string, any]) => ({
      name,
      cantidad: Number(value?.cantidad || 0),
      cantidadFamilias: Number(value?.cantidad_familias ?? Object.keys(value?.familias || {}).length),
      familias: value?.familias || {}
    }));
}

export function calculate3DElementCount(data: any): number {
  return get3DCategories(data).reduce((sum, category) => sum + category.cantidad, 0);
}

export function calculate3DCategoryCount(data: any): number {
  const declared = Number(data?.cantidad_categorias_exportadas);
  return Number.isFinite(declared) && declared >= 0 ? declared : get3DCategories(data).length;
}

const CONFIG_KEYS = [
  'coordenadas', 'posicion_coordenadas', 'subproyectos', 'niveles', 'rejillas', 'warnings',
  'filtros_vista', 'opciones_diseno', 'fases', 'informacion_general'
];

const ANNOTATION_KEYS = [
  'vistas', 'plantillas_vista', 'planos', 'tablas', 'habitaciones', 'vinculos_cad',
  'parametros_proyecto_y_compartidos', 'parametros_proyecto', 'parametros_compartidos',
  'grupos_anotacion'
];

function pickCodechecking(data: RevitBimData | undefined, keys: string[], fase: string): RevitBimData | undefined {
  if (!data) return undefined;
  const source: any = data.codechecking || {};
  const picked: any = {};
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  if (Object.keys(picked).length === 0) return undefined;
  return {
    fase_auditoria: fase,
    fecha_exportacion: data.fecha_exportacion,
    modelo: data.modelo,
    codechecking: picked
  } as RevitBimData;
}

export function getConfigPhaseData(file: ProjectFile): RevitBimData | undefined {
  return file.configData || pickCodechecking(file.data, CONFIG_KEYS, 'ConfiguracionGeneral');
}

export function getAnnotationPhaseData(file: ProjectFile): RevitBimData | undefined {
  return file.anotacionData || pickCodechecking(file.data, ANNOTATION_KEYS, 'ElementosDeAnotacion');
}

export function ensureFileMetadata(file: ProjectFile): ProjectFile {
  const modelType = file.modelType || detectModelDiscipline(file.name, file.data);
  const foundDisc = MODEL_DISCIPLINES.find(d => d.key === modelType);
  const suggestedCustomName = file.customName || 
    (foundDisc ? foundDisc.defaultName : file.name.replace(/\.json$/i, '').replace(/_configuracion.*$/i, '').replace(/_anotacion.*$/i, '').toUpperCase());

  const hasConfig = file.hasConfigData ?? hasGeneralConfigData(file.data);
  const hasAnot = file.hasAnotacionData ?? hasAnnotationData(file.data);
  const has3D = Boolean(file.has3DData || file.model3DData);

  const configData = getConfigPhaseData(file);
  const anotacionData = getAnnotationPhaseData(file);
  const configElements = file.configElementCount ?? (hasConfig ? (calculateConfigElementCount(configData || file.data) || file.elementCount || 0) : 0);
  const anotElements = file.anotacionElementCount ?? (hasAnot ? calculatePhase2ElementCount(anotacionData || file.data) : 0);
  const model3DElements = (file.model3DElementCount && file.model3DElementCount > 0) ? file.model3DElementCount : (has3D ? calculate3DElementCount(file.model3DData) : 0);

  let auditPhase = file.auditPhase;
  if (!auditPhase || auditPhase === 'Configuración General' || auditPhase === 'Elementos de Anotación' || auditPhase === 'Elementos 3D') {
    if (hasConfig && hasAnot) {
      auditPhase = 'Unificado';
    } else if (hasAnot) {
      auditPhase = 'Elementos de Anotación';
    } else if (has3D) {
      auditPhase = 'Elementos 3D';
    } else {
      auditPhase = 'Configuración General';
    }
  }

  return {
    ...file,
    modelType,
    customName: suggestedCustomName,
    auditPhase,
    hasConfigData: hasConfig,
    hasAnotacionData: hasAnot,
    has3DData: has3D,
    configData,
    anotacionData,
    model3DElementCount: model3DElements,
    configFileName: file.configFileName || (hasConfig ? file.name : undefined),
    configCreatedAt: file.configCreatedAt || (hasConfig ? file.createdAt : undefined),
    configElementCount: configElements,
    anotacionFileName: file.anotacionFileName || (hasAnot ? file.name : undefined),
    anotacionCreatedAt: file.anotacionCreatedAt || (hasAnot ? file.createdAt : undefined),
    anotacionElementCount: anotElements,
    elementCount: (hasConfig ? configElements : 0) + (hasAnot ? anotElements : 0) || file.elementCount || 0
  };
}

export function mergeProjectFiles(existing: ProjectFile, incoming: ProjectFile): ProjectFile {
  const modelType = incoming.modelType || existing.modelType || detectModelDiscipline(incoming.name, incoming.data);
  const foundDisc = MODEL_DISCIPLINES.find(d => d.key === modelType);
  const customName = existing.customName || incoming.customName || (foundDisc ? foundDisc.defaultName : existing.name);

  const incomingIsAnot = incoming.auditPhase === 'Elementos de Anotación' || Boolean(incoming.anotacionData) || (hasAnnotationData(incoming.data) && !hasGeneralConfigData(incoming.data));
  const incomingIsConfig = incoming.auditPhase === 'Configuración General' || Boolean(incoming.configData) || (hasGeneralConfigData(incoming.data) && !hasAnnotationData(incoming.data));
  const incomingIs3D = incoming.auditPhase === 'Elementos 3D' || Boolean(incoming.has3DData);

  // Cada fase conserva su JSON normalizado exacto. Nunca se mezclan los codechecking
  // de Anotación entre modelos ni con los de Configuración General.
  const existingConfigData = getConfigPhaseData(existing);
  const existingAnotData = getAnnotationPhaseData(existing);
  const incomingConfigData = incoming.configData || (incomingIsConfig ? pickCodechecking(incoming.data, CONFIG_KEYS, 'ConfiguracionGeneral') || incoming.data : undefined);
  const incomingAnotData = incoming.anotacionData || (incomingIsAnot ? pickCodechecking(incoming.data, ANNOTATION_KEYS, 'ElementosDeAnotacion') || incoming.data : undefined);
  const configData = incomingIsConfig ? incomingConfigData : existingConfigData;
  const anotacionData = incomingIsAnot ? incomingAnotData : existingAnotData;

  const hasConfig = Boolean(existing.hasConfigData || incoming.hasConfigData || configData);
  const hasAnot = Boolean(existing.hasAnotacionData || incoming.hasAnotacionData || anotacionData);

  const configFileName = incomingIsConfig ? incoming.name : existing.configFileName;
  const configCreatedAt = incomingIsConfig ? incoming.createdAt : existing.configCreatedAt;
  const configElementCount = incomingIsConfig
    ? (incoming.configElementCount || calculateConfigElementCount(configData || incoming.data) || incoming.elementCount)
    : (existing.configElementCount || (configData ? calculateConfigElementCount(configData) : 0));

  const anotacionFileName = incomingIsAnot ? incoming.name : existing.anotacionFileName;
  const anotacionCreatedAt = incomingIsAnot ? incoming.createdAt : existing.anotacionCreatedAt;
  const anotacionElementCount = incomingIsAnot
    ? (incoming.anotacionElementCount || calculatePhase2ElementCount(anotacionData || incoming.data) || incoming.elementCount)
    : (existing.anotacionElementCount || (anotacionData ? calculatePhase2ElementCount(anotacionData) : 0));

  const totalElements = (hasConfig ? (configElementCount || 0) : 0) + (hasAnot ? (anotacionElementCount || 0) : 0);

  // data queda como compatibilidad para código antiguo, pero las vistas usan configData/anotacionData.
  const compatibilityCodechecking = {
    ...(configData?.codechecking || {}),
    ...(anotacionData?.codechecking || {})
  };
  const preferredMeta = incomingIsAnot ? anotacionData : incomingIsConfig ? configData : (configData || anotacionData || existing.data);

  return {
    ...existing,
    id: existing.id,
    name: configFileName || anotacionFileName || existing.name,
    customName,
    modelType,
    auditPhase: hasConfig && hasAnot ? 'Unificado' : (hasAnot ? 'Elementos de Anotación' : (incomingIs3D ? 'Elementos 3D' : 'Configuración General')),
    date: new Date().toLocaleDateString('es-ES'),
    createdAt: incoming.createdAt || existing.createdAt,
    elementCount: totalElements,
    hasConfigData: hasConfig,
    hasAnotacionData: hasAnot,
    configData,
    anotacionData,
    has3DData: Boolean(existing.has3DData || incoming.has3DData || incomingIs3D),
    model3DFileName: incomingIs3D ? (incoming.model3DFileName || incoming.name) : existing.model3DFileName,
    model3DImportedAt: incomingIs3D ? (incoming.model3DImportedAt || incoming.createdAt) : existing.model3DImportedAt,
    model3DExportedAt: incomingIs3D ? (incoming.model3DExportedAt || incoming.model3DData?.fecha_exportacion || incoming.data?.fecha_exportacion || '') : existing.model3DExportedAt,
    model3DCreatedAt: incomingIs3D ? (incoming.model3DCreatedAt || incoming.createdAt) : existing.model3DCreatedAt,
    model3DElementCount: incomingIs3D ? (incoming.model3DElementCount || incoming.elementCount) : existing.model3DElementCount,
    model3DData: incomingIs3D ? (incoming.model3DData || incoming.data) : existing.model3DData,
    configFileName,
    configImportedAt: incomingIsConfig ? (incoming.configImportedAt || incoming.createdAt) : existing.configImportedAt,
    configExportedAt: incomingIsConfig ? (incoming.configExportedAt || configData?.fecha_exportacion || '') : existing.configExportedAt,
    configCreatedAt,
    configElementCount,
    anotacionFileName,
    anotacionImportedAt: incomingIsAnot ? (incoming.anotacionImportedAt || incoming.createdAt) : existing.anotacionImportedAt,
    anotacionExportedAt: incomingIsAnot ? (incoming.anotacionExportedAt || anotacionData?.fecha_exportacion || '') : existing.anotacionExportedAt,
    anotacionCreatedAt,
    anotacionElementCount,
    data: {
      fase_auditoria: hasConfig && hasAnot ? 'Unificado' : (hasAnot ? 'ElementosDeAnotacion' : 'ConfiguracionGeneral'),
      fecha_exportacion: preferredMeta?.fecha_exportacion || existing.data?.fecha_exportacion || '',
      modelo: preferredMeta?.modelo || existing.data?.modelo,
      codechecking: compatibilityCodechecking
    } as RevitBimData
  };
}

export function unifyProjectFilesList(files: ProjectFile[]): ProjectFile[] {
  if (!files || files.length === 0) return [];

  const unified: ProjectFile[] = [];

  for (const rawFile of files) {
    const file = ensureFileMetadata(rawFile);
    
    // Buscar si ya existe un modelo para la misma disciplina (o mismo nombre base)
    const existingIndex = unified.findIndex(u => {
      if (u.modelType && file.modelType && u.modelType !== 'otro' && file.modelType !== 'otro') {
        return u.modelType === file.modelType;
      }
      // Si alguno es 'otro', comparar nombre normalizado
      const cleanU = (u.customName || u.name).replace(/\.[a-zA-Z0-9]+$/i, '').split('_')[0].trim().toUpperCase();
      const cleanF = (file.customName || file.name).replace(/\.[a-zA-Z0-9]+$/i, '').split('_')[0].trim().toUpperCase();
      return cleanU === cleanF;
    });

    if (existingIndex >= 0) {
      unified[existingIndex] = mergeProjectFiles(unified[existingIndex], file);
    } else {
      unified.push(file);
    }
  }

  return unified;
}

