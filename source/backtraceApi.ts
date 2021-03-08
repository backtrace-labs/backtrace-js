import { BacktraceReport } from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';

export class BacktraceApi {
  constructor(private readonly _backtraceUri: string, private readonly _timeout: number) {}

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    try {
      const formData = report.toFormData();

      return new Promise<BacktraceResult>((res, rej) => {
        const xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.timeout = this._timeout;
        xmlHttpRequest.open('POST', this._backtraceUri, true);
        xmlHttpRequest.send(formData);
        xmlHttpRequest.onload = (e) => {
          if (xmlHttpRequest.readyState === XMLHttpRequest.DONE) {
            if (xmlHttpRequest.status === 200) {
              res(BacktraceResult.Ok(report, xmlHttpRequest.responseText));
            } else if (xmlHttpRequest.status === 429) {
              res(BacktraceResult.OnError(report, new Error(`Backtrace - reached report limit.`)));
            } else {
              res(
                BacktraceResult.OnError(
                  report,
                  new Error(`Invalid attempt to submit error to Backtrace. Result: ${xmlHttpRequest.responseText}`),
                ),
              );
            }
          }
        };

        xmlHttpRequest.onerror = (e) => {
          rej(e);
        };
      });
    } catch (err) {
      return BacktraceResult.OnError(report, err);
    }
  }
}
