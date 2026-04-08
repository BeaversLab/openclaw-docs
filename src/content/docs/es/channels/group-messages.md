---
summary: "Comportamiento y configuración para el manejo de mensajes grupales de WhatsApp (mentionPatterns se comparten entre superficies)"
read_when:
  - Changing group message rules or mentions
title: "Mensajes grupales"
---

# Mensajes grupales (canal web de WhatsApp)

Objetivo: permitir que Clawd permanezca en grupos de WhatsApp, se active solo cuando se le haga ping y mantenga ese hilo separado de la sesión de MD personal.

Nota: `agents.list[].groupChat.mentionPatterns` ahora también lo usan Telegram/Discord/Slack/iMessage; este documento se centra en el comportamiento específico de WhatsApp. Para configuraciones multiagente, establezca `agents.list[].groupChat.mentionPatterns` por agente (o use `messages.groupChat.mentionPatterns` como respaldo global).

## Implementación actual (2025-12-03)

- Modos de activación: `mention` (predeterminado) o `always`. `mention` requiere un aviso (menciones reales de @ de WhatsApp a través de `mentionedJids`, patrones de regex seguros o el E.164 del bot en cualquier lugar del texto). `always` activa el agente en cada mensaje, pero debe responder solo cuando pueda aportar un valor significativo; de lo contrario, devuelve el token silencioso exacto `NO_REPLY` / `no_reply`. Los valores predeterminados se pueden establecer en la configuración (`channels.whatsapp.groups`) y anularse por grupo mediante `/activation`. Cuando se establece `channels.whatsapp.groups`, también actúa como una lista de permitidos del grupo (incluya `"*"` para permitir todos).
- Política de grupo: `channels.whatsapp.groupPolicy` controla si se aceptan mensajes de grupo (`open|disabled|allowlist`). `allowlist` utiliza `channels.whatsapp.groupAllowFrom` (alternativa: `channels.whatsapp.allowFrom` explícito). El valor predeterminado es `allowlist` (bloqueado hasta que agregue remitentes).
- Sesiones por grupo: las claves de sesión se ven como `agent:<agentId>:whatsapp:group:<jid>`, por lo que comandos como `/verbose on` o `/think high` (enviados como mensajes independientes) tienen un ámbito limitado a ese grupo; el estado del MD personal no se ve afectado. Los latidos (heartbeats) se omiten para los hilos de grupo.
- Inyección de contexto: los mensajes de grupo **pendientes solamente** (predeterminado 50) que _no_ activaron una ejecución se prefijan bajo `[Chat messages since your last reply - for context]`, con la línea de activación bajo `[Current message - respond to this]`. Los mensajes que ya están en la sesión no se vuelven a inyectar.
- Visualización del remitente: cada lote de grupo ahora termina con `[from: Sender Name (+E164)]` para que Pi sepa quién está hablando.
- Efímero/ver una vez: desempaquetamos esos antes de extraer texto/menciones, por lo que los avisos dentro de ellos aún activan.
- Prompt del sistema de grupo: en el primer turno de una sesión de grupo (y siempre que `/activation` cambie el modo) inyectamos una breve nota en el prompt del sistema como `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`. Si los metadatos no están disponibles, todavía le decimos al agente que es un chat de grupo.

## Ejemplo de configuración (WhatsApp)

Agregue un bloque `groupChat` a `~/.openclaw/openclaw.json` para que los avisos por nombre de pantalla funcionen incluso cuando WhatsApp elimina el `@` visual en el cuerpo del texto:

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

- Las expresiones regex no distinguen entre mayúsculas y minúsculas y utilizan las mismas protecciones de regex seguro que otras superficies de regex de configuración; los patrones no válidos y la repetición anidada insegura se ignoran.
- WhatsApp aún envía menciones canónicas a través de `mentionedJids` cuando alguien toca el contacto, por lo que el respaldo por número rara vez es necesario, pero es una red de seguridad útil.

### Comando de activación (solo propietario)

Use el comando de chat de grupo:

- `/activation mention`
- `/activation always`

Solo el número de propietario (de `channels.whatsapp.allowFrom`, o el E.164 propio del bot si no está configurado) puede cambiar esto. Envíe `/status` como un mensaje independiente en el grupo para ver el modo de activación actual.

## Cómo usar

1. Añada su cuenta de WhatsApp (la que ejecuta OpenClaw) al grupo.
2. Diga `@openclaw …` (o incluya el número). Solo los remitentes permitidos pueden activarlo a menos que configure `groupPolicy: "open"`.
3. El prompt del agente incluirá el contexto reciente del grupo más el marcador final `[from: …]` para que pueda dirigirse a la persona correcta.
4. Las directivas a nivel de sesión (`/verbose on`, `/think high`, `/new` o `/reset`, `/compact`) se aplican solo a la sesión de ese grupo; envíelas como mensajes independientes para que se registren. Su sesión personal de DM sigue siendo independiente.

## Pruebas / verificación

- Prueba manual:
  - Envíe un ping `@openclaw` en el grupo y confirme una respuesta que haga referencia al nombre del remitente.
  - Envíe un segundo ping y verifique que el bloque de historial se incluya y luego se borre en el siguiente turno.
- Verifique los registros de la puerta de enlace (ejecute con `--verbose`) para ver las entradas `inbound web message` que muestran `from: <groupJid>` y el sufijo `[from: …]`.

## Consideraciones conocidas

- Los latidos se omiten intencionalmente para los grupos para evitar transmisiones ruidosas.
- La supresión de eco utiliza la cadena del lote combinado; si envía texto idéntico dos veces sin menciones, solo el primero recibirá una respuesta.
- Las entradas de la tienda de sesiones aparecerán como `agent:<agentId>:whatsapp:group:<jid>` en la tienda de sesiones (`~/.openclaw/agents/<agentId>/sessions/sessions.json` de forma predeterminada); una entrada faltante solo significa que el grupo aún no ha activado una ejecución.
- Los indicadores de escritura en los grupos siguen `agents.defaults.typingMode` (predeterminado: `message` cuando no se menciona).
