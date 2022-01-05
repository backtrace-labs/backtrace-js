/*
 * This file contains general utility functions.
 */

const crypto = window.crypto; // needed for uuid function

/**
 * Generate a UUID
 */
export function uuid(): string {
  const uuidArray = new Uint8Array(16);
  crypto.getRandomValues(uuidArray);
  const hexStr = (b: number) => {
    const s = b.toString(16);
    return b < 0x10 ? '0' + s : s;
  };
  let result = '';
  let i = 0;
  for (; i < 4; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 6; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 8; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 10; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  result += '-';
  for (; i < 16; i += 1) {
    result += hexStr(uuidArray[i]);
  }
  return result;
}

/**
 * Get unix time in seconds.
 */
export function currentTimestamp(): number {
  return Math.floor(new Date().getTime() / 1000);
}

/**
 * Get 'backtrace-guid' from localStorage. Will create and store if not set.
 */
export function getBacktraceGUID(): string {
  let guid = window.localStorage.getItem('backtrace-guid');
  if (!guid) {
    guid = uuid();
    window.localStorage.setItem('backtrace-guid', guid);
  }
  return guid;
}