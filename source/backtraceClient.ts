import { BacktraceApi } from '@src/backtraceApi';
import { ClientRateLimit } from '@src/clientRateLimit';
import { BacktraceClientOptions, IBacktraceClientOptions } from '@src/model/backtraceClientOptions';
import { BacktraceReport } from '@src/model/backtraceReport';
import { BacktraceResult } from '@src/model/backtraceResult';
import { BacktraceBreadcrumbs } from './model/backtraceBreadcrumbs';
/**
 * Backtrace client
 */
export class BacktraceClient {
  public options: BacktraceClientOptions;
  public breadcrumbs: BacktraceBreadcrumbs = new BacktraceBreadcrumbs(10);

  private _backtraceApi: BacktraceApi;
  private _clientRateLimit: ClientRateLimit;

  constructor(clientOptions: IBacktraceClientOptions | BacktraceClientOptions) {
    if (!clientOptions.endpoint) {
      throw new Error(`Backtrace: missing 'endpoint' option.`);
    }
    this.options = {
      ...new BacktraceClientOptions(),
      ...clientOptions,
    } as BacktraceClientOptions;
    this._backtraceApi = new BacktraceApi(this.getSubmitUrl(), this.options.timeout);
    this._clientRateLimit = new ClientRateLimit(this.options.rateLimit);
    this.registerHandlers();
  }

  /**
   * Memorize selected values from application.
   * Memorized attributes will be available in your next Backtrace report.
   * Memorized attributes will be only available for one report.
   * @param key attribute key
   * @param value attribute value
   */
  public memorize(key: string, value: any): void {
    (this.options.userAttributes as any)[key] = value;
  }

  public createReport(payload: Error | string, reportAttributes: object | undefined = {}): BacktraceReport {
    // this.emit('new-report', payload, reportAttributes);
    const attributes = this.combineClientAttributes(reportAttributes);
    const report = new BacktraceReport(payload, attributes);
    report.send = (callback) => {
      this.sendAsync(report)
        .then(() => {
          if (callback) {
            callback(undefined);
          }
        })
        .catch((e) => {
          if (callback) {
            callback(e);
          }
        });
    };
    report.sendSync = (callback) => {
      this.sendReport(report, callback);
    };

    report.setSourceCodeOptions(this.options.tabWidth, this.options.contextLineCount);

    return report;
  }
  /**
   * Send report asynchronously to Backtrace
   * @param payload report payload
   * @param reportAttributes attributes
   */
  public async reportAsync(
    payload: Error | string,
    reportAttributes: object | undefined = {},
  ): Promise<BacktraceResult> {
    const report = this.createReport(payload, reportAttributes);
    return new Promise<BacktraceResult>((res, rej) => {
      this.sendReport(report, (err?: Error, response?: BacktraceResult) => {
        if (err || !response) {
          rej(err);
          return;
        }
        res(response);
      });
    });
  }

  /**
   * Send report synchronosuly to Backtrace
   * @param payload report payload - error or string
   * @param reportAttributes attributes
   */
  public reportSync(payload: Error | string, reportAttributes: object | undefined = {}): BacktraceResult {
    const report = this.createReport(payload, reportAttributes);
    return this.sendReport(report);
  }

  public sendReport(report: BacktraceReport, callback?: (err?: Error, res?: BacktraceResult) => void): BacktraceResult {
    if (!report.uuid) {
      throw new Error('Invalid backtrace report object. Please pass an instance of the Backtrace report object.');
    }
    if (this.options.filter && this.options.filter(report)) {
      return BacktraceResult.OnFilterHit(report);
    }
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }

    report.sourceCode = this.breadcrumbs.toSourceCode();
    this._backtraceApi
      .send(report)
      .then((result) => {
        if (callback) {
          callback(result.Error, result);
        }
      })
      .catch((err) => {
        if (callback) {
          callback(err);
        }
      });

    return BacktraceResult.Processing(report);
  }

  public async sendAsync(report: BacktraceReport): Promise<BacktraceResult> {
    if (this.options.filter && this.options.filter(report)) {
      return BacktraceResult.OnFilterHit(report);
    }
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }
    return await this._backtraceApi.send(report);
  }

  private testClientLimits(report: BacktraceReport): BacktraceResult | undefined {
    if (this.samplingHit()) {
      return BacktraceResult.OnSamplingHit(report);
    }

    const limitReach = this._clientRateLimit.skipReport(report);
    if (limitReach) {
      return BacktraceResult.OnLimitReached(report);
    }
    return undefined;
  }

  private samplingHit(): boolean {
    return !!this.options.sampling && Math.random() > this.options.sampling;
  }

  private getSubmitUrl(): string {
    const url = this.options.endpoint;
    if (url.includes('submit.backtrace.io') || url.includes('token=')) {
      return url;
    }

    if (!this.options.token) {
      throw new Error('Token is required if Backtrace-js have to build url to Backtrace');
    }
    const uriSeparator = url.endsWith('/') ? '' : '/';
    return `${this.options.endpoint}${uriSeparator}post?format=json&token=${this.options.token}`;
  }

  private combineClientAttributes(attributes: object = {}): object {
    if (!attributes) {
      attributes = {};
    }
    return {
      ...attributes,
      ...this.options.userAttributes,
    };
  }

  private registerHandlers(): void {
    if (!this.options.disableGlobalHandler) {
      this.registerGlobalHandler();
    }
    if (this.options.handlePromises) {
      this.registerPromiseHandler();
    }
  }

  private registerPromiseHandler(): void {
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const err = new Error(event.reason);
      const report = this.createReport(err);
      report.addAnnotation('onunhandledrejection', event);

      this.sendReport(report);
    };
  }

  private registerGlobalHandler(): void {
    window.onerror = (msg: string | Event, url, lineNumber, columnNumber, error) => {
      if (!error) {
        if (typeof msg === 'string') {
          error = new Error(msg);
        } else {
          error = new Error((msg as ErrorEvent).error);
        }
      }

      this.reportSync(error, {
        'exception.lineNumber': lineNumber,
        'exception.columnNumber': columnNumber,
      });
    };
  }
}
