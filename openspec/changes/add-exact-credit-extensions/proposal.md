# Add distinct partial NC and rejected-FE replacement source contracts

SDK main 91ac6cf includes exact FE, total NC, ND, TE and the first ordinary FEC
source slices. Exact FE still omits references; total NC deliberately rejects
partial amount edits and uses full-cancellation reference 01. Missing partial NC
and rejected-FE replacement are distinct V1 requirements, not one generic
correction API or a reason-code flag on the existing total-NC producer.

First propose two bounded additive source contracts with exact decimal math and
native XML, preserving original bytes and all existing APIs. Accepted-source
partial amount correction uses new NC 03/type 01/code 02. A Hacienda-rejected source
requires a new FE 01/type 10/code 16, not a NC or reuse of the rejected identity.

This checkpoint is design/audit only. Independent source policy review precedes
implementation. SDK #85, REP's separate monetary oracle, special FEC 05/06–13,
recipient protocol/security and coherent release/app gates remain open.
