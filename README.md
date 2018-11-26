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

I run a very simple multi-process benchmark, with 5 iterations to get a median of ops/ms:

1. Set the LRU to fit max N=200,000 items.
2. Add N random numbers to the cache, with keys 0-N.
3. Then update those keys with new random numbers.
4. Then _evict_ those keys, by adding keys N-2N.

### Results

Operations per millisecond (*higher is better*):


| name                                                           | set   | get1  | update | get2  | evict |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 10678 | 65574 | 36832  | 71429 | 10320 |
| [hashlru](https://npmjs.com/package/hashlru)                   | 15576 | 20619 | 20921  | 21231 | 8749  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 34602 | 36036 | 29718  | 37383 | 8227  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 8873  | 44053 | 29499  | 39604 | 7852  |
| [quick-lru](https://npmjs.com/package/quick-lru)               | 5675  | 3929  | 5845   | 3856  | 5520  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 4892  | 31898 | 28736  | 31397 | 5244  |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 2974  | 14368 | 10724  | 14848 | 3294  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 3834  | 8039  | 7746   | 8187  | 2820  |
| [lru](https://www.npmjs.com/package/lru)                       | 2166  | 4841  | 3799   | 3892  | 2067  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 2766  | 9728  | 7460   | 9430  | 1673  |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 1425  | 3660  | 3552   | 3738  | 1369  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 1280  | 3996  | 3699   | 3863  | 1346  |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 1372  | 3221  | 3301   | 3398  | 1223  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 1194  | 3868  | 3393   | 3545  | 1077  |
| [mkc](https://npmjs.com/packacge/package/mkc)                  | 1074  | 1537  | 1136   | 1924  | 840   |


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
