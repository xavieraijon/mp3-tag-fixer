declare module 'fpcalc' {
  interface FpcalcResult {
    fingerprint: string;
    duration: number;
  }

  type FpcalcCallback = (err: Error | null, result: FpcalcResult) => void;

  interface FpcalcOptions {
    length?: number;
    raw?: boolean;
    command?: string;
  }

  function fpcalc(
    file: string | NodeJS.ReadableStream,
    callback: FpcalcCallback,
  ): void;

  function fpcalc(
    file: string | NodeJS.ReadableStream,
    options: FpcalcOptions,
    callback: FpcalcCallback,
  ): void;

  export default fpcalc;
}
