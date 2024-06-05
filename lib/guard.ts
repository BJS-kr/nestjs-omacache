import { CacheKind, CacheOptions } from "./types";

export const isPersistent = <
  Dynamic extends boolean,
  ControllerOnly extends boolean
>(
  cacheOptions: CacheOptions<CacheKind, Dynamic, ControllerOnly>
): cacheOptions is CacheOptions<"persistent", Dynamic, ControllerOnly> => {
  return cacheOptions.kind === "persistent";
};
export const isTemporal = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>
): cacheOptions is CacheOptions<"temporal", false, boolean> => {
  return cacheOptions.kind === "temporal" && !cacheOptions.dynamicRouteKey;
};
export const isDynamicTemporal = (
  cacheOptions: CacheOptions<CacheKind, true, boolean>
): cacheOptions is CacheOptions<"temporal", true, boolean> => {
  return cacheOptions.kind === "temporal" && cacheOptions.dynamicRouteKey;
};
export const isBust = (
  cacheOptions: CacheOptions<CacheKind, boolean, boolean>
): cacheOptions is CacheOptions<"bust", false, boolean> => {
  return cacheOptions.kind === "bust" && !cacheOptions.dynamicRouteKey;
};
export const isDynamicBust = (
  cacheOptions: CacheOptions<CacheKind, true, boolean>
): cacheOptions is CacheOptions<"bust", true, boolean> => {
  return cacheOptions.kind === "bust" && cacheOptions.dynamicRouteKey;
};
