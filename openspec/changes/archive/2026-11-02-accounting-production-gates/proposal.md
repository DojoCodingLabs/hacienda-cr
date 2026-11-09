## Why

La auditoría declara el SDK no listo para producción hasta validar la operación contable y la salida a producción. La revisión con contadora es requisito del producto real, pero no debe bloquear las pruebas sintéticas. Se necesitan gates claros: la contadora revisa solo asientos contables, las facturas de prueba son sintéticas y el alcance se limita a XML.

## What Changes

- Definir un gate de revisión contable acotado a asientos, usando facturas sintéticas y XML (sin PDF ni representación gráfica).
- Definir un gate de producción con checklist operativo (credenciales, retención, bitácoras, monitoreo).
- Mantener las pruebas sintéticas y técnicas desbloqueadas en todo momento.
- Documentar qué evidencia se requiere para pasar cada gate.

## Capabilities

### New Capabilities

- `accounting-entry-review`: revisión contable limitada a asientos generados desde facturas sintéticas en XML.
- `production-readiness-gates`: checklist y gates para salida a producción sin depender de la revisión contable.

### Modified Capabilities

- (ninguna)

## Impact

- Afecta documentación de integración y planes de release.
- No cambia el SDK ni sus pruebas sintéticas.
- La contadora no bloquea desarrollo ni CI.
