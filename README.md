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

| name                                                | set  | get1  | update | get2  | evict |
|-----------------------------------------------------|------|-------|--------|-------|-------|
| [simple-lru-cache](https://npm.im/simple-lru-cache) | 3448 | 12500 | 14286  | 25000 | 3030  |
| [tiny-lru](https://npm.im/tiny-lru)                 | 2703 | 9091  | 20000  | 20000 | 3704  |
| [hyperlru](https://npm.im/hyperlru)                 | 1887 | 20000 | 2703   | 20000 | 2778  |
| [lru_cache](https://npm.im/lru_cache)               | 3226 | 16667 | 7692   | 14286 | 1887  |
| [lru-fast](https://npm.im/lru-fast)                 | 1075 | 8333  | 8333   | 11111 | 3448  |
| [hashlru](https://npm.im/hashlru)                   | 2500 | 5000  | 3571   | 12500 | 8333  |
| [lru](https://npm.im/lru)                           | 3030 | 4000  | 3704   | 4167  | 1000  |
| [lru-cache](https://npm.im/lru-cache)               | 1136 | 3704  | 1923   | 5556  | 877   |
| [quick-lru](https://npm.im/quick-lru)               | 2381 | 2273  | 1754   | 2439  | 3226  |
| [secondary-cache](https://npm.im/secondary-cache)   | 1299 | 3030  | 1923   | 4348  | 1471  |
| [modern-lru](https://npm.im/modern-lru)             | 1163 | 1639  | 2174   | 2381  | 680   |
| [mkc](https://npm.im/mkc)                           | 893  | 1136  | 613    | 1316  | 794   |

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



