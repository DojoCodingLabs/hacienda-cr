## ADDED Requirements

### Requirement: Un workflow programado mensual ejecuta `spec:check`

El repositorio SHALL disponer de un workflow de GitHub Actions que ejecute `pnpm spec:check` mensualmente en un checkout del repo y también bajo invocación manual (`workflow_dispatch`). El job SHALL usar únicamente las superficies declaradas en `packages/sdk/schemas/manifest.json`, sin credenciales de Hacienda, y SHALL terminar con el mismo código de salida que `spec:check` (0 sin diferencias, 1 con diferencias, 2 fallo operativo).

#### Scenario: Ejecución mensual programada

- **WHEN** llega la fecha mensual programada del workflow
- **THEN** el job ejecuta `pnpm spec:check` en un checkout limpio del repositorio

#### Scenario: Ejecución manual

- **WHEN** un maintainer dispara el workflow manualmente
- **THEN** el job ejecuta `pnpm spec:check` con el mismo comportamiento que en la ejecución programada

#### Scenario: El job no requiere credenciales de Hacienda

- **WHEN** el job consulta las superficies declaradas
- **THEN** lo hace con acceso público, sin secretos de usuario/contraseña de Hacienda

### Requirement: Una deriva detectada abre un issue etiquetado `spec-drift` con el informe pegado

Cuando la ejecución del workflow termina con código 1 (diferencias detectadas por `spec:check`), el job SHALL abrir un issue en el repositorio con la etiqueta `spec-drift` y un cuerpo que contenga el informe completo de `spec:check` pegado como texto. El issue SHALL identificar de qué comando proviene el informe. Cuando la ejecución termina con código 0, el job SHALL **no** abrir ni comentar ningún issue. La etiqueta `spec-drift` SHALL existir en el repo; si falta, el job SHALL crearla antes de abrir el issue.

#### Scenario: Deriva produce un issue con el informe

- **WHEN** `spec:check` termina con código 1 durante la ejecución del workflow
- **THEN** el job abre un issue con la etiqueta `spec-drift` cuyo cuerpo contiene el informe completo de `spec:check`

#### Scenario: Sin diferencias no hay issue

- **WHEN** `spec:check` termina con código 0 durante la ejecución del workflow
- **THEN** el job no abre ni comenta ningún issue

#### Scenario: La etiqueta `spec-drift` está disponible

- **WHEN** el repo no tiene aún la etiqueta `spec-drift`
- **THEN** el job la crea antes de abrir el issue de deriva

#### Scenario: Un informe muy largo se trunca con nota

- **WHEN** el informe de `spec:check` supera el límite de tamaño del cuerpo de un issue de GitHub
- **THEN** el job trunca el cuerpo con una nota explícita de truncamiento y el informe completo permanece en el log de la corrida

#### Scenario: Un issue nuevo referencia issues abiertos relacionados

- **WHEN** el job abre un issue nuevo y ya existen otros issues abiertos con la etiqueta `spec-drift`
- **THEN** el cuerpo del issue nuevo los menciona como relacionados

### Requirement: Un issue abierto con la misma huella del informe se comenta en lugar de duplicarse

Antes de abrir un issue por deriva, el job SHALL calcular una **huella determinista** del informe (mismo informe → misma huella) y buscar issues **abiertos** con la etiqueta `spec-drift` cuyo cuerpo original contenga esa misma huella. Si existe al menos uno, el job SHALL añadir el informe actual como **comentario** en ese issue en lugar de abrir uno nuevo. Si el issue con esa huella está cerrado, el job SHALL abrir un issue nuevo. Issues abiertos con huella distinta no bloquean la apertura de un issue nuevo. Un issue cuyo cuerpo **no** contenga el marcador de huella (creado a mano o anterior al job) SHALL ignorarse en la comparación sin fallar la corrida.

#### Scenario: Misma deriva dos meses seguidos comenta, no duplica

- **WHEN** el informe de esta corrida tiene la huella de un issue `spec-drift` aún abierto
- **THEN** el job comenta el informe actual en ese issue y no abre uno nuevo

#### Scenario: Deriva distinta abre un issue nuevo

- **WHEN** el informe de esta corrida tiene una huella que no coincide con ningún issue `spec-drift` abierto
- **THEN** el job abre un issue nuevo con la etiqueta y el informe

#### Scenario: El issue anterior fue cerrado

- **WHEN** existe un issue cerrado con la misma huella pero no hay issue abierto con esa huella
- **THEN** el job abre un issue nuevo (el deduplicador solo considera issues abiertos)

#### Scenario: Un issue abierto sin marcador de huella se ignora

- **WHEN** hay un issue abierto con la etiqueta `spec-drift` pero su cuerpo no contiene el marcador de huella
- **THEN** el job lo excluye de la comparación y continúa sin fallar

### Requirement: El job de deriva no muta el repositorio

El workflow SHALL ser de **solo reporte**: no cambia `currentSet`, no ejecuta `spec:update`, no commitea, no hace push y no abre pull requests. Su único efecto secundario permitido son las operaciones de issue (abrir, comentar, crear la etiqueta). La revisión humana del diff y la vendorización siguen siendo pasos posteriores manuales (`pnpm spec:update`).

#### Scenario: Ningún commit ni PR sale del job

- **WHEN** el workflow termina (con o sin deriva)
- **THEN** no se ha creado ningún commit,rama o pull request, y `manifest.json` y los vendorizados no han sido modificados

#### Scenario: El set vigente no cambia por sí solo

- **WHEN** el workflow detecta una versión nueva publicada
- **THEN** el job solo reporta la deriva; `currentSet` permanece intacto hasta una ejecución explícita de `spec:update` con `--set`

### Requirement: Un fallo operativo falla el job y nunca reporta "sin cambios"

Si durante la ejecución del workflow alguna superficie declarada resulta inaccesible (o el canario de `spec:check` falla, código 2), el job SHALL terminar fallando con un mensaje que nombre la superficie afectada y la causa, y SHALL **no** abrir ni comentar issues de deriva (no hay diagnóstico de deriva posible). Cuando **todas** las superficies fallan, el job SHALL fallar igualmente y en ningún caso SHALL imprimir ni publicar el veredicto `sin cambios`: la indisponibilidad total no es ausencia de deriva. Cualquier código de salida de `spec:check` distinto de 0 y 1 SHALL tratarse como fallo operativo, con el código original en el mensaje y el job terminando con código 2. Si las operaciones de reporte en GitHub (`gh`) fallan (token, API caída, rate limit), el job SHALL terminar con un error claro que identifique la operación fallida y código 2 — un fallo del canal de reporte no es "sin cambios" ni "sin deriva".

#### Scenario: Una superficie caída falla el job nombrándola

- **WHEN** una superficie declarada no responde durante `spec:check` en el workflow
- **THEN** el job termina fallando con un mensaje que nombra la superficie, y no abre ni comenta issues de deriva

#### Scenario: Todas las superficies caídas no producen "sin cambios"

- **WHEN** ninguna superficie declarada es accesible durante la ejecución
- **THEN** el job falla con error claro y no emite el veredicto `sin cambios` ni crea issues de deriva

#### Scenario: Código de salida inesperado de `spec:check`

- **WHEN** `spec:check` termina con un código distinto de 0, 1 y 2 (p. ej. 127)
- **THEN** el job falla como fallo operativo con el código original incluido en el mensaje de error y sale con código 2, no abre ni comenta issues de deriva, y no emite el veredicto `sin cambios`

#### Scenario: Fallo de GitHub al reportar la deriva

- **WHEN** `spec:check` termina con código 1 pero una operación de `gh` (crear etiqueta, abrir issue o comentar) falla
- **THEN** el job termina fallando con un error que identifica la operación fallida, y no emite el veredicto `sin cambios`
