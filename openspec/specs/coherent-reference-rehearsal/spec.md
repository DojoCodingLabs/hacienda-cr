# coherent-reference-rehearsal Specification

## Purpose

Define el generador de escenario de ensayo FE→{NC, ND, FEC, MR} con referencias coherentes por construcción y el validador de grafo que rechaza incoherencias. Garantiza que ningún escenario fabrica evidencia fiscal contra un original no aceptado.

## Requirements

### Requirement: Grafo de escenario

Un escenario SHALL estar compuesto por una FE raíz y cero o más documentos dependientes (NC, ND, FEC, MR), donde cada dependiente referencia por construcción a un documento existente en el mismo escenario. La FE raíz no referencia a ningún documento. REP no forma parte del escenario.

#### Scenario: Escenario válido mínimo

- **WHEN** se genera un escenario con solo FE
- **THEN** el grafo contiene un nodo FE sin aristas salientes y valida

#### Scenario: REP excluido

- **WHEN** se solicita incluir REP en el escenario
- **THEN** el generador lo rechaza (no soportado en este change)

### Requirement: Coherencia por construcción

Para cada referencia del escenario SHALL cumplirse:

- `numero` es la clave de un documento existente en el escenario.
- `TipoDocIR` es el código Nota 10 del tipo real del documento referenciado.
- `codigo` pertenece al conjunto aceptado para el par `(tipoDocumento de la clave numérica del documento que referencia, TipoDocIR del documento referenciado)` según la tabla D7 del design (Nota 9/10). Los pares fuera de esa tabla se rechazan (política fail-closed); REP, MR y los pares no modelados quedan fuera de la tabla.
- `fechaEmisionIR` es igual a `fechaEmision` del documento referenciado.
- `fechaEmisionIR` ≤ `fechaEmision` del documento que referencia.

El generador SHALL rechazar la construcción si alguna de estas condiciones falla.

#### Scenario: Referencia huérfana se rechaza

- **WHEN** se construye una NC cuyo `numero` no coincide con ninguna clave del escenario
- **THEN** el generador falla con error de coherencia (no se emite el documento)

#### Scenario: Tipo mentido se rechaza

- **WHEN** se construye un ND con `tipoDoc = "01"` pero la clave referenciada pertenece a una NC
- **THEN** el generador falla con error de coherencia

#### Scenario: Fecha incoherente se rechaza

- **WHEN** se construye un documento cuya `fechaEmisionIR` difiere de la fecha del original
- **THEN** el generador falla con error de coherencia

#### Scenario: Par de referencia no cubierto se rechaza

- **WHEN** se valida un documento cuyo par `(tipo que referencia, tipo referenciado)` no está en la tabla D7
- **THEN** el validador reporta la violación "par no cubierto" y no emite veredicto de coherencia

### Requirement: Condición fiscal de NC y ND

NC y ND SHALL generarse únicamente cuando la FE referenciada esté en estado `ACCEPTED` (evidencia fiscal). Si se generan sin esa condición, el escenario SHALL declararse `rehearsal: true` de forma explícita y cada bundle resultante SHALL marcarse `rehearsal: true`; en ese caso no podrá presentarse como evidencia fiscal.

#### Scenario: NC sobre FE no aceptada en modo fiscal falla

- **WHEN** se solicita una NC sobre una FE en estado distinto de `ACCEPTED` sin `rehearsal: true`
- **THEN** el generador falla con error de coherencia fiscal

#### Scenario: Modo ensayo explícito

- **WHEN** se solicita una NC con `rehearsal: true` sobre una FE no aceptada
- **THEN** se genera el documento y el bundle queda marcado `rehearsal: true`

### Requirement: MR dentro del plazo (Resolución art. 10)

Un Mensaje Receptor SHALL referenciar la FE original por su clave (no por un campo de referencia separado), con `NumeroCedulaEmisor` igual al emisor original, y su `fechaEmisionDoc` SHALL ser ≥ `fechaEmision` del original. El consecutivo del receptor SHALL usar el tipo `05`/`06`/`07` según el mensaje 1/2/3.

#### Scenario: MR con fecha anterior se rechaza

- **WHEN** se construye un MR con `fechaEmisionDoc` anterior a la emisión de la FE original
- **THEN** el generador falla con error de coherencia

#### Scenario: Consecutivo incoherente se rechaza

- **WHEN** se construye un MR con mensaje 2 pero consecutivo tipo `05`
- **THEN** el generador falla con error de coherencia

### Requirement: FEC con emisor comprador

Una FEC SHALL usar al comprador (receptor de la FE original) como emisor, y su referencia SHALL apuntar a la FE del proveedor. La clave de la FEC SHALL pertenecer al comprador.

#### Scenario: FEC con emisor erróneo se rechaza

- **WHEN** se construye una FEC cuya clave no pertenece al comprador
- **THEN** el generador falla con error de coherencia

### Requirement: Validador de grafo

El escenario SHALL exponer un validador que, dado un conjunto de documentos ya construidos (con sus claves y referencias), verifique todas las reglas de coherencia anteriores y reporte la lista de violaciones (vacía si es coherente). El validador SHALL ser usable sin red ni firma.

#### Scenario: Escenario coherente valida

- **WHEN** se ejecuta el validador sobre un escenario generado por el generador
- **THEN** la lista de violaciones está vacía

#### Scenario: Incoherencia detectada

- **WHEN** se altera una referencia (clave, tipo, fecha) en un documento del escenario
- **THEN** el validador reporta la violación correspondiente sin modificar los archivos

### Requirement: Identidad no inventada

El generador SHALL requerir como entrada la identidad fiscal real del emisor (tipo y número), actividad económica, proveedor de sistemas, receptor y CABYS. No SHALL inventar ni rellenar estos datos con valores por defecto.

#### Scenario: Falta de identidad bloquea la generación

- **WHEN** se invoca el generador sin identidad del emisor
- **THEN** falla antes de generar ningún documento ni reservar consecutivo
