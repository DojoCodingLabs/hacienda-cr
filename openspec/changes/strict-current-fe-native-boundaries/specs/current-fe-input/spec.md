## ADDED Requirements

### Requirement: Current exact FE input respects native party names and positive allocations

The current exact FE source SHALL enforce issuer names of 5–100, receiver names
of 3–100 and supplied commercial names of 3–80 Unicode characters, preserving
actual source lexemes. Every supplied payment allocation SHALL be positive and
all allocations SHALL reconcile exactly without Number conversion.

#### Scenario: Native name edge and zero split are denied before new construction

- WHEN a new current input supplies a four-character issuer or a zero allocation with a positive remainder
- THEN validation SHALL deny the current source before new XML construction
- AND no claim of native or fiscal acceptance SHALL follow from any other input check

### Requirement: Retained producer data remains read-only and version-bound

Historical 0.9 and earlier reviewed producer data SHALL retain prior read-only
schema/math and output-decoding behavior without rewriting original bytes.
Consumers SHALL distinguish the future published current contract from retained
producer tuples independently of the unchanged ordinary financial case code.

#### Scenario: Published historical input remains readable without a retained builder

- WHEN genuine published 0.9 source contains a formerly accepted short name or zero split
- THEN read-only schema/math SHALL preserve its exact strings and original bytes/hash
- AND current construction SHALL deny the invalid current input
- AND read-only compatibility SHALL grant no signing, submission or fiscal acceptance authority
