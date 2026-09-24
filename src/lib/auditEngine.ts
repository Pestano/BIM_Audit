import { 
  RevitBimData, 
  AuditConfig, 
  ProjectFile, 
  DEFAULT_REQUIRED_SAS_PARAMETERS, 
  DEFAULT_DETAIL_ELEMENTS_CONFIG,
  ModelDiscipline,
  ProjectPhaseInfo,
  ProjectDesignOptionInfo
} from '../types';

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
  severity?: 'CRITICAL' | 'MINOR' | 'WARNING';
  details?: string[];
  [key: string]: any;
}

/**
 * Parsea un elemento individual de fase para extraer nombre y recuento
 */
export const parsePhaseItem = (item: any): ProjectPhaseInfo => {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    const matchParen = trimmed.match(/^(.*?)\s*[\(\[]\s*(\d+)\s*(?:elem|elementos)?\s*[\)\]]$/i);
    const matchSep = trimmed.match(/^(.*?)\s*[:=\-–—]\s*(\d+)\s*(?:elem|elementos)?$/i);
    if (matchParen) {
      const nombre = matchParen[1].trim();
      const cantidad = parseInt(matchParen[2], 10);
      return {
        nombre,
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        tieneConteo: true,
        esNuevaConstruccion:
          nombre.toLowerCase().includes('nueva') ||
          nombre.toLowerCase().includes('new') ||
          nombre.toLowerCase().includes('nuevo'),
      };
    }
    if (matchSep) {
      const nombre = matchSep[1].trim();
      const cantidad = parseInt(matchSep[2], 10);
      return {
        nombre,
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        tieneConteo: true,
        esNuevaConstruccion:
          nombre.toLowerCase().includes('nueva') ||
          nombre.toLowerCase().includes('new') ||
          nombre.toLowerCase().includes('nuevo'),
      };
    }
    return {
      nombre: trimmed,
      cantidad: 0,
      tieneConteo: false,
      esNuevaConstruccion:
        trimmed.toLowerCase().includes('nueva') ||
        trimmed.toLowerCase().includes('new') ||
        trimmed.toLowerCase().includes('nuevo'),
    };
  }

  const nombre = (item?.fase || item?.nombre || item?.name || item?.phase || item?.fase_nombre || 'Desconocida').toString().trim();
  const rawCount = item?.cantidad ?? item?.num_elementos ?? item?.count ?? item?.elementos ?? item?.numElementos;
  const count = typeof rawCount === 'number' ? rawCount : parseInt(rawCount, 10);
  const hasCount = !isNaN(count);

  return {
    nombre: nombre || 'Desconocida',
    cantidad: hasCount ? count : 0,
    tieneConteo: hasCount,
    esNuevaConstruccion:
      nombre.toLowerCase().includes('nueva') ||
      nombre.toLowerCase().includes('new') ||
      nombre.toLowerCase().includes('nuevo'),
  };
};

/**
 * Reconoce y extrae todas las fases del proyecto y la cantidad de elementos asignados a cada una,
 * tolerando múltiples formatos de Revit, Dynamo y scripts de auditoría.
 */
export const extractProjectPhases = (bimData?: RevitBimData | null): ProjectPhaseInfo[] => {
  if (!bimData) return [];

  const cc = bimData.codechecking || (bimData as any);
  const rawFases = cc?.fases;
  if (!rawFases) return [];

  const phaseMap = new Map<string, { originalName: string; count: number; hasCount: boolean }>();

  // 1. Extraer del listado (fases.listado o array directo)
  const listado = Array.isArray(rawFases.listado)
    ? rawFases.listado
    : Array.isArray(rawFases)
    ? rawFases
    : [];

  listado.forEach((item: any) => {
    const parsed = parsePhaseItem(item);
    if (!parsed.nombre || parsed.nombre === 'Desconocida') return;
    const key = parsed.nombre.toLowerCase();
    if (!phaseMap.has(key)) {
      phaseMap.set(key, {
        originalName: parsed.nombre,
        count: parsed.cantidad,
        hasCount: parsed.tieneConteo,
      });
    } else if (parsed.tieneConteo) {
      const existing = phaseMap.get(key)!;
      existing.count = parsed.cantidad;
      existing.hasCount = true;
    }
  });

  // 2. Extraer o complementar desde elementos_por_fase (array u objeto)
  const elemPorFase =
    rawFases.elementos_por_fase ||
    rawFases.elementos ||
    rawFases.conteo ||
    rawFases.recuento ||
    rawFases.distribucion ||
    rawFases.conteo_elementos;

  if (Array.isArray(elemPorFase)) {
    elemPorFase.forEach((item: any) => {
      const parsed = parsePhaseItem(item);
      if (!parsed.nombre || parsed.nombre === 'Desconocida') return;
      const key = parsed.nombre.toLowerCase();
      const existing = phaseMap.get(key);
      if (existing) {
        if (parsed.tieneConteo) {
          existing.count = parsed.cantidad;
          existing.hasCount = true;
        }
      } else {
        phaseMap.set(key, {
          originalName: parsed.nombre,
          count: parsed.cantidad,
          hasCount: parsed.tieneConteo,
        });
      }
    });
  } else if (typeof elemPorFase === 'object' && elemPorFase !== null) {
    Object.entries(elemPorFase).forEach(([key, val]) => {
      const name = key.trim();
      if (!name) return;
      let count = 0;
      let hasCount = false;
      if (typeof val === 'number') {
        count = val;
        hasCount = true;
      } else if (typeof val === 'object' && val !== null) {
        const objVal: any = val;
        const raw = objVal.cantidad ?? objVal.num_elementos ?? objVal.count ?? objVal.elementos;
        if (typeof raw === 'number') {
          count = raw;
          hasCount = true;
        }
      }
      const mapKey = name.toLowerCase();
      const existing = phaseMap.get(mapKey);
      if (existing) {
        existing.count = count;
        existing.hasCount = hasCount;
      } else {
        phaseMap.set(mapKey, { originalName: name, count, hasCount });
      }
    });
  }

  // 3. Claves directas dentro del objeto rawFases si contiene nombres de fase
  if (typeof rawFases === 'object' && !Array.isArray(rawFases)) {
    const metaKeys = new Set([
      'existen', 'cantidad', 'listado', 'elementos_por_fase',
      'elementos', 'conteo', 'recuento', 'distribucion',
      'conteo_elementos', 'descripcion', 'total',
      'cantidad_elementos_con_fase', 'cantidad_elementos_sin_fase'
    ]);
    Object.entries(rawFases).forEach(([k, v]) => {
      if (!metaKeys.has(k.toLowerCase()) && typeof v === 'number') {
        const mapKey = k.toLowerCase();
        const existing = phaseMap.get(mapKey);
        if (existing) {
          existing.count = v;
          existing.hasCount = true;
        } else {
          phaseMap.set(mapKey, { originalName: k, count: v, hasCount: true });
        }
      }
    });
  }

  const resultList = Array.from(phaseMap.values());

  // 4. Si hay fases pero ninguna tiene conteo explícito (todas sin especificar):
  // Asignar coherentemente según el estándar BIM de Revit:
  const totalModelElements =
    cc.subproyectos?.existentes?.reduce(
      (acc: number, w: any) => acc + (w.num_elementos || 0), 0
    ) ||
    cc.informacion_general?.total_elementos ||
    0;

  const anyExplicitCount = resultList.some(p => p.hasCount && p.count > 0);

  if (!anyExplicitCount && resultList.length > 0) {
    if (resultList.length === 1) {
      resultList[0].count = totalModelElements;
      resultList[0].hasCount = true;
    } else {
      let activeIndex = -1;
      resultList.forEach((p, idx) => {
        const lower = p.originalName.toLowerCase();
        if (
          lower.includes('nuevo') ||
          lower.includes('nueva') ||
          lower.includes('proyecto') ||
          lower.includes('future') ||
          lower.includes('construcci')
        ) {
          activeIndex = idx;
        }
      });

      if (activeIndex === -1) {
        activeIndex = resultList.length - 1;
      }

      resultList.forEach((p, idx) => {
        p.count = idx === activeIndex ? totalModelElements : 0;
        p.hasCount = true;
      });
    }
  }

  return resultList.map(item => ({
    nombre: item.originalName,
    cantidad: item.count,
    tieneConteo: true,
    esNuevaConstruccion:
      item.originalName.toLowerCase().includes('nueva') ||
      item.originalName.toLowerCase().includes('new') ||
      item.originalName.toLowerCase().includes('nuevo'),
  }));
};

/**
 * Parsea un elemento individual de opción de diseño para extraer nombre y recuento de elementos
 */
export const parseDesignOptionItem = (item: any): ProjectDesignOptionInfo => {
  if (item === null || item === undefined) {
    return { nombre: 'Opción desconocida', cantidad: 0, tieneConteo: false };
  }

  if (typeof item === 'string') {
    const trimmed = item.trim();
    const isPrincipal =
      trimmed.toLowerCase().includes('<principal>') ||
      trimmed.toLowerCase().includes('<primary>') ||
      trimmed.toLowerCase().includes('(principal)') ||
      trimmed.toLowerCase().includes('[principal]') ||
      trimmed.toLowerCase().endsWith('principal');

    const matchParen = trimmed.match(/^(.*?)\s*[\(\[]\s*(\d+)\s*(?:elem|elementos)?\s*[\)\]]$/i);
    const matchSep = trimmed.match(/^(.*?)\s*[:=\-–—]\s*(\d+)\s*(?:elem|elementos)?$/i);

    if (matchParen) {
      const nombre = matchParen[1].trim();
      const cantidad = parseInt(matchParen[2], 10);
      return {
        nombre: nombre || trimmed,
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        tieneConteo: true,
        esPrincipal: isPrincipal || nombre.toLowerCase().includes('<principal>'),
      };
    }
    if (matchSep) {
      const nombre = matchSep[1].trim();
      const cantidad = parseInt(matchSep[2], 10);
      return {
        nombre: nombre || trimmed,
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        tieneConteo: true,
        esPrincipal: isPrincipal || nombre.toLowerCase().includes('<principal>'),
      };
    }
    return {
      nombre: trimmed,
      cantidad: 0,
      tieneConteo: false,
      esPrincipal: isPrincipal,
    };
  }

  const rawName = (
    item?.nombre ||
    item?.opcion ||
    item?.name ||
    item?.option ||
    item?.opcion_nombre ||
    item?.design_option ||
    item?.designOption ||
    'Opción desconocida'
  ).toString().trim();

  const isPrincipal =
    Boolean(item?.es_principal || item?.principal || item?.is_primary || item?.isPrimary) ||
    rawName.toLowerCase().includes('<principal>') ||
    rawName.toLowerCase().includes('<primary>');

  const rawCount = item?.cantidad ?? item?.num_elementos ?? item?.count ?? item?.elementos ?? item?.numElementos;
  const count = typeof rawCount === 'number' ? rawCount : parseInt(rawCount, 10);
  const hasCount = !isNaN(count);

  return {
    nombre: rawName || 'Opción desconocida',
    cantidad: hasCount ? count : 0,
    tieneConteo: hasCount,
    esPrincipal: isPrincipal,
  };
};

/**
 * Extrae y unifica todas las opciones de diseño del proyecto junto con la cantidad
 * de elementos asignados a cada una de ellas.
 */
export const extractProjectDesignOptions = (
  bimData?: RevitBimData | null
): ProjectDesignOptionInfo[] => {
  if (!bimData) return [];

  const cc = bimData.codechecking || (bimData as any);
  const rawOpciones = cc?.opciones_diseno;
  if (!rawOpciones) return [];

  const optionMap = new Map<string, { originalName: string; count: number; hasCount: boolean; isPrincipal: boolean }>();

  // Normalizador para cruzar nombres como "Opción 1 <principal>" con "Opción 1"
  const normalizeKey = (str: string) =>
    str
      .toLowerCase()
      .replace(/<principal>|<primary>|\(principal\)|\[principal\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // 1. Extraer del listado (opciones_diseno.listado o array directo)
  const listado = Array.isArray(rawOpciones.listado)
    ? rawOpciones.listado
    : Array.isArray(rawOpciones)
    ? rawOpciones
    : [];

  listado.forEach((item: any) => {
    const parsed = parseDesignOptionItem(item);
    if (!parsed.nombre || parsed.nombre === 'Opción desconocida') return;
    const key = normalizeKey(parsed.nombre);
    if (!optionMap.has(key)) {
      optionMap.set(key, {
        originalName: parsed.nombre,
        count: parsed.cantidad,
        hasCount: parsed.tieneConteo,
        isPrincipal: !!parsed.esPrincipal,
      });
    } else if (parsed.tieneConteo) {
      const existing = optionMap.get(key)!;
      existing.count = parsed.cantidad;
      existing.hasCount = true;
      if (parsed.esPrincipal) existing.isPrincipal = true;
    }
  });

  // 2. Extraer o complementar desde elementos_por_opcion (array u objeto)
  const elemPorOpcion =
    rawOpciones.elementos_por_opcion ||
    rawOpciones.elementos_por_opciones ||
    rawOpciones.elementos ||
    rawOpciones.conteo ||
    rawOpciones.recuento ||
    rawOpciones.distribucion ||
    rawOpciones.conteo_elementos ||
    cc.elementos_por_opcion;

  if (Array.isArray(elemPorOpcion)) {
    elemPorOpcion.forEach((item: any) => {
      const parsed = parseDesignOptionItem(item);
      if (!parsed.nombre || parsed.nombre === 'Opción desconocida') return;
      const key = normalizeKey(parsed.nombre);
      const existing = optionMap.get(key);
      if (existing) {
        if (parsed.tieneConteo) {
          existing.count = parsed.cantidad;
          existing.hasCount = true;
        }
        if (parsed.esPrincipal) existing.isPrincipal = true;
      } else {
        optionMap.set(key, {
          originalName: parsed.nombre,
          count: parsed.cantidad,
          hasCount: parsed.tieneConteo,
          isPrincipal: !!parsed.esPrincipal,
        });
      }
    });
  } else if (typeof elemPorOpcion === 'object' && elemPorOpcion !== null) {
    Object.entries(elemPorOpcion).forEach(([key, val]) => {
      const name = key.trim();
      if (!name) return;
      let count = 0;
      let hasCount = false;
      if (typeof val === 'number') {
        count = val;
        hasCount = true;
      } else if (typeof val === 'object' && val !== null) {
        const objVal: any = val;
        const raw = objVal.cantidad ?? objVal.num_elementos ?? objVal.count ?? objVal.elementos;
        if (typeof raw === 'number') {
          count = raw;
          hasCount = true;
        }
      }
      const mapKey = normalizeKey(name);
      const existing = optionMap.get(mapKey);
      if (existing) {
        existing.count = count;
        existing.hasCount = hasCount;
      } else {
        optionMap.set(mapKey, {
          originalName: name,
          count,
          hasCount,
          isPrincipal: name.toLowerCase().includes('<principal>'),
        });
      }
    });
  }

  // 3. Claves directas dentro del objeto rawOpciones si contiene nombres de opción con números
  if (typeof rawOpciones === 'object' && !Array.isArray(rawOpciones)) {
    const metaKeys = new Set([
      'existen', 'cantidad', 'listado', 'elementos_por_opcion',
      'elementos_por_opciones', 'elementos', 'conteo', 'recuento',
      'distribucion', 'conteo_elementos', 'descripcion', 'total', 'opciones'
    ]);
    Object.entries(rawOpciones).forEach(([k, v]) => {
      if (!metaKeys.has(k.toLowerCase()) && typeof v === 'number') {
        const mapKey = normalizeKey(k);
        const existing = optionMap.get(mapKey);
        if (existing) {
          existing.count = v;
          existing.hasCount = true;
        } else {
          optionMap.set(mapKey, {
            originalName: k,
            count: v,
            hasCount: true,
            isPrincipal: k.toLowerCase().includes('<principal>'),
          });
        }
      }
    });
  }

  return Array.from(optionMap.values()).map(item => ({
    nombre: item.originalName,
    cantidad: item.count,
    tieneConteo: true,
    esPrincipal: item.isPrincipal,
  }));
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

    // Retorna false si 'categorias_afectadas' no existe o está vacío
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
 * 1. Código de proyecto (3 letras): Identificador del proyecto
 * 2. Equipo responsable (2 a 3 letras): Código de la empresa u organización encargada (ej. BCI)
 * 3. Fase de creación (2 letras): EN, EP, AN, PB, PE, CO, AB
 * 4. Localizador / División (2 letras o cifras): Ubicación o sectorización (ej. ZZ, V1, B1, A2)
 * 5. Tipo de archivo (3 letras): MOD (Modelo BIM) o FED (Modelo Federado)
 * 6. Disciplina (3 letras): ARQ, EST, INS, URB, ZZZ
 * 7. Versión de Revit: Identificador del software (ej. R25 para Revit 2025)
 * 
 * Regla de sufijo de usuario:
 * Todo lo que haya después de una barra baja '_' debe ser ignorado (ej. copias locales de usuario).
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

  // 1. Quitar extensión del archivo (.rvt, .json, .ifc, etc.)
  const withoutExt = original.replace(/\.[a-zA-Z0-9]+$/i, '');

  // 2. Aparte, todo lo que haya después de una barra baja '_' debe ser ignorado
  const underscoreIndex = withoutExt.indexOf('_');
  let cleanName = withoutExt;
  let ignoredSuffix: string | null = null;

  if (underscoreIndex !== -1) {
    cleanName = withoutExt.substring(0, underscoreIndex).trim();
    ignoredSuffix = withoutExt.substring(underscoreIndex); // Ej: "_adrianapestano"
  }

  // 3. Se lee de izquierda a derecha separado por guiones '-'
  const parts = cleanName ? cleanName.split('-').map((p) => p.trim()) : [];

  // Parámetros de auditoría esperados (valores introducidos en configuración o por defecto)
  const expectedProjectCode = (auditConfig?.projectCode || '').trim();
  const expectedRevitVersion = (auditConfig?.revitVersion || '').trim();

  // Bloque 1: Código de proyecto (3 letras)
  const part0 = parts[0] || '';
  const isProjCodeOk = expectedProjectCode
    ? part0.toUpperCase() === expectedProjectCode.toUpperCase()
    : /^[A-Za-z0-9]{3}$/.test(part0);

  // Bloque 2: Equipo responsable (2 a 3 letras: ej. BCI)
  const part1 = parts[1] || '';
  const isTeamOk = /^[A-Za-z0-9]{2,3}$/.test(part1);

  // Bloque 3: Fase de creación (2 letras: EN, EP, AN, PB, PE, CO, AB)
  const validPhases = ['EN', 'EP', 'AN', 'PB', 'PE', 'CO', 'AB'];
  const part2 = (parts[2] || '').toUpperCase();
  const isPhaseOk = validPhases.includes(part2);

  // Bloque 4: Localizador / División (2 letras o cifras: ej. ZZ, V1, B1, A2)
  const part3 = parts[3] || '';
  const isLocatorOk = /^[A-Za-z0-9]{2}$/.test(part3);

  // Bloque 5: Tipo de archivo (3 letras: MOD para Modelo BIM o FED para Modelo Federado)
  const validFileTypes = ['MOD', 'FED'];
  const part4 = (parts[4] || '').toUpperCase();
  const isFileTypeOk = validFileTypes.includes(part4);

  // Bloque 6: Disciplina (3 letras: ARQ, EST, INS, URB, ZZZ)
  const validDisciplines = ['ARQ', 'EST', 'INS', 'URB', 'ZZZ'];
  const part5 = (parts[5] || '').toUpperCase();
  const isDisciplineOk = validDisciplines.includes(part5);

  // Bloque 7: Versión de Revit (Identificador del software: ej. R25 para Revit 2025)
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

  // Si se detectan bloques adicionales tras la versión de Revit
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
 * Función independiente para auditar los warnings
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

/**
 * Ejecuta el motor de auditoría completo evaluando los datos cargados frente a la configuración guardada
 */
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
    bimData.modelo?.nombre_archivo ||
    bimData.codechecking?.nombre_modelo?.nombre_archivo ||
    activeFile?.name ||
    '';

  const nomenclaturaAudit = auditModelName(rawFileName, auditConfig);
  trackStatus(nomenclaturaAudit.status);

  // 2. Tamaño del modelo
  const fileSize =
    bimData.codechecking?.informacion_general?.tamano_archivo_mb || 0;
  const tamanoStatus: 'BUENO' | 'FALLO' = fileSize <= 200 ? 'BUENO' : 'FALLO';
  trackStatus(tamanoStatus);

  // 3. Coordenadas
  const coordSurvey =
    bimData.codechecking?.coordenadas?.punto_reconocimiento;
  const coordBase = bimData.codechecking?.coordenadas?.punto_base_proyecto;
  const expSurvey = auditConfig?.expectedCoordinates?.surveyPoint;
  const expBase = auditConfig?.expectedCoordinates?.basePoint;

  let coordOk = true;
  const coordErrors: string[] = []; // NUEVO: Listado de errores de coordenadas
  const coordNoInfo: string[] = []; // NUEVO: Listado de coordenadas sin info de pineado

  if (expSurvey) {
    if (
      Math.abs((coordSurvey?.norte_sur_m || 0) - expSurvey.norte_sur_m) >
        0.001 ||
      Math.abs((coordSurvey?.este_oeste_m || 0) - expSurvey.este_oeste_m) >
        0.001 ||
      Math.abs((coordSurvey?.elevacion_m || 0) - expSurvey.elevacion_m) > 0.001
    ) {
      coordOk = false;
      coordErrors.push("Punto de reconocimiento incorrecto");
    }
  }
  // NUEVO: Verificar pineado
  const surveyAny = coordSurvey as any;
  const pineadoSurvey = surveyAny?.esta_pineado !== undefined ? surveyAny.esta_pineado : (surveyAny?.pineado !== undefined ? surveyAny.pineado : null);
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
      Math.abs(
        (coordBase?.angulo_norte_grados || 0) - expBase.angulo_norte_grados
      ) > 0.01
    ) {
      coordOk = false;
      coordErrors.push("Punto base incorrecto");
    }
  }
  // NUEVO: Verificar pineado
  const baseAny = coordBase as any;
  const pineadoBase = baseAny?.esta_pineado !== undefined ? baseAny.esta_pineado : (baseAny?.pineado !== undefined ? baseAny.pineado : null);
  if (pineadoBase === false) {
    coordOk = false;
    coordErrors.push("Punto base no pineado");
  } else if (pineadoBase === null) {
    coordNoInfo.push("Punto base sin info de pineado");
  }

  const coordenadasStatus: 'BUENO' | 'FALLO' = coordOk ? 'BUENO' : 'FALLO';
  trackStatus(coordenadasStatus);

  // 4. Subproyectos
  const worksets =
    bimData.codechecking?.subproyectos?.existentes || [];
  const emptyWorksets = worksets
    .filter((w) => w.vacio)
    .map((w) => w.nombre);
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
    bimData.codechecking?.warnings?.total_incidencias ??
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
  const unusedFiltersCount =
    bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0;
  const filtrosStatus: 'BUENO' | 'FALLO' =
    unusedFiltersCount === 0 ? 'BUENO' : 'FALLO';
  trackStatus(filtrosStatus);

  // 7. Opciones de diseño
  const designOptions = extractProjectDesignOptions(bimData);
  const hasDesignOptions =
    designOptions.length > 0 ||
    bimData.codechecking?.opciones_diseno?.existen ||
    (bimData.codechecking?.opciones_diseno?.cantidad || 0) > 0;
  const opcionesDisenoStatus: 'BUENO' | 'FALLO' = !hasDesignOptions
    ? 'BUENO'
    : 'FALLO';
  trackStatus(opcionesDisenoStatus);

  const designOptionsDetails: string[] = [];
  if (hasDesignOptions) {
    if (designOptions.length > 0) {
      designOptionsDetails.push(
        `Existen ${designOptions.length} opciones de diseño detectadas: ${designOptions
          .map(o => `"${o.nombre}" (${o.cantidad.toLocaleString('es-ES')} elem.)`)
          .join(', ')}. El modelo no debe contener opciones de diseño.`
      );
    } else {
      designOptionsDetails.push('Existen opciones de diseño activas en el modelo.');
    }
  } else {
    designOptionsDetails.push('Conforme: No existen opciones de diseño en el modelo.');
  }

  // 8. Fases (El criterio de auditoría exige que solo haya elementos en una sola fase)
  const phases = extractProjectPhases(bimData);
  const phasesWithElements = phases.filter(p => p.cantidad > 0);

  const invalidPhasesDetails: string[] = [];
  let fasesStatus: 'BUENO' | 'FALLO' = 'BUENO';

  if (phasesWithElements.length > 1) {
    fasesStatus = 'FALLO';
    invalidPhasesDetails.push(
      `Existen elementos en ${phasesWithElements.length} fases distintas: ${phasesWithElements
        .map(p => `"${p.nombre}" (${p.cantidad.toLocaleString('es-ES')} elem.)`)
        .join(', ')}. El criterio de auditoría exige que los elementos estén en una sola fase.`
    );
  } else if (phasesWithElements.length === 1) {
    fasesStatus = 'BUENO';
    invalidPhasesDetails.push(
      `Conforme: Todos los elementos están en una única fase ("${phasesWithElements[0].nombre}", ${phasesWithElements[0].cantidad.toLocaleString('es-ES')} elem.).`
    );
  } else {
    fasesStatus = 'BUENO';
    invalidPhasesDetails.push(
      `Conforme: No se detectaron elementos distribuidos en múltiples fases.`
    );
  }

  trackStatus(fasesStatus);

  // 9. Niveles (Auditoría por disciplina ARQ/EST y pineado)
  const levels = bimData.codechecking?.niveles?.listado || [];
  const disciplineFromNomenclature = (nomenclaturaAudit.parts[5] || '').toUpperCase();
  const activeDiscipline =
    bimData.modelo?.disciplina ||
    disciplineFromNomenclature ||
    (activeFile?.modelType === 'arquitectura' ? 'ARQ' : 'EST');

  const groupedErrors = {
    missing: [] as string[],
    elevation: [] as string[],
    structure: [] as string[],
    building: [] as string[],
    unpinned: [] as string[], // NUEVO: Niveles no pineados
    noInfo: [] as string[], // NUEVO: Niveles sin info
  };

  levels.forEach((level) => {
    if (activeDiscipline.toUpperCase() === 'EST' && !level.es_estructura) {
      groupedErrors.structure.push(level.nombre);
    }
    if (
      activeDiscipline.toUpperCase() === 'ARQ' &&
      !level.es_nivel_edificio
    ) {
      groupedErrors.building.push(level.nombre);
    }
    // NUEVO: Verificar si está pineado (con manejo de ausencia de datos)
    const lvlAny = level as any;
    const estaPineado = lvlAny.esta_pineado !== undefined ? lvlAny.esta_pineado : (lvlAny.pineado !== undefined ? lvlAny.pineado : null);
    
    if (estaPineado === false) {
      groupedErrors.unpinned.push(level.nombre);
    } else if (estaPineado === null) {
      groupedErrors.noInfo.push(level.nombre); // Asegurarse de tener un grupo para "sin información"
    }
  });

  const hasCriticalLevelErrors =
    groupedErrors.missing.length > 0 ||
    groupedErrors.elevation.length > 0 ||
    groupedErrors.structure.length > 0 ||
    groupedErrors.building.length > 0;

  const hasMinorLevelErrors = groupedErrors.unpinned.length > 0;

  let nivelesStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  if (hasCriticalLevelErrors) nivelesStatus = 'FALLO';
  else if (hasMinorLevelErrors) nivelesStatus = 'ALERTA';
  
  trackStatus(nivelesStatus);

  // 10. Rejillas (Verificar pineado)
  const grids = (bimData.codechecking?.rejillas?.listado || []).map(g => {
    const gAny = g as any;
    return {
      ...g,
      esta_pineado: gAny.esta_pineado !== undefined ? gAny.esta_pineado : (gAny.pineado !== undefined ? gAny.pineado : null)
    };
  });
  const uniqueGridTypes = Array.from(
    new Set(grids.map((g) => g.tipo_curva))
  ).length;

  // NUEVO: Verificar rejillas no pineadas
  const unpinnedGrids = grids.filter(g => g.esta_pineado === false).map(g => g.nombre);
  const noInfoGrids = grids.filter(g => g.esta_pineado === null).map(g => g.nombre);

  let rejillasStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  if (uniqueGridTypes >= 5) {
    rejillasStatus = 'FALLO';
  } else if (uniqueGridTypes === 4 || unpinnedGrids.length > 0) {
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
      opcionesDiseno: { status: opcionesDisenoStatus, details: designOptionsDetails },
      fases: { status: fasesStatus, details: invalidPhasesDetails },
      niveles: { status: nivelesStatus, groupedErrors },
      rejillas: { status: rejillasStatus, uniqueTypes: uniqueGridTypes, unpinnedGrids, noInfoGrids },
    },
  };
};

export interface Phase2AuditReport {
  summary: {
    totalChecks: number;
    good: number;
    alert: number;
    failed: number;
  };
  results: {
    vistas: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number;
      maxAllowed: number;
      message: string;
      nomenclaturaRegla?: string;
    };
    plantillas_vista: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number; 
      unused: number;
      message: string;
      nomenclaturaRegla?: string;
    };
    planos: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number;
      maxAllowed: number;
      message: string;
      nomenclaturaRegla?: string;
    };
    tablas: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number;
      maxAllowed: number;
      message: string;
      nomenclaturaRegla?: string;
    };
    habitaciones: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number; 
      unclosed: number;
      required: boolean;
      message: string;
    };
    vinculos_cad: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number; 
      unpinned: { name: string; view: string; id?: string | number }[]; 
      visibleInAllViews: { name: string; view: string; id?: string | number }[]; 
      message: string;
    };
    parametros: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number; 
      projectParams: number; 
      sharedParams: number; 
      missingRequired: string[];
      foundRequired: string[];
      totalRequired: number;
      message: string;
    };
    grupos_anotacion: { 
      status: 'BUENO' | 'ALERTA' | 'FALLO'; 
      total: number; 
      unpinned: { name: string; id?: string | number }[]; 
      message: string;
    };
  };
}

/**
 * Motor de auditoría para la Fase 2: Elementos de Detalle y Anotación
 */
export const auditPhase2 = (
  bimData: RevitBimData,
  config?: AuditConfig,
  file?: ProjectFile
): Phase2AuditReport => {
  const cc: any = bimData?.codechecking || {};
  const detailCfg = config?.detailElements || DEFAULT_DETAIL_ELEMENTS_CONFIG;

  const summary = {
    totalChecks: 8,
    good: 0,
    alert: 0,
    failed: 0,
  };

  const trackStatus = (st: 'BUENO' | 'ALERTA' | 'FALLO') => {
    if (st === 'BUENO') summary.good++;
    else if (st === 'ALERTA') summary.alert++;
    else summary.failed++;
  };

  // 1. Vistas (Límite: < 500, > 500 es advertencia)
  const maxVistas = detailCfg.maxVistas ?? 500;
  const vistasTotal = cc.vistas?.cantidad || cc.vistas?.listado?.length || 0;
  let vistasStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let vistasMessage = `Total: ${vistasTotal} vistas (Límite: < ${maxVistas})`;
  if (vistasTotal > maxVistas) {
    vistasStatus = 'ALERTA';
    vistasMessage = `Supera el límite de ${maxVistas} vistas (${vistasTotal} encontradas)`;
  }
  trackStatus(vistasStatus);

  // 2. Plantillas de vistas (Sin usar = alerta)
  const plantillasTotal = cc.plantillas_vista?.cantidad || cc.plantillas_vista?.listado?.length || 0;
  const plantillasUnused = cc.plantillas_vista?.cantidad_sin_usar ?? 
    (cc.plantillas_vista?.listado ? cc.plantillas_vista.listado.filter((p: any) => p.usada === false).length : 0);
  const plantillasStatus: 'BUENO' | 'ALERTA' | 'FALLO' = plantillasUnused > 0 ? 'ALERTA' : 'BUENO';
  const plantillasMessage = plantillasUnused > 0 
    ? `${plantillasUnused} plantillas sin asignar a vistas`
    : `Todas las plantillas están asignadas y en uso`;
  trackStatus(plantillasStatus);

  // 3. Planos (Límite: < 200, > 200 es advertencia)
  const maxPlanos = detailCfg.maxPlanos ?? 200;
  const planosTotal = cc.planos?.cantidad || cc.planos?.listado?.length || 0;
  let planosStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let planosMessage = `Total: ${planosTotal} planos (Límite: < ${maxPlanos})`;
  if (planosTotal > maxPlanos) {
    planosStatus = 'ALERTA';
    planosMessage = `Supera el límite de ${maxPlanos} planos (${planosTotal} encontrados)`;
  }
  trackStatus(planosStatus);

  // 4. Tablas (Límite: < 40, > 40 es advertencia)
  const maxTablas = detailCfg.maxTablas ?? 40;
  const tablasTotal = cc.tablas?.cantidad || cc.tablas?.listado?.length || 0;
  let tablasStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let tablasMessage = `Total: ${tablasTotal} tablas (Límite: < ${maxTablas})`;
  if (tablasTotal > maxTablas) {
    tablasStatus = 'ALERTA';
    tablasMessage = `Supera el límite de ${maxTablas} tablas (${tablasTotal} encontradas)`;
  }
  trackStatus(tablasStatus);

  // 5. Habitaciones (Manual por modelo: Cantidad + Habitaciones sin cerrar = error)
  const fileId = file?.id || '';
  const fileDisc = (file?.modelType || bimData?.modelo?.disciplina?.toLowerCase() || 'otro') as ModelDiscipline;
  
  let shouldHaveRooms = false;
  if (detailCfg.habitacionesPorModelo && typeof detailCfg.habitacionesPorModelo[fileId] === 'boolean') {
    shouldHaveRooms = detailCfg.habitacionesPorModelo[fileId];
  } else if (detailCfg.habitacionesPorDisciplina && typeof detailCfg.habitacionesPorDisciplina[fileDisc] === 'boolean') {
    shouldHaveRooms = detailCfg.habitacionesPorDisciplina[fileDisc]!;
  } else {
    shouldHaveRooms = fileDisc === 'arquitectura';
  }

  const habTotal = cc.habitaciones?.cantidad || cc.habitaciones?.listado?.length || 0;
  const habUnclosed = cc.habitaciones?.cantidad_sin_cerrar ?? 
    (cc.habitaciones?.listado ? cc.habitaciones.listado.filter((h: any) => h.cerrada === false).length : 0);
  
  let habStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let habMessage = '';

  if (shouldHaveRooms) {
    if (habUnclosed > 0) {
      habStatus = 'FALLO';
      habMessage = `${habUnclosed} habitación(es) sin cerrar (Error crítico de delimitación)`;
    } else if (habTotal === 0) {
      habStatus = 'ALERTA';
      habMessage = `El modelo requiere habitaciones pero no se encontró ninguna`;
    } else {
      habStatus = 'BUENO';
      habMessage = `Total: ${habTotal} habitaciones delimitadas y cerradas`;
    }
  } else {
    if (habTotal > 0) {
      habStatus = 'ALERTA';
      habMessage = `Este modelo no debería tener habitaciones (${habTotal} encontradas)`;
    } else {
      habStatus = 'BUENO';
      habMessage = `Sin habitaciones (conforme a los requisitos de esta disciplina)`;
    }
  }
  trackStatus(habStatus);

  // 6. Vínculos de CAD (Sin pinear = advertencia con su vista; Visible en todas las vistas = error)
  const cadList: any[] = cc.vinculos_cad?.listado || [];
  const cadTotal = cc.vinculos_cad?.cantidad ?? cadList.length;
  
  const cadUnpinned = cadList
    .filter((c: any) => c.pineado === false || c.esta_pineado === false)
    .map((c: any) => ({
      name: c.nombre || 'CAD sin nombre',
      view: c.vista_vinculada_nombre || c.vista_vinculada || 'Vista no especificada',
      id: c.id || (Array.isArray(c.ids) ? c.ids.join(', ') : undefined)
    }));

  const cadVisibleAll = cadList
    .filter((c: any) => c.visible_en_todas_las_vistas === true)
    .map((c: any) => ({
      name: c.nombre || 'CAD sin nombre',
      view: 'Visible en todas las vistas (no restringido)',
      id: c.id || (Array.isArray(c.ids) ? c.ids.join(', ') : undefined)
    }));

  let cadStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let cadMessage = 'Todos los vínculos CAD están pineados y limitados a su vista';

  if (cadVisibleAll.length > 0) {
    cadStatus = 'FALLO';
    cadMessage = `${cadVisibleAll.length} vínculo(s) CAD visible(s) en todas las vistas (Error)`;
  } else if (cadUnpinned.length > 0) {
    cadStatus = 'ALERTA';
    cadMessage = `${cadUnpinned.length} vínculo(s) CAD sin bloquear/pinear`;
  }
  trackStatus(cadStatus);

  // 7. Parámetros (Comprobar los 26 parámetros obligatorios SAS)
  const paramTotal = cc.parametros_proyecto_y_compartidos?.cantidad || cc.parametros_proyecto_y_compartidos?.listado?.length || 0;
  const paramList: any[] = [
    ...(cc.parametros_proyecto_y_compartidos?.listado || []),
    ...(cc.parametros_proyecto?.listado || []),
    ...(cc.parametros_compartidos?.listado || []),
    ...(cc.informacion_general?.parametros_informacion_proyecto || [])
  ];

  const existingParamNames = new Set<string>();
  paramList.forEach((p: any) => {
    if (p && p.nombre) {
      existingParamNames.add(String(p.nombre).trim().toUpperCase());
    }
  });

  const requiredSAS = detailCfg.requiredParameters || DEFAULT_REQUIRED_SAS_PARAMETERS;
  const foundRequired: string[] = [];
  const missingRequired: string[] = [];

  requiredSAS.forEach(req => {
    const cleanReq = req.trim().toUpperCase();
    if (existingParamNames.has(cleanReq)) {
      foundRequired.push(req);
    } else {
      missingRequired.push(req);
    }
  });

  const projectParamsCount = cc.parametros_proyecto_y_compartidos?.cantidad_proyecto ?? 
    (cc.parametros_proyecto?.listado?.length ?? 
      (cc.parametros_proyecto_y_compartidos?.listado || []).filter((p: any) => !p.es_compartido && p.tipo_parametro !== 'compartido').length);

  const sharedParamsCount = cc.parametros_proyecto_y_compartidos?.cantidad_compartidos ?? 
    (cc.parametros_compartidos?.listado?.length ?? 
      (cc.parametros_proyecto_y_compartidos?.listado || []).filter((p: any) => p.es_compartido || p.tipo_parametro === 'compartido').length);

  let paramStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let paramMessage = `Todos los parámetros SAS requeridos (${foundRequired.length}/${requiredSAS.length}) están presentes`;
  if (missingRequired.length > 0) {
    paramStatus = 'FALLO';
    paramMessage = `Faltan ${missingRequired.length} de los ${requiredSAS.length} parámetros SAS obligatorios`;
  }
  trackStatus(paramStatus);

  // 8. Grupos de anotación (Sin pinear = advertencia)
  const groupsList: any[] = cc.grupos_anotacion?.listado || [];
  const groupsTotal = cc.grupos_anotacion?.cantidad ?? groupsList.length;
  const groupsUnpinned = groupsList
    .filter((g: any) => g.pineado === false || g.esta_pineado === false)
    .map((g: any) => ({
      name: g.nombre || 'Grupo sin nombre',
      id: g.id || (Array.isArray(g.ids) ? g.ids.join(', ') : undefined)
    }));

  let groupsStatus: 'BUENO' | 'ALERTA' | 'FALLO' = 'BUENO';
  let groupsMessage = `Todos los grupos de anotación están pineados (${groupsTotal} grupos)`;
  if (groupsUnpinned.length > 0) {
    groupsStatus = 'ALERTA';
    groupsMessage = `${groupsUnpinned.length} grupo(s) de anotación sin pinear`;
  }
  trackStatus(groupsStatus);

  return {
    summary,
    results: {
      vistas: { 
        status: vistasStatus, 
        total: vistasTotal,
        maxAllowed: maxVistas,
        message: vistasMessage,
        nomenclaturaRegla: detailCfg.vistasNomenclaturaRegla || ''
      },
      plantillas_vista: { 
        status: plantillasStatus, 
        total: plantillasTotal, 
        unused: plantillasUnused,
        message: plantillasMessage,
        nomenclaturaRegla: detailCfg.plantillasNomenclaturaRegla || ''
      },
      planos: { 
        status: planosStatus, 
        total: planosTotal,
        maxAllowed: maxPlanos,
        message: planosMessage,
        nomenclaturaRegla: detailCfg.planosNomenclaturaRegla || ''
      },
      tablas: { 
        status: tablasStatus, 
        total: tablasTotal,
        maxAllowed: maxTablas,
        message: tablasMessage,
        nomenclaturaRegla: detailCfg.tablasNomenclaturaRegla || ''
      },
      habitaciones: { 
        status: habStatus, 
        total: habTotal, 
        unclosed: habUnclosed,
        required: shouldHaveRooms,
        message: habMessage
      },
      vinculos_cad: { 
        status: cadStatus, 
        total: cadTotal, 
        unpinned: cadUnpinned, 
        visibleInAllViews: cadVisibleAll,
        message: cadMessage
      },
      parametros: { 
        status: paramStatus, 
        total: paramTotal, 
        projectParams: projectParamsCount, 
        sharedParams: sharedParamsCount,
        missingRequired,
        foundRequired,
        totalRequired: requiredSAS.length,
        message: paramMessage
      },
      grupos_anotacion: { 
        status: groupsStatus, 
        total: groupsTotal, 
        unpinned: groupsUnpinned,
        message: groupsMessage
      },
    },
  };
};
