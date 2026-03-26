---
title: "Crear Extensiones"
summary: "Guía paso a paso para crear extensiones de canales y proveedores de OpenClaw"
read_when:
  - You want to create a new OpenClaw plugin or extension
  - You need to understand the plugin SDK import patterns
  - You are adding a new channel or provider to OpenClaw
---

# Crear Extensiones

Esta guía explica cómo crear una extensión de OpenClaw desde cero. Las extensiones
pueden agregar canales, proveedores de modelos, herramientas u otras capacidades.

## Requisitos previos

- Repositorio de OpenClaw clonado y dependencias instaladas (`pnpm install`)
- Familiaridad con TypeScript (ESM)

## Estructura de la extensión

Cada extensión se encuentra en `extensions/<name>/` y sigue este diseño:

```
extensions/my-channel/
├── package.json          # npm metadata + openclaw config
├── index.ts              # Entry point (defineChannelPluginEntry)
├── setup-entry.ts        # Setup wizard (optional)
├── api.ts                # Public contract barrel (optional)
├── runtime-api.ts        # Internal runtime barrel (optional)
└── src/
    ├── channel.ts        # Channel adapter implementation
    ├── runtime.ts        # Runtime wiring
    └── *.test.ts         # Colocated tests
```

## Paso 1: Crear el paquete

Crear `extensions/my-channel/package.json`:

```json
{
  "name": "@openclaw/my-channel",
  "version": "2026.1.1",
  "description": "OpenClaw My Channel plugin",
  "type": "module",
  "dependencies": {},
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (plugin)",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Short description of the channel.",
      "order": 80
    },
    "install": {
      "npmSpec": "@openclaw/my-channel",
      "localPath": "extensions/my-channel"
    }
  }
}
```

El campo `openclaw` indica al sistema de complementos qué proporciona su extensión.
Para los complementos de proveedor, use `providers` en lugar de `channel`.

## Paso 2: Definir el punto de entrada

Crear `extensions/my-channel/index.ts`:

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Connects OpenClaw to My Channel",
  plugin: {
    // Channel adapter implementation
  },
});
```

Para los complementos de proveedor, use `definePluginEntry` en su lugar.

## Paso 3: Importar desde subrutas enfocadas

El SDK del complemento expone muchas subrutas enfocadas. Importe siempre desde
subrutas específicas en lugar de la raíz monolítica:

```typescript
// Correct: focused subpaths
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
import { createChannelPairingController } from "openclaw/plugin-sdk/channel-pairing";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";
import { resolveChannelGroupRequireMention } from "openclaw/plugin-sdk/channel-policy";

// Wrong: monolithic root (lint will reject this)
import { ... } from "openclaw/plugin-sdk";
```

Subrutas comunes:

| Subruta                             | Propósito                                                |
| ----------------------------------- | -------------------------------------------------------- |
| `plugin-sdk/core`                   | Definiciones de entrada de complementos, tipos base      |
| `plugin-sdk/channel-setup`          | Adaptadores/asistentes de configuración opcionales       |
| `plugin-sdk/channel-pairing`        | Primitivas de emparejamiento de DM                       |
| `plugin-sdk/channel-reply-pipeline` | Cableado de prefijo + escritura de respuesta             |
| `plugin-sdk/channel-config-schema`  | Constructores de esquemas de configuración               |
| `plugin-sdk/channel-policy`         | Asistentes de políticas de Grupo/DM                      |
| `plugin-sdk/secret-input`           | Análisis/asistentes de entrada de secretos               |
| `plugin-sdk/webhook-ingress`        | Asistentes de solicitud/destino de webhooks              |
| `plugin-sdk/runtime-store`          | Almacenamiento persistente de complementos               |
| `plugin-sdk/allow-from`             | Resolución de lista de permitidos                        |
| `plugin-sdk/reply-payload`          | Tipos de respuesta de mensaje                            |
| `plugin-sdk/provider-onboard`       | Parches de configuración de incorporación de proveedores |
| `plugin-sdk/testing`                | Utilidades de prueba                                     |

Utilice la primitiva más estrecha que coincida con el trabajo. Recurra a `channel-runtime`
u otros barriles de ayuda más grandes solo cuando aún no exista una subruta dedicada.

## Paso 4: Usa barriles locales para importaciones internas

Dentro de tu extensión, crea archivos barril para compartir código interno en lugar
de importar a través del SDK del complemento:

```typescript
// api.ts — public contract for this extension
export { MyChannelConfig } from "./src/config.js";
export { MyChannelRuntime } from "./src/runtime.js";

// runtime-api.ts — internal-only exports (not for production consumers)
export { internalHelper } from "./src/helpers.js";
```

**Guarda rail de autoimportación**: nunca importes tu propia extensión a través de su
ruta de contrato SDK publicada desde archivos de producción. Enruta las importaciones internas
a través de `./api.ts` o `./runtime-api.ts` en su lugar. El contrato SDK es para
consumidores externos únicamente.

## Paso 5: Agregar un manifiesto de complemento

Crea `openclaw.plugin.json` en la raíz de tu extensión:

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "name": "My Channel Plugin",
  "description": "Connects OpenClaw to My Channel"
}
```

Consulta [Manifiesto de complemento](/es/plugins/manifest) para ver el esquema completo.

## Paso 6: Probar con pruebas de contrato

OpenClaw ejecuta pruebas de contrato en todos los complementos registrados. Después de agregar tu
extensión, ejecuta:

```bash
pnpm test:contracts:channels   # channel plugins
pnpm test:contracts:plugins    # provider plugins
```

Las pruebas de contrato verifican que tu complemento se ajusta a la interfaz esperada (asistente
de configuración, vinculación de sesión, manejo de mensajes, política de grupo, etc.).

Para pruebas unitarias, importa auxiliares de prueba desde la superficie de prueba pública:

```typescript
import { createTestRuntime } from "openclaw/plugin-sdk/testing";
```

## Aplicación de reglas Lint

Tres scripts hacen cumplir los límites del SDK:

1. **Sin importaciones raíz monolíticas** — `openclaw/plugin-sdk` raíz se rechaza
2. **Sin importaciones directas de src/** — las extensiones no pueden importar `../../src/` directamente
3. **Sin autoimportaciones** — las extensiones no pueden importar su propia subruta `plugin-sdk/<name>`

Ejecuta `pnpm check` para verificar todos los límites antes de confirmar.

## Lista de verificación

Antes de enviar tu extensión:

- [ ] `package.json` tiene los metadatos `openclaw` correctos
- [ ] El punto de entrada usa `defineChannelPluginEntry` o `definePluginEntry`
- [ ] Todas las importaciones usan rutas `plugin-sdk/<subpath>` enfocadas
- [ ] Las importaciones internas usan barriles locales, no autoimportaciones del SDK
- [ ] El manifiesto `openclaw.plugin.json` está presente y es válido
- [ ] Las pruebas de contrato pasan (`pnpm test:contracts`)
- [ ] Pruebas unitarias colocalizadas como `*.test.ts`
- [ ] `pnpm check` pasa (lint + formato)
- [ ] Página de documentación creada en `docs/channels/` o `docs/plugins/`

import es from "/components/footer/es.mdx";

<es />
