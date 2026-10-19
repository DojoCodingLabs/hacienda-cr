## Context

Ver `proposal.md` — Why. A4 aporta cuatro activos que `main` no tiene: generador arbitrario,
parser XML→documento, corpus dorado y las tres propiedades. Este port los aterriza sobre los
constructores vigentes y la representación decimal-text, y depende de que A3 ya haya aterrizado.

## Goals / Non-Goals

**Goals:**

- Generador, parser, corpus y propiedades hablando el mismo idioma que los constructores.
- Que el corpus fije el formato de monto en el XML (detecta cambios de serialización).
- Que la conformidad XSD no se cumpla por vacuidad.

**Non-Goals:**

- Cambiar los constructores ni su formato de salida.
- Generar catálogos o tocar la política de firma.
- Cubrir las familias _exact_ con un generador propio (usan sus propios contratos).

## Decisions

| Decisión                                           | Racional                                                                                               | Alternativas consideradas                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **El port depende de A3**                          | El generador y el corpus hablan la representación de los tipos; si A3 cambia después, el corpus miente | Portear A4 primero y regenerar el corpus dos veces                                          |
| **El corpus se regenera, no se copia**             | Sus bytes dependen del constructor vigente                                                             | Copiar el XML local y fallar hasta regenerar                                                |
| **El formato de monto se fija sin ceros forzados** | `fractionDigits: 5` es máximo; y el golden test miente si cambia el formato                            | Fijar `100000.00000` (obliga a regenerar el corpus)                                         |
| **Presupuesto XSD propio**                         | `xmllint-wasm` por caso es mucho más caro que la aritmética                                            | Un único presupuesto (o el cuello de botella es XSD, o las otras propiedades pierden casos) |
| **El parser es público**                           | Es la inversa de los constructores y habilita consumir comprobantes recibidos                          | Helper interno (la propiedad de punto fijo no lo exercises fuera del repo)                  |

## Risks / Trade-offs

- **[Riesgo: el corpus y el parser quedan acoplados a la versión del constructor]** → el golden test falla ante cualquier cambio de bytes, que es justamente su propósito.
- **[Riesgo: coste de CI]** → presupuesto XSD configurable y separado.
- **[Riesgo: el parser no cubre los constructores _exact_]** → se documenta el alcance: el parser cubre los siete tipos de comprobante con los constructores vigentes.
- **[Riesgo: A4 sin A3]** → el port se ejecuta después de A3, en ese orden.

## Desviaciones encontradas al portar sobre `main`

El port se hizo sobre el árbol vigente, no sobre la línea de trabajo de la que
salió el diseño. Cuatro cosas cambian respecto de lo que el diseño asumía:

1. **La representación monetaria es la que declara cada constructor.** El
   contrato de la rama preserva las APIs `Number` legacy (_«Preserve legacy Number
   APIs»_) y el camino exacto ya es decimal exacto. El port trabaja, por tanto,
   sobre el contrato vigente: el generador, el parser y el corpus hablan el
   tipo que cada constructor declara. Las propiedades monetarias del camino
   exacto (con oráculo de enteros escalados) las aporta A3: no se duplican aquí.

2. **La identidad de los documentos se deriva, no se escribe.** Los
   constructores validan que la clave case con el consecutivo, la fecha y el
   contribuyente, y que el tipo de documento sea el oficial (FEC `08`, FEE `09`,
   REP `10`). Una clave escrita a mano se desincroniza en cuanto cambia un
   código: el generador y el corpus la construyen con `fixtureClave` y toman el
   consecutivo de su propio tramo.

3. **La exoneración y el reparto de medios de pago dependen de la familia.** El
   XSD admite `Exoneracion` dentro del impuesto sólo en tiquete, nota de
   crédito, nota de débito y factura de compra; la factura, la exportación y el
   recibo no lo admiten ahí. Los descuentos múltiples se reparten para que su
   suma deje la línea con neto positivo, y el reparto de medios de pago suma
   exactamente el total (el último absorbe el redondeo).

4. **Bug del port corregido:** el arbitrario generaba `discountAmount` y el
   código leía `descuentoAmount`, de modo que el descuento nunca se aplicaba
   (`Math.min(undefined, …)` → `NaN` → sin descuento). El nombre quedó
   unificado.
