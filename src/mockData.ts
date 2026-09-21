/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, RevitBimData } from './types';

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
        "angulo_norte_grados": 25.384
      },
      "punto_reconocimiento": {
        "norte_sur_m": 4065795.696,
        "este_oeste_m": 372200.40500000003,
        "elevacion_m": 20.629999999999999
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
        { "id": 162976, "nombre": "S-3_EST", "elevacion_m": -7.1, "es_nivel_edificio": true, "es_estructura": true },
        { "id": 163440, "nombre": "N+0 EST", "elevacion_m": 3.7, "es_nivel_edificio": true, "es_estructura": true },
        { "id": 163782, "nombre": "N+3", "elevacion_m": 13.7, "es_nivel_edificio": false, "es_estructura": false }
      ]
    },
    "rejillas": {
      "cantidad": 32,
      "listado": [
        { "id": 320080, "nombre": "1", "tipo_curva": "Line" },
        { "id": 320110, "nombre": "A", "tipo_curva": "Line" }
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
      }
    }
  }
];
