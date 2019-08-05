import axios from 'axios';
import { EventEmitter } from 'events';
import FormData from 'form-data';

import { IBacktraceData } from '@src/model/backtraceData';
import { BacktraceReport } from '@src/model/backtraceReport';
import { BacktraceResult } from '@src/model/backtraceResult';
import stringify from 'json-stringify-safe';

export class BacktraceApi extends EventEmitter {
  constructor(private backtraceUri: string, private timeout: number) {
    super();
  }

  public async send(report: BacktraceReport): Promise<BacktraceResult> {
    const data = await report.toJson();
    this.emit('before-data-send', report, data);
    const formData = await this.getFormData(data);
    try {
      const result = await axios.post(this.backtraceUri, formData, {
        timeout: this.timeout,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
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

  private async getFormData(data: IBacktraceData): Promise<FormData> {
    const formData = new FormData();
    const json: string = stringify(data);
    formData.append('upload_file', json, 'upload_file.json');
    return formData;
  }
}