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


| name                                                           | set  | get1  | update | get2  | evict |
|----------------------------------------------------------------|------|-------|--------|-------|-------|
| [lru_cache](https://npmjs.com/package/lru_cache)               | 3436 | 19084 | 5105   | 19417 | 9425  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 5993 | 20790 | 21692  | 18797 | 5157  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 3204 | 24783 | 16639  | 40984 | 4962  |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 2096 | 2694  | 2901   | 2978  | 4183  |
| [quick-lru](https://npmjs.com/package/quick-lru)               | 2601 | 2510  | 2764   | 2742  | 3342  |
| [hashlru](https://npmjs.com/package/hashlru)                   | 5222 | 6135  | 3039   | 3656  | 2751  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 2157 | 28612 | 17905  | 31104 | 2650  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 1971 | 7728  | 5663   | 8396  | 2282  |
| [js-lru](https://www.npmjs.com/package/quick-lru)              | 1205 | 2448  | 2422   | 2224  | 1527  |
| [lru](https://www.npmjs.com/package/lru)                       | 1309 | 3359  | 2675   | 3664  | 1456  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 1583 | 4132  | 3489   | 4128  | 1170  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 1076 | 2869  | 2268   | 3439  | 1112  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 639  | 2352  | 1612   | 2276  | 710   |
| [mkc](https://npmjs.com/packacge/package/mkc)                  | 673  | 1114  | 773    | 1241  | 630   |


We can group the results in a few categories:

* all rounders (lru_cache, tiny-lru, simple-lru-cache, lru-fast) where the performance to add update and evict are comparable.
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
