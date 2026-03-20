---
title: Refactorización de la duplicación de sesión saliente (Issue #1520)
description: Rastrear notas, decisiones, pruebas y elementos abiertos de la refactorización de la duplicación de sesión saliente.
summary: "Notas de refactorización para duplicar envíos salientes en sesiones de canal de destino"
read_when:
  - Trabajando en el comportamiento de duplicación de transcripción/sesión saliente
  - Depuración de la derivación de sessionKey para rutas de herramientas de envío/mensaje
---

# Reestructuración de la duplicación de sesión saliente (Incidencia #1520)

## Estado

- En curso.
- Enrutamiento de canal del núcleo y complementos actualizado para la duplicación saliente.
- El envío de la puerta de enlace ahora deriva la sesión objetivo cuando se omite sessionKey.

## Contexto

Los envíos salientes se duplicaban en la sesión del agente _actual_ (clave de sesión de herramienta) en lugar de en la sesión del canal objetivo. El enrutamiento entrante utiliza claves de sesión de canal/par, por lo que las respuestas salientes aterrizaban en la sesión incorrecta y los objetivos de primer contacto a menudo carecían de entradas de sesión.

## Objetivos

- Duplicar mensajes salientes en la clave de sesión del canal objetivo.
- Crear entradas de sesión al salir cuando falten.
- Mantener el ámbito del hilo/tema alineado con las claves de sesión entrantes.
- Cubrir canales principales más extensiones incluidas.

## Resumen de implementación

- Nuevo asistente de enrutamiento de sesión saliente:
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` construye la sessionKey de destino usando `buildAgentSessionKey` (dmScope + identityLinks).
  - `ensureOutboundSessionEntry` escribe `MsgContext` mínima a través de `recordSessionMetaFromInbound`.
- `runMessageAction` (enviar) deriva la sessionKey de destino y la pasa a `executeSendAction` para su duplicación.
- `message-tool` ya no duplica directamente; solo resuelve el agentId desde la clave de sesión actual.
- La ruta de envío del complemento duplica a través de `appendAssistantMessageToSessionTranscript` usando la sessionKey derivada.
- El envío de la puerta de enlace deriva una clave de sesión objetivo cuando no se proporciona ninguna (agente predeterminado) y asegura una entrada de sesión.

## Manejo de hilos/temas

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (sufijo).
- Discord: threadId/replyTo -> `resolveThreadSessionKeys` con `useSuffix=false` para coincidir con la entrada (el id del canal del hilo ya delimita la sesión).
- Telegram: los IDs de tema se mapean a `chatId:topic:<id>` a través de `buildTelegramGroupPeerId`.

## Extensiones cubiertas

- Matrix, MS Teams, Mattermost, BlueBubbles, Nextcloud Talk, Zalo, Zalo Personal, Nostr, Tlon.
- Notas:
  - Los destinos de Mattermost ahora eliminan `@` para el enrutamiento de claves de sesión DM.
  - Zalo Personal usa el tipo de par DM para destinos 1:1 (solo grupo cuando `group:` está presente).
  - Los destinos de grupo de BlueBubbles eliminan los prefijos `chat_*` para coincidir con las claves de sesión de entrada.
  - La réplica automática de hilos de Slack coincide con los ids de canal sin distinción de mayúsculas y minúsculas.
  - El envío de Gateway pone en minúsculas las claves de sesión proporcionadas antes de la réplica.

## Decisiones

- **Derivación de sesión de envío de Gateway**: si se proporciona `sessionKey`, úsela. Si se omite, derive una sessionKey del destino + agente predeterminado y duplique allí.
- **Creación de entrada de sesión**: siempre use `recordSessionMetaFromInbound` con `Provider/From/To/ChatType/AccountId/Originating*` alineados con los formatos de entrada.
- **Normalización de destinos**: el enrutamiento saliente usa destinos resueltos (post `resolveChannelTarget`) cuando están disponibles.
- **Uso de mayúsculas en clave de sesión**: canonicice las claves de sesión a minúsculas al escribir y durante las migraciones.

## Pruebas Añadidas/Actualizadas

- `src/infra/outbound/outbound.test.ts`
  - Clave de sesión de hilo de Slack.
  - Clave de sesión de tema de Telegram.
  - identityLinks dmScope con Discord.
- `src/agents/tools/message-tool.test.ts`
  - Deriva el agentId de la clave de sesión (no se pasa ninguna sessionKey).
- `src/gateway/server-methods/send.test.ts`
  - Deriva la clave de sesión cuando se omite y crea la entrada de sesión.

## Elementos Abiertos / Seguimientos

- El complemento de llamadas de voz utiliza claves de sesión `voice:<phone>` personalizadas. La asignación saliente no está estandarizada aquí; si message-tool debe admitir envíos de llamadas de voz, agregue una asignación explícita.
- Confirme si algún complemento externo utiliza formatos `From/To` no estándar más allá del conjunto incluido.

## Archivos Modificados

- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- Pruebas en:
  - `src/infra/outbound/outbound.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`

import en from "/components/footer/en.mdx";

<en />
