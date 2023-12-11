import { Cache } from "../cache";

export const InMemCache = Cache({ storage: new Map() });
