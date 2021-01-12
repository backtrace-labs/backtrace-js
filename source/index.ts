import { BacktraceClient } from '@src/backtraceClient';
import * as btReport from '@src/model/backtraceReport';
import { BacktraceResult } from '@src/model/backtraceResult';
import { LogType } from './model/backtraceBreadcrumbs';
import { BacktraceClientOptions } from './model/backtraceClientOptions';

export { BacktraceClient } from '@src/backtraceClient';
export { LogType } from '@src/model/backtraceBreadcrumbs';
export { BacktraceClientOptions } from '@src/model/backtraceClientOptions';
export { BacktraceReport as BtReport } from '@src/model/backtraceReport';

export const pageStartTime = new Date();

let backtraceClient: BacktraceClient;

/**
 * Initalize Backtrace Client and Backtrace node integration
 * @param configuration Bcktrace configuration
 */
export function initialize(configuration: BacktraceClientOptions): BacktraceClient {
  backtraceClient = new BacktraceClient(configuration);
  return backtraceClient;
}

/**
 * Returns used BacktraceClient
 */
export function getBacktraceClient() {
  return backtraceClient;
}

export function use(client: BacktraceClient) {
  backtraceClient = client;
}
/**
 * Send report asynchronously to Backtrace
 * @param arg report payload
 * @param arg2 attributes
 */
export async function report(
  arg: () => void | Error | string | object,
  arg2: object | undefined = {},
): Promise<BacktraceResult> {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  let data: Error | string = '';
  if (arg instanceof Error || typeof arg === 'string') {
    data = arg;
  }
  if (typeof arg === 'object' && arg2 === {}) {
    arg2 = arg;
  }
  const result = await backtraceClient.reportAsync(data, arg2);
  if (arg instanceof Function) {
    arg();
  }
  return result;
}

/**
 * Send report synchronosuly to Backtrace
 * @param error report payload
 * @param reportAttributes attributes
 */
export function reportSync(data: Error | string, attributes: object | undefined = {}): BacktraceResult {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  return backtraceClient.reportSync(data, attributes);
}

/**
 * Generaten BacktraceReport with default configuration
 */
export function createReport(): btReport.BacktraceReport {
  return BacktraceReport();
}

/**
 * Generaten BacktraceReport with default configuration
 */
export function BacktraceReport(): btReport.BacktraceReport {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  const backtraceReport = backtraceClient.createReport('');
  backtraceReport.send = (callback: (err?: Error) => void) => {
    backtraceClient.sendReport(backtraceReport, callback);
  };
  backtraceReport.sendSync = (callback: (err?: Error) => void) => {
    backtraceClient.sendReport(backtraceReport, callback);
  };

  return backtraceReport;
}

export function errorHandlerMiddleware(err: Error, req: any, resp: any, next: any) {
  if (!backtraceClient) {
    throw new Error('Must call initialize method first');
  }
  backtraceClient.reportSync(err, { ...req, ...resp });
  next(err);
}

const tempClient: BacktraceClient = initialize({
  endpoint:
    'https://yolo.sp.backtrace.io:6098/post?format=json&token=533c6e267998b8562e4b878c891bf7fc509beec7839f991bdaa1d43220d0f497',
  handlePromises: true,
} as BacktraceClientOptions);

console.log('Initialized Backtrace');
console.warn('Ready for capturing errors');

tempClient.breadcrumbs.add(LogType.debug, 'Foo');
tempClient.breadcrumbs.add(LogType.error, 'err');
tempClient.breadcrumbs.add(LogType.info, 'info');
tempClient.breadcrumbs.add(LogType.silly, 'silly');
tempClient.breadcrumbs.add(LogType.verbose, 'verbose');
tempClient.breadcrumbs.add(LogType.warn, 'warn');

function innerOperation() {
  (document.getElementById('NotExistingId') as HTMLElement).animate({}, 123);
}

function throwNewException() {
  try {
    innerOperation();
  } catch (error) {
    backtraceClient.reportSync(error);
    backtraceClient.reportAsync(error);
  }
}

async function throwNewUnhandledPromise() {
  // tslint:disable-next-line: no-var-requires
  const axios = require('axios');
  await axios.post('https://definetly.not.existing.page.pl/page', undefined);
}

function throwNewUnhandledException() {
  innerOperation();
}

// throwNewException();
setTimeout(throwNewUnhandledPromise, 5000);
setTimeout(() => {
  Promise.resolve('resolved promise').then(() => {
    throw new Error('Something went wrong!');
  });
}, 3000);

throwNewUnhandledPromise();
// throwNewUnhandledException();
