# Add distinct partial NC and rejected-FE replacement source contracts

SDK main91ac6cf includes exact FE, total NC, ND, TE and the first ordinary FEC
source slices. Exact FE still omits references; total NC deliberately rejects
partial amount edits and uses full-cancellation reference01. Missing partial NC
and rejected-FE replacement are distinct V1 requirements, not one generic
correction API or a reason-code flag on the existing total-NC producer.

First propose two bounded additive source contracts with exact decimal math and
native XML, preserving original bytes and all existing APIs. Accepted-source
partial amount correction uses new NC03/type01/code02. A Hacienda-rejected source
requires a new FE01/type10/code16, not a NC or reuse of the rejected identity.

This checkpoint is design/audit only. Independent source policy review precedes
implementation. SDK85, REP's separate monetary oracle, special FEC05/06–13,
recipient protocol/security and coherent release/app gates remain open.
