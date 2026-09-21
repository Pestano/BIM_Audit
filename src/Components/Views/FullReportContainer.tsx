import React from 'react';
import { ProjectFile, AuditConfig } from '../../types';
import { DashboardView } from './DashboardView';
import { ensureFileMetadata } from '../../utils/modelUtils';

interface FullReportContainerProps {
  files: ProjectFile[];
  auditConfig?: AuditConfig;
}

export const FullReportContainer: React.FC<FullReportContainerProps> = ({ files, auditConfig }) => {
  const processedFiles = files.map(ensureFileMetadata);

  return (
    <div id="full-report-content" className="p-8 bg-[#FAFAFA]">
      <h1 className="text-3xl font-black mb-8">Reporte Completo de Auditoría</h1>
      {processedFiles.map(file => (
        <div key={file.id} className="mb-12 border-b-2 border-slate-200 pb-8">
          <h2 className="text-xl font-bold mb-4">{file.customName || file.name} ({file.modelType})</h2>
          <DashboardView
            bimData={file.data}
            auditConfig={auditConfig}
            activeFile={file}
            onOpenWarningModal={() => {}}
            onOpenGridsModal={() => {}}
            showAudit={true}
          />
        </div>
      ))}
    </div>
  );
};
