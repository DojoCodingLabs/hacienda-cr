## MODIFIED Requirements

### Requirement: Una deriva detectada abre un issue etiquetado `spec-drift` con el informe pegado

Cuando la ejecución del workflow termina con código 1 (diferencias detectadas por
`spec:check`), el job SHALL abrir un issue en el repositorio con la etiqueta `spec-drift` y
un cuerpo que contenga el informe completo de `spec:check` pegado como texto. El issue SHALL
identificar de qué comando proviene el informe. Cuando la ejecución termina con código 0,
el job SHALL **no** abrir ni comentar ningún issue. La etiqueta `spec-drift` SHALL existir
en el repo; si falta, el job SHALL crearla antes de abrir el issue. Cuando el informe
supere el límite de tamaño del cuerpo de un issue, el job SHALL truncar el cuerpo sin
cortar una secuencia multibyte UTF-8 por la mitad: el punto de corte SHALL caer en un
límite de carácter válido, y la nota explícita de truncamiento SHALL añadirse después de
ese corte.

#### Scenario: Deriva produce un issue con el informe

- **WHEN** `spec:check` termina con código 1 durante la ejecución del workflow
- **THEN** el job abre un issue con la etiqueta `spec-drift` cuyo cuerpo contiene el
  informe completo de `spec:check`

#### Scenario: Sin diferencias no hay issue

- **WHEN** `spec:check` termina con código 0 durante la ejecución del workflow
- **THEN** el job no abre ni comenta ningún issue

#### Scenario: La etiqueta `spec-drift` está disponible

- **WHEN** el repo no tiene aún la etiqueta `spec-drift`
- **THEN** el job la crea antes de abrir el issue de deriva

#### Scenario: Un informe muy largo se trunca con nota

- **WHEN** el informe de `spec:check` supera el límite de tamaño del cuerpo de un issue de
  GitHub
- **THEN** el job trunca el cuerpo con una nota explícita de truncamiento y el informe
  completo permanece en el log de la corrida

#### Scenario: El punto de corte no parte un carácter multibyte

- **WHEN** el byte que ocupa el límite de truncado cae en medio de una secuencia UTF-8 de
  varios bytes (por ejemplo un carácter acentuado de un nombre de archivo)
- **THEN** el cuerpo truncado termina en el último carácter completo anterior al límite y
  no contiene bytes UTF-8 incompletos

#### Scenario: Un informe corto no se trunca

- **WHEN** el informe de `spec:check` cabe dentro del límite de tamaño del cuerpo de un
  issue
- **THEN** el cuerpo se envía íntegro, sin nota de truncamiento

#### Scenario: Un issue nuevo referencia issues abiertos relacionados

- **WHEN** el job abre un issue nuevo y ya existen otros issues abiertos con la etiqueta
  `spec-drift`
- **THEN** el cuerpo del issue nuevo los menciona como relacionados
