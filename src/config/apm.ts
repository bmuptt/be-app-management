const shouldStartApm =
  process.env.NODE_ENV !== 'testing' && process.env.APP_APM_ACTIVE === 'true';

const apm = shouldStartApm
  ? require('elastic-apm-node').start({
      serviceName: 'be-app-management',
      apiKey: process.env.APM_API_KEY || '',
      serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200',
      environment: process.env.NODE_ENV || 'development',
      logLevel: 'info',
      captureBody: 'all',
      captureHeaders: true,
      captureExceptions: true,
      captureSpanStackTraces: true,
      transactionSampleRate: 1.0,
      errorSampleRate: 1.0,
    })
  : null;

export { apm };
