import React, { useEffect, useMemo, useState } from 'react';
import { Layers3, ChevronRight, X, FileSpreadsheet } from 'lucide-react';
import { get3DCategories } from '../../utils/modelUtils';
import { export3DCategoryToExcel } from '../../utils/exportUtils';

interface Elements3DViewProps {
  data: any;
  showAudit?: boolean;
}

const normalizeKey = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const cleanMaterialName = (value: any): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned) return null;

  const normalized = normalizeKey(cleaned);
  if (
    normalized === 'none' ||
    normalized === '<none>' ||
    normalized === 'ninguno' ||
    normalized === 'sin material' ||
    normalized === 'by category' ||
    normalized === 'por categoria' ||
    normalized === 'null' ||
    normalized === 'undefined'
  ) {
    return null;
  }

  return cleaned;
};

const extractMaterialValues = (value: any): string[] => {
  const found = new Set<string>();

  const addString = (candidate: any) => {
    const material = cleanMaterialName(candidate);
    if (material) found.add(material);
  };

  const walkMaterialValue = (candidate: any) => {
    if (candidate == null) return;

    if (typeof candidate === 'string') {
      addString(candidate);
      return;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach(walkMaterialValue);
      return;
    }

    if (typeof candidate === 'object') {
      const preferred =
        candidate.nombre ??
        candidate.name ??
        candidate.material ??
        candidate.valor ??
        candidate.value;

      if (typeof preferred === 'string') {
        addString(preferred);
      }

      Object.entries(candidate).forEach(([key, nestedValue]) => {
        const normalizedKey = normalizeKey(key);

        // Si estamos dentro de un diccionario "materiales", es frecuente
        // que el propio nombre del material sea la clave.
        if (
          typeof nestedValue === 'number' ||
          typeof nestedValue === 'boolean' ||
          nestedValue == null
        ) {
          if (
            ![
              'cantidad',
              'count',
              'id',
              'elementid',
              'element_id',
              'cantidad_elementos',
              'cantidad_materiales',
            ].includes(normalizedKey)
          ) {
            addString(key);
          }
          return;
        }

        walkMaterialValue(nestedValue);
      });
    }
  };

  walkMaterialValue(value);
  return Array.from(found);
};

const getMaterialsFromCategory = (categoryValue: any): string[] => {
  const found = new Set<string>();
  const visited = new Set<any>();

  const add = (value: any) => {
    const material = cleanMaterialName(value);
    if (material) found.add(material);
  };

  const addAll = (values: string[]) => values.forEach(add);

  const walk = (node: any, parentKey = '') => {
    if (node == null) return;

    if (typeof node === 'object') {
      if (visited.has(node)) return;
      visited.add(node);
    }

    if (Array.isArray(node)) {
      node.forEach(item => walk(item, parentKey));
      return;
    }

    if (typeof node !== 'object') return;

    Object.entries(node).forEach(([key, value]) => {
      const normalizedKey = normalizeKey(key);
      const keyIsMaterial = normalizedKey.includes('material');

      // Caso directo:
      // material, materiales, material_nombre, material_estructural, etc.
      if (keyIsMaterial) {
        addAll(extractMaterialValues(value));
      }

      // Caso parámetros exportados como:
      // { nombre: "Material", valor: "Hormigón" }
      if (
        normalizedKey === 'nombre' ||
        normalizedKey === 'name' ||
        normalizedKey === 'parametro' ||
        normalizedKey === 'parameter'
      ) {
        const parameterName = normalizeKey(String(value || ''));
        if (parameterName.includes('material')) {
          const materialValue =
            (node as any).valor ??
            (node as any).value ??
            (node as any).valor_formateado ??
            (node as any).formatted_value ??
            null;
          addAll(extractMaterialValues(materialValue));
        }
      }

      // Caso parámetros exportados como diccionario:
      // { "Material": "Acero" }
      if (
        keyIsMaterial &&
        (typeof value === 'string' || Array.isArray(value) || typeof value === 'object')
      ) {
        addAll(extractMaterialValues(value));
      }

      if (value && typeof value === 'object') {
        walk(value, normalizedKey || parentKey);
      }
    });
  };

  walk(categoryValue);

  return Array.from(found).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );
};


const formatBooleanValue = (value: any): string => {
  if (value === true || value === 1 || value === '1') return 'Sí';
  if (value === false || value === 0 || value === '0') return 'No';

  const normalized = normalizeKey(String(value ?? ''));
  if (['si', 'yes', 'true', 'activado', 'activo'].includes(normalized)) return 'Sí';
  if (['no', 'false', 'desactivado', 'inactivo'].includes(normalized)) return 'No';

  return value == null || value === '' ? '—' : String(value);
};

const toFiniteNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMetric = (value: number, unit: string): string =>
  `${value.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${unit}`;

interface DetailField {
  key: string;
  label: string;
  boolean?: boolean;
  ductDimension?: 'size' | 'altura' | 'anchura' | 'diametro';
  terminalDimension?: 'size' | 'width' | 'height';
  fittingDimension?: 'size' | 'diameter';
}

interface MetricField {
  key: string;
  label: string;
  unit: string;
  aggregate: 'sum' | 'distinct';
}

interface CategoryDetailConfig {
  groupFields: DetailField[];
  metrics: MetricField[];
}

interface CategoryDetailRow {
  key: string;
  values: Record<string, string>;
  cantidad: number;
  metrics: Record<string, number | string>;
  elements: { id: string; ifcGUID: string; data: Record<string, unknown> }[];
}

const getElementIdentifier = (element: any, keys: string[]): string => {
  for (const key of keys) {
    const entry = Object.entries(element || {}).find(([name, value]) =>
      normalizeKey(name).replace(/[_\s-]/g, '') === key &&
      (typeof value === 'string' || typeof value === 'number') &&
      String(value).trim() !== ''
    );
    if (entry) return String(entry[1]);
  }
  return 'No disponible';
};

const ElementDetailsTable = ({ row, config }: { row: CategoryDetailRow; config: CategoryDetailConfig }) => {
  return (
    <table className="w-full text-left text-[11px]">
      <caption className="px-4 py-2 text-left font-bold text-zinc-600">
        {row.cantidad.toLocaleString()} {row.cantidad === 1 ? 'elemento de esta agrupación' : 'elementos de esta agrupación'}
      </caption>
      <thead className="sticky top-0 bg-zinc-100 text-zinc-600">
        <tr>
          {config.groupFields.map(field => (
            <th key={field.key} scope="col" className="px-4 py-2 whitespace-nowrap">
              {field.label}
            </th>
          ))}
          <th scope="col" className="px-4 py-2 whitespace-nowrap">Elementos</th>
          {config.metrics.map(metric => (
            <th key={metric.key} scope="col" className="px-4 py-2 whitespace-nowrap">{metric.label}</th>
          ))}
          <th scope="col" className="px-4 py-2 whitespace-nowrap">ID</th>
          <th scope="col" className="px-4 py-2 whitespace-nowrap">IFC GUID</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
        {row.elements.map((element, index) => (
          <tr key={index} className="align-top hover:bg-zinc-50">
            {config.groupFields.map(field => (
              <td key={field.key} className="px-4 py-2 select-text whitespace-nowrap">
                {getDetailValue(element.data, row.values.familia, row.values.tipo, field)}
              </td>
            ))}
            <td className="px-4 py-2">1</td>
            {config.metrics.map(metric => {
              const value = element.data[metric.key];
              return (
                <td key={metric.key} className="px-4 py-2 select-text whitespace-nowrap">
                  {value == null || value === '' || !Number.isFinite(Number(value))
                    ? '—'
                    : formatMetric(Number(value), metric.unit)}
                </td>
              );
            })}
            <td className="px-4 py-2 select-text whitespace-nowrap">{element.id}</td>
            <td className="px-4 py-2 select-text whitespace-nowrap">{element.ifcGUID}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const commonFields: DetailField[] = [
  { key: 'familia', label: 'Familia' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'nivel', label: 'Nivel' },
];

const ROUND_MEP_DETAIL_CONFIG: CategoryDetailConfig = {
  groupFields: [
    ...commonFields,
    { key: 'diametro', label: 'Diámetro', ductDimension: 'diametro' },
    { key: 'clasificacion_sistema', label: 'Clasificación de sistema' },
    { key: 'tipo_sistema', label: 'Tipo de sistema' },
    { key: 'nombre_sistema', label: 'Nombre de sistema' },
  ],
  metrics: [
    { key: 'longitud', label: 'Longitud', unit: 'm', aggregate: 'sum' },
  ],
};

const FITTING_DETAIL_CONFIG: CategoryDetailConfig = {
  groupFields: [
    ...commonFields,
    { key: 'clasificacion_sistema', label: 'Clasificación de sistema' },
    { key: 'nombre_sistema', label: 'Nombre de sistema' },
    { key: 'tipo_sistema', label: 'Tipo de sistema' },
    { key: 'tamano', label: 'Tamaño', fittingDimension: 'size' },
    { key: 'diametro', label: 'Diámetro', fittingDimension: 'diameter' },
  ],
  metrics: [],
};

const CATEGORY_DETAIL_CONFIG: Record<string, CategoryDetailConfig> = {
  'uniones de conducto': FITTING_DETAIL_CONFIG,
  'uniones de tuberias': FITTING_DETAIL_CONFIG,
  'terminales de aire': {
    groupFields: [
      ...commonFields,
      { key: 'clasificacion_sistema', label: 'Clasificación de sistema' },
      { key: 'nombre_sistema', label: 'Nombre de sistema' },
      { key: 'tipo_sistema', label: 'Tipo de sistema' },
      { key: 'tamano', label: 'Tamaño', terminalDimension: 'size' },
      { key: 'anchura', label: 'Ancho', terminalDimension: 'width' },
      { key: 'altura', label: 'Alto', terminalDimension: 'height' },
    ],
    metrics: [],
  },
  'bandejas de cables': {
    groupFields: [
      ...commonFields,
      { key: 'tamano', label: 'Tamaño', ductDimension: 'size' },
      { key: 'anchura', label: 'Ancho', ductDimension: 'anchura' },
      { key: 'altura', label: 'Alto', ductDimension: 'altura' },
    ],
    metrics: [
      { key: 'longitud', label: 'Longitud', unit: 'm', aggregate: 'sum' },
    ],
  },
  'aparatos sanitarios': {
    groupFields: [
      ...commonFields,
      { key: 'clasificacion_sistema', label: 'Clasificación de sistema' },
      { key: 'nombre_sistema', label: 'Nombre de sistema' },
      { key: 'tipo_sistema', label: 'Tipo de sistema' },
    ],
    metrics: [
      { key: 'elevacion_desde_nivel', label: 'Elevación desde el nivel', unit: 'm', aggregate: 'distinct' },
    ],
  },
  'conductos flexibles': ROUND_MEP_DETAIL_CONFIG,
  tuberias: ROUND_MEP_DETAIL_CONFIG,
  conductos: {
    groupFields: [
      ...commonFields,
      { key: 'tamano', label: 'Tamaño', ductDimension: 'size' },
      { key: 'altura', label: 'Altura', ductDimension: 'altura' },
      { key: 'anchura', label: 'Anchura', ductDimension: 'anchura' },
      { key: 'diametro', label: 'Diámetro', ductDimension: 'diametro' },
      { key: 'clasificacion_sistema', label: 'Clasificación de sistema' },
      { key: 'tipo_sistema', label: 'Tipo de sistema' },
      { key: 'nombre_sistema', label: 'Nombre de sistema' },
    ],
    metrics: [
      { key: 'longitud', label: 'Longitud', unit: 'm', aggregate: 'sum' },
    ],
  },
  muros: {
    groupFields: [
      ...commonFields,
      { key: 'delimitacion_habitacion', label: 'Delim. habitación', boolean: true },
      { key: 'estructura', label: 'Estructural', boolean: true },
      { key: 'funcion', label: 'Función' },
    ],
    metrics: [
      { key: 'longitud', label: 'Longitud', unit: 'm', aggregate: 'sum' },
      { key: 'area', label: 'Área', unit: 'm²', aggregate: 'sum' },
      { key: 'volumen', label: 'Volumen', unit: 'm³', aggregate: 'sum' },
    ],
  },

  suelos: {
    groupFields: [
      ...commonFields,
      { key: 'delimitacion_habitacion', label: 'Delim. habitación', boolean: true },
      { key: 'estructura', label: 'Estructural', boolean: true },
      { key: 'funcion', label: 'Función' },
    ],
    metrics: [
      { key: 'grosor', label: 'Grosor', unit: 'm', aggregate: 'distinct' },
      { key: 'perimetro', label: 'Perímetro', unit: 'm', aggregate: 'sum' },
      { key: 'area', label: 'Área', unit: 'm²', aggregate: 'sum' },
      { key: 'volumen', label: 'Volumen', unit: 'm³', aggregate: 'sum' },
    ],
  },

  'pilares estructurales': {
    groupFields: [
      ...commonFields,
      { key: 'nivel_base', label: 'Nivel base' },
      { key: 'nivel_superior', label: 'Nivel superior' },
      { key: 'delimitacion_habitacion', label: 'Delim. habitación', boolean: true },
    ],
    metrics: [
      { key: 'longitud', label: 'Longitud', unit: 'm', aggregate: 'sum' },
      { key: 'volumen', label: 'Volumen', unit: 'm³', aggregate: 'sum' },
    ],
  },

  'armazon estructural': {
    groupFields: [
      ...commonFields,
      { key: 'nivel_referencia', label: 'Nivel referencia' },
      { key: 'uso_estructural', label: 'Uso estructural' },
    ],
    metrics: [
      { key: 'longitud', label: 'Longitud', unit: 'm', aggregate: 'sum' },
      { key: 'volumen', label: 'Volumen', unit: 'm³', aggregate: 'sum' },
    ],
  },

  'cimentacion estructural': {
    groupFields: [
      ...commonFields,
      { key: 'anfitrion', label: 'Anfitrión' },
    ],
    metrics: [],
  },

  escaleras: {
    groupFields: [
      ...commonFields,
      { key: 'nivel_base', label: 'Nivel base' },
      { key: 'nivel_superior', label: 'Nivel superior' },
    ],
    metrics: [],
  },

  techos: {
    groupFields: [
      ...commonFields,
      { key: 'delimitacion_habitacion', label: 'Delim. habitación', boolean: true },
    ],
    metrics: [
      { key: 'grosor', label: 'Grosor', unit: 'm', aggregate: 'distinct' },
    ],
  },

  puertas: {
    groupFields: [
      ...commonFields,
      { key: 'funcion', label: 'Función' },
    ],
    metrics: [
      { key: 'altura_antepecho', label: 'Altura antepecho', unit: 'm', aggregate: 'distinct' },
    ],
  },

  ventanas: {
    groupFields: [
      ...commonFields,
      { key: 'funcion', label: 'Función' },
    ],
    metrics: [
      { key: 'altura_antepecho', label: 'Altura antepecho', unit: 'm', aggregate: 'distinct' },
    ],
  },

  'modelos genericos': {
    groupFields: [...commonFields],
    metrics: [],
  },

  mobiliario: {
    groupFields: [...commonFields],
    metrics: [
      { key: 'elevacion_desde_nivel', label: 'Elevación nivel', unit: 'm', aggregate: 'distinct' },
      { key: 'desfase_desde_anfitrion', label: 'Desfase anfitrión', unit: 'm', aggregate: 'distinct' },
    ],
  },

  'muebles de obra': {
    groupFields: [...commonFields],
    metrics: [
      { key: 'elevacion_desde_nivel', label: 'Elevación nivel', unit: 'm', aggregate: 'distinct' },
      { key: 'desfase_desde_anfitrion', label: 'Desfase anfitrión', unit: 'm', aggregate: 'distinct' },
    ],
  },

  masas: {
    groupFields: [...commonFields],
    metrics: [],
  },
};

const getCategoryDetailConfig = (categoryName: string): CategoryDetailConfig => {
  const normalized = normalizeKey(categoryName);

  return CATEGORY_DETAIL_CONFIG[normalized] || {
    groupFields: [...commonFields],
    metrics: [],
  };
};

const getDetailValue = (
  element: any,
  familyName: string,
  typeName: string,
  field: DetailField
): string => {
  if (field.fittingDimension) {
    const read = (source: any, names: string[]) => {
      if (!source || typeof source !== 'object') return undefined;
      return Object.entries(source).find(([key]) => names.includes(normalizeKey(key)))?.[1];
    };
    const size = read(element, ['tamano']);
    const diameter = read(size, ['diametro']) ?? read(element, ['diametro']);
    const formatDimension = (value: unknown) => {
      if (value == null || value === '') return '—';
      if (Number.isFinite(Number(value))) return formatMetric(Number(value) * 1000, 'mm');
      return typeof value === 'string' ? value : '—';
    };
    if (field.fittingDimension === 'diameter') return formatDimension(diameter);
    if (typeof size === 'string' && size.trim()) return size;
    const width = read(size, ['anchura', 'ancho']) ?? read(element, ['anchura', 'ancho']);
    const height = read(size, ['altura', 'alto']) ?? read(element, ['altura', 'alto']);
    if (width != null && height != null) return `${formatDimension(width)} × ${formatDimension(height)}`;
    return diameter == null ? '—' : `Ø ${formatDimension(diameter)}`;
  }
  if (field.terminalDimension) {
    const size = element?.['tamaño'] ?? element?.tamano;
    const dimension = (aliases: string[]): number | null => {
      for (const source of [size, element]) {
        if (!source || typeof source !== 'object') continue;
        for (const alias of aliases) {
          const entry = Object.entries(source).find(([key]) => normalizeKey(key).replace(/_/g, ' ') === alias);
          const value = entry?.[1];
          if (value != null && value !== '' && Number.isFinite(Number(value))) return Number(value);
        }
      }
      return null;
    };
    const width = dimension(['anchura', 'ancho', 'ancho de placa']);
    const height = dimension(['altura', 'alto', 'alto de placa']);
    const formatDimension = (value: number | null) => value === null ? '—' : formatMetric(value * 1000, 'mm');
    if (field.terminalDimension === 'width') return formatDimension(width);
    if (field.terminalDimension === 'height') return formatDimension(height);
    if (typeof size === 'string' && size.trim()) return size;
    return width === null || height === null ? '—' : `${formatDimension(width)} × ${formatDimension(height)}`;
  }
  if (field.ductDimension) {
    const size = element?.['tamaño'] ?? element?.tamano ?? {};
    const dimension = (key: string): number | null => {
      const value = size?.[key] ?? element?.[key];
      return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
    };
    const diameter = dimension('diametro');
    const isRound = diameter !== null || normalizeKey(element?.familia || familyName).includes('redondo');
    const formatDimension = (value: number | null) => value === null ? '—' : formatMetric(value * 1000, 'mm');
    if (field.ductDimension === 'diametro') return isRound ? formatDimension(diameter) : '—';
    if (isRound) return '—';
    if (field.ductDimension === 'size') {
      const height = dimension('altura');
      const width = dimension('anchura');
      return height === null || width === null ? '—' : `${formatDimension(width)} × ${formatDimension(height)}`;
    }
    return formatDimension(dimension(field.ductDimension));
  }
  if (field.key === 'familia') {
    return String(element?.familia || familyName || 'Sin familia');
  }

  if (field.key === 'tipo') {
    return String(element?.nombre_tipo || typeName || 'Sin tipo');
  }

  const rawValue = element?.[field.key];

  if (field.boolean) {
    return formatBooleanValue(rawValue);
  }

  if (rawValue == null || rawValue === '') {
    return '—';
  }

  return String(rawValue);
};

const buildCategoryGroups = (
  category: any,
  config: CategoryDetailConfig,
  includeElement: (element: any, family: string, type: string) => boolean = () => true
): CategoryDetailRow[] => {
  const grouped = new Map<
    string,
    {
      row: CategoryDetailRow;
      distinctMetrics: Record<string, Set<number>>;
    }
  >();

  const families = Object.entries(category?.familias || {}) as [string, any][];

  families.forEach(([familyName, family]) => {
    const types = Object.entries(family?.tipos || {}) as [string, any][];

    types.forEach(([typeName, type]) => {
      const elements = Array.isArray(type?.elementos) ? type.elementos : [];

      elements.forEach((element: any) => {
        if (!includeElement(element, familyName, typeName)) return;
        const values: Record<string, string> = {};

        config.groupFields.forEach(field => {
          values[field.key] = getDetailValue(
            element,
            familyName,
            typeName,
            field
          );
        });

        const groupingKey = config.groupFields
          .map(field => values[field.key])
          .join('|||');

        if (!grouped.has(groupingKey)) {
          grouped.set(groupingKey, {
            row: {
              key: groupingKey,
              values,
              cantidad: 0,
              metrics: {},
              elements: [],
            },
            distinctMetrics: {},
          });
        }

        const group = grouped.get(groupingKey)!;
        group.row.cantidad += 1;
        group.row.elements.push({
          id: getElementIdentifier(element, ['id', 'elementid', 'idelemento']),
          ifcGUID: getElementIdentifier(element, ['ifcguid', 'ifcglobalid', 'globalid']),
          data: { familia: familyName, nombre_tipo: typeName, ...element },
        });

        config.metrics.forEach(metric => {
          const rawValue = element?.[metric.key];
          const numericValue = Number(rawValue);

          if (rawValue == null || rawValue === '' || !Number.isFinite(numericValue)) {
            return;
          }

          if (metric.aggregate === 'sum') {
            const current = Number(group.row.metrics[metric.key] || 0);
            group.row.metrics[metric.key] = current + numericValue;
            return;
          }

          if (!group.distinctMetrics[metric.key]) {
            group.distinctMetrics[metric.key] = new Set<number>();
          }

          group.distinctMetrics[metric.key].add(numericValue);
        });
      });
    });
  });

  const rows = Array.from(grouped.values()).map(group => {
    config.metrics.forEach(metric => {
      if (metric.aggregate !== 'distinct') return;

      const values = Array.from(group.distinctMetrics[metric.key] || []);

      if (values.length === 0) {
        group.row.metrics[metric.key] = '—';
      } else if (values.length === 1) {
        group.row.metrics[metric.key] = values[0];
      } else {
        group.row.metrics[metric.key] = 'Varios';
      }
    });

    return group.row;
  });

  return rows.sort((a, b) => {
    const familyCompare = String(a.values.familia || '').localeCompare(
      String(b.values.familia || ''),
      'es',
      { sensitivity: 'base' }
    );

    if (familyCompare !== 0) return familyCompare;

    const typeCompare = String(a.values.tipo || '').localeCompare(
      String(b.values.tipo || ''),
      'es',
      { sensitivity: 'base' }
    );

    if (typeCompare !== 0) return typeCompare;

    return String(a.values.nivel || '').localeCompare(
      String(b.values.nivel || ''),
      'es',
      { sensitivity: 'base' }
    );
  });
};

const formatDetailMetric = (
  value: number | string | undefined,
  metric: MetricField
): string => {
  if (value == null || value === '—') return '—';
  if (value === 'Varios') return 'Varios';

  return formatMetric(Number(value), metric.unit);
};

export const Elements3DView: React.FC<Elements3DViewProps> = ({ data, showAudit = false }) => {
  const categories = useMemo(() => get3DCategories(data), [data]);
  const [detailCategoryName, setDetailCategoryName] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setFilters({});
  }, [data, detailCategoryName]);

  useEffect(() => {
    setExpandedGroups(new Set());
  }, [filters]);

  useEffect(() => {
    setExpandedGroups(new Set());
  }, [data, detailCategoryName]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const detailCategory = useMemo(
    () => categories.find(category => category.name === detailCategoryName) || null,
    [categories, detailCategoryName]
  );

  const detailConfig = useMemo(
    () => getCategoryDetailConfig(detailCategory?.name || ''),
    [detailCategory]
  );

  const allDetailRows = useMemo(
    () => buildCategoryGroups(detailCategory, detailConfig),
    [detailCategory, detailConfig]
  );

  const allElements = useMemo(() => allDetailRows.flatMap(row => row.elements), [allDetailRows]);
  const filterFields = useMemo(() => {
    const extras: DetailField[] = [
      { key: 'pineado', label: 'Pineado', boolean: true },
      { key: 'subproyecto', label: 'Subproyecto' },
      { key: 'fase', label: 'Fase' },
    ];
    return [...detailConfig.groupFields, ...extras.filter(field =>
      !detailConfig.groupFields.some(existing => existing.key === field.key) &&
      allElements.some(element => field.key === 'pineado'
        ? element.data.pineado != null || element.data.esta_pineado != null
        : element.data[field.key] != null)
    )];
  }, [detailConfig, allElements]);

  const filterValue = (element: any, family: string, type: string, field: DetailField) =>
    getDetailValue(field.key === 'pineado'
      ? { ...element, pineado: element.pineado ?? element.esta_pineado }
      : element, family, type, field);

  const matchesFilters = (element: any, family: string, type: string, except?: string) =>
    filterFields.every(field => field.key === except || filters[field.key] === undefined ||
      filterValue(element, family, type, field) === filters[field.key]);

  const detailRows = useMemo(() => buildCategoryGroups(detailCategory, detailConfig,
    (element, family, type) => matchesFilters(element, family, type)
  ), [detailCategory, detailConfig, filterFields, filters]);

  const filteredElements = useMemo(() => detailRows.flatMap(row => row.elements), [detailRows]);
  const filterOptions = useMemo(() => Object.fromEntries(filterFields.map(field => {
    const values = new Set<string>(allElements.filter(element => matchesFilters(
      element.data, String(element.data.familia || ''), String(element.data.nombre_tipo || ''), field.key
    )).map(element => filterValue(element.data, String(element.data.familia || ''), String(element.data.nombre_tipo || ''), field)));
    if (filters[field.key] !== undefined) values.add(filters[field.key]);
    return [field.key, Array.from(values).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))];
  })), [allElements, filterFields, filters]);

  const metricSummary = useMemo(() => detailConfig.metrics.map(metric => {
    const values = filteredElements.map(element => element.data[metric.key])
      .filter(value => value != null && value !== '' && Number.isFinite(Number(value))).map(Number);
    const unique = Array.from(new Set<number>(values));
    const value = metric.aggregate === 'sum'
      ? (values.length ? formatMetric(values.reduce((sum, item) => sum + item, 0), metric.unit) : '—')
      : unique.length === 1 ? formatMetric(unique[0], metric.unit) : unique.length ? 'Varios' : '—';
    return { label: metric.label, value };
  }), [detailConfig, filteredElements]);

  const exportDetailCategory = () => {
    if (!detailCategory) return;
    const elements = detailRows.flatMap(row => row.elements.map(element => ({
      ...Object.fromEntries(detailConfig.groupFields.map(field => [
        field.label, getDetailValue(element.data, row.values.familia, row.values.tipo, field)
      ])),
      Elementos: 1,
      ...Object.fromEntries(detailConfig.metrics.map(metric => {
        const value = element.data[metric.key];
        return [
          `${metric.label} (${metric.unit})`,
          value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : Number(value)
        ];
      })),
      ID: element.id,
      'IFC GUID': element.ifcGUID,
    })));
    export3DCategoryToExcel(`${data?.modelo?.nombre_archivo || 'Modelo'}_${detailCategory.name}`, detailCategory.name, elements);
  };

  const rvtLinks = useMemo(() => {
    const source = data?.['EXPORTACIONES ELEMENTOS 3D'];
    if (!source || typeof source !== 'object') return null;

    const entry = Object.entries(source).find(([name]) => {
      const normalized = name
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .trim();
      return normalized === 'vinculos rvt';
    });

    if (!entry) return null;

    const value: any = entry[1] || {};
    const listado =
      value.listado ||
      value.elementos ||
      value.vinculos ||
      value.instancias ||
      [];

    return {
      cantidad: Number(
        value.cantidad ??
        value.cantidad_elementos ??
        (Array.isArray(listado) ? listado.length : 0)
      ),
      listado: Array.isArray(listado) ? listado : [],
      raw: value
    };
  }, [data]);

  const materialsByCategory = useMemo(() => {
    const source = data?.['EXPORTACIONES ELEMENTOS 3D'];
    if (!source || typeof source !== 'object') return [];

    return Object.entries(source)
      .filter(([categoryName, categoryValue]: [string, any]) => {
        const normalizedName = normalizeKey(categoryName);
        return (
          normalizedName !== 'vinculos rvt' &&
          categoryValue &&
          typeof categoryValue === 'object' &&
          Number(categoryValue?.cantidad ?? 0) > 0
        );
      })
      .map(([categoryName, categoryValue]: [string, any]) => ({
        categoria: categoryName,
        materiales: getMaterialsFromCategory(categoryValue),
      }))
      .filter(item => item.materiales.length > 0)
      .sort((a, b) =>
        a.categoria.localeCompare(b.categoria, 'es', { sensitivity: 'base' })
      );
  }, [data]);

  const uniqueMaterialsCount = useMemo(() => {
    const materials = new Set<string>();
    materialsByCategory.forEach(category =>
      category.materiales.forEach(material => materials.add(material))
    );
    return materials.size;
  }, [materialsByCategory]);

  if (showAudit) {
    return (
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs p-10 text-center">
        <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-800">
          <Layers3 size={28} />
        </div>
        <h3 className="text-lg font-black text-zinc-900">Auditoría de Elementos 3D</h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-xl mx-auto leading-relaxed">
          Los datos 3D ya están preparados. Las reglas de auditoría se incorporarán progresivamente; por ahora la pestaña Datos muestra la estructura real del modelo por categoría, familia y tipo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Categorías del modelo</p>
            <h2 className="text-lg font-black text-zinc-900 mt-0.5">Desglose por familias y tipos</h2>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-400">{categories.length} tarjetas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">
          {rvtLinks && (
            <article className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden flex flex-col min-h-[300px] max-h-[390px]">
              <div className="p-4 border-b border-zinc-100 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black font-mono text-zinc-400">RVT</span>
                      <h3 className="text-sm font-black text-zinc-900">Vínculos RVT</h3>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 font-medium">Modelos Revit vinculados</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-black font-mono text-zinc-800">
                    {rvtLinks.cantidad.toLocaleString()} vínc.
                  </span>
                </div>
              </div>

              <div className="p-3 overflow-y-auto flex-1 space-y-2 scrollbar-thin">
                {rvtLinks.listado.length > 0 ? (
                  rvtLinks.listado.map((link: any, linkIndex: number) => {
                    const nombre =
                      link.nombre ||
                      link.nombre_archivo ||
                      link.name ||
                      link.tipo ||
                      `Vínculo RVT ${linkIndex + 1}`;

                    const estado =
                      link.estado ||
                      link.status ||
                      (link.cargado === false ? 'No cargado' : link.cargado === true ? 'Cargado' : null);

                    const id =
                      link.id ??
                      link.element_id ??
                      link.elementId ??
                      null;

                    return (
                      <div key={`${nombre}-${id ?? linkIndex}`} className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[11px] font-black text-zinc-800 break-words">{nombre}</span>
                          {estado && (
                            <span className="text-[9px] font-bold text-zinc-500 shrink-0">{String(estado)}</span>
                          )}
                        </div>
                        {id !== null && (
                          <div className="text-[9px] font-mono text-zinc-400 mt-1">ID: {String(id)}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center px-4">
                    <div className="text-2xl font-black font-mono text-zinc-800">{rvtLinks.cantidad.toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      vínculos RVT detectados
                    </div>
                  </div>
                )}
              </div>
            </article>
          )}

          {categories.map((category, index) => {
            const families = Object.entries(category.familias || {}) as [string, any][];
            return (
              <article
                key={category.name}
                onClick={() => setDetailCategoryName(category.name)}
                className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden flex flex-col min-h-[300px] max-h-[390px] cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <div className="p-4 border-b border-zinc-100 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black font-mono text-zinc-400">{String(index + 1).padStart(2, '0')}</span>
                        <h3 className="text-sm font-black text-zinc-900 truncate" title={category.name}>{category.name}</h3>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                        {category.cantidadFamilias} {category.cantidadFamilias === 1 ? 'familia' : 'familias'}
                        <span className="ml-1.5 text-zinc-500">· Clic para ver detalle</span>
                      </p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-black font-mono text-zinc-800">
                      {category.cantidad.toLocaleString()} elem.
                    </span>
                  </div>
                </div>

                <div className="p-3 overflow-y-auto flex-1 space-y-2 scrollbar-thin">
                  {families.length === 0 ? (
                    <div className="h-full min-h-[150px] flex items-center justify-center text-xs text-zinc-400">Sin familias</div>
                  ) : families.map(([familyName, family]: [string, any]) => {
                    const types = Object.entries(family?.tipos || {}) as [string, any][];
                    return (
                      <div key={familyName} className="rounded-xl border border-zinc-200 bg-zinc-50/70 overflow-hidden">
                        <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-zinc-200/70">
                          <div className="min-w-0 flex items-center gap-1.5">
                            <ChevronRight size={12} className="text-zinc-400 shrink-0" />
                            <span className="text-[11px] font-black text-zinc-800 truncate" title={familyName}>{familyName}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">{Number(family?.cantidad_elementos || 0).toLocaleString()} elem.</span>
                        </div>
                        {types.length > 0 && (
                          <div className="divide-y divide-zinc-200/60 bg-white">
                            {types.map(([typeName, type]: [string, any]) => (
                              <div key={typeName} className="px-3 py-2 flex items-start justify-between gap-3">
                                <span className="text-[10px] leading-4 text-zinc-600 font-medium min-w-0 break-words" title={typeName}>{typeName}</span>
                                <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">{Number(type?.cantidad_elementos || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}

          <article className="bg-zinc-100 rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden flex flex-col md:col-span-2 xl:col-span-3">
            <div className="p-4 border-b border-zinc-200 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black font-mono text-zinc-500">MAT</span>
                    <h3 className="text-sm font-black text-zinc-900">Materiales por categoría</h3>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                    Materiales detectados en los datos exportados de cada categoría 3D
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-black font-mono text-zinc-800">
                    {uniqueMaterialsCount.toLocaleString()} únicos
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-black font-mono text-zinc-600">
                    {materialsByCategory.length.toLocaleString()} categorías
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 max-h-[420px] overflow-y-auto scrollbar-thin">
              {materialsByCategory.length === 0 ? (
                <div className="min-h-[150px] flex flex-col items-center justify-center text-center px-6">
                  <div className="text-xs font-black text-zinc-700">
                    No se han encontrado materiales en este JSON
                  </div>
                  <div className="text-[10px] leading-4 text-zinc-400 mt-1 max-w-xl">
                    La tarjeta está preparada para leer materiales exportados dentro de las categorías, familias, tipos o parámetros.
                    Si el exportador 3D todavía no incluye los materiales, habrá que añadirlos al JSON.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {materialsByCategory.map(category => (
                    <div
                      key={category.categoria}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/70 overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-zinc-200/70 flex items-center justify-between gap-3">
                        <span
                          className="text-[11px] font-black text-zinc-800 truncate"
                          title={category.categoria}
                        >
                          {category.categoria}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">
                          {category.materiales.length}
                        </span>
                      </div>

                      <div className="divide-y divide-zinc-200/60 bg-white">
                        {category.materiales.map(material => (
                          <div
                            key={`${category.categoria}-${material}`}
                            className="px-3 py-2 text-[10px] leading-4 text-zinc-600 font-medium break-words"
                            title={material}
                          >
                            {material}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>

      {detailCategory && (
        <div
          className="fixed inset-0 z-[200] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4 md:p-8"
          onClick={() => setDetailCategoryName(null)}
        >
          <div
            className="w-full max-w-[1600px] max-h-[88vh] bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-zinc-200 flex items-start justify-between gap-4 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                  Elementos 3D
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <h2 className="text-xl font-black text-zinc-900">
                    {detailCategory.name}
                  </h2>

                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-black font-mono text-zinc-700">
                    {filteredElements.length.toLocaleString()} de {allElements.length.toLocaleString()} elem.
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-black font-mono text-zinc-500">
                    {detailRows.length.toLocaleString()} agrupaciones
                  </span>
                </div>

                <p className="text-xs text-zinc-500 mt-2">
                  Agrupado por {detailConfig.groupFields.map(field => field.label.toLowerCase()).join(', ')}.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={exportDetailCategory}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 text-[10px] font-black uppercase tracking-wide transition-all shadow-2xs"
                  title={`Exportar ${detailCategory.name}: una fila por elemento con sus valores e identificadores`}
                >
                  <FileSpreadsheet size={14} />
                  Exportar Excel
                </button>
              <button
                type="button"
                onClick={() => setDetailCategoryName(null)}
                className="w-9 h-9 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50 shrink-0 max-h-[30vh] overflow-auto">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-zinc-700">Filtrar elementos</span>
                <button type="button" onClick={() => setFilters({})} disabled={Object.keys(filters).length === 0}
                  className="text-xs px-3 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40">
                  Limpiar filtros
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {filterFields.map(field => (
                  <label key={field.key} className="min-w-0 text-[10px] font-bold text-zinc-600">
                    {field.label}
                    <select value={filters[field.key] === undefined ? '' : `value:${filters[field.key]}`}
                      onChange={event => {
                        const value = event.target.value;
                        setFilters(previous => {
                          const next = { ...previous };
                          if (value === '') delete next[field.key];
                          else next[field.key] = value.slice(6);
                          return next;
                        });
                      }}
                      className="mt-1 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal">
                      <option value="">Todos</option>
                      {(filterOptions[field.key] || []).map(value => (
                        <option key={value} value={`value:${value}`}>{value === '—' ? 'Sin dato' : value}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-zinc-700" aria-live="polite">
                <span><strong>{filteredElements.length.toLocaleString()}</strong> elementos · {detailRows.length.toLocaleString()} agrupaciones</span>
                {metricSummary.map(metric => <span key={metric.label}>{metric.label}: <strong>{metric.value}</strong></span>)}
              </div>
            </div>
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full min-w-max border-collapse">
                <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    {detailConfig.groupFields.map(field => (
                      <th
                        key={field.key}
                        className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap"
                      >
                        {field.label}
                      </th>
                    ))}

                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                      Elementos
                    </th>

                    {detailConfig.metrics.map(metric => (
                      <th
                        key={metric.key}
                        className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap"
                      >
                        {metric.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {detailRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={detailConfig.groupFields.length + detailConfig.metrics.length + 1}
                        className="px-6 py-12 text-center text-xs text-zinc-400"
                      >
                        No hay elementos que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    detailRows.map((row, index) => (
                      <React.Fragment key={`${row.key}-${index}`}>
                      <tr
                        onClick={() => toggleGroup(row.key)}
                        className="hover:bg-zinc-50/70 cursor-pointer"
                      >
                        {detailConfig.groupFields.map((field, fieldIndex) => (
                          <td
                            key={field.key}
                            className={`px-4 py-3 text-[11px] ${
                              fieldIndex === 0
                                ? 'font-black text-zinc-800'
                                : 'font-medium text-zinc-600'
                            } whitespace-nowrap`}
                          >
                            {row.values[field.key] || '—'}
                          </td>
                        ))}

                        <td className="px-4 py-3 text-[11px] font-black font-mono text-zinc-800 whitespace-nowrap">
                            <button
                              type="button"
                              aria-expanded={expandedGroups.has(row.key)}
                              aria-label={`${expandedGroups.has(row.key) ? 'Ocultar' : 'Mostrar'} los ${row.cantidad} elementos de ${row.values.familia}, ${row.values.tipo}`}
                              onClick={event => {
                                event.stopPropagation();
                                toggleGroup(row.key);
                              }}
                              className="inline-flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
                            >
                              <ChevronRight size={14} className={`transition-transform ${expandedGroups.has(row.key) ? 'rotate-90' : ''}`} />
                              {row.cantidad.toLocaleString()}
                            </button>
                        </td>

                        {detailConfig.metrics.map(metric => (
                          <td
                            key={metric.key}
                            className="px-4 py-3 text-[11px] font-mono text-zinc-600 whitespace-nowrap"
                          >
                            {formatDetailMetric(
                              row.metrics[metric.key],
                              metric
                            )}
                          </td>
                        ))}
                      </tr>
                      {expandedGroups.has(row.key) && (
                        <tr>
                          <td colSpan={detailConfig.groupFields.length + detailConfig.metrics.length + 1} className="px-6 py-3 bg-zinc-50">
                            <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200 bg-white">
                              <ElementDetailsTable row={row} config={detailConfig} />
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50/70 shrink-0">
              <p className="text-[10px] text-zinc-400">
                Las magnitudes acumulables se muestran como suma de los elementos de cada agrupación.
                Los valores propios del tipo, como grosor o cotas de referencia, se muestran como valor único;
                si dentro de una misma agrupación existen varios valores, aparece “Varios”.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
