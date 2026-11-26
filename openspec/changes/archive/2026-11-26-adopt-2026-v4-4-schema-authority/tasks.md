## 1. Evidencia

- [x] 1.1 Descargar los nueve XSD de `https://www.hacienda.go.cr/docs/` y confirmar SHA-256, tamaño y `Last-Modified` idénticos a `2026/v4.4/` (2026-11-26).
- [x] 1.2 Descargar el comunicado `ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf` y el PDF de Anexos de OVi; registrar URL, `Last-Modified`, SHA-256 y el texto citado (obligatoriedad 2026-11-01, Bitácora 22/04/2026).
- [x] 1.3 Comprobar el estado de ATV (página 200, archivos 404) y del CDN de la política.

## 2. Manifiesto y comandos

- [x] 2.1 `currentSet: "2026/v4.4"`, `nextSet` omitido, `2024/v4.4` conservado; `effectiveFrom`, `authority` y `lastModified` del set 2026; ensayo de `spec:update --set 2026/v4.4` sobre una copia.
- [x] 2.2 `codesSet` en el manifiesto y en `codes:extract`; `codes.json` registra `codesSet` y se regenera idéntico salvo esa clave.
- [x] 2.3 `spec:verify`: `currentSet` no `policyOnly`, coherencia de `nextSet` y `codesSet`, con pruebas.
- [x] 2.4 `spec:check`/`spec:update`: comparar solo el set vigente y la política; no adelantar `downloadedAt` de un set no descargado; pruebas con ATV retirado.
- [x] 2.5 Prueba golden del SDK con los hashes de los nueve XSD 2026 y el set embebido.

## 3. Textos y ProveedorSistemas

- [x] 3.1 Mensaje de clave inválida de `hacienda status` y descripción de `hacienda get`.
- [x] 3.2 `proveedorSistemas` en MCP (`create_invoice`, `create_invoice_exact`): alfanumérico 9–20 y descripción según el Anexo.
- [x] 3.3 `provider_id` opcional en el perfil del SDK; `auth login --provider-id` (conservado al repetir el login); `auth status` lo muestra; `draft --profile` lo usa o advierte.

## 4. Documentación

- [x] 4.1 Registro de procedencia: autoridad declarada, fuentes primarias, nueva comprobación, decisión de #118 cerrada, historial.
- [x] 4.2 `v4.4-compliance.md` (obligatoriedad vigente, pregunta abierta 1 resuelta), README de esquemas, README de la CLI, `reference.md`, nota en el informe de conformidad.
- [x] 4.3 Changesets.
