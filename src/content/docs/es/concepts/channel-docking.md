---
summary: "Mover la ruta de respuesta de una sesión de OpenClaw entre canales de chat vinculados"
title: "Atracaje de canal"
read_when:
  - You want replies for one active session to move from Telegram to Discord, Slack, Mattermost, or another linked channel
  - You are configuring session.identityLinks for cross-channel direct messages
  - A /dock command says the sender is not linked or no active session exists
---

El atracaje de canal es el desvío de llamadas para una sesión de OpenClaw.

Mantiene el mismo contexto de conversación, pero cambia el lugar al que se envían las respuestas futuras
para esa sesión.

## Ejemplo

Alice puede enviar mensajes a OpenClaw en Telegram y Discord:

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456"],
    },
  },
}
```

Si Alice envía esto desde Telegram:

```text
/dock_discord
```

OpenClaw mantiene el contexto de la sesión actual y cambia la ruta de respuesta:

| Antes del atracaje                  | Después de `/dock_discord`         |
| ----------------------------------- | ---------------------------------- |
| Las respuestas van a Telegram `123` | Las respuestas van a Discord `456` |

La sesión no se recrea. El historial de transcripciones permanece adjunto a la
misma sesión.

## Por qué usarlo

Use el atracaje cuando una tarea comienza en una aplicación de chat pero las siguientes respuestas deben llegar
a otro lugar.

Flujo común:

1. Inicie una tarea de agente desde Telegram.
2. Muévase a Discord donde está coordinando el trabajo.
3. Envíe `/dock_discord` desde la sesión de Telegram.
4. Mantenga la misma sesión de OpenClaw, pero reciba futuras respuestas en Discord.

## Configuración requerida

El atracaje requiere `session.identityLinks`. El remitente de origen y el par de destino
deben estar en el mismo grupo de identidad:

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456", "slack:U123"],
    },
  },
}
```

Los valores son IDs de pares con prefijo de canal:

| Valor          | Significado                        |
| -------------- | ---------------------------------- |
| `telegram:123` | ID de remitente de Telegram `123`  |
| `discord:456`  | ID de par directo de Discord `456` |
| `slack:U123`   | ID de usuario de Slack `U123`      |

La clave canónica (`alice` arriba) es solo el nombre del grupo de identidad compartido. Los comandos de atracaje
usan los valores con prefijo de canal para demostrar que el remitente de origen y
el par de destino son la misma persona.

## Comandos

Los comandos de atracaje se generan a partir de complementos de canal cargados que admiten comandos
nativos. Comandos incluidos actualmente:

| Canal de destino | Comando            | Alias              |
| ---------------- | ------------------ | ------------------ |
| Discord          | `/dock-discord`    | `/dock_discord`    |
| Mattermost       | `/dock-mattermost` | `/dock_mattermost` |
| Slack            | `/dock-slack`      | `/dock_slack`      |
| Telegram         | `/dock-telegram`   | `/dock_telegram`   |

Los alias de guion bajo son útiles en superficies de comandos nativas como Telegram.

## Qué cambia

El acoplamiento actualiza los campos de entrega de la sesión activa:

| Campo de sesión | Ejemplo después de `/dock_discord`          |
| --------------- | ------------------------------------------- |
| `lastChannel`   | `discord`                                   |
| `lastTo`        | `456`                                       |
| `lastAccountId` | la cuenta del canal de destino, o `default` |

Esos campos se guardan en el almacén de sesiones y se utilizan en la entrega de respuestas posteriores para esa sesión.

## Qué no cambia

El acoplamiento no:

- crea cuentas de canal
- conecta un nuevo bot de Discord, Telegram, Slack o Mattermost
- concede acceso a un usuario
- omite las listas de permitidos del canal o las políticas de mensajes directos
- mueve el historial de transcripciones a otra sesión
- hace que usuarios no relacionados compartan una sesión

Solo cambia la ruta de entrega para la sesión actual.

## Solución de problemas

**El comando dice que el remitente no está vinculado.**

Agregue tanto el remitente actual como el par de destino al mismo
grupo `session.identityLinks`. Por ejemplo, si el remitente de Telegram `123` debe acoplarse
al par de Discord `456`, incluya tanto `telegram:123` como `discord:456`.

**El comando dice que no existe una sesión activa.**

Acople desde una sesión de chat directo existente. El comando necesita una entrada de sesión activa
para poder persistir la nueva ruta.

**Las respuestas todavía van al canal anterior.**

Verifique que el comando respondió con un mensaje de éxito y confirme que la identificación del par de destino coincide con la identificación utilizada por ese canal. El acoplamiento solo cambia la ruta de la sesión activa; otra sesión aún puede enrutar a otro lugar.

**Necesito volver a cambiar.**

Envíe el comando coincidente para el canal original, como `/dock_telegram` o
`/dock-telegram`, desde un remitente vinculado.
