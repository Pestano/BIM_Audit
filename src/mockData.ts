/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, RevitBimData, DEFAULT_DETAIL_ELEMENTS_CONFIG } from './types';

const mockBimData: RevitBimData = {
  "fase_auditoria": "CodigosInternos",
  "fecha_exportacion": "2026-09-17T09:24:59",
  "modelo": {
    "nombre_archivo": "HMM-BCI-CO-ZZ-MOD-EST-R25_adrianapestano.rvt",
    "disciplina": "EST",
    "revit_version": "2025"
  },
  "codechecking": {
    "informacion_general": {
      "tamano_archivo_mb": 19.739999999999998,
      "parametros_informacion_proyecto": [
        { "nombre": "Autor", "valor": "BILBA", "storage_type": "String", "solo_lectura": false, "parametro_id": -1019005 },
        { "nombre": "BB_00_INF_AcronimoProyecto", "valor": "250477", "storage_type": "String", "solo_lectura": false, "parametro_id": 275558 },
        { "nombre": "Dirección de proyecto", "valor": "Hospital Materno Infantil de Málaga", "storage_type": "String", "solo_lectura": false, "parametro_id": -1006318 },
        { "nombre": "Estado de proyecto", "valor": "OBRA", "storage_type": "String", "solo_lectura": false, "parametro_id": -1006320 },
        { "nombre": "Nombre de proyecto", "valor": "REFORMA MATERNO INFANTIL MALAGA. CENTRO PROTONTERAPIA", "storage_type": "String", "solo_lectura": false, "parametro_id": -1006317 },
        { "nombre": "Nombre del edificio", "valor": "EST", "storage_type": "String", "solo_lectura": false, "parametro_id": -1019006 },
        { "nombre": "Número de proyecto", "valor": "250477", "storage_type": "String", "solo_lectura": false, "parametro_id": -1006316 }
      ]
    },
    "nombre_modelo": {
      "nombre_archivo": "HMM-BCI-CO-ZZ-MOD-EST-R25_adrianapestano.rvt"
    },
    "coordenadas": {
      "punto_base_proyecto": {
        "norte_sur_m": 4065795.696,
        "este_oeste_m": 372200.40500000003,
        "elevacion_m": 20.629999999999999,
        "angulo_norte_grados": 25.384,
        "esta_pineado": true
      },
      "punto_reconocimiento": {
        "norte_sur_m": 4065795.696,
        "este_oeste_m": 372200.40500000003,
        "elevacion_m": 20.629999999999999,
        "esta_pineado": true
      }
    },
    "subproyectos": {
      "cantidad_worksets": 9,
      "existentes": [
        { "nombre": "BB_2.01.EST-CimentacionEstructural", "workset_id": 307, "num_elementos": 0, "vacio": true },
        { "nombre": "BB_2.02.EST-Estructura", "workset_id": 308, "num_elementos": 3523, "vacio": false },
        { "nombre": "BB_2.03.EST-Pilares", "workset_id": 309, "num_elementos": 59, "vacio": false },
        { "nombre": "Niveles y rejillas compartidos", "workset_id": 182, "num_elementos": 10, "vacio": false },
        { "nombre": "Subproyecto1", "workset_id": 0, "num_elementos": 123, "vacio": false },
        { "nombre": "ZZ_BB-CAD_LINK", "workset_id": 312, "num_elementos": 0, "vacio": true },
        { "nombre": "ZZ_BB-RVT_LINK", "workset_id": 313, "num_elementos": 3, "vacio": false }
      ]
    },
    "warnings": {
      "total_incidencias": 58,
      "tipos_distintos": 7,
      "detalle": [
        {
          "tipo_warning": "Los elementos tienen valores \"Marca\" duplicados.",
          "cantidad_incidencias": 26,
          "elementos_ids": [164743, 167503, 167563, 167579, 167710, 167711, 167713],
          "categorias_afectadas": ["Pilares estructurales"]
        },
        {
          "tipo_warning": "El elemento se desenlazará del plano al que está asociado",
          "cantidad_incidencias": 10,
          "elementos_ids": [185586, 195250, 304325],
          "categorias_afectadas": ["Armazón estructural"]
        }
      ]
    },
    "filtros_vista": {
      "total_filtros": 5,
      "nombres_filtros": ["BB_NoBunker", "BB_SEC_OBRA_Existente", "BB_SEC_OBRA_Nuevo", "BUNKER", "Interior"],
      "sin_usar_cantidad": 3,
      "sin_usar_nombres": ["BB_SEC_OBRA_Existente", "BB_SEC_OBRA_Nuevo", "Interior"]
    },
    "opciones_diseno": { "existen": false, "cantidad": 0, "listado": [] },
    "fases": { 
      "existen": true, 
      "cantidad": 2, 
      "listado": ["Existente", "Nueva construcción"],
      "elementos_por_fase": [
        { "fase": "Existente", "cantidad": 0 },
        { "fase": "Nueva construcción", "cantidad": 3850 }
      ]
    },
    "niveles": {
      "cantidad": 11,
      "listado": [
        { "id": 162976, "nombre": "S-3_EST", "elevacion_m": -7.1, "es_nivel_edificio": true, "es_estructura": true, "esta_pineado": true },
        { "id": 163440, "nombre": "N+0 EST", "elevacion_m": 3.7, "es_nivel_edificio": true, "es_estructura": true, "esta_pineado": true },
        { "id": 163782, "nombre": "N+3", "elevacion_m": 13.7, "es_nivel_edificio": false, "es_estructura": false, "esta_pineado": true }
      ]
    },
    "rejillas": {
      "cantidad": 32,
      "listado": [
        { "id": 320080, "nombre": "1", "tipo_curva": "Line", "esta_pineado": true },
        { "id": 320110, "nombre": "A", "tipo_curva": "Line", "esta_pineado": true }
      ]
    },
    "vistas": {
      "cantidad": 24,
      "listado": [
        { "id": 145012, "nombre": "00_PLANTA BAJA_ESTRUCTURAS" },
        { "id": 145025, "nombre": "01_PLANTA PRIMERA_ESTRUCTURAS" },
        { "id": 145038, "nombre": "02_PLANTA SEGUNDA_ESTRUCTURAS" },
        { "id": 145060, "nombre": "3D_ESTRUCTURA_GENERAL" },
        { "id": 145082, "nombre": "SEC_LONGITUDINAL_01" },
        { "id": 145095, "nombre": "DETALLE_UNION_VIGA_PILARES" }
      ]
    },
    "plantillas_vista": {
      "cantidad": 6,
      "cantidad_sin_usar": 1,
      "listado": [
        { "id": 201100, "nombre": "BB_PLANTILLA_PLANTAS_EST", "usada": true },
        { "id": 201105, "nombre": "BB_PLANTILLA_SECCIONES_EST", "usada": true },
        { "id": 201110, "nombre": "BB_PLANTILLA_3D_COORDINACION", "usada": true },
        { "id": 201115, "nombre": "BB_PLANTILLA_DETALLES_ARMADO", "usada": true },
        { "id": 201120, "nombre": "BB_PLANTILLA_REVISION_OBRA", "usada": false }
      ]
    },
    "planos": {
      "cantidad": 8,
      "listado": [
        { "id": 305100, "numero_plano": "EST-01", "nombre": "CIMENTACIÓN Y PILARES P.BAJA" },
        { "id": 305101, "numero_plano": "EST-02", "nombre": "ENCOFRADO FORJADO P.PRIMERA" },
        { "id": 305102, "numero_plano": "EST-03", "nombre": "ENCOFRADO FORJADO P.SEGUNDA" },
        { "id": 305103, "numero_plano": "EST-04", "nombre": "SECCIONES GENERALES ESTRUCTURA" }
      ]
    },
    "tablas": {
      "cantidad": 5,
      "listado": [
        { "id": 412010, "nombre": "TABLA MEDICIÓN HORMIGÓN EN PILARES" },
        { "id": 412020, "nombre": "TABLA MEDICIÓN ACERO CORRUGADO B500S" },
        { "id": 412030, "nombre": "TABLA DE PILARES METÁLICOS" },
        { "id": 412040, "nombre": "LISTADO DE FORJADOS UNIDIRECCIONALES" }
      ]
    },
    "habitaciones": {
      "cantidad": 18,
      "cantidad_sin_cerrar": 0,
      "listado": [
        { "id": 510001, "nombre": "SALA DE CONTROL PROTONTERAPIA", "numero": "S-01", "cerrada": true },
        { "id": 510002, "nombre": "BÚNKER TRATAMIENTO 1", "numero": "S-02", "cerrada": true },
        { "id": 510003, "nombre": "SALA TÉCNICA CLIMATIZACIÓN", "numero": "S-03", "cerrada": true },
        { "id": 510004, "nombre": "PASILLO DE ACCESO BLINDADO", "numero": "S-04", "cerrada": true }
      ]
    },
    "vinculos_cad": {
      "cantidad": 2,
      "listado": [
        { 
          "id": 620101, 
          "ids": [620101],
          "nombre": "PLANTA_TOPOGRAFICA_REPLANTEO.dwg", 
          "vista_vinculada_id": 145012, 
          "vista_vinculada_nombre": "00_PLANTA BAJA_ESTRUCTURAS", 
          "visible_en_todas_las_vistas": false, 
          "pineado": true,
          "esta_pineado": true 
        },
        { 
          "id": 620102, 
          "ids": [620102],
          "nombre": "DETALLE_ESTRUCTURA_EXISTENTE.dwg", 
          "vista_vinculada_id": 145095, 
          "vista_vinculada_nombre": "DETALLE_UNION_VIGA_PILARES", 
          "visible_en_todas_las_vistas": false, 
          "pineado": true,
          "esta_pineado": true 
        }
      ]
    },
    "parametros_proyecto_y_compartidos": {
      "cantidad": 14,
      "cantidad_proyecto": 6,
      "cantidad_compartidos": 8,
      "listado": [
        { "id": 701, "nombre": "BB_00_INF_AcronimoProyecto", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 702, "nombre": "BB_EST_ResistenciaHormigon", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 703, "nombre": "BB_EST_TipoAcero", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 704, "nombre": "BB_COD_SectorIncendio", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 705, "nombre": "BB_REV_NumeroRevision", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 706, "nombre": "BB_FASE_FaseEjecucion", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 707, "nombre": "BB_DOC_EmisionPlano", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 708, "nombre": "BB_LOTE_Subcontratista", "tipo": "Texto", "es_compartido": true, "tipo_parametro": "compartido" },
        { "id": 801, "nombre": "Comentarios de revisión de cálculo", "tipo": "Texto", "es_compartido": false, "tipo_parametro": "proyecto" },
        { "id": 802, "nombre": "Estado de comprobación de armaduras", "tipo": "Texto", "es_compartido": false, "tipo_parametro": "proyecto" },
        { "id": 803, "nombre": "Control de fisuración", "tipo": "Texto", "es_compartido": false, "tipo_parametro": "proyecto" },
        { "id": 804, "nombre": "Fecha de última validación", "tipo": "Texto", "es_compartido": false, "tipo_parametro": "proyecto" },
        { "id": 805, "nombre": "Código de partida presupuestaria", "tipo": "Texto", "es_compartido": false, "tipo_parametro": "proyecto" },
        { "id": 806, "nombre": "Referencia de planos de taller", "tipo": "Texto", "es_compartido": false, "tipo_parametro": "proyecto" }
      ]
    },
    "grupos_anotacion": {
      "cantidad": 3,
      "listado": [
        { "id": 810010, "ids": [810010, 810011], "nombre": "CUADRO_CARGAS_VANO_CENTRAL", "pineado": true, "esta_pineado": true },
        { "id": 810020, "ids": [810020], "nombre": "LEYENDA_TIPO_HORMIGONES", "pineado": true, "esta_pineado": true },
        { "id": 810030, "ids": [810030, 810031], "nombre": "NOTAS_GENERALES_SOLAPE_ACERO", "pineado": true, "esta_pineado": true }
      ]
    }
  }
};

const mockAnotacionBimData: RevitBimData = {
  ...mockBimData,
  "fase_auditoria": "ElementosDeAnotacion",
  "fecha_exportacion": "2026-09-17T11:45:00",
  "modelo": {
    "nombre_archivo": "HMM-BCI-CO-ZZ-MOD-ARQ-R25_anotacion.rvt",
    "disciplina": "ARQ",
    "revit_version": "2025"
  },
  "codechecking": {
    ...mockBimData.codechecking,
    "habitaciones": {
      "cantidad": 26,
      "cantidad_sin_cerrar": 1,
      "listado": [
        { "id": 520001, "nombre": "HABITACIÓN 101 CONSULTA PEDIÁTRICA", "numero": "101", "cerrada": true },
        { "id": 520002, "nombre": "HABITACIÓN 102 SALA DE ESPERA", "numero": "102", "cerrada": true },
        { "id": 520003, "nombre": "SALA TRIAJE URGENCIAS", "numero": "103", "cerrada": true },
        { "id": 520004, "nombre": "PATIO INTERIOR SIN CERRAR", "numero": "104", "cerrada": false }
      ]
    },
    "plantillas_vista": {
      "cantidad": 8,
      "cantidad_sin_usar": 2,
      "listado": [
        { "id": 202100, "nombre": "ARQ_PLANTILLA_PLANTAS_DISTRIBUCION", "usada": true },
        { "id": 202105, "nombre": "ARQ_PLANTILLA_SECCIONES_FACHADAS", "usada": true },
        { "id": 202110, "nombre": "ARQ_PLANTILLA_DETALLES_CONSTRUCTIVOS", "usada": true },
        { "id": 202115, "nombre": "ARQ_PLANTILLA_EVACUACION_INCENDIOS", "usada": false },
        { "id": 202120, "nombre": "ARQ_PLANTILLA_ANTIGUA_SIN_USO", "usada": false }
      ]
    },
    "vinculos_cad": {
      "cantidad": 2,
      "listado": [
        {
          "id": 630101,
          "ids": [630101],
          "nombre": "LEVANTAMIENTO_FACHADA_EXISTENTE.dwg",
          "vista_vinculada_id": 145082,
          "vista_vinculada_nombre": "SEC_LONGITUDINAL_01",
          "visible_en_todas_las_vistas": false,
          "pineado": true,
          "esta_pineado": true
        },
        {
          "id": 630102,
          "ids": [630102],
          "nombre": "BORRADOR_DISTRIBUCION_MOBILIARIO.dwg",
          "vista_vinculada_id": 145012,
          "vista_vinculada_nombre": "00_PLANTA BAJA_ESTRUCTURAS",
          "visible_en_todas_las_vistas": true,
          "pineado": false,
          "esta_pineado": false
        }
      ]
    }
  }
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "MATERNO INFANTIL MÁLAGA",
    lastModified: "17.09.2026",
    files: [
      {
        id: "f1",
        name: "HMM-BCI-CO-ZZ-MOD-EST-R25_adrianapestano.json",
        customName: "Modelo de Estructuras",
        modelType: "estructura",
        auditPhase: "Configuración General",
        date: "17/09/2026",
        createdAt: "17/09/2026 09:24",
        elementCount: 3850,
        data: mockBimData
      },
      {
        id: "f2",
        name: "HMM-BCI-CO-ZZ-MOD-ARQ-DOC-R25.json",
        customName: "Modelo de Arquitectura (Doc)",
        modelType: "arquitectura",
        auditPhase: "Elementos de Anotación",
        date: "17/09/2026",
        createdAt: "17/09/2026 11:45",
        elementCount: 84,
        data: mockAnotacionBimData
      }
    ],
    auditConfig: {
      auditPhase: "Configuración General",
      projectCode: "HMM",
      revitVersion: "R25",
      expectedCoordinates: {
        basePoint: { norte_sur_m: 0, este_oeste_m: 0, elevacion_m: 0, angulo_norte_grados: 0 },
        surveyPoint: { norte_sur_m: 0, este_oeste_m: 0, elevacion_m: 0 }
      },
      expectedWorksets: ["01_ESTRUCTURAS", "02_CIMENTACION", "03_FORJADOS"],
      expectedLevels: [
        { nombre: "S-3_EST", elevacion_m: -7.1, requiereEstructura: true, requiereNivelEdificio: true },
        { nombre: "N+0 EST", elevacion_m: 3.7, requiereEstructura: true, requiereNivelEdificio: true },
        { nombre: "N+3", elevacion_m: 13.7, requiereEstructura: false, requiereNivelEdificio: false }
      ],
      byDiscipline: {
        estructura: {
          expectedWorksets: ["01_ESTRUCTURAS", "02_CIMENTACION", "03_FORJADOS", "04_VINCULOS"],
          expectedLevels: [
            { nombre: "S-3_EST", elevacion_m: -7.1, requiereEstructura: true, requiereNivelEdificio: true },
            { nombre: "N+0 EST", elevacion_m: 3.7, requiereEstructura: true, requiereNivelEdificio: true },
            { nombre: "N+3", elevacion_m: 13.7, requiereEstructura: true, requiereNivelEdificio: false }
          ]
        },
        arquitectura: {
          expectedWorksets: ["01_ARQUITECTURA", "02_FACHADAS", "03_TABIQUERIA", "04_CARPINTERIAS"],
          expectedLevels: [
            { nombre: "S-3_ARQ", elevacion_m: -7.1, requiereEstructura: false, requiereNivelEdificio: true },
            { nombre: "N+0 ARQ", elevacion_m: 3.7, requiereEstructura: false, requiereNivelEdificio: true },
            { nombre: "N+3 ARQ", elevacion_m: 13.7, requiereEstructura: false, requiereNivelEdificio: true }
          ]
        },
        instalaciones: {
          expectedWorksets: ["01_MEP_CLIMATIZACION", "02_MEP_FONTANERIA", "03_MEP_ELECTRICIDAD", "04_MEP_SANEAMIENTO"],
          expectedLevels: [
            { nombre: "N+0 MEP", elevacion_m: 3.7, requiereEstructura: false, requiereNivelEdificio: true },
            { nombre: "N+3 MEP", elevacion_m: 13.7, requiereEstructura: false, requiereNivelEdificio: true }
          ]
        },
        urbanizacion: {
          expectedWorksets: ["01_URB_VIALIDAD", "02_URB_TOPOGRAFIA", "03_URB_REDES"],
          expectedLevels: [
            { nombre: "TERRENO", elevacion_m: 0.0, requiereEstructura: false, requiereNivelEdificio: false }
          ]
        },
        federado: {
          expectedWorksets: ["00_MODELOS_VINCULADOS", "01_PUNTOS_CONTROL"],
          expectedLevels: [
            { nombre: "N+0 EST", elevacion_m: 3.7, requiereEstructura: false, requiereNivelEdificio: true }
          ]
        }
      },
      detailElements: {
        ...DEFAULT_DETAIL_ELEMENTS_CONFIG
      }
    }
  }
];
