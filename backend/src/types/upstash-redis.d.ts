declare module '@upstash/redis' {
  export class Redis {
    constructor(options: { url: string; token: string })
    get<T>(key: string): Promise<T | null>
    setex(key: string, seconds: number, value: any): Promise<void>
    del(key: string): Promise<void>
  }
}
