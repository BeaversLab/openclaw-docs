---
title: Reestructuración de la duplicación de sesión saliente (Incidencia #1520)
description: Rastrear las notas, decisiones, pruebas y elementos pendientes de la reestructuración de la duplicación de sesión saliente.
summary: "Notas de reestructuración para duplicar envíos salientes en sesiones de canal objetivo"
read_when:
  - Working on outbound transcript/session mirroring behavior
  - Debugging sessionKey derivation for send/message tool paths
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
  - `resolveOutboundSessionRoute` construye la sessionKey objetivo usando `buildAgentSessionKey` (dmScope + identityLinks).
  - `ensureOutboundSessionEntry` escribe un `MsgContext` mínimo a través de `recordSessionMetaFromInbound`.
- `runMessageAction` (enviar) deriva la sessionKey objetivo y la pasa a `executeSendAction` para su duplicación.
- `message-tool` ya no duplica directamente; solo resuelve agentId desde la clave de sesión actual.
- La ruta de envío del complemento duplica a través de `appendAssistantMessageToSessionTranscript` usando la sessionKey derivada.
- El envío de la puerta de enlace deriva una clave de sesión objetivo cuando no se proporciona ninguna (agente predeterminado) y asegura una entrada de sesión.

## Manejo de hilos/temas

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (sufijo).
- Discord: threadId/replyTo -> `resolveThreadSessionKeys` con `useSuffix=false` para coincidir con la entrada (el id del canal del hilo ya tiene el ámbito de sesión).
- Telegram: los IDs de tema se asignan a `chatId:topic:<id>` a través de `buildTelegramGroupPeerId`.

## Extensiones cubiertas

- Matrix, MS Teams, Mattermost, BlueBubbles, Nextcloud Talk, Zalo, Zalo Personal, Nostr, Tlon.
- Notas:
  - Los destinos de Mattermost ahora eliminan `@` para el enrutamiento de claves de sesión de MD.
  - Zalo Personal usa el tipo de par MD para destinos 1:1 (grupo solo cuando está presente `group:`).
  - Los destinos de grupo de BlueBubbles eliminan los prefijos `chat_*` para coincidir con las claves de sesión entrantes.
  - La réplica automática de hilos de Slack coincide con los ids de canal sin distinción de mayúsculas y minúsculas.
  - El envío de Gateway pone en minúsculas las claves de sesión proporcionadas antes de la réplica.

## Decisiones

- **Derivación de sesión de envío de Gateway**: si se proporciona `sessionKey`, úselo. Si se omite, derive una sessionKey del objetivo + agente predeterminado y replique allí.
- **Creación de entrada de sesión**: siempre use `recordSessionMetaFromInbound` con `Provider/From/To/ChatType/AccountId/Originating*` alineado con los formatos entrantes.
- **Normalización de objetivos**: el enrutamiento saliente usa objetivos resueltos (post `resolveChannelTarget`) cuando están disponibles.
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

- El complemento de llamada de voz usa claves de sesión personalizadas `voice:<phone>`. La asignación saliente no está estandarizada aquí; si message-tool debe admitir envíos de llamada de voz, agregue una asignación explícita.
- Confirme si algún complemento externo usa formatos `From/To` no estándar más allá del conjunto incluido.

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

import es from "/components/footer/es.mdx";

<es />
