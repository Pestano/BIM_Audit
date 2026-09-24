import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RevitBimData, AuditConfig, ProjectFile } from '../../types';
import { Card } from '../common/Card';
import { runAudit, parsePhaseItem, extractProjectPhases, extractProjectDesignOptions } from '../../lib/auditEngine';

interface DashboardViewProps {
  bimData: RevitBimData;                                                        // Datos completos del JSON de Revit
  auditConfig?: AuditConfig;                                                    // Configuración de auditoría persistente
  activeFile?: ProjectFile;                                                     // Archivo o modelo activo actual
  onOpenWarningModal: (typeName: string, ids: string[]) => void;                // Función para abrir el modal de detalles de warnings
  onOpenGridsModal: (grids: string[]) => void;                                  // Función para abrir el modal de listado de rejillas
  showAudit?: boolean;                                                          // Si es true, muestra los resultados de auditoría
  hideSummaryBanner?: boolean;                                                  // Si es true, oculta el banner de resumen global de reglas
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
  showAudit = false,
  hideSummaryBanner = false
}) => {
  const audit = showAudit ? runAudit(bimData, auditConfig, activeFile) : null;

  return (
    <motion.div 
      key={showAudit ? "audit" : "dashboard"}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-12"
      // Escala tipográfica de las tarjetas.
      // En "Configuración General" (!showAudit) se usa una escala más grande
      // a petición del usuario; en "Resultado de auditoría" se mantiene la
      // escala anterior, sin tocar.
      style={
        !showAudit
          ? ({
              '--text-micro': '9px',
              '--text-mini': '10px',
              '--text-etiqueta': '11px',
              '--text-dato': '12px',
              '--text-nota': '13px',
            } as React.CSSProperties)
          : ({
              '--text-micro': '8px',
              '--text-mini': '9px',
              '--text-etiqueta': '10px',
              '--text-dato': '11px',
              '--text-nota': '12px',
            } as React.CSSProperties)
      }
    >
      {/* Panel de Resumen de Auditoría (Solo en modo auditoría y si no se ha ocultado expresamente) */}
      {showAudit && !hideSummaryBanner && (
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

      <div className={showAudit
        ? "columns-1 md:columns-2 xl:columns-3 gap-3.5 [column-fill:_balance]"
        : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 items-stretch"
      }>
        {/* ==================== 1. INFORMACIÓN GENERAL / NOMENCLATURA ==================== */}
        {!showAudit ? (
          <Card
            title="1. Información general"
            subtitle={<><span>Fase: <strong className="text-zinc-800">{bimData.fase_auditoria || '---'}</strong></span><span className="mx-2">•</span><span>Revit: <strong className="text-zinc-800">{bimData.modelo?.revit_version || '---'}</strong></span></>}
            className="shadow-2xs"
            detailStyle={!showAudit}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-1">
                {[
                  { label: "fase auditoría", value: bimData.fase_auditoria || '---' },
                  { label: "fecha exportación", value: bimData.fecha_exportacion ? new Date(bimData.fecha_exportacion).toLocaleDateString('es-ES') : '---' },
                  { label: "nombre archivo", value: bimData.modelo?.nombre_archivo || '---' },
                  { label: "disciplina", value: bimData.modelo?.disciplina || '---' },
                  { label: "revit version", value: bimData.modelo?.revit_version || '---' },
                  { label: "tamaño archivo", value: `${bimData.codechecking?.informacion_general?.tamano_archivo_mb?.toFixed(2) || '0.00'} MB` },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-dato border-b border-slate-50 pb-1 last:border-0">
                    <span className="text-slate-400 font-medium">{item.label}</span>
                    <span className="text-slate-700 font-bold text-right ml-4">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1">
                <h4 className="text-etiqueta font-bold text-slate-400 mb-1.5 border-b border-slate-50 pb-1">
                  información proyecto
                </h4>
                <ul className="space-y-1 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                  {bimData.codechecking?.informacion_general?.parametros_informacion_proyecto?.map((param, i) => (
                    <li key={i} className="flex justify-between items-start gap-4 text-dato border-b border-slate-50 pb-1 last:border-0">
                      <span className="text-slate-400 text-[9.5px] mt-0.5 leading-tight">
                        {param.nombre.toLowerCase().replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-700 font-bold text-right leading-tight">{param.valor || "---"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="1. Nomenclatura del modelo" auditResult={audit?.results.nomenclatura} className="shadow-2xs" detailStyle={!showAudit}>
            <div className="space-y-2">
              <div className="border-b border-slate-50 pb-1.5">
                <span className="text-etiqueta font-bold text-slate-400 block mb-0.5">
                  nombre original
                </span>
                <p className="text-dato font-bold text-slate-800 break-all leading-snug">
                  {bimData.modelo?.nombre_archivo || bimData.codechecking?.nombre_modelo?.nombre_archivo || 'Sin nombre'}
                </p>
                {(audit?.results.nomenclatura as any)?.ignoredSuffix && (
                  <span className="text-mini font-mono text-slate-400 block mt-0.5">
                    sufijo ignorado: {(audit?.results.nomenclatura as any).ignoredSuffix}
                  </span>
                )}
              </div>
              
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1.5 custom-scrollbar">
                {(audit?.results.nomenclatura as any)?.fields?.map((field: any, i: number) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 text-dato"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-mini font-mono text-slate-400 w-4">
                        {field.index || i + 1}.
                      </span>
                      <span className="text-slate-500 text-etiqueta truncate">
                        {field.name.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className={`font-mono font-bold ${field.ok ? 'text-slate-700' : 'text-fallo-600'}`}>
                        {field.value}
                      </span>
                      <span className={`text-mini font-mono font-bold ${field.ok ? 'text-ok-600' : 'text-fallo-600'}`}>
                        {field.ok ? 'ok' : `esp: ${field.expected}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ==================== 2. TAMAÑO DEL MODELO / NOMBRE MODELO ==================== */}
        {showAudit ? (
          <Card title="2. Tamaño del modelo" subtitle={<><span>Total: <strong className="text-zinc-800">{bimData.codechecking?.informacion_general?.tamano_archivo_mb?.toFixed(2) || '0.00'} MB</strong></span></>} auditResult={audit?.results.tamano} className="shadow-2xs" detailStyle={!showAudit}>
            {(() => {
              const fileSize = bimData.codechecking?.informacion_general?.tamano_archivo_mb || 0;
              const exceedsSize = fileSize > 200;

              return (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-dato border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">medida real</span>
                    <span className={`font-mono font-bold ${exceedsSize ? 'text-fallo-600' : 'text-slate-700'}`}>
                      {fileSize.toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-dato border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-medium">límite</span>
                    <span className="font-mono text-slate-500">200.00 MB</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-2">
                    <div 
                      className={`h-full transition-all duration-1000 ${exceedsSize ? 'bg-fallo-500' : 'bg-ok-500'}`}
                      style={{ width: `${Math.min((fileSize / 200) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-etiqueta pt-0.5">
                    <span className="text-slate-400">estado</span>
                    <span className={`font-bold ${exceedsSize ? 'text-fallo-600' : 'text-ok-600'}`}>
                      {exceedsSize ? 'error: supera 200 MB' : 'conforme'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </Card>
        ) : (
          <Card title="2. Nombre modelo" subtitle={<span>Archivo: <strong className="text-zinc-800">{bimData.modelo?.nombre_archivo || 'Sin nombre'}</strong></span>} className="shadow-2xs" detailStyle={!showAudit}>
            <div className="space-y-2">
              <div className="border-b border-slate-50 pb-2">
                <span className="text-etiqueta font-bold text-slate-400 block mb-0.5">
                  nombre del archivo
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

                return (
                  <div className="pt-0.5">
                    <span className="text-etiqueta font-bold text-slate-400 block mb-0.5">
                      nombre sin sufijo local
                    </span>
                    <span className="text-dato font-bold text-slate-800 break-all leading-snug">
                      {clean || 'Sin nombre'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </Card>
        )}

        {/* ==================== 3. COORDENADAS ==================== */}
        <Card title="3. Coordenadas" subtitle={<><span>Puntos: <strong className="text-zinc-800">2</strong></span></>} auditResult={showAudit ? audit?.results.coordenadas : undefined} className="shadow-2xs" detailStyle={!showAudit}>
          <div className="space-y-3">
            <div>
              <span className="text-etiqueta font-bold text-slate-400 mb-1 block border-b border-slate-50 pb-1">
                punto reconocimiento
              </span>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { label: 'norte / sur', key: 'norte_sur_m', val: bimData.codechecking?.coordenadas?.punto_reconocimiento?.norte_sur_m },
                  { label: 'este / oeste', key: 'este_oeste_m', val: bimData.codechecking?.coordenadas?.punto_reconocimiento?.este_oeste_m },
                  { label: 'elevación', key: 'elevacion_m', val: bimData.codechecking?.coordenadas?.punto_reconocimiento?.elevacion_m },
                ].map((coord, i) => {
                  const expected = (auditConfig?.expectedCoordinates.surveyPoint as any)?.[coord.key];
                  const isError = showAudit && expected !== undefined && Math.abs((coord.val || 0) - expected) > 0.001;
                  return (
                    <div key={i} className="flex justify-between items-center text-dato border-b border-slate-50 pb-1 last:border-0">
                      <span className="text-slate-400 text-etiqueta">{coord.label}</span>
                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-bold ${isError ? 'text-fallo-600' : 'text-slate-700'}`}>{(coord.val || 0).toFixed(3)} m</span>
                        {isError && <span className="text-mini font-mono text-fallo-400">esp: {expected.toFixed(3)} m</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-etiqueta font-bold text-slate-400 mb-1 block border-b border-slate-50 pb-1">
                punto base proyecto
              </span>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { label: 'norte / sur', key: 'norte_sur_m', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.norte_sur_m },
                  { label: 'este / oeste', key: 'este_oeste_m', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.este_oeste_m },
                  { label: 'elevación', key: 'elevacion_m', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.elevacion_m },
                  { label: 'ángulo norte', key: 'angulo_norte_grados', val: bimData.codechecking?.coordenadas?.punto_base_proyecto?.angulo_norte_grados, unit: '°' },
                ].map((coord, i) => {
                  const expected = (auditConfig?.expectedCoordinates.basePoint as any)?.[coord.key];
                  const isError = showAudit && expected !== undefined && Math.abs((coord.val || 0) - expected) > (coord.key === 'angulo_norte_grados' ? 0.01 : 0.001);
                  return (
                    <div key={i} className="flex justify-between items-center text-dato border-b border-slate-50 pb-1 last:border-0">
                      <span className="text-slate-400 text-etiqueta">{coord.label}</span>
                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-bold ${isError ? 'text-fallo-600' : 'text-slate-700'}`}>{(coord.val || 0).toFixed(coord.key === 'angulo_norte_grados' ? 2 : 3)}{coord.unit || ' m'}</span>
                        {isError && <span className="text-mini font-mono text-fallo-400">esp: {expected.toFixed(coord.key === 'angulo_norte_grados' ? 2 : 3)}{coord.unit || ' m'}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {showAudit && (audit?.results.coordenadas as any).coordErrors?.map((err: string, i: number) => (
                <div key={i} className="text-etiqueta font-bold text-fallo-600 border-b border-slate-50 py-1">
                  {err}
                </div>
              ))}
              {showAudit && (audit?.results.coordenadas as any).coordNoInfo?.map((info: string, i: number) => (
                <div key={i} className="text-etiqueta text-slate-500 border-b border-slate-50 py-1">
                  {info}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ==================== 4. SUBPROYECTOS ==================== */}
        <Card title="4. Subproyectos" subtitle={<><span>Total: <strong className="text-zinc-800">{bimData.codechecking?.subproyectos?.existentes?.length || 0}</strong></span><span className="mx-2">•</span><span>Vacíos: <strong className={(bimData.codechecking?.subproyectos?.existentes?.filter(w => w.vacio).length || 0) > 0 ? "text-fallo-600" : "text-zinc-800"}>{bimData.codechecking?.subproyectos?.existentes?.filter(w => w.vacio).length || 0}</strong></span></>} auditResult={showAudit ? audit?.results.subproyectos : undefined} className="shadow-2xs" detailStyle={!showAudit}>
          {!showAudit ? (
            <>
              <div className="mb-2 space-y-1 border-b border-slate-100 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-etiqueta font-bold text-slate-400">total</span>
                  <span className="text-dato font-black text-slate-700">{bimData.codechecking?.subproyectos?.existentes?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-etiqueta font-bold text-slate-400">subproyectos vacíos</span>
                  <span className="text-dato font-black text-fallo-500">{bimData.codechecking?.subproyectos?.existentes?.filter(w => w.vacio).length || 0}</span>
                </div>
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
                {bimData.codechecking?.subproyectos?.existentes?.map((workset, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className={`text-dato font-bold ${workset.vacio ? 'text-fallo-500' : 'text-slate-700'}`}>
                      {workset.nombre}
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400">{workset.num_elementos} elem</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 space-y-1 border-b border-slate-100 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-etiqueta font-bold text-slate-400">total</span>
                  <span className="text-dato font-black text-slate-700">{bimData.codechecking?.subproyectos?.existentes?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-etiqueta font-bold text-slate-400">subproyectos vacíos</span>
                  <span className="text-dato font-black text-fallo-500">{(audit?.results.subproyectos as any)?.empty?.length || 0}</span>
                </div>
                {((audit?.results.subproyectos as any)?.missing?.length || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-etiqueta font-bold text-slate-400">faltan obligatorios</span>
                    <span className="text-dato font-black text-fallo-500">{(audit?.results.subproyectos as any)?.missing?.length || 0}</span>
                  </div>
                )}
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
                {(audit?.results.subproyectos as any)?.empty?.map((name: string, i: number) => (
                  <div key={`empty-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 text-dato">
                    <span className="text-slate-700 font-bold">{name}</span>
                    <span className="text-mini font-mono text-fallo-500">vacío</span>
                  </div>
                ))}
                {(audit?.results.subproyectos as any)?.missing?.map((name: string, i: number) => (
                  <div key={`missing-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 text-dato">
                    <span className="text-fallo-600 font-bold">{name}</span>
                    <span className="text-mini font-mono text-fallo-500">falta</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* ==================== 5. WARNINGS ==================== */}
        <Card title="5. Warnings" subtitle={<span>Total: <strong className="text-zinc-800">{bimData.codechecking?.warnings?.total_incidencias || 0}</strong></span>} auditResult={showAudit ? audit?.results.warnings : undefined} className="shadow-2xs" detailStyle={!showAudit}>
          {!showAudit ? (
            <>
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-etiqueta font-bold text-slate-400">total</span>
                <span className="text-dato font-black text-slate-700">{bimData.codechecking?.warnings?.total_incidencias || 0}</span>
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
                {bimData.codechecking?.warnings?.detalle?.map((warn, i) => (
                  <div 
                    key={i} 
                    onClick={() => onOpenWarningModal(warn.tipo_warning, warn.elementos_ids.map(String))}
                    className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 px-1 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col min-w-0 mr-2">
                      <span className="text-dato font-bold text-slate-700 leading-tight truncate">{warn.tipo_warning}</span>
                      {warn.categorias_afectadas?.length > 0 && (
                        <span className="text-micro text-slate-400 truncate">
                          {warn.categorias_afectadas.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                    <span className="text-dato font-black text-fallo-500 font-mono shrink-0">
                      {warn.cantidad_incidencias}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {(() => {
                const total = (audit?.results.warnings as any)?.totalWarnings ?? (bimData.codechecking?.warnings?.total_incidencias || 0);
                const compliesWithMax = total <= 300;

                return (
                  <>
                    <div className="mb-2 space-y-1 border-b border-slate-100 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-etiqueta font-bold text-slate-400">total</span>
                        <span className={`text-dato font-black ${compliesWithMax ? 'text-slate-700' : 'text-fallo-600'}`}>{total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-etiqueta font-bold text-slate-400">máximo permitido</span>
                        <span className="text-dato font-mono text-slate-500">300</span>
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

              <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1.5 custom-scrollbar pt-1">
                {(audit?.results.warnings as any)?.roomAreaWarnings?.map((warn: any, i: number) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 px-1 rounded cursor-pointer transition-colors"
                    onClick={() => onOpenWarningModal(warn.tipo_warning, warn.elementos_ids.map(String))}
                  >
                    <span className="text-dato font-bold text-fallo-700 truncate mr-2">{warn.tipo_warning}</span>
                    <span className="text-dato font-black text-fallo-500 font-mono shrink-0">
                      {warn.cantidad_incidencias}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ==================== 6. FILTROS DE VISTA ==================== */}
        <Card title="6. Filtros de vista" subtitle={<><span>Total: <strong className="text-zinc-800">{bimData.codechecking?.filtros_vista?.total_filtros || 0}</strong></span><span className="mx-2">•</span><span>Sin usar: <strong className={(bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0) > 0 ? "text-fallo-600" : "text-zinc-800"}>{bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0}</strong></span></>} auditResult={showAudit ? audit?.results.filtros : undefined} className="shadow-2xs" detailStyle={!showAudit}>
          <div className="mb-2 space-y-1 border-b border-slate-100 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-etiqueta font-bold text-slate-400">total</span>
              <span className="text-dato font-black text-slate-700">{bimData.codechecking?.filtros_vista?.total_filtros || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-etiqueta font-bold text-slate-400">sin usar</span>
              <span className={`text-dato font-black ${
                showAudit && audit?.results.filtros?.status === 'FALLO' ? 'text-fallo-600' : 'text-slate-700'
              }`}>
                {bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0}
              </span>
            </div>
          </div>
          {!showAudit ? (
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
              {bimData.codechecking?.filtros_vista?.nombres_filtros?.map((name, i) => {
                const sinUsar = bimData.codechecking?.filtros_vista?.sin_usar_nombres?.includes(name);
                return (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 text-dato">
                    <span className={`font-bold ${sinUsar ? 'text-fallo-500' : 'text-slate-700'}`}>{name}</span>
                    {sinUsar && <span className="text-mini font-mono text-fallo-500">sin usar</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1 text-dato">
              {audit?.results.filtros?.status === 'FALLO' ? (
                <>
                  <div className="flex justify-between items-center text-etiqueta border-b border-slate-50 pb-1">
                    <span className="text-slate-400">estado</span>
                    <span className="font-bold text-fallo-600">purgar {bimData.codechecking?.filtros_vista?.sin_usar_cantidad || 0} filtros</span>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                    {bimData.codechecking?.filtros_vista?.sin_usar_nombres?.map((name, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                        <span className="font-bold text-fallo-600">{name}</span>
                        <span className="text-mini font-mono text-fallo-500">sin usar</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-etiqueta pt-1">
                  <span className="text-slate-400">estado</span>
                  <span className="font-bold text-ok-600">todos en uso</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ==================== 7. OPCIONES DE DISEÑO ==================== */}
        {(() => {
          const designOptions = extractProjectDesignOptions(bimData);
          const rawCount = bimData.codechecking?.opciones_diseno?.cantidad || 0;
          const totalOptions = designOptions.length > 0 ? designOptions.length : rawCount;
          const hasOptions = totalOptions > 0 || (bimData.codechecking?.opciones_diseno?.existen ?? false);
          const isAuditBueno = audit?.results.opcionesDiseno?.status === 'BUENO' || !hasOptions;

          return (
            <Card 
              title="7. Opciones de diseño" 
              subtitle={<span>Total: <strong className={hasOptions ? "text-fallo-600" : "text-zinc-800"}>{totalOptions}</strong></span>} 
              auditResult={showAudit ? audit?.results.opcionesDiseno : undefined} 
              className="shadow-2xs" 
              detailStyle={!showAudit}
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-etiqueta font-bold text-slate-400">cantidad detectada</span>
                <span className={`text-dato font-black ${hasOptions ? 'text-fallo-500' : 'text-ok-500'}`}>
                  {totalOptions}
                </span>
              </div>

              {!showAudit ? (
                hasOptions ? (
                  <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                    {designOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                        <span className="font-bold text-fallo-600 truncate mr-2">{opt.nombre}</span>
                        <span className="font-mono text-slate-600 text-etiqueta font-semibold shrink-0">
                          {opt.cantidad.toLocaleString('es-ES')} elem.
                        </span>
                      </div>
                    ))}
                    {designOptions.length === 0 && bimData.codechecking?.opciones_diseno?.listado?.map((opt: any, i: number) => {
                      const optName = typeof opt === 'string' ? opt : (opt?.nombre || opt?.opcion || 'Opción');
                      return (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                          <span className="font-bold text-fallo-600 truncate mr-2">{optName}</span>
                          <span className="font-mono text-slate-600 text-etiqueta font-semibold shrink-0">
                            0 elem.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-etiqueta pt-1">
                    <span className="text-slate-400">estado</span>
                    <span className="font-bold text-ok-600">sin opciones activas</span>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-etiqueta border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">estado</span>
                    <span className={`font-bold ${isAuditBueno ? 'text-ok-600' : 'text-fallo-600'}`}>
                      {isAuditBueno ? 'conforme (sin opciones activas)' : `revisar (${totalOptions} opciones detectadas)`}
                    </span>
                  </div>
                  {hasOptions ? (
                    <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                      {designOptions.map((opt, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                          <span className="font-bold text-fallo-600 truncate mr-2">{opt.nombre}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-slate-600 text-etiqueta font-semibold">
                              {opt.cantidad.toLocaleString('es-ES')} elem.
                            </span>
                            <span className="text-mini font-mono font-bold text-fallo-600">
                              revisar
                            </span>
                          </div>
                        </div>
                      ))}
                      {designOptions.length === 0 && bimData.codechecking?.opciones_diseno?.listado?.map((opt: any, i: number) => {
                        const optName = typeof opt === 'string' ? opt : (opt?.nombre || opt?.opcion || 'Opción');
                        return (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                            <span className="font-bold text-fallo-600 truncate mr-2">{optName}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-slate-600 text-etiqueta font-semibold">
                                0 elem.
                              </span>
                              <span className="text-mini font-mono font-bold text-fallo-600">
                                revisar
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-1 text-xs text-slate-500">
                      No hay opciones de diseño en el modelo.
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })()}

        {/* ==================== 8. FASES ==================== */}
        {(() => {
          const phases = extractProjectPhases(bimData);
          const phasesWithElements = phases.filter(p => p.cantidad > 0);
          const isAuditBueno = audit?.results.fases?.status === 'BUENO';

          return (
            <Card 
              title="8. Fases" 
              subtitle={<span>Total: <strong className="text-zinc-800">{phases.length}</strong></span>} 
              auditResult={showAudit ? audit?.results.fases : undefined} 
              className="shadow-2xs" 
              detailStyle={!showAudit}
            >
              {!showAudit ? (
                <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1.5 custom-scrollbar">
                  {phases.map((phase, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                      <span className="font-bold text-slate-700">{phase.nombre}</span>
                      <span className="font-mono text-slate-600 text-etiqueta font-semibold">
                        {phase.cantidad.toLocaleString('es-ES')} elem.
                      </span>
                    </div>
                  ))}
                  {phases.length === 0 && (
                    <div className="py-2 text-center text-xs text-slate-400">
                      No se encontraron fases en el modelo
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-etiqueta border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">estado</span>
                    <span className={`font-bold ${isAuditBueno ? 'text-ok-600' : 'text-fallo-600'}`}>
                      {isAuditBueno ? 'conforme (elementos en una sola fase)' : `revisar (${phasesWithElements.length} fases con elementos)`}
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1.5 custom-scrollbar">
                    {phases.map((phase, i: number) => {
                      const hasConflict = phasesWithElements.length > 1 && phase.cantidad > 0;
                      return (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                          <span className={`font-bold ${hasConflict ? 'text-fallo-600' : 'text-slate-700'}`}>
                            {phase.nombre}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-600 text-etiqueta font-semibold">
                              {phase.cantidad.toLocaleString('es-ES')} elem.
                            </span>
                            <span className={`text-mini font-mono font-bold ${hasConflict ? 'text-fallo-600' : 'text-ok-600'}`}>
                              {hasConflict ? 'revisar' : 'ok'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {phases.length === 0 && (
                      <div className="py-2 text-center text-xs text-slate-400">
                        No se encontraron fases en el modelo
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })()}

        {/* ==================== 9. NIVELES ==================== */}
        <Card title="9. Niveles" subtitle={<span>Total: <strong className="text-zinc-800">{bimData.codechecking?.niveles?.listado?.length || 0}</strong></span>} auditResult={showAudit ? audit?.results.niveles : undefined} className="shadow-2xs" detailStyle={!showAudit}>
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-etiqueta font-bold text-slate-400">total</span>
            <span className="text-dato font-black text-slate-700">{bimData.codechecking?.niveles?.listado?.length || 0}</span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
            {bimData.codechecking?.niveles?.listado?.slice().sort((a,b) => b.elevacion_m - a.elevacion_m).map((level, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-dato">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">{level.nombre}</span>
                  {level.es_nivel_edificio && (
                    <span className="text-micro font-bold text-slate-400">edificio</span>
                  )}
                  {level.es_estructura && (
                    <span className="text-micro font-bold text-slate-400">estructura</span>
                  )}
                </div>
                <span className="font-mono text-slate-500 text-etiqueta">
                  {level.elevacion_m > 0 ? `+${level.elevacion_m.toFixed(2)}` : level.elevacion_m.toFixed(2)} m
                </span>
              </div>
            ))}
          </div>
          {showAudit && (audit?.results.niveles as any)?.groupedErrors && (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-dato max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
              {(audit?.results.niveles as any).groupedErrors.missing?.map((name: string, i: number) => (
                <div key={`miss-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-fallo-600">{name}</span>
                  <span className="text-mini font-mono text-fallo-500">falta nivel</span>
                </div>
              ))}
              {(audit?.results.niveles as any).groupedErrors.elevation?.map((detail: string, i: number) => (
                <div key={`elev-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-fallo-600">{detail}</span>
                  <span className="text-mini font-mono text-fallo-500">cota incorrecta</span>
                </div>
              ))}
              {(audit?.results.niveles as any).groupedErrors.structure?.map((name: string, i: number) => (
                <div key={`struct-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-fallo-600">{name}</span>
                  <span className="text-mini font-mono text-fallo-500">marcar estructura</span>
                </div>
              ))}
              {(audit?.results.niveles as any).groupedErrors.building?.map((name: string, i: number) => (
                <div key={`bld-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-fallo-600">{name}</span>
                  <span className="text-mini font-mono text-fallo-500">marcar edificio</span>
                </div>
              ))}
              {(audit?.results.niveles as any).groupedErrors.noInfo?.map((name: string, i: number) => (
                <div key={`noinfo-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-600">{name}</span>
                  <span className="text-mini font-mono text-slate-400">sin info pineado</span>
                </div>
              ))}
              {(audit?.results.niveles as any).groupedErrors.unpinned?.map((name: string, i: number) => (
                <div key={`unpinned-${i}`} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-alerta-600 font-bold">{name}</span>
                  <span className="text-mini font-mono text-alerta-500">no pineado</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ==================== 10. REJILLAS ==================== */}
        <Card 
          title="10. Rejillas"
          subtitle={<span>Total: <strong className="text-zinc-800">{bimData.codechecking?.rejillas?.cantidad || 0}</strong></span>}
          auditResult={showAudit ? audit?.results.rejillas : undefined}
          className="shadow-2xs cursor-pointer hover:border-slate-300 transition-all"
          detailStyle={!showAudit}
          onClick={() => onOpenGridsModal(bimData.codechecking?.rejillas?.listado?.map(g => g.nombre) || [])}
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-etiqueta font-bold text-slate-400">total</span>
              <span className="text-dato font-black text-slate-700">{bimData.codechecking?.rejillas?.cantidad || 0}</span>
            </div>
            
            <div className="border-b border-slate-50 pb-2">
              <span className="text-etiqueta font-bold text-slate-400 block mb-1">
                tipos únicos ({Array.from(new Set(bimData.codechecking?.rejillas?.listado?.map(g => g.tipo_curva) || [])).length})
              </span>
              <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1.5 custom-scrollbar">
                {Array.from(new Set(bimData.codechecking?.rejillas?.listado?.map(g => g.tipo_curva) || [])).map((type, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 text-dato">
                    <span className="font-bold text-slate-700">{type}</span>
                    <span className="text-mini font-mono text-slate-400">tipo</span>
                  </div>
                ))}
              </div>
            </div>

            {showAudit && (
              <div className="space-y-1 pt-1 text-dato">
                {(audit?.results.rejillas as any)?.unpinnedGrids?.length > 0 && (
                  <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1.5 custom-scrollbar">
                    {(audit?.results.rejillas as any).unpinnedGrids.map((name: string, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                        <span className="font-bold text-fallo-600">{name}</span>
                        <span className="text-mini font-mono text-fallo-500">sin pinear</span>
                      </div>
                    ))}
                  </div>
                )}
                {(audit?.results.rejillas as any)?.noInfoGrids?.length > 0 && (
                  <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1.5 custom-scrollbar">
                    {(audit?.results.rejillas as any).noInfoGrids.map((name: string, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                        <span className="text-slate-600">{name}</span>
                        <span className="text-mini font-mono text-slate-400">sin info pineado</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center text-etiqueta pt-1">
                  <span className="text-slate-400">estado</span>
                  <span className={`font-bold ${
                    audit?.results.rejillas?.status === 'FALLO' 
                      ? 'text-fallo-600' 
                      : audit?.results.rejillas?.status === 'ALERTA' 
                        ? 'text-alerta-600' 
                        : 'text-ok-600'
                  }`}>
                    {audit?.results.rejillas?.status === 'FALLO'
                      ? 'exceso de tipos / sin pinear'
                      : audit?.results.rejillas?.status === 'ALERTA'
                        ? 'cercano al límite'
                        : 'conforme'}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-1 text-center">
              <span className="text-mini font-mono text-slate-400">clic para ver listado completo</span>
            </div>
          </div>
        </Card>
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
