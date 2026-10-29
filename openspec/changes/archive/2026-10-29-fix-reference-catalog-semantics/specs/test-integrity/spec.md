## Purpose

Impide que regresiones documentadas se silencien en la suite y que fixtures con identidad fiscal incoherente se cuelen de nuevo: el gate de verificación SHALL rechazar el uso de `it.fails`/`test.fails`, y la suite SHALL probar la coherencia clave↔documento de cada fixture del paquete SDK.

## ADDED Requirements

### Requirement: Prohibición de casos esperados a fallar

La verificación del repositorio (`pnpm verify`) SHALL fallar si algún archivo de spec (`packages/**/*.{spec,test}.{ts,mjs}`, `shared/**/*.{spec,test}.{ts,mjs}` o `scripts/**/*.test.mjs`) contiene el patrón de caso esperado a fallar (`.fails(`), salvo que la línea contenga `// allowed-fails` o la línea inmediatamente anterior lo contenga. La verificación SHALL distinguir este fallo de otros fallos de lint o generación.

#### Scenario: Suite limpia pasa

- **WHEN** se ejecuta `pnpm verify` sobre un árbol sin `.fails(` no exceptuado en los archivos de spec
- **THEN** la guarda pasa y el resto de la verificación continúa

#### Scenario: Reintroducción de caso esperado a fallar falla

- **WHEN** un archivo de spec contiene `it.fails(` o `test.fails(` sin `// allowed-fails`
- **THEN** la verificación termina con código distinto de cero e identifica el archivo y la línea

### Requirement: Claves de fixture coherentes

La suite del SDK SHALL incluir un test que, para cada fixture publicado del paquete (facturas, tiquetes, notas, recibos, casos exactos), parsea su `clave` con el parser de claves y verifique que el emisor, el tipo de documento, la fecha de emisión y el consecutivo coincidan con los campos del fixture. Un fixture con clave incoherente SHALL hacer fallar la suite.

#### Scenario: Fixture coherente pasa

- **WHEN** se ejecuta la suite sobre los fixtures existentes
- **THEN** el test de coherencia pasa para todos ellos

#### Scenario: Fixture incoherente falla

- **WHEN** se modifica un fixture de modo que su `clave` difiera en emisor, tipo, fecha o consecutivo respecto del resto del documento
- **THEN** el test de coherencia falla e identifica el fixture afectado
