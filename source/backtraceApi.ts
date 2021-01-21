import axios from 'axios';
import { Agent, globalAgent } from 'https';
import { BacktraceReport } from './model/backtraceReport';
import { BacktraceResult } from './model/backtraceResult';

export class BacktraceApi {
  constructor(
    private backtraceUri: string,
    private timeout: number,
    private ignoreSslCert: boolean
  ) {
    this.backtraceUri = backtraceUri;
    this.timeout = timeout;
    this.ignoreSslCert = ignoreSslCert;
  }

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    try {
      const formData = await report.toFormData();
      const options = {
          baseURL: this.backtraceUri,
          timeout: this.timeout,
          httpsAgent: this.ignoreSslCert
            ? new Agent({
                rejectUnauthorized: false,
              })
            : globalAgent,
          headers: {
            'Content-Type': `undefined`, // https://stackoverflow.com/questions/39280438/fetch-missing-boundary-in-multipart-form-data-post
          },
      };
      const newAxios = axios.create();
      const result = await newAxios.post(this.backtraceUri, formData, options);

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
