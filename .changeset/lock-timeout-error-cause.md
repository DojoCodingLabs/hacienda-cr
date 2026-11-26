---
"@dojocoding/hacienda-sdk": patch
---

Lock-timeout errors from the sequence store and the durable-file lock now carry
the underlying `EEXIST` error as `cause`. Messages and fail-closed behavior are
unchanged; a timed-out writer still never steals the lock.
