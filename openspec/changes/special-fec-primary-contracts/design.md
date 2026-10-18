# Special FEC evidence and proposed source boundary

## Identities and primary evidence

SDK baseline `7d5891a7c96f5f084b2e97e4d33fbf7839a74537`; no runtime modifications.
The [current 99-page annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf)
SHA256 is `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`.
Local PDF/text are `/private/tmp/hacienda-current-annex-v44-20261018.{pdf,txt}`;
pages 19–22, 57–60 and 69–74 were extracted independently. Page 69 was also
rendered/read visually, keeping the exact footnote attachment to each identity.
Current native FEC SHA256 is
`57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3`.

The [Hacienda used-goods worked presentation](https://www.hacienda.go.cr/docs/IVAenBienesUsados28_7_21.pdf)
(30 July 2021, 20 pages, SHA256
`ac8a806d4bc60a5786c200f76ed17965683faee3adebebf6109a6a846c7253ec`)
pp. 9–10 distinguishes acquisition from a non-contributor and subsequent resale:
the purchase example has no charged VAT, while the resale applies VAT to its
margin. It does not prescribe the modern FEC XML tariff/summary classification.
This dated training example is not independent evidence of current eligibility.
The newer indexed GeneralidadesVentaArticulosUsados.pdf returned 404; do not
cite it as retrieved. Current consolidated PGR/SINALEVI full-text endpoints
returned 403. The retrieved PGR 166C8D page contains definitions, including
reverse-charge definition, not the full article 29(d)/Transitory XV text; do
not claim that full text was inspected or infer repeal from access failure.

## Proved source matrix

| Field                | Supplier 05                                                                   | Supplier 06 / used goods                                                          | Authority and limits                                                     |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Actual roles         | foreign supplier is Emisor; Costa Rican buyer Receptor                        | non-contributor seller Emisor; actual buyer Receptor                              | buyer owns 08 identity/signing (annex p. 60); no headerswap              |
| Scope                | services or intangible assets from non-domiciled supplier                     | used goods, not arbitrary services/new goods                                      | Nota 4 footnotes 17/18, p. 69; real qualification remains external       |
| Supplier number      | actual nonempty alphanumeric, maximum 20                                      | actual nonempty alphanumeric, maximum 20                                          | p. 20; no domestic cédula padding/rule manufactured for supplier         |
| Buyer identity       | actual domestic 01–04; owns clave                                             | same                                                                              | existing buyer identity contract; no supplier 05/06 in buyer key         |
| Supplier address     | no fabricated CR location; actual OtrasSenasExtranjero 5–300 specific to 05   | actual CR location if held; no foreign-address field                              | pp. 21–22; native optionality alone does not enforce business conditions |
| Names                | issuer 5–100; buyer 3–100; supplied commercial 3–80 Unicode                   | same                                                                              | unchanged native/annex bounds; preserve lexemes                          |
| Reference            | at least one actual type 16 foreign-provider document                         | actual supporting document; do not use type 16 solely because supplier is special | pp. 19/57/74: type 16 exclusive to FEC and required for 05               |
| Reference reason     | code 11 is the named foreign-provider reason                                  | code 04 actual supporting-document case, with reviewed matching type              | Nota 9/p. 73; do not confuse reason 11 with document type 16             |
| Reference companions | actual number/date/reason; 99 companion if additionally supported             | actual number/date/reason and 99 companion where applicable                       | pp. 57–58; no fabricated clave, evidence or timestamp                    |
| Sale condition       | first proposed services case 01/02 only; credit days explicit positive for 02 | required literal 13                                                               | pp. 19–20/69–70; 13 is not a VAT tariff or cash-receipt assertion        |
| Tax selection        | no automatic 13/0 from identity 05                                            | no automatic 13/0, exempt or non-subject from identity 06/condition 13            | distinct source tax/eligibility policy below                             |

## What native validation proves and does not

`node audit/special-fec-native.mjs` builds the unchanged ordinary FEC source,
then mutates synthetic XML in audit-only memory. It uses the existing native
unsigned-XSD helper; the helper's structural placeholder is not a real signature.
Eight cases compare unchanged 2024/2026 schemas and clean temporary files.

Both 13% and zero/no-credit hypotheses pass native XSD for 05 and 06/13. So do
missing required foreign address/reference 16 and an invalid 06/condition 01
combination. The four-character issuer control fails both schemas. These
results show that XML shape is insufficient to choose tax treatment, prove
eligibility or enforce conditional identity/reference rules. They do not
establish any candidate as a correct special FEC producer. The first audit run
used invalid unit `Un`; native validation correctly rejected it, and the
corrected goods probe uses the actual `Unid` enumeration.

Nota 8/p. 71 separately defines code 08 used-goods factor and code 07 special
base. Nota 8.1/p. 72 separately distinguishes 0% with credit, exemption and
non-subject/no-credit. A no-VAT purchase example cannot select one of those XML
categories automatically. Reverse charge is not proof of deductibility or the
same financial event as later resale; no second sale/account effect is created.

## Proposed minimal source shapes, pending tax-case review

Preserve existing `ExactFecInputSchema`/ordinary builder as is. Add separate
special-case discriminators only after their exact rule mapping is reviewed:

- Foreign service source: actual supplier 05/number/name/foreign address; actual
  domestic buyer/activity/08 identity; actual foreign document type 16/reason 11,
  exact date/number/reason; explicit declared service lines and currency/payments.
  The caller must select an independently reviewed tax case, rather than the
  SDK deriving it from 05. A bounded ordinary-taxed 13% service candidate can
  reuse the existing exact kernel only if explicitly reviewed as that named
  case; it does not cover intangible classifications, exemptions, digital VAT
  already collected or every reverse-charge situation.
- Used-goods source: actual supplier 06, condition 13, actual good classification
  and evidence, exact amounts/currency; actual known supplier location if held.
  A future no-charge/non-subject source case needs a primary mapping of the
  required tax node/tariff/base/summary fields, not a guessed zero tariff. Do not
  transplant a reseller's factor/margin into the original acquisition.

Any input should bind explicit tax classification evidence/reference separately
from source syntax. No boolean can attest legal eligibility. Source arithmetic
may calculate an explicitly selected supported case, while app current authority,
qualification, period/exigibility/credit, original custody and institutional
acceptance remain separately gated. Missing classification must fail closed;
no implicit default or broad unvalidated mixed-rate money builder is proposed.

## Next concrete research/implementation decisions

Resolve the current primary reverse-charge and used-goods XML tax mappings with
applicable legal text plus an authoritative worked FEC example/validation rule.
The identity/reference/address guard is clear; publishing an unused partial
production validator before any usable tax-case API is not the deliverable.
Root review may approve one explicit ordinary-taxed foreign-service source
slice while the broader foreign/used-goods treatment matrix stays required/open.
No live provider calls, new credentials, app code, version or publication here.
FEC response party mapping also remains an independent live protocol oracle;
synthetic buyer signing and generic pinned response fixtures cannot establish it.

## Reviewed implementation boundary

Root approved the explicit named foreign-service ordinary IVA13 source on
`a1e0e1c64b6abc3a68ad324d512843a6d65dd82e`, after the research checkpoint.
The API/discriminator encode that selection rather than deriving it from05.
Actual supplier05/address/ref16/reason11, buyer08 and positive service allocations
are required. Only the existing monetary kernel and unchanged FEC monetary XML
projection are shared. A byte golden preserves the former domestic FEC output.
Used-goods06/13 has no production producer or loose unused validator here.
See [implemented contract](../../../docs/exact-foreign-service-fec.md).
