import { RevitBimData, RevitAnnotationData, AuditConfig, ProjectFile } from '../types';

export interface WarningItem {
  tipo_warning?: string;
  warning?: string;
  descripcion?: string;
  cantidad_incidencias?: number;
  total?: number;
  elementos_ids?: (number | string)[];
  categorias_afectadas?: string[];
  [key: string]: any;
}

export interface AuditCheckResult {
  status: 'BUENO' | 'ALERTA' | 'FALLO';
  details?: string[];
  [key: string]: any;
}

/**
 * Parsea el texto o datos de las fases para extraer el nombre y recuento de elementos
 */
export const parsePhaseItem = (item: any) => {
  if (typeof item === 'string') {
    const match = item.match(/^(.*?)\s*\((?:(\d+)\s*elementos)?\)$/i);
    if (match) {
      const nombre = match[1].trim();
      const cantidad = match[2] ? parseInt(match[2], 10) : 0;
      return {
        nombre,
        cantidad,
        tieneConteo: match[2] !== undefined,
        esNuevaConstruccion:
          nombre.toLowerCase().includes('nueva construcci') ||
          nombre.toLowerCase().includes('new construction'),
      };
    }
    return {
      nombre: item,
      cantidad: 0,
      tieneConteo: false,
      esNuevaConstruccion:
        item.toLowerCase().includes('nueva construcci') ||
        item.toLowerCase().includes('new construction'),
    };
  }
  return {
    nombre: item?.nombre || 'Desconocida',
    cantidad: item?.num_elementos || item?.cantidad || 0,
    tieneConteo: true,
    esNuevaConstruccion: (item?.nombre || '')
      .toLowerCase()
      .includes('nueva construcci'),
  };
};

/**
 * Normaliza la extracción de la lista de warnings independientemente del esquema JSON
 */
export const extractWarningsList = (bimData: any): WarningItem[] => {
  if (!bimData) return [];

  const list =
    bimData?.codechecking?.warnings?.detalle ||
    bimData?.warnings?.detalle ||
    bimData?.codechecking?.warnings ||
    (Array.isArray(bimData?.warnings) ? bimData.warnings : []);

  return Array.isArray(list) ? list : [];
};

/**
 * Filtra advertencias evaluando ÚNICA Y EXCLUSIVAMENTE la clave 'categorias_afectadas'.
 */
export const filterRoomAreaWarnings = (
  warnings: WarningItem[] = []
): WarningItem[] => {
  const categoryRegex =
    /\b(habitaci[oó]n|habitaciones|room|rooms|[aá]rea|[aá]reas|espacio|espacios|space|spaces)\b/i;

  return warnings.filter((w) => {
    const cats = w.categorias_afectadas;

    if (!cats) return false;

    if (Array.isArray(cats)) {
      return cats.some(
        (cat) => typeof cat === 'string' && categoryRegex.test(cat)
      );
    }

    if (typeof cats === 'string') {
      return categoryRegex.test(cats);
    }

    return false;
  });
};

/**
 * Audita la nomenclatura del modelo BIM según la convención oficial:
 * Lectura secuencial de izquierda a derecha (7 bloques separados por guión '-'):
 * 1. Código de proyecto (3 letras)
 * 2. Equipo responsable (2 a 3 letras)
 * 3. Fase de creación (2 letras): EN, EP, AN, PB, PE, CO, AB
 * 4. Localizador / División (2 letras o cifras)
 * 5. Tipo de archivo (3 letras): MOD o FED
 * 6. Disciplina (3 letras): ARQ, EST, INS, URB, ZZZ
 * 7. Versión de Revit (ej. R25)
 */
export interface ModelNameField {
  index: number;
  name: string;
  value: string;
  expected: string;
  ok: boolean;
  description: string;
}

export interface ModelNameAuditResult {
  status: 'BUENO' | 'FALLO';
  originalFileName: string;
  cleanName: string;
  ignoredSuffix: string | null;
  fields: ModelNameField[];
  parts: string[];
  totalBlocks: number;
  expectedBlocks: number;
  errorCount: number;
}

export const auditModelName = (
  rawFileName: string,
  auditConfig?: AuditConfig
): ModelNameAuditResult => {
  const original = (rawFileName || '').trim();

  // 1. Quitar extensión del archivo
  const withoutExt = original.replace(/\.[a-zA-Z0-9]+$/i, '');

  // 2. Ignorar sufijo de usuario tras '_'
  const underscoreIndex = withoutExt.indexOf('_');
  let cleanName = withoutExt;
  let ignoredSuffix: string | null = null;

  if (underscoreIndex !== -1) {
    cleanName = withoutExt.substring(0, underscoreIndex).trim();
    ignoredSuffix = withoutExt.substring(underscoreIndex);
  }

  // 3. Separar por guiones '-'
  const parts = cleanName ? cleanName.split('-').map((p) => p.trim()) : [];

  const expectedProjectCode = (auditConfig?.projectCode || '').trim();
  const expectedRevitVersion = (auditConfig?.revitVersion || '').trim();

  const part0 = parts[0] || '';
  const isProjCodeOk = expectedProjectCode
    ? part0.toUpperCase() === expectedProjectCode.toUpperCase()
    : /^[A-Za-z0-9]{3}$/.test(part0);

  const part1 = parts[1] || '';
  const isTeamOk = /^[A-Za-z0-9]{2,3}$/.test(part1);

  const validPhases = ['EN', 'EP', 'AN', 'PB', 'PE', 'CO', 'AB'];
  const part2 = (parts[2] || '').toUpperCase();
  const isPhaseOk = validPhases.includes(part2);

  const part3 = parts[3] || '';
  const isLocatorOk = /^[A-Za-z0-9]{2}$/.test(part3);

  const validFileTypes = ['MOD', 'FED'];
  const part4 = (parts[4] || '').toUpperCase();
  const isFileTypeOk = validFileTypes.includes(part4);

  const validDisciplines = ['ARQ', 'EST', 'INS', 'URB', 'ZZZ'];
  const part5 = (parts[5] || '').toUpperCase();
  const isDisciplineOk = validDisciplines.includes(part5);

  const part6 = parts[6] || '';
  const isRevitVersionOk = expectedRevitVersion
    ? part6.toUpperCase() === expectedRevitVersion.toUpperCase()
    : /^R\d{2}$/i.test(part6);

  const fields: ModelNameField[] = [
    {
      index: 1,
      name: 'Código de proyecto',
      value: parts[0] || '---',
      expected: expectedProjectCode ? expectedProjectCode : '3 letras (ej. HMM)',
      ok: Boolean(parts[0]) && isProjCodeOk,
      description: 'Identificador del proyecto (3 letras)',
    },
    {
      index: 2,
      name: 'Equipo responsable',
      value: parts[1] || '---',
      expected: '2 a 3 letras (ej. BCI)',
      ok: Boolean(parts[1]) && isTeamOk,
      description: 'Código de la empresa u organización encargada (BCI)',
    },
    {
      index: 3,
      name: 'Fase de creación',
      value: parts[2] || '---',
      expected: 'EN, EP, AN, PB, PE, CO, AB',
      ok: Boolean(parts[2]) && isPhaseOk,
      description: 'Fase en la que se crea el modelo',
    },
    {
      index: 4,
      name: 'Localizador / División',
      value: parts[3] || '---',
      expected: '2 letras o cifras (ej. ZZ, V1, B1, A2)',
      ok: Boolean(parts[3]) && isLocatorOk,
      description: 'Ubicación o sectorización dentro del edificio o parcela',
    },
    {
      index: 5,
      name: 'Tipo de archivo',
      value: parts[4] || '---',
      expected: 'MOD / FED',
      ok: Boolean(parts[4]) && isFileTypeOk,
      description: 'Tipo de modelo (MOD=Modelo BIM, FED=Modelo Federado)',
    },
    {
      index: 6,
      name: 'Disciplina',
      value: parts[5] || '---',
      expected: 'ARQ, EST, INS, URB, ZZZ',
      ok: Boolean(parts[5]) && isDisciplineOk,
      description: 'Especialidad (ARQ, EST, INS, URB, ZZZ)',
    },
    {
      index: 7,
      name: 'Versión de Revit',
      value: parts[6] || '---',
      expected: expectedRevitVersion ? expectedRevitVersion : 'Identificador software (ej. R25)',
      ok: Boolean(parts[6]) && isRevitVersionOk,
      description: 'Identificador del software (ej. R25)',
    },
  ];

  if (parts.length > 7) {
    fields.push({
      index: 8,
      name: 'Bloques adicionales no válidos',
      value: parts.slice(7).join('-'),
      expected: 'Exactamente 7 bloques (separados por guión)',
      ok: false,
      description: 'Se han detectado bloques excedentes tras la versión de Revit',
    });
  }

  const allFieldsOk = fields.every((f) => f.ok) && parts.length === 7;
  const errorCount = fields.filter((f) => !f.ok).length;

  return {
    status: allFieldsOk ? 'BUENO' : 'FALLO',
    originalFileName: original,
    cleanName,
    ignoredSuffix,
    fields,
    parts,
    totalBlocks: parts.length,
    expectedBlocks: 7,
    errorCount,
  };
};

/**
 * Función independiente para auditar las advertencias (Warnings)
 */
export const auditWarnings = (bimData: any, maxAllowed: number = 300) => {
  const warningsDetalle = extractWarningsList(bimData);

  const totalWarnings =
    bimData?.codechecking?.warnings?.total_incidencias ??
    bimData?.warnings?.total_incidencias ??
    bimData?.codechecking?.warnings?.total ??
    warningsDetalle.reduce(
      (acc, w) => acc + (w.cantidad_incidencias || w.total || 1),
      0
    );

  const roomAreaWarnings = filterRoomAreaWarnings(warningsDetalle);

  const hasRoomAreaWarnings = roomAreaWarnings.length > 0;
  const exceedsMax = totalWarnings > maxAllowed;

  let status: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  if (exceedsMax) status = 'FALLO';
  else if (hasRoomAreaWarnings) status = 'ALERTA';

  return {
    status,
    totalWarnings,
    roomAreaWarnings,
  };
};

// --- AUDITORÍA DE FASE 1: CONFIGURACIÓN INICIAL ---

export const runAudit = (
  bimData: RevitBimData,
  auditConfig?: AuditConfig,
  activeFile?: ProjectFile
) => {
  const summary = {
    total: 10,
    passed: 0,
    failed: 0,
    alerts: 0,
  };

  const trackStatus = (status: 'BUENO' | 'ALERTA' | 'FALLO') => {
    if (status === 'BUENO') summary.passed++;
    else if (status === 'FALLO') summary.failed++;
    else if (status === 'ALERTA') summary.alerts++;
  };

  // 1. Nomenclatura del modelo
  const rawFileName =
    bimData?.modelo?.nombre_archivo ||
    bimData?.codechecking?.nombre_modelo?.nombre_archivo ||
    activeFile?.name ||
    '';

  const nomenclaturaAudit = auditModelName(rawFileName, auditConfig);
  trackStatus(nomenclaturaAudit.status);

  // 2. Tamaño del modelo
  const fileSize =
    bimData?.codechecking?.informacion_general?.tamano_archivo_mb || 0;
  const tamanoStatus: 'BUENO' | 'FALLO' = fileSize <= 200 ? 'BUENO' : 'FALLO';
  trackStatus(tamanoStatus);

  // 3. Coordenadas
  const coordSurvey = bimData?.codechecking?.coordenadas?.punto_reconocimiento;
  const coordBase = bimData?.codechecking?.coordenadas?.punto_base_proyecto;
  const expSurvey = auditConfig?.expectedCoordinates?.surveyPoint;
  const expBase = auditConfig?.expectedCoordinates?.basePoint;

  let coordOk = true;
  const coordErrors: string[] = [];
  const coordNoInfo: string[] = [];

  if (expSurvey) {
    if (
      Math.abs((coordSurvey?.norte_sur_m || 0) - expSurvey.norte_sur_m) > 0.001 ||
      Math.abs((coordSurvey?.este_oeste_m || 0) - expSurvey.este_oeste_m) > 0.001 ||
      Math.abs((coordSurvey?.elevacion_m || 0) - expSurvey.elevacion_m) > 0.001
    ) {
      coordOk = false;
      coordErrors.push("Punto de reconocimiento incorrecto");
    }
  }

  const pineadoSurvey = coordSurvey?.esta_pineado !== undefined ? coordSurvey.esta_pineado : (coordSurvey?.pineado !== undefined ? coordSurvey.pineado : null);
  if (pineadoSurvey === false) {
    coordOk = false;
    coordErrors.push("Punto de reconocimiento no pineado");
  } else if (pineadoSurvey === null) {
    coordNoInfo.push("Punto de reconocimiento sin info de pineado");
  }

  if (expBase) {
    if (
      Math.abs((coordBase?.norte_sur_m || 0) - expBase.norte_sur_m) > 0.001 ||
      Math.abs((coordBase?.este_oeste_m || 0) - expBase.este_oeste_m) > 0.001 ||
      Math.abs((coordBase?.elevacion_m || 0) - expBase.elevacion_m) > 0.001 ||
      Math.abs((coordBase?.angulo_norte_grados || 0) - expBase.angulo_norte_grados) > 0.01
    ) {
      coordOk = false;
      coordErrors.push("Punto base incorrecto");
    }
  }

  const pineadoBase = coordBase?.esta_pineado !== undefined ? coordBase.esta_pineado : (coordBase?.pineado !== undefined ? coordBase.pineado : null);
  if (pineadoBase === false) {
    coordOk = false;
    coordErrors.push("Punto base no pineado");
  } else if (pineadoBase === null) {
    coordNoInfo.push("Punto base sin info de pineado");
  }

  const coordenadasStatus: 'BUENO' | 'FALLO' = coordOk ? 'BUENO' : 'FALLO';
  trackStatus(coordenadasStatus);

  // 4. Subproyectos
  const worksets = bimData?.codechecking?.subproyectos?.existentes || [];
  const emptyWorksets = worksets.filter((w) => w.vacio).map((w) => w.nombre);
  const expectedWorksets = auditConfig?.expectedWorksets || [];
  const missingWorksets = expectedWorksets.filter(
    (exp) => !worksets.some((w) => w.nombre.toLowerCase() === exp.toLowerCase())
  );

  const subproyectosStatus: 'BUENO' | 'ALERTA' | 'FALLO' =
    missingWorksets.length > 0 || emptyWorksets.length > 0 ? 'FALLO' : 'BUENO';
  trackStatus(subproyectosStatus);

  // 5. Warnings
  const warningsDetalle = extractWarningsList(bimData);
  const totalWarnings =
    bimData?.codechecking?.warnings?.total_incidencias ??
    warningsDetalle.reduce(
      (acc, w) => acc + (w.cantidad_incidencias || w.total || 1),
      0
    );

  const roomAreaWarnings = filterRoomAreaWarnings(warningsDetalle);

  let warningsStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  if (totalWarnings > 300) {
    warningsStatus = 'FALLO';
  } else if (roomAreaWarnings.length > 0) {
    warningsStatus = 'ALERTA';
  }
  trackStatus(warningsStatus);

  // 6. Filtros de vista
  const unusedFiltersCount = bimData?.codechecking?.filtros_vista?.sin_usar_cantidad || 0;
  const filtrosStatus: 'BUENO' | 'FALLO' = unusedFiltersCount === 0 ? 'BUENO' : 'FALLO';
  trackStatus(filtrosStatus);

  // 7. Opciones de diseño
  const hasDesignOptions = bimData?.codechecking?.opciones_diseno?.existen || false;
  const opcionesDisenoStatus: 'BUENO' | 'FALLO' = !hasDesignOptions ? 'BUENO' : 'FALLO';
  trackStatus(opcionesDisenoStatus);

  // 8. Fases
  const rawPhases =
    bimData?.codechecking?.fases?.elementos_por_fase?.length
      ? bimData.codechecking.fases.elementos_por_fase
      : bimData?.codechecking?.fases?.listado || [];

  const invalidPhasesDetails: string[] = [];
  rawPhases.forEach((item: any) => {
    const parsed = parsePhaseItem(item);
    if (!parsed.esNuevaConstruccion && parsed.cantidad > 0) {
      invalidPhasesDetails.push(
        `Fase "${parsed.nombre}": ${parsed.cantidad} elementos fuera de Nueva Construcción`
      );
    }
  });

  const fasesStatus: 'BUENO' | 'FALLO' = invalidPhasesDetails.length === 0 ? 'BUENO' : 'FALLO';
  trackStatus(fasesStatus);

  // 9. Niveles
  const levels = bimData?.codechecking?.niveles?.listado || [];
  const disciplineFromNomenclature = (nomenclaturaAudit.parts[5] || '').toUpperCase();
  const activeDiscipline =
    bimData?.modelo?.disciplina ||
    disciplineFromNomenclature ||
    (activeFile?.modelType === 'arquitectura' ? 'ARQ' : 'EST');

  const groupedErrors = {
    missing: [] as string[],
    elevation: [] as string[],
    structure: [] as string[],
    building: [] as string[],
    unpinned: [] as string[],
    noInfo: [] as string[],
  };

  levels.forEach((level) => {
    if (activeDiscipline.toUpperCase() === 'EST' && !level.es_estructura) {
      groupedErrors.structure.push(level.nombre);
    }
    if (activeDiscipline.toUpperCase() === 'ARQ' && !level.es_nivel_edificio) {
      groupedErrors.building.push(level.nombre);
    }
    const estaPineado = level.esta_pineado !== undefined ? level.esta_pineado : ((level as any).pineado !== undefined ? (level as any).pineado : null);
    
    if (estaPineado === false) {
      groupedErrors.unpinned.push(level.nombre);
    } else if (estaPineado === null) {
      groupedErrors.noInfo.push(level.nombre);
    }
  });

  const hasLevelErrors =
    groupedErrors.missing.length > 0 ||
    groupedErrors.elevation.length > 0 ||
    groupedErrors.structure.length > 0 ||
    groupedErrors.building.length > 0 ||
    groupedErrors.unpinned.length > 0;

  const nivelesStatus: 'BUENO' | 'FALLO' = !hasLevelErrors ? 'BUENO' : 'FALLO';
  trackStatus(nivelesStatus);

  // 10. Rejillas
  const grids = (bimData?.codechecking?.rejillas?.listado || []).map(g => ({
    ...g,
    esta_pineado: g.esta_pineado !== undefined ? g.esta_pineado : ((g as any).pineado !== undefined ? (g as any).pineado : null)
  }));
  const uniqueGridTypes = Array.from(new Set(grids.map((g) => g.tipo_curva))).length;
  const unpinnedGrids = grids.filter(g => g.esta_pineado === false).map(g => g.nombre);
  const noInfoGrids = grids.filter(g => g.esta_pineado === null).map(g => g.nombre);

  let rejillasStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  if (uniqueGridTypes >= 5 || unpinnedGrids.length > 0) {
    rejillasStatus = 'FALLO';
  } else if (uniqueGridTypes === 4) {
    rejillasStatus = 'ALERTA';
  }
  trackStatus(rejillasStatus);

  return {
    summary,
    results: {
      nomenclatura: nomenclaturaAudit,
      tamano: { status: tamanoStatus, fileSize },
      coordenadas: { status: coordenadasStatus, coordErrors, coordNoInfo },
      subproyectos: {
        status: subproyectosStatus,
        empty: emptyWorksets,
        missing: missingWorksets,
      },
      warnings: {
        status: warningsStatus,
        totalWarnings,
        roomAreaWarnings,
      },
      filtros: { status: filtrosStatus, unusedCount: unusedFiltersCount },
      opcionesDiseno: { status: opcionesDisenoStatus },
      fases: { status: fasesStatus, details: invalidPhasesDetails },
      niveles: { status: nivelesStatus, groupedErrors },
      rejillas: { status: rejillasStatus, uniqueTypes: uniqueGridTypes, unpinnedGrids, noInfoGrids },
    },
  };
};

// --- AUDITORÍA DE FASE 2: ELEMENTOS DE ANOTACIÓN Y DOCUMENTACIÓN ---

export const runAnnotationAudit = (annotationData: RevitAnnotationData) => {
  const cc = annotationData?.codechecking || {};

  // Plantillas de vista sin usar
  const plantillasSinUsar = cc.plantillas_vista?.cantidad_sin_usar || 0;
  const plantillasStatus: 'BUENO' | 'ALERTA' | 'FALLO' = plantillasSinUsar > 0 ? 'ALERTA' : 'BUENO';

  // Habitaciones sin cerrar
  const habSinCerrar = cc.habitaciones?.cantidad_sin_cerrar || 0;
  const habitacionesStatus: 'BUENO' | 'FALLO' = habSinCerrar > 0 ? 'FALLO' : 'BUENO';

  // Vínculos CAD
  const cadLinks = cc.vinculos_cad?.listado || [];
  const cadGlobales = cadLinks.filter(c => c.visible_en_todas_las_vistas);
  const cadDespineados = cadLinks.filter(c => !c.pineado);
  const cadStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 
    cadDespineados.length > 0 ? 'FALLO' : cadGlobales.length > 0 ? 'ALERTA' : 'BUENO';

  // Grupos de anotación
  const grupos = cc.grupos_anotacion?.listado || [];
  const gruposDespineados = grupos.filter(g => !g.pineado);
  const gruposStatus: 'BUENO' | 'FALLO' = gruposDespineados.length > 0 ? 'FALLO' : 'BUENO';

  return {
    plantillas: { status: plantillasStatus, sinUsar: plantillasSinUsar },
    habitaciones: { status: habitacionesStatus, sinCerrar: habSinCerrar },
    cad: { status: cadStatus, globales: cadGlobales, despineados: cadDespineados },
    grupos: { status: gruposStatus, despineados: gruposDespineados },
  };
};