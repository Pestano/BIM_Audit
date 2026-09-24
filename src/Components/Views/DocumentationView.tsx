import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  FileText, 
  Table2, 
  DoorOpen, 
  FileCode, 
  Sliders, 
  Copy, 
  Layers, 
  Pin, 
  PinOff, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Check,
  Info,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { RevitBimData, ProjectFile, AuditConfig, DEFAULT_REQUIRED_SAS_PARAMETERS } from '../../types';
import { auditPhase2 } from '../../lib/auditEngine';

interface DocumentationViewProps {
  bimData: RevitBimData;
  activeFile?: ProjectFile;
  auditConfig?: AuditConfig;
  showAudit?: boolean;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({ 
  bimData, 
  activeFile, 
  auditConfig,
  showAudit = true 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paramFilter, setParamFilter] = useState<'todos' | 'proyecto' | 'compartido' | 'sas'>('todos');

  const cc: any = bimData?.codechecking || {};

  // Extraer datos de la Fase 2 con fallbacks seguros
  const vistas = useMemo(() => {
    const listado: any[] = cc.vistas?.listado || [];
    const count = cc.vistas?.cantidad ?? listado.length;

    // El exportador v1.6 incorpora cantidad_por_tipo.
    // Para JSON anteriores se calcula a partir del listado, sin mezclar datos
    // de otros modelos: todo sale exclusivamente de cc.vistas del bimData activo.
    const tiposBase = ['Planta', 'Techo', 'Seccion', 'Alzado', 'Detalle', 'Otro'];
    const cantidadPorTipo: Record<string, number> = {};

    tiposBase.forEach(tipo => {
      cantidadPorTipo[tipo] = Number(cc.vistas?.cantidad_por_tipo?.[tipo] ?? 0);
    });

    if (!cc.vistas?.cantidad_por_tipo) {
      listado.forEach((vista: any) => {
        const tipo = String(vista?.tipo_vista || 'Otro');
        cantidadPorTipo[tipo] = (cantidadPorTipo[tipo] || 0) + 1;
      });
    }

    return { count, list: listado, listado, cantidadPorTipo };
  }, [cc.vistas]);

  const plantillas = useMemo(() => {
    const listado: any[] = cc.plantillas_vista?.listado || [];
    const count = cc.plantillas_vista?.cantidad ?? listado.length;
    const unusedCount = cc.plantillas_vista?.cantidad_sin_usar ?? listado.filter((p: any) => p.usada === false).length;
    return { count, unusedCount, list: listado, listado };
  }, [cc.plantillas_vista]);

  const planos = useMemo(() => {
    const listado: any[] = cc.planos?.listado || [];
    const count = cc.planos?.cantidad ?? listado.length;
    return { count, list: listado, listado };
  }, [cc.planos]);

  const tablas = useMemo(() => {
    const listado: any[] = cc.tablas?.listado || [];
    const count = cc.tablas?.cantidad ?? listado.length;
    return { count, list: listado, listado };
  }, [cc.tablas]);

  const habitaciones = useMemo(() => {
    const listado: any[] = cc.habitaciones?.listado || [];
    const count = cc.habitaciones?.cantidad ?? listado.length;
    const unclosedCount = cc.habitaciones?.cantidad_sin_cerrar ?? listado.filter((h: any) => h.cerrada === false).length;
    return { count, unclosedCount, list: listado, listado };
  }, [cc.habitaciones]);

  const vinculosCad = useMemo(() => {
    const listado: any[] = cc.vinculos_cad?.listado || [];
    const count = cc.vinculos_cad?.cantidad ?? listado.length;
    return { count, list: listado, listado };
  }, [cc.vinculos_cad]);

  const parametros = useMemo(() => {
    let listado: any[] = cc.parametros_proyecto_y_compartidos?.listado || [];
    
    // Si vienen por separado en parametros_proyecto / parametros_compartidos
    if (listado.length === 0 && (cc.parametros_proyecto || cc.parametros_compartidos)) {
      const proj = (cc.parametros_proyecto?.listado || []).map((p: any) => ({
        ...p,
        es_compartido: false,
        tipo_parametro: 'proyecto'
      }));
      const comp = (cc.parametros_compartidos?.listado || []).map((p: any) => ({
        ...p,
        es_compartido: true,
        tipo_parametro: 'compartido'
      }));
      listado = [...proj, ...comp];
    }

    const count = cc.parametros_proyecto_y_compartidos?.cantidad ?? listado.length;
    const projectCount = cc.parametros_proyecto_y_compartidos?.cantidad_proyecto ?? 
      listado.filter((p: any) => !p.es_compartido && p.tipo_parametro !== 'compartido').length;
    const sharedCount = cc.parametros_proyecto_y_compartidos?.cantidad_compartidos ?? 
      listado.filter((p: any) => p.es_compartido || p.tipo_parametro === 'compartido').length;

    return { count, projectCount, sharedCount, list: listado, listado };
  }, [cc.parametros_proyecto_y_compartidos, cc.parametros_proyecto, cc.parametros_compartidos]);

  const gruposDetalle = useMemo(() => {
    // Compatibilidad: el nuevo exportador usa grupos_detalle; los JSON anteriores usan grupos_anotacion.
    // Se lee EXCLUSIVAMENTE del bimData recibido para el modelo activo, sin combinar datos de otros modelos.
    const origen = cc.grupos_detalle || cc.grupos_anotacion || {};
    const listado: any[] = origen.listado || [];
    const count = origen.cantidad ?? listado.length;
    return { count, list: listado, listado };
  }, [cc.grupos_detalle, cc.grupos_anotacion]);

  // Auditoría Fase 2
  const audit = useMemo(() => auditPhase2(bimData, auditConfig, activeFile), [bimData, auditConfig, activeFile]);

  // Filtro de búsqueda general
  const q = searchQuery.toLowerCase().trim();

  const filteredVistas = vistas.listado.filter(v => {
    const nombre = String(v.nombre || '').toLowerCase();
    const tipoVista = String(v.tipo_vista || '').toLowerCase();
    const tipoVistaRevit = String(v.tipo_vista_revit || '').toLowerCase();

    return !q
      || nombre.includes(q)
      || String(v.id ?? '').includes(q)
      || tipoVista.includes(q)
      || tipoVistaRevit.includes(q);
  });

  const filteredPlantillas = plantillas.listado.filter(p => 
    !q || p.nombre.toLowerCase().includes(q) || String(p.id).includes(q)
  );

  const filteredPlanos = planos.listado.filter(p => 
    !q || p.nombre.toLowerCase().includes(q) || (p.numero_plano && p.numero_plano.toLowerCase().includes(q)) || String(p.id).includes(q)
  );

  const filteredTablas = tablas.listado.filter(t => 
    !q || t.nombre.toLowerCase().includes(q) || String(t.id).includes(q)
  );

  const filteredHabitaciones = habitaciones.listado.filter(h => 
    !q || h.nombre.toLowerCase().includes(q) || (h.numero && h.numero.toLowerCase().includes(q)) || String(h.id).includes(q)
  );

  const filteredCad = vinculosCad.listado.filter(c => 
    !q || c.nombre.toLowerCase().includes(q) || (c.vista_vinculada_nombre && c.vista_vinculada_nombre.toLowerCase().includes(q))
  );

  const filteredParametros = parametros.listado.filter(p => {
    const isShared = p.es_compartido || p.tipo_parametro === 'compartido';
    if (paramFilter === 'proyecto' && isShared) return false;
    if (paramFilter === 'compartido' && !isShared) return false;
    return !q || p.nombre.toLowerCase().includes(q) || (p.tipo && p.tipo.toLowerCase().includes(q));
  });

  const filteredGrupos = gruposDetalle.listado.filter(g => {
    const nombre = String(g.nombre || '').toLowerCase();
    const vistaNombre = String(g.vista_nombre || '').toLowerCase();
    const vistaTipo = String(g.vista_tipo || '').toLowerCase();
    return !q
      || nombre.includes(q)
      || String(g.id ?? '').includes(q)
      || vistaNombre.includes(q)
      || vistaTipo.includes(q)
      || String(g.vista_id ?? '').includes(q);
  });

  const renderStatusBadge = (status?: 'BUENO' | 'ALERTA' | 'FALLO', text?: string) => {
    if (!showAudit || !status) return null;
    
    // Si no hay texto o es 'conforme', 'revisar', 'no conforme', 'fallo', NO mostramos palabra
    const isGeneric = !text || ['conforme', 'revisar', 'no conforme', 'fallo'].includes(text.toLowerCase().trim());
    let displayText = isGeneric ? null : text;
    if (displayText) {
      displayText = displayText.replace(/\(?advertencia\)?/gi, '').trim();
      if (!displayText) displayText = null;
    }

    if (status === 'BUENO') {
      return (
        <span 
          title="Conforme" 
          className={`inline-flex items-center justify-center gap-1 font-black rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs ${
            displayText ? 'text-[11px] px-2 py-0.5' : 'p-1 px-1.5'
          }`}
        >
          <CheckCircle2 size={displayText ? 12 : 14} className="text-emerald-600 shrink-0" />
          {displayText && <span>{displayText}</span>}
        </span>
      );
    }
    if (status === 'ALERTA') {
      return (
        <span 
          title="Revisar" 
          className={`inline-flex items-center justify-center gap-1 font-black rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs ${
            displayText ? 'text-[11px] px-2 py-0.5' : 'p-1 px-1.5'
          }`}
        >
          <AlertTriangle size={displayText ? 12 : 14} className="text-amber-500 shrink-0" />
          {displayText && <span>{displayText}</span>}
        </span>
      );
    }
    return (
      <span 
        title="No conforme" 
        className={`inline-flex items-center justify-center gap-1 font-black rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs ${
          displayText ? 'text-[11px] px-2 py-0.5' : 'p-1 px-1.5'
        }`}
      >
        <XCircle size={displayText ? 12 : 14} className="text-rose-600 shrink-0" />
        {displayText && <span>{displayText}</span>}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* MATRIZ DE RESUMEN NUMÉRICO (8 CATEGORÍAS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Vistas */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <Eye size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">1. Vistas</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{vistas.count}</span>
            {renderStatusBadge(audit.results.vistas.status)}
          </div>
        </div>

        {/* Plantillas */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <Layers size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">2. Plantillas</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{plantillas.count}</span>
            <div className="flex items-center gap-1.5">
              {plantillas.unusedCount > 0 && (
                <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={`${plantillas.unusedCount} sin usar`}>
                  {plantillas.unusedCount} s/uso
                </span>
              )}
              {renderStatusBadge(audit.results.plantillas_vista.status)}
            </div>
          </div>
        </div>

        {/* Planos */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <FileText size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">3. Planos</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{planos.count}</span>
            {renderStatusBadge(audit.results.planos.status)}
          </div>
        </div>

        {/* Tablas */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <Table2 size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">4. Tablas</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{tablas.count}</span>
            {renderStatusBadge(audit.results.tablas.status)}
          </div>
        </div>

        {/* Habitaciones */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <DoorOpen size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">5. Habitaciones</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{habitaciones.count}</span>
            <div className="flex items-center gap-1.5">
              {habitaciones.unclosedCount > 0 && (
                <span className="text-[10px] font-bold font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title={`${habitaciones.unclosedCount} no cerradas`}>
                  {habitaciones.unclosedCount} s/cerrar
                </span>
              )}
              {renderStatusBadge(audit.results.habitaciones.status)}
            </div>
          </div>
        </div>

        {/* Vínculos CAD */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <FileCode size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">6. Vínculos CAD</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{vinculosCad.count}</span>
            {renderStatusBadge(audit.results.vinculos_cad.status)}
          </div>
        </div>

        {/* Parámetros */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <Sliders size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">7. Parámetros</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{parametros.count}</span>
            {renderStatusBadge(audit.results.parametros.status)}
          </div>
        </div>

        {/* Grupos Anotación */}
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-zinc-500 truncate">
            <Copy size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">8. Grupos Detalle</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-black font-mono text-zinc-900">{gruposDetalle.count}</span>
            {renderStatusBadge(audit.results.grupos_anotacion.status)}
          </div>
        </div>
      </div>

      {/* 3. BLOQUE DE LAS 8 TARJETAS DETALLADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* ------------------------------------------------------------ */}
        {/* TARJETA 1: VISTAS DEL MODELO                                 */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">1. VISTAS DEL MODELO</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{vistas.count} vistas</strong> • Requisito: <strong className="text-zinc-700">&lt; {audit.results.vistas.maxAllowed}</strong>
                </span>
                <span className="text-[10px] text-zinc-400 italic">
                  Nomenclatura: Pendiente de definir reglas
                </span>
              </div>
            </div>
            {renderStatusBadge(
              audit.results.vistas.status, 
              audit.results.vistas.status === 'ALERTA' ? `> ${audit.results.vistas.maxAllowed}` : undefined
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['Planta', 'Plantas'],
              ['Techo', 'Techos'],
              ['Seccion', 'Secciones'],
              ['Alzado', 'Alzados'],
              ['Detalle', 'Detalles'],
              ['Otro', 'Otros'],
            ].map(([key, label]) => (
              <div key={key} className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  {label}
                </div>
                <div className="mt-0.5 text-lg font-black font-mono text-zinc-900">
                  {vistas.cantidadPorTipo[key] || 0}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_78px] gap-2 bg-zinc-50 px-3 py-2 border-b border-zinc-200">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Vista</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Tipo</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 text-right">ID</span>
            </div>

            <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto custom-scrollbar">
              {filteredVistas.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 italic">
                  {vistas.count === 0 ? 'No se han registrado vistas en el archivo JSON.' : 'No se encontraron vistas con el filtro aplicado.'}
                </div>
              ) : (
                filteredVistas.map((v, idx) => (
                  <div
                    key={`${v.id ?? idx}-${v.nombre ?? ''}`}
                    className="grid grid-cols-[minmax(0,1fr)_90px_78px] gap-2 items-center px-3 py-2 text-xs hover:bg-zinc-50/60 transition-colors"
                  >
                    <span className="font-bold text-zinc-800 truncate" title={v.nombre}>
                      {v.nombre || 'Sin nombre'}
                    </span>

                    <span
                      className="text-[10px] font-bold text-zinc-600 truncate"
                      title={v.tipo_vista_revit || v.tipo_vista || 'Sin clasificar'}
                    >
                      {v.tipo_vista || '—'}
                    </span>

                    <span className="text-[10px] font-mono text-zinc-400 text-right truncate">
                      {v.id ?? '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 2: PLANTILLAS DE VISTAS                              */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">2. PLANTILLAS DE VISTAS</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{plantillas.count}</strong> • Sin usar: <strong className={plantillas.unusedCount > 0 ? "text-amber-600 font-black" : "text-zinc-600"}>{plantillas.unusedCount}</strong>
                </span>
                <span className="text-[10px] text-zinc-400 italic">
                  Nomenclatura: Pendiente de definir reglas
                </span>
              </div>
            </div>
            {renderStatusBadge(
              audit.results.plantillas_vista.status, 
              plantillas.unusedCount > 0 ? `${plantillas.unusedCount} sin usar` : undefined
            )}
          </div>

          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredPlantillas.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                {plantillas.count === 0 ? 'No se han registrado plantillas de vista en el JSON.' : 'No se encontraron plantillas con el filtro actual.'}
              </div>
            ) : (
              filteredPlantillas.map((p, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                  <div className="flex items-center gap-2 truncate pr-3">
                    <span className="font-bold text-zinc-800 truncate" title={p.nombre}>{p.nombre}</span>
                    {p.usada === false && (
                      <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                        sin usar
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    ID: {p.id}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 3: PLANOS                                            */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">3. PLANOS DEL PROYECTO</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{planos.count} planos</strong> • Requisito: <strong className="text-zinc-700">&lt; {audit.results.planos.maxAllowed}</strong>
                </span>
                <span className="text-[10px] text-zinc-400 italic">
                  Nomenclatura: Pendiente de definir reglas
                </span>
              </div>
            </div>
            {renderStatusBadge(
              audit.results.planos.status, 
              audit.results.planos.status === 'ALERTA' ? `> ${audit.results.planos.maxAllowed}` : undefined
            )}
          </div>

          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredPlanos.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                {planos.count === 0 ? 'No se han registrado planos en el JSON.' : 'No se encontraron planos.'}
              </div>
            ) : (
              filteredPlanos.map((pl, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                  <div className="flex items-center gap-2 truncate pr-3">
                    {pl.numero_plano && (
                      <span className="font-mono font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                        {pl.numero_plano}
                      </span>
                    )}
                    <span className="font-bold text-zinc-800 truncate" title={pl.nombre}>
                      {pl.nombre}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    ID: {pl.id}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 4: TABLAS DE PLANIFICACIÓN                           */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">4. TABLAS DE PLANIFICACIÓN</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{tablas.count} tablas</strong> • Requisito: <strong className="text-zinc-700">&lt; {audit.results.tablas.maxAllowed}</strong>
                </span>
                <span className="text-[10px] text-zinc-400 italic">
                  Nomenclatura: Pendiente de definir reglas
                </span>
              </div>
            </div>
            {renderStatusBadge(
              audit.results.tablas.status, 
              audit.results.tablas.status === 'ALERTA' ? `> ${audit.results.tablas.maxAllowed}` : undefined
            )}
          </div>

          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredTablas.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                {tablas.count === 0 ? 'No se han registrado tablas en el JSON.' : 'No se encontraron tablas.'}
              </div>
            ) : (
              filteredTablas.map((tb, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                  <span className="font-bold text-zinc-800 truncate pr-3" title={tb.nombre}>
                    {tb.nombre}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    ID: {tb.id}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 5: HABITACIONES                                      */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">5. HABITACIONES</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{habitaciones.count}</strong> • Sin cerrar: <strong className={habitaciones.unclosedCount > 0 ? "text-fallo-600 font-black" : "text-zinc-600"}>{habitaciones.unclosedCount}</strong> • Exigidas: <strong className="text-zinc-700">{audit.results.habitaciones.required ? 'SÍ' : 'NO'}</strong>
                </span>
                {habitaciones.unclosedCount > 0 && (
                  <span className="text-[10px] text-fallo-600 font-bold">
                    {habitaciones.unclosedCount} habitación(es) sin cerrar clasificada como ERROR
                  </span>
                )}
              </div>
            </div>
            {renderStatusBadge(
              audit.results.habitaciones.status, 
              audit.results.habitaciones.status === 'FALLO'
                ? `${habitaciones.unclosedCount} sin cerrar (Error)`
                : (audit.results.habitaciones.status === 'ALERTA' ? 'No contiene (Alerta)' : undefined)
            )}
          </div>

          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredHabitaciones.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                {habitaciones.count === 0 ? 'No se han registrado habitaciones en el JSON.' : 'No se encontraron habitaciones.'}
              </div>
            ) : (
              filteredHabitaciones.map((hb, idx) => {
                const isUnclosed = hb.cerrada === false;
                return (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                    <div className="flex items-center gap-2 truncate pr-3">
                      {hb.numero && (
                        <span className="font-mono font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                          {hb.numero}
                        </span>
                      )}
                      <span className={`font-bold truncate ${isUnclosed ? 'text-fallo-600' : 'text-zinc-800'}`} title={hb.nombre}>
                        {hb.nombre}
                      </span>
                      {isUnclosed && (
                        <span className="text-[9px] font-mono font-bold text-fallo-700 bg-fallo-50 px-1.5 py-0.5 rounded border border-fallo-200 shrink-0">
                          no cerrada (Error)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      ID: {hb.id}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 6: VÍNCULOS DE CAD                                   */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">6. VÍNCULOS DE CAD</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{vinculosCad.count} archivos DWG/DXF</strong>
                </span>
                <span className="text-[10px] text-zinc-400 italic">
                  Pineado: Alerta si desanclado • Visibilidad global: Error
                </span>
              </div>
            </div>
            {renderStatusBadge(
              audit.results.vinculos_cad.status,
              audit.results.vinculos_cad.status === 'BUENO' ? undefined : (audit.results.vinculos_cad.status === 'FALLO' ? 'Error CAD' : 'Alerta CAD')
            )}
          </div>

          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredCad.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                {vinculosCad.count === 0 ? 'No se han registrado vínculos de CAD en este modelo.' : 'No se encontraron vínculos de CAD.'}
              </div>
            ) : (
              filteredCad.map((cad, idx) => {
                const isPinned = cad.pineado !== false && cad.esta_pineado !== false;
                const isVisibleAll = cad.visible_en_todas_las_vistas === true;
                const linkedView = cad.vista_vinculada_nombre || cad.vista_vinculada || 'Sin vista específica';
                const idsText = cad.ids ? cad.ids.join(', ') : (cad.id || '---');

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                    <div className="flex flex-col gap-0.5 truncate">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-zinc-800 font-mono truncate" title={cad.nombre}>
                          {cad.nombre}
                        </span>
                        {isVisibleAll && (
                          <span className="text-[9px] font-mono font-bold text-fallo-700 bg-fallo-50 px-1.5 py-0.5 rounded border border-fallo-200 shrink-0">
                            visible en todas (Error)
                          </span>
                        )}
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isPinned ? 'text-ok-600 bg-ok-50 border border-ok-100' : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          {isPinned ? 'pineado' : 'sin pinear'}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate">
                        Vista vinculada: <strong className="text-zinc-600">{linkedView}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      ID: {idsText}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 7: PARÁMETROS DE PROYECTO Y COMPARTIDOS              */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">7. PARÁMETROS DEL MODELO</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{parametros.count}</strong> • Obligatorios SAS: <strong className={audit.results.parametros.missingRequired.length > 0 ? "text-fallo-600 font-bold" : "text-ok-700 font-bold"}>{audit.results.parametros.foundRequired.length}/{audit.results.parametros.totalRequired}</strong>
                </span>
                {audit.results.parametros.missingRequired.length > 0 && (
                  <span className="text-[10px] text-fallo-600 font-semibold">
                    Faltan {audit.results.parametros.missingRequired.length} parámetros requeridos por el pliego SAS
                  </span>
                )}
              </div>
            </div>
            {renderStatusBadge(
              audit.results.parametros.status, 
              audit.results.parametros.missingRequired.length > 0
                ? `${audit.results.parametros.missingRequired.length} faltantes (Alerta)`
                : undefined
            )}
          </div>

          {/* Filtros: Todos, Proyecto, Compartidos y Auditoría SAS */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setParamFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                paramFilter === 'todos'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Todos ({parametros.count})
            </button>
            <button
              onClick={() => setParamFilter('proyecto')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                paramFilter === 'proyecto'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Proyecto ({parametros.projectCount})
            </button>
            <button
              onClick={() => setParamFilter('compartido')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                paramFilter === 'compartido'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Compartidos ({parametros.sharedCount})
            </button>
            <button
              onClick={() => setParamFilter('sas')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                paramFilter === 'sas'
                  ? 'bg-marca-600 text-white shadow-xs'
                  : 'bg-marca-50 text-marca-700 hover:bg-marca-100 border border-marca-200'
              }`}
            >
              <span>Auditoría SAS ({audit.results.parametros.foundRequired.length}/{audit.results.parametros.totalRequired})</span>
            </button>
          </div>

          {paramFilter === 'sas' ? (
            <div className="space-y-2">
              <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs flex items-center justify-between">
                <span className="font-bold text-zinc-700">Listado de 26 Parámetros SAS Requeridos</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  audit.results.parametros.missingRequired.length === 0
                    ? 'bg-ok-100 text-ok-800'
                    : 'bg-fallo-100 text-fallo-800'
                }`}>
                  {audit.results.parametros.foundRequired.length} de {audit.results.parametros.totalRequired} presentes
                </span>
              </div>

              <div className="divide-y divide-zinc-100 max-h-52 overflow-y-auto pr-1.5 custom-scrollbar">
                {(auditConfig?.detailElements?.requiredParameters || DEFAULT_REQUIRED_SAS_PARAMETERS).map((reqP, idx) => {
                  const isFound = audit.results.parametros.foundRequired.includes(reqP);
                  const blockPrefix = reqP.substring(0, 2);
                  return (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2 truncate pr-3 font-mono">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {blockPrefix}_
                        </span>
                        <span className={`font-bold truncate ${isFound ? 'text-zinc-800' : 'text-fallo-600'}`}>
                          {reqP}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                        isFound
                          ? 'text-ok-700 bg-ok-50 border border-ok-200'
                          : 'text-fallo-700 bg-fallo-50 border border-fallo-200'
                      }`}>
                        {isFound ? 'PRESENTE' : 'FALTANTE'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-52 overflow-y-auto pr-1.5 custom-scrollbar">
              {filteredParametros.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 italic">
                  {parametros.count === 0 ? 'No se han registrado parámetros en el JSON.' : 'No hay parámetros con el filtro seleccionado.'}
                </div>
              ) : (
                filteredParametros.map((pr, idx) => {
                  const isShared = pr.es_compartido || pr.tipo_parametro === 'compartido';
                  const idsText = pr.id ? `ID: ${pr.id}` : (pr.id_parametro ? `ID: ${pr.id_parametro}` : (pr.guid ? `GUID: ${pr.guid}` : (pr.ids ? `ID: ${pr.ids.join(', ')}` : '')));
                  return (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs hover:bg-zinc-50/60 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2 truncate pr-3">
                        <span className="font-bold text-zinc-800 truncate" title={pr.nombre}>
                          {pr.nombre}
                        </span>
                        {pr.tipo && (
                          <span className="text-[10px] font-mono text-zinc-400">
                            ({pr.tipo})
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-zinc-400">
                          {isShared ? 'compartido' : 'proyecto'}
                        </span>
                      </div>
                      {idsText ? (
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                          {idsText}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-300 shrink-0">
                          —
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/* TARJETA 8: GRUPOS DE DETALLE                                  */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-900">8. GRUPOS DE DETALLE</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total: <strong className="text-zinc-800">{gruposDetalle.count} grupos</strong>
                </span>
                <span className="text-[10px] text-zinc-400 italic">
                  Se muestra la vista propietaria de cada instancia
                </span>
              </div>
            </div>
            {renderStatusBadge(
              audit.results.grupos_anotacion.status,
              audit.results.grupos_anotacion.status === 'BUENO' ? undefined : 'Sin pinear'
            )}
          </div>

          <div className="max-h-72 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredGrupos.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 italic">
                {gruposDetalle.count === 0 ? 'No se han registrado grupos de detalle en el JSON.' : 'No se encontraron grupos de detalle.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-zinc-200">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200 z-10">
                    <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-2.5 font-black">Nombre del grupo</th>
                      <th className="px-3 py-2.5 font-black">ID</th>
                      <th className="px-3 py-2.5 font-black">Vista donde está colocado</th>
                      <th className="px-3 py-2.5 font-black">Tipo de vista</th>
                      <th className="px-3 py-2.5 font-black">ID vista</th>
                      <th className="px-3 py-2.5 font-black">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {filteredGrupos.map((grp, idx) => {
                      const isPinned = grp.pineado !== false && grp.esta_pineado !== false;
                      const idGrupo = grp.id ?? (Array.isArray(grp.ids) ? grp.ids.join(', ') : '—');
                      const vistaNombre = grp.vista_nombre || 'Sin vista asociada';
                      const vistaTipo = grp.vista_tipo || '—';
                      const vistaId = grp.vista_id ?? '—';

                      return (
                        <tr key={`${String(idGrupo)}-${idx}`} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-zinc-800" title={grp.nombre || ''}>
                            {grp.nombre || 'Grupo sin nombre'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                            {idGrupo}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-700 font-medium" title={vistaNombre}>
                            {vistaNombre}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">
                            {vistaTipo}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                            {vistaId}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isPinned
                                ? 'text-ok-600 bg-ok-50 border border-ok-100'
                                : 'text-amber-700 bg-amber-50 border border-amber-200'
                            }`}>
                              {isPinned ? <Pin size={10} /> : <PinOff size={10} />}
                              {isPinned ? 'pineado' : 'sin pinear'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
