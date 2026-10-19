# Design: verify-signing-policy-digest #56

## Context

El motivo y el estado verificado al planificar están en `proposal.md` (Why).
Lo que condiciona la técnica:

- `scripts/spec-verify.mjs` corre en dos fases: primero valida la estructura
  del manifiesto acumulando `violations`, y solo cuando `violations.length === 0`
  entra al bucle que hashea cada vendorizado (líneas ~123-156). El bloque
  `policy` se valida hoy solo como strings no vacíos más `sourceSurface`
  (líneas ~65-80). `digestValue` no se recomputa nunca.
- `manifest.json` **no declara la ruta del PDF de la política**; sí declara
  `policy.identifier` (la URL del Anexo 2) y `files[]` con `path`, `sha256`
  (hex) y `vendored`.
- Existe ya en el repo una regla de normalización de nombres,
  `foldName()` (`scripts/spec-watch/lib/util.mjs`): NFKD, quita marcas,
  minúsculas, descarta lo no alfanumérico. Es la que `spec:check` usa para
  emparejar el enlace publicado de la política con su entrada del manifiesto.
  Verificado: `basenameOf(policy.identifier)` plegado da
  `resoluciongeneralsobredisposicionestecnicascomprobanteselectronicosparaefectostributarios.pdf`,
  idéntico al basename vendorizado plegado.
- `scripts/spec-verify.test.mjs` fija manifiestos sintéticos con
  `SPEC_VERIFY_SCHEMAS_DIR` sobre un directorio temporal (`manifestFor`,
  `entry`, `fixture`); su `policy` actual apunta a `https://cdn.example/policy.pdf`
  sin `sdkStatus` y no incluye ningún PDF de política.
- El SDK declara otra política por diseño (SHA-1/v4.1); eso ya está registrado
  en `policy.sdkStatus` y no es asunto de este cambio (ver Non-Goals).

## Goals / Non-Goals

**Goals:**

- Que `pnpm spec:verify` compruebe, sin red y sin escribir, que
  `policy.digestValue` es el SHA-256 en Base64 de los bytes vendorizados del
  documento de la política que `policy.identifier` publica.
- Cerrar `digestMethod` y `sdkStatus` a sus conjuntos conocidos, de modo que
  un valor nuevo o un typo no pase inadvertido.
- Que el chequeo sea ~gratis: sin I/O ni hashing adicionales por encima de los
  que el bucle existente ya hace.

**Non-Goals:**

- Tocar `shared/src/constants/xades-policy.ts` o cualquier constante del SDK.
- Exigir igualdad entre `policy.digestValue` y `XADES_POLICY_HASH` (la fase 3
  decide eso; aquí está prohibido por spec).
- Cambiar `manifest.json`, su esquema o `packages/sdk/schemas/README.md` más
  allá de documentar el chequeo nuevo.
- Ampliar el alcance a `spec:check` (gate online) — véase Open Questions.

## Decisions

**D1 — Localizar el PDF de la política por el nombre plegado de
`policy.identifier`, exigindo un único candidato.** De `policy.identifier` se
toma el último segmento (`basenameOf`, que percent-decodifica) y se pliega con
`foldName`; se busca el `files[]` con `vendored: true` cuyo basename plegado
coincida. Cero o más de un candidato es fallo que nombra `policy.identifier` y
la cantidad de candidatos: el gate nunca compara contra un archivo
indeterminado. `foldName`/`basenameOf` se **importan** de
`scripts/spec-watch/lib/util.mjs` en lugar de reimplementarse, para que
`spec:check` y `spec:verify` no puedan discrepar sobre qué archivo es la
política (el módulo es ESM plano sin efectos secundarios, seguro de importar
desde un script de Node).

Alternativas descartadas: (a) añadir `policy.path` al manifiesto — introduce un
campo de esquema nuevo, obliga a documentarlo y a garantizar que `spec:update`
lo preserve, y no resuelve nada que `identifier` no resuelva; (b) decodificar
`digestValue` a hex y buscar esa huella en `files[]` — circular: un
`digestValue` corrupto que apuntara a otro vendorizado pasaría el chequeo;
(c) comparar el basename literal — falla hoy mismo: el identifier trae acentos
y percent-encoding y el vendorizado es ASCII plegado.

**D2 — Una sola pasada de hash y dos codificaciones desde el mismo Buffer.**
El bucle ya lee cada vendorizado; se conserva un `Buffer` y se hashea una vez:
`createHash("sha256").update(bytes).digest()` → `buf.toString("hex")` para
`files[].sha256` (comportamiento existente, intacto) y
`buf.toString("base64")` para `policy.digestValue` (comportamiento nuevo).
No se llaman `digest("hex")` y `digest("base64")` por separado: `digest()` solo
admite una invocación por instancia, lo que obligaría a hashear dos veces o a
clonar el estado.

La comparación de `policy.digestValue` es de **strings exactos, sin
normalización**: Base64 estándar (alfabeto `A-Za-z0-9+/`, padding `=`,
44 caracteres), que es exactamente lo que produce `buf.toString("base64")`, lo
que hoy declara `manifest.json` y lo que imprime el Anexo 2 (evidencia de
planificación: 4 ocurrencias verificadas con `pdftotext` sobre el PDF
vendorizado — dato que puede cambiar si Hacienda republica el PDF, por eso
vive aquí y no en el contrato). La forma sin `=`
(43 caracteres, `DWxin1xWOel8…` con `l` minúscula) es la transcripción
errónea del INDENT: este chequeo tiene que rechazarla, no aceptarla, así que
no se quita padding ni se toleran dos formas. El Base64 URL-safe (`-`/`_`)
queda declarado fuera de alcance: no es el formato del Anexo 2 ni el del
manifiesto.

Alcance del contraste: es **auto-consistente**. Verifica que
`policy.digestValue` describe los bytes vendorizados; no valida contra el
valor que publica el Anexo 2 — hacerlo exigiría clavar en el gate una
constante externa que se volvería obsoleta en la próxima revisión del PDF
(ej. la de abril de 2026, `nextSet`). La coherencia con el Anexo 2 se
constata una sola vez, al vendorizar (fase 1.1, cambio
`vendorize-policy-and-code-tables`), y queda registrada en el README. El
supuesto restante —que nadie actualice a la vez `files[].sha256` y
`policy.digestValue` sobre un PDF ajeno al Anexo 2— es un problema de
revisión, no de gate: lo mismo vale hoy para `files[].sha256` y ningún
candado del árbol lo cubre.

**D3 — Validación cerrada de `digestMethod` y `sdkStatus`, con constantes en el
propio script.** `POLICY_DIGEST_METHOD = "http://www.w3.org/2001/04/xmlenc#sha256"`
y `POLICY_SDK_STATUSES = ["pending-sdk-migration", "aligned"]`. Un valor
fuera de conjunto es fallo que nombra el campo, el valor obtenido y los
admitidos — así el conjunto de `sdkStatus` queda en tres sitios coherentes
(spec, README y gate) en lugar de solo dos. Por qué cerrado y no "no vacío":
la distinción entre `pending-sdk-migration` y `aligned` es exactamente lo que
la fase 3 tendrá que cambiar; si el gate solo exigiera presencia, ese cambio
pasaría en silencio.

Tres precisiones de esta revisión: (a) `sdkStatus` es **requerido** — su
ausencia o valor vacío es fallo, con el mismo trato que `digestValue`: se
comprueba en la misma pasada de strings no vacíos y además se valida contra
el conjunto cerrado; el `manifest.json` real ya lo trae
(`pending-sdk-migration`), así que el gate no se pone en rojo por esto.
(b) La comparación de `digestMethod` es exacta y sensible a mayúsculas: en
XML Security la URI del algoritmo se trata como un identificador opaco y
completo — el fragmento `#sha256` forma parte del identificador y no se
separa ni se normaliza —, así que la constante se compara carácter por
carácter contra la del Anexo 2. Un `#SHA256` sería un fallo, no una variante
equivalente: si alguien «corrigiera» la constante pensando que el fragmento
no importa, el gate lo atrapa por la razón correcta. (c) Como `POLICY_SDK_STATUSES` es una constante
cerrada, agregarle un valor nuevo (p. ej. en la fase 3) exige actualizar gate,
spec y README **en el mismo commit**; si no, el fail-closed convierte ese
valor en un error inesperado.

**D4 — El SDK se referencia leyendo `sdkStatus`, no importando la constante.**
`spec-verify.mjs` no importa `shared/src/constants/xades-policy.ts` ni parsea
su texto. (i) El script es ESM plano y la constante es TypeScript: haría falta
una regex sobre el fuente o leer `shared/dist`, y esto último acoplaría
`spec:verify` al build del SDK (el gate corre antes de generar artefactos).
(ii) La spec prohíbe exigir igualdad, así que leerla no añade seguridad.
(iii) Cualquier aserción del tipo "la constante todavía diverge" habría que
invertirla en la fase 3, duplicando el trabajo de esa migración. La divergencia
ya está registrada y ahora también validada vía `policy.sdkStatus`.

**D5 — El chequeo vive dentro de la validación de `policy` y dentro del bucle
de hashing existente.** Así hereda el guard `violations.length === 0`: si la
estructura del manifiesto ya es inválida no se intentan leer bytes, misma
semántica que hoy. Los mensajes siguen la convención
`spec:verify: <ruta|campo>: <esperado> vs <obtenido>` más el `REMEDY` actual,
nombrando `policy.digestValue`, `policy.digestMethod`, `policy.sdkStatus` o
`policy.identifier` según el fallo.

El `REMEDY` global («revisa git diff; si el cambio es legítimo, ejecuta
`pnpm spec:update`») se conserva en todos los casos — la spec lo exige en todo
fallo —, pero los modos de fallo nuevos (digest divergente, `digestMethod`
desconocido, `sdkStatus` inválido o ausente, política no localizable) añaden
una línea propia cada uno,
porque el remedio genérico no los arregla: verificado en
`scripts/spec-watch/lib/update-core.mjs`, `spec:update` reescribe bytes de
`files[]` y sus hashes, pero **nunca recalcula `policy.*`**. El matiz por caso:
`digestValue` divergente → recalcular el digest del PDF vendorizado y ponerlo
en el manifiesto (o restaurar el PDF, si el reemplazo no era intencional);
`digestMethod` desconocido → corregirlo contra la URI del Anexo 2;
`sdkStatus` desconocido o ausente → corregirlo contra los valores admitidos en
el README; política no localizable → revisar que `policy.identifier` y el
basename vendorizado sigan describiendo el mismo documento.

**D6 — El fixture del test se amplía; los chequeos nuevos se prueban uno a
uno.** `manifestFor` necesita `sdkStatus`, un `policy.identifier` cuyo nombre
plegado corresponda a un `policy.pdf` incluido en `files[]`, y un
`digestValue` que sea el Base64 real de ese contenido (44 caracteres con `=`,
`I` mayúscula en el índice 10 con base 0 — la undécima letra, la forma del
Anexo 2, no la del INDENT) — sin eso, los tests que
esperan salida 0 dejarían de pasar no porque el gate esté mal, sino porque el
manifiesto sintético dejó de ser representativo. Se añade además un caso por
modo de fallo (digest divergente, `digestMethod` desconocido, `sdkStatus`
ausente o vacío, `sdkStatus` fuera de conjunto, política no localizable)
esperando salida ≠ 0 y el mensaje nombrando el campo, y **dos casos felices
en total**: el básico, con el identifier abstracto
`https://cdn.example/policy.pdf` y su `policy.pdf` en `files[]`; y un segundo
—otra invocación del mismo `manifestFor` parametrizado por el bloque
`policy`— cuyo `policy.identifier` va percent-encoded — como el real del Anexo 2
(`Resoluci%C3%B3n_General_…`) — para ejercitar `basenameOf` + `foldName` en
la cadena completa. Ese segundo caso **no** reutiliza el `policy.pdf` del
primer fixture: su `files[]` trae el archivo con el nombre vendorizado en su
forma ASCII (`Resolucion_General_…_tributarios.pdf`, igual que el árbol real),
de modo que decodificar el identifier y plegar ambos lados da la misma cadena
— si el percent-decoding se rompiera, ese test lo detecta, y si se rompiera
el plegado, también. El `manifest.json` real sí pasa: verificado al planificar,
su digest ya coincide.

## Risks / Trade-offs

- [Ampliar el fixture para que pase enmascara una regresión] → cada modo de
  fallo nuevo tiene su propio test con salida ≠ 0, y el caso feliz se ejecuta
  además contra el árbol real en `pnpm verify`, no solo contra el temporal.
- [El nombre del `policy.identifier` deja de plegar al vendorizado y el gate
  se pone en rojo] → es el resultado correcto (fail-closed): el mensaje nombra
  `policy.identifier`; el remedio es revisar `git diff` / `pnpm spec:update`,
  nunca silenciar el chequeo.
- [Importar de `spec-watch/lib/util.mjs` acopla el gate al módulo de red] → el
  módulo es puro y sin dependencias externas; el acoplamiento es deseado
  (regla única de plegado) y se cubre cargándolo en los tests del script.
- [Gate más estricto rompe trabajo en curso] → el árbol actual ya pasa; solo
  se ven afectados los cambios que toquen el manifiesto o el PDF de la
  política, que es justamente a lo que apunta el candado.
- [Coste añadido a `pnpm verify`] → cero I/O extra: se reutiliza el buffer ya
  leído y se añade una comparación de strings.

## Migration Plan

1. Ampliar el fixture de `scripts/spec-verify.test.mjs` y añadir un test por
   modo de fallo nuevo (rojos).
2. Implementar D1-D5 en `scripts/spec-verify.mjs` (verdes).
3. Documentar el chequeo en `packages/sdk/schemas/README.md` y
   `docs/testing.md`.
4. `pnpm verify` completo en verde en un checkout limpio.

**Rollback**: revert del PR. No hay estado persistido, ni migración de datos,
ni cambio en paquetes publicados; el gate vuelve a su alcance anterior.

## Open Questions

Ninguna que altere specs, enfoque o desglose.

- Diferido fuera de este cambio: si `spec:check` (gate online) debería
  contrastar además `policy.digestValue` contra los bytes que descarga del
  CDN. Toca el requisito de `spec:check`, no el de `spec:verify`, y por eso
  queda fuera; puede proponerse como cambio aparte.
