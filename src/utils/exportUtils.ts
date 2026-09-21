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
