/**
 * Lee un archivo File y lo decodifica intentando UTF-8 primero, 
 * y cayendo a ISO-8859-1 (Latin-1) si falla, para manejar acentos 
 * correctamente en archivos exportados desde entornos Windows.
 */
export const readJsonFile = async (file: File): Promise<any> => {
  const buffer = await file.arrayBuffer();
  let text: string;

  try {
    // Intentamos decodificar como UTF-8 (estándar moderno)
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    text = utf8Decoder.decode(buffer);
  } catch (e) {
    // Si falla (probablemente por acentos en formato Windows/Latin-1),
    // probamos con ISO-8859-1 que es común en exportaciones de Revit/Windows en español.
    const latin1Decoder = new TextDecoder('iso-8859-1');
    text = latin1Decoder.decode(buffer);
  }

  return JSON.parse(text);
};

/**
 * Detecta automáticamente si el JSON importado corresponde a la 
 * Fase 2 (Documentación y Elementos) o a la Fase 1 (Configuración Inicial).
 */
export const detectAuditPhase = (jsonContent: any): 'DocumentacionYElementos' | 'ConfiguracionInicial' => {
  if (
    jsonContent?.fase_auditoria === 'DocumentacionYElementos' ||
    jsonContent?.codechecking?.vistas !== undefined
  ) {
    return 'DocumentacionYElementos';
  }
  return 'ConfiguracionInicial';
};