## ADDED Requirements

### Requirement: La cobertura se atribuye a las fuentes de cada paquete

La medición de cobertura SHALL incluir todas las fuentes de cada uno de los cinco paquetes del workspace, incluidas las que ninguna prueba importa, y SHALL excluir bundles construidos, pruebas y fixtures. La ejecución local ordinaria de pruebas SHALL seguir disponible sin instrumentación de cobertura.

#### Scenario: Una fuente no importada sigue siendo visible

- **WHEN** se mide la cobertura de un paquete con una fuente que ninguna prueba importa
- **THEN** el reporte incluye esa fuente con su cobertura real

#### Scenario: Un consumidor importa el bundle

- **WHEN** una prueba importa un artefacto construido del paquete
- **THEN** el bundle no aporta statements ni líneas al reporte de cobertura de fuentes

### Requirement: Los umbrales se basan en una medición reproducible

Cada paquete SHALL registrar un baseline con fecha, comando y versión de Node de CI para statements, branches, functions y lines, después de corregir la atribución. Los umbrales globales SHALL derivarse de ese baseline y los módulos críticos de clave, firma, entrega y schemas exact SHALL disponer de umbrales específicos más estrictos que el piso de su paquete. Las cifras históricas de referencia SHALL NOT sustituir una nueva medición del baseline.

#### Scenario: Se establece un umbral

- **WHEN** se fija o aumenta un umbral de cobertura
- **THEN** existe una medición reproducible que sustenta el valor y su margen por debajo del resultado medido

#### Scenario: Un módulo crítico cae bajo su piso

- **WHEN** la cobertura global pasa pero un módulo crítico queda bajo su umbral específico
- **THEN** la verificación falla por ese módulo

### Requirement: La verificación offline exige los umbrales

La verificación completa del repositorio SHALL ejecutar pruebas con cobertura y terminar con código distinto de cero cuando cualquier métrica exigida quede bajo su umbral. Las salidas de caché declaradas SHALL corresponder a los reportes producidos por cada tarea. La documentación SHALL describir la puerta y distinguir cobertura de conformidad XSD, autenticidad de firma y aceptación por Hacienda.

#### Scenario: La cobertura queda por debajo del umbral

- **WHEN** una métrica queda por debajo del umbral configurado durante la verificación completa
- **THEN** el comando termina con código distinto de cero e identifica el incumplimiento

#### Scenario: La puerta se verifica con un control negativo

- **WHEN** se eleva temporalmente un umbral por encima de la medición real
- **THEN** la verificación falla y, al restaurar el umbral válido, vuelve a pasar sin conservar la alteración temporal

### Requirement: Las pruebas críticas observan efectos reales con aislamiento

Las pruebas SHALL cubrir directamente los schemas exact y los handlers de CLI enumerados en la propuesta, las transiciones y persistencia del outbox y el camino persistente del orquestador. SHALL usar red simulada, certificados sintéticos generados en runtime y directorios temporales con limpieza, restaurando salida capturada, configuración y código de salida entre casos. SHALL NOT leer ni alterar el perfil real del usuario ni borrar fugas preexistentes del repositorio.

#### Scenario: El orquestador persiste antes del envío

- **WHEN** una prueba ejecuta el camino persistente del orquestador
- **THEN** comprueba el orden persistir-antes-de-enviar y el estado final observado

#### Scenario: Un handler falla

- **WHEN** un handler recibe una entrada inválida o falla una operación simulada
- **THEN** la prueba verifica la salida y el código de error y restaura el estado del proceso

#### Scenario: Una prueba escribe estado persistente

- **WHEN** la prueba termina, incluso por error
- **THEN** limpia solo sus temporales y conserva intactos el perfil real y los archivos preexistentes

### Requirement: El consumidor empaquetado prueba el outbox publicado

El consumidor instalado desde tarballs SHALL verificar los tipos públicos y un roundtrip runtime del outbox con persistencia, lectura, transición y reintento en un directorio temporal. Este smoke SHALL complementar la cobertura del workspace sin atribuir una métrica de cobertura a tarballs no instrumentados.

#### Scenario: Se prueba el paquete instalado

- **WHEN** se ejecuta el consumidor empaquetado
- **THEN** sus imports públicos y su roundtrip del outbox pasan y los temporales se eliminan
