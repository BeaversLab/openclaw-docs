---
summary: "Listas de remitentes permitidos reutilizables para canales de mensajes"
read_when:
  - Configuring the same allowlist across multiple message channels
  - Sharing DM and group sender access rules
  - Reviewing message-channel access control
title: "Grupos de acceso"
---

Los grupos de acceso son listas de remitentes con nombre que se definen una sola vez y se referencian desde las listas permitidas (allowlists) del canal con `accessGroup:<name>`.

Úselos cuando las mismas personas deban tener permiso en varios canales de mensajes, o cuando un conjunto de confianza deba aplicarse tanto a la autorización de DM como a la de grupos.

Los grupos de acceso no otorgan acceso por sí mismos. Un grupo solo importa cuando un campo de lista permitida lo referencia.

## Grupos de remitentes de mensajes estáticos

Los grupos de remitentes estáticos usan `type: "message.senders"`.

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
}
```

Las listas de miembros se clavean por el id del canal de mensajes:

| Clave      | Significado                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| `"*"`      | Entradas compartidas comprobadas para cada canal de mensajes que referencia al grupo. |
| `discord`  | Entradas comprobadas solo para la coincidencia de lista permitida de Discord.         |
| `telegram` | Entradas comprobadas solo para la coincidencia de lista permitida de Telegram.        |
| `whatsapp` | Entradas comprobadas solo para la coincidencia de lista permitida de WhatsApp.        |

Las entradas se coinciden con las reglas normales de `allowFrom` del canal de destino. OpenClaw no traduce los ids de remitentes entre canales. Si Alicia tiene un id de Telegram y un id de Discord, liste ambos ids bajo las claves apropiadas.

## Referenciar grupos desde listas permitidas

Referencie un grupo con `accessGroup:<name>` en cualquier lugar donde la ruta del canal de mensajes soporte listas permitidas de remitentes.

Ejemplo de lista permitida de DM:

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
    telegram: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

Ejemplo de lista permitida de remitente de grupo:

```json5
{
  accessGroups: {
    oncall: {
      type: "message.senders",
      members: {
        whatsapp: ["+15551234567"],
        googlechat: ["users/1234567890"],
      },
    },
  },
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["accessGroup:oncall"],
    },
    googlechat: {
      spaces: {
        "spaces/AAA": {
          users: ["accessGroup:oncall"],
        },
      },
    },
  },
}
```

Puede mezclar grupos y entradas directas:

```json5
{
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators", "discord:123456789012345678"],
    },
  },
}
```

## Rutas de canales de mensajes soportadas

Los grupos de acceso están disponibles en rutas de autorización de canales de mensajes compartidas, incluyendo:

- Listas permitidas de remitentes DM tales como `channels.<channel>.allowFrom`
- Listas permitidas de remitentes de grupo tales como `channels.<channel>.groupAllowFrom`
- Listas permitidas de remitentes por sala específicas del canal que usan las mismas reglas de coincidencia de remitentes
- Rutas de autorización de comandos que reutilizan listas permitidas de remitentes de canales de mensajes

La compatibilidad con canales depende de si ese canal está conectado a través de los asistentes compartidos de autorización de remitentes de OpenClaw. La compatibilidad incluida actualmente abarca Discord, Feishu, Google Chat, iMessage, LINE, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, QQBot, Signal, WhatsApp, Zalo y Zalo Personal. Los grupos `message.senders` estáticos están diseñados para ser independientes del canal, por lo que los nuevos canales de mensajes deberían admitirlos utilizando los asistentes compartidos del SDK del complemento en lugar de una expansión personalizada de la lista de permitidos.

## Diagnósticos del complemento

Los autores de complementos pueden inspeccionar el estado estructurado del grupo de acceso sin expandirlo nuevamente en una lista de permitidos plana:

```typescript
import { resolveAccessGroupAllowFromState } from "openclaw/plugin-sdk/security-runtime";

const state = await resolveAccessGroupAllowFromState({
  accessGroups: cfg.accessGroups,
  allowFrom: channelConfig.allowFrom,
  channel: "my-channel",
  accountId: "default",
  senderId,
  isSenderAllowed,
});
```

El resultado informa los grupos referenciados, coincidentes, faltantes, no admitidos y con errores. Use esto cuando necesite diagnósticos o pruebas de conformidad. Use `expandAllowFromWithAccessGroups(...)` solo para rutas de compatibilidad que aún esperan una matriz plana `allowFrom`.

## Audiencias de canales de Discord

Discord también admite un tipo de grupo de acceso dinámico:

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

`discord.channelAudience` significa "permitir remitentes de DM de Discord que actualmente puedan ver este canal de gremio". OpenClaw resuelve el remitente a través de Discord en el momento de la autorización y aplica las reglas de permisos de Discord `ViewChannel`.

Use esto cuando un canal de Discord ya sea la fuente de la verdad para un equipo, como `#maintainers` o `#on-call`.

Requisitos y comportamiento de fallo:

- El bot necesita acceso al gremio y al canal.
- El bot necesita el **Server Members Intent** del Portal para Desarrolladores de Discord.
- El grupo de acceso falla cerrado cuando Discord devuelve `Missing Access`, el remitente no puede resolverse como miembro del gremio, o el canal pertenece a otro gremio.

Más ejemplos específicos de Discord: [control de acceso de Discord](/es/channels/discord#access-control-and-routing)

## Notas de seguridad

- Los grupos de acceso son alias de listas de permitidos, no roles. No crean propietarios, aprueban solicitudes de emparejamiento ni otorgan permisos de herramientas por sí mismos.
- `dmPolicy: "open"` todavía requiere `"*"` en la lista de permitidos de DM efectiva. Referenciar un grupo de acceso no es lo mismo que el acceso público.
- Los nombres de grupos faltantes fallan cerrados. Si `allowFrom` contiene `accessGroup:operators` y `accessGroups.operators` está ausente, esa entrada no autoriza a nadie.
- Mantenga los identificadores de canal estables. Prefiera los identificadores numéricos/de usuario sobre los nombres para mostrar cuando el canal soporta ambos.

## Solución de problemas

Si un remitente debería coincidir pero está bloqueado:

1. Confirme que el campo de lista de permitidos contiene la referencia exacta `accessGroup:<name>`.
2. Confirme que `accessGroups.<name>.type` es correcto.
3. Confirme que el identificador del remitente está listado bajo la clave del canal correspondiente, o bajo `"*"`.
4. Confirme que la entrada usa la sintaxis normal de lista de permitidos de ese canal.
5. Para las audiencias de canales de Discord, confirme que el bot puede ver el canal del servidor y tiene habilitado el Server Members Intent.

Ejecute `openclaw doctor` después de editar la configuración de control de acceso. Detecta muchas combinaciones inválidas de listas de permitidos y políticas antes del tiempo de ejecución.
