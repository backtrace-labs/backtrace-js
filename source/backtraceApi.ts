import axios, { AxiosInstance } from 'axios';
import { Agent, globalAgent } from 'https';
import { BacktraceReport } from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';

export class BacktraceApi {
  private axiosInstance: AxiosInstance;

  constructor(backtraceUri: string, timeout: number, ignoreSslCert: boolean) {
    this.axiosInstance = axios.create({
      baseURL: backtraceUri,
      timeout,
      httpsAgent: ignoreSslCert
        ? new Agent({
            rejectUnauthorized: false,
          })
        : globalAgent,
      headers: {
        'Content-Type': 'undefined', // https://stackoverflow.com/questions/39280438/fetch-missing-boundary-in-multipart-form-data-post
      },
    });
  }

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    try {
      const formData = await report.toFormData();
      const result = await this.axiosInstance.post('', formData);

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
