# Tasks: verify-signing-policy-digest

## 1. Pruebas del gate (rojas)

- [x] 1.1 Ampliar `manifestFor` en `scripts/spec-verify.test.mjs` (D6) para que
      el manifiesto sintético siga siendo representativo: parametrizar el
      helper con el bloque `policy`, que hoy está hardcodeado (`identifier`,
      nombre del archivo candidato y su contenido), de modo que cada caso sea
      una invocación del mismo helper y no un fixture paralelo. Además: añadir
      `sdkStatus: "pending-sdk-migration"`, hacer que `policy.identifier`
      apunte a un `policy.pdf` incluido en `files[]` (nombre plegado
      coincidente) y fijar `digestValue` como el SHA-256 en Base64 real de su
      contenido, en la forma exacta que exige D2: 44 caracteres **con** `=`
      final y `I` mayúscula en el índice 10 con base 0 (la undécima letra:
      la forma del Anexo 2; la del
      INDENT, `WOel8…` sin `=`, debe fallar, no pasar). Confirmar que los
      tests existentes conservan sus mismos
      códigos de salida esperados — no se debilita ninguna aserción. Si
      ampliar el fixture cambiara el resultado esperado de algún test
      existente, detenerse y reportar cuál y por qué; no «arreglar» el test
      cambiando su expectativa
- [x] 1.2 Añadir un test por cada modo de fallo nuevo, con salida ≠ 0 y
      mensaje que nombra el campo: (a) `policy.digestValue` divergente, en sus
      dos variantes — el campo editado a mano y el PDF sustituido por bytes
      distintos —, incluida la forma sin `=` (43 caracteres, la del INDENT);
      (b) `policy.digestMethod` distinto de la URI SHA-256 de
      XML-ENC; (c) `policy.sdkStatus` presente pero fuera de
      `["pending-sdk-migration", "aligned"]`, con los valores admitidos en el
      mensaje; (d) `policy.sdkStatus` ausente o vacío → fallo de campo
      requerido (mensaje distinto al de (c): dice que falta el campo, no que
      el valor no está admitido); (e) documento de la política no localizable,
      tanto con 0 candidatos como con más de 1
- [x] 1.3 Añadir el caso feliz: manifiesto coherente con su PDF de política →
      salida 0, sin peticiones de red y sin modificar archivos en disco. Un
      segundo caso feliz —segunda invocación del helper parametrizado de la
      task 1.1, no un fixture aparte— ejercita el percent-encoding del
      identifier, pero **sin desalinearse del archivo del candidato**:
      `policy.identifier` lleva la forma percent-encoded del Anexo 2
      (`Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf`)
      y el `files[]` correspondiente nombra el archivo en su forma ASCII
      vendorizada (`Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf`),
      como el árbol real — decodificar el identifier y plegar ambos lados
      deben dar la misma cadena. No apuntar ese identifier al `policy.pdf`
      del primer caso: sus plegados no coincidirían y el test fallaría
      por la razón equivocada

## 2. El chequeo en `scripts/spec-verify.mjs`

- [x] 2.1 Implementar la localización del documento de la política (D1):
      importar `foldName`/`basenameOf` de `scripts/spec-watch/lib/util.mjs`,
      tomar el último segmento de `policy.identifier` (percent-decodificado),
      plegarlo y buscar el único `files[]` con `vendored: true` cuyo basename
      plegado coincida; exactamente un candidato o fallo que nombre
      `policy.identifier` y el recuento de candidatos
- [x] 2.2 Implementar el contraste del digest (D2) reutilizando el buffer ya
      leído en el bucle de hashing: una sola pasada de SHA-256 →
      `toString("hex")` contra `files[].sha256` (comportamiento existente,
      intacto) y `toString("base64")` contra `policy.digestValue`, por
      comparación exacta de strings — Base64 estándar con padding `=`, sin
      normalización ni soporte de URL-safe —; fallo que nombre el campo con el
      valor esperado y el obtenido
- [x] 2.3 Implementar la validación cerrada (D3) con las constantes
      `POLICY_DIGEST_METHOD` y `POLICY_SDK_STATUSES` en el propio script, y
      garantizar (D4) que **no** se importa ni se parsea
      `shared/src/constants/xades-policy.ts`: el gate lee el estado por
      `policy.sdkStatus` y no exige igualdad con `XADES_POLICY_HASH`; además
      `sdkStatus` entra en la comprobación de strings no vacíos junto a
      `identifier`/`digestMethod`/`digestValue` (ausencia = fallo) y
      `digestMethod` se compara carácter por carácter contra la constante,
      sensible a mayúsculas
- [x] 2.4 Colocar las tres comprobaciones donde hereden el guard
      `violations.length === 0` y sus mensajes sigan la convención
      `spec:verify: <ruta|campo>: <esperado> vs <obtenido>` con el `REMEDY`
      actual (D5), de modo que un manifiesto estructuralmente inválido no
      intente leer bytes; además, los fallos del bloque `policy` añaden su
      línea propia (D5): `spec:update` no recalcula `policy.*`, así que el
      mensaje dice cómo corregir cada caso

## 3. Documentación

- [x] 3.1 `packages/sdk/schemas/README.md`: documentar que `spec:verify`
      recomputa el SHA-256 en Base64 del PDF de la política y valida
      `digestMethod` y `sdkStatus` (con `sdkStatus` obligatorio), que la
      comparación del digest es exacta sobre Base64 estándar con `=`, que el
      contraste es auto-consistente contra el PDF vendorizado —no contra el
      valor publicado en el Anexo 2—, y que la constante SHA-1 del SDK se
      sigue dejando fuera a propósito (fase 3). Conservar la nota existente
      sobre la transcripción errónea del INDENT (`DWxin1xWOel8…`, 43
      caracteres sin `=`) —el párrafo que documenta el bloque `policy` se
      toca justo al lado— y dejar constancia de que un valor nuevo de
      `POLICY_SDK_STATUSES` exige actualizar gate, spec y README en el mismo
      commit
- [x] 3.2 `docs/testing.md`: describir el chequeo nuevo dentro de `spec:verify`
      y sus modos de fallo
- [x] 3.3 Formatear solo los ficheros tocados

## 4. Verificación final

- [x] 4.1 `pnpm test:scripts` en verde: los tests del gate, incluidos los
      nuevos, pasan contra los manifiestos sintéticos
- [x] 4.2 `pnpm verify` completo en verde en un checkout limpio, lo que
      ejecuta `spec:verify` contra el `manifest.json` y el PDF reales y
      confirma que el árbol actual pasa el gate más estricto. De paso,
      confirmar que el `digestValue` real tiene `I` mayúscula en el índice 10
      con base 0 (la undécima letra) y `=` final
      (`DWxin1xWOeI8…h0h8=`, la forma que recomputa el PDF y
      la del Anexo 2): si el manifiesto mostrara la forma del INDENT
      (`WOel8…`, sin `=`), detenerse y reportar en lugar de ajustar el gate
- [x] 4.3 Confirmar el alcance de solo lectura: `git diff` no toca ningún
      archivo bajo `shared/src/constants/` ni `packages/sdk/schemas/manifest.json`
      ni el PDF vendorizado, y no se crea ningún Changeset (ningún paquete
      publicado cambia). «Solo lectura» se refiere a que el gate **no
      modifica** el SDK: sí lo considera, leyendo su estado vía
      `policy.sdkStatus` (D4) — no exige igualdad con `XADES_POLICY_HASH`, eso
      es la fase 3
- [x] 4.4 `openspec validate --strict` en verde y estado del cambio listo
      para archivar tras el PR
- [x] 4.5 Revisar (no crear desde cero: la delta ya fue redactada como
      artefacto de este cambio) que el contrato está **efectivamente
      redactado** en
      `openspec/changes/verify-signing-policy-digest/specs/spec-integrity/spec.md`
      — confirmar que la delta enumera las tres condiciones de fallo del
      bloque `policy` (digest recomputado y contrastado contra
      `policy.digestValue`, `digestMethod` restringido a la URI del Anexo 2,
      `sdkStatus` requerido y restringido al conjunto conocido), no solo que
      el archivo exista — y que su redacción es coherente con el diseño y con
      lo implementado. Si la implementación revela un ajuste de contrato,
      corregirlo **en la delta**, que es la fuente: `proposal.md`,
      `design.md`, `tasks.md` y `packages/sdk/schemas/README.md` la
      referencian, no la duplican. **No** editar a mano
      `openspec/specs/spec-integrity/spec.md` — la sincronización con el spec
      principal la hace `openspec archive` al archivar el cambio
