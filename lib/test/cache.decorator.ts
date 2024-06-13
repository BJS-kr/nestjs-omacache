import { Cache } from "../cache";
import { DefaultStorage } from "../default.storage";
export const defaultStorage = new DefaultStorage();
export const InMemCache = Cache({ storage: defaultStorage });
export const ControllerOnlyCache = Cache({storage: defaultStorage, controllerOnly:true})
