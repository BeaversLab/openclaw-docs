---
summary: "Manifiesto de complemento + Requisitos del esquema JSON (validación de configuración estricta)"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Manifiesto del complemento"
---

# Manifiesto de complemento (openclaw.plugin.)

Cada complemento **debe** incluir un archivo `openclaw.plugin.json` en la **raíz del complemento**.
OpenClaw utiliza este manifiesto para validar la configuración **sin ejecutar el código
del complemento**. Los manifiestos faltantes o no válidos se tratan como errores del complemento y bloquean
la validación de la configuración.

Consulte la guía completa del sistema de complementos: [Complementos](/es/tools/plugin).

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
- `configSchema` (objeto): esquema JSON para la configuración del complemento (en línea).

Claves opcionales:

- `kind` (cadena): tipo de complemento (ejemplos: `"memory"`, `"context-engine"`).
- `channels` (matriz): ids de canal registrados por este complemento (ejemplo: `["matrix"]`).
- `providers` (matriz): ids de proveedor registrados por este complemento.
- `skills` (matriz): directorios de habilidades para cargar (relativos a la raíz del complemento).
- `name` (cadena): nombre para mostrar del complemento.
- `description` (cadena): resumen breve del complemento.
- `uiHints` (objeto): etiquetas/marcadores de posición/indicadores confidenciales de los campos de configuración para la representación de la interfaz de usuario.
- `version` (cadena): versión del complemento (informativo).

## Requisitos del esquema JSON

- **Cada complemento debe incluir un esquema JSON**, incluso si no acepta ninguna configuración.
- Se acepta un esquema vacío (por ejemplo, `{ "type": "object", "additionalProperties": false }`).
- Los esquemas se validan en el momento de lectura/escritura de la configuración, no en tiempo de ejecución.

## Comportamiento de validación

- Las claves `channels.*` desconocidas son **errores**, a menos que el id del canal sea declarado por
  un manifiesto de complemento.
- `plugins.entries.<id>`, `plugins.allow`, `plugins.deny` y `plugins.slots.*`
  deben hacer referencia a ids de complemento **detectables**. Los ids desconocidos son **errores**.
- Si un complemento está instalado pero tiene un manifiesto o esquema roto o faltante,
  la validación falla y Doctor informa el error del complemento.
- Si la configuración del complemento existe pero el complemento está **desactivado**, la configuración se mantiene y
  se muestra una **advertencia** en Doctor + registros.

## Notas

- El manifiesto es **obligatorio para todos los complementos**, incluidas las cargas del sistema de archivos local.
- El tiempo de ejecución todavía carga el módulo del complemento por separado; el manifiesto es solo para
  descubrimiento y validación.
- Los tipos de complementos exclusivos se seleccionan a través de `plugins.slots.*`.
  - `kind: "memory"` es seleccionado por `plugins.slots.memory`.
  - `kind: "context-engine"` es seleccionado por `plugins.slots.contextEngine`
    (predeterminado: `legacy` integrado).
- Si su complemento depende de módulos nativos, documente los pasos de compilación y cualquier
  requisito de lista de permitidos del administrador de paquetes (por ejemplo, pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`).

import es from "/components/footer/es.mdx";

<es />
