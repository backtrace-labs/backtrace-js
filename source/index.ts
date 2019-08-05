import { BacktraceClient } from '@src/backtraceClient';
import * as btReport from '@src/model/backtraceReport';
import { BacktraceResult } from '@src/model/backtraceResult';
import { BacktraceClientOptions, IBacktraceClientOptions } from './model/backtraceClientOptions';
export { IBacktraceData } from '@src/model/backtraceData';

export const pageStartTime = new Date();

let backtraceClient: BacktraceClient;

export { BacktraceClient } from '@src/backtraceClient';
export { BacktraceReport as BtReport } from '@src/model/backtraceReport';
export { BacktraceClientOptions, IBacktraceClientOptions } from '@src/model/backtraceClientOptions';
/**
 * Initalize Backtrace Client and Backtrace node integration
 * @param configuration Bcktrace configuration
 */
export function initialize(configuration: BacktraceClientOptions | IBacktraceClientOptions): BacktraceClient {
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
