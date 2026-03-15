---
summary: "Pasos de verificación de salud para la conectividad del canal"
read_when:
  - Diagnosing WhatsApp channel health
title: "Verificaciones de salud"
---

# Verificaciones de salud (CLI)

Guía breve para verificar la conectividad del canal sin conjeturas.

## Verificaciones rápidas

- `openclaw status` — resumen local: accesibilidad/modo de la puerta de enlace, sugerencia de actualización, antigüedad de autenticación del canal vinculado, sesiones + actividad reciente.
- `openclaw status --all` — diagnóstico local completo (solo lectura, color, seguro de pegar para depuración).
- `openclaw status --deep` — también sondea la puerta de enlace en ejecución (sondeos por canal cuando se admite).
- `openclaw health --json` — solicita a la puerta de enlace en ejecución una instantánea completa de salud (solo WS; sin socket directo de Baileys).
- Envíe `/status` como un mensaje independiente en WhatsApp/WebChat para obtener una respuesta de estado sin invocar al agente.
- Registros: haga un tail de `/tmp/openclaw/openclaw-*.log` y filtre por `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnósticos profundos

- Credenciales en disco: `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (la hora de modificación debe ser reciente).
- Almacén de sesiones: `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (la ruta se puede anular en la configuración). El recuento y los destinatarios recientes se muestran a través de `status`.
- Flujo de revinculación: `openclaw channels logout && openclaw channels login --verbose` cuando aparecen códigos de estado 409–515 o `loggedOut` en los registros. (Nota: el flujo de inicio de sesión QR se reinicia automáticamente una vez para el estado 515 después del emparejamiento).

## Cuando algo falla

- `logged out` o estado 409–515 → revincular con `openclaw channels logout` y luego `openclaw channels login`.
- Puerta de enlace inalcanzable → iníciela: `openclaw gateway --port 18789` (use `--force` si el puerto está ocupado).
- Sin mensajes entrantes → confirme que el teléfono vinculado está en línea y que el remitente está permitido (`channels.whatsapp.allowFrom`); para chats grupales, asegúrese de que las reglas de lista blanca + mención coincidan (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando dedicado "health"

`openclaw health --json` solicita al Gateway en ejecución su instantánea de estado (sin sockets directos de canal desde la CLI). Informa la antigüedad de las credenciales/enlaces de autenticación cuando está disponible, resúmenes de sondas por canal, resumen del almacén de sesiones y una duración de la sonda. Sale con un valor distinto de cero si el Gateway es inalcanzable o si la sonda falla/caduca. Use `--timeout <ms>` para anular el valor predeterminado de 10s.

import es from "/components/footer/es.mdx";

<es />
