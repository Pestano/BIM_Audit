App para la auditoría de modelos BIM, específicamente de Revit.
Previamente se deben exportar los datos de los modelos con unos plugins de PyRevit con la estructura necesaria

la auditoría se ha organizado en 3 fases:
CONFIGURACIÓN INICIAL
ELEMENTOS DE ANOTACIÓN
ELEMENTOS 3D

CONFIGURACIÓN INICIAL:
1. Informacion general
2. Nombre modelo
3. Coordenadas
4. Subproyectos
5. Warnings
6. Filtros de vistas
7. Opciones de diseño
8. Fases
9. Niveles
10. Rejillas

1. Informacion general
Tamaño del archivo
Nombre de organización
Nombre del edificio
Fecha de emisión de proyecto
Estado de proyecto
Nombre de cliente
Dirección de proyecto
Nombre de proyecto
Número de proyecto
BB_00_INF_AcronimoProyecto

2. Nombre modelo
Nombre del modelo

3. Coordenadas
Punto base del proyecto con sus coordenadas
Punto de reconocimiento con sus coordenadas

4. Subproyectos
Nombres - esta info se importa de un excel porque variará según el modelo
ids
numero de elementos
Subproyectos vacíos

5. Warnings
Numero de warnings totales
Organizados por tipos y los ids de los elementos involucrados

6. Filtros de vistas
Nombres
Cantidad
Filtros sin usar

7. Opciones de diseño
Si existen
Número

8. Fases
Si existen
Número

9.Niveles:
Número
Cantidad de tipos
Nombres y altura - esta info se importa de un excel porque variará según el modelo
Planta del edificio 
Subproyecto 
Si están pineados

10.Rejillas:
Número
Cantidad de tipos
Si están pineados

ELEMENTOS DE ANOTACIÓN:
1. Vistas
Cantidad
Nombre e id

2. Plantillas de vistas
Cantidad
Cantidad sin usar
Nombre e id

3. Planos
Cantidad
Nombre e id

4. Tablas
Cantidad
Nombre e id

5. Habitaciones
Cantidad
Cantidad sin cerrar
Nombre e id

6. Vinculos de CAD
Cantidad
Nombre e ids - vista a la que están vinculados
Si son visibles en todas las vistas
Si están pineados

7. Parámetros de proyecto y parámetros compartidos (diferenciarlos)
Cantidad
Nombre

8. Grupos de anotación
Cantidad
Nombre e ids
Si están pineados

IMPLEMENTACIONES ADICIONALES:
Control de versiones
Cuáles errores son más críticos que otros.

La estructura gira alrededor de **proyectos que contienen modelos**, y cada modelo puede guardar las tres fases: Configuración General, Elementos de Anotación y Elementos 3D.

**se agrupan modelos por disciplina**: dos modelos distintos de Arquitectura dentro del mismo proyecto pueden terminar fusionados. La separación entre fases existe, pero no garantiza por sí sola la separación entre modelos.

**1. Gestión de proyectos y modelos**

| Archivo | Responsabilidad |
|---|---|
| [src/App.tsx](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/App.tsx>) | Mantiene los proyectos, el proyecto seleccionado, el modelo seleccionado y la fase activa. Guarda en `localStorage`. Implementa las operaciones de añadir, actualizar y eliminar modelos y fases. |
| [src/types.ts](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/types.ts:380>) | Define los contratos: `Project`, `ProjectFile`, `RevitBimData` y `AuditConfig`. Un `ProjectFile` representa un modelo que puede contener varias exportaciones por fase. |
| [ManagementView.tsx](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/Components/Views/ManagementView.tsx>) | Interfaz para importar JSON, asignar disciplina y nombre, reemplazar exportaciones y eliminar datos. Prepara los datos y llama a las operaciones de `App.tsx`. |
| [modelUtils.ts](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/utils/modelUtils.ts>) | Detecta disciplinas, normaliza JSON, calcula recuentos, separa fases y fusiona registros de modelos. Es el archivo más delicado para la integridad de los datos. |
| [fileUtils.ts](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/utils/fileUtils.ts>) | Lee el JSON con soporte de codificación UTF-8 y Latin-1. No decide a qué modelo pertenece. |

**2. Separación de las tres fases**

La estructura declarada en `types.ts` es:

```text
Project
└── files: ProjectFile[]
    ├── id                      Identificador del modelo
    ├── modelType               Disciplina
    ├── configData              Configuración General
    ├── anotacionData           Elementos de Anotación
    ├── model3DData             Elementos 3D
    └── data                    Datos de compatibilidad
```

Cada fase también tiene indicadores de presencia, nombre del JSON, fechas y recuentos propios.

En `modelUtils.ts`:

- `CONFIG_KEYS` y `ANNOTATION_KEYS` enumeran los campos de cada fase.
- `getConfigPhaseData()` y `getAnnotationPhaseData()` recuperan el bloque específico. Si falta, extraen los campos correspondientes de `file.data`.
- `normalizeBimData()` adapta distintas estructuras de JSON al formato `codechecking`.
- `mergeProjectFiles()` actualiza las fases de un registro conservando las otras.
- `get3DCategories()` interpreta el bloque `EXPORTACIONES ELEMENTOS 3D`.

**Matiz importante:** `data` conserva una combinación de Configuración y Anotación por compatibilidad. Además, cuando ya existen `configData` o `anotacionData`, los selectores los devuelven directamente, sin volver a filtrar sus campos. La separación depende también de cómo se importan y actualizan.

**3. Lógica de auditoría**

Está principalmente en [src/lib/auditEngine.ts](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/lib/auditEngine.ts>):

| Función | Responsabilidad |
|---|---|
| `runAudit()` | Auditoría de Configuración General. |
| `auditPhase2()` | Auditoría de Elementos de Anotación. |
| `auditModelName()` | Validación del nombre del modelo. |
| `auditWarnings()` | Evaluación de advertencias. |
| Funciones auxiliares | Interpretación de fases, opciones de diseño y advertencias. |

Las reglas se almacenan en `Project.auditConfig`, con ajustes por disciplina y algunos por identificador de modelo.

**La auditoría de Elementos 3D todavía no está implementada como las otras dos.** Hay configuración de reglas y visualización de datos, pero `Elements3DView.tsx` muestra un aviso de que las reglas se incorporarán progresivamente.

**4. Vistas principales**

Todas están en `src/Components/Views/`:

| Archivo | Responsabilidad |
|---|---|
| `ProjectsListView.tsx` | Pantalla inicial: listado, búsqueda y acceso a proyectos. |
| `ManagementView.tsx` | Gestión de modelos y sus JSON por fase. |
| [GeneralConfigView.tsx](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/Components/Views/GeneralConfigView.tsx>) | Coordina **las tres fases**, aunque su nombre sugiera solo Configuración General. Selecciona el modelo activo, obtiene sus datos, ejecuta auditorías y activa exportaciones. |
| `DashboardView.tsx` | Presentación de Configuración General y sus resultados. |
| `DocumentationView.tsx` | Datos y auditoría de Elementos de Anotación. |
| `Elements3DView.tsx` | Exploración de categorías, familias y tipos 3D. |
| `SettingsView.tsx` | Edición de la configuración de auditoría del proyecto. |
| `DetailElementsSettings.tsx` | Configuración de reglas de Anotación. |
| `Elements3DSettings.tsx` | Configuración de reglas 3D. |
| `ModelVisualDashboard.tsx` | Resumen visual del modelo con información de las tres fases. |
| `FullReportContainer.tsx` | Construye el informe conjunto recorriendo los modelos y utilizando `DashboardView`. Actualmente entrega `file.data` a esa vista. |

`src/Components/common/` contiene componentes reutilizables y `src/Components/modals/`, las ventanas de confirmación y detalle. `main.tsx` inicia React e `index.css` define los estilos globales.

**5. Exportaciones**

Están centralizadas en [src/utils/exportUtils.ts](</C:/SINERBA HOLDING/ZZ_Personal/02 HERRAMIENTAS/APPS/AuditoriaBIM/src/utils/exportUtils.ts>):

- `exportConfigPageToExcel()`: Excel de Configuración General.
- `exportAnnotationPageToExcel()`: Excel de Anotación.
- `export3DPageToExcel()`: Excel de Elementos 3D.
- `exportToPDF()`: convierte un elemento de la interfaz en PDF.
- `exportToHTML()`: exporta contenido de la interfaz a HTML.

`GeneralConfigView.tsx` elige los datos según el modelo y la fase activos. `ModelVisualDashboard.tsx` utiliza las exportaciones PDF y HTML. El respaldo JSON de todos los proyectos se genera en `App.tsx`, mediante `handleBackup()`.

**6. Archivos especialmente delicados y riesgos detectados**

| Archivo | Riesgo concreto |
|---|---|
| **`modelUtils.ts`** | `unifyProjectFilesList()` considera que dos registros con la misma disciplina conocida pertenecen al mismo modelo. No exige que coincidan sus identificadores ni sus nombres originales. |
| **`App.tsx`** | Repite ese criterio al añadir modelos y persiste el resultado. También actualiza el bloque combinado `data.codechecking`. |
| **`ManagementView.tsx`** | Determina la fase y disciplina de la importación. Al reemplazar un JSON, utiliza el modelo seleccionado sin comprobar que el JSON pertenezca a ese mismo modelo. |
| **`types.ts`** | Define la separación entre los tres bloques. Cambiar este contrato afecta a importación, almacenamiento, vistas y exportación. |
| **`GeneralConfigView.tsx`** | Decide qué modelo y bloque se muestran o auditan. Conserva rutas de respaldo a `file.data`; cambiar los selectores puede hacer que se consulte el bloque equivocado. |
| **`FullReportContainer.tsx`** | Consume directamente el bloque combinado `file.data`, por lo que merece revisión al cambiar la separación de fases. |

Por ejemplo, importar Configuración de **Arquitectura A** y Anotación de **Arquitectura B**, ambas con disciplina `arquitectura`, puede producir un único registro con fases procedentes de modelos distintos. Si se importa la misma fase de ambos modelos, puede sustituirse la anterior.

Este riesgo se desprende de las condiciones del código; no he ejecutado una reproducción. **No he modificado ningún archivo.**
