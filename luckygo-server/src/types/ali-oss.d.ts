declare module 'ali-oss' {
  interface OssOptions {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint: string;
    secure?: boolean;
  }

  class OSS {
    constructor(options: OssOptions);
    put(name: string, file: Buffer, options?: { headers?: Record<string, string> }): Promise<unknown>;
  }

  export default OSS;
}
