// import FormData from 'form-data';
// import { IBacktraceData } from '@src/model/backtraceData';
import { BacktraceReport } from '@src/model/backtraceReport';
import { BacktraceResult } from '@src/model/backtraceResult';
import axios from 'axios';
import stringify from 'json-stringify-safe';

export class BacktraceApi {
  constructor(private backtraceUri: string, private timeout: number) {}

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    try {
      const data = await report.toJson();
      const result = await axios.post(this.backtraceUri, stringify(data), {
        timeout: this.timeout,
        headers: {
          'Content-Type': `application/json`,
        },
      });
      if (result.status !== 200) {
        const err = new Error(`Invalid attempt to submit error to Backtrace. Result: ${result}`);
        return BacktraceResult.OnError(report, err);
      }
      return BacktraceResult.Ok(report, result.data);
    } catch (err) {
      return BacktraceResult.OnError(report, err);
    }
  }
}
