# NestJS-Omacache

<p align="center"> 
<img src="https://github.com/TeamSparta-Inc/nestjs-cache/assets/119388148/c686a2a8-a785-4dba-8a5c-6bce1dd68b45" alt="omacache_logo" width="350" align="center"/>
<br/>
<em align="center">by talented designer, <a href="mailto:kdh0178@gmail.com">kdh0178@gmail.com</a></em>
</p>

## Motivation

Nest's cache-manager has limitations and inconveniences(i.e. cache decorator applied for controller only).
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
import { CacheModule } from 'nestjs-omacache'

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
import { Cache, ICacheStorage } from "nestjs-omacache";

// for example, we can use redis for storage
// What ever your implementation is, it must satisfies ICacheStorage interface.
// set() ttl param is optional, but implementing signature including ttl is strongly recommended
class RedisStorage implements ICacheStorage {
    get(key: string) {...}
    set(key: string, val: any, ttl: number) {...}
    has(key: string) {...}
    delete(key: string) {...}
}

// Then you can make External Redis Cache!
const ExternalCache = Cache({ storage: new RedisStorage() })

// ...or
// you can just initialize it using default storage(in-memory cache)
// default storage is based on lru-cache package, so it can handle TTL and cache eviction
// default max size is 10000
// make sure you are not making memory overhead by using default in-memory storage
const InMemoryCache = Cache();

// you can implement your custom in-memory cache, which is more configurable.
```

### Use it anywhere

```typescript
// regardless class is Controller or Injectable, you can use produced cache decorator
@Controller()
class AppController {
    @Get()
    @ExternalCache({
        // persistent cache also needs key to control cache internally
        key: 'some key',
        // persistent cache sets cache automatically on server start
        kind: 'persistent',
        // refresh interval is optional
        // use it if you want cache refreshing
        refreshIntervalSec: 60 * 60 * 3 // 3 hours
    })
    async noParameterMethod() {
        ...
    }

    @Get('/:id')
    @ExternalCache({
        key: 'other key',
        kind: 'temporal',
        ttl: 10 * MIN, // 10 mins
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
// keep in mind that cache control by parameters is supported for temporal cache only
@Controller()
class SomeController {
    @Get()
    @InMemoryCache({
        key: 'hello',
        kind: 'persistent',
    })
    getSomethingHeavy() {
        ...
    }

    @Put()
    // in this case, we are busting persistent cache
    // after busting persistent cache, when busting method is done,
    // persistent cached method(getSomethingHeavy in this case) will invoked immediately
    // so you can still get the updated cache from persistent cache route!
    @InMemoryCache({
        key: 'hello',
        kind: 'bust',
    })
    updateSomethingHeavy() {
        ...
    }


    // this route sets cache for key 'some'
    @Get('/some')
    @InMemoryCache({
        key: 'some',
        kind:'temporal',
        ttl: 30 * SECOND, // 30 seconds
    })
    getSome() {
        ...
    }

    // and this route will unset cache for key 'some', before the 'some' cache's ttl expires
    @Patch('/some')
    @InMemoryCache({
        key: 'some',
        kind: 'bust',
    })
    updateSome() {
        ...
    }

    // above operation also can handle parameter based cache
    @Get('/:p1/:p2')
    @ExternalCache({
        key: 'some',
        kind:'temporal',
        ttl: 30 * SECOND, // 30 seconds
        paramIndex: [0, 1]
    })
    getSomeOther(@Param('p1') p1: string, @Param('p2') p2: string) {
        ...
    }

    // will unset cache of some + p1 + p2
    @Patch('/:p1/:p2')
    @ExternalCache({
        key: 'some',
        kind: 'bust',
        paramIndex: [0, 1]
    })
    updateSomeOther(@Param('p1') p1: string, @Param('p2') p2: string) {
        ...
    }

    // if you want to unset all cache based on a key, you can use bustAllChildren option.
    // this will only work for temporal cache.
    @Get('/foo')
    @ExternalCache({
        key: 'foo',
        kind: 'temporal',
        ttl: 30 * SECOND,
    })
    getFoo() {
        ...
    }

    @Get('foo/:p1/:p2')
    @ExternalCache({
        key: 'foo',
        kind: 'temporal',
        ttl: 30 * SECOND,
        paramIndex: [0, 1]
    })
    getFooOther(@Param('p1') p1: string, @Param('p2') p2: string) {
        ...
    }

    @Patch('/foo')
    @ExternalCache({
        key: 'foo',
        kind: 'bust',
        bustAllChildren: true
    })
    updateFoo() {
        ...
    }
}
```

#### Additional Busting within one route

In many cases, change to a single data affects multiple outputs. For example, if you modify "User" data, you have to remove caches of "User", "MyPage", "Friends". So, Omacache provide capability to remove all related caches at once.

```typescript
@Put("/users/:userId")
@InMemoryCache({
    kind: "bust",
    key: "user",
    paramIndex:[0],
    // additional bustings
    // It's same type of "bust" but except kind & addition
    addition: [
        {
            key: "my_page",
            // this would not remove cache if
            // route that sets "my_page" cache construct cache key with different parameter poisition
            paramIndex:[0]
        },
        {
            key: "friends",
            bustAllChildren: true
        }
    ]
})
modifyUser(@Param("userId") userId: string, @Body() body: any) {
    ...
}
```

## Caution

1. persistent cache must used on method without parameters, otherwise, it will throw error that presents persistent cache cannot applied to method that have parameters.
2. cache set does not awaited internally for not interrupting business logics. only when integrity matters, it awaits(i.e. 'has' method). If you implemented all ICacheStorage signatures synchronously, you don't have to concern about it.
