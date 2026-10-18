# Add a bounded exact domestic purchase-invoice source

The SDK has a legacy Number/precomputed FEC builder but no exact source contract.
FEC cannot be implemented by relabeling FE: its supplier remains XML `Emisor`,
its buyer is XML `Receptor` and owns the 08 identity/signature, its buyer activity
and references are required, and its native line structure differs.

Propose one first named ordinary domestic IVA13 source case, preserving all
existing FE/TE/ND/NC/current/retained and legacy APIs. Add exact string input,
independent calculation and genuine FEC XML only after the following design is
reviewed. This contributes to SDK #85's eventual coherent release; no package
version, publication, app activation or live operation is proposed here.

Used-goods condition 13 / supplier identification 06, foreign supplier 05,
non-subject/exempt/exonerated and special VAT/deferred cases require separate
reviewed source policies; this first named case must reject them explicitly.
They remain required backlog work, not silently covered by ordinary IVA13.
