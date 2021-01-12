export enum LogType {
  error,
  warn,
  info,
  verbose,
  debug,
  silly,
}

export class BacktraceBreadcrumbs {
  private readonly _breadcrumbs: string[] = [];
  constructor(private readonly _maximumNumberOfLogs: number) {}

  public add(type: LogType | string, message: string) {
    // breadcrumbs are disabled
    if (this._maximumNumberOfLogs === -1) {
      return;
    }
    // validate maximum number of breadcrumbs stored in memory
    // and clean the oldest breadcrumb
    while (this._maximumNumberOfLogs > 0 && this._breadcrumbs.length > this._maximumNumberOfLogs + 1) {
      this._breadcrumbs.shift();
    }

    if (typeof type !== 'string') {
      type = LogType[type];
    }
    const formattedMessage = `[${new Date().toLocaleString()}] <${type}> ${message}`;
    this._breadcrumbs.push(formattedMessage);
  }

  public toSourceCode(): object {
    return {
      id: 'main',
      type: 'Text',
      title: 'Log File',
      highlightLine: true,
      text: this._breadcrumbs.join('\n'),
    };
  }
}
