import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Tags, ChevronDown, ChevronRight, Layers3 } from 'lucide-react';
import { Project, Elements3DAuditConfig, Elements3DNomenclatureField, NomenclatureFieldType, ModelDiscipline, BooleanAuditExpectation, DEFAULT_ELEMENTS_3D_CONFIG } from '../../types';
import { get3DCategories } from '../../utils/modelUtils';

interface Elements3DSettingsProps {
  currentProject: Project;
  config: Elements3DAuditConfig;
  onChange: (newConfig: Elements3DAuditConfig) => void;
}

const makeId = () => `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_DIMENSION_UNITS = ['mm', 'cm', 'm'];


const DISCIPLINES: { key: ModelDiscipline; label: string }[] = [
  { key: 'arquitectura', label: 'Arquitectura' },
  { key: 'estructura', label: 'Estructura' },
  { key: 'instalaciones', label: 'Instalaciones (MEP)' },
  { key: 'urbanizacion', label: 'Urbanización' },
  { key: 'federado', label: 'Federado' },
  { key: 'otro', label: 'Otro' },
];

const EXPECTATION_OPTIONS: { value: BooleanAuditExpectation; label: string }[] = [
  { value: 'ignore', label: 'No auditar' },
  { value: 'required_true', label: 'Debe estar activado' },
  { value: 'required_false', label: 'Debe estar desactivado' },
];

const normalizeCategoryName = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const createField = (): Elements3DNomenclatureField => ({
  id: makeId(),
  name: '',
  type: 'codes',
  codes: [],
  dimensionConfig: {
    allowedUnits: [...DEFAULT_DIMENSION_UNITS],
    allowDecimals: true,
    separator: 'x'
  }
});

const normalizeField = (field: any): Elements3DNomenclatureField => ({
  id: typeof field?.id === 'string' && field.id.trim() ? field.id : makeId(),
  name: typeof field?.name === 'string' ? field.name : '',
  type: (['codes', 'free', 'dimension', 'dimension_pair'].includes(field?.type) ? field.type : 'codes') as NomenclatureFieldType,
  codes: Array.isArray(field?.codes) ? field.codes.filter((code: unknown): code is string => typeof code === 'string') : [],
  dimensionConfig: {
    allowedUnits: Array.isArray(field?.dimensionConfig?.allowedUnits) && field.dimensionConfig.allowedUnits.length
      ? field.dimensionConfig.allowedUnits
      : [...DEFAULT_DIMENSION_UNITS],
    allowDecimals: typeof field?.dimensionConfig?.allowDecimals === 'boolean' ? field.dimensionConfig.allowDecimals : true,
    separator: typeof field?.dimensionConfig?.separator === 'string' && field.dimensionConfig.separator.length
      ? field.dimensionConfig.separator
      : 'x'
  }
});

export const Elements3DSettings: React.FC<Elements3DSettingsProps> = ({ currentProject, config, onChange }) => {
  const categories = useMemo(() => {
    const names = new Set<string>();
    (currentProject.files || []).forEach(file => {
      if (!file.has3DData || !file.model3DData) return;
      get3DCategories(file.model3DData).forEach(category => names.add(category.name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [currentProject.files]);

  const [openCategory, setOpenCategory] = useState<string | null>(categories[0] || null);
  const [draftCodes, setDraftCodes] = useState<Record<string, string>>({});

  const updateCategory = (category: string, fields: Elements3DNomenclatureField[]) => {
    onChange({
      ...config,
      nomenclatureByCategory: {
        ...(config.nomenclatureByCategory || {}),
        [category]: {
          ...(config.nomenclatureByCategory?.[category] || {}),
          enabled: true,
          nomenclatureFields: fields,
        },
      },
    });
  };

  const addField = (category: string) => {
    const current = config.nomenclatureByCategory?.[category]?.nomenclatureFields || [];
    updateCategory(category, [...current.map(normalizeField), createField()]);
    setOpenCategory(category);
  };

  const patchField = (category: string, fieldId: string, patch: Partial<Elements3DNomenclatureField>) => {
    const current = (config.nomenclatureByCategory?.[category]?.nomenclatureFields || []).map(normalizeField);
    updateCategory(category, current.map(field => field.id === fieldId ? { ...field, ...patch } : field));
  };

  const deleteField = (category: string, fieldId: string) => {
    const current = (config.nomenclatureByCategory?.[category]?.nomenclatureFields || []).map(normalizeField);
    updateCategory(category, current.filter(field => field.id !== fieldId));
  };

  const addCode = (category: string, field: Elements3DNomenclatureField) => {
    const key = `${category}__${field.id}`;
    const value = (draftCodes[key] || '').trim();
    if (!value) return;
    const codes = Array.from(new Set([...(field.codes || []), value]));
    patchField(category, field.id, { codes });
    setDraftCodes(prev => ({ ...prev, [key]: '' }));
  };

  const removeCode = (category: string, field: Elements3DNomenclatureField, code: string) => {
    patchField(category, field.id, { codes: field.codes.filter(item => item !== code) });
  };

  const getWallRule = (discipline: ModelDiscipline) => {
    return config.wallRulesByDiscipline?.[discipline]
      || DEFAULT_ELEMENTS_3D_CONFIG.wallRulesByDiscipline?.[discipline]
      || { roomBounding: 'ignore', structural: 'ignore' };
  };

  const patchWallRule = (
    discipline: ModelDiscipline,
    field: 'roomBounding' | 'structural',
    value: BooleanAuditExpectation
  ) => {
    const current = getWallRule(discipline);
    onChange({
      ...config,
      wallRulesByDiscipline: {
        ...(DEFAULT_ELEMENTS_3D_CONFIG.wallRulesByDiscipline || {}),
        ...(config.wallRulesByDiscipline || {}),
        [discipline]: {
          ...current,
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers3 size={17} className="text-zinc-700" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Elementos 3D</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">Nomenclatura por categoría</h3>
            <p className="text-xs italic text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Define manualmente los campos que componen la nomenclatura y los códigos permitidos para cada categoría. Por ahora solo se configura la regla; la comprobación automática se añadirá después.
            </p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-[10px] font-black font-mono text-zinc-700">
            {categories.length} categorías
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <Tags size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-600">No hay categorías 3D importadas</p>
            <p className="text-xs text-slate-400 mt-1">Importa primero un JSON de Elementos 3D para crear sus reglas de nomenclatura.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map(category => {
              const isOpen = openCategory === category;
              const fields = (config.nomenclatureByCategory?.[category]?.nomenclatureFields || []).map(normalizeField);
              return (
                <section key={category} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenCategory(isOpen ? null : category)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? <ChevronDown size={15} className="text-slate-400 shrink-0" /> : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
                      <span className="text-sm font-black text-slate-800 truncate">{category}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                      {fields.length} {fields.length === 1 ? 'campo' : 'campos'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">
                      {normalizeCategoryName(category) === 'muros' && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reglas por disciplina</p>
                              <h4 className="text-sm font-black text-slate-900 mt-0.5">Propiedades obligatorias de los muros</h4>
                              <p className="text-[11px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
                                Define manualmente si cada disciplina debe auditar las propiedades “Delimitación de habitación” y “Estructural”. La configuración puede cambiar en cada proyecto.
                              </p>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <div className="min-w-[680px]">
                              <div className="grid grid-cols-[180px_1fr_1fr] gap-0 bg-slate-50 border-b border-slate-200">
                                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Disciplina</div>
                                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 border-l border-slate-200">Delimitación de habitación</div>
                                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 border-l border-slate-200">Estructural</div>
                              </div>

                              {DISCIPLINES.map(({ key, label }) => {
                                const rule = getWallRule(key);
                                return (
                                  <div key={key} className="grid grid-cols-[180px_1fr_1fr] gap-0 border-b last:border-b-0 border-slate-100">
                                    <div className="px-3 py-3 text-xs font-black text-slate-700 flex items-center">{label}</div>
                                    <div className="px-3 py-2 border-l border-slate-100">
                                      <select
                                        value={rule.roomBounding}
                                        onChange={e => patchWallRule(key, 'roomBounding', e.target.value as BooleanAuditExpectation)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-zinc-400"
                                      >
                                        {EXPECTATION_OPTIONS.map(option => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="px-3 py-2 border-l border-slate-100">
                                      <select
                                        value={rule.structural}
                                        onChange={e => patchWallRule(key, 'structural', e.target.value as BooleanAuditExpectation)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-zinc-400"
                                      >
                                        {EXPECTATION_OPTIONS.map(option => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[10px] text-slate-500 leading-relaxed">
                            Valores iniciales: <strong>Arquitectura</strong> → Delimitación activada; <strong>Instalaciones</strong> → Delimitación activada + Estructural activado. Puedes cambiar cualquiera de ellos manualmente.
                          </div>
                        </div>
                      )}

                      {fields.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                          <p className="text-xs font-bold text-slate-500">Todavía no hay campos de nomenclatura para esta categoría.</p>
                        </div>
                      ) : (
                        fields.map((field, index) => {
                          const key = `${category}__${field.id}`;
                          return (
                            <div key={field.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Campo {index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => deleteField(category, field.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Eliminar campo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nombre del campo</label>
                                <input
                                  type="text"
                                  value={field.name}
                                  onChange={e => patchField(category, field.id, { name: e.target.value })}
                                  placeholder="Ej: Disciplina, Material, Tipo, Código de sistema..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-zinc-400 outline-none transition-colors"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tipo de campo</label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                  {([
                                    ['codes', 'Códigos permitidos'],
                                    ['free', 'Texto libre'],
                                    ['dimension', 'Dimensión'],
                                    ['dimension_pair', 'Alto × Ancho']
                                  ] as [NomenclatureFieldType, string][]).map(([type, label]) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => patchField(category, field.id, { type })}
                                      className={`px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${
                                        field.type === type
                                          ? 'bg-zinc-900 text-white border-zinc-900'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {field.type === 'codes' && (
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Códigos permitidos</label>
                                  <div className="flex flex-wrap gap-1.5 min-h-[26px] mb-2">
                                    {(field.codes || []).map(code => (
                                      <span key={code} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-[10px] font-black font-mono text-zinc-700">
                                        {code}
                                        <button type="button" onClick={() => removeCode(category, field, code)} className="text-zinc-400 hover:text-rose-600">×</button>
                                      </span>
                                    ))}
                                    {field.codes.length === 0 && <span className="text-[10px] italic text-slate-400">Sin códigos definidos</span>}
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      value={draftCodes[key] || ''}
                                      onChange={e => setDraftCodes(prev => ({ ...prev, [key]: e.target.value.toUpperCase() }))}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addCode(category, field);
                                        }
                                      }}
                                      placeholder="Ej: EST"
                                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-zinc-400 outline-none transition-colors"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => addCode(category, field)}
                                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white text-[10px] font-black hover:bg-zinc-800 transition-colors"
                                    >
                                      <Plus size={13} />
                                      Añadir código
                                    </button>
                                  </div>
                                </div>
                              )}

                              {field.type === 'free' && (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                                  <p className="text-xs font-bold text-slate-600">Campo descriptivo — se acepta cualquier texto.</p>
                                  <p className="text-[10px] text-slate-400 mt-1">No se comparará contra una lista de códigos permitidos.</p>
                                </div>
                              )}

                              {(field.type === 'dimension' || field.type === 'dimension_pair') && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                                  <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Unidades permitidas</label>
                                    <div className="flex flex-wrap gap-2">
                                      {DEFAULT_DIMENSION_UNITS.map(unit => {
                                        const selected = field.dimensionConfig?.allowedUnits?.includes(unit) ?? false;
                                        return (
                                          <button
                                            key={unit}
                                            type="button"
                                            onClick={() => {
                                              const currentUnits = field.dimensionConfig?.allowedUnits || [];
                                              const allowedUnits = selected
                                                ? currentUnits.filter(item => item !== unit)
                                                : [...currentUnits, unit];
                                              patchField(category, field.id, {
                                                dimensionConfig: {
                                                  allowedUnits,
                                                  allowDecimals: field.dimensionConfig?.allowDecimals ?? true,
                                                  separator: field.dimensionConfig?.separator || 'x'
                                                }
                                              });
                                            }}
                                            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black font-mono ${
                                              selected
                                                ? 'bg-zinc-900 text-white border-zinc-900'
                                                : 'bg-white text-slate-600 border-slate-200'
                                            }`}
                                          >
                                            {unit}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={field.dimensionConfig?.allowDecimals ?? true}
                                      onChange={e => patchField(category, field.id, {
                                        dimensionConfig: {
                                          allowedUnits: field.dimensionConfig?.allowedUnits || [...DEFAULT_DIMENSION_UNITS],
                                          allowDecimals: e.target.checked,
                                          separator: field.dimensionConfig?.separator || 'x'
                                        }
                                      })}
                                      className="w-4 h-4 rounded border-slate-300 accent-zinc-900"
                                    />
                                    <span className="text-xs font-bold text-slate-600">Permitir decimales</span>
                                  </label>

                                  {field.type === 'dimension_pair' && (
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Separador entre dimensiones</label>
                                      <input
                                        type="text"
                                        maxLength={3}
                                        value={field.dimensionConfig?.separator || 'x'}
                                        onChange={e => patchField(category, field.id, {
                                          dimensionConfig: {
                                            allowedUnits: field.dimensionConfig?.allowedUnits || [...DEFAULT_DIMENSION_UNITS],
                                            allowDecimals: field.dimensionConfig?.allowDecimals ?? true,
                                            separator: e.target.value || 'x'
                                          }
                                        })}
                                        className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-800 outline-none focus:border-zinc-400"
                                      />
                                    </div>
                                  )}

                                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-[10px] text-slate-500 font-mono">
                                    {field.type === 'dimension'
                                      ? 'Ejemplos: 25cm · 350mm · 0.25m'
                                      : `Ejemplos: 34cm${field.dimensionConfig?.separator || 'x'}67cm · 1200mm${field.dimensionConfig?.separator || 'x'}600mm`}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      <button
                        type="button"
                        onClick={() => addField(category)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-white text-xs font-black text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors"
                      >
                        <Plus size={14} />
                        Añadir campo
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
