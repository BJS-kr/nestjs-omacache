import { SetMetadata } from "@nestjs/common";
import { EventEmitter } from "events";
import { ICacheStorage } from "./cache.storage";
import { CACHE } from "./constants";

export type CacheKind = "persistent" | "temporal";
type CacheOptionSchema = {
  temporal: { set: boolean; ttl?: number; paramIndex?: number[] };
  persistent: {
    refreshIntervalSec: number;
  };
};
export type CacheOptions<Kind extends CacheKind> = CacheOptionSchema[Kind] & {
  key: string;
  kind: Kind;
};

export const cacheEventEmitter = new EventEmitter();

export const isPersistent = (
  cacheOptions: CacheOptions<CacheKind>
): cacheOptions is CacheOptions<"persistent"> => {
  return cacheOptions.kind === "persistent";
};
export const isTemporal = (
  cacheOptions: CacheOptions<CacheKind>
): cacheOptions is CacheOptions<"temporal"> => {
  return cacheOptions.kind === "temporal";
};

export const makeParamBasedCacheKey = (
  key: string,
  args: any[],
  paramIndex: number[] | undefined
) =>
  !paramIndex
    ? key
    : paramIndex.reduce((cacheKey, pidx) => `${cacheKey}:${args[pidx]}`, key);

export const Cache =
  ({ storage }: { storage: ICacheStorage }) =>
  <Kind extends CacheKind>(cacheOptions: CacheOptions<Kind>) => {
    return (
      _target: any,
      _propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const { key } = cacheOptions;

      if (isPersistent(cacheOptions)) {
        const { refreshIntervalSec } = cacheOptions;

        descriptor.value = async function () {
          if (arguments.length)
            throw new Error("arguments are not supported for persistent cache");

          if (storage.has(key)) return storage.get(key);

          const result = await originalMethod.call(this);
          storage.set(key, result);

          setInterval(() => {
            const result = originalMethod.call(this);

            result instanceof Promise
              ? result.then((result) => {
                  storage.set(key, result);
                })
              : storage.set(key, result);
          }, refreshIntervalSec * 1000);

          return result;
        };

        cacheEventEmitter.once(cacheOptions.key, (instance) =>
          descriptor.value.call(instance)
        );
      }

      if (isTemporal(cacheOptions)) {
        const { set, ttl, paramIndex } = cacheOptions;

        if (set && !ttl) throw new Error("ttl is required for temporal cache");
        if (!set && ttl) throw new Error("set is required for temporal cache");

        descriptor.value = async function (...args: any[]) {
          const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);

          if (set && storage.has(cacheKey)) return storage.get(cacheKey);

          const result = await originalMethod.apply(this, args);

          if (!set) {
            storage.delete(cacheKey);

            return result;
          }

          storage.set(cacheKey, result);

          setTimeout(() => storage.delete(cacheKey), ttl! * 1000);

          return result;
        };
      }

      SetMetadata(CACHE, cacheOptions)(descriptor.value);

      return descriptor;
    };
  };
