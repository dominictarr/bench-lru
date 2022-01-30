# bench-lru

benchmark the least-recently-used caches which are available on npm.

## Update January, 2022

This is a fork of Dominc Tarr's original `bench-lru` script.  I've made the
following modifications.

First, I noted that cache performance and correctness in JavaScript is
highly dependent on the types of keys used to store items in the cache.

Specifically:

1. When using keys that aren't strings or symbols, it's possible for keys
   to collide if using an `Object` as the backing store rather than a
   `Map`.
2. When using integer numbers as object keys, V8 is extremely optimized for
   `Object` data storage, especially if the values are also integers.
   However, if the values are numeric strings but numeric _float_ strings,
   performance goes out the window.
3. Long strings are much slower Object keys than long strings.

In the real world, it's quite rare to store 200k integers using the exact
same 200k integers as keys.  This iteration of the benchmark uses a variety
of integers, floats, numeric integer strings, numeric float strings, long
strings, strings and integers that collide, objects, and so on, and
disqualifies caches that don't pass a basic correctness smoke test.

Next, the weighting of scores doesn't much match real world use cases
either.  In observing several production use cases of LRU caches, the
some consistent patterns can be observed.

Typically, an LRUCache is being used (if it is actually needed) for a case
where:

1. The total data corpus is _very large_, and cannot comfortably fit in
   memory.  (If it isn't large, just save it all, don't bother with an
   LRU.)
2. The time required to fetch any given item is significant.  (If it isn't,
   just fetch it each time, don't bother with an LRU.)
3. The time over which the data will be accessed is significant, and thus
   the subset of the corpus of data which will _eventually_ need to be
   accessed is by the process is more than can comfortably fit in memory.
4. Items tend to spike in popularity for a while, then become less
   frequenty accessed.

If these criteria are met, an LRUCache is a good fit.  If a few of them are
likely, and the others _might_ be true, then it might still be a good fit
to be safe.  It's a fairly common need, if somewhat specific.

Given this behavior pattern, the weights in the benchmark were off.  Simply
reporting updates per ms next to evictions per ms is a bit unhelpful.
Dominic was correct that evictions are important.

However, an eviction _can only happen_ at the time of making a `set()`
call, which means that you just performed some expensive upstream action to
get the thing that you're caching from its origin.

`update`s (that is, setting a key which is already in the cache) are
extremely rare in normal LRU-friendly workloads.  If you already have it in
the cache, don't fetch it upstream or write it again, use the cached one.
That's the whole point!

The _most_ frequent operations an LRUCache is normally called upon for is:
"fetching an item from the queue again".

That is to say, to the greatest extent possible, `get()` performance should
be roughly equivalent, regardless of where in the heirarchy of recency a
given item is found.  If fetching the most recently used item is fast, but
fetching the item 50% most recently used, or even least recently used, is
slow, then the cache will perform poorly (and unpredictably!) under real
workloads.

To account for the priorities (and the fact that eviction is much slower in
every cache measured), the following weights are applied to form a
final "score", which is used to sort the list:

1. `evict * 5`
2. `get2 * 5`
3. `get1 * 3`
4. `set * 2`
5. `update * 1`

Note that since `get2` tends to be much faster than `evict` in all caches
tested, this ends up being the most important metric.

Also, I observed that some caches perform very well when `get()` calls are
made in the order in which they were inserted into the cache, but much more
poorly when `get()` calls are made out of order.  Under real workloads, a
cache is rarely called upon to list its contents in insertion order, but
instead is used in an unpredictable order.

To accomplish this, the ordering of the data used in the `update` and
`get2` benchmarks is randomized, so that the items need to be constantly
reshuffled, as they would be in a real use case.

## Introduction

An LRU cache is a cache with bounded memory use.
The point of a cache is to improve performance,
so how performant are the available implementations?

LRUs achive bounded memory use by removing the oldest items when a threashold number of items
is reached. We measure 3 cases, adding an item, updating an item, and adding items
which push other items out of the LRU.

There is a [previous benchmark](https://www.npmjs.com/package/bench-cache)
but it did not describe it's methodology. (and since it measures the memory used,
but tests everything in the same process, it does not get clear results)

## Benchmark

I run a very simple multi-process benchmark, with 5 iterations to get a median of ops/ms:

1. Set the LRU to fit max N=200,000 items.
2. Add N random numbers to the cache, with keys 0-N.
3. Then update those keys with new random numbers.
4. Then _evict_ those keys, by adding keys N-2N.

### Results

Operations per millisecond (*higher is better*):


| name                                                           | set   | get1  | update | get2  | evict |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|
| [hashlru](https://npmjs.com/package/hashlru)                   | 18536 | 17590 | 17794  | 18332 | 9381  |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 15314 | 69444 | 35026  | 68966 | 7949  |
| [quick-lru](https://npmjs.com/package/quick-lru)               | 8214  | 4572  | 6777   | 4608  | 6345  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 6530  | 46296 | 37244  | 42017 | 5961  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 5979  | 36832 | 32626  | 40900 | 5929  |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 6272  | 15785 | 10923  | 16077 | 3738  |
| [lru](https://www.npmjs.com/package/lru)                       | 3927  | 5454  | 5001   | 5366  | 2827  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 3393  | 3855  | 3701   | 3899  | 2496  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 3515  | 3953  | 4044   | 4102  | 2495  |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 3813  | 10010 | 9246   | 10309 | 1843  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 2780  | 5705  | 5790   | 10549 | 1727  |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 2275  | 3388  | 3334   | 3301  | 1593  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 2424  | 2508  | 2443   | 2540  | 1552  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 2710  | 3946  | 3581   | 4021  | 1327  |
| [mkc](https://npmjs.com/packacge/package/mkc)                  | 1559  | 2044  | 1178   | 2161  | 1037  |


We can group the results in a few categories:

* all rounders (mnemonist, lru_cache, tiny-lru, simple-lru-cache, lru-fast) where the performance to add update and evict are comparable.
* fast-write, slow-evict (lru, hashlru, lru-native, modern-lru) these have better set/update times, but for some reason are quite slow to evict items!
* slow in at least 2 categories (lru-cache, mkc, faster-lru-cache, secondary-cache)

## Discussion

It appears that all-round performance is the most difficult to achive, in particular,
performance on eviction is difficult to achive. I think eviction performance is the most important
consideration, because once the cache is _warm_ each subsequent addition causes an eviction,
and actively used, _hot_, cache will run close to it's eviction performance.
Also, some have faster add than update, and some faster update than add.

`modern-lru` gets pretty close to `lru-native` perf.
I wrote `hashlru` after my seeing the other results from this benchmark, it's important to point
out that it does not use the classic LRU algorithm, but has the important properties of the LRU
(bounded memory use and O(1) time complexity)

Splitting the benchmark into multiple processes helps minimize JIT state pollution (gc, turbofan opt/deopt, etc.), and we see a much clearer picture of performance per library.

## Future work

This is still pretty early results, take any difference smaller than an order of magnitude with a grain of salt.

It is necessary to measure the statistical significance of the results to know accurately the relative performance of two closely matched implementations.

I also didn't test the memory usage. This should be done running the benchmarks each in a separate process, so that the memory used by each run is not left over while the next is running.

## Conclusion

Javascript is generally slow, so one of the best ways to make it fast is to write less of it.
LRUs are also quite difficult to implement (linked lists!). In trying to come up with a faster
LRU implementation I realized that something far simpler could do the same job. Especially
given the strengths and weaknesses of javascript, this is significantly faster than any of the
other implementations, _including_ the C implementation. Likely, the overhead of the C<->js boundry
is partly to blame here.

## License

MIT
