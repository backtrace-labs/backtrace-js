import axios, { AxiosInstance } from 'axios';
import { Agent, globalAgent } from 'https';
import stringify from 'json-stringify-safe';
import { BacktraceReport } from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';
export class BacktraceApi {
  private _axiosInstance: AxiosInstance;
  constructor(backtraceUri: string, timeout: number, ignoreSslCert: boolean) {
    this._axiosInstance = axios.create({
      baseURL: backtraceUri,
      timeout,
      httpsAgent: ignoreSslCert
        ? new Agent({
            rejectUnauthorized: false,
          })
        : globalAgent,
      headers: {
        'Content-Type': `application/json`,
      },
    });
  }

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    try {
      const data = await report.toJson();
      const result = await this._axiosInstance.post('', stringify(data));

      if (result.status === 429) {
        const err = new Error(`Backtrace - reached report limit.`);
        return BacktraceResult.OnError(report, err);
      }

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
