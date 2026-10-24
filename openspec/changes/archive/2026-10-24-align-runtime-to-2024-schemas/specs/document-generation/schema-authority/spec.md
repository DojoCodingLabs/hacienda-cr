## Purpose

Fija que el SDK genere y valide documentos contra el set XSD v4.4 autoritativo (`2024/v4.4`) y que rechace las construcciones que solo existen en el set `2026/v4.4`, publicado fuera de ATV y no adoptado.

## ADDED Requirements

### Requirement: El set autoritativo en runtime es `2024/v4.4`

El SDK SHALL usar los XSD de `2024/v4.4` como único esquema de validación por defecto para los documentos que genera. El set `2026/v4.4` MAY permanecer vendorizado como referencia y evidencia de procedencia, pero NO SHALL ser el esquema por defecto ni aceptarse como equivalente del set autoritativo. El comportamiento SHALL ser el mismo en el build publicado y en la suite de pruebas: no existe un flag, configuración o ruta de ejecución que cambie silenciosamente la validación por defecto a 2026.

#### Scenario: La validación por defecto usa 2024

- **WHEN** se valida un documento generado sin indicar una generación de esquema
- **THEN** la validación se ejecuta contra los XSD de `2024/v4.4`

#### Scenario: Un documento exclusivo de 2026 no se acepta por defecto

- **WHEN** un documento contiene una clave alfanumérica o una referencia que solo existe en `2026/v4.4` y se valida con el comportamiento por defecto
- **THEN** la validación falla contra el XSD 2024 y no se reporta como conforme

#### Scenario: El set 2026 no sustituye al 2024

- **WHEN** el build del SDK o la suite de conformidad enumera los esquemas embebidos
- **THEN** el esquema de validación por defecto es el de `2024/v4.4`, aunque los bytes de `2026/v4.4` sigan presentes como referencia

### Requirement: La clave emitida es numérica de 50 dígitos

Toda clave aceptada, construida o parseada por el SDK SHALL ser exactamente de 50 dígitos (`\d{50}`). El segmento correspondiente a la cédula del contribuyente SHALL contener solo dígitos; las letras SHALL rechazarse con un error de validación, tanto en la entrada parcial como en la clave completa.

#### Scenario: Clave alfanumérica rechazada

- **WHEN** la entrada de la clave incluye letras en el segmento de cédula
- **THEN** la validación falla y no se produce una clave ni un XML

#### Scenario: Clave de 50 dígitos aceptada

- **WHEN** la entrada contiene una cédula de hasta 12 dígitos y la clave resultante tiene 50 dígitos
- **THEN** la clave se construye y se acepta

#### Scenario: El parser rechaza una clave alfanumérica

- **WHEN** se intenta parsear una clave de 50 caracteres que contiene letras
- **THEN** el parser falla con un error de validación y no devuelve componentes

### Requirement: Solo se emiten y aceptan los códigos de referencia vigentes en 2024

El SDK SHALL limitar los catálogos de referencia a lo que el XSD `2024/v4.4` admite: `TipoDocReferencia` hasta 18 y `CodigoReferencia` hasta 12. Los valores `TipoDocReferencia` 19–20 y `CodigoReferencia` 13–17 SHALL rechazarse como entrada y NO SHALL emitirse en ningún documento, incluido el REP con código de referencia 17. La sustitución de un comprobante rechazado con código 16 tampoco SHALL emitirse mientras el set autoritativo sea 2024.

#### Scenario: Tipo de documento de referencia 19 o 20 rechazado

- **WHEN** la entrada usa `TipoDocReferencia` 19 o 20
- **THEN** la validación falla y el constructor no emite el documento

#### Scenario: Código de referencia 13–16 rechazado

- **WHEN** la entrada usa `CodigoReferencia` 13, 14, 15 o 16
- **THEN** la validación falla y el constructor no emite el documento

#### Scenario: REP con código 17 rechazado

- **WHEN** un REP intenta usar el código de referencia 17
- **THEN** la validación falla y el XML no se genera

#### Scenario: Los valores vigentes en 2024 siguen disponibles

- **WHEN** la entrada usa `TipoDocReferencia` hasta 18 o `CodigoReferencia` hasta 12
- **THEN** la validación y la emisión conservan el comportamiento vigente

### Requirement: La conformidad se prueba contra el set autoritativo

La suite de conformidad SHALL validar la salida de cada constructor contra los XSD de `2024/v4.4`. Los XSD de `2026/v4.4` MAY usarse en pruebas para demostrar que una construcción exclusiva de 2026 es rechazada por 2024, pero NO SHALL usarse para afirmar que el SDK acepta esa construcción. Las pruebas que hoy esperan aceptación bajo 2026 SHALL pasar a esperar rechazo bajo 2024.

#### Scenario: Cada constructor conforma a 2024

- **WHEN** se ejecuta la suite de conformidad sobre los documentos de referencia de cada tipo
- **THEN** todos validan contra el XSD 2024 correspondiente

#### Scenario: Una construcción 2026 falla contra 2024

- **WHEN** una prueba construye un documento con clave alfanumérica o referencias 13–17/19–20
- **THEN** la validación contra 2024 falla y la prueba lo afirma explícitamente

#### Scenario: No queda una aprobación 2026 por defecto

- **WHEN** se revisan las pruebas de conformidad
- **THEN** ninguna afirma que el SDK acepta por defecto un documento que solo conforma a `2026/v4.4`
