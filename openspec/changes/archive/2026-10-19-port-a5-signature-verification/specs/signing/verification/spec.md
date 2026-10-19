## MODIFIED Requirements

### Requirement: El certificado del firmante es válido

El verificador SHALL extraer el certificado X.509 dentro de `ds:X509Certificate`, SHALL comprobar su vigencia (`notBefore` ≤ ahora ≤ `notAfter`) y SHALL devolver `CertificateExpired` o `CertificateNotYetValid` cuando corresponda. La confianza en el firmante SHALL establecerse por **pin de hoja explícito** — el certificado esperado, provisionado y revisado — y NO por cadena de CA implícita ni por el certificado embebido en el propio mensaje; cuando no se provea pin, el resultado SHALL declarar la confianza como no establecida y NO SHALL emitir `valid: true` sólo porque la firma cuadre. No se SHALL verificar revocación por red.

#### Scenario: Un certificado vencido falla

- **WHEN** el XML lleva una firma generada con un certificado ya expirado
- **THEN** el verificador devuelve `valid: false` con `CertificateExpired`

#### Scenario: Sin confianza declarada, la cadena queda parcial

- **WHEN** se verifica sin pin de hoja explícito
- **THEN** el resultado declara la confianza como no establecida y no declara
  `valid: true` sólo por la firma correcta

#### Scenario: El certificado embebido no establece confianza

- **WHEN** el XML declara un certificado embebido que no está en el conjunto de
  pins revisados
- **THEN** la verificación falla nombrando que el certificado no está permitido

### Requirement: Verificación externa opcional y no bloqueante en CI

El SDK SHALL permitir una verificación cruzada contra una segunda implementación. La
implementación por defecto del repositorio SHALL ser el oráculo de `libxml2`
(`xmllint --c14n`) más OpenSSL sobre el mismo documento firmado, que no requiere
red ni credenciales. El verificador SHALL aceptar además un binario externo
alternativo (p. ej. `xmlsec1`) mediante `options.externalVerifierBinary` o la
variable de entorno `XMLSEC1_BIN`; si no hay binario disponible o no se usan
tests, SHALL reportarse `external: 'skipped'` sin fallar la suite, y cuando esté
disponible SHALL fallar si su resultado difiere del verificador interno del SDK.

#### Scenario: Sin herramienta externa, la suite no falla

- **WHEN** `xmlsec1` no está en el entorno
- **THEN** el paso externo se registra como `skipped` y las demás comprobaciones continúan

#### Scenario: Con herramienta externa, un resultado distinto falla

- **WHEN** `XMLSEC1_BIN` apunta a un binario que confirma/rechaza distinto que el SDK
- **THEN** la prueba contrasta y falla nombrando ambas fuentes

#### Scenario: El oráculo por defecto contrasta sin red

- **WHEN** se ejecuta la verificación cruzada con el oráculo del repositorio
- **THEN** el documento firmado verifica bajo el oráculo sin red ni credenciales y
  un documento alterado es rechazado por él

### Requirement: Verificar una firma XAdES-EPES sobre un documento

El verificador SHALL tomar un documento firmado por el SDK y comprobarlo en serio:
el digest de cada referencia, la firma sobre `ds:SignedInfo` canónico, la
canonicalización C14N declarada, la vigencia del certificado y la identidad de
las partes. La comprobación SHALL determinar el tipo de comprobante por el
elemento raíz y NO SHALL adivinarlo por el contenido.

#### Scenario: Un documento firmado válido verifica

- **WHEN** se verifica un comprobante firmado por el SDK con un pin de hoja revisado
- **THEN** el verificador devuelve `valid: true` y enumera las comprobaciones exitosas

#### Scenario: La raíz determina el tipo

- **WHEN** se verifica un XML con raíz `FacturaElectronica` u otra de las siete
- **THEN** el verificador declara la raíz y el tipo de comprobante, sin inferirlo
  del contenido

#### Scenario: Un documento sin firma no verifica

- **WHEN** el XML de entrada no contiene un elemento `ds:Signature`
- **THEN** el verificador devuelve `valid: false` con un error que identifica la ausencia de firma y no lanza otra excepción

#### Scenario: Un XML mal formado se rechaza

- **WHEN** se pasa un XML mal formado o con una declaración de entidad externa
- **THEN** el verificador lanza o devuelve un error tipado que identifica la entrada inválida y no resuelve ni la entidad ni archivos del disco

### Requirement: La política de firma XAdES-EPES v4.4 concuerda con la publicada

El verificador SHALL leer el bloque `SignaturePolicyIdentifier` y comparar por
igualdad exacta el `SignaturePolicyId` con el identificador oficial vigente y el
`ds:SigPolicyHash` con el SHA-256 en Base64 del PDF de política vendorizado, y
SHALL comprobar que el método de digest declarado sea SHA-256. Cualquier
divergencia SHALL marcar el resultado inválido con un código nombrado.

#### Scenario: La política publicada se verifica

- **WHEN** un documento está firmado con la política v4.4 vigente
- **THEN** los tres componentes (identificador, hash, método) concuerdan y la
  política aparece como `passed`

#### Scenario: Un identificador de política adulterado falla

- **WHEN** se sustituye el `SignaturePolicyId` por un URI distinto
- **THEN** el resultado falla con `PolicyMismatch` y `valid: false`

#### Scenario: Un hash de política adulterado falla

- **WHEN** se sustituye el `ds:SigPolicyHash` por otro valor Base64
- **THEN** el resultado falla con `PolicyMismatch` porque el digest no concuerda
  con la política vigente
