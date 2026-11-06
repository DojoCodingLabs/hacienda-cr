## ADDED Requirements

### Requirement: El camino público general usa el mismo tipo monetario y el mismo kernel

Los DTOs públicos exactos de documento SHALL usar texto decimal acotado como
representación monetaria y SHALL delegar toda la aritmética de dinero en el
kernel escalado que ya posee la regla única de 5 decimales y `HALF_UP`. Los
schemas, calculadores y builders del camino general NO SHALL reimplementar la
regla de redondeo ni convertir un monto a `Number` para operar. Los límites de
los campos SHALL derivarse de la misma frontera compartida que usa el camino
exacto, sin duplicar expresiones regulares ni constantes de cota.

#### Scenario: La regla de redondeo no se duplica

- **WHEN** se revisa el cálculo del camino público general
- **THEN** toda operación monetaria se delega en el kernel y no existe una segunda regla local de redondeo

#### Scenario: El camino general no convierte a binario

- **WHEN** un monto entra al cálculo general
- **THEN** permanece como entero escalado y nunca pasa por `Number`, `parseFloat` o `toFixed`

#### Scenario: Los límites son los mismos del camino exacto

- **WHEN** un campo monetario del camino general recibe un valor fuera de cota
- **THEN** se rechaza con la misma cota del tipo oficial usada por el camino exacto

### Requirement: Los contratos Number legacy se preservan

Las funciones, schemas, tipos y builders que hoy aceptan `number` SHALL conservar
su firma y su comportamiento publicado. La ruta decimal SHALL ser adicional y no
SHALL modificar los bytes ni los cálculos del baseline existente. Un consumidor
NO SHALL verse obligado a migrar para seguir usando la API `Number`.

#### Scenario: La API Number sigue funcionando

- **WHEN** un consumidor llama a `calculateLineItemTotals`, `calculateInvoiceSummary` o un builder con montos `number`
- **THEN** obtiene el mismo resultado que antes del change

#### Scenario: El baseline publicado no cambia

- **WHEN** se ejecuta la regresión de bytes y cálculos publicados
- **THEN** los hashes del camino `Number` y de las familias exact narrow coinciden con los registrados

#### Scenario: La adopción es opt-in

- **WHEN** un consumidor no usa la nueva familia decimal
- **THEN** su código sigue compilando y ejecutándose sin cambios
