import { CacheKind, CacheOptions } from './types';

export const isPersistent = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>,
): cacheOptions is CacheOptions<'persistent', false, false> => {
  return cacheOptions.kind === 'persistent'
};
export const isStaticTemporal = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>,
): cacheOptions is CacheOptions<'temporal', false, false> => {
  return cacheOptions.kind === 'temporal' && !(cacheOptions as CacheOptions<'temporal', boolean, boolean>).dynamicUrlKey;
};
export const isStaticBust = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>,
): cacheOptions is CacheOptions<'bust', false, false> => {
  return cacheOptions.kind === 'bust' && !(cacheOptions as CacheOptions<'bust', boolean, boolean>).dynamicUrlKey;
};
export const isDynamicTemporal = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>,
): cacheOptions is CacheOptions<'temporal', true, true> => {
  return cacheOptions.kind === 'temporal' && (cacheOptions as CacheOptions<'temporal', boolean, boolean>).dynamicUrlKey === true;
};
export const isDynamicBust = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>,
): cacheOptions is CacheOptions<'bust', true, true> => {
  return cacheOptions.kind === 'bust' && (cacheOptions as CacheOptions<'bust', boolean, boolean>).dynamicUrlKey === true;
};