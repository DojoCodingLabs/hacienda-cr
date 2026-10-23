## ADDED Requirements

### Requirement: La procedencia de cada set v4.4 se documenta con evidencia verificable por superficie

La documentación de `packages/sdk/schemas/` SHALL incluir un registro de
procedencia que, para cada set vendorizado, identifique la superficie oficial de
origen (`id` del manifiesto), la URL exacta consultada, el `Last-Modified`
observado, el SHA-256 y el tamaño verificados, la fecha de la comprobación y el
rol declarado del set. Cuando dos superficies oficiales publiquen bytes distintos
para el mismo año y versión, el registro SHALL declarar la divergencia, enumerar
los archivos afectados y las diferencias de restricciones observadas, y
identificar qué superficie toma el proyecto como autoritativa y con qué
justificación. El registro SHALL NOT presentar una publicación más reciente de
una superficie distinta como sustitución oficial del esquema vigente, ni cambiar
`currentSet`, `nextSet`, el manifiesto o los bytes vendorizados por sí mismo.
Toda autoridad no confirmada por la superficie ATV SHALL quedar registrada como
decisión abierta, con su efecto pendiente sobre `nextSet` y sobre el set que
embebe el build del SDK.

#### Scenario: Los bytes vendorizados coinciden con la superficie ATV

- **WHEN** se comparan los archivos de `2024/v4.4/` con los publicados bajo
  `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`
- **THEN** el registro declara que el SHA-256 y el tamaño de cada archivo
  coinciden, junto con la fecha de la comprobación y el `Last-Modified` observado

#### Scenario: Los bytes vendorizados coinciden con la superficie OVi

- **WHEN** se comparan los archivos de `2026/v4.4/` con los publicados bajo
  `https://www.hacienda.go.cr/docs/`
- **THEN** el registro atribuye esos bytes a la superficie OVi, no a ATV, y
  declara su fecha de publicación y su rol como revisión publicada fuera de ATV

#### Scenario: La divergencia se enumera archivo por archivo

- **WHEN** se contrastan los dos sets de la misma versión nominal
- **THEN** el registro enumera los archivos cuyos bytes difieren y describe las
  diferencias de restricciones observadas, sin calificarlas como error de
  vendorización

#### Scenario: La autoridad no se transfiere en silencio

- **WHEN** la documentación describe el set `2026/v4.4` y su fecha de
  obligatoriedad
- **THEN** declara que ATV no publica ese set y registra como decisión abierta
  su efecto sobre `nextSet`, sobre el set embebido y sobre la fecha de
  obligatoriedad, manteniendo `currentSet` en `2024/v4.4`

#### Scenario: Una nueva comprobación actualiza la evidencia

- **WHEN** una superficie cambia el `Last-Modified` o el hash de un archivo
  declarado en el registro
- **THEN** el registro se actualiza con el valor nuevo y la fecha de la nueva
  comprobación, conservando la referencia al valor anterior
