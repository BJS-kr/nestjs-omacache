type CacheOptionSchema = {
  temporal: { ttl: number; paramIndex?: number[] };
  persistent: {
    refreshIntervalSec?: number;
  };
  bust: {
    paramIndex?: number[];
    bustAllChildren?: boolean;
    addition?: Omit<CacheOptions<"bust", false, false>, "additon" | "kind">[];
  };
};
type StaticOption<Kind extends CacheKind> = {
  kind: Kind;
  dynamicRouteKey?: false;
  key: string;
};
type KindAsserted<Kind> = Kind extends CacheKind ? Kind : never;
export const enum INTERNAL_KIND {
  PERSISTENT = 0,
  TEMPORAL = 1,
  BUST = 2,
}
export type CacheKind = "persistent" | "temporal" | "bust";
export type CacheOptions<
  Kind extends CacheKind,
  Dynamic extends boolean,
  ControllerOnly extends boolean
> = CacheOptionSchema[Kind] &
  ({
    kind: Kind;
    dynamicRouteKey?: Kind extends "persistent" ? false : Dynamic;
  } extends { kind: infer K; dynamicRouteKey?: infer D }
    ? D extends true
      ? ControllerOnly extends true
        ? {
            kind: K;
            dynamicRouteKey: true;
          }
        : StaticOption<KindAsserted<K>>
      : StaticOption<KindAsserted<K>>
    : never);
export interface ICacheStorage {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): any;
  delete(key: string): boolean | Promise<boolean>;
  has(key: string): boolean | Promise<boolean>;
}
