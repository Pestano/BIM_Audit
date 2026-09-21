/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- FASE 1: CONFIGURACIÓN INICIAL ---

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
    informacion_general: {
      tamano_archivo_mb: number;
      parametros_informacion_proyecto: {
        nombre: string;
        valor: any;
        storage_type: string;
        solo_lectura: boolean;
        parametro_id: number;
      }[];
    };
    nombre_modelo: {
      nombre_archivo: string;
    };
    coordenadas: {
      punto_base_proyecto: {
        norte_sur_m: number;
        este_oeste_m: number;
        elevacion_m: number;
        angulo_norte_grados?: number;
        esta_pineado: boolean;
      };
      punto_reconocimiento: {
        norte_sur_m: number;
        este_oeste_m: number;
        elevacion_m: number;
        esta_pineado: boolean;
      };
    };
    subproyectos: {
      cantidad_worksets: number;
      existentes: {
        nombre: string;
        workset_id: number;
        num_elementos: number;
        vacio: boolean;
      }[];
    };
    warnings: {
      total_incidencias: number;
      tipos_distintos: number;
      detalle: RevitWarningDetail[];
    };
    filtros_vista: {
      total_filtros: number;
      nombres_filtros: string[];
      sin_usar_cantidad: number;
      sin_usar_nombres: string[];
    };
    opciones_diseno: {
      existen: boolean;
      cantidad: number;
      listado: any[];
    };
    fases: {
      existen: boolean;
      cantidad: number;
      listado: string[];
      elementos_por_fase?: { fase: string; cantidad: number }[];
    };
    niveles: {
      cantidad: number;
      listado: {
        id: number;
        nombre: string;
        elevacion_m: number;
        es_nivel_edificio?: boolean;
        es_estructura?: boolean;
        esta_pineado: boolean;
      }[];
    };
    rejillas: {
      cantidad: number;
      listado: {
        id: number;
        nombre: string;
        tipo_curva: string;
        esta_pineado: boolean;
      }[];
    };
  };
}

// --- FASE 2: ELEMENTOS DE ANOTACIÓN Y DOCUMENTACIÓN ---

export interface VistaItem {
  id: number;
  nombre: string;
}

export interface PlantillaVistaItem {
  id: number;
  nombre: string;
  usada: boolean;
}

export interface PlanoItem {
  id: number;
  numero_plano: string;
  nombre: string;
}

export interface TablaItem {
  id: number;
  nombre: string;
}

export interface HabitacionItem {
  id: number;
  nombre: string;
}

export interface CadLinkItem {
  id: number;
  nombre: string;
  vista_vinculada_id: number;
  vista_vinculada_nombre: string;
  visible_en_todas_las_vistas: boolean;
  pineado: boolean;
}

export interface ParametroItem {
  nombre: string;
  tipo: string;
  es_compartido: boolean;
}

export interface GrupoAnotacionItem {
  id: number;
  nombre: string;
  pineado: boolean;
}

export interface RevitAnnotationData {
  schema_version?: string;
  fase_auditoria: string;
  fecha_exportacion: string;
  modelo: {
    nombre_archivo: string;
    revit_version: string;
    disciplina?: string;
  };
  codechecking: {
    vistas: {
      cantidad: number;
      listado: VistaItem[];
    };
    plantillas_vista: {
      cantidad: number;
      cantidad_sin_usar: number;
      listado: PlantillaVistaItem[];
    };
    planos: {
      cantidad: number;
      listado: PlanoItem[];
    };
    tablas: {
      cantidad: number;
      listado: TablaItem[];
    };
    habitaciones: {
      cantidad: number;
      cantidad_sin_cerrar: number;
      listado: HabitacionItem[];
    };
    vinculos_cad: {
      cantidad: number;
      listado: CadLinkItem[];
    };
    parametros_proyecto_y_compartidos: {
      cantidad: number;
      listado: ParametroItem[];
    };
    grupos_anotacion: {
      cantidad: number;
      listado: GrupoAnotacionItem[];
    };
  };
}

// --- CONFIGURACIONES GENERALES Y PROYECTO ---

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

export interface ProjectFile {
  id: string;
  name: string;               // Nombre del archivo .json original
  customName?: string;        // Nombre personalizado/etiqueta del modelo
  modelType?: ModelDiscipline;// Disciplina o tipo de modelo (estructura, arquitectura, etc.)
  auditPhase?: string;        // Fase de auditoría ('ConfiguracionInicial' | 'DocumentacionYElementos')
  date: string;
  createdAt: string;
  elementCount: number;
  data: RevitBimData | RevitAnnotationData;
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
}

export interface Project {
  id: string;
  name: string;
  lastModified: string;
  files: ProjectFile[];
  auditConfig?: AuditConfig;
}