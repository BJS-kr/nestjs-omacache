export interface ICacheStorage {
  get(key: string): any;
  set(key: string, value: any): any;
  delete(key: string): boolean;
  has(key: string): boolean;
}
