import { JSDOM } from 'jsdom';

declare global {
  namespace NodeJS {
    interface Global {
      document: Document;
      window: Window;
      navigator: Navigator;
    }
  }
}

const { window } = new JSDOM('<!doctype html><html><body></body></html>');
global.document = window.document;
global.window = global.document.defaultView as Window & typeof globalThis;

