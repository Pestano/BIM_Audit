import React from 'react';
import { motion } from 'motion/react';
import { Info, Layers, Filter, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { RevitBimData, AuditConfig, ProjectFile } from '../../types';
import { Card } from '../common/Card';
import { runAudit, parsePhaseItem } from '../../lib/auditEngine';

interface DashboardViewProps {
  bimData: RevitBimData;                                                        // Datos completos del JSON de Revit
  auditConfig?: AuditConfig;                                                    // Configuración de auditoría persistente
  activeFile?: ProjectFile;                                                     // Archivo o modelo activo actual
  onOpenWarningModal: (typeName: string, ids: string[]) => void;                // Función para abrir el modal de detalles de warnings
  onOpenGridsModal: (grids: string[]) => void;                                  // Función para abrir el modal de listado de rejillas
  showAudit?: boolean;                                                          // Si es true, muestra los resultados de auditoría
}

/**
 * Vista del Dashboard distribuida en 3 columnas que muestra las 10 secciones de la auditoría BIM.
 */
export const DashboardView: React.FC<DashboardViewProps> = ({ 
  bimData, 
  auditConfig, 
  activeFile,
  onOpenWarningModal, 
  onOpenGridsModal,
  showAudit = false
}) => {
  const audit = showAudit ? runAudit(bimData, auditConfig, activeFile) : null;

  return (
    <motion.div 
      key={showAudit ? "audit" : "dashboard"}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-12"
    >
      {/* Panel de Resumen de Auditoría (Solo en modo auditoría) */}
      {showAudit && (
        audit ? (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-marca-50 rounded-xl flex items-center justify-center text-marca-600 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Resumen global de reglas</h2>
                <p className="text-[10px] italic text-slate-400 mt-0">Se han verificado <span className="font-bold text-slate-600 not-italic">{audit.summary.total}</span> reglas.</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <SummaryBadge count={audit.summary.passed} label="Pasadas" color="green" />
              <SummaryBadge count={audit.summary.failed} label="Fallos" color="red" />
              <SummaryBadge count={audit.summary.alerts} label="Alertas" color="orange" />
            </div>
          </div>
        ) : (
          <div className="bg-alerta-50 rounded-3xl p-6 border border-alerta-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertTriangle className="text-alerta-500 shrink-0" size={24} />
              <div>
                <p className="text-alerta-800 font-bold">Configuración de auditoría pendiente</p>
                <p className="text-alerta-600 text-sm font-medium">Ve a Ajustes para definir los parámetros esperados de este proyecto y activar la validación automática.</p>
              </div>
            </div>
          </div>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ==================== COLUMNA 1 ==================== */}
        <div className="flex flex-col gap-3">
          {/* 1. NOMENCLATURA DEL MODELO (Audit mode) / 1. INFORMACIÓN GENERAL (Dashboard mode) */}
          {!showAudit ? (
            <Card title="1. Información general">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: "Fase auditoría", value: bimData.fase_auditoria || '---' },
                    { label: "Fecha exportación", value: bimData.fecha_exportacion ? new Date(bimData.fecha_exportacion).toLocaleDateString('es-ES') : '---' },
                    { label: "Nombre archivo", value: bimData.modelo?.nombre_archivo || '---' },
                    { label: "Disciplina", value: bimData.modelo?.disciplina || '---' },
                    { label: "Revit version", value: bimData.modelo?.revit_version || '---' },
                    { label: "Tamaño archivo", value: `${bimData.codechecking?.informacion_general?.tamano_archivo_mb?.toFixed(2) || '0.00'} MB` },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-dato border-b border-slate-50 pb-1 last:border-0">
                      <span className="text-slate-400 font-medium">{item.label}</span>
                      <span className="text-slate-700 font-bold text-right ml-4">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <h4 className="text-etiqueta font-black text-marca-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Info size={10} />
                    Información proyecto
                  </h4>
                  <ul className="space-y-1">
                    {bimData.codechecking?.informacion_general?.parametros_informacion_proyecto?.map((param, i) => (
                      <li key={i} className="flex justify-between items-start gap-4 text-dato border-b border-slate-50 pb-1 last:border-0">
                        <span className="text-slate-400 text-[8.5px] mt-0.5 leading-tight">
                          {param.nombre.charAt(0).toUpperCase() + param.nombre.slice(1).toLowerCase().replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-700 font-bold text-right leading-tight">{param.valor || "---"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="1. Nomenclatura del modelo" auditResult={audit?.results.nomenclatura}>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-micro font-black uppercase text-slate-400 tracking-wider">
                      Archivo original
                    </span>
                    {(audit?.results.nomenclatura as any)?.ignoredSuffix && (
                      <span className="text-micro font-black px-1.5 py-0.5 rounded bg-alerta-50 text-alerta-700 border border-alerta-200">
                        Sufijo "{(audit?.results.nomenclatura as any).ignoredSuffix}" ignorado
                      </span>
                    )}
                  </div>
                  <p className="text-dato font-black text-slate-800 break-all leading-snug">
                    {bimData.modelo?.nombre_archivo || bimData.codechecking?.nombre_modelo?.nombre_archivo || 'Sin nombre'}
                  </p>
                  {(audit?.results.nomenclatura as any)?.ignoredSuffix && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-etiqueta">
                      <span className="text-slate-500 font-medium">Cadena auditada (7 bloques):</span>
                      <span className="font-mono font-bold text-marca-700 bg-marca-50 px-1.5 py-0.5 rounded border border-marca-100">
                        {(audit?.results.nomenclatura as any).cleanName}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {(audit?.results.nomenclatura as any)?.fields?.map((field: any, i: number) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        field.ok ? 'bg-white border-slate-100' : 'bg-fallo-50/60 border-fallo-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-micro font-black shrink-0 ${
                          field.ok ? 'bg-slate-100 text-slate-500' : 'bg-fallo-100 text-fallo-700'
                        }`}>
                          {field.index || i + 1}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-mini font-black text-slate-400 uppercase leading-none mb-1 truncate">
                            {field.name}
                          </span>
                          <span className={`text-dato font-bold font-mono ${field.ok ? 'text-slate-700' : 'text-fallo-600'}`}>
                            {field.value}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {!field.ok && (
                          <div className="flex flex-col items-end text-right">
                            <span className="text-micro font-black text-slate-300 uppercase leading-none mb-1">Esperado</span>
                            <span className="text-etiqueta font-black text-slate-500 max-w-[140px] truncate" title={field.expected}>
                              {field.expected}
                            </span>
                          </div>
                        )}
                        {field.ok ? <CheckCircle2 size={13} className="text-ok-500 shrink-0" /> : <XCircle size={13} className="text-fallo-500 shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 2. TAMAÑO DEL MODELO (Audit mode) / 2. NOMBRE MODELO (Dashboard mode) */}
          {showAudit ? (
            <Card title="2. Tamaño del modelo" auditResult={audit?.results.tamano}>
              {(() => {
                const fileSize = bimData.codechecking?.informacion_general?.tamano_archivo_mb || 0;
                const exceedsSize = fileSize > 200;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-etiqueta font-black text-slate-400 uppercase mb-1">Medida real</span>
                        <span className={`text-2xl font-black ${exceedsSize ? 'text-fallo-600' : 'text-slate-800'}`}>
                          {fileSize.toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-etiqueta font-black text-slate-400 uppercase mb-1">Límite</span>
                        <span className="text-xl font-black text-slate-400">200.00 MB</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${exceedsSize ? 'bg-fallo-500' : 'bg-ok-500'}`}
                        style={{ width: `${Math.min((fileSize / 200) * 100, 100)}%` }}
                      />
                    </div>
                    {!exceedsSize && (
                      <p className="text-etiqueta font-bold text-ok-700 bg-ok-50 p-2 rounded-lg text-center border border-ok-100">Tamaño dentro del límite permitido</p>
                    )}
                    {exceedsSize && (
                      <p className="text-etiqueta font-bold text-fallo-600 bg-fallo-50 p-2 rounded-lg text-center border border-fallo-100">Error: archivo supera el límite de 200 MB</p>
                    )}
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card title="2. Nombre modelo">
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-micro font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Nombre del archivo
                  </span>
                  <span className="text-dato font-bold text-slate-800 break-all leading-snug">
                    {bimData.modelo?.nombre_archivo || bimData.codechecking?.nombre_modelo?.nombre_archivo || 'Sin nombre'}
                  </span>
                </div>

                {(() => {
                  const raw = bimData.modelo?.nombre_archivo || bimData.codechecking?.nombre_modelo?.nombre_archivo || '';
                  const withoutExt = raw.replace(/\.[a-zA-Z0-9]+$/i, '');
                  const underscoreIdx = withoutExt.indexOf('_');
                  const clean = underscoreIdx !== -1 ? withoutExt.substring(0, underscoreIdx) : withoutExt;
                  const suffix = underscoreIdx !== -1 ? withoutExt.substring(underscoreIdx) : null;
                  const parts = clean ? clean.split('-') : [];
                  const blockLabels = [
                    { label: 'PROYECTO', tip: 'Código de proyecto (3 letras)' },
                    { label: 'EQUIPO', tip: 'Empresa / Equipo (2-3 letras)' },
                    { label: 'FASE', tip: 'Fase de creación (EN, EP, AN, PB, PE, CO, AB)' },
                    { label: 'LOCALIZADOR', tip: 'Ubicación / Sector (2 letras o cifras)' },
                    { label: 'TIPO', tip: 'Tipo modelo (MOD / FED)' },
                    { label: 'DISCIPLINA', tip: 'Especialidad (ARQ, EST, INS, URB, ZZZ)' },
                    { label: 'REVIT', tip: 'Versión Revit (ej. R25)' }
                  ];

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-micro font-black uppercase text-slate-400 tracking-wider">
                          Estructura de 7 bloques (izq. a der.)
                        </span>
                        {parts.length === 7 ? (
                          <span className="text-micro font-black text-ok-700 bg-ok-50 px-1.5 py-0.5 rounded border border-ok-200">
                            7 bloques conformes
                          </span>
                        ) : (
                          <span className="text-micro font-black text-fallo-700 bg-fallo-50 px-1.5 py-0.5 rounded border border-fallo-200">
                            {parts.length} de 7 bloques
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {blockLabels.map((b, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col justify-between" title={b.tip}>
                            <span className="text-micro font-black text-slate-400 uppercase tracking-tight">
                              {idx + 1}. {b.label}
                            </span>
                            <span className="text-dato font-black font-mono text-slate-700 mt-1 truncate">
                              {parts[idx] || '---'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {suffix && (
                        <div className="text-micro font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span>Sufijo local (ignorado tras '_'):</span>
                          <span className="font-mono font-bold text-slate-700">{suffix}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </Card>
          )}

          {/* 3. COORDENADAS */}
          <Card title="3. Coordenadas" auditResult={showAudit ? audit?.results.coordenadas : undefined}>
            <div className="space-y-3">
              <div>
                <span className="text-etiqueta font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Punto reconocimiento
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: 'Norte / Sur', key: 'norte_sur_m', val: bimData.codechecking?.coordenadas?.punto_reconocimiento?.norte_sur_m },
                    { label: 'Este / Oeste', key: 'este_oeste_m', val: bimData.codechecking?.coordenadas?.punto_reconocimiento?.este_oeste_m },
                    { label: 'Elevación', key: 'elevacion_m', val: bimData.codechecking?.coordenadas?.punto_reconocimiento?.elevacion_m },
                  ].map((coord, i) => {
                    const expected = (auditConfig?.expectedCoordinates.surveyPoint as any)?.[coord.key];
                    const isError = showAudit && expected !== undefined && Math.abs((coord.val || 0) - expected) > 0.001;
                    return (
                      <div key={i} className={`flex justify-between items-center text-dato border-b border-slate-50 pb-1 last:border-0 ${isError ? 'bg-fallo-50 -mx-2 px-2 rounded' : ''}`}>
                        <span className="text-slate-400 text-etiqueta">{coord.label}</span>
                        <div className="flex flex-col items-end">
                          <span className={`font-bold ${isError ? 'text-fallo-600' : 'text-slate-700'}`}>{(coord.val || 0).toFixed(3)} m</span>
                          {isError && <span className="text-mini font-black text-fallo-400">ESP: {expected.toFixed(3)} m</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-etiqueta font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Punto base proyecto
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: 'Norte / Sur', key: 'norte_sur_m', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.norte_sur_m },
                    { label: 'Este / Oeste', key: 'este_oeste_m', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.este_oeste_m },
                    { label: 'Elevación', key: 'elevacion_m', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.elevacion_m },
                    { label: 'Ángulo Norte', key: 'angulo_norte_grados', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.angulo_norte_grados, unit: '°' },
                  ].map((coord, i) => {
                    const expected = (auditConfig?.expectedCoordinates.basePoint as any)?.[coord.key];
                    const isError = showAudit && expected !== undefined && Math.abs((coord.val || 0) - expected) > (coord.key === 'angulo_norte_grados' ? 0.01 : 0.001);
                    return (
                      <div key={i} className={`flex justify-between items-center text-dato border-b border-slate-50 pb-1 last:border-0 ${isError ? 'bg-fallo-50 -mx-2 px-2 rounded' : ''}`}>
                        <span className="text-slate-400 text-etiqueta">{coord.label}</span>
                        <div className="flex flex-col items-end">
                          <span className={`font-bold ${isError ? 'text-fallo-600' : 'text-slate-700'}`}>{(coord.val || 0).toFixed(coord.key === 'angulo_norte_grados' ? 2 : 3)}{coord.unit || ' m'}</span>
                          {isError && <span className="text-mini font-black text-fallo-400">ESP: {expected.toFixed(coord.key === 'angulo_norte_grados' ? 2 : 3)}{coord.unit || ' m'}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {showAudit && (audit?.results.coordenadas as any).coordErrors?.map((err: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-etiqueta font-bold text-fallo-600 bg-fallo-50 p-2 rounded-lg border border-fallo-100 mt-2">
                    <AlertTriangle size={12} />
                    {err}
                  </div>
                ))}
                {showAudit && (audit?.results.coordenadas as any).coordNoInfo?.map((info: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-etiqueta font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                    <Info size={12} />
                    {info}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ==================== COLUMNA 2 ==================== */}
        <div className="flex flex-col gap-3">
          {/* 4. SUBPROYECTOS */}
          <Card title="4. Subproyectos" auditResult={showAudit ? audit?.results.subproyectos : undefined}>
            {!showAudit ? (
              <>
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-etiqueta font-bold text-slate-400 uppercase">Subproyectos vacíos</span>
                  <span className="text-dato font-black text-fallo-500">{bimData.codechecking?.subproyectos?.existentes?.filter(w => w.vacio).length || 0}</span>
                </div>
                <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
                  {bimData.codechecking?.subproyectos?.existentes?.map((workset, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        {workset.vacio && <div className="w-1.5 h-1.5 rounded-full bg-fallo-400" />}
                        <span className="text-dato font-bold text-slate-700">{workset.nombre}</span>
                      </div>
                      <span className="text-[8.5px] font-mono text-slate-400">{workset.num_elementos} elem</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dato font-black text-slate-500 uppercase tracking-tight">Subproyectos vacíos</span>
                    <span className="bg-fallo-100 text-fallo-600 text-dato font-black px-2 py-0.5 rounded-lg">{(audit?.results.subproyectos as any)?.empty?.length || 0}</span>
                  </div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                    {(audit?.results.subproyectos as any)?.empty?.map((name: string, i: number) => (
                      <div key={i} className="text-etiqueta font-bold text-fallo-600 bg-fallo-50 border border-fallo-100 px-2 py-1.5 rounded-lg flex items-center gap-2">
                        <AlertCircle size={10} />
                        {name}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dato font-black text-fallo-600 uppercase tracking-tight">Faltan obligatorios</span>
                    <span className="bg-fallo-100 text-fallo-700 text-dato font-black px-2 py-0.5 rounded-lg">{(audit?.results.subproyectos as any)?.missing?.length || 0}</span>
                  </div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                    {(audit?.results.subproyectos as any)?.missing?.map((name: string, i: number) => (
                      <div key={i} className="text-etiqueta font-bold text-fallo-700 bg-fallo-50 border border-fallo-100 px-2 py-1.5 rounded-lg flex items-center gap-2">
                        <XCircle size={11} className="text-fallo-600 shrink-0" />
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 5. WARNINGS */}
          <Card title="5. Warnings" auditResult={showAudit ? audit?.results.warnings : undefined}>
            {!showAudit ? (
              <>
                <div className="flex items-end gap-2 mb-4 border-b border-slate-50 pb-3">
                  <span className="text-3xl font-black text-slate-800 leading-none">{bimData.codechecking?.warnings?.total_incidencias || 0}</span>
                  <span className="text-dato font-bold text-slate-400 uppercase pb-1 tracking-tight">warnings totales</span>
                </div>
                <div className="space-y-2">
                  {bimData.codechecking?.warnings?.detalle?.map((warn, i) => (
                    <div 
                      key={i} 
                      onClick={() => onOpenWarningModal(warn.tipo_warning, warn.elementos_ids.map(String))}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-marca-200 hover:bg-white transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-etiqueta font-bold text-slate-800 leading-tight flex-1 mr-2">{warn.tipo_warning}</span>
                        <span className="bg-fallo-100 text-fallo-600 text-etiqueta font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                          {warn.cantidad_incidencias}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {warn.categorias_afectadas.slice(0, 2).map((cat, ci) => (
                          <span key={ci} className="text-micro bg-white text-slate-400 font-bold px-1 rounded border border-slate-50 uppercase">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const total = (audit?.results.warnings as any)?.totalWarnings ?? (bimData.codechecking?.warnings?.total_incidencias || 0);
                  const compliesWithMax = total <= 300;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-etiqueta font-black text-slate-400 uppercase mb-1">Total Warnings</span>
                          <span className={`text-2xl font-black ${compliesWithMax ? 'text-slate-800' : 'text-fallo-600'}`}>
                            {total}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-etiqueta font-black text-slate-400 uppercase mb-1">Máximo</span>
                          <span className="text-xl font-black text-slate-400">300</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${compliesWithMax ? 'bg-ok-500' : 'bg-fallo-500'}`}
                          style={{ width: `${Math.min((total / 300) * 100, 100)}%` }}
                        />
                      </div>
                    </>
                  );
                })()}

                {((audit?.results.warnings as any)?.roomAreaWarnings?.length || 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-dato font-black text-fallo-600 uppercase tracking-tight">Avisos Habitaciones/Áreas:</p>
                    {(audit?.results.warnings as any)?.roomAreaWarnings?.map((warn: any, i: number) => (
                      <div 
                        key={i} 
                        className="p-2.5 rounded-xl bg-fallo-50 border border-fallo-100 cursor-pointer"
                        onClick={() => onOpenWarningModal(warn.tipo_warning, warn.elementos_ids.map(String))}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-dato font-bold text-fallo-800 leading-tight">{warn.tipo_warning}</span>
                          <span className="bg-fallo-600 text-white text-etiqueta font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                            {warn.cantidad_incidencias}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {warn.elementos_ids.slice(0, 5).map((id: number, idx: number) => (
                            <span key={idx} className="text-mini font-mono font-bold bg-white text-fallo-400 px-1 rounded border border-fallo-100">
                              {id}
                            </span>
                          ))}
                          {warn.elementos_ids.length > 5 && <span className="text-mini text-fallo-400">+{warn.elementos_ids.length - 5} más</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {audit?.results.warnings?.status === 'BUENO' && (
                  <div className="p-2.5 rounded-xl bg-ok-50 border border-ok-100 text-center">
                    <span className="text-etiqueta font-black text-ok-600 uppercase tracking-widest flex items-center justify-center gap-2">
                      <CheckCircle2 size={12} /> Warnings bajo control
                    </span>
                  </div>
                )}
                {audit?.results.warnings?.status === 'ALERTA' && (
                  <div className="p-2.5 rounded-xl bg-alerta-50 border border-alerta-200 text-center">
                    <span className="text-etiqueta font-black text-alerta-700 uppercase tracking-widest flex items-center justify-center gap-2">
                      <AlertTriangle size={12} /> Volumen alto de warnings
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 6. FILTROS DE VISTA */}
          <Card title="6. Filtros de vista" auditResult={showAudit ? audit?.results.filtros : undefined}>
            <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
              <div className="flex flex-col">
                <span className={`text-2xl font-black leading-none ${
                  showAudit && audit?.results.filtros?.status === 'FALLO' ? 'text-fallo-600' : 'text-slate-800'
                }`}>
                  {bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0}
                </span>
                <span className="text-mini font-bold text-slate-400 uppercase tracking-tighter">sin utilizar</span>
              </div>
              <div className="w-10 h-10 bg-marca-50 text-marca-600 rounded-xl flex items-center justify-center">
                <Filter size={18} />
              </div>
            </div>
            {!showAudit && (
              <div className="flex flex-wrap gap-1">
                {bimData.codechecking?.filtros_vista?.sin_usar_nombres?.map((filter, i) => (
                  <span key={i} className="text-mini font-bold bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded-md">
                    {filter}
                  </span>
                ))}
              </div>
            )}
            {showAudit && audit?.results.filtros.status === 'FALLO' && (
              <div className="mt-2 text-etiqueta font-bold text-fallo-700 bg-fallo-50 p-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1 border border-fallo-100">
                <div className="flex items-center gap-1.5 text-fallo-600 font-black">
                  <XCircle size={12} />
                  <span>Filtros sin utilizar ({bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0})</span>
                </div>
                <p className="text-mini text-fallo-600/80 font-normal">Deben purgarse antes de la entrega del modelo</p>
              </div>
            )}
            {showAudit && audit?.results.filtros.status === 'BUENO' && (
              <div className="mt-2 text-etiqueta font-bold text-ok-700 bg-ok-50 p-2 rounded-xl text-center flex items-center justify-center gap-1.5 border border-ok-100">
                <CheckCircle2 size={12} className="text-ok-600" />
                <span>Todos los filtros en uso</span>
              </div>
            )}
          </Card>
        </div>

        {/* ==================== COLUMNA 3 ==================== */}
        <div className="flex flex-col gap-3">
          {/* 7. OPCIONES DE DISEÑO */}
          <Card title="7. Opciones de diseño" auditResult={showAudit ? audit?.results.opcionesDiseno : undefined}>
            <div className="mb-2 flex items-center justify-between border-b border-slate-50 pb-1">
              <span className="text-etiqueta font-bold text-slate-400 uppercase">Cantidad detectada</span>
              <span className={`text-dato font-black ${bimData.codechecking?.opciones_diseno?.existen ? 'text-fallo-500' : 'text-ok-500'}`}>
                {bimData.codechecking?.opciones_diseno?.cantidad || 0}
              </span>
            </div>
            {!showAudit && bimData.codechecking?.opciones_diseno?.existen && (
              <div className="flex flex-wrap gap-1 mt-2">
                {bimData.codechecking?.opciones_diseno?.listado?.map((opt, i) => (
                  <span key={i} className="text-etiqueta font-bold bg-fallo-50 text-fallo-600 px-2 py-0.5 rounded-lg border border-fallo-100">{opt}</span>
                ))}
              </div>
            )}
            {showAudit && bimData.codechecking?.opciones_diseno?.existen && (
              <div className="mt-2 p-2.5 bg-fallo-50 border border-fallo-100 rounded-xl text-center">
                <div className="text-etiqueta font-black text-fallo-700 uppercase tracking-tight flex items-center justify-center gap-1.5 mb-1">
                  <XCircle size={12} className="text-fallo-600" /> Opciones de diseño activas
                </div>
                <p className="text-mini text-fallo-600/80 mb-2">No se permite entregar modelos con opciones de diseño</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {bimData.codechecking?.opciones_diseno?.listado?.map((opt, i) => (
                    <span key={i} className="text-mini font-bold bg-white text-fallo-700 px-1.5 py-0.5 rounded border border-fallo-200">{opt}</span>
                  ))}
                </div>
              </div>
            )}
            {showAudit && !bimData.codechecking?.opciones_diseno?.existen && (
              <div className="p-2 bg-ok-50 rounded-lg text-center">
                <span className="text-etiqueta font-black text-ok-600 uppercase tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle2 size={12} /> Limpio
                </span>
              </div>
            )}
          </Card>

          {/* 8. FASES */}
          <Card title="8. Fases" auditResult={showAudit ? audit?.results.fases : undefined}>
            {!showAudit ? (
              <div className="flex flex-col gap-0.5">
                {(() => {
                  const rawList = bimData.codechecking?.fases?.elementos_por_fase?.length 
                    ? bimData.codechecking.fases.elementos_por_fase 
                    : (bimData.codechecking?.fases?.listado || []);
                  
                  return rawList.map((item: any, i: number) => {
                    const parsed = parsePhaseItem(item);
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-dato font-bold text-slate-700">{parsed.nombre}</span>
                          {parsed.tieneConteo && (
                            <span className="text-[8.5px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {parsed.cantidad} elem.
                            </span>
                          )}
                        </div>
                        <span className={`text-mini font-black uppercase tracking-widest ${parsed.esNuevaConstruccion ? 'text-marca-600' : 'text-slate-400'}`}>
                          {parsed.esNuevaConstruccion ? 'Principal' : 'Secundaria'}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                {audit?.results.fases.status === 'BUENO' ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-ok-50 rounded-xl border border-ok-100 text-center">
                      <span className="text-dato font-black text-ok-600 uppercase tracking-widest flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} /> Todo en Nueva Construcción
                      </span>
                    </div>
                    {/* Detalle informativo de las fases limpias */}
                    <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {(() => {
                        const rawList = bimData.codechecking?.fases?.elementos_por_fase?.length 
                          ? bimData.codechecking.fases.elementos_por_fase 
                          : (bimData.codechecking?.fases?.listado || []);
                        return rawList.map((item: any, i: number) => {
                          const parsed = parsePhaseItem(item);
                          return (
                            <div key={i} className="flex items-center justify-between text-dato py-1 border-b border-slate-100 last:border-0">
                              <span className="font-bold text-slate-700">{parsed.nombre}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-500 font-bold text-etiqueta">
                                  {parsed.tieneConteo ? `${parsed.cantidad} elem.` : ''}
                                </span>
                                <span className="text-[7.5px] font-black text-ok-700 uppercase bg-ok-100 px-1.5 py-0.5 rounded">
                                  Correcto
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-dato font-black text-fallo-600 uppercase tracking-tight">Fases a revisar:</p>
                    {audit?.results.fases.details?.filter((_, i) => i > 0).map((phaseMsg: string, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-fallo-50 border border-fallo-100 rounded-xl">
                        <span className="text-dato font-bold text-fallo-800">{phaseMsg}</span>
                        <span className="text-mini font-black text-fallo-500 uppercase bg-fallo-100 px-1.5 py-0.5 rounded">
                          Revisar
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8.5px] font-bold text-slate-500 leading-tight">Solo se permite información en la fase de Nueva Construcción.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 9. NIVELES */}
          <Card title="9. Niveles" auditResult={showAudit ? audit?.results.niveles : undefined}>
            <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-2">
              {bimData.codechecking?.niveles?.listado?.slice().sort((a,b) => b.elevacion_m - a.elevacion_m).map((level, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-dato font-bold text-slate-700">{level.nombre}</span>
                    <div className="flex gap-1">
                      {level.es_nivel_edificio && (
                        <span className="text-micro font-black bg-alerta-100 text-alerta-600 px-1 rounded uppercase tracking-tighter">Edificio</span>
                      )}
                      {level.es_estructura && (
                        <span className="text-micro font-black bg-slate-100 text-slate-600 px-1 rounded uppercase tracking-tighter">Estructura</span>
                      )}
                    </div>
                  </div>
                  <span className="text-etiqueta font-mono font-bold text-marca-600 bg-marca-50 px-1.5 py-0.5 rounded">
                    {level.elevacion_m > 0 ? `+${level.elevacion_m.toFixed(2)}` : level.elevacion_m.toFixed(2)} m
                  </span>
                </div>
              ))}
            </div>
            {showAudit && (audit?.results.niveles as any)?.groupedErrors && (
              <div className="mt-3 space-y-3">
                {(audit?.results.niveles as any).groupedErrors.missing.length > 0 && (
                  <div className="p-2.5 bg-fallo-50 rounded-xl border border-fallo-100">
                    <p className="text-etiqueta font-black text-fallo-600 uppercase mb-1.5 flex items-center gap-1">
                      <AlertTriangle size={10} /> Falta nivel:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(audit?.results.niveles as any).groupedErrors.missing.map((name: string, i: number) => (
                        <span key={i} className="text-etiqueta font-bold bg-white text-fallo-700 px-2 py-0.5 rounded-lg border border-fallo-100">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(audit?.results.niveles as any).groupedErrors.elevation.length > 0 && (
                  <div className="p-2.5 bg-fallo-50 rounded-xl border border-fallo-100">
                    <p className="text-etiqueta font-black text-fallo-600 uppercase mb-1.5 flex items-center gap-1">
                      <AlertCircle size={10} /> Elevación incorrecta:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(audit?.results.niveles as any).groupedErrors.elevation.map((detail: string, i: number) => (
                        <span key={i} className="text-[8.5px] font-bold bg-white text-fallo-700 px-2 py-0.5 rounded-lg border border-fallo-100">{detail}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(audit?.results.niveles as any).groupedErrors.structure.length > 0 && (
                  <div className="p-2.5 bg-fallo-50 rounded-xl border border-fallo-100">
                    <p className="text-etiqueta font-black text-fallo-600 uppercase mb-1.5 flex items-center gap-1">
                      <Layers size={10} /> No tiene marcado "Es Estructura":
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(audit?.results.niveles as any).groupedErrors.structure.map((name: string, i: number) => (
                        <span key={i} className="text-etiqueta font-bold bg-white text-fallo-700 px-2 py-0.5 rounded-lg border border-fallo-100">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(audit?.results.niveles as any).groupedErrors.building.length > 0 && (
                  <div className="p-2.5 bg-fallo-50 rounded-xl border border-fallo-100">
                    <p className="text-etiqueta font-black text-fallo-600 uppercase mb-1.5 flex items-center gap-1">
                      <ShieldCheck size={10} /> No tiene marcado "Es Nivel de Edificio":
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(audit?.results.niveles as any).groupedErrors.building.map((name: string, i: number) => (
                        <span key={i} className="text-etiqueta font-bold bg-white text-fallo-700 px-2 py-0.5 rounded-lg border border-fallo-100">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(audit?.results.niveles as any).groupedErrors.noInfo.length > 0 && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-etiqueta font-black text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                      <Info size={10} /> Niveles sin info de pineado:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(audit?.results.niveles as any).groupedErrors.noInfo.map((name: string, i: number) => (
                        <span key={i} className="text-etiqueta font-bold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 10. REJILLAS */}
          <Card 
            title="10. Rejillas"
            auditResult={showAudit ? audit?.results.rejillas : undefined}
            className="cursor-pointer hover:border-alerta-200 transition-all active:scale-[0.98]"
            onClick={() => onOpenGridsModal(bimData.codechecking?.rejillas?.listado?.map(g => g.nombre) || [])}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-dato font-bold text-slate-400 uppercase">Cantidad de rejillas</span>
                <span className="text-alerta-500 text-lg font-black">{bimData.codechecking?.rejillas?.cantidad || 0}</span>
              </div>
              
              {(audit?.results.rejillas as any)?.unpinnedGrids?.length > 0 && (
                <div className="p-2.5 bg-fallo-50 rounded-xl border border-fallo-100">
                  <p className="text-etiqueta font-black text-fallo-600 uppercase mb-1.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> Rejillas no pineadas:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(audit?.results.rejillas as any).unpinnedGrids.map((name: string, i: number) => (
                      <span key={i} className="text-etiqueta font-bold bg-white text-fallo-700 px-2 py-0.5 rounded-lg border border-fallo-100">{name}</span>
                    ))}
                  </div>
                </div>
              )}
              {(audit?.results.rejillas as any)?.noInfoGrids?.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-etiqueta font-black text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                    <Info size={10} /> Rejillas sin info de pineado:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(audit?.results.rejillas as any).noInfoGrids.map((name: string, i: number) => (
                      <span key={i} className="text-etiqueta font-bold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-etiqueta font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Tipos únicos: {Array.from(new Set(bimData.codechecking?.rejillas?.listado?.map(g => g.tipo_curva) || [])).length}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(bimData.codechecking?.rejillas?.listado?.map(g => g.tipo_curva) || [])).map((type, i) => (
                    <span key={i} className="text-etiqueta bg-marca-50 text-marca-600 font-bold px-2 py-1 rounded-lg border border-marca-100">
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center">
                <span className="text-mini font-black text-slate-300 uppercase tracking-[0.2em] animate-pulse">Haz clic para ver listado</span>
              </div>

              {showAudit && audit?.results.rejillas?.status === 'FALLO' && (
                <div className="p-2 bg-fallo-50 border border-fallo-100 rounded-xl text-center flex items-center justify-center gap-1.5 text-etiqueta font-bold text-fallo-700">
                  <XCircle size={12} className="text-fallo-600 shrink-0" />
                  <span>{(audit?.results.rejillas as any).unpinnedGrids?.length > 0 ? 'Elementos sin pinear y/o exceso de tipos' : 'Exceso de tipos de rejilla'}</span>
                </div>
              )}
              {showAudit && audit?.results.rejillas?.status === 'ALERTA' && (
                <div className="p-2 bg-alerta-50 border border-alerta-200 rounded-xl text-center flex items-center justify-center gap-1.5 text-etiqueta font-bold text-alerta-800">
                  <AlertTriangle size={12} className="text-alerta-600 shrink-0" />
                  <span>4 tipos de rejilla (cercano al límite de 5)</span>
                </div>
              )}
              {showAudit && audit?.results.rejillas?.status === 'BUENO' && (
                <div className="p-2 bg-ok-50 border border-ok-100 rounded-xl text-center flex items-center justify-center gap-1.5 text-etiqueta font-bold text-ok-700">
                  <CheckCircle2 size={12} className="text-ok-600 shrink-0" />
                  <span>Tipos de rejilla conformes</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

const SummaryBadge = ({ count, label, color }: { count: number; label: string; color: 'green' | 'red' | 'orange' }) => {
  const colors = {
    green: 'bg-ok-50 text-ok-600 border-ok-100',
    red: 'bg-fallo-50 text-fallo-600 border-fallo-100',
    orange: 'bg-alerta-50 text-alerta-600 border-alerta-100'
  };

  const icons = {
    green: <CheckCircle2 size={16} />,
    red: <XCircle size={16} />,
    orange: <AlertTriangle size={16} />
  };

  return (
    <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl border ${colors[color]} flex items-center gap-3 font-bold transition-all hover:scale-105`}>
      <div className="shrink-0">{icons[color]}</div>
      <div className="flex flex-col leading-none">
        <span className="text-xl">{count}</span>
        <span className="text-dato uppercase opacity-70 tracking-tighter">{label}</span>
      </div>
    </div>
  );
};
