type CacheOptionSchema = {
  temporal: { ttl: number; paramIndex?: number[] };
  persistent: {
    refreshIntervalSec?: number;
  };
  bust: { paramIndex?: number[], bustAllChildren?: boolean, addition?: Omit<CacheOptions<"bust">, "additon" | "kind">[] };
};
export const enum INTERNAL_KIND {
  PERSISTENT = 0,
  TEMPORAL = 1,
  BUST = 2,
}
export type CacheKind = "persistent" | "temporal" | "bust";
export type CacheOptions<Kind extends CacheKind> = CacheOptionSchema[Kind] & {
  key: string;
  kind: Kind;
};
export interface ICacheStorage {
  get(key: string): any;
  set(key: string, value: any): any;
  set(key: string, value: any, ttl?: number): any;
  delete(key: string): boolean | Promise<boolean>;
  has(key: string): boolean | Promise<boolean>;
}
