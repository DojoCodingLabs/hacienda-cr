## 1. La asignación junto al documento

- [ ] 1.1 Definir la operación de asignación que entrega el consecutivo y persiste el documento en el mismo paso.
- [ ] 1.2 Verificar que la clave del documento y su consecutivo coinciden, y fallar si el documento se persiste con un consecutivo que ya pertenece a otro.
- [ ] 1.3 Mantener `getNextSequence` como operación legacy explícita, con su advertencia documentada, y registrar que no es el camino recomendado.
- [ ] 1.4 Registrar toda asignación legacy en el store, para que el rastro exista aunque el consumidor la use.

## 2. El descarte

- [ ] 2.1 Registrar el descarte de un documento con consecutivo: el número, el motivo y la fecha.
- [ ] 2.2 Garantizar que un consecutivo descartado no vuelve a la serie disponible.
- [ ] 2.3 Exponer en la consulta de serie los consecutivos entregados y los descartados, con sus motivos.
- [ ] 2.4 Probar que el siguiente consecutivo de una serie con descartes es mayor que todos los entregados o descartados.

## 3. Los puntos de fallo

- [ ] 3.1 Enumerar en el código los puntos de fallo del pipeline: asignar, construir, firmar, persistir, enviar, polear y liquidar.
- [ ] 3.2 Implementar la inyección de crash por punto, en un proceso hijo (no una excepción en el mismo proceso).
- [ ] 3.3 Poner un timeout por caso en el harness, para que un caso colgado se reporte como fallo del harness y no cuelgue la suite.

## 4. Las invariantes

- [ ] 4.1 Implementar la comprobación de las tres invariantes después de reiniciar: no hay entrega doble, toda entrega está documentada, todo documento persistido es reanudable.
- [ ] 4.2 Recorrer todos los puntos de fallo y comprobar las invariantes en cada reinicio; el fallo de cualquiera hace fallar la prueba.
- [ ] 4.3 Probar la asignación concurrente: varios emisores sobre la misma serie obtienen consecutivos distintos y contiguos.
- [ ] 4.4 Probar que los documentos pendientes se listan y se reintetan tras el reinicio.

## 5. La puerta del MCP

- [ ] 5.1 Dejar de repartir consecutivos sueltos por MCP: la herramienta ata el número a un documento, o deja de existir como reparto suelto.
- [ ] 5.2 Mantener la negativa a reiniciar en silencio una serie usada, y registrar el reinicio deliberado con su motivo.

## 6. Integración

- [ ] 6.1 Exportar desde el barrel del SDK la operación de asignación junto al documento, el registro de descartes y la consulta de serie.
- [ ] 6.2 Documentar en `docs/reference.md` la garantía de secuencia, la tabla de puntos de fallo y las invariantes comprobadas.

## 7. OpenSpec

- [ ] 7.1 Verificar que `openspec validate add-a8-3-sequence-integrity` pasa.
- [ ] 7.2 Verificar que `openspec validate --specs` no presenta regresiones.

## 8. Puertas

- [ ] 8.1 Ejecutar `pnpm verify` y la suite del harness de crash con todos los puntos de fallo.
