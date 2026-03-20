---
summary: "Manifiesto del complemento + requisitos de esquema JSON (validación de configuración estricta)"
read_when:
  - Estás construyendo un complemento de OpenClaw
  - Necesitas enviar un esquema de configuración del complemento o depurar errores de validación del complemento
title: "Manifiesto del complemento"
---

# Manifiesto del complemento (openclaw.plugin.)

Esta página es solo para el **manifiesto de complemento nativo de OpenClaw**.

Para diseños de paquetes compatibles, consulta [Paquetes de complementos](/es/plugins/bundles).

Los formatos de paquete compatibles utilizan archivos de manifiesto diferentes:

- Paquete Codex: `.codex-plugin/plugin.json`
- Paquete Claude: `.claude-plugin/plugin.json` o el diseño predeterminado de componente de Claude
  sin manifiesto
- Paquete Cursor: `.cursor-plugin/plugin.json`

OpenClaw también detecta automáticamente esos diseños de paquete, pero no se validan
contra el esquema `openclaw.plugin.json` descrito aquí.

Para paquetes compatibles, OpenClaw actualmente lee los metadatos del paquete más las
raíces de habilidades declaradas, raíces de comandos de Claude, valores predeterminados del paquete Claude `settings.json` y
paquetes de hooks compatibles cuando el diseño coincide con las expectativas de ejecución de OpenClaw.

Cada complemento nativo de OpenClaw **debe** incluir un archivo `openclaw.plugin.json` en la
**raíz del complemento**. OpenClaw utiliza este manifiesto para validar la configuración
**sin ejecutar el código del complemento**. Los manifiestos que faltan o no son válidos se tratan como
errores del complemento y bloquean la validación de la configuración.

Consulta la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).
Para el modelo de capacidades nativo y la guía actual de compatibilidad externa:
[Modelo de capacidades](/es/tools/plugin#public-capability-model).

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

- `id` (string): id canónico del complemento.
- `configSchema` (object): Esquema JSON para la configuración del complemento (en línea).

Claves opcionales:

- `kind` (string): tipo de complemento (ejemplos: `"memory"`, `"context-engine"`).
- `channels` (array): ids de canales registrados por este complemento (capacidad de canal; ejemplo: `["matrix"]`).
- `providers` (array): ids de proveedores registrados por este complemento (capacidad de inferencia de texto).
- `providerAuthEnvVars` (objeto): variables de entorno de autenticación claveadas por el id del proveedor. Úselo cuando OpenClaw deba resolver las credenciales del proveedor desde las variables de entorno sin cargar primero el tiempo de ejecución del complemento.
- `providerAuthChoices` (matriz): metadatos de integración económica / elección de autenticación claveados por proveedor + método de autenticación. Úselo cuando OpenClaw deba mostrar un proveedor en selectores de elección de autenticación, resolución de proveedor preferido y ayuda de CLI sin cargar primero el tiempo de ejecución del complemento.
- `skills` (matriz): directorios de habilidades (skills) a cargar (relativos a la raíz del complemento).
- `name` (cadena): nombre para mostrar del complemento.
- `description` (cadena): resumen breve del complemento.
- `uiHints` (objeto): etiquetas de campo de configuración / marcadores de posición / indicadores sensibles para la representación de la interfaz de usuario.
- `version` (cadena): versión del complemento (informativa).

### forma `providerAuthChoices`

Cada entrada puede declarar:

- `provider`: id del proveedor
- `method`: id del método de autenticación
- `choiceId`: id estable de integración / elección de autenticación
- `choiceLabel` / `choiceHint`: etiqueta del selector + pista breve
- `groupId` / `groupLabel` / `groupHint`: metadatos del grupo de integración
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`: cableado opcional de un solo indicador de CLI para flujos de autenticación simples como claves de API

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

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*` deben hacer referencia a ids de complementos **descubribles**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si la configuración del complemento existe pero el complemento está **deshabilitado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

Consulte [Referencia de configuración](/es/configuration) para el esquema completo de `plugins.*`.

## Notas

- El manifiesto es **obligatorio para los complementos nativos de OpenClaw**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  descubrimiento + validación.
- `providerAuthEnvVars` es la ruta de metadatos económicos para sondas de autenticación, validación de marcadores de entorno
  y superficies de autenticación de proveedores similares que no deben iniciar el tiempo de ejecución del complemento
  solo para inspeccionar nombres de entorno.
- `providerAuthChoices` es la ruta de metadatos económicos para selectores de elección de autenticación,
  resolución de `--auth-choice`, asignación de proveedor preferido y registro simple
  de indicadores de CLI de incorporación antes de que se cargue el tiempo de ejecución del proveedor. Para metadatos
  del asistente en tiempo de ejecución que requieren código de proveedor, consulte
  [Ganchos de tiempo de ejecución del proveedor](/es/tools/plugin#provider-runtime-hooks).
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: `legacy` integrado).
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista de permisos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import en from "/components/footer/en.mdx";

<en />
