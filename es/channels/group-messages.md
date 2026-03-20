---
summary: "Comportamiento y configuración para el manejo de mensajes grupales de WhatsApp (mentionPatterns se comparten entre superficies)"
read_when:
  - Cambiar las reglas de mensajes grupales o menciones
title: "Mensajes grupales"
---

# Mensajes grupales (canal web de WhatsApp)

Objetivo: permitir que Clawd permanezca en grupos de WhatsApp, se active solo cuando se le haga ping y mantenga ese hilo separado de la sesión de MD personal.

Nota: `agents.list[].groupChat.mentionPatterns` ahora también lo usan Telegram/Discord/Slack/iMessage; este documento se centra en el comportamiento específico de WhatsApp. Para configuraciones de múltiples agentes, establezca `agents.list[].groupChat.mentionPatterns` por agente (o use `messages.groupChat.mentionPatterns` como alternativa global).

## Implementación actual (2025-12-03)

- Modos de activación: `mention` (predeterminado) o `always`. `mention` requiere un "ping" (menciones reales de @ de WhatsApp a través de `mentionedJids`, patrones de regex seguros o el E.164 del bot en cualquier parte del texto). `always` activa el agente en cada mensaje, pero debe responder solo cuando pueda aportar valor significativo; de lo contrario, devuelve el token silencioso `NO_REPLY`. Los valores predeterminados se pueden establecer en la configuración (`channels.whatsapp.groups`) y anularse por grupo mediante `/activation`. Cuando se establece `channels.whatsapp.groups`, también actúa como una lista de permitidos del grupo (incluya `"*"` para permitir todos).
- Política de grupo: `channels.whatsapp.groupPolicy` controla si se aceptan mensajes grupales (`open|disabled|allowlist`). `allowlist` usa `channels.whatsapp.groupAllowFrom` (alternativa: `channels.whatsapp.allowFrom` explícito). El valor predeterminado es `allowlist` (bloqueado hasta que agregue remitentes).
- Sesiones por grupo: las claves de sesión se ven como `agent:<agentId>:whatsapp:group:<jid>`, por lo que comandos como `/verbose on` o `/think high` (enviados como mensajes independientes) tienen un alcance limitado a ese grupo; el estado del MD personal no se modifica. Se omiten los latidos (heartbeats) para los hilos grupales.
- Inyección de contexto: los mensajes grupales **pendientes únicamente** (predeterminado 50) que _no_ activaron una ejecución se prefijan bajo `[Chat messages since your last reply - for context]`, con la línea de activación bajo `[Current message - respond to this]`. Los mensajes que ya están en la sesión no se vuelven a inyectar.
- Revelación del remitente: cada lote de grupo ahora termina con `[from: Sender Name (+E164)]` para que Pi sepa quién está hablando.
- Efímero/ver una vez: desempaquetamos esos antes de extraer texto/menciones, por lo que los avisos dentro de ellos aún activan.
- Prompt del sistema de grupo: en el primer turno de una sesión de grupo (y cada vez que `/activation` cambia el modo) inyectamos una breve nota en el prompt del sistema como `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` Si los metadatos no están disponibles, aún le indicamos al agente que es un chat de grupo.

## Ejemplo de configuración (WhatsApp)

Añada un bloque `groupChat` a `~/.openclaw/openclaw.json` para que las menciones por nombre de visualización funcionen incluso cuando WhatsApp elimina el `@` visual en el cuerpo del texto:

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

Solo el número de propietario (de `channels.whatsapp.allowFrom`, o el propio E.164 del bot si no está configurado) puede cambiar esto. Envíe `/status` como un mensaje independiente en el grupo para ver el modo de activación actual.

## Cómo usar

1. Añada su cuenta de WhatsApp (la que ejecuta OpenClaw) al grupo.
2. Diga `@openclaw …` (o incluya el número). Solo los remitentes en la lista de permitidos pueden activarlo a menos que configure `groupPolicy: "open"`.
3. El prompt del agente incluirá el contexto reciente del grupo además del marcador `[from: …]` al final para que pueda dirigirse a la persona correcta.
4. Las directivas a nivel de sesión (`/verbose on`, `/think high`, `/new` o `/reset`, `/compact`) se aplican solo a la sesión de ese grupo; envíelas como mensajes independientes para que se registren. Su sesión personal de MD permanece independiente.

## Pruebas / verificación

- Prueba manual:
  - Envíe un ping `@openclaw` en el grupo y confirme una respuesta que haga referencia al nombre del remitente.
  - Envíe un segundo ping y verifique que el bloque de historial se incluya y luego se borre en el siguiente turno.
- Verifique los registros de la puerta de enlace (ejecute con `--verbose`) para ver entradas `inbound web message` que muestren `from: <groupJid>` y el sufijo `[from: …]`.

## Consideraciones conocidas

- Los latidos se omiten intencionalmente para los grupos para evitar transmisiones ruidosas.
- La supresión de eco utiliza la cadena del lote combinado; si envía texto idéntico dos veces sin menciones, solo el primero recibirá una respuesta.
- Las entradas del almacén de sesiones aparecerán como `agent:<agentId>:whatsapp:group:<jid>` en el almacén de sesiones (`~/.openclaw/agents/<agentId>/sessions/sessions.json` de forma predeterminada); una entrada faltante solo significa que el grupo aún no ha activado una ejecución.
- Los indicadores de escritura en grupos siguen `agents.defaults.typingMode` (predeterminado: `message` cuando no se menciona).

import es from "/components/footer/es.mdx";

<es />
