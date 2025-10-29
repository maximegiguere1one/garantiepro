let jsPDFModule: any = null;
let autoTableModule: any = null;
let initializationPromise: Promise<void> | null = null;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 200;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForAutoTablePlugin(jsPDFInstance: any, retries = 0): Promise<boolean> {
  if (typeof jsPDFInstance.API?.autoTable === 'function') {
    console.log('[pdf-lazy-loader] autoTable plugin verified on jsPDF.API');
    return true;
  }

  if (retries >= MAX_RETRIES) {
    console.error('[pdf-lazy-loader] autoTable plugin not available after max retries');
    console.error('[pdf-lazy-loader] jsPDF.API keys:', Object.keys(jsPDFInstance.API || {}));
    return false;
  }

  console.log(`[pdf-lazy-loader] Waiting for autoTable plugin... (attempt ${retries + 1}/${MAX_RETRIES})`);
  await sleep(RETRY_DELAY_MS);
  return waitForAutoTablePlugin(jsPDFInstance, retries + 1);
}

export const loadJsPDF = async () => {
  if (!jsPDFModule) {
    console.log('[pdf-lazy-loader] Loading jsPDF module...');
    const module = await import('jspdf');
    jsPDFModule = module.default;

    if (!(globalThis as any).jspdf) {
      (globalThis as any).jspdf = { jsPDF: jsPDFModule };
      console.log('[pdf-lazy-loader] Set jsPDF on globalThis for plugin compatibility');
    }

    console.log('[pdf-lazy-loader] jsPDF module loaded successfully');
    console.log('[pdf-lazy-loader] jsPDF.API available:', !!jsPDFModule.API);
  }
  return jsPDFModule;
};

export const loadAutoTable = async () => {
  if (!autoTableModule) {
    console.log('[pdf-lazy-loader] Loading jspdf-autotable module...');

    autoTableModule = await import('jspdf-autotable');

    console.log('[pdf-lazy-loader] jspdf-autotable module loaded successfully');
    console.log('[pdf-lazy-loader] autoTable module type:', typeof autoTableModule);
    console.log('[pdf-lazy-loader] autoTable module properties:', Object.keys(autoTableModule || {}));
    console.log('[pdf-lazy-loader] autoTable default export:', typeof autoTableModule.default);
  }
  return autoTableModule;
};

export const loadPDFLibraries = async () => {
  if (initializationPromise) {
    console.log('[pdf-lazy-loader] Waiting for existing initialization to complete...');
    await initializationPromise;
    return { jsPDF: jsPDFModule, autoTable: autoTableModule };
  }

  initializationPromise = (async () => {
    try {
      console.log('[pdf-lazy-loader] ==========================================');
      console.log('[pdf-lazy-loader] Starting PDF libraries initialization...');
      console.log('[pdf-lazy-loader] ==========================================');

      const jsPDF = await loadJsPDF();

      console.log('[pdf-lazy-loader] Loading jspdf-autotable...');
      await loadAutoTable();

      console.log('[pdf-lazy-loader] Waiting for plugin to attach (200ms)...');
      await sleep(200);

      console.log('[pdf-lazy-loader] Checking if autoTable is attached to jsPDF.API...');
      const pluginAvailable = await waitForAutoTablePlugin(jsPDF);

      if (!pluginAvailable) {
        console.error('[pdf-lazy-loader] CRITICAL: autoTable plugin failed to attach');
        console.error('[pdf-lazy-loader] Attempting manual attachment...');

        try {
          if (autoTableModule && typeof autoTableModule.default === 'function') {
            console.log('[pdf-lazy-loader] Found autoTable.default function, attempting to call it');
            autoTableModule.default(jsPDF);
            await sleep(100);

            if (typeof jsPDF.API?.autoTable === 'function') {
              console.log('[pdf-lazy-loader] Manual attachment successful!');
            } else {
              throw new Error('Manual attachment failed - autoTable still not on jsPDF.API');
            }
          } else {
            throw new Error('autoTable.default is not a function');
          }
        } catch (manualError) {
          console.error('[pdf-lazy-loader] Manual attachment failed:', manualError);
          throw new Error('jspdf-autotable plugin failed to attach to jsPDF.API after all attempts');
        }
      }

      console.log('[pdf-lazy-loader] Creating test document to verify autoTable...');
      const testDoc = new jsPDF();

      if (typeof (testDoc as any).autoTable !== 'function') {
        console.error('[pdf-lazy-loader] CRITICAL: autoTable is not available on jsPDF instance');
        console.error('[pdf-lazy-loader] testDoc keys:', Object.keys(testDoc));
        console.error('[pdf-lazy-loader] testDoc.autoTable type:', typeof (testDoc as any).autoTable);
        throw new Error('autoTable method not available on jsPDF instance');
      }

      console.log('[pdf-lazy-loader] ==========================================');
      console.log('[pdf-lazy-loader] ✓ PDF libraries initialization completed');
      console.log('[pdf-lazy-loader] ✓ autoTable is callable on instances');
      console.log('[pdf-lazy-loader] ==========================================');
    } catch (error) {
      console.error('[pdf-lazy-loader] ==========================================');
      console.error('[pdf-lazy-loader] ✗ CRITICAL ERROR during initialization');
      console.error('[pdf-lazy-loader] Error:', error);
      console.error('[pdf-lazy-loader] ==========================================');
      initializationPromise = null;
      jsPDFModule = null;
      autoTableModule = null;
      throw error;
    }
  })();

  await initializationPromise;
  return { jsPDF: jsPDFModule, autoTable: autoTableModule };
};

export const isPDFLibraryLoaded = () => {
  if (!jsPDFModule || !autoTableModule) {
    return false;
  }

  try {
    const testDoc = new jsPDFModule();
    return typeof (testDoc as any).autoTable === 'function';
  } catch {
    return false;
  }
};

export const verifyAutoTableAvailable = () => {
  if (!jsPDFModule) {
    throw new Error('jsPDF not loaded. Call loadPDFLibraries() first.');
  }

  if (typeof jsPDFModule.API?.autoTable !== 'function') {
    throw new Error('autoTable plugin not attached to jsPDF.API');
  }

  const testDoc = new jsPDFModule();
  if (typeof (testDoc as any).autoTable !== 'function') {
    throw new Error('autoTable method not available on jsPDF instances');
  }

  console.log('[pdf-lazy-loader] autoTable verification passed');
  return true;
};
