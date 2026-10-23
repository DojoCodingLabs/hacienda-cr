## Context

Ver `proposal.md` — Why. El informe de conformidad (A1) es el único entregable de A1 y quedó
congelado sobre `597a556`, mientras `origin/main` avanzó 55 commits con correcciones de
política y catálogos (#60/#70). El review de `main` pide: etiquetar el apéndice como
histórico, añadir reconciliación con el main vigente, preservar los hashes originales y
distinguir el anexo retenido del anexo oficial actual.

## Goals / Non-Goals

**Goals:**

- Que el informe sea honesto sobre su fecha y su baseline.
- Que la foto (hashes) y el delta (reconciliación) vivan separados.
- Que cada cambio posterior de `main` sea un diff revisable de una sección, no del informe entero.

**Non-Goals:**

- Re-auditar catálogos contra el anexo de 99 páginas (trabajo aparte, requiere el PDF vigente).
- Cambiar el veredicto de ninguna fila histórica.
- Mover el informe de sitio ni cambiar su formato de tabla.

## Decisions

| Decisión                                                              | Racional                                                                                                                                                  | Alternativas consideradas                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Apéndice §10 se declara histórico, no se borra**                    | Es la evidencia que el brief exige ("cada desacuerdo con la auditoría previa queda explícitamente reconciliado"); reescribirla destruiría la trazabilidad | Reescribir el apéndice al estado actual (borra la foto)   |
| **Reconciliación como sección nueva, no como columna**                | Un delta se lee y se revisa como lista de diferencias; una columna obligaría a tocar todas las filas                                                      | Añadir una columna "estado en main" al apéndice           |
| **Los hashes de fuente no se recalculan**                             | La lectura original es la evidencia; recalcular atribuiría observaciones nuevas a una lectura vieja                                                       | Regenerar hashes contra el árbol actual                   |
| **El anexo de 99 páginas se nombra con su SHA-256, sin incorporarlo** | Declarar la diferencia sin inventar contenido fiscal nuevo                                                                                                | Vendorizar el anexo de 99 (cambio de source-set, otro PR) |
| **La reconciliación referencia `#57` y el oráculo nativo de `main`**  | Conecta el informe con las dos fuentes de verdad posteriores (generador y bytes primarios)                                                                | Dejar el informe aislado                                  |
| **Los límites del informe se declaran en el documento**               | "No afirma elegibilidad de régimen ni aceptación real" debe leerse sin el contexto del PR                                                                 | Dejarlo sólo en la discusión del PR                       |
| **La reconciliación no es precondición de 0.7**                       | El review lo dice: la reconciliación documental no habilita ni bloquea la corrección acotada de la NC exacta                                              | Encadenar ambas entregas                                  |

## Risks / Trade-offs

- **[Riesgo: la reconciliación envejece]** → por diseño el apéndice es histórico y la reconciliación es la única parte viva; se revisa en cada PR que toque catálogos.
- **[Riesgo: doble verdad (apéndice vs reconciliación)]** → el apéndice se titula histórico y la reconciliación declara que manda ante conflicto.
- **[Riesgo: el anexo de 99 páginas no está en el repo]** → se cita su hash y se declara la diferencia sin reconciliar.
- **[Riesgo: el informe se lee como "conformidad actual" en el README]** → el README y `AGENTS.md` se ajustan para decir "evidencia histórica + delta".
- **[Riesgo: el informe se usa como prueba de aceptación]** → la sección de límites lo dice en el documento; además el README lo repite.
- **[Riesgo: `main` avanza entre la base y la cabeza revisadas]** → la cabecera declara ambas; la reconciliación se revalida en el momento del rebase.
