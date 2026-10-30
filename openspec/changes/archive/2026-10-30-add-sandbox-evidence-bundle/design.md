## Context

El runner actual (`scripts/validate-sdk-sandbox.mjs`) ya preserva archivos, pero no los liga ni los verifica. `sdkFetch` recibe `init.body` (el string exacto que `http-client.ts` envía), por lo que capturar el cuerpo byte-a-byte no requiere cambiar el SDK: basta con hashear y persistir `init.body` en el interceptor. La firma y el XML no firmado ya se escriben como archivos; falta el `manifest.json` y el comando `verify`.

**Naming a verificar en apply (Task 0.1):** confirmar si el runner escribe `validation-signature.json` (con los hashes) y `validation-signed.xml` (con el XML firmado), o si usa otros nombres (`signed.xml`, `signature.json`). Ajustar D2 y el `verify` para usar los nombres reales, o introducir renombrado explícito. Si el runner no escribe ningún archivo de firma, `signatureHash` se elimina del manifest y `signedXmlHash` se usa como suficiente.

Ver `proposal.md` - Why para la motivación.

## Goals / Non-Goals

**Goals:**

- Hacer que un directorio de run sea un bundle auto-verificable sin red.
- Clasificar el resultado con una clase explícita y honesta.
- Mantener el runner como herramienta interna (sin cambios al SDK ni al shared).

**Non-Goals:**

- No resolver el 403 del gateway ni cambiar endpoints.
- No agregar firma nueva ni re-enviar documentos en `verify`.
- No modificar `packages/*` ni publicar cambioset.

## Decisions

### D1: Cuerpo exacto vía `init.body` del interceptor

`sdkFetch(input, init)` ya recibe `init.body` como string (el SDK envía `JSON.stringify(body)`). Se hashea con SHA-256 y se persiste el string crudo en `request.body.json` (sin newline, modo `0600`, flag `wx` para exclusividad). Se descarta la escritura pretty-printed actual de `validation-request.json` como fuente de verdad; se mantiene `request.pretty.json` como vista derivada siempre (decisión: Opción B — ayuda a inspección humana del manifest sin requerir herramientas de parseo; coste ~1 KB por run).

Alternativa considerada: re-serializar en el runner con `JSON.stringify(request)` — descartada porque depende de que el orden de claves coincida con el SDK; el interceptor ya tiene los bytes reales.

### D2: `manifest.json` con cadena de hashes

El manifest se escribe al final del intento (después de obtener la respuesta, o del error). Contiene:

```json
{
  "formatVersion": 1,
  "environment": "sandbox",
  "clave": "506...",
  // identityHash eliminado: la clave ya está en texto en el manifest y verify
  // la lee de ahí. bundleFingerprint no se introduce (decisión R2: Opción A)
  // para no añadir cambios de naming de directorios no justificados.
  "documentType": "01",
  "links": {
    "invoiceHash": "sha256(invoice.json bytes)",
    "unsignedXmlHash": "sha256(unsigned.xml bytes)",
    "signedXmlHash": "sha256(signed.xml bytes)",
    "requestBodyHash": "sha256(request.body.json bytes)",
    "comprobanteXmlHash": "sha256(base64decode(request.comprobanteXml))",
    "responseBodyHash": "sha256(raw receipt body)",
    "signatureHash": "sha256(validation-signature.json bytes)"
  },
  "missing": [{ "field": "signedXmlHash", "reason": "sign() failed: PIN inválido" }],
  "outcome": {
    "class": "ACCEPTED|REJECTED|TRANSPORT_BLOCKED|PENDING|INVALID_LOCAL",
    "httpStatus": 403,
    "gatewayErrorType": "IncompleteSignatureException",
    "requestId": "...",
    "cfRay": "...",
    "observedAt": "ISO8601 con zona horaria explícita (Z o -06:00 para America/Costa_Rica)"
  }
}
```

(ver Task 0.2 para verificar el naming real)

`missing` es un array vacío en manifests completos; contiene entradas solo cuando `outcome.class: INVALID_LOCAL` y algún artefacto no se generó. `signatureHash` se calcula sobre `validation-signature.json` si existe; si el runner no produce ese archivo, se elimina `signatureHash` del manifest y `signedXmlHash` se usa como suficiente (ver Task 0.1 para verificar el naming real).

`formatVersion` permite que `verify` rechace bundles de versiones futuras con mensaje claro. Bundles `formatVersion: 1` producidos por este change siguen siendo válidos si el formato cambia en el futuro (compatibilidad hacia atrás). La política de migración se difiere hasta el primer cambio de formato.

El `comprobanteXmlHash` se calcula decodificando el base64 del cuerpo transmitido y hasheando el resultado; debe coincidir con `signedXmlHash`. Esa es la prueba de que el request contiene exactamente la firma.

### D3: Clase de resultado derivada, no declarada

La clase se deriva de los artefactos, no se pide al operador:

- `ACCEPTED`: Hacienda devuelve `aceptado`.
- `REJECTED`: Hacienda devuelve `rechazado` con motivo.
- `PENDING`: `recibido`/`procesando` tras agotar polling.
- `TRANSPORT_BLOCKED`: cualquier error HTTP de red/gateway (4xx de gateway, 5xx, timeout, DNS, TLS) o `ApiError` sin respuesta fiscal.
- `INVALID_LOCAL`: fallo de validación local o XSD antes de enviar.

La distinción `TRANSPORT_BLOCKED` vs `INVALID_LOCAL` se toma del código de salida HTTP y del tipo de error: un `ApiError` con `statusCode` presente y cuerpo no fiscal → transporte; un throw local antes del POST → local.

### D4: `verify` reutiliza el mismo código de hash

`verify <dir>` lee `manifest.json`, re-calcula cada hash sobre los archivos actuales, comprueba la cadena y los segmentos de la clave, e imprime una línea por check (`OK`/`FAIL <detalle>`). Código de salida 0 si todos OK, 1 si alguno falla. No toca la red ni el SDK más allá de leer archivos.

Checks:

1. `invoiceHash` == sha256(invoice.json)
2. `unsignedXmlHash` == sha256(unsigned.xml)
3. `signedXmlHash` == sha256(signed.xml)
4. `requestBodyHash` == sha256(request.body.json)
5. `comprobanteXmlHash` == sha256(base64decode(request.body.comprobanteXml))
6. `comprobanteXmlHash` == `signedXmlHash`

> **Nota (premisa a verificar en apply):** los checks 5 y 6 asumen que `signed.xml` es byte-idéntico al `comprobanteXml` del request. Verificar que el SDK no reformatea el XML entre `sign()` y el POST (consultar `orchestrator.ts` / `submit()`). Si reformatea (indentación, newlines, normalización de whitespace), el bundle debe extraer el XML del request en lugar de usar el de `sign()`, o el check debe relajarse a comparación semántica.

7. clave segmentos: `clave.slice(9,21)` == `emisor.identificacion.numero.padStart(12,'0')` y `clave.slice(21,41)` == `numeroConsecutivo`
8. `outcome.class` coherente con artefactos

- ACCEPTED ⇒ validation-result.status === 'aceptado'
- REJECTED ⇒ status === 'rechazado' (o presencia de motivo).
- PENDING ⇒ status ∈ {'recibido', 'procesando'}.
- INVALID_LOCAL ⇒ status no fiscal (o ausencia de response fiscal).
- TRANSPORT_BLOCKED ⇒ sin respuesta fiscal

9. Si missing no está vacío: cada entrada debe referenciar un campo que efectivamente es null en links, y el outcome.class debe ser INVALID_LOCAL. verify reporta "INCOMPLETE" pero no falla el exit code (ver Error 3 en revisión anterior).

### D5: Sin cambios al SDK

El interceptor ya expone `init.body`. No se toca `http-client.ts`, `orchestrator.ts` ni el shared. El runner sigue importando de `packages/sdk/dist/index.js`.

### D6: Exclusividad y atomicidad

`request.body.json` y `manifest.json` se escriben con `flag: "wx"` (creación exclusiva), igual que los demás, para que un segundo intento sobre el mismo directorio falle antes de sobrescribir. El manifest se escribe al final; si el proceso cae antes, el directorio queda sin manifest y `verify` falla con "manifest missing" (estado recuperable vía `status`, subcomando existente en línea 172 del runner).

**Bundles parciales (fallas controladas):** si el intento falla antes de completar todos los artefactos (validación local, firma, captura de request), se escribe igualmente `manifest.json` con `outcome.class: INVALID_LOCAL` y los hashes que se hayan podido calcular; los que falten se escriben como `null` con el motivo en un campo `missing`. `verify` rechaza un bundle con hashes `null` como "incompleto" pero acepta el registro como evidencia parcial de `INVALID_LOCAL`.

## Risks / Trade-offs

- [Risk] El cuerpo capturado por `sdkFetch` es el que el SDK envía, pero si el SDK cambia su serialización, el hash cambia. → Mitigation: el hash se calcula sobre los bytes reales, no sobre una expectativa; `verify` sigue siendo válido.
- [Risk] `init.body` podría ser `undefined` en GETs. → Mitigation: solo se persiste cuando `method === 'POST'` y `init.body` está definido.
- [Risk] El verificador no puede comprobar la firma criptográficamente sin el certificado. → Mitigation: `verify` comprueba la cadena de hashes y la identidad; la verificación criptográfica sigue siendo responsabilidad de `sign`/XSD, ya cubierta offline.
- [Risk] Clasificar `TRANSPORT_BLOCKED` requiere distinguir un `ApiError` fiscal de uno de gateway. → Mitigation: se usa `statusCode` y la presencia de `responseBody` con campos fiscales (`ind-estado`, `respuesta-xml`); si no hay respuesta fiscal, es transporte.

## Migration Plan

No aplica: herramienta interna, sin consumidores publicados. Los runs previos (sin manifest) siguen siendo válidos como evidencia parcial; `verify` reportará "manifest missing" y el operador puede re-ejecutar o documentar el estado.

## Open Questions

- Ninguna que cambie specs o approach. La clasificación de un `ApiError` con `statusCode` 4xx se trata como `TRANSPORT_BLOCKED` salvo que: (a) el cuerpo contenga `ind-estado`/`respuesta-xml` (respuesta fiscal), o (b) el header `X-Error-Cause` esté presente (rechazo fiscal con motivo). En ambos casos (a) y (b), se reclasifica como `REJECTED`. Un 4xx sin ninguna de las dos señales es `TRANSPORT_BLOCKED`. Esta regla queda fijada en la implementación y se cubre con la matriz de Task 2.5.
