## MODIFIED Requirements

### Requirement: El XML generado valida contra el XSD oficial, sin excepciones

Para todo documento producido por el generador, el XML serializado SHALL validar contra el XSD autoritativo `2024/v4.4` mediante la validación offline de esquemas del SDK. NO SHALL existir ningún caso, ni siquiera adversarial (montos extremos, muchas líneas, descuentos máximos, tarifas mixtas), para el cual el XML generado no conforme con el set 2024. El set `2026/v4.4` NO SHALL usarse como criterio de aceptación de la salida.

#### Scenario: Cada documento generado conforma al XSD

- **WHEN** se serializa un documento generado y se valida contra el XSD autoritativo
- **THEN** la validación reporta el documento como válido contra `2024/v4.4`

#### Scenario: Un caso que no conforme falla ruidosamente

- **WHEN** un documento generado produce XML que no conforma al XSD 2024
- **THEN** la propiedad falla mostrando el contraejemplo serializado y su diagnóstico de validación

#### Scenario: La conformidad 2026 no compensa una falla 2024

- **WHEN** un documento generado solo conforma a `2026/v4.4` y no a `2024/v4.4`
- **THEN** la propiedad falla: la aceptación por el set no adoptado no cuenta como conformidad

### Requirement: La clave de 50 dígitos se descompone de vuelta en sus insumos

Para toda entrada válida al constructor de la clave numérica, descomponer la clave producida SHALL devolver exactamente los insumos normalizados que la generaron (país, fecha, cédula con relleno, sucursal, terminal, tipo de documento, secuencia, situación y código de seguridad). La propiedad SHALL cubrir fechas límite y valores máximos, e incluir el 29 de febrero de años bisiestos, el 31 de diciembre, la secuencia máxima de diez dígitos y cédulas numéricas de hasta doce dígitos. El generador NO SHALL producir cédulas alfanuméricas para la clave, porque el set autoritativo 2024 exige `\d{50}`.

#### Scenario: Ida y vuelta de la clave

- **WHEN** se construye una clave a partir de insumos válidos y se descompone
- **THEN** cada componente devuelto coincide con el insumo normalizado correspondiente

#### Scenario: Fechas límite

- **WHEN** el insumo incluye el 29 de febrero de un año bisiesto y el 31 de diciembre
- **THEN** la clave se descompone de vuelta en esa misma fecha

#### Scenario: Valores máximos

- **WHEN** el insumo incluye la secuencia máxima (`9999999999`) y una cédula numérica de doce dígitos
- **THEN** la descomposición devuelve la secuencia máxima y la cédula normalizada

#### Scenario: Una cédula alfanumérica no entra al generador

- **WHEN** el generador intenta producir una clave con letras en el segmento de cédula
- **THEN** la validación de entrada la rechaza y el caso no se genera como válido
