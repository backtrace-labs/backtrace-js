export interface IBacktraceData {
  uuid: string;
  symbolication?: 'sourcemap';
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
