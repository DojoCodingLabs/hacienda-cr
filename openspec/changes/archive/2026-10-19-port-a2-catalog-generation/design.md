## Context

Ver `proposal.md` — Why. `main` tiene los catálogos a mano en `shared/src/constants/`; la
línea local los genera en `shared/src/generated/` desde `codes.json` con un registro de
parejas explícito y dos candados (deriva y literales). `main` publica además aliases
deprecados (`COMPRA_PAGO`, `GASTO_VIAJE`) y códigos de estado/situación que el generador
no emite.

## Goals / Non-Goals

**Goals:**

- Una sola fuente de verdad para los valores de catálogo: el árbol generado.
- Preservar byte a byte la API pública de `main`, incluidos los aliases.
- Instalar el candado de literales sobre el árbol vigente.

**Non-Goals:**

- Regenerar `codes.json` o tocar los XSD vendorizados.
- Introducir `names.json`.
- Cambiar los valores de ningún catálogo (salvo las correcciones sancionadas ya decididas).

## Decisions

| Decisión                                                                  | Racional                                                                                | Alternativas consideradas                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **`constants/` queda como fachada, `generated/` es la fuente**            | Elimina la doble verdad sin romper los imports públicos de `main`                       | Borrar `constants/` y migrar los 13 importadores (más riesgo, mismo resultado) |
| **Los aliases se conservan a mano y se declaran en el registro**          | `COMPRA_PAGO`/`GASTO_VIAJE` son API pública deprecada; el generador no debe inventarlos | Emitirlos desde el generador (contamina el catálogo con alias)                 |
| **Candado de literales instalado sobre `main` con allowlist por archivo** | El review pide el candado; `main` hoy no lo tiene                                       | Dejar el candado sólo en la línea local (no cumple)                            |
| **La paridad excluye aliases explícitamente**                             | Un alias no es un desvío de valor: apunta al canónico                                   | Tratar el alias como corrección sancionada (confunde alias con desviación)     |
| **Correcciones sancionadas con cita + Changeset**                         | Es la regla ya escrita en la spec y el review la exige                                  | Reescribir `main` a mano (destruye la trazabilidad)                            |

## Risks / Trade-offs

- **[Riesgo: candidatos de alias]** → el registro declara la lista de aliases; la prueba de paridad falla si un alias no está declarado.
- **[Riesgo: el candado rompe el lint de `main`]** → primero se migran los literales existentes o se listan en el allowlist con motivo, en el mismo PR.
- **[Riesgo: `codes.json` de `main` tiene el set 2026 y el generado local el 2024]** → el generador debe regenerar contra el `codes.json` vigente de `main`, no contra el local.
- **[Riesgo: `spec:generate` escribe fuera del allowlist de `files` del paquete]** → `shared/src/generated/**` es fuente de `shared`, no artefacto publicado; verificar el tarball.

## Desviaciones encontradas al portar sobre `main`

El port se hizo rebasando el trabajo del generador (PR #57) sobre el `main` vigente. Tres cosas no se caben en el diseño original y quedan registradas aquí:

1. **Dos archivos de `main` importaban catálogos migrados por la ruta vieja.**
   `shared/src/schemas/exact-fe.ts` (CURRENCY_CODES) y `shared/src/schemas/history.ts`
   (tipo `IdentificationType`) importaban desde `../constants/index.js`, que ya no los
   publica. Se apuntaron al árbol generado, como los otros ocho archivos del paquete.
   La tarea 2.4 ("los importadores siguen compilando sin cambios") se cumple para los
   trece importadores del momento del diseño; los dos de `main` son posteriores.

2. **El candado de literales alcanza a `main` entero, no sólo a la línea vieja.**
   El árbol vigente traía 181 literales de 1-2 dígitos fuera de la carpeta generada. Los
   de catálogo se migraron a las constantes (tipos de documento en los siete
   constructores y en `document-identity.ts`, tarifas IVA transitorias y el código de
   referencia 17 en `validator.ts`, códigos de mensaje del receptor en
   `response-verifier.ts`; el 17 obtuvo además una constante curada,
   `CODIGO_REFERENCIA_PAGO_COMPROBANTE`). Los que **no** son códigos de catálogo
   (ceros de relleno de `padStart`/`padEnd`) y los del **camino exacto** —caso
   cerrado y revisado, con literales que son hechos declarados del caso y bytes
   fijados por el baseline publicado— van al allowlist con su motivo. El camino
   exacto es el candidato principal para la siguiente fase del candado.

3. **El orden de las claves de `SaleCondition` cambia; los valores no.**
   La comparación export por export entre el `main` previo y el árbol portado da
   _ningún_ valor distinto (orden-insensible) y _ningún_ export perdido; sólo cambia
   el orden de las claves del objeto. `DocumentTypeCode` conserva los códigos
   corregidos de `main` (FEC `08`, FEE `09`, REP `10` y las confirmaciones `05`-`07`),
   no los del catálogo viejo de la línea de trabajo.
