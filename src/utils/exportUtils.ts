import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Ocultar elementos no necesarios para el PDF si fuera necesario
  const canvas = await html2canvas(element, { 
    scale: 2,
    useCORS: true,
    backgroundColor: '#FAFAFA' // Color de fondo del body en index.css
  });
  
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
};

export const exportToHTML = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const content = element.innerHTML;
  
  // Obtener estilos cargados en la página
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(tag => tag.outerHTML)
    .join('');

  const fullHtml = `
    <html>
      <head>
        <title>${filename}</title>
        ${styleTags}
        <style>
          body { padding: 20px; }
          #main-content { background-color: #FAFAFA; }
        </style>
      </head>
      <body>
        <div id="main-content">
          ${content}
        </div>
      </body>
    </html>
  `;
  
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
};


// ============================================================================
// EXPORTACIÓN EXCEL POR PÁGINA
// Cada tarjeta principal se exporta como una hoja independiente.
// ============================================================================

type ExcelRow = Record<string, any>;

const sanitizeSheetName = (name: string, used: Set<string>) => {
  const base = String(name || 'Hoja')
    .replace(/[\\/*?:\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Hoja';

  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    const suffix = ` ${index++}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
  }
  used.add(candidate);
  return candidate;
};

const cleanFilename = (name: string) =>
  String(name || 'modelo')
    .replace(/\.[a-zA-Z0-9]+$/i, '')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .trim() || 'modelo';

const scalar = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

const objectToRows = (obj: any, prefix = ''): ExcelRow[] => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([key, value]) => ({
    Campo: prefix ? `${prefix}.${key}` : key,
    Valor: scalar(value),
  }));
};

const rowsOrMessage = (rows: ExcelRow[], message = 'Sin datos'): ExcelRow[] =>
  rows.length ? rows : [{ Información: message }];

const addSheet = (
  workbook: XLSX.WorkBook,
  used: Set<string>,
  name: string,
  rows: ExcelRow[]
) => {
  const sheetName = sanitizeSheetName(name, used);
  const ws = XLSX.utils.json_to_sheet(rowsOrMessage(rows));
  XLSX.utils.book_append_sheet(workbook, ws, sheetName);
};

const writeWorkbook = (workbook: XLSX.WorkBook, filename: string) => {
  XLSX.writeFile(workbook, `${cleanFilename(filename)}.xlsx`);
};

export const exportConfigPageToExcel = (bimData: any, filename: string) => {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const cc = bimData?.codechecking || {};

  const infoGeneralRows: ExcelRow[] = [
    { Campo: 'Fase auditoría', Valor: bimData?.fase_auditoria || '' },
    { Campo: 'Fecha exportación', Valor: bimData?.fecha_exportacion || '' },
    { Campo: 'Nombre archivo', Valor: bimData?.modelo?.nombre_archivo || '' },
    { Campo: 'Disciplina', Valor: bimData?.modelo?.disciplina || '' },
    { Campo: 'Revit version', Valor: bimData?.modelo?.revit_version || '' },
    { Campo: 'Tamaño archivo (MB)', Valor: cc?.informacion_general?.tamano_archivo_mb ?? '' },
    ...((cc?.informacion_general?.parametros_informacion_proyecto || []).map((p: any) => ({
      Campo: p?.nombre || '',
      Valor: p?.valor ?? '',
    }))),
  ];
  addSheet(wb, used, '1 Información general', infoGeneralRows);

  addSheet(wb, used, '2 Nombre modelo', [
    { Campo: 'Nombre archivo', Valor: bimData?.modelo?.nombre_archivo || cc?.nombre_modelo?.nombre_archivo || '' },
  ]);

  const coords: ExcelRow[] = [];
  const pb = cc?.coordenadas?.punto_base_proyecto;
  const pr = cc?.coordenadas?.punto_reconocimiento;
  if (pb) coords.push({ Punto: 'Punto base proyecto', Norte_Sur_m: pb.norte_sur_m, Este_Oeste_m: pb.este_oeste_m, Elevacion_m: pb.elevacion_m, Angulo_Norte_grados: pb.angulo_norte_grados, Pineado: scalar(pb.pineado) });
  if (pr) coords.push({ Punto: 'Punto reconocimiento', Norte_Sur_m: pr.norte_sur_m, Este_Oeste_m: pr.este_oeste_m, Elevacion_m: pr.elevacion_m, Angulo_Norte_grados: '', Pineado: scalar(pr.pineado) });
  addSheet(wb, used, '3 Coordenadas', coords);

  addSheet(wb, used, '4 Subproyectos', (cc?.subproyectos?.existentes || []).map((w: any) => ({
    Nombre: w?.nombre || '',
    Workset_ID: w?.workset_id ?? '',
    Elementos: w?.num_elementos ?? '',
    Vacio: scalar(w?.vacio),
  })));

  addSheet(wb, used, '5 Warnings', (cc?.warnings?.detalle || []).map((w: any) => ({
    Tipo: w?.tipo_warning || '',
    Incidencias: w?.cantidad_incidencias ?? '',
    Categorias: Array.isArray(w?.categorias_afectadas) ? w.categorias_afectadas.join(', ') : scalar(w?.categorias_afectadas),
    Elementos_IDs: Array.isArray(w?.elementos_ids) ? w.elementos_ids.join(', ') : scalar(w?.elementos_ids),
  })));

  const filtros = cc?.filtros_vista || {};
  const filtrosRows: ExcelRow[] = [];
  const sinUsar = new Set((filtros?.sin_usar_nombres || []).map((v: any) => String(v)));
  (filtros?.nombres_filtros || []).forEach((nombre: any) => filtrosRows.push({ Nombre: nombre, Usado: sinUsar.has(String(nombre)) ? 'No' : 'Sí' }));
  addSheet(wb, used, '6 Filtros de vista', filtrosRows);

  const opciones = cc?.opciones_diseno || {};
  const opcionesRows: ExcelRow[] = [];
  const listadoOpciones = opciones?.listado || opciones?.elementos || [];
  if (Array.isArray(listadoOpciones)) {
    listadoOpciones.forEach((o: any) => opcionesRows.push(typeof o === 'object' ? { ...o } : { Opcion: o }));
  }
  addSheet(wb, used, '7 Opciones diseño', opcionesRows);

  const fases = cc?.fases || {};
  const fasesRows: ExcelRow[] = [];
  const listadoFases = fases?.listado || fases?.elementos || [];
  if (Array.isArray(listadoFases)) {
    listadoFases.forEach((f: any) => fasesRows.push(typeof f === 'object' ? { ...f } : { Fase: f }));
  }
  addSheet(wb, used, '8 Fases', fasesRows);

  addSheet(wb, used, '9 Niveles', (cc?.niveles?.listado || []).map((n: any) => ({
    ID: n?.id ?? '',
    Nombre: n?.nombre || '',
    Elevacion_m: n?.elevacion_m ?? '',
    Nivel_edificio: scalar(n?.es_nivel_edificio),
    Estructura: scalar(n?.es_estructura),
    Pineado: scalar(n?.pineado),
  })));

  addSheet(wb, used, '10 Rejillas', (cc?.rejillas?.listado || []).map((r: any) => ({
    ID: r?.id ?? '',
    Nombre: r?.nombre || '',
    Tipo_curva: r?.tipo_curva || '',
    Pineado: scalar(r?.pineado),
  })));

  writeWorkbook(wb, `${filename}_Configuracion_General`);
};

export const exportAnnotationPageToExcel = (bimData: any, filename: string) => {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const cc = bimData?.codechecking || {};

  addSheet(wb, used, '1 Vistas', (cc?.vistas?.listado || []).map((v: any) => ({
    ID: v?.id ?? '',
    Nombre: v?.nombre || '',
    Tipo: v?.tipo_vista || '',
    Tipo_Revit: v?.tipo_vista_revit || '',
  })));

  addSheet(wb, used, '2 Plantillas vistas', (cc?.plantillas_vista?.listado || []).map((p: any) => ({
    ID: p?.id ?? '',
    Nombre: p?.nombre || '',
    Usada: scalar(p?.usada),
  })));

  addSheet(wb, used, '3 Planos', (cc?.planos?.listado || []).map((p: any) => ({
    ID: p?.id ?? '',
    Numero: p?.numero_plano || '',
    Nombre: p?.nombre || '',
  })));

  addSheet(wb, used, '4 Tablas planificación', (cc?.tablas?.listado || []).map((t: any) => ({
    ID: t?.id ?? '',
    Nombre: t?.nombre || '',
  })));

  addSheet(wb, used, '5 Habitaciones', (cc?.habitaciones?.listado || []).map((h: any) => ({
    ID: h?.id ?? '',
    Numero: h?.numero || '',
    Nombre: h?.nombre || '',
    Nivel: h?.nivel || '',
    Nivel_ID: h?.nivel_id ?? '',
    Limite_superior: h?.limite_superior || '',
    Limite_superior_ID: h?.limite_superior_id ?? '',
    Desfase_base_m: h?.desfase_base_m ?? '',
    Desfase_limite_m: h?.desfase_limite_m ?? '',
    Area_m2: h?.area_m2 ?? '',
    Perimetro_m: h?.perimetro_m ?? '',
    Altura_sin_limites_m: h?.altura_sin_limites_m ?? '',
    Volumen_m3: h?.volumen_m3 ?? '',
    Altura_calculo_m: h?.altura_calculo_m ?? '',
    Fase: h?.fase || '',
    Subproyecto: h?.subproyecto || '',
    Estado: h?.estado || '',
  })));

  addSheet(wb, used, '6 Vínculos CAD', (cc?.vinculos_cad?.listado || []).map((c: any) => ({
    ID: c?.id ?? '',
    Nombre: c?.nombre || '',
    Vista_ID: c?.vista_vinculada_id ?? '',
    Vista: c?.vista_vinculada_nombre || '',
    Visible_todas_vistas: scalar(c?.visible_en_todas_las_vistas),
    Pineado: scalar(c?.pineado),
  })));

  const parametros = cc?.parametros_proyecto_y_compartidos?.listado || [
    ...(cc?.parametros_proyecto?.listado || []).map((p: any) => ({ ...p, tipo: 'Proyecto' })),
    ...(cc?.parametros_compartidos?.listado || []).map((p: any) => ({ ...p, tipo: 'Compartido' })),
  ];
  addSheet(wb, used, '7 Parámetros modelo', parametros.map((p: any) => ({
    Nombre: p?.nombre || '',
    Tipo: p?.tipo || p?.tipo_parametro || (p?.es_compartido ? 'Compartido' : 'Proyecto'),
    Compartido: scalar(p?.es_compartido),
  })));

  const grupos = cc?.grupos_detalle || cc?.grupos_anotacion || {};
  addSheet(wb, used, '8 Grupos detalle', (grupos?.listado || []).map((g: any) => ({
    Nombre: g?.nombre || '',
    ID: g?.id ?? '',
    Vista: g?.vista_nombre || '',
    Tipo_vista: g?.vista_tipo || '',
    Vista_ID: g?.vista_id ?? '',
    Pineado: scalar(g?.pineado),
  })));

  writeWorkbook(wb, `${filename}_Elementos_Anotacion`);
};

const flatten3DCategory = (category: any): ExcelRow[] => {
  const rows: ExcelRow[] = [];
  const familias = category?.familias || {};
  Object.entries(familias).forEach(([familiaNombre, familia]: [string, any]) => {
    const tipos = familia?.tipos || {};
    Object.entries(tipos).forEach(([tipoNombre, tipo]: [string, any]) => {
      const elementos = tipo?.elementos || [];
      if (!Array.isArray(elementos) || elementos.length === 0) {
        rows.push({ Familia: familiaNombre, Tipo: tipoNombre, Cantidad: tipo?.cantidad_elementos ?? 0 });
        return;
      }
      elementos.forEach((e: any) => {
        const row: ExcelRow = { Familia: familiaNombre, Tipo: tipoNombre };
        Object.entries(e || {}).forEach(([key, value]) => {
          row[key] = scalar(value);
        });
        rows.push(row);
      });
    });
  });
  return rows;
};

const materialsRows3D = (source: any): ExcelRow[] => {
  const counts = new Map<string, { categoria: string; material: string; count: number }>();
  Object.entries(source || {}).forEach(([categoryName, categoryValue]: [string, any]) => {
    if (String(categoryName).toLowerCase().includes('vinculos rvt')) return;
    const rows = flatten3DCategory(categoryValue);
    rows.forEach((row: any) => {
      let materials: string[] = [];
      try {
        const rawNames = row.materiales_nombres;
        if (typeof rawNames === 'string') {
          const parsed = JSON.parse(rawNames);
          if (Array.isArray(parsed)) materials = parsed.map(String);
        } else if (Array.isArray(rawNames)) {
          materials = rawNames.map(String);
        }
      } catch {
        materials = [];
      }
      if (!materials.length && row.materiales) {
        try {
          const parsed = typeof row.materiales === 'string' ? JSON.parse(row.materiales) : row.materiales;
          if (Array.isArray(parsed)) materials = parsed.map((m: any) => String(m?.nombre || m?.name || m)).filter(Boolean);
        } catch { /* noop */ }
      }
      [...new Set(materials)].forEach(material => {
        const key = `${categoryName}|||${material}`;
        const current = counts.get(key) || { categoria: categoryName, material, count: 0 };
        current.count += 1;
        counts.set(key, current);
      });
    });
  });
  return Array.from(counts.values())
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.material.localeCompare(b.material, 'es'))
    .map(v => ({ Categoria: v.categoria, Material: v.material, Elementos: v.count }));
};

export const export3DCategoryToExcel = (filename: string, categoryName: string, elements: ExcelRow[]) => {
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();
  addSheet(workbook, used, categoryName, elements);
  writeWorkbook(workbook, filename);
};

export const export3DPageToExcel = (bimData: any, filename: string) => {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const source = bimData?.['EXPORTACIONES ELEMENTOS 3D'] || {};

  Object.entries(source).forEach(([categoryName, categoryValue]: [string, any]) => {
    const normalized = String(categoryName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (normalized === 'vinculos rvt') {
      const listado = categoryValue?.listado || categoryValue?.elementos || [];
      addSheet(wb, used, 'Vínculos RVT', Array.isArray(listado) ? listado.map((v: any) => ({
        ID: v?.id ?? '',
        Nombre: v?.nombre || v?.nombre_tipo || v?.name || '',
        Subproyecto: v?.subproyecto || '',
        Delimitacion_habitacion: scalar(v?.delimitacion_habitacion),
        Pineado: scalar(v?.pineado),
      })) : objectToRows(categoryValue));
      return;
    }

    addSheet(wb, used, categoryName, flatten3DCategory(categoryValue));
  });

  addSheet(wb, used, 'Materiales por categoría', materialsRows3D(source));
  writeWorkbook(wb, `${filename}_Elementos_3D`);
};
