# bench-lru

benchmark the least-recently-used caches which are available on npm

## introduction

An LRU cache is a cache with bounded memory use.
The point of a cache is to improve performance,
so how performant are the available implementations?

LRUs achive bounded memory use by removing the oldest items when a threashold number of items
is reached. We measure 3 cases, adding an item, updating an item, and adding items
which push other items out of the LRU.

There is a [previous benchmark](https://www.npmjs.com/package/bench-cache)
but it did not describe it's methodology. (and since it measures the memory used,
but tests everything in the same process, it does not get clear results)

## method

I run a very simple benchmark. In three phases,
set the LRU to fit max N=100,000 items,
add N random numbers to the cache, with keys 0-N,
then update those keys with new random numbers,
then _evict_ those keys, by adding keys N-2N.

### results

Operations per millisecond (higher is better)

(see updated results at the bottom!)

``` csv
name, set, update, evict
lru-native, 621, 901, 654
modern-lru, 415, 508, 336
lru-cache, 199, 521, 238
lru_cache, 2778, 8333, 23
tiny-lru, 2222, 4000, 23
lru, 1220, 2128, 7
simple-lru-cache, 2128, 6250, 7
mkc, 336, 7, 2
lru-fast, 6250, 2941, 7
faster-lru-cache, 1, 1, 1
secondary-cache, 917, 7, 2
```

We can group the results in a few categories,

* all rounders (lru-native, modern-lru, lru-cache) where the performance
  to add update and evict are comparable.
* fast-write, slow-evict (lru_cache, tiny-lur, lru, simple-lru-cache, lru-fast) these have better set/update times, but for some reason are quite slow to evict items!
* slow in at least 2 categories (mkc, faster-lru-cache, secondary-cache)

## future work

This is very early results, take any difference smaller than an order of magnitude with a grain of salt.
It is necessary to measure the statistical significance of the results to know accurately the relative
performance of two closely matched implementations.

I also didn't test the memory usage. This should be done running the benchmarks each in a separate
process, so that the memory used by each run is not left over while the next is running.

## discussion

It appears that all-round performance is the most difficult to achive, and there are no implementations
that have very high eviction performance. It is also interesting that of the implementations which
can set and update very fast, none can evict quickly.
Also, some have faster add than update, and some faster update than add.

`modern-lru` gets pretty close to `lru-native` perf.

I think there opportunities for better perf. For example, it should be possible to avoid an alloction
when evicting by recycling the least recently used item ito the new value. I would expect this to also
have better GC behaviour.

## UPDATE!

I implemented a new LRU algorithm [hashlru](https://github.com/dominictarr/hashlru)
that is simpler and faster across the board. It's O(1) like LRU, but does less per operation.

These results also include read times.

``` csv
name, set, get1, update, get2, evict
hashlru, 6250, 8333, 6250, 7143, 4167
lru-native, 714, 1053, 935, 1042, 510
modern-lru, 239, 581, 498, 578, 370
lru-cache, 300, 1449, 592, 1786, 247
lru_cache, 3226, 14286, 11111, 12500, 22
lru, 1887, 2778, 1724, 2857, 7
simple-lru-cache, 3448, 6667, 6667, 9091, 7
mkc, 410, 7, 3, 2, 1
lru-fast, 1493, 4762, 12500, 14286, 7
faster-lru-cache, 1, 1, 1, 1, 1
secondary-cache, 935, 7, 3, 2, 1
```

I removed `tiny-lru` because it was crashing in the get phase.

## further discussion

javascript is generally slow, so one of the best ways to make it fast is to write less of it.
LRUs are also quite difficult to implement (linked lists!). In trying to come up with a faster
LRU implementation I realized that something far simpler could do the same job. Especially
given the strengths and weaknesses of javascript, this is significantly faster than any of the
other implementations, _including_ the C implementation. Likely, the overhead of the C<->js boundry
is partly to blame here.

## License

MIT



