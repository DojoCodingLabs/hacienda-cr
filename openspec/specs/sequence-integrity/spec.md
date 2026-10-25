# sequence-integrity Specification

## Purpose

Describe el contrato vigente de asignación durable de consecutivos junto a los bytes
firmados de un documento. Recupera la capacidad omitida del archivo A8.3, ajustada
al ledger actual; no atribuye al SDK garantías de aceptación fiscal o de recuperación
del pipeline completo.

## Requirements

### Requirement: La asignación durable liga el consecutivo a un documento firmado

La operación de asignación junto a un documento SHALL persistir el siguiente consecutivo y el documento firmado en una sola sustitución durable del ledger, antes de devolver éxito. El documento SHALL estar en estado `FIRMADO`, tener firma y conformidad XSD, y concordar con el tipo, sucursal, terminal, consecutivo, clave y fecha de emisión reservados. Esta validación estructural SHALL NOT presentarse como autenticidad de la firma ni aceptación por Hacienda.

#### Scenario: El documento y el contador se confirman juntos

- **WHEN** el constructor devuelve un documento firmado, conforme y ligado al consecutivo reservado
- **THEN** la operación devuelve ese consecutivo y documento después de persistir ambos en el ledger

#### Scenario: Un constructor fallido no consume un consecutivo

- **WHEN** el constructor falla antes de confirmar el ledger
- **THEN** el contador y los documentos persistidos permanecen como estaban

#### Scenario: Los bytes no corresponden a la identidad reservada

- **WHEN** los bytes XML o los metadatos del documento no concuerdan con la identidad reservada
- **THEN** la operación rechaza el documento sin avanzar el contador

### Requirement: La asignación se serializa entre procesos

Los escritores de una misma serie SHALL serializar las actualizaciones bajo un lock compartido por el directorio de configuración. Un timeout SHALL fallar sin robar el lock de otro escritor. Tras una confirmación durable, un proceso que termine SHALL dejar recuperables el consecutivo y los mismos bytes del documento en el almacenamiento local soportado.

#### Scenario: Dos procesos asignan sobre la misma serie

- **WHEN** dos procesos completan asignaciones sobre el mismo directorio y serie
- **THEN** reciben consecutivos distintos y ambos documentos quedan persistidos

#### Scenario: El proceso muere después de confirmar

- **WHEN** un proceso termina abruptamente después de que la asignación devolvió éxito
- **THEN** otro proceso puede consultar el contador confirmado y recuperar los mismos bytes por clave

#### Scenario: El lock permanece ocupado

- **WHEN** otro escritor conserva el lock hasta superar el timeout
- **THEN** la operación falla sin eliminar ni apropiarse de ese lock

### Requirement: El descarte conserva los bytes y el consecutivo emitido

El registro de descarte SHALL exigir una clave con emisión durable y un motivo no vacío de hasta 500 caracteres. SHALL conservar los bytes asignados y no devolver su consecutivo al pool. Un segundo descarte para la misma clave SHALL fallar. El registro SHALL ser una anotación local, sin implicar anulación ante Hacienda.

#### Scenario: Descartar conserva el documento

- **WHEN** se registra un descarte válido para un documento asignado
- **THEN** el ledger conserva el documento y guarda el motivo sin reducir el contador

#### Scenario: No existe emisión durable

- **WHEN** se intenta descartar una clave que no está en el ledger
- **THEN** la operación falla sin crear un descarte

#### Scenario: El descarte ya existe

- **WHEN** se intenta registrar otro descarte para la misma clave
- **THEN** la operación falla y conserva el motivo original

### Requirement: El contador no retrocede por debajo de una emisión durable

El reinicio de una serie SHALL rechazar valores inferiores al mayor consecutivo de sus documentos durables, incluidos los descartados. La API legacy de incremento sin documento SHALL conservar su compatibilidad y avanzar el mismo contador; su existencia SHALL NOT interpretarse como garantía de que todo incremento legacy tiene un documento asociado. El aislamiento por emisor y ambiente SHALL depender de la selección del directorio de configuración; dentro de él, la serie se distingue por tipo, sucursal y terminal.

#### Scenario: Se intenta reusar un número emitido

- **WHEN** se solicita reiniciar el contador por debajo de una emisión durable de esa serie
- **THEN** el reinicio falla y conserva el contador

#### Scenario: Se mezclan incrementos legacy y asignación durable

- **WHEN** se intercala un incremento legacy entre dos asignaciones durables de la misma serie
- **THEN** las asignaciones usan el contador compartido sin repetir el número legacy
