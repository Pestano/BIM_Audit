/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RevitWarningDetail {
  tipo_warning: string;
  cantidad_incidencias: number;
  elementos_ids: number[];
  categorias_afectadas: string[];
}

export interface RevitBimData {
  fase_auditoria: string;
  fecha_exportacion: string;
  modelo: {
    nombre_archivo: string;
    disciplina: string;
    revit_version: string;
  };
  codechecking: {
    [key: string]: any;
    informacion_general?: {
      tamano_archivo_mb: number;
      parametros_informacion_proyecto: {
        nombre: string;
        valor: any;
        storage_type: string;
        solo_lectura: boolean;
        parametro_id: number;
      }[];
    };
    nombre_modelo?: {
      nombre_archivo: string;
    };
    coordenadas?: {
      punto_base_proyecto: {
        norte_sur_m: number;
        este_oeste_m: number;
        elevacion_m: number;
        angulo_norte_grados?: number;
        esta_pineado?: boolean;
        pineado?: boolean;
      };
      punto_reconocimiento: {
        norte_sur_m: number;
        este_oeste_m: number;
        elevacion_m: number;
        esta_pineado?: boolean;
        pineado?: boolean;
      };
    };
    subproyectos?: {
      cantidad_worksets: number;
      existentes: {
        nombre: string;
        workset_id: number;
        num_elementos: number;
        vacio: boolean;
      }[];
    };
    warnings?: {
      total_incidencias: number;
      tipos_distintos: number;
      detalle: RevitWarningDetail[];
    };
    filtros_vista?: {
      total_filtros: number;
      nombres_filtros: string[];
      sin_usar_cantidad: number;
      sin_usar_nombres: string[];
    };
    opciones_diseno?: {
      existen?: boolean;
      cantidad?: number;
      listado?: (string | any)[];
      elementos_por_opcion?: any;
      conteo?: Record<string, number>;
      elementos?: Record<string, number>;
      [key: string]: any;
    };
    fases?: {
      existen?: boolean;
      cantidad?: number;
      listado?: (string | any)[];
      elementos_por_fase?: any;
      conteo?: Record<string, number>;
      elementos?: Record<string, number>;
      [key: string]: any;
    };
    niveles?: {
      cantidad: number;
      listado: {
        id: number;
        nombre: string;
        elevacion_m: number;
        es_nivel_edificio?: boolean;
        es_estructura?: boolean;
        esta_pineado?: boolean;
        pineado?: boolean;
      }[];
    };
    rejillas?: {
      cantidad: number;
      listado: {
        id: number;
        nombre: string;
        tipo_curva: string;
        esta_pineado?: boolean;
        pineado?: boolean;
      }[];
    };
    // NUEVA FASE: Documentación y Elementos de Anotación
    vistas?: {
      cantidad: number;
      listado: { id: number | string; nombre: string; tipo?: string }[];
    };
    plantillas_vista?: {
      cantidad: number;
      cantidad_sin_usar: number;
      listado: { id: number | string; nombre: string; usada?: boolean }[];
    };
    planos?: {
      cantidad: number;
      listado: { id: number | string; numero_plano?: string; nombre: string }[];
    };
    tablas?: {
      cantidad: number;
      listado: { id: number | string; nombre: string; tipo?: string }[];
    };
    habitaciones?: {
      cantidad: number;
      cantidad_sin_cerrar: number;
      listado: { 
        id: number | string; 
        nombre: string; 
        numero?: string;
        cerrada?: boolean;
        area_m2?: number;
      }[];
    };
    vinculos_cad?: {
      cantidad: number;
      listado: {
        id?: number | string;
        ids?: (number | string)[];
        nombre: string;
        vista_vinculada_id?: number | string;
        vista_vinculada_nombre?: string;
        vista_vinculada?: string;
        visible_en_todas_las_vistas?: boolean;
        pineado?: boolean;
        esta_pineado?: boolean;
      }[];
    };
    parametros_proyecto_y_compartidos?: {
      cantidad: number;
      cantidad_proyecto?: number;
      cantidad_compartidos?: number;
      listado: { 
        id?: number | string;
        nombre: string; 
        tipo?: string; 
        es_compartido?: boolean;
        tipo_parametro?: 'proyecto' | 'compartido' | string;
      }[];
    };
    parametros_proyecto?: {
      cantidad: number;
      listado: { id?: number | string; nombre: string; tipo?: string }[];
    };
    parametros_compartidos?: {
      cantidad: number;
      listado: { id?: number | string; nombre: string; tipo?: string }[];
    };
    grupos_anotacion?: {
      cantidad: number;
      listado: { 
        id?: number | string; 
        ids?: (number | string)[];
        nombre: string; 
        pineado?: boolean;
        esta_pineado?: boolean;
      }[];
    };
  };
}

export type ModelDiscipline = 'estructura' | 'arquitectura' | 'instalaciones' | 'urbanizacion' | 'federado' | 'otro';

export interface DisciplineAuditConfig {
  expectedWorksets: string[];
  expectedLevels: { 
    nombre: string; 
    elevacion_m: number;
    requiereEstructura?: boolean;
    requiereNivelEdificio?: boolean;
  }[];
}

export type ViewNomenclatureType =
  | 'plantas'
  | 'alzados'
  | 'secciones'
  | 'vistas3d'
  | 'detalles'
  | 'techos';

export type NomenclatureFieldType = 'codes' | 'free' | 'dimension' | 'dimension_pair';

export interface DimensionFieldConfig {
  allowedUnits: string[];
  allowDecimals: boolean;
  separator?: string; // Solo para dimension_pair. Por defecto: x
}

export interface NomenclatureField {
  id: string;
  name: string;
  type: NomenclatureFieldType;
  codes: string[];
  dimensionConfig?: DimensionFieldConfig;
}

export interface StructuredNomenclatureRule {
  libre: boolean;
  fields: NomenclatureField[];
}

export type ViewNomenclatureRule = StructuredNomenclatureRule;
export type ViewNomenclatureConfig = Record<ViewNomenclatureType, ViewNomenclatureRule>;

export interface DetailElementsAuditConfig {
  maxVistas?: number;                     // Límite máximo de vistas (por defecto: 500)
  vistasNomenclaturaRegla?: string;      // Compatibilidad con configuraciones antiguas
  vistasNomenclaturaPorTipo?: ViewNomenclatureConfig; // Reglas específicas por tipo de vista

  maxPlantillasSinUsar?: number;          // Tolerancia de plantillas sin usar (por defecto: 0)
  plantillasNomenclaturaRegla?: string;   // Compatibilidad con configuraciones antiguas
  plantillasNomenclaturaLibre?: boolean;  // Compatibilidad con configuraciones antiguas
  plantillasNomenclatura?: StructuredNomenclatureRule; // Reglas estructuradas por campos

  maxPlanos?: number;                     // Límite máximo de planos (por defecto: 200)
  planosNomenclaturaRegla?: string;       // Compatibilidad con configuraciones antiguas
  planosNomenclaturaLibre?: boolean;      // Compatibilidad con configuraciones antiguas
  planosNomenclatura?: StructuredNomenclatureRule; // Reglas estructuradas por campos

  maxTablas?: number;                     // Límite máximo de tablas (por defecto: 40)
  tablasNomenclaturaRegla?: string;       // Compatibilidad con configuraciones antiguas
  tablasNomenclaturaLibre?: boolean;      // Compatibilidad con configuraciones antiguas
  tablasNomenclatura?: StructuredNomenclatureRule; // Reglas estructuradas por campos

  habitacionesPorDisciplina?: Partial<Record<ModelDiscipline, boolean>>; // Si la disciplina requiere habitaciones
  habitacionesPorModelo?: Record<string, boolean>;                       // Requisito manual por ID de modelo/archivo

  requiereCadPineado?: boolean;           // Si los vínculos de CAD deben estar pineados (alerta si no)
  prohibirCadVisibleEnTodas?: boolean;    // Prohibir CAD visible en todas las vistas (error si lo está)

  requiredParameters?: string[];          // Parámetros obligatorios del modelo (SAS)

  requiereGruposPineados?: boolean;       // Si los grupos de anotación deben estar pineados (alerta si no)
}

export const DEFAULT_REQUIRED_SAS_PARAMETERS: string[] = [
  // Bloque 01: Identificación y Clasificación
  "01_01_SAS_PROYECTO",
  "01_02_SAS_LOCALIZADOR",
  "01_03_SAS_CLASIFICACION",
  "01_04_SAS_DISCIPLINA",
  "01_05_SAS_SUBDISCIPLINA",
  "01_06_SAS_COD_PRESUP",

  // Bloque 02: Geometría y Dimensiones
  "02_02_SAS_LONGITUD",
  "02_02_SAS_ALTURA",
  "02_03_SAS_ESPESOR",
  "02_04_SAS_AREA",
  "02_05_SAS_VOLUMEN",

  // Bloque 03: Partidas y Medición
  "03_01_SAS_UNIDAD",
  "03_02_SAS_COD_PARTIDA",
  "03_03_SAS_NOMBRE_RESUMIDO",
  "03_04_SAS_DESCRIPCION_PARTIDA",

  // Bloque 04: Gestión y Presupuesto
  "04_01_SAS_FASE",
  "04_02_SAS_PLANOS",
  "04_03_SAS_PPTP",
  "04_04_SAS_CAP_PRESUP",
  "04_05_SAS_SUBCAP_PRESUP",
  "04_06_SAS_UD_PRESUP",

  // Bloque 05: Documentación y Calidad
  "05_01_SAS_MARCADO_CE",
  "05_02_SAS_FICHAS_TECNICAS",
  "05_03_SAS_DECLARAN_PRESTACIONES",
  "05_04_SAS_MANUALES",
  "05_05_SAS_ENSAYOS",
  "05_06_SAS_ALBARANES"
];

export const DEFAULT_DETAIL_ELEMENTS_CONFIG: DetailElementsAuditConfig = {
  maxVistas: 500,
  vistasNomenclaturaRegla: '',
  vistasNomenclaturaPorTipo: {
    plantas: { libre: false, fields: [] },
    alzados: { libre: false, fields: [] },
    secciones: { libre: false, fields: [] },
    vistas3d: { libre: false, fields: [] },
    detalles: { libre: false, fields: [] },
    techos: { libre: false, fields: [] },
  },

  maxPlantillasSinUsar: 0,
  plantillasNomenclaturaRegla: '',
  plantillasNomenclaturaLibre: false,
  plantillasNomenclatura: { libre: false, fields: [] },

  maxPlanos: 200,
  planosNomenclaturaRegla: '',
  planosNomenclaturaLibre: false,
  planosNomenclatura: { libre: false, fields: [] },

  maxTablas: 40,
  tablasNomenclaturaRegla: '',
  tablasNomenclaturaLibre: false,
  tablasNomenclatura: { libre: false, fields: [] },

  habitacionesPorDisciplina: {
    arquitectura: true,
    estructura: false,
    instalaciones: false,
    urbanizacion: false,
    federado: false,
    otro: false,
  },
  habitacionesPorModelo: {},

  requiereCadPineado: true,
  prohibirCadVisibleEnTodas: true,

  requiredParameters: [...DEFAULT_REQUIRED_SAS_PARAMETERS],

  requiereGruposPineados: true,
};


export type Elements3DNomenclatureField = NomenclatureField;

export type BooleanAuditExpectation = 'ignore' | 'required_true' | 'required_false';

export interface WallDisciplineAuditRules {
  roomBounding: BooleanAuditExpectation;
  structural: BooleanAuditExpectation;
}

export interface Elements3DCategoryAuditConfig {
  enabled?: boolean;
  nomenclatureFields: Elements3DNomenclatureField[];
}

export interface Elements3DAuditConfig {
  nomenclatureByCategory: Record<string, Elements3DCategoryAuditConfig>;
  wallRulesByDiscipline?: Partial<Record<ModelDiscipline, WallDisciplineAuditRules>>;
}

export const DEFAULT_ELEMENTS_3D_CONFIG: Elements3DAuditConfig = {
  nomenclatureByCategory: {},
  wallRulesByDiscipline: {
    arquitectura: { roomBounding: 'required_true', structural: 'ignore' },
    instalaciones: { roomBounding: 'required_true', structural: 'required_true' },
    estructura: { roomBounding: 'ignore', structural: 'ignore' },
    urbanizacion: { roomBounding: 'ignore', structural: 'ignore' },
    federado: { roomBounding: 'ignore', structural: 'ignore' },
    otro: { roomBounding: 'ignore', structural: 'ignore' },
  }
};

export interface ProjectFile {
  id: string;
  name: string;               // Nombre del archivo .json original o principal
  customName?: string;        // Nombre personalizado/etiqueta del modelo
  modelType?: ModelDiscipline;// Disciplina o tipo de modelo (estructura, arquitectura, etc.)
  auditPhase?: string;        // Fase de auditoría (por defecto: 'Configuración General')
  date: string;
  createdAt: string;
  elementCount: number;
  data: RevitBimData;
  // Copias separadas por fase. Evitan mezclar datos de Configuración y Anotación entre modelos/fases.
  configData?: RevitBimData;
  anotacionData?: RevitBimData;

  // Propiedades de unificación multisesión / multifase
  hasConfigData?: boolean;
  hasAnotacionData?: boolean;
  has3DData?: boolean;
  model3DFileName?: string;
  model3DImportedAt?: string;     // Momento real de importación/actualización en la app (ISO)
  model3DExportedAt?: string;     // fecha_exportacion leída literalmente del JSON
  model3DCreatedAt?: string;      // legacy
  model3DElementCount?: number;
  model3DData?: any;
  configFileName?: string;
  configImportedAt?: string;      // Momento real de importación/actualización en la app (ISO)
  configExportedAt?: string;      // fecha_exportacion leída literalmente del JSON
  configCreatedAt?: string;       // legacy
  configElementCount?: number;
  anotacionFileName?: string;
  anotacionImportedAt?: string;   // Momento real de importación/actualización en la app (ISO)
  anotacionExportedAt?: string;   // fecha_exportacion leída literalmente del JSON
  anotacionCreatedAt?: string;    // legacy
  anotacionElementCount?: number;
}

export interface AuditConfig {
  auditPhase?: string;        // Fase de auditoría ('Configuración General')
  projectCode: string;
  revitVersion: string;
  expectedCoordinates: {
    basePoint: { norte_sur_m: number; este_oeste_m: number; elevacion_m: number; angulo_norte_grados: number };
    surveyPoint: { norte_sur_m: number; este_oeste_m: number; elevacion_m: number };
  };
  // Listas fallback / por defecto
  expectedWorksets: string[];
  expectedLevels: { 
    nombre: string; 
    elevacion_m: number;
    requiereEstructura?: boolean;
    requiereNivelEdificio?: boolean;
  }[];
  // Configuraciones específicas para cada disciplina de modelo (est, arq, inst, urb, fed)
  byDiscipline?: Partial<Record<ModelDiscipline, DisciplineAuditConfig>>;
  // Requisitos y tolerancias de auditoría para Elementos de Detalle / Anotación
  detailElements?: DetailElementsAuditConfig;
  // Reglas de auditoría para elementos 3D (por categoría)
  elements3D?: Elements3DAuditConfig;
}

export interface Project {
  id: string;
  name: string;
  lastModified: string;
  files: ProjectFile[];
  auditConfig?: AuditConfig;
}

export interface ProjectPhaseInfo {
  nombre: string;
  cantidad: number;
  tieneConteo: boolean;
  esNuevaConstruccion?: boolean;
}

export interface ProjectDesignOptionInfo {
  nombre: string;
  cantidad: number;
  tieneConteo: boolean;
  esPrincipal?: boolean;
}
