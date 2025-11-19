// Add this to the very top of the first file loaded in your app
// Jangan jalankan APM saat testing
const apm = process.env.NODE_ENV === 'testing' 
  ? null 
  : require('elastic-apm-node').start({
      serviceName: 'be-app-management',
      apiKey: process.env.APM_API_KEY || '',
      serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200',
      environment: process.env.NODE_ENV || 'development',
      logLevel: 'info',
      captureBody: 'all', // Capture request/response body
      captureHeaders: true, // Capture headers
      captureExceptions: true,
      captureSpanStackTraces: true,
      transactionSampleRate: 1.0, // 100% sampling
      errorSampleRate: 1.0, // 100% error sampling
    });

export { apm };