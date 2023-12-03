# Cache Decorator Factory for NestJS

## Contact

js.byeon@teamsparta.co

## Motivation

Nest's cache-manager has limitations and inconveniences(i.e. cache applied for controller only).
this problem arises from the fact that @nestjs/cache-manager implements features using interceptor, so its capabilities limited within interceptor's.

This package provides you full capabilities for most caching strategy on server.

It solves:

1. enables partial caching during Request-Response cycle
2. set-on-start caching(persistent, and can be refreshed)
3. can be applied to both controllers and services(Injectable)
4. key-based cache control. It gives you convenience to set and bust the cache using same key

Cache option type automatically switched by 'kind' option(persistent or temporal)

## Usage

### Import CacheModule

```typescript
// root module
import { CacheModule } from '@teamsparta/cache'

@Module({
    // this import enables set-on-start caching
    imports: [CacheModule],
    ...
})
export class AppModule {}
```

### Build your own Cache Decorator with storage

```typescript
// imported 'Cache' is factory to receive storage that implements ICacheStorage
// in this example, we'll initialize in-memory cache
import { Cache } from "@teamsparta/cache";
// Map implements all the signatures of ICacheStorage
// so you can just pass Map instance
const InMemoryCache = Cache({ storage: new Map() satisfies ICacheStorage });
```

### Use it anywhere

```typescript
// regardless class is Controller or Injectable, you can use InMemoryCache decorator
@Controller()
class AppController {
    @Get()
    @InMemoryCache({
        // persistent cache also needs key to control cache internally
        key: 'some key',
        // persistent cache sets cache automatically on server start
        kind: 'persistent',
        refreshIntervalSec: 60 * 60 * 3 // 3 hours
    })
    async noParameterMethod() {
        ...
    }

    @Get('/:id')
    @InMemoryCache({
        key: 'other key',
        kind: 'temporal',
        ttl: 60 * 10, // 10 mins
        set: true,
        // You have to specify parameter indexes which will be referenced dynamically
        // In this case, cache key will be concatenated string of key, id param, q2 query
        paramIndex: [0, 2]
    })
    async haveParametersMethod(
        @Param('id') id: number,
        // q1 will not affect cache key because paramIndex is specified to refer param index 0 and 2
        @Query('query_1') q1: string,
        @Query('query_2') q2: string
    ) {
        ...
    }
}
```

### Partial Caching

#### partial caching is particularly useful when an operation combined with cacheable and not cacheable jobs

```typescript
// let's say SomeService have three methods: taskA, taskB, taskC
// assume that taskA and taskC can be cached, but taskB not
// each of task takes 1 second to complete

// in this scenario, @Nestjs/cache-manager can't handle caching because it's stick with interceptor
// but we can cover this case using partial caching
@Injectable()
class SomeService {

    @InMemoryCache(...)
    taskA() {} // originally takes 1 second

    // not cacheable
    taskB() {} // takes 1 second

    @InMemoryCache(...)
    taskC() {} // originally takes 1 second
}


@Controller()
class SomeController {
    constructor(
        private someService: SomeService
    ) {}

    // this route can take slightest time because taskA and taskC is partially cached
    // execution time can be reduced 3 seconds to 1 second
    @Get()
    route1() {
        someService.taskA(); // takes no time
        someService.taskB(); // still takes 1 second
        someService.taskC(); // takes no time
    }
}
```

### Cache Busting

```typescript
// we need to set same key to set & unset cache
// keep in mind that cache control by key is supported for temporal cache only
@Controller()
class SomeController {
    // this route sets cache for key 'some'
    @Get()
    @InMemoryCache({
        key: 'some',
        kind:'temporal',
        set: true,
        ttl: 30,
    })
    getSome() {
        ...
    }

    // and this route will unset cache for key 'some', before the 'some' cache's ttl expires
    @Patch()
    @InMemoryCache({
        key: 'some',
        kind: 'temporal',
        set: false
    })
    updateSome() {
        ...
    }

    // above operation also can handle parameter based cache
    @Get('/:p1/:p2')
    @InMemoryCache({
        key: 'some',
        kind:'temporal',
        set: true,
        ttl: 30,
        paramIndex: [0, 1]
    })
    getSomeOther(@Param('p1') p1: string, @Param('p2') p2: string) {
        ...
    }

    // will unset cache of some + p1 + p2
    @Patch('/:p1/:p2')
    @InMemoryCache({
        key: 'some',
        kind: 'temporal',
        set: false,
        paramIndex: [0, 1]
    })
    updateSomeOther(@Param('p1') p1: string, @Param('p2') p2: string) {
        ...
    }
}

```

## Caution

persistent cache must used on method without parameters, otherwise, it will throw error that presents persistent cache cannot applied to method that have parameters.
