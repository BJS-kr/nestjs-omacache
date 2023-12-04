import { CacheKind, CacheOptions } from './types';

export const isPersistent = (
  cacheOptions: CacheOptions<CacheKind>,
): cacheOptions is CacheOptions<'persistent'> => {
  return cacheOptions.kind === 'persistent';
};
export const isTemporal = (
  cacheOptions: CacheOptions<CacheKind>,
): cacheOptions is CacheOptions<'temporal'> => {
  return cacheOptions.kind === 'temporal';
};
export const isBust = (
  cacheOptions: CacheOptions<CacheKind>,
): cacheOptions is CacheOptions<'bust'> => {
  return cacheOptions.kind === 'bust';
};
