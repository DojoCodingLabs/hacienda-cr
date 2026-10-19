## 1. Generador arbitrario

- [ ] 1.1 Portar `packages/sdk/src/__fixtures__/document-generator.ts` al árbol vigente, sobre la capa de cálculo que declara cada constructor (el contrato `Number` legacy se preserva; el camino exacto ya es decimal exacto).
- [ ] 1.2 Cubrir con casos: cada tarifa, exoneración parcial y total, descuentos múltiples, hasta cuatro medios de pago, moneda extranjera y notas con referencia.
- [ ] 1.3 Verificar que el generador no produce montos no representables exactamente.

## 2. Parser XML→documento

- [ ] 2.1 Portar `packages/sdk/src/documents/parser.ts` y decodificar los montos al tipo que declara el constructor de cada tipo (sin pérdida).
- [ ] 2.2 Preservar la ausencia de elementos opcionales (no fabricar campos).
- [ ] 2.3 Exportar el parser desde el barrel del SDK y añadir su prueba de round-trip por tipo.

## 3. Corpus dorado

- [ ] 3.1 Definir el registro del corpus (una entrada por tipo) con su documento de entrada.
- [ ] 3.2 Regenerar los XML dorados contra los constructores vigentes y fijarlos en el repositorio.
- [ ] 3.3 Añadir la prueba de igualdad byte a byte y de conformidad XSD de cada entrada.
- [ ] 3.4 Documentar el procedimiento de regeneración deliberada.

## 4. Propiedades

- [ ] 4.1 Portar `document-generation.properties.spec.ts` con las tres propiedades.
- [ ] 4.2 Añadir la propiedad anti-vacuidad (el documento generado pasa la validación de entrada).
- [ ] 4.3 Las propiedades monetarias del camino exacto (oráculo de enteros escalados) las aporta A3: no se duplican aquí.
- [ ] 4.4 Añadir los casos adversariales (montos extremos, muchas líneas, descuentos máximos, tarifas mixtas).

## 5. CI

- [ ] 5.1 Añadir el suite de A4 a `scripts/run-properties-tests.mjs` con presupuesto XSD propio y configurable, y conectarlo a `pnpm verify`.
- [ ] 5.2 Verificar que `pnpm verify` ejecuta las tres propiedades sin credenciales ni red.

## 6. OpenSpec

- [ ] 6.1 Verificar que `openspec validate port-a4-property-generation` pasa.
- [ ] 6.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 7. Puertas

- [ ] 7.1 Ejecutar `pnpm verify` y documentar budget/tiempos.
