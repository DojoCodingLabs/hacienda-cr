# Tasks: add-codes-generation

## 1. Generador y registro de parejas

- [x] 1.1 Sembrar `scripts/codes-generate/table-map.mjs` (D2) con un emisor
      de un solo uso `scripts/codes-generate/bootstrap-table-map.mjs` que lea
      las tablas actuales desde el barrel construido de `shared` y emita, por
      cada pareja, la `tableKey` (validada contra `codes.json`, fallo si no
      existe), el nombre de exportación y el mapa completo `{ código → CLAVE }`,
      con `namesFrom: null` en todas. Al sembrar `TipoMedioPago`, verificar
      que las 7 variantes por tipo de documento siguen idénticas en
      `codes.json` (si difieren, detenerse y reportar cuál emparejar — no
      elegir a ciegas). Revisar el diff del mapa sembrado y borrar el emisor
      (era de un solo uso)
- [x] 1.2 Implementar `scripts/codes-generate/generate.mjs` (D3–D5) con dos
      modos: completo (invocar `codes:extract`) y `--no-extract` (leer el
      `codes.json` commiteado sin extraer y sin modificar `codes.json`,
      tolerante a la ausencia de `pdftotext`). En ambos: validar la paridad
      código↔clave en **ambos** sentidos (fallo con código ≠ 0 nombrando
      tabla y código), renderizar un archivo por exportación + barrel en
      orden alfabético con cabecera `NO EDITAR` en la primera línea
      (escritor `pnpm spec:generate`, fuentes citadas), formatear con la
      config de prettier resuelta **desde la ruta destino** y escribir solo
      tras generación exitosa
- [x] 1.3 Cablear la entrada opcional `packages/sdk/schemas/names.json`
      (D10, R7): ausente → no generar `*_NAMES` y emitir informe de tablas
      pendientes de pareja/nombre con exit 0; presente → generar `*_NAMES`
      desde él y fallar nombrando tabla y código si falta un nombre
- [x] 1.4 Añadir `"spec:generate": "node scripts/codes-generate/generate.mjs"`
      a `package.json` y verificar, en ambos modos: doble corrida idempotente
      (segunda sin cambios); en modo completo, que una extracción fallida
      (manifiesto inválido) no deja escritura parcial ni en `codes.json` ni
      en `shared/src/generated/`; en `--no-extract`, que un `codes.json`
      ilegible termina con código distinto de cero sin escribir nada

## 2. Generación, paridad y migración de la API

- [x] 2.1 Ejecutar `pnpm spec:generate` y commitear `shared/src/generated/**`
      (un archivo por export + `index.ts`, D4); añadir
      `export * from "./generated/index.js";` a `shared/src/index.ts` sin
      duplicar nombres con el barrel de `constants` (D1)
- [x] 2.2 Adelgazar `shared/src/constants/*`: eliminar las tablas de códigos
      migradas (los 12 exports con pareja exacta: `PaymentMethod`,
      `SaleCondition`, `TaxCode`, `IvaRateCode`, `MensajeReceptorCode`,
      `SituationCode`, `IdentificationType`, `ProvinceCode`, `CURRENCY_CODES`,
      `DISCOUNT_CODES`, `OTHER_CHARGE_TYPES`, `EXONERATION_INSTITUTIONS`)
      conservando `*_NAMES`, los mapas derivados
      (`IVA_RATE_PERCENTAGES`, `IDENTIFICATION_LENGTHS`, subconjuntos `REP_*`),
      los exports **sin pareja** (`UNITS_OF_MEASURE` y `UnitOfMeasure` por la
      deriva U+03A9/U+2126 decidida; `CurrencyCode` acceso curado,
      `DocumentTypeCode`, `REFERENCE_*`, `ExonerationType`), `XADES_*` y
      entornos; ajustar `constants/index.ts` a la curaduría
      restante y **buscar y corregir los imports internos** de las tablas
      migradas (`grep -rn 'from ".*constants/' shared/src packages/*/src`),
      que deben apuntar al barrel generado (typecheck/build son la red final;
      rutas internas, superficie pública vía barrel intacta)
- [x] 2.3 Escribir la prueba de congelación `shared/src/generated-parity.spec.ts`
      (D6) con los **mapas completos** esperados HOY de cada tabla
      reemplazada, inline (~709 pares), sembrados por un emisor de un solo
      uso que lee el barrel construido de `shared` (verificar a ojo una
      muestra conocida, p. ej. `PaymentMethod.TARJETA` y
      `ProvinceCode.SAN_JOSE`, y borrar el emisor); dejarla en verde y, como
      verificación manual del desarrollo — no una prueba commiteada —, mutar
      un valor para confirmar que la suite rompe y restaurar
- [x] 2.4 Confirmar que `pnpm exec turbo run lint typecheck build test` pasa en
      `shared`, `sdk` y adapters sin tocar imports de consumidores (los
      imports públicos siguen vía `@dojocoding/hacienda-shared`)

## 3. Candado 2: regla de lint

- [x] 3.1 Añadir la regla a `eslint.config.mjs` (D8): `no-restricted-syntax`
      con `Literal[value=/^\d{1,2}$/]` y mensaje que apunte a la constante
      generada; excepciones comentadas: `shared/src/generated/**`,
      `**/*.spec.ts` y `packages/sdk/src/api/error-codes.ts` (catálogo de
      rechazos de la API, no-XSD; candidato a fase futura), más la
      documentación de las exclusiones del candado con su motivo (códigos de
      ubicación con puntos, monedas de tres letras)
- [x] 3.2 Ejecutar el lint nuevo sobre todo el codebase y resolver **cada**
      hallazgo de forma explícita: reemplazar por la constante generada
      (p. ej. `packages/sdk/src/xml/validator.ts:295` usa `"02"` →
      `SaleCondition.CREDITO`) o registrar la excepción justificada en la
      config; ningún literal de código de uno o dos dígitos de catálogo puede
      quedar en negocio sin decisión documentada
- [x] 3.3 Escribir la prueba del candado (R5) que importe la regla **del
      config real** y la ejecute con `Linter` sobre tres fixtures: literal
      `"02"` en ruta de negocio → 1 error; el mismo dentro de
      `shared/src/generated/` → 0; el mismo en el archivo con allowlist → 0

## 4. Candado 1: deriva en la verificación

- [x] 4.1 Añadir a `scripts/verify.mjs` (D7), tras `spec:verify`, los pasos
      `pnpm spec:generate -- --no-extract` y `git diff --exit-code --
    shared/src/generated`, con mensajes que distingan «la generación
      falló» (fallo del paso de generación; no se ejecuta el diff) de «la
      regeneración produjo diff» (indicando regenerar y commitear)
- [x] 4.2 Probar los escenarios del candado: árbol en sincronía → verify
      continúa; edición manual de un generado (o un `codes.json` que produzca
      otro TypeScript) → verify falla nombrando las rutas divergentes;
      archivos modificados fuera de `shared/src/generated/` → el candado
      pasa; generación fallida (p. ej. `codes.json` ilegible) → verify nombra
      el fallo de generación y no ejecuta el diff. Medir y anotar en el PR el
      tiempo que el candado añade a `pnpm verify` (esperado < 2 s)
- [x] 4.3 Revisar que `ci.yml` no necesita cambios para este candado (CI ya
      corre `pnpm verify` y el modo `--no-extract` no exige binarios) y
      dejar constancia en el PR de que el candado queda activo en CI; anotar
      además la deuda del stack: la prueba de frescura del extractor sí
      invoca `pdftotext` real al correr en CI, y declarar esa dependencia
      (runner o instalación explícita de `poppler-utils`) corresponde al
      retarget de #51–#53

## 5. Release y verificación final

- [x] 5.1 Crear el Changeset nombrando los cuatro paquetes `@dojocoding/*`
      (`shared`: `minor`, dueño del cambio; `sdk`, `cli`, `mcp`: `minor`, solo
      reempaquetan) con la decisión semver explícita (D9): aditivo, API
      existente byte-idéntica por la prueba de congelación, catálogos nuevos
      solo suman; anotar que cambiar nombre o valor de un export existente
      sería `major` y que el grupo `linked` mantiene la versión sincronizada
- [x] 5.2 `pnpm verify` completo en verde en un checkout limpio (format,
      spec:verify, los dos candados, turbo lint/typecheck/build/test, tests
      de scripts y de paquetes)
- [x] 5.3 Revisar y actualizar solo lo que contradiga el nuevo flujo:
      `shared/README.md` (sección de constantes/exportaciones: qué tablas son
      generadas y cabecera `NO EDITAR`), `packages/sdk/schemas/README.md`
      (sección de `codes.json`: origen, frescura y `pnpm spec:generate`),
      `docs/testing.md` (los dos candados en `verify.mjs` y el modo
      `--no-extract`) y `AGENTS.md` (mención de `spec:generate` en el flujo
      de verificación); formatear los ficheros tocados
- [x] 5.4 `openspec validate --strict` en verde y estado del cambio listo
      para archivar tras el PR
