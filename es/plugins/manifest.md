---
summary: "Manifiesto del complemento + Requisitos del esquema JSON (validación de configuración estricta)"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto del complemento"
---

# Manifiesto de complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulte [Paquetes de complementos](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan diferentes archivos de manifiesto:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño de componente Claude predeterminado
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquetes, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, las raíces de comandos de Claude, los valores predeterminados
del paquete Claude `settings.json` y los paquetes de ganchos compatibles cuando el diseño coincide con las expectativas de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos que faltan o son inválidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Vea la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).

## Campos obligatorios

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

Claves obligatorias:

- `id` (cadena): id canónico del complemento.
- `configSchema` (objeto): Esquema JSON para la configuración del complemento (en línea).

Claves opcionales:

- `kind` (cadena): tipo de complemento (ejemplos: `"memory"`, `"context-engine"`).
- `channels` (matriz): ids de canales registrados por este complemento (ejemplo: `["matrix"]`).
- `providers` (matriz): ids de proveedores registrados por este complemento.
- `providerAuthEnvVars` (objeto): variables de entorno de autenticación claveadas por id de proveedor. Use esto
  cuando OpenClaw deba resolver las credenciales del proveedor desde el entorno sin cargar
  primero el tiempo de ejecución del complemento.
- `providerAuthChoices` (matriz): metadatos de elección de autenticación/incorporación económica claveados por
  proveedor + método de autenticación. Use esto cuando OpenClaw deba mostrar un proveedor en
  selectores de elección de autenticación, resolución de proveedor preferido y ayuda de CLI sin
  cargar primero el tiempo de ejecución del complemento.
- `skills` (array): directorios de habilidades a cargar (relativos a la raíz del complemento).
- `name` (string): nombre para mostrar del complemento.
- `description` (string): resumen breve del complemento.
- `uiHints` (object): etiquetas de campo de configuración/marcadores de posición/indicadores sensibles para el renderizado de la interfaz de usuario.
- `version` (string): versión del complemento (informativa).

### forma `providerAuthChoices`

Cada entrada puede declarar:

- `provider`: id del proveedor
- `method`: id del método de autenticación
- `choiceId`: id establecido de incorporación/selección de autenticación
- `choiceLabel` / `choiceHint`: etiqueta del selector + pista breve
- `groupId` / `groupLabel` / `groupHint`: metadatos agrupados del contenedor de incorporación
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`: indicador opcional único
  cableado CLI para flujos de autenticación simples como claves de API

Ejemplo:

```json
{
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API key",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key"
    }
  ]
}
```

## Requisitos de esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complementos **detectables**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si existe la configuración del complemento pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  detección + validación.
- `providerAuthEnvVars` es la ruta de metadatos ligera para sondas de autenticación, validación de marcadores de entorno y superficies similares de autenticación de proveedores que no deberían iniciar el tiempo de ejecución del complemento solo para inspeccionar los nombres de entorno.
- `providerAuthChoices` es la ruta de metadatos ligera para selectores de elección de autenticación, resolución de `--auth-choice`, mapeo de proveedor preferido y registro simple de indicadores de CLI para incorporación antes de que se cargue el tiempo de ejecución del proveedor.
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: `legacy` integrado).
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import es from "/components/footer/es.mdx";

<es />
