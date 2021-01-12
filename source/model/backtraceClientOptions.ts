import { BacktraceReport } from './backtraceReport';

export class BacktraceClientOptions {
  public timeout: number = 15000;
  public endpoint!: string;
  public token?: string;
  public userAttributes: object = {};

  public disableGlobalHandler: boolean = false;
  public handlePromises: boolean = false;

  public sampling: number | undefined = undefined;
  public rateLimit: number = 0;
  public filter?: (report: BacktraceReport) => boolean = undefined;

  /**
   * @deprecated
   * Please don't use this option anymore
   */
  public debugBacktrace?: boolean = false;
  /**
   * @deprecated
   * Please don't use this option anymore
   */
  public tabWidth: number = 8;
  /**
   * @deprecated
   * Please don't use this option anymore
   */
  public contextLineCount: number = 200;
}

export interface IBacktraceClientOptions {
  /**
   * @deprecated
   * Please don't use this option anymore
   */
  debugBacktrace?: boolean;
  timeout?: number;
  endpoint: string;
  token?: string;
  userAttributes?: object;
  disableGlobalHandler?: boolean;
  handlePromises?: boolean;
  /**
   * @deprecated
   * Please don't use this option anymore
   */
  tabWidth?: number;
  /**
   * @deprecated
   * Please don't use this option anymore
   */
  contextLineCount?: number;
  sampling?: number | undefined;
  rateLimit?: number;
  filter?: (report: BacktraceReport) => boolean;
}
