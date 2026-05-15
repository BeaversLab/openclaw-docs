---
summary: "Manejo de mensajes de grupos de WhatsApp — activación, listas de permitidos, sesiones e inyección de contexto"
read_when:
  - Configuring WhatsApp groups specifically
  - Changing WhatsApp activation modes (`mention` vs `always`)
  - Tuning WhatsApp group session keys or pending-message context
title: "Mensajes de grupos de WhatsApp"
sidebarTitle: "Grupos de WhatsApp"
---

Para el modelo de grupos entre canales (Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo), consulte [Grupos](/es/channels/groups). Esta página cubre el comportamiento específico de WhatsApp además de ese modelo: activación, listas de permitidos de grupos, claves de sesión por grupo e inyección de contexto de mensajes pendientes.

Objetivo: permitir que OpenClaw se siente en grupos de WhatsApp, se despierte solo cuando se le haga ping y mantenga ese hilo separado de la sesión de MD personal.

<Note>`agents.list[].groupChat.mentionPatterns` también lo usan Telegram, Discord, Slack e iMessage. Para configuraciones de múltiples agentes, establézcalo por agente o use `messages.groupChat.mentionPatterns` como respaldo global.</Note>

## Comportamiento

- Modos de activación: `mention` (predeterminado) o `always`. `mention` requiere un ping (menciones @ reales de WhatsApp a través de `mentionedJids`, patrones de expresiones regulares seguros o el E.164 del bot en cualquier lugar del texto). `always` despierta al agente en cada mensaje, pero debe responder solo cuando pueda aportar un valor significativo; de lo contrario, devuelve el token silencioso exacto `NO_REPLY` / `no_reply`. Los valores predeterminados se pueden establecer en la configuración (`channels.whatsapp.groups`) y anularse por grupo mediante `/activation`. Cuando se establece `channels.whatsapp.groups`, también actúa como una lista de permitidos del grupo (incluya `"*"` para permitir todos).
- Política de grupo: `channels.whatsapp.groupPolicy` controla si se aceptan mensajes de grupo (`open|disabled|allowlist`). `allowlist` usa `channels.whatsapp.groupAllowFrom` (alternativo: `channels.whatsapp.allowFrom` explícito). El valor predeterminado es `allowlist` (bloqueado hasta que agregue remitentes).
- Sesiones por grupo: las claves de sesión tienen el aspecto de `agent:<agentId>:whatsapp:group:<jid>`, por lo que comandos como `/verbose on`, `/trace on` o `/think high` (enviados como mensajes independientes) están limitados a ese grupo; el estado del MD personal no se ve afectado. Se omiten los latidos en los hilos de grupo.
- Inyección de contexto: los mensajes de grupo **pendientes únicamente** (50 por defecto) que _no_ activaron una ejecución se prefijan bajo `[Chat messages since your last reply - for context]`, con la línea desencadenante bajo `[Current message - respond to this]`. Los mensajes que ya están en la sesión no se vuelven a inyectar.
- Visualización del remitente: cada lote de grupo ahora termina con `[from: Sender Name (+E164)]` para que Pi sepa quién está hablando.
- Efímero/ver una sola vez: desempaquetamos esos elementos antes de extraer texto/menciones, por lo que los pings dentro de ellos aún activan.
- Prompt del sistema de grupo: en el primer turno de una sesión de grupo (y siempre que `/activation` cambia el modo) inyectamos una breve nota en el prompt del sistema como `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), ... Activation: trigger-only ... Address the specific sender noted in the message context.` Si los metadatos no están disponibles, aún le decimos al agente que es un chat de grupo.

## Ejemplo de configuración (WhatsApp)

Añada un bloque `groupChat` a `~/.openclaw/openclaw.json` para que los pings por nombre para mostrar funcionen incluso cuando WhatsApp elimina el `@` visual en el cuerpo del texto:

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

- Las expresiones regulares no distinguen entre mayúsculas y minúsculas y utilizan las mismas protecciones de expresiones regulares seguras que otras superficies de configuración de expresiones regulares; los patrones no válidos y las repeticiones anidadas inseguras se ignoran.
- WhatsApp aún envía menciones canónicas a través de `mentionedJids` cuando alguien toca el contacto, por lo que el respaldo por número rara vez se necesita, pero es una red de seguridad útil.

### Comando de activación (solo propietario)

Use el comando de chat de grupo:

- `/activation mention`
- `/activation always`

Solo el número de propietario (de `channels.whatsapp.allowFrom`, o el propio E.164 del bot si no está establecido) puede cambiar esto. Envíe `/status` como un mensaje independiente en el grupo para ver el modo de activación actual.

## Cómo usar

1. Añada su cuenta de WhatsApp (la que ejecuta OpenClaw) al grupo.
2. Diga `@openclaw …` (o incluya el número). Solo los remitentes en la lista de permitidos pueden activarlo a menos que establezca `groupPolicy: "open"`.
3. El mensaje del agente incluirá el contexto reciente del grupo más el marcador final `[from: …]` para que pueda dirigirse a la persona correcta.
4. Las directivas a nivel de sesión (`/verbose on`, `/trace on`, `/think high`, `/new` o `/reset`, `/compact`) solo se aplican a la sesión de ese grupo; envíelas como mensajes independientes para que se registren. Tu sesión personal de MD permanece independiente.

## Pruebas / verificación

- Prueba manual básica:
  - Envía un ping `@openclaw` en el grupo y confirma una respuesta que haga referencia al nombre del remitente.
  - Envía un segundo ping y verifica que el bloque de historial se incluya y luego se borre en el siguiente turno.
- Comprueba los registros de la puerta de enlace (ejecuta con `--verbose`) para ver las entradas `inbound web message` que muestran `from: <groupJid>` y el sufijo `[from: …]`.

## Consideraciones conocidas

- Los latidos se omiten intencionalmente para los grupos para evitar transmisiones ruidosas.
- La supresión de eco utiliza la cadena de lote combinada; si envías el mismo texto dos veces sin menciones, solo el primero obtendrá una respuesta.
- Las entradas del almacén de sesiones aparecerán como `agent:<agentId>:whatsapp:group:<jid>` en el almacén de sesiones (`~/.openclaw/agents/<agentId>/sessions/sessions.json` por defecto); una entrada que falta solo significa que el grupo aún no ha activado una ejecución.
- Los indicadores de escritura en los grupos siguen `agents.defaults.typingMode`. Cuando las respuestas visibles utilizan el modo predeterminado de solo herramienta de mensajes, la escritura comienza inmediatamente de forma predeterminada para que los miembros del grupo puedan ver que el agente está trabajando, incluso si no se publica ninguna respuesta final automática. La configuración explícita del modo de escritura todavía tiene prioridad.

## Relacionado

- [Grupos](/es/channels/groups)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Grupos de difusión](/es/channels/broadcast-groups)
