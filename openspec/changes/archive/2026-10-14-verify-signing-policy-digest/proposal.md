# Proposal: verify-signing-policy-digest

## Why

`pnpm spec:verify` recomputa SHA-256 en hexadecimal de cada archivo vendorizado
y lo compara con `manifest.files[].sha256`, pero **nunca** recomputa el
`manifest.policy.digestValue` que ese mismo archivo dice describir: hoy basta
con que `policy.digestValue` sea un string no vacío para pasar el gate. Un
valor editado a mano, truncado o proveniente de un PDF distinto al vendorizado
pasa inadvertido, y ese valor es exactamente el que la firma XAdES-EPES tiene
que llevar (INDENT 5.7, 11.3, 9 — última fila). El candado existe para el
árbol, pero el campo más delicado del manifiesto queda fuera de él.

Estado verificado al planificar: el PDF de la política ya está vendorizado en
`packages/sdk/schemas/2024/v4.4/` (fase 1.1) y su SHA-256 en Base64,
`DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`, coincide exactamente con
`manifest.policy.digestValue`. Ojo con los caracteres: en el índice 10 con
base 0 (la undécima posición) hay `I` mayúscula y el valor lleva `=` final
(44 caracteres) — es la forma que
imprime el Anexo 2 y la única que el gate aceptará. La cita
del INDENT (`DWxin1xWOel8…`, con `l` minúscula en esa posición y 43
caracteres sin `=`) es un error conocido del propio INDENT, documentado en
`packages/sdk/schemas/README.md`; el valor del manifiesto es el impreso en el
PDF. Como el PDF coincide, estamos en el caso «coincide»: el alcance es
agregar el chequeo al gate offline, no corregir nada.

## What Changes

- **`scripts/spec-verify.mjs` gana el chequeo del digest de la política**: una
  sola pasada de SHA-256 sobre los bytes del PDF de la política vendorizado,
  emitida también en Base64 y comparada contra `manifest.policy.digestValue`.
  El gate falla con código ≠ 0 nombrando el valor esperado y el obtenido.
  Las comparaciones hexadecimales existentes por archivo no cambian.
- **Validación cerrada ampliada del bloque `policy`**: además de
  `identifier`/`digestMethod`/`digestValue`/`sdkStatus` no vacíos — `sdkStatus`
  pasa a ser obligatorio: su ausencia es fallo, con el mismo trato que
  `digestValue` —, el gate comprueba que `digestMethod` sea la URI SHA-256 de
  XML-ENC que el Anexo 2 declara (comparación exacta, sensible a mayúsculas) y
  que `sdkStatus` pertenezca al conjunto de valores conocidos
  (`pending-sdk-migration`, `aligned`). Hoy ninguno de los dos se valida.
- **El SDK se referencia en solo lectura**: el gate no exige que
  `XADES_POLICY_HASH` (`shared/src/constants/xades-policy.ts`) sea igual al
  digest v4.4, porque esa constante es SHA-1 sobre la política v4.1 **por
  diseño** hasta la fase 3 (`policy.sdkStatus: pending-sdk-migration`). Se
  informa el estado, no se compara igualdad; **no se corrige ninguna
  constante**.
- **Pruebas del gate**: `scripts/spec-verify.test.mjs` cubre los nuevos modos
  de fallo (digest Base64 divergente, `digestMethod` desconocido, `sdkStatus`
  ausente o fuera del conjunto), el caso feliz y un caso con
  `policy.identifier` percent-encoded — la forma del Anexo 2 — que plegado
  debe localizar el PDF de la política.
- **Documentación**: `packages/sdk/schemas/README.md` y `docs/testing.md`
  describen el chequeo nuevo dentro de `spec:verify`.

Fuera de alcance: cualquier escritura en
`shared/src/constants/xades-policy.ts`, la migración de política del firmador
(fase 3), un Changeset para paquetes publicados y cualquier validación en
sandbox — ninguno de los tres se activa por este cambio.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `spec-integrity`: el requisito de `spec:verify` añade tres condiciones de
  fallo — digest Base64 de la política recomputado desde el PDF vendorizado y
  contrastado con `policy.digestValue`, `policy.digestMethod` restringido a la
  URI SHA-256 declarada, y `policy.sdkStatus` restringido a los valores
  conocidos — y el requisito del bloque `policy` queda explícito en que esa
  correspondencia la hace cumplir el gate offline, no solo la constatación en
  el momento de vendorizar.

## Impact

- **Código**: `scripts/spec-verify.mjs` (chequeo nuevo),
  `scripts/spec-verify.test.mjs` (regresiones).
- **Gate**: `pnpm spec:verify` y, por ser paso de `pnpm verify`, CI — más
  estrictos; el árbol actual ya pasa, así que ningún trabajo en curso se
  rompe.
- **Documentación**: `packages/sdk/schemas/README.md`, `docs/testing.md`.
- **Paquetes publicados**: sin cambios de comportamiento; `scripts/` no se
  publica, por lo que **no requiere Changeset**.
- **Sin red y sin escritura**: el chequeo usa los bytes ya vendorizados.
