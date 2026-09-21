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

