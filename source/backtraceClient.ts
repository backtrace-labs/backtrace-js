import { BacktraceApi } from '@src/backtraceApi';
import { ClientRateLimit } from '@src/clientRateLimit';
import { BacktraceClientOptions, IBacktraceClientOptions } from '@src/model/backtraceClientOptions';
import { IBacktraceData } from '@src/model/backtraceData';
import { BacktraceReport } from '@src/model/backtraceReport';
import { BacktraceResult } from '@src/model/backtraceResult';
import { EventEmitter } from 'events';
/**
 * Backtrace client
 */
export class BacktraceClient extends EventEmitter {
  public options: BacktraceClientOptions;
  private _backtraceApi: BacktraceApi;
  private _clientRateLimit: ClientRateLimit;

  constructor(clientOptions: IBacktraceClientOptions | BacktraceClientOptions) {
    super();
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
    this.emit('new-report', payload, reportAttributes);
    const attributes = this.combineClientAttributes(reportAttributes);
    const report = new BacktraceReport(payload, attributes);
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
    this.emit('before-send', report);
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }
    const result = await this._backtraceApi.send(report);
    this.emit('after-send', report, result);
    return result;
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

  public sendReport(report: BacktraceReport, callback?: (err?: Error) => void): BacktraceResult {
    if (this.options.filter && this.options.filter(report)) {
      return BacktraceResult.OnFilterHit(report);
    }
    this.emit('before-send', report);
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }
    this._backtraceApi
      .send(report)
      .then((result) => {
        if (callback) {
          callback(result.Error);
        }
        this.emit('after-send', report, result);
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
    this.emit('before-send', report);
    const limitResult = this.testClientLimits(report);
    if (limitResult) {
      return limitResult;
    }
    return await this._backtraceApi.send(report);
  }

  private testClientLimits(report: BacktraceReport): BacktraceResult | undefined {
    if (this.samplingHit()) {
      this.emit('sampling-hit', report);
      return BacktraceResult.OnSamplingHit(report);
    }

    const limitReach = this._clientRateLimit.skipReport(report);
    if (limitReach) {
      this.emit('rate-limit', report);
      return BacktraceResult.OnLimitReached(report);
    }
    return undefined;
  }

  private samplingHit(): boolean {
    return !!this.options.sampling && Math.random() > this.options.sampling;
  }

  private getSubmitUrl(): string {
    const url = this.options.endpoint;
    if (url.includes('submit.backtrace.io')) {
      return url;
    }

    if (!this.options.token) {
      throw new Error('Token is required if Backtrace-node have to build url to Backtrace');
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
    this._backtraceApi.on('before-data-send', (report: BacktraceReport, json: IBacktraceData) => {
      this.emit('before-data-send', report, json);
    });

    if (!this.options.disableGlobalHandler) {
      this.registerGlobalHandler();
    }
    if (this.options.handlePromises) {
      this.registerPromiseHandler();
    }
  }

  private registerPromiseHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.emit('unhandledRejection', event, false);
      const err = new Error(event.reason);
      this.reportAsync(err, undefined);
    });
  }

  private registerGlobalHandler(): void {
    window.addEventListener('error', (event) => {
      this.emit('error', event);
      if (event.error) {
        this.reportSync(event.error);
      } else {
        const err = new Error(event.error);
        this.reportSync(err);
      }
    });
  }
}
