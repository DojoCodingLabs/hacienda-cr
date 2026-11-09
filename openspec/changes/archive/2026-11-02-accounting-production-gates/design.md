## Context

La auditoría separa la validación técnica (sintética) de la validación contable y de producción. La contadora revisa solo asientos; las facturas son sintéticas y el alcance es XML. No se requiere PDF ni representación gráfica para esta etapa.

## Goals / Non-Goals

**Goals:**

- Definir gates contables y de producción independientes.
- Mantener las pruebas sintéticas desbloqueadas.
- Documentar evidencia requerida para cada gate.

**Non-Goals:**

- Implementar automatización contable.
- Generar PDF o representación gráfica.
- Bloquear CI por revisión contable.

## Decisions

### D1: Accounting review limited to entries

- **Choice**: La contadora revisa solo asientos, mapeo de IVA y reconciliación.
- **Rationale**: Reduce alcance y evita bloquear desarrollo.

### D2: Synthetic invoices only

- **Choice**: Todas las facturas de prueba son sintéticas.
- **Rationale**: Cumple la guía de Hacienda para sandbox sin datos comerciales reales.

### D3: XML-only artifacts

- **Choice**: El alcance se limita a XML y asientos derivados.
- **Rationale**: El PDF/QR no es obligatorio en esta etapa (QR suspendido).

### D4: Production gate is separate

- **Choice**: Producción tiene checklist propio (credenciales, retención, monitoreo).
- **Rationale**: Evita confundir pruebas verdes con salida a producción.

## Risks / Trade-offs

- [Revisión tardía] → Mitigar con checklist de asientos desde ahora.
- [Sandbox se limpia] → Conservar bundles de evidencia.

## Migration Plan

1. Documentar gates en la guía de integración.
2. Añadir checklist de producción.
3. No cambios de código requeridos en esta etapa.
