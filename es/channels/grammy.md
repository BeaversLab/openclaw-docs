---
summary: "Integración de la API de Bot de Telegram a través de grammY con notas de configuración"
read_when:
  - Trabajando en rutas de Telegram o grammY
title: grammY
---

# Integración de grammY (API de Bot de Telegram)

# Por qué grammY

- Cliente de la API de Bot con prioridad en TS y con asistentes de sondeo largo (long-poll) + webhook integrados, middleware, manejo de errores, limitador de velocidad.
- Asistentes de medios más limpios que crear manualmente fetch + FormData; admite todos los métodos de la API de Bot.
- Extensible: soporte de proxy mediante fetch personalizado, middleware de sesión (opcional), contexto con seguridad de tipos.

# Lo que hemos enviado

- **Ruta de cliente único:** se eliminó la implementación basada en fetch; grammY es ahora el único cliente de Telegram (envío + puerta de enlace) con el limitador de grammY habilitado de forma predeterminada.
- **Gateway:** `monitorTelegramProvider` construye un `Bot` grammY, conecta el filtrado de menciones/listas permitidas, descarga de medios a través de `getFile`/`download` y entrega respuestas con `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument`. Soporta sondeo largo (long-poll) o webhook a través de `webhookCallback`.
- **Proxy:** `channels.telegram.proxy` opcional usa `undici.ProxyAgent` a través del `client.baseFetch` de grammY.
- **Soporte de Webhook:** `webhook-set.ts` envuelve `setWebhook/deleteWebhook`; `webhook.ts` aloja la devolución de llamada (callback) con verificación de estado + apagado elegante. Gateway habilita el modo webhook cuando se configuran `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` (de lo contrario, usa sondeo largo).
- **Sesiones:** los chats directos se colapsan en la sesión principal del agente (`agent:<agentId>:<mainKey>`); los grupos usan `agent:<agentId>:telegram:group:<chatId>`; las respuestas se enrutan de vuelta al mismo canal.
- **Perillas de configuración:** `channels.telegram.botToken`, `channels.telegram.dmPolicy`, `channels.telegram.groups` (valores predeterminados de lista permitida + mención), `channels.telegram.allowFrom`, `channels.telegram.groupAllowFrom`, `channels.telegram.groupPolicy`, `channels.telegram.mediaMaxMb`, `channels.telegram.linkPreview`, `channels.telegram.proxy`, `channels.telegram.webhookSecret`, `channels.telegram.webhookUrl`.
- **Transmisión de borradores:** `channels.telegram.streamMode` opcional usa `sendMessageDraft` en chats de temas privados (Bot API 9.3+). Esto es independiente de la transmisión de bloques del canal.
- **Pruebas:** los mocks de grammy cubren la restricción de menciones en MD y grupos, y el envío saliente; se agradecen más fixtures de medios/webhooks.

Preguntas abiertas

- Plugins opcionales de grammY (throttler) si encontramos errores 429 de la Bot API.
- Añadir más pruebas de medios estructurados (pegatinas, notas de voz).
- Hacer configurable el puerto de escucha del webhook (actualmente fijado a 8787 a menos que se conecte a través de la puerta de enlace).

import en from "/components/footer/en.mdx";

<en />
