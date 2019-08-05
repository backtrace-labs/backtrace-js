import { ISourceCode } from '@src/model/sourceCode';

export interface IBacktraceData {
  uuid: string;
  timestamp: number;
  lang: string;
  langVersion: string;
  agent: string;
  agentVersion: string;
  mainThread: string;
  attributes: { [index: string]: any };
  annotations: { [index: string]: any };
  threads: object;
  classifiers: string[];
}
