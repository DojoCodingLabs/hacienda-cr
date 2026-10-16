# Iteraciones de integridad y esquemas del SDK

> Historical investigation on base `4d7430b`. Current main already vendors official schemas; this PR preserves its schema generator and security boundaries. Consult the PR validation section in sdk-validation-iterations.md for rebased results.

15 de octubre de 2026. Este documento describe correcciones de código y evidencia offline. Los resultados reales de recepción sandbox se registran por separado; ninguna validación local equivale a aceptación fiscal.

## Correcciones

- Los siete builders estándar verifican país, identificación de quien genera el documento, consecutivo, tipo, fecha civil de Costa Rica, situación y números de sucursal/terminal/secuencia antes de producir XML. La validación JSON de FE y la validación XML después del XSD aplican las mismas relaciones.
- En compra (FEC), el identificador de la clave corresponde al comprador/receptor; se conserva el proveedor en Emisor. MensajeReceptor utiliza la clave del documento original y no recibe por error las reglas de una factura propia.
- `buildClave` usa `America/Costa_Rica`, de manera que una ejecución en un servidor UTC no cambie el día de la clave cerca de medianoche.
- Los fixtures comunes se regeneran con identidades deterministas coherentes, incluyendo sus fechas y consecutivos. Se corrigió la inversión de partes de la FEC y los códigos de FEC/FEE/REP.
- FE valida correspondencia entre código y porcentaje de IVA ordinario, admite los códigos 09/10/11, y rechaza los códigos transitorios 05/06/07 para una FE nueva. Los regímenes de cálculo especial requieren sus propias reglas y no se equiparan arbitrariamente a IVA ordinario.
- Se conserva el código de actividad emitido, incluyendo el formato `6209.0`, además del formato anterior de seis dígitos. No se convierte a un supuesto código sin punto. Su inscripción efectiva se consulta fuera del validador sintáctico.
- Un nodo Receptor de FE debe incluir identificación; el validador ya no declara válida una entrada que falla por ese motivo en XSD.
- El catálogo de tipos de referencia se separa del catálogo de tipos de clave. Tipos de comprobante: FEC 08, FEE 09 y REP 10; 05–07 son confirmaciones. Las propiedades mal nombradas `COMPRA_PAGO` y `GASTO_VIAJE` se conservan como aliases obsoletos, no como nuevos documentos fiscales.

## Fuentes y actualización de XSD

Se descargaron las ocho estructuras desde URLs oficiales `https://www.hacienda.go.cr/docs/<Documento>_V4.4.xsd`, sin cambiar sus restricciones. Los antiguos enlaces `.xsd.xml` devolvían catálogos anteriores en esta revisión. [El manifiesto](../../packages/sdk/schemas/manifest.json) del main actual conserva la procedencia y los hashes de los archivos oficiales. Este PR conserva esos archivos y su gate `pnpm spec:verify`, en lugar de reemplazarlos por las cadenas TypeScript de la investigación original.

Los esquemas actuales contienen tipos de referencia 19/20 y motivos 13–16; el motivo 17 aparece únicamente en REP. Se probaron esas diferencias explícitamente, en lugar de copiar un enum a todas las familias. [Los anexos de Hacienda](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), páginas 66–68 y 72–74, son la referencia para códigos e identidades; la [comunicación de actualización](https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf) anuncia la disponibilidad de referencias actualizadas.

## Pruebas y corrección del registro anterior

`known-integrity-gaps.spec.ts` contiene ahora regresiones normales con una comprobación positiva de la factura base antes de alterarla. Los cuatro casos ya no están marcados como fallos esperados.

La primera versión de tres de esos casos importaba `DocumentType` y `Situation` desde un módulo que no los exportaba, por lo que fallaba por `TypeError`. Eso no era una regresión fiscal válida. Los problemas habían sido confirmados mediante una ejecución independiente del validador, pero ese resultado anterior de `it.fails` no debe usarse como evidencia de cobertura. Las importaciones, aserciones de base y regresiones actuales corrigen el defecto de las pruebas.

La cobertura adicional incluye:

- Siete familias con claves coherentes y rechazo de cambios de contribuyente, consecutivo y fecha; FEC con comprador distinto del proveedor.
- Instantes inmediatamente antes/después de medianoche de Costa Rica, fechas inválidas y tipo de documento incorrecto.
- XML sin problemas XSD, pero con identidad semánticamente inconsistente.
- Hash exacto de las ocho fuentes, referencias nuevas y motivo 17 limitado a REP.
- Once casos de códigos/tarifas ordinarias y transitorias de IVA.

Los montos conservan la tolerancia existente. No se modificó el cálculo monetario ni se declaró incorrecta una diferencia pequeña sin contrastar primero la normativa.

## Redacción de diagnósticos

`sanitizeLogString(string): string` y `redactSecrets(unknown): unknown` están disponibles públicamente en el SDK. Logger los aplica antes de enviar datos al writer. Incluyen claves sensibles anidadas, secretos configurados en el entorno actual, Bearer/Basic, asignaciones textuales de contraseña/token/PIN, Error/cause, ciclos y accessors, sin mutar los objetos originales. Cinco pruebas adicionales ejercitan estos casos con canarios sintéticos.

La redacción reduce exposición accidental; los consumidores deben evitar enviar documentos completos, certificados o secretos a sus sistemas de logs. No reemplaza control de acceso ni almacenamiento seguro.

## Comandos de repetición

```bash
pnpm --filter @dojocoding/hacienda-shared build
pnpm --filter @dojocoding/hacienda-sdk test document-identity.spec.ts schema-provenance.spec.ts known-integrity-gaps.spec.ts iva-rates.spec.ts redaction.spec.ts
pnpm --filter @dojocoding/hacienda-sdk typecheck
pnpm --filter @dojocoding/hacienda-sdk lint
```

La suite global incluye pruebas HTTP locales que necesitan permiso para abrir un puerto. Un `EPERM` al hacer `listen` es una limitación de ejecución, no un rechazo fiscal ni una prueba aprobada; ejecutar la suite con el permiso correspondiente y registrar el resultado final.
