import { SetMetadata } from "@nestjs/common";
import { EventEmitter } from "events";
import { CACHE } from "./constants";
import { CacheKind, CacheOptions, ICacheStorage, INTERNAL_KIND } from "./types";
import { isBust, isPersistent, isTemporal } from "./guard";
import "reflect-metadata";

export const cacheEventEmitter = new EventEmitter();
export const intervalTimerMap = new Map<string, boolean>();
const rootKeyMap = new Map<string, Set<string>>();

export const makeParamBasedCacheKey = (
  key: string,
  args: any[],
  paramIndex: number[] | undefined
) =>
  !paramIndex
    ? key
    : paramIndex.reduce((cacheKey, pidx) => `${cacheKey}:${JSON.stringify(args[pidx])}`, key);

const mapCacheKeyToRootKey = (cacheKey: string, rootKey: string) => {
  if (!rootKeyMap.has(rootKey)) rootKeyMap.set(rootKey, new Set<string>());
  rootKeyMap.get(rootKey).add(cacheKey);
}

function copyOriginalMetadataToCacheDescriptor(metadataKeys: any[], originalMethod: any, descriptor: PropertyDescriptor) {
  metadataKeys.forEach((key) => {
    const metadataValue = Reflect.getMetadata(key, originalMethod);
    Reflect.defineMetadata(key, metadataValue, descriptor.value);
  });
}

export const Cache =
  ({ storage }: { storage: ICacheStorage }) =>
    <Kind extends CacheKind>(cacheOptions: CacheOptions<Kind>) => {
      return (
        target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor
      ) => {
        const originalMethod = descriptor.value;
        const originalMethodMetadataKeys = Reflect.getMetadataKeys(originalMethod);
        const { key } = cacheOptions;

        if (isPersistent(cacheOptions)) {
          const { refreshIntervalSec } = cacheOptions;

          Reflect.defineMetadata(key, INTERNAL_KIND.PERSISTENT, target);

          descriptor.value = async function () {
            if (arguments.length)
              throw new Error("arguments are not supported for persistent cache");

            if (await storage.has(key)) return storage.get(key);

            const result = await originalMethod.call(this);
            storage.set(key, result);

            if (refreshIntervalSec && !(intervalTimerMap.has(key))) {
              setInterval(() => {
                const result = originalMethod.call(this);

                result instanceof Promise
                  ? result.then((result) => {
                    storage.set(key, result);
                  })
                  : storage.set(key, result);
              }, refreshIntervalSec * 1000);

              intervalTimerMap.set(key, true);
            }

            return result;
          };

          cacheEventEmitter.once(key, (instance) => {
            descriptor.value.call(instance);

            cacheEventEmitter.on(
              `__${INTERNAL_KIND.PERSISTENT}=>${key}__`,
              () => {
                descriptor.value.call(instance);
              }
            );
          });
        }

        if (isTemporal(cacheOptions)) {
          const { ttl, paramIndex } = cacheOptions;

          Reflect.defineMetadata(key, INTERNAL_KIND.TEMPORAL, target);

          descriptor.value = async function (...args: any[]) {
            const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);
            mapCacheKeyToRootKey(cacheKey, key);

            if (await storage.has(cacheKey)) return storage.get(cacheKey);

            const result = await originalMethod.apply(this, args);

            storage.set(cacheKey, result);

            setTimeout(() => {
              storage.delete(cacheKey);
              rootKeyMap.get(key)?.delete(cacheKey);
            }, ttl * 1000);

            return result;
          };
        }

        if (isBust(cacheOptions)) {
          descriptor.value = async function (...args: any[]) {
            const { paramIndex, bustAllChildren, addition } = cacheOptions;

            if (bustAllChildren && rootKeyMap.has(key)) {
              // if the target of bust call is persistent cache, but bustAllChildren option is true,
              // nothing will be busted because persistent cache doesn't have mappings in rootKeyMap.
              rootKeyMap.get(key).forEach((cacheKey) => storage.delete(cacheKey));
              rootKeyMap.delete(key);
            } else {
              const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);
              await storage.delete(cacheKey);
              rootKeyMap.get(key)?.delete(cacheKey);
            }
            if (addition) {
              for (const additionalBusting of addition) {
                if (additionalBusting.bustAllChildren && rootKeyMap.has(additionalBusting.key)) {
                  rootKeyMap.get(additionalBusting.key).forEach((cacheKey) => storage.delete(cacheKey));
                  rootKeyMap.delete(additionalBusting.key);
                } else {
                  const cacheKey = makeParamBasedCacheKey(additionalBusting.key, args, additionalBusting.paramIndex);
                  await storage.delete(cacheKey);
                  rootKeyMap.get(additionalBusting.key)?.delete(cacheKey);
                }
              }
            }

            const result = await originalMethod.apply(this, args);

            if (Reflect.getMetadata(key, target) === INTERNAL_KIND.PERSISTENT) {
              cacheEventEmitter.emit(`__${INTERNAL_KIND.PERSISTENT}=>${key}__`);
            }

            return result;
          };
        }
        copyOriginalMetadataToCacheDescriptor(originalMethodMetadataKeys, originalMethod, descriptor);

        SetMetadata(CACHE, cacheOptions)(descriptor.value);

        return descriptor;
      };
    };



