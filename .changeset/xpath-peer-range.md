---
"@dojocoding/hacienda-sdk": patch
---

Pin `xpath` to `^0.0.35` so it satisfies the `xml-core@3` peer range (`^0.0.34 || ^0.0.35`) pulled in by xadesjs/xmldsigjs 3. With `^0.1.0`, npm consumers could hit an ERESOLVE peer conflict.
