## Purpose

Define cómo el SDK carga credenciales PKCS#12 (`.p12`) sin imponer un parser criptográfico en la instalación: la dependencia es opcional, el fallo es explícito y accionable, y la extracción de llave y certificado no cambia cuando el parser está disponible.

## ADDED Requirements

### Requirement: Carga de credenciales con parser opcional

El SDK SHALL cargar credenciales desde un `.p12` únicamente cuando el consumidor haya provisto un parser PKCS#12 compatible. Si el parser no está disponible, el SDK SHALL fallar cerrado con un error tipado y accionable, sin intentar rutas alternativas, reintentos ni degradación silenciosa.

#### Scenario: Parser disponible

- **WHEN** un consumidor llama al cargador de credenciales con un `.p12` válido y un PIN correcto, y el parser PKCS#12 está instalado
- **THEN** el SDK devuelve la llave privada importable por WebCrypto, el certificado en DER y el certificado en PEM
- **AND** el resultado es equivalente al de la versión anterior del SDK para el mismo `.p12` y PIN

#### Scenario: Parser ausente

- **WHEN** un consumidor llama al cargador de credenciales y el parser PKCS#12 no está instalado
- **THEN** el SDK lanza un error de firma tipado antes de leer o interpretar el contenido del `.p12`
- **AND** el mensaje identifica la dependencia faltante y el comando de instalación requerido
- **AND** el mensaje no incluye el PIN, el contenido del `.p12` ni material de clave

### Requirement: Invariante de empaquetado sin parser obligatorio

El manifiesto publicado del SDK SHALL declarar el parser PKCS#12 como dependencia peer opcional y SHALL NOT declararlo como dependencia runtime obligatoria. La instalación del SDK sin el parser SHALL completarse y el paquete SHALL poder importarse sin ejecutar la ruta de carga de `.p12`.

#### Scenario: Consumidor que nunca carga un `.p12`

- **WHEN** un consumidor instala el SDK sin instalar el parser PKCS#12
- **THEN** la instalación finaliza correctamente
- **AND** el paquete se importa y expone su API sin error
- **AND** el árbol de dependencias de producción no contiene el parser ni su advisory asociado

#### Scenario: Metadatos de dependencia opcional

- **WHEN** se inspecciona el manifiesto publicado del SDK
- **THEN** el parser PKCS#12 figura en dependencias peer con la marca de opcional
- **AND** no figura en dependencias runtime obligatorias ni en dependencias opcionales instaladas por defecto

### Requirement: Extracción y validación sin cambios de comportamiento

Cuando el parser está disponible, el cargador SHALL preservar las validaciones y límites existentes: tamaño máximo de entrada de 1 MiB, PIN obligatorio, clave RSA de al menos 2048 bits, certificado dentro de su período de validez y correspondencia entre la clave privada y el certificado.

#### Scenario: PIN incorrecto

- **WHEN** el consumidor provee un PIN que no descifra el `.p12`
- **THEN** el SDK lanza un error de firma tipado
- **AND** no devuelve llave ni certificado parciales

#### Scenario: Certificado fuera de vigencia

- **WHEN** el `.p12` contiene un certificado expirado o aún no válido
- **THEN** el SDK rechaza la carga con un error de firma tipado

#### Scenario: Clave y certificado no corresponden

- **WHEN** la clave privada del `.p12` no coincide con el certificado incluido
- **THEN** el SDK rechaza la carga con un error de firma tipado

#### Scenario: Entrada sobredimensionada

- **WHEN** la entrada supera el límite de 1 MiB
- **THEN** el SDK rechaza la carga antes de invocar al parser

### Requirement: La ausencia del parser no altera el resto de la firma

El SDK SHALL NOT invocar el parser PKCS#12 en rutas distintas de la carga de credenciales. La verificación de firmas de respuesta, la validación de XML, la generación de documentos y el oráculo nativo SHALL seguir funcionando sin el parser instalado.

#### Scenario: Verificación de respuestas sin parser

- **WHEN** un consumidor verifica una respuesta de Hacienda sin tener instalado el parser PKCS#12
- **THEN** la verificación se ejecuta con el mismo resultado que con el parser instalado

#### Scenario: Validación y generación sin parser

- **WHEN** un consumidor valida o genera XML sin tener instalado el parser PKCS#12
- **THEN** la operación se completa sin intentar resolver la dependencia opcional
