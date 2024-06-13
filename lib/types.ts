type DynamicTemporal = { 
  ttl: number; 
  paramIndex?: number[], 
  dynamicUrlKey:true
}
type StaticTemporal = { 
  ttl: number; 
  paramIndex?: number[], 
  dynamicUrlKey?: false
  key:string
}
type CacheOptionSchema<CO extends boolean, Dynamic extends boolean> = {
  temporal: CO extends true? Dynamic extends true ? DynamicTemporal : StaticTemporal : StaticTemporal 
  // persistent cannot have dynamic url key
  // because persistent cache is 'persistent', so it sets cache even when request was not occurred
  persistent: {
    refreshIntervalSec?: number;
    key:string
    dynamicUrlKey?:false
  };
  bust: {
    paramIndex?: number[];
    key:string
    bustAllChildren?: boolean;
    addition?: Omit<CacheOptions<"bust", false, false>, "addition" | "kind">[];
    dynamicUrlKey?:boolean
  } 
};
// CO stands for "Controller Only"
export type CacheBuildOption<CO extends boolean> = { storage: ICacheStorage, controllerOnly?:CO }
export const enum INTERNAL_KIND {
  PERSISTENT = 0,
  TEMPORAL = 1,
  BUST = 2,
}
export type CacheKind = "persistent" | "temporal" | "bust";
export type CacheOptions<Kind extends CacheKind, CO extends boolean, Dynamic extends boolean> = CacheOptionSchema<CO, Dynamic>[Kind] & {
  kind: Kind;
};
export interface ICacheStorage {
  get(key: string): any;
  set(key: string, value: any): any;
  set(key: string, value: any, ttl?: number): any;
  delete(key: string): boolean | Promise<boolean>;
  has(key: string): boolean | Promise<boolean>;
}
