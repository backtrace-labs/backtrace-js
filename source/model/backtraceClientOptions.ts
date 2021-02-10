import { BacktraceReport } from '../model/backtraceReport';

export class BacktraceClientOptions {
  public timeout: number = 15000;
  public endpoint!: string;
  public token?: string;
  public userAttributes: object | { [index: string]: any } = {};

  public ignoreSslCert: boolean = false;

  public disableGlobalHandler: boolean = false;
  public handlePromises: boolean = false;

  public sampling?: number | undefined = undefined;
  public rateLimit: number = 0;
  public filter?: (report: BacktraceReport) => boolean = undefined;

  public breadcrumbLimit?: number = -1;

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
