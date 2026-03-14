let initialized = false
let initPromise: Promise<void> | null = null

export async function initCornerstoneOnce(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      console.log('CS Step 1: import core')
      const cs = await import('@cornerstonejs/core')

      console.log('CS Step 2: import tools')
      const csTools = await import('@cornerstonejs/tools')

      console.log('CS Step 4: import dicom image loader')
      type LoaderModule = {
        wadouri?: { loadImage?: unknown }
        wadors?: { loadImage?: unknown }
        init?: (opts: unknown) => Promise<void> | void
        external?: unknown
        default?: {
          wadouri?: { loadImage?: unknown }
          wadors?: { loadImage?: unknown }
          init?: (opts: unknown) => Promise<void> | void
          external?: unknown
        }
        [key: string]: unknown
      }
      const loaderModule = await import('@cornerstonejs/dicom-image-loader') as LoaderModule
      
      console.log('CS Step 5: log all exports of loader module:')
      console.log('loaderModule keys:', Object.keys(loaderModule))
      console.log('loaderModule.default:', loaderModule.default)
      console.log('loaderModule.external:', loaderModule.external)
      console.log('loaderModule.default?.external:', loaderModule.default?.external)

      console.log('CS Step 6: init core first')
      await cs.init()

      console.log('CS Step 7: init tools')
      await csTools.init()

      console.log('CS Step 8: register image loaders using cs.imageLoader')
      console.log('cs.imageLoader:', cs.imageLoader)
      console.log('loaderModule.wadouri:', loaderModule.wadouri)
      console.log('loaderModule.default?.wadouri:', loaderModule.default?.wadouri)

      const loader = loaderModule
      const wadouri = loader.wadouri ?? loader.default?.wadouri
      const wadors = loader.wadors ?? loader.default?.wadors

      if (typeof wadouri?.loadImage === 'function') {
        const registerImageLoader = cs.imageLoader.registerImageLoader as unknown as (
          scheme: string,
          loader: unknown
        ) => void
        registerImageLoader('wadouri', wadouri.loadImage)
        console.log('wadouri loader registered ✓')
      } else {
        console.error('wadouri.loadImage not found in module')
      }

      if (typeof wadors?.loadImage === 'function') {
        const registerImageLoader = cs.imageLoader.registerImageLoader as unknown as (
          scheme: string,
          loader: unknown
        ) => void
        registerImageLoader('wadors', wadors.loadImage)
        console.log('wadors loader registered ✓')
      }

      console.log('CS Step 9: init web worker loader (if available)')
      const loaderInit = loaderModule.init ?? loaderModule.default?.init
      if (loaderInit) {
        await loaderInit({
          maxWebWorkers: 1,
          startWebWorkersOnDemand: true,
          webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.min.js',
          taskConfiguration: {
            decodeTask: {
              initializeCodecsOnStartup: true,
              usePDFJS: false,
              strict: false,
            },
          },
        })
        console.log('web worker loader initialized ✓')
      } else {
        console.warn('loader.init not found; skipping web worker setup')
      }

      initialized = true
      console.log('CS Init COMPLETE ✓')
    } catch (err) {
      initPromise = null
      initialized = false
      console.error('CS Init FAILED:', err)
      throw err
    }
  })()

  return initPromise
}
