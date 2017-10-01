# bench-lru

benchmark the least-recently-used caches which are available on npm.

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

I run a very simple benchmark. In four phases:

1. set the LRU to fit max N=100,000 items.
2. add N random numbers to the cache, with keys 0-N.
3. then update those keys with new random numbers.
4. then _evict_ those keys, by adding keys N-2N.

### Results

Operations per millisecond (*higher is better*):

| name                                                | size    | gzip    | set  | get1  | update | get2  | evict |
|-----------------------------------------------------|---------|---------|------|-------|--------|-------|-------|
| [hyperlru](https://npm.im/hyperlru)                 | 889 B   | 395 B   | 1653 | 20000 | 2564   | 22222 | 2817  |
| [lru_cache](https://npm.im/lru_cache)               | 2.19 kB | 756 B   | 4167 | 18182 | 5714   | 16667 | 4444  |
| [simple-lru-cache](https://npm.im/simple-lru-cache) | 1.43 kB | 565 B   | 2326 | 10526 | 10000  | 14286 | 2439  |
| [tiny-lru](https://npm.im/tiny-lru)                 | 4 kB    | 1.64 kB | 5556 | 9091  | 6061   | 13333 | 3279  |
| [lru-fast](https://npm.im/lru-fast)                 | 2.34 kB | 793 B   | 2222 | 12500 | 10526  | 5882  | 3571  |
| [hashlru](https://npm.im/hashlru)                   | 628 B   | 332 B   | 7143 | 5556  | 5882   | 6061  | 7407  |
| [secondary-cache](https://npm.im/secondary-cache)   | 22.6 kB | 6.54 kB | 1282 | 3846  | 2857   | 6061  | 1695  |
| [lru](https://npm.im/lru)                           | 6.07 kB | 1.86 kB | 2985 | 3636  | 2532   | 2062  | 1802  |
| [lru-cache](https://npm.im/lru-cache)               | 19.1 kB | 6.23 kB | 1198 | 3175  | 2439   | 4878  | 922   |
| [quick-lru](https://npm.im/quick-lru)               | 1.23 kB | 489 B   | 3030 | 2273  | 2941   | 2247  | 2105  |
| [modern-lru](https://npm.im/modern-lru)             | 2.27 kB | 907 B   | 1149 | 1961  | 2020   | 2469  | 820   |
| [mkc](https://npm.im/mkc)                           | 10.5 kB | 3.61 kB | 784  | 939   | 935    | 1538  | 608   |

We can group the results in a few categories:

* all rounders (tiny-lru, hashlru, lru-native, modern-lru, lru-cache) where the performance
  to add update and evict are comparable.
* fast-write, slow-evict (lru_cache, lru, simple-lru-cache, lru-fast) these have better set/update times, but for some reason are quite slow to evict items!
* slow in at least 2 categories (mkc, faster-lru-cache, secondary-cache)

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

## Future work

This is still pretty early results, take any difference smaller than an order of magnitude with a grain of salt.

It is necessary to measure the statistical significance of the results to know accurately the relative performance of two closely matched implementations.

I also didn't test the memory usage. This should be done running the benchmarks each in a separate process, so that the memory used by each run is not left over while the next is running.

## conclusion

Javascript is generally slow, so one of the best ways to make it fast is to write less of it.
LRUs are also quite difficult to implement (linked lists!). In trying to come up with a faster
LRU implementation I realized that something far simpler could do the same job. Especially
given the strengths and weaknesses of javascript, this is significantly faster than any of the
other implementations, _including_ the C implementation. Likely, the overhead of the C<->js boundry
is partly to blame here.

## Changelog

### 1.0.1
* Jason updated `tiny-lru` and re-ran the tests on a Mac Book Air (13" early 2014 / i7 / 8GB / 512 SSD / macOS 10.12.2) with node.js 7.4.0.

* Jason added `nan` module to avoid a compile error from `lru-native`; it wouldn't compile so results were not changed.

* Jason updated `npm test`.

### 1.0.0
* I implemented a new LRU algorithm [hashlru](https://github.com/dominictarr/hashlru)
that is simpler and faster across the board. It's O(1) like LRU, but does less per operation.

* I removed `tiny-lru` because it was crashing in the get phase.

## License

MIT



