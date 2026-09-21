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

export function ensureFileMetadata(file: ProjectFile): ProjectFile {
  const modelType = file.modelType || detectModelDiscipline(file.name, file.data);
  const foundDisc = MODEL_DISCIPLINES.find(d => d.key === modelType);
  const suggestedCustomName = file.customName || 
    (foundDisc ? foundDisc.defaultName : file.name.replace(/\.json$/i, '').replace(/_configuracion$/i, '').toUpperCase());

  return {
    ...file,
    modelType,
    customName: suggestedCustomName,
    auditPhase: file.auditPhase || 'Configuración General'
  };
}
