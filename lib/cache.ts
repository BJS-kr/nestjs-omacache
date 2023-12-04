import { SetMetadata } from '@nestjs/common';
import { EventEmitter } from 'events';
import { CACHE } from './constants';
import 'reflect-metadata';
import { CacheKind, CacheOptions, ICacheStorage, INTERNAL_KIND } from './types';
import { isBust, isPersistent, isTemporal } from './guard';

export const cacheEventEmitter = new EventEmitter();
export const intervalTimerMap = new Map<string, boolean>();

export const makeParamBasedCacheKey = (
  key: string,
  args: any[],
  paramIndex: number[] | undefined,
) =>
  !paramIndex
    ? key
    : paramIndex.reduce((cacheKey, pidx) => `${cacheKey}:${args[pidx]}`, key);

export const Cache =
  ({ storage }: { storage: ICacheStorage }) =>
  <Kind extends CacheKind>(cacheOptions: CacheOptions<Kind>) => {
    return (
      target: any,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ) => {
      const originalMethod = descriptor.value;
      const { key } = cacheOptions;

      if (isPersistent(cacheOptions)) {
        const { refreshIntervalSec } = cacheOptions;

        Reflect.defineMetadata(key, INTERNAL_KIND.PERSISTENT, target);

        descriptor.value = async function () {
          if (arguments.length)
            throw new Error('arguments are not supported for persistent cache');

          if (storage.has(key)) return storage.get(key);

          const result = await originalMethod.call(this);
          storage.set(key, result);

          if (!intervalTimerMap.has(key)) {
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

          cacheEventEmitter.on(`${INTERNAL_KIND.PERSISTENT}=>${key}`, () => {
            descriptor.value.call(instance);
          });
        });
      }

      if (isTemporal(cacheOptions)) {
        const { ttl, paramIndex } = cacheOptions;

        Reflect.defineMetadata(key, INTERNAL_KIND.TEMPORAL, target);

        descriptor.value = async function (...args: any[]) {
          const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);

          if (storage.has(cacheKey)) return storage.get(cacheKey);

          const result = await originalMethod.apply(this, args);

          storage.set(cacheKey, result);

          setTimeout(() => storage.delete(cacheKey), ttl! * 1000);

          return result;
        };
      }

      if (isBust(cacheOptions)) {
        descriptor.value = async function (...args: any[]) {
          const { paramIndex } = cacheOptions;
          const cacheKey = makeParamBasedCacheKey(key, args, paramIndex);

          storage.delete(cacheKey);

          const result = await originalMethod.apply(this, args);

          if (Reflect.getMetadata(key, target) === INTERNAL_KIND.PERSISTENT) {
            cacheEventEmitter.emit(`${INTERNAL_KIND.PERSISTENT}=>${key}`);
          }

          return result;
        };
      }

      SetMetadata(CACHE, cacheOptions)(descriptor.value);

      return descriptor;
    };
  };
