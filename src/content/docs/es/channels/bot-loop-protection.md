---
summary: "Valores predeterminados de protección de bucles de bot a bot y anulaciones por canal"
read_when:
  - Configuring bot-authored channel messages
  - Tuning bot-to-bot loop protection
title: "Protección de bucles de bot"
sidebarTitle: "Protección de bucles de bot"
---

# Protección de bucles de bot

OpenClaw puede aceptar mensajes escritos por otros bots en canales que soportan `allowBots`.
Cuando esa ruta está habilitada, la protección de bucles por par evita que dos identidades de bot
se respondan indefinidamente.

El guardia se impone mediante el núcleo de turnos de canal (core channel-turn kernel). Cada canal compatible
asigna su propio evento entrante a hechos genéricos: cuenta o ámbito, ID de conversación,
ID del bot emisor y ID del bot receptor. Core luego rastrea el par de participantes en ambas
direcciones, aplica un presupuesto de ventana deslizante y suprime el par durante un
período de enfriamiento después de que se excede el presupuesto.

## Valores predeterminados

La protección de bucles por par está activa cuando un canal permite que los mensajes creados por bots lleguen
despatch (despacho). Los valores predeterminados integrados son:

- `maxEventsPerWindow: 20` - un par de bots puede intercambiar 20 eventos dentro de la ventana
- `windowSeconds: 60` - longitud de la ventana deslizante
- `cooldownSeconds: 60` - tiempo de supresión después de que el par excede el presupuesto

El guardia no afecta los mensajes normales escritos por humanos, despliegues de un solo bot,
filtros de mensajes propios, o respuestas de bot de una sola vez que permanecen por debajo del presupuesto.

## Configurar valores predeterminados compartidos

Establezca `channels.defaults.botLoopProtection` una vez para dar a cada canal compatible
la misma línea base. Las anulaciones de canal y cuenta aún pueden ajustar
superficies individuales.

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
  },
}
```

Establezca `enabled: false` solo cuando su política de canal permite intencionalmente
conversaciones de bot a bot sin supresión automática.

## Anular por canal o cuenta

Los canales compatibles superponen su propia configuración sobre el valor predeterminado compartido. El orden de precedencia es:

- `channels.<channel>.<room-or-space>.botLoopProtection`, cuando el canal soporta anulaciones por conversación
- `channels.<channel>.accounts.<account>.botLoopProtection`, cuando el canal soporta cuentas
- `channels.<channel>.botLoopProtection`, cuando el canal soporta valores predeterminados de nivel superior
- `channels.defaults.botLoopProtection`
- valores predeterminados integrados

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
      },
    },
    discord: {
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
      accounts: {
        molty: {
          allowBots: "mentions",
          botLoopProtection: {
            maxEventsPerWindow: 5,
            cooldownSeconds: 90,
          },
        },
      },
    },
    slack: {
      allowBots: "mentions",
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
    },
    matrix: {
      allowBots: "mentions",
      groups: {
        "!roomid:example.org": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
    googlechat: {
      allowBots: true,
      groups: {
        "spaces/AAAA": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
  },
}
```

## Soporte de canal

- Discord: hechos nativos `author.bot`, claveados por cuenta de Discord, canal y par de bots.
- Slack: hechos `bot_id` nativos para mensajes aceptados escritos por bots, clave por cuenta de Slack, canal y par de bots.
- Matrix: cuentas de bots de Matrix configuradas, clave por cuenta de Matrix, sala y par de bots configurados.
- Google Chat: hechos `sender.type=BOT` nativos para mensajes aceptados escritos por bots, clave por cuenta, espacio y par de bots.

Los canales que no exponen una identidad de bot entrante fiable siguen utilizando sus filtros normales de mensajes propios y de políticas de acceso. No deben optar por esta protección hasta que puedan identificar a ambos participantes en el par de bots.

Consulte [SDK runtime](/es/plugins/sdk-runtime#reusable-runtime-utilities) para obtener detalles de la implementación del complemento.
