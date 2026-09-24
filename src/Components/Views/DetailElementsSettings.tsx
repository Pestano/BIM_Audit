import React, { useState } from 'react';
import { 
  Eye, 
  Layers, 
  FileText, 
  Table2, 
  DoorOpen, 
  FileCode, 
  Sliders, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  RotateCcw,
  Info,
  ShieldCheck,
  Check,
  Building2
} from 'lucide-react';
import { 
  Project, 
  DetailElementsAuditConfig, 
  DEFAULT_REQUIRED_SAS_PARAMETERS,
  DEFAULT_DETAIL_ELEMENTS_CONFIG,
  ModelDiscipline,
  ViewNomenclatureType,
  NomenclatureField,
  StructuredNomenclatureRule,
  NomenclatureFieldType
} from '../../types';
import { getDisciplineLabel, MODEL_DISCIPLINES } from '../../utils/modelUtils';

interface DetailElementsSettingsProps {
  currentProject: Project;
  config: DetailElementsAuditConfig;
  onChange: (newConfig: DetailElementsAuditConfig) => void;
}

type DetailTab = 'vistas' | 'plantillas' | 'planos' | 'tablas' | 'habitaciones' | 'cad' | 'parametros' | 'grupos';

const makeRuleId = () => `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_DIMENSION_UNITS = ['mm', 'cm', 'm'];

const createNomenclatureField = (): NomenclatureField => ({
  id: makeRuleId(),
  name: '',
  type: 'codes',
  codes: [],
  dimensionConfig: {
    allowedUnits: [...DEFAULT_DIMENSION_UNITS],
    allowDecimals: true,
    separator: 'x'
  }
});

const normalizeNomenclatureField = (field: any): NomenclatureField => ({
  id: typeof field?.id === 'string' && field.id.trim() ? field.id : makeRuleId(),
  name: typeof field?.name === 'string' ? field.name : '',
  type: (['codes', 'free', 'dimension', 'dimension_pair'].includes(field?.type) ? field.type : 'codes') as NomenclatureFieldType,
  codes: Array.isArray(field?.codes)
    ? field.codes.filter((code: unknown): code is string => typeof code === 'string' && code.trim().length > 0)
    : [],
  dimensionConfig: {
    allowedUnits: Array.isArray(field?.dimensionConfig?.allowedUnits) && field.dimensionConfig.allowedUnits.length
      ? field.dimensionConfig.allowedUnits.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
      : [...DEFAULT_DIMENSION_UNITS],
    allowDecimals: typeof field?.dimensionConfig?.allowDecimals === 'boolean' ? field.dimensionConfig.allowDecimals : true,
    separator: typeof field?.dimensionConfig?.separator === 'string' && field.dimensionConfig.separator.length
      ? field.dimensionConfig.separator
      : 'x'
  }
});

const normalizeStructuredRule = (rule: any, fallbackLibre = false): StructuredNomenclatureRule => ({
  libre: typeof rule?.libre === 'boolean' ? rule.libre : fallbackLibre,
  fields: Array.isArray(rule?.fields) ? rule.fields.map(normalizeNomenclatureField) : []
});

export const DetailElementsSettings: React.FC<DetailElementsSettingsProps> = ({
  currentProject,
  config,
  onChange
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('vistas');
  const [newParam, setNewParam] = useState('');
  const [paramFilter, setParamFilter] = useState<'todos' | '01' | '02' | '03' | '04' | '05'>('todos');
  const [draftCodes, setDraftCodes] = useState<Record<string, string>>({});

  const currentConfig: DetailElementsAuditConfig = {
    ...DEFAULT_DETAIL_ELEMENTS_CONFIG,
    ...config,
    vistasNomenclaturaPorTipo: {
      plantas: normalizeStructuredRule(config.vistasNomenclaturaPorTipo?.plantas, DEFAULT_DETAIL_ELEMENTS_CONFIG.vistasNomenclaturaPorTipo?.plantas.libre ?? false),
      alzados: normalizeStructuredRule(config.vistasNomenclaturaPorTipo?.alzados, DEFAULT_DETAIL_ELEMENTS_CONFIG.vistasNomenclaturaPorTipo?.alzados.libre ?? false),
      secciones: normalizeStructuredRule(config.vistasNomenclaturaPorTipo?.secciones, DEFAULT_DETAIL_ELEMENTS_CONFIG.vistasNomenclaturaPorTipo?.secciones.libre ?? false),
      vistas3d: normalizeStructuredRule(config.vistasNomenclaturaPorTipo?.vistas3d, DEFAULT_DETAIL_ELEMENTS_CONFIG.vistasNomenclaturaPorTipo?.vistas3d.libre ?? false),
      detalles: normalizeStructuredRule(config.vistasNomenclaturaPorTipo?.detalles, DEFAULT_DETAIL_ELEMENTS_CONFIG.vistasNomenclaturaPorTipo?.detalles.libre ?? false),
      techos: normalizeStructuredRule(config.vistasNomenclaturaPorTipo?.techos, DEFAULT_DETAIL_ELEMENTS_CONFIG.vistasNomenclaturaPorTipo?.techos.libre ?? false),
    },
    plantillasNomenclatura: normalizeStructuredRule(config.plantillasNomenclatura, config.plantillasNomenclaturaLibre ?? DEFAULT_DETAIL_ELEMENTS_CONFIG.plantillasNomenclatura?.libre ?? false),
    planosNomenclatura: normalizeStructuredRule(config.planosNomenclatura, config.planosNomenclaturaLibre ?? DEFAULT_DETAIL_ELEMENTS_CONFIG.planosNomenclatura?.libre ?? false),
    tablasNomenclatura: normalizeStructuredRule(config.tablasNomenclatura, config.tablasNomenclaturaLibre ?? DEFAULT_DETAIL_ELEMENTS_CONFIG.tablasNomenclatura?.libre ?? false),
  };

  const viewTypeRules: { id: ViewNomenclatureType; label: string; description: string }[] = [
    { id: 'plantas', label: 'Plantas', description: 'Vistas de planta del modelo.' },
    { id: 'alzados', label: 'Alzados', description: 'Vistas de alzado o elevación.' },
    { id: 'secciones', label: 'Secciones', description: 'Vistas de sección.' },
    { id: 'vistas3d', label: 'Vistas 3D', description: 'Vistas tridimensionales.' },
    { id: 'detalles', label: 'Vistas de detalle', description: 'Vistas de detalle y llamadas de detalle.' },
    { id: 'techos', label: 'Vistas de techos', description: 'Plantas de techo reflejado.' },
  ];

  const handleUpdate = (patch: Partial<DetailElementsAuditConfig>) => {
    onChange({
      ...currentConfig,
      ...patch
    });
  };

  const handleAddParameter = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newParam.trim().toUpperCase();
    if (!clean) return;
    if (currentConfig.requiredParameters.includes(clean)) {
      alert('Este parámetro ya está en la lista de requeridos.');
      return;
    }
    handleUpdate({
      requiredParameters: [...currentConfig.requiredParameters, clean]
    });
    setNewParam('');
  };

  const handleRemoveParameter = (param: string) => {
    handleUpdate({
      requiredParameters: currentConfig.requiredParameters.filter(p => p !== param)
    });
  };

  const handleResetParameters = () => {
    if (window.confirm('¿Deseas restaurar la lista oficial de 26 Parámetros SAS?')) {
      handleUpdate({
        requiredParameters: [...DEFAULT_REQUIRED_SAS_PARAMETERS]
      });
    }
  };

  const handleModelRoomToggle = (fileId: string, value: boolean) => {
    const updated = { ...(currentConfig.habitacionesPorModelo || {}) };
    updated[fileId] = value;
    handleUpdate({ habitacionesPorModelo: updated });
  };

  const handleDisciplineRoomToggle = (disc: ModelDiscipline, value: boolean) => {
    const updated = { ...(currentConfig.habitacionesPorDisciplina || {}) };
    updated[disc] = value;
    handleUpdate({ habitacionesPorDisciplina: updated });
  };

  const updateViewRule = (type: ViewNomenclatureType, patch: Partial<StructuredNomenclatureRule>) => {
    const actual = currentConfig.vistasNomenclaturaPorTipo![type];
    handleUpdate({
      vistasNomenclaturaPorTipo: {
        ...currentConfig.vistasNomenclaturaPorTipo!,
        [type]: { ...actual, ...patch }
      }
    });
  };

  const updateViewField = (type: ViewNomenclatureType, fieldId: string, patch: Partial<NomenclatureField>) => {
    const actual = currentConfig.vistasNomenclaturaPorTipo![type];
    updateViewRule(type, {
      fields: actual.fields.map(field => field.id === fieldId ? { ...field, ...patch } : field)
    });
  };

  const addViewField = (type: ViewNomenclatureType) => {
    const actual = currentConfig.vistasNomenclaturaPorTipo![type];
    updateViewRule(type, {
      fields: [...actual.fields, createNomenclatureField()]
    });
  };

  const deleteViewField = (type: ViewNomenclatureType, fieldId: string) => {
    const actual = currentConfig.vistasNomenclaturaPorTipo![type];
    updateViewRule(type, {
      fields: actual.fields.filter(field => field.id !== fieldId)
    });
  };

  const addViewCode = (type: ViewNomenclatureType, field: NomenclatureField) => {
    const key = `${type}__${field.id}`;
    const value = (draftCodes[key] || '').trim().toUpperCase();
    if (!value) return;
    updateViewField(type, field.id, { codes: Array.from(new Set([...(field.codes || []), value])) });
    setDraftCodes(prev => ({ ...prev, [key]: '' }));
  };

  const removeViewCode = (type: ViewNomenclatureType, field: NomenclatureField, code: string) => {
    updateViewField(type, field.id, { codes: field.codes.filter(item => item !== code) });
  };

  const simpleRuleKeys = {
    plantillas: 'plantillasNomenclatura',
    planos: 'planosNomenclatura',
    tablas: 'tablasNomenclatura'
  } as const;

  const legacyLibreKeys = {
    plantillas: 'plantillasNomenclaturaLibre',
    planos: 'planosNomenclaturaLibre',
    tablas: 'tablasNomenclaturaLibre'
  } as const;

  const updateSimpleRule = (section: keyof typeof simpleRuleKeys, patch: Partial<StructuredNomenclatureRule>) => {
    const ruleKey = simpleRuleKeys[section];
    const legacyLibreKey = legacyLibreKeys[section];
    const currentRule = (currentConfig[ruleKey] || { libre: false, fields: [] }) as StructuredNomenclatureRule;
    const updatedRule = { ...currentRule, ...patch };
    handleUpdate({
      [ruleKey]: updatedRule,
      [legacyLibreKey]: updatedRule.libre
    } as Partial<DetailElementsAuditConfig>);
  };

  const updateSimpleField = (section: keyof typeof simpleRuleKeys, fieldId: string, patch: Partial<NomenclatureField>) => {
    const ruleKey = simpleRuleKeys[section];
    const currentRule = (currentConfig[ruleKey] || { libre: false, fields: [] }) as StructuredNomenclatureRule;
    updateSimpleRule(section, {
      fields: currentRule.fields.map(field => field.id === fieldId ? { ...field, ...patch } : field)
    });
  };

  const addSimpleField = (section: keyof typeof simpleRuleKeys) => {
    const ruleKey = simpleRuleKeys[section];
    const currentRule = (currentConfig[ruleKey] || { libre: false, fields: [] }) as StructuredNomenclatureRule;
    updateSimpleRule(section, {
      fields: [...currentRule.fields, createNomenclatureField()]
    });
  };

  const deleteSimpleField = (section: keyof typeof simpleRuleKeys, fieldId: string) => {
    const ruleKey = simpleRuleKeys[section];
    const currentRule = (currentConfig[ruleKey] || { libre: false, fields: [] }) as StructuredNomenclatureRule;
    updateSimpleRule(section, {
      fields: currentRule.fields.filter(field => field.id !== fieldId)
    });
  };

  const addSimpleCode = (section: keyof typeof simpleRuleKeys, field: NomenclatureField) => {
    const key = `${section}__${field.id}`;
    const value = (draftCodes[key] || '').trim().toUpperCase();
    if (!value) return;
    updateSimpleField(section, field.id, { codes: Array.from(new Set([...(field.codes || []), value])) });
    setDraftCodes(prev => ({ ...prev, [key]: '' }));
  };

  const removeSimpleCode = (section: keyof typeof simpleRuleKeys, field: NomenclatureField, code: string) => {
    updateSimpleField(section, field.id, { codes: field.codes.filter(item => item !== code) });
  };

  const renderNomenclatureFieldList = (
    scopeKey: string,
    fields: NomenclatureField[],
    onPatchField: (fieldId: string, patch: Partial<NomenclatureField>) => void,
    onDeleteField: (fieldId: string) => void,
    onAddCode: (field: NomenclatureField) => void,
    onRemoveCode: (field: NomenclatureField, code: string) => void,
    onAddField: () => void,
    addFieldLabel = 'Añadir campo'
  ) => (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <p className="text-xs font-bold text-slate-500">Todavía no hay campos definidos para esta nomenclatura.</p>
        </div>
      ) : (
        fields.map((field, index) => {
          const draftKey = `${scopeKey}__${field.id}`;
          return (
            <div key={field.id} className="rounded-3xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Campo {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onDeleteField(field.id)}
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
                  onChange={e => onPatchField(field.id, { name: e.target.value })}
                  placeholder="Ej: Originador, Tipo, Disciplina..."
                  className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-3 text-xs font-bold text-slate-800 focus:border-zinc-400 outline-none transition-colors"
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
                      onClick={() => onPatchField(field.id, { type })}
                      className={`px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${
                        field.type === type
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
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
                      <span key={code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 border border-zinc-200 text-[10px] font-black font-mono text-zinc-700">
                        {code}
                        <button type="button" onClick={() => onRemoveCode(field, code)} className="text-zinc-400 hover:text-rose-600">×</button>
                      </span>
                    ))}
                    {field.codes.length === 0 && <span className="text-[10px] italic text-slate-400">Sin códigos definidos</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={draftCodes[draftKey] || ''}
                      onChange={e => setDraftCodes(prev => ({ ...prev, [draftKey]: e.target.value.toUpperCase() }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onAddCode(field);
                        }
                      }}
                      placeholder="Ej: EST"
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 focus:border-zinc-400 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => onAddCode(field)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-xs font-black hover:bg-zinc-800 transition-colors"
                    >
                      <Plus size={14} />
                      Añadir código
                    </button>
                  </div>
                </div>
              )}

              {field.type === 'free' && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4">
                  <p className="text-xs font-bold text-slate-600">Campo descriptivo — se acepta cualquier texto.</p>
                  <p className="text-[10px] text-slate-400 mt-1">No se comparará contra una lista de códigos permitidos.</p>
                </div>
              )}

              {(field.type === 'dimension' || field.type === 'dimension_pair') && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
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
                              onPatchField(field.id, {
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
                                : 'bg-slate-50 text-slate-600 border-slate-200'
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
                      onChange={e => onPatchField(field.id, {
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
                        onChange={e => onPatchField(field.id, {
                          dimensionConfig: {
                            allowedUnits: field.dimensionConfig?.allowedUnits || [...DEFAULT_DIMENSION_UNITS],
                            allowDecimals: field.dimensionConfig?.allowDecimals ?? true,
                            separator: e.target.value || 'x'
                          }
                        })}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-800 outline-none focus:bg-white focus:border-zinc-400"
                      />
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] text-slate-500 font-mono">
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
        onClick={onAddField}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-slate-300 bg-white text-xs font-black text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors"
      >
        <Plus size={14} />
        {addFieldLabel}
      </button>
    </div>
  );

  const tabs: { id: DetailTab; label: string; icon: React.FC<{ size?: number; className?: string }>; countLabel?: string }[] = [
    { id: 'vistas', label: '1. Vistas', icon: Eye, countLabel: `< ${currentConfig.maxVistas}` },
    { id: 'plantillas', label: '2. Plantillas de Vistas', icon: Layers, countLabel: 's/usar: Alerta' },
    { id: 'planos', label: '3. Planos', icon: FileText, countLabel: `< ${currentConfig.maxPlanos}` },
    { id: 'tablas', label: '4. Tablas', icon: Table2, countLabel: `< ${currentConfig.maxTablas}` },
    { id: 'habitaciones', label: '5. Habitaciones', icon: DoorOpen, countLabel: 'Manual p/modelo' },
    { id: 'cad', label: '6. Vínculos CAD', icon: FileCode, countLabel: 'Pinear & Vistas' },
    { id: 'parametros', label: '7. Parámetros', icon: Sliders, countLabel: `${currentConfig.requiredParameters.length} SAS` },
    { id: 'grupos', label: '8. Grupos Anotación', icon: Copy, countLabel: 'Pinear: Alerta' }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar de Elementos de Detalle */}
      <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0">
        <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText size={13} className="text-zinc-700" />
              Requisitos de Detalle
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
              8 Reglas
            </span>
          </div>

          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="text-xs font-bold truncate">{tab.label}</span>
                </div>
                {tab.countLabel && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    isActive ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.countLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Resumen de configuración */}
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/60 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Info size={14} className="text-slate-400" />
            <span>Reglas de Auditoría SAS</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Las comprobaciones de elementos de detalle se aplican automáticamente a cada modelo cargado en la fase de Documentación.
          </p>
        </div>
      </div>

      {/* Panel de Contenido para la Regla Activa */}
      <div className="flex-1 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs min-h-[550px]">
        
        {/* ======================================================== */}
        {/* 1. VISTAS                                                */}
        {/* ======================================================== */}
        {activeTab === 'vistas' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Eye size={20} className="text-zinc-700" />
                  1. Auditoría de Vistas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Control del volumen total de vistas en el modelo y definición manual de la nomenclatura por tipos de vista.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Regla Activa
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Límite Máximo de Vistas
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Si el modelo supera este número, el motor de auditoría generará una <strong>ALERTA</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">&lt;</span>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={currentConfig.maxVistas}
                    onChange={(e) => handleUpdate({ maxVistas: parseInt(e.target.value) || 500 })}
                    className="w-24 px-3 py-1.5 text-center font-mono font-black text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    onClick={() => handleUpdate({ maxVistas: 500 })}
                    title="Restablecer a 500"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Nomenclatura por tipo de vista
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Configura la nomenclatura como una secuencia de campos. En cada campo podrás indicar el nombre y los códigos permitidos. Si un tipo de vista no debe seguir reglas, márcalo como <strong>Libre</strong>.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  6 tipos
                </span>
              </div>

              <div className="space-y-4">
                {viewTypeRules.map(({ id, label, description }) => {
                  const rule = currentConfig.vistasNomenclaturaPorTipo![id];
                  return (
                    <div key={id} className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-800">{label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={rule.libre}
                            onChange={(e) => updateViewRule(id, { libre: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span className="text-[11px] font-bold text-slate-700">Libre / sin reglas</span>
                        </label>
                      </div>

                      <div className="p-4 sm:p-5 bg-slate-50/40">
                        {rule.libre ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
                            <p className="text-xs font-bold text-slate-500">Este tipo de vista queda configurado como libre, sin reglas de nomenclatura.</p>
                          </div>
                        ) : (
                          renderNomenclatureFieldList(
                            id,
                            rule.fields,
                            (fieldId, patch) => updateViewField(id, fieldId, patch),
                            (fieldId) => deleteViewField(id, fieldId),
                            (field) => addViewCode(id, field),
                            (field, code) => removeViewCode(id, field, code),
                            () => addViewField(id),
                            'Añadir campo'
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plantillas' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Layers size={20} className="text-zinc-700" />
                  2. Auditoría de Plantillas de Vista (View Templates)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Detección de plantillas no asignadas y definición manual de su nomenclatura.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Regla Activa
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-3">
              <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                Plantillas sin Asignar / En Desuso
              </span>
              <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <span className="text-slate-700">
                  <strong>Criterio oficial:</strong> Si hay plantillas de vista sin usar (no asignadas a ninguna vista del modelo), se clasifica como <strong>ALERTA</strong>.
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Nomenclatura de Plantillas de Vista
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Define la regla mediante campos de nomenclatura y códigos permitidos, o marca la categoría como libre.
                  </p>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentConfig.plantillasNomenclatura?.libre ?? false}
                    onChange={(e) => updateSimpleRule('plantillas', { libre: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 accent-zinc-900"
                  />
                  <span className="text-xs font-bold text-slate-700">Libre / sin reglas</span>
                </label>
              </div>

              {currentConfig.plantillasNomenclatura?.libre ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-xs font-bold text-slate-500">Las plantillas de vista se consideran libres y no tendrán validación de nomenclatura.</p>
                </div>
              ) : (
                renderNomenclatureFieldList(
                  'plantillas',
                  currentConfig.plantillasNomenclatura?.fields || [],
                  (fieldId, patch) => updateSimpleField('plantillas', fieldId, patch),
                  (fieldId) => deleteSimpleField('plantillas', fieldId),
                  (field) => addSimpleCode('plantillas', field),
                  (field, code) => removeSimpleCode('plantillas', field, code),
                  () => addSimpleField('plantillas'),
                  'Añadir campo'
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'planos' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText size={20} className="text-zinc-700" />
                  3. Auditoría de Planos (Sheets)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Control de la cantidad de planos y definición estructurada de su nomenclatura.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Regla Activa
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Límite Máximo de Planos
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deben ser menos de <strong>{currentConfig.maxPlanos} planos</strong>. Si supera esta cantidad, se reporta como alerta.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">&lt;</span>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={currentConfig.maxPlanos}
                    onChange={(e) => handleUpdate({ maxPlanos: parseInt(e.target.value) || 200 })}
                    className="w-24 px-3 py-1.5 text-center font-mono font-black text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    onClick={() => handleUpdate({ maxPlanos: 200 })}
                    title="Restablecer a 200"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Nomenclatura de Planos
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Define la regla mediante campos de nomenclatura y códigos permitidos, o marca la categoría como libre.
                  </p>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentConfig.planosNomenclatura?.libre ?? false}
                    onChange={(e) => updateSimpleRule('planos', { libre: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 accent-zinc-900"
                  />
                  <span className="text-xs font-bold text-slate-700">Libre / sin reglas</span>
                </label>
              </div>

              {currentConfig.planosNomenclatura?.libre ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-xs font-bold text-slate-500">Los planos quedan configurados como libres y no tendrán validación de nomenclatura.</p>
                </div>
              ) : (
                renderNomenclatureFieldList(
                  'planos',
                  currentConfig.planosNomenclatura?.fields || [],
                  (fieldId, patch) => updateSimpleField('planos', fieldId, patch),
                  (fieldId) => deleteSimpleField('planos', fieldId),
                  (field) => addSimpleCode('planos', field),
                  (field, code) => removeSimpleCode('planos', field, code),
                  () => addSimpleField('planos'),
                  'Añadir campo'
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'tablas' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Table2 size={20} className="text-zinc-700" />
                  4. Auditoría de Tablas de Planificación (Schedules)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Control del número de tablas y definición estructurada de su nomenclatura.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Regla Activa
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Límite Máximo de Tablas
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deben ser menos de <strong>{currentConfig.maxTablas} tablas</strong>. Si supera esta cantidad, se reporta como alerta.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">&lt;</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={currentConfig.maxTablas}
                    onChange={(e) => handleUpdate({ maxTablas: parseInt(e.target.value) || 40 })}
                    className="w-24 px-3 py-1.5 text-center font-mono font-black text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    onClick={() => handleUpdate({ maxTablas: 40 })}
                    title="Restablecer a 40"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700">
                    Nomenclatura de Tablas
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Define la regla mediante campos de nomenclatura y códigos permitidos, o marca la categoría como libre.
                  </p>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentConfig.tablasNomenclatura?.libre ?? false}
                    onChange={(e) => updateSimpleRule('tablas', { libre: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 accent-zinc-900"
                  />
                  <span className="text-xs font-bold text-slate-700">Libre / sin reglas</span>
                </label>
              </div>

              {currentConfig.tablasNomenclatura?.libre ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-xs font-bold text-slate-500">Las tablas quedan configuradas como libres y no tendrán validación de nomenclatura.</p>
                </div>
              ) : (
                renderNomenclatureFieldList(
                  'tablas',
                  currentConfig.tablasNomenclatura?.fields || [],
                  (fieldId, patch) => updateSimpleField('tablas', fieldId, patch),
                  (fieldId) => deleteSimpleField('tablas', fieldId),
                  (field) => addSimpleCode('tablas', field),
                  (field, code) => removeSimpleCode('tablas', field, code),
                  () => addSimpleField('tablas'),
                  'Añadir campo'
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'habitaciones' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <DoorOpen size={20} className="text-zinc-700" />
                  5. Requisitos de Habitaciones (Rooms)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Establecer si en cada modelo debe o no haber habitaciones (introducción manual por modelo).
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Manual por Modelo
              </span>
            </div>

            {/* Explicación de los Criterios de Auditoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-700 block mb-1">
                  1. Conteo de Habitaciones
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Si el modelo está marcado como &quot;Debe tener habitaciones&quot;, se computa la cantidad total. Si no contiene ninguna, se genera una alerta.
                </p>
              </div>

              <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-red-700 mb-1">
                  <XCircle size={15} />
                  <span>2. Habitaciones Sin Cerrar</span>
                </div>
                <p className="text-xs text-red-600 leading-relaxed">
                  <strong>Clasificado como ERROR.</strong> Las habitaciones no cerradas o mal delimitadas rompen los cómputos de superficies del proyecto.
                </p>
              </div>
            </div>

            {/* Configuración Manual Por Modelo del Proyecto */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-700">
                  Asignación Manual Por Modelo del Proyecto
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentProject.files?.length || 0} modelos en el proyecto
                </span>
              </div>

              {(!currentProject.files || currentProject.files.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 italic">
                  No hay archivos de modelo registrados en este proyecto aún.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {currentProject.files.map(file => {
                    const fileId = file.id;
                    const disc = (file.modelType || 'otro') as ModelDiscipline;
                    // Valor configurado explícitamente o fallback por disciplina
                    const currentValue = currentConfig.habitacionesPorModelo?.[fileId] ?? (disc === 'arquitectura');

                    return (
                      <div key={fileId} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                        <div className="flex flex-col gap-0.5 truncate">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-xs text-slate-800 font-mono truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {getDisciplineLabel(disc)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {fileId}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleModelRoomToggle(fileId, true)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              currentValue === true
                                ? 'bg-zinc-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Sí Requiere
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModelRoomToggle(fileId, false)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              currentValue === false
                                ? 'bg-zinc-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            No Requiere
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Presets por disciplina por defecto */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-black uppercase text-slate-700 block">
                Predeterminado por Disciplina (para nuevos modelos que se carguen)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MODEL_DISCIPLINES.map(d => {
                  const val = currentConfig.habitacionesPorDisciplina?.[d.key] ?? (d.key === 'arquitectura');
                  return (
                    <button
                      key={d.key}
                      onClick={() => handleDisciplineRoomToggle(d.key, !val)}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between text-xs ${
                        val 
                          ? 'bg-white border-zinc-900 text-zinc-900 font-bold' 
                          : 'bg-white/60 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="truncate">{d.label}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        val ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {val ? 'SÍ' : 'NO'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. VÍNCULOS CAD                                          */}
        {/* ======================================================== */}
        {activeTab === 'cad' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileCode size={20} className="text-zinc-700" />
                  6. Auditoría de Vínculos CAD (DWG / DXF)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Comprobación del pineado y ámbito de visibilidad de los archivos DWG vinculados.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Reglas Estrictas
              </span>
            </div>

            <div className="space-y-4">
              {/* Regla 1: No Pineados */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-900">
                    1. Vínculos CAD Sin Pinear (Desbloqueados) → ALERTA
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Si un vínculo CAD no está pineado en el modelo, se clasifica como <strong>ALERTA</strong>. El informe de auditoría detallará el listado completo de los vínculos desanclados y la vista en la que están insertados.
                  </p>
                </div>
              </div>

              {/* Regla 2: Visibles en todas las vistas */}
              <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200 flex items-start gap-3">
                <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase text-red-900">
                    2. Vínculos CAD Visibles en Todas las Vistas → ERROR
                  </h4>
                  <p className="text-xs text-red-800 mt-1 leading-relaxed">
                    Si un vínculo CAD se ha importado o vinculado de forma global (visible en todas las vistas del proyecto en lugar de restringirse a su plano de trabajo), se clasifica como <strong>ERROR CRÍTICO</strong> de modelado.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
              <span className="font-bold text-slate-700 block mb-1">
                Comportamiento en la Auditoría:
              </span>
              La tarjeta de Vínculos de CAD mostrará para cada vínculo detectado: el nombre del archivo DWG, su ID de Revit, el estado de bloqueo (pineado) y la vista vinculada correspondiente.
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. PARÁMETROS REQUERIDOS (SAS)                           */}
        {/* ======================================================== */}
        {activeTab === 'parametros' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sliders size={20} className="text-zinc-700" />
                  7. Auditoría de Parámetros Requeridos (Lista SAS)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  El modelo debe contener obligatoriamente los 26 parámetros del pliego SAS.
                </p>
              </div>
              <button
                onClick={handleResetParameters}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                title="Restaurar lista oficial de 26 parámetros"
              >
                <RotateCcw size={13} />
                <span>Restaurar Lista SAS</span>
              </button>
            </div>

            {/* Añadir Nuevo Parámetro */}
            <form onSubmit={handleAddParameter} className="flex gap-2">
              <input
                type="text"
                placeholder="Añadir parámetro (ej: 01_07_SAS_NUEVO)..."
                value={newParam}
                onChange={(e) => setNewParam(e.target.value)}
                className="flex-1 px-4 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <Plus size={15} />
                <span>Añadir</span>
              </button>
            </form>

            {/* Filtro por bloques SAS */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['todos', '01', '02', '03', '04', '05'] as const).map(block => (
                <button
                  key={block}
                  onClick={() => setParamFilter(block)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    paramFilter === block
                      ? 'bg-zinc-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {block === 'todos' ? `Todos (${currentConfig.requiredParameters.length})` : `Bloque ${block}_`}
                </button>
              ))}
            </div>

            {/* Listado de Parámetros Requeridos */}
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-80 overflow-y-auto custom-scrollbar bg-white">
              {currentConfig.requiredParameters
                .filter(p => paramFilter === 'todos' || p.startsWith(`${paramFilter}_`))
                .map((param, index) => {
                  const blockPrefix = param.substring(0, 2);
                  return (
                    <div key={param} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[10px] font-bold text-slate-400 w-6">
                          #{index + 1}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {blockPrefix}_
                        </span>
                        <span className="font-bold text-slate-800">
                          {param}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRemoveParameter(param)}
                        className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar parámetro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. GRUPOS DE ANOTACIÓN                                   */}
        {/* ======================================================== */}
        {activeTab === 'grupos' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Copy size={20} className="text-zinc-700" />
                  8. Auditoría de Grupos de Anotación
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Control y bloqueo de grupos de elementos de anotación.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Regla Activa
              </span>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase text-amber-900">
                  Grupos de Anotación Sin Pinear → ALERTA
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  El motor listará todos los grupos de anotación del modelo. Si se detecta algún grupo sin pinear (desbloqueado), se reportará como <strong>ALERTA</strong> en la auditoría para prevenir desplazamientos accidentales de cotas o notas.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">
                Comportamiento en la Auditoría:
              </span>
              La tarjeta 8 en la fase de Elementos de Anotación muestra el listado plano con el nombre de cada grupo, su ID y su estado de bloqueo (pineado / sin pinear).
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
