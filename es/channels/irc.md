---
title: IRC
description: Conecte OpenClaw a canales y mensajes directos de IRC.
summary: "Configuración del plugin IRC, controles de acceso y solución de problemas"
read_when:
  - Deseas conectar OpenClaw a canales o MDs de IRC
  - Estás configurando listas de permitidos de IRC, políticas de grupo o filtrado de menciones
---

Usa IRC cuando quieras OpenClaw en canales clásicos (`#room`) y mensajes directos.
IRC se distribuye como un plugin de extensión, pero se configura en la configuración principal bajo `channels.irc`.

## Inicio rápido

1. Habilita la configuración de IRC en `~/.openclaw/openclaw.json`.
2. Establezca al menos:

```json
{
  "channels": {
    "irc": {
      "enabled": true,
      "host": "irc.libera.chat",
      "port": 6697,
      "tls": true,
      "nick": "openclaw-bot",
      "channels": ["#openclaw"]
    }
  }
}
```

3. Inicia/reinicia el gateway:

```bash
openclaw gateway run
```

## Valores predeterminados de seguridad

- `channels.irc.dmPolicy` por defecto es `"pairing"`.
- `channels.irc.groupPolicy` por defecto es `"allowlist"`.
- Con `groupPolicy="allowlist"`, establece `channels.irc.groups` para definir los canales permitidos.
- Usa TLS (`channels.irc.tls=true`) a menos que aceptes intencionalmente el transporte en texto plano.

## Control de acceso

Hay dos "puertas" separadas para los canales IRC:

1. **Acceso al canal** (`groupPolicy` + `groups`): si el bot acepta mensajes de un canal o no.
2. **Acceso del remitente** (`groupAllowFrom` / `groups["#channel"].allowFrom` por canal): quién tiene permitido activar el bot dentro de ese canal.

Claves de configuración:

- Lista de permitidos de MD (acceso de remitente de MD): `channels.irc.allowFrom`
- Lista de permitidos de remitente de grupo (acceso de remitente de canal): `channels.irc.groupAllowFrom`
- Controles por canal (canal + remitente + reglas de mención): `channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` permite canales no configurados (**aún filtrados por mención por defecto**)

Las entradas de la lista de permitidos deben usar identidades de remitente estables (`nick!user@host`).
La coincidencia de nick simple es mutable y solo se habilita cuando `channels.irc.dangerouslyAllowNameMatching: true`.

### Error común: `allowFrom` es para MDs, no para canales

Si ve registros como:

- `irc: drop group sender alice!ident@host (policy=allowlist)`

…significa que al remitente no se le permitió para mensajes de **grupo/canal**. Soluciónelo mediante:

- estableciendo `channels.irc.groupAllowFrom` (global para todos los canales), o
- estableciendo listas de permitidos de remitente por canal: `channels.irc.groups["#channel"].allowFrom`

Ejemplo (permitir a cualquiera en `#tuirc-dev` hablar con el bot):

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}
```

## Activación de respuesta (menciones)

Incluso si se permite un canal (vía `groupPolicy` + `groups`) y el remitente está permitido, OpenClaw usa por defecto el **filtrado por mención** en contextos de grupo.

Eso significa que puedes ver registros como `drop channel … (missing-mention)` a menos que el mensaje incluya un patrón de mención que coincida con el bot.

Para hacer que el bot responda en un canal IRC **sin necesidad de una mención**, desactiva el filtrado por menciones para ese canal:

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}
```

O para permitir **todos** los canales IRC (sin lista de permitidos por canal) y seguir respondiendo sin menciones:

```json5
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}
```

## Nota de seguridad (recomendado para canales públicos)

Si permites `allowFrom: ["*"]` en un canal público, cualquiera puede solicitarle al bot.
Para reducir el riesgo, restringe las herramientas para ese canal.

### Mismas herramientas para todos en el canal

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}
```

### Diferentes herramientas por remitente (el propietario obtiene más poder)

Usa `toolsBySender` para aplicar una política más estricta a `"*"` y una más laxa a tu nick:

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}
```

Notas:

- Las claves `toolsBySender` deben usar `id:` para los valores de identidad del remitente de IRC:
  `id:eigen` o `id:eigen!~eigen@174.127.248.171` para una coincidencia más fuerte.
- Las claves heredadas sin prefijo todavía se aceptan y coinciden solo como `id:`.
- La primera política de remitente que coincida gana; `"*"` es la alternativa de comodín.

Para más información sobre el acceso a grupos frente a las menciones de puerta (y cómo interactúan), consulta: [/channels/groups](/es/channels/groups).

## NickServ

Para identificarse con NickServ después de conectarse:

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "enabled": true,
        "service": "NickServ",
        "password": "your-nickserv-password"
      }
    }
  }
}
```

Registro opcional de una sola vez al conectarse:

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "register": true,
        "registerEmail": "bot@example.com"
      }
    }
  }
}
```

Deshabilita `register` después de que el nick esté registrado para evitar intentos repetidos de REGISTER.

## Variables de entorno

La cuenta predeterminada admite:

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS` (separados por comas)
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

## Solución de problemas

- Si el bot se conecta pero nunca responde en los canales, verifica `channels.irc.groups` **y** si el filtrado por mención está descartando mensajes (`missing-mention`). Si quieres que responda sin pings, establece `requireMention:false` para el canal.
- Si el inicio de sesión falla, verifica la disponibilidad del nick y la contraseña del servidor.
- Si TLS falla en una red personalizada, verifica el host/puerto y la configuración del certificado.

import en from "/components/footer/en.mdx";

<en />
