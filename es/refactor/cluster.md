---
summary: "Refactorizar clústeres con mayor potencial de reducción de LOC"
read_when:
  - Quieres reducir el total de LOC sin cambiar el comportamiento
  - Estás eligiendo el siguiente pase de deduplicación o extracción
title: "Refactorizar Backlog del Clúster"
---

# Refactorizar Backlog del Clúster

Clasificados por probable reducción de LOC, seguridad y amplitud.

## 1. Configuración del complemento de canal y andamiaje de seguridad

Clúster de mayor valor.

Formas repetidas en muchos complementos de canal:

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

Ejemplos sólidos:

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

Forma probable de extracción:

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

Ahorros esperados:

- ~250-450 LOC

Riesgo:

- Medio. Cada canal tiene `isConfigured`, advertencias y normalización ligeramente diferentes.

## 2. Andamiaje de singleton de tiempo de ejecución de extensión

Muy seguro.

Casi todas las extensiones tienen el mismo soporte de tiempo de ejecución:

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

Ejemplos sólidos:

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

Variantes de caso especial:

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

Forma probable de extracción:

- `createPluginRuntimeStore<T>(errorMessage)`

Ahorros esperados:

- ~180-260 LOC

Riesgo:

- Bajo

## 3. Pasos de aviso de configuración y parche de configuración

Gran área de superficie.

Muchos archivos de configuración repiten:

- resolver id de cuenta
- solicitar entradas de lista blanca
- fusionar allowFrom
- establecer política DM
- solicitar secretos
- parchear configuración de nivel superior vs. alcance de cuenta

Ejemplos sólidos:

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

Costura de ayuda existente:

- `src/channels/plugins/setup-wizard-helpers.ts`

Forma probable de extracción:

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

Ahorros esperados:

- ~300-600 LOC

Riesgo:

- Medio. Es fácil generalizar en exceso; mantenga las ayudas estrechas y componibles.

## 4. Fragmentos de esquema de configuración multicuenta

Fragmentos de esquema repetidos en todas las extensiones.

Patrones comunes:

- `const allowFromEntry = z.union([z.string(), z.number()])`
- esquema de cuenta más:
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- campos DM/grupo repetidos
- campos de política de markdown/herramienta repetidos

Ejemplos sólidos:

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

Forma probable de extracción:

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

Ahorros esperados:

- ~120-220 LOC

Riesgo:

- Bajo a medio. Algunos esquemas son simples, otros son especiales.

## 5. Inicio del ciclo de vida del webhook y el monitor

Buen clúster de valor medio.

Patrones de configuración de `startAccount` / monitor repetidos:

- resolver cuenta
- calcular ruta de webhook
- registro de inicio
- iniciar monitor
- esperar para abortar
- limpieza
- actualizaciones del sumidero de estado

Ejemplos sólidos:

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

Costura de ayuda existente:

- `src/plugin-sdk/channel-lifecycle.ts`

Forma probable de extracción:

- ayuda para el ciclo de vida del monitor de cuenta
- ayuda para el inicio de cuenta respaldado por webhook

Ahorros esperados:

- ~150-300 LOC

Riesgo:

- Medio a alto. Los detalles del transporte divergen rápidamente.

## 6. Limpieza de clones exactos pequeños

Depósito de limpieza de bajo riesgo.

Ejemplos:

- detección de argv de puerta de enlace duplicada:
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- renderizado de diagnóstico de puerto duplicado:
  - `src/cli/daemon-cli/restart-health.ts`
- construcción de clave de sesión duplicada:
  - `src/web/auto-reply/monitor/broadcast.ts`

Ahorros esperados:

- ~30-60 LOC

Riesgo:

- Bajo

## Clústeres de prueba

### Accesorios de eventos de webhook LINE

Ejemplos sólidos:

- `src/line/bot-handlers.test.ts`

Extracción probable:

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

Ahorros esperados:

- ~120-180 LOC

### Matriz de autenticación de comandos nativos de Telegram

Ejemplos sólidos:

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

Extracción probable:

- constructor de contexto de foro
- ayudante de aserción de mensaje de denied
- casos de autenticación dirigidos por tabla

Ahorros esperados:

- ~80-140 LOC

### Configuración del ciclo de vida de Zalo

Ejemplos sólidos:

- `extensions/zalo/src/monitor.lifecycle.test.ts`

Extracción probable:

- arnés de configuración de monitor compartido

Ahorros esperados:

- ~50-90 LOC

### Pruebas de opción no admitida de llm-context de Brave

Ejemplos sólidos:

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

Extracción probable:

- `it.each(...)` matriz

Ahorros esperados:

- ~30-50 LOC

## Orden sugerido

1. Boilerplate de singleton de tiempo de ejecución
2. Limpieza de clones exactos pequeños
3. Extracción de constructor de configuración y seguridad
4. Extracción de ayudante de prueba
5. Extracción de paso de incorporación
6. Extracción de ayudante del ciclo de vida del monitor

import en from "/components/footer/en.mdx";

<en />
