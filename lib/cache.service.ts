import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { CACHE } from "./constants";
import { CacheKind, CacheOptions } from "./types";
import { cacheEventEmitter } from "./cache";

@Injectable()
export class CacheService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector
  ) {}

  private getAllInstances() {
    return [
      ...this.discoveryService.getControllers(),
      ...this.discoveryService.getProviders(),
    ];
  }

  private canExplore(instance: InstanceWrapper<any>) {
    return (
      instance.isDependencyTreeStatic() &&
      instance.metatype &&
      instance.instance
    );
  }

  private extractCacheMetadata(instances: InstanceWrapper<any>[]) {
    return instances
      .filter(this.canExplore)
      .map(({ instance }) => ({
        instance,
        methodNames: [
          ...new Set(
            this.scanner.getAllMethodNames(Object.getPrototypeOf(instance))
          ),
        ],
      }))
      .map(({ instance, methodNames }) => ({
        instance,
        methods: methodNames
          .map((methodName) => ({
            method: instance[methodName],
            methodName,
          }))
          .filter(({ method }) => this.reflector.get(CACHE, method)),
      }))
      .filter(({ methods }) => methods.length)
      .flatMap(({ instance, methods }) =>
        methods.map(({ method, methodName }) => ({
          instance,
          cacheOptions: this.reflector.get<CacheOptions<CacheKind>>(
            CACHE,
            method
          ),
          methodName,
        }))
      );
  }

  private initializeAllPersistentCache() {
    this.extractCacheMetadata(this.getAllInstances()).forEach(
      ({ instance, cacheOptions }) => {
        const { kind, key } = cacheOptions;
        if (kind === "persistent") cacheEventEmitter.emit(key, instance);
      }
    );
  }

  onModuleInit() {
    this.initializeAllPersistentCache();
  }
}
