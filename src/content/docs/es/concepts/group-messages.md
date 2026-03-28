---
summary: "Comportamiento y configuración para el manejo de mensajes grupales de WhatsApp (mentionPatterns se comparten entre superficies)"
read_when:
  - Changing group message rules or mentions
title: "Mensajes grupales"
---

# Mensajes grupales (canal de WhatsApp web)

Objetivo: permitir que Clawd permanezca en grupos de WhatsApp, se active solo cuando se le mencione y mantenga ese hilo separado de la sesión de MD personal.

Nota: `agents.list[].groupChat.mentionPatterns` ahora también lo usan Telegram/Discord/Slack/iMessage; este documento se centra en el comportamiento específico de WhatsApp. Para configuraciones de varios agentes, configure `agents.list[].groupChat.mentionPatterns` por agente (o use `messages.groupChat.mentionPatterns` como respaldo global).

## Lo implementado (2025-12-03)

- Modos de activación: `mention` (predeterminado) o `always`. `mention` requiere una mención (menciones reales de @ de WhatsApp a través de `mentionedJids`, patrones de regex o el E.164 del bot en cualquier parte del texto). `always` activa el agente en cada mensaje, pero debe responder solo cuando pueda aportar un valor significativo; de lo contrario, devuelve el token silencioso `NO_REPLY`. Los valores predeterminados se pueden establecer en la configuración (`channels.whatsapp.groups`) y anularse por grupo a través de `/activation`. Cuando se establece `channels.whatsapp.groups`, también actúa como una lista de permitidos para grupos (incluya `"*"` para permitir todos).
- Política de grupo: `channels.whatsapp.groupPolicy` controla si se aceptan mensajes de grupo (`open|disabled|allowlist`). `allowlist` usa `channels.whatsapp.groupAllowFrom` (respaldo: `channels.whatsapp.allowFrom` explícito). El valor predeterminado es `allowlist` (bloqueado hasta que agregue remitentes).
- Sesiones por grupo: las claves de sesión se parecen a `agent:<agentId>:whatsapp:group:<jid>`, por lo que los comandos como `/verbose on` o `/think high` (enviados como mensajes independientes) se limitan a ese grupo; el estado del MD personal no se modifica. Se omiten los latidos para los hilos de grupo.
- Inyección de contexto: los mensajes de grupo **solo pendientes** (50 por defecto) que _no_ activaron una ejecución tienen el prefijo bajo `[Chat messages since your last reply - for context]`, con la línea desencadenante bajo `[Current message - respond to this]`. Los mensajes que ya están en la sesión no se vuelven a inyectar.
- Visualización del remitente: cada lote de grupo ahora termina con `[from: Sender Name (+E164)]` para que Pi sepa quién está hablando.
- Efímero/ver una vez: desempaquetamos esos antes de extraer texto/menciones, por lo que los pings dentro de ellos aún activan.
- Prompt del sistema de grupo: en el primer turno de una sesión de grupo (y siempre que `/activation` cambia el modo) inyectamos una breve nota en el prompt del sistema como `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` Si los metadatos no están disponibles, aún le decimos al agente que es un chat de grupo.

## Ejemplo de configuración (WhatsApp)

Añada un bloque `groupChat` a `~/.openclaw/openclaw.json` para que los pings de nombre para mostrar funcionen incluso cuando WhatsApp elimina el `@` visual en el cuerpo del texto:

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

Notas:

- Las expresiones regulares no distinguen entre mayúsculas y minúsculas; cubren un ping de nombre para mostrar como `@openclaw` y el número en bruto con o sin `+`/espacios.
- WhatsApp aún envía menciones canónicas a través de `mentionedJids` cuando alguien toca el contacto, por lo que el respaldo del número rara vez es necesario pero es una red de seguridad útil.

### Comando de activación (solo propietario)

Use el comando de chat de grupo:

- `/activation mention`
- `/activation always`

Solo el número de propietario (de `channels.whatsapp.allowFrom`, o el E.164 propio del bot cuando no está establecido) puede cambiar esto. Envíe `/status` como un mensaje independiente en el grupo para ver el modo de activación actual.

## Cómo usar

1. Añada su cuenta de WhatsApp (la que ejecuta OpenClaw) al grupo.
2. Diga `@openclaw …` (o incluya el número). Solo los remitentes en la lista de permitidos pueden activarlo a menos que establezca `groupPolicy: "open"`.
3. El prompt del agente incluirá el contexto reciente del grupo más el marcador `[from: …]` al final para que pueda dirigirse a la persona correcta.
4. Las directivas a nivel de sesión (`/verbose on`, `/think high`, `/new` o `/reset`, `/compact`) solo se aplican a la sesión de ese grupo; envíelas como mensajes independientes para que se registren. Tu sesión de MD personal permanece independiente.

## Pruebas / verificación

- Prueba manual de humo:
  - Envía un ping `@openclaw` en el grupo y confirma una respuesta que haga referencia al nombre del remitente.
  - Envía un segundo ping y verifica que el bloque de historial se incluya y luego se borre en el siguiente turno.
- Revisa los registros de la puerta de enlace (ejecuta con `--verbose`) para ver entradas `inbound web message` que muestren `from: <groupJid>` y el sufijo `[from: …]`.

## Consideraciones conocidas

- Los latidos (heartbeats) se omiten intencionalmente para los grupos para evitar transmisiones ruidosas.
- La supresión de eco utiliza la cadena de lote combinada; si envías texto idéntico dos veces sin menciones, solo el primero obtendrá una respuesta.
- Las entradas del almacenamiento de sesiones aparecerán como `agent:<agentId>:whatsapp:group:<jid>` en el almacén de sesiones (`~/.openclaw/agents/<agentId>/sessions/sessions.json` por defecto); una entrada faltante solo significa que el grupo aún no ha activado una ejecución.
- Los indicadores de escritura en los grupos siguen `agents.defaults.typingMode` (por defecto: `message` cuando no se menciona).
