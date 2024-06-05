import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
} from "@nestjs/common";
import { EventEmitter } from "events";
import { CACHE } from "./constants";
import { CacheKind, CacheOptions, ICacheStorage, INTERNAL_KIND } from "./types";
import {
  isBust,
  isDynamicBust,
  isDynamicTemporal,
  isPersistent,
  isTemporal,
} from "./guard";
import "reflect-metadata";
import { DefaultStorage } from "./default.storage";
import { Request } from "express";

export const cacheEventEmitter = new EventEmitter();
export const intervalTimerMap = new Map<string, boolean>();
export const intervals: NodeJS.Timeout[] = [];

type RootKey = `${string}${typeof ROOT_KEY_SUFFIX}`;
const ROOT_KEY_SUFFIX = "__ROOT_KEY__" as const;

const makeRootKey = (key: string): RootKey => `${key}${ROOT_KEY_SUFFIX}`;
export const makeParamBasedCacheKey = (
  key: string,
  args: any[],
  paramIndex: number[] | undefined
) =>
  !paramIndex
    ? key
    : paramIndex.reduce(
        (cacheKey, pidx) => `${cacheKey}:${JSON.stringify(args[pidx])}`,
        key
      );

const setChildCacheKey = async (
  storage: ICacheStorage,
  cacheKey: string,
  rootKey: RootKey
) => {
  if (!(await storage.has(rootKey))) {
    storage.set(rootKey, JSON.stringify({ [cacheKey]: 1 }));
    return;
  }
  const children = await getChildrenObject(storage, rootKey);

  if (children[cacheKey]) return;

  children[cacheKey] = 1;
  storage.set(rootKey, JSON.stringify(children));
};

const deleteChildCacheKey = async (
  storage: ICacheStorage,
  cacheKey: string,
  rootKey: RootKey
) => {
  if (await storage.has(rootKey)) {
    const children = await getChildrenObject(storage, rootKey);
    delete children[cacheKey];
    storage.set(rootKey, JSON.stringify(children));
  }
};

const deleteAllChildrenByRootKey = async (
  storage: ICacheStorage,
  rootKey: RootKey,
  originalKey: string
) => {
  if (await storage.has(rootKey)) {
    const children = await getChildrenObject(storage, rootKey);
    for (const key in children) {
      storage.delete(key);
    }
    storage.delete(rootKey);
    storage.delete(originalKey);
  }
};

const getChildrenObject = async (storage, rootKey) => {
  if (!rootKey.endsWith(ROOT_KEY_SUFFIX)) {
    throw new Error("Invalid root key");
  }

  return JSON.parse(await storage.get(rootKey));
};

function copyOriginalMetadataToCacheDescriptor(
  metadataKeys: any[],
  originalMethod: any,
  descriptor: PropertyDescriptor
) {
  metadataKeys.forEach((key) => {
    const metadataValue = Reflect.getMetadata(key, originalMethod);
    Reflect.defineMetadata(key, metadataValue, descriptor.value);
  });
}

export const Cache = <ControllerOnly extends boolean = false>(
  {
    storage,
    controllerOnly,
  }: {
    storage: ICacheStorage;
    controllerOnly?: ControllerOnly;
  } = {
    storage: new DefaultStorage(),
  }
) => {
  return <Kind extends CacheKind, Dynamic extends boolean>(
    cacheOptions: CacheOptions<Kind, Dynamic, ControllerOnly>
  ) => {
    const newDescriptor = (
      target: any,
      _propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const originalMethodMetadataKeys =
        Reflect.getMetadataKeys(originalMethod);

      if (isPersistent(cacheOptions)) {
        const { refreshIntervalSec, key } = cacheOptions;

        Reflect.defineMetadata(key, INTERNAL_KIND.PERSISTENT, target);

        descriptor.value = async function () {
          if (arguments.length)
            throw new Error("arguments are not supported for persistent cache");

          if (await storage.has(key)) return storage.get(key);

          const result = await originalMethod.call(this);
          storage.set(key, result);

          if (refreshIntervalSec && !intervalTimerMap.has(key)) {
            const interval = setInterval(() => {
              const result = originalMethod.call(this);

              result instanceof Promise
                ? result.then((result) => {
                    storage.set(key, result);
                  })
                : storage.set(key, result);
            }, refreshIntervalSec * 1000);

            intervals.push(interval);
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
        const { ttl, paramIndex, key } = cacheOptions;

        Reflect.defineMetadata(key, INTERNAL_KIND.TEMPORAL, target);

        descriptor.value = async function (...args: any[]) {
          const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);
          const rootKey = makeRootKey(key);

          if (paramIndex?.length) {
            setChildCacheKey(storage, cacheKey, rootKey);
          }

          if (await storage.has(cacheKey)) return storage.get(cacheKey);

          const result = await originalMethod.apply(this, args);

          storage.set(cacheKey, result, ttl);

          return result;
        };
      }

      if (isBust(cacheOptions)) {
        descriptor.value = async function (...args: any[]) {
          const { paramIndex, bustAllChildren, addition, key } = cacheOptions;
          const rootKey = makeRootKey(key);
          if (bustAllChildren && (await storage.has(rootKey))) {
            deleteAllChildrenByRootKey(storage, rootKey, key);
          } else {
            const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);

            await storage.delete(cacheKey);
            if (await storage.has(rootKey)) {
              deleteChildCacheKey(storage, cacheKey, rootKey);
            }
          }

          for (const additionalBusting of addition || []) {
            const additionalRootKey = makeRootKey(additionalBusting.key);

            if (
              additionalBusting.bustAllChildren &&
              (await storage.has(additionalRootKey))
            ) {
              deleteAllChildrenByRootKey(
                storage,
                additionalRootKey,
                additionalBusting.key
              );
            } else {
              const cacheKey = makeParamBasedCacheKey(
                additionalBusting.key,
                args,
                additionalBusting.paramIndex
              );
              storage.delete(cacheKey);

              if (await storage.has(additionalRootKey)) {
                deleteChildCacheKey(storage, cacheKey, additionalRootKey);
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

      copyOriginalMetadataToCacheDescriptor(
        originalMethodMetadataKeys,
        originalMethod,
        descriptor
      );

      SetMetadata(CACHE, cacheOptions)(descriptor.value);

      return descriptor;
    };

    if (isDynamicTemporal(cacheOptions)) {
      class CacheInterceptor implements NestInterceptor {
        intercept(context: ExecutionContext, next: CallHandler) {
          const key = context.switchToHttp().getRequest<Request>().url;

          return next.handle();
        }
      }

      return UseInterceptors(CacheInterceptor);
    }

    if (isDynamicBust(cacheOptions)) {
      class CacheInterceptor implements NestInterceptor {
        intercept(context: ExecutionContext, next: CallHandler) {
          const key = context.switchToHttp().getRequest<Request>().url;

          return next.handle();
        }
      }

      return UseInterceptors(CacheInterceptor);
    }

    return newDescriptor;
  };
};
