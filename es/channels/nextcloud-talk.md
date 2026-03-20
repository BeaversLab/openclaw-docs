---
summary: "Estado de soporte, capacidades y configuración de Nextcloud Talk"
read_when:
  - Trabajar en las funciones del canal Nextcloud Talk
title: "Nextcloud Talk"
---

# Nextcloud Talk (plugin)

Estado: soportado a través de un plugin (bot de webhook). Los mensajes directos, las salas, las reacciones y los mensajes en markdown están soportados.

## Plugin requerido

Nextcloud Talk se distribuye como un plugin y no se incluye con la instalación principal.

Instalar vía CLI (registro npm):

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

Repositorio local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./extensions/nextcloud-talk
```

Si eliges Nextcloud Talk durante la configuración y se detecta una comprobación git,
OpenClaw ofrecerá automáticamente la ruta de instalación local.

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida (principiante)

1. Instala el plugin de Nextcloud Talk.
2. En tu servidor Nextcloud, crea un bot:

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. Habilita el bot en la configuración de la sala de destino.
4. Configura OpenClaw:
   - Configuración: `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - O env: `NEXTCLOUD_TALK_BOT_SECRET` (solo cuenta predeterminada)
5. Reinicia la puerta de enlace (o termina la configuración).

Configuración mínima:

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing",
    },
  },
}
```

## Notas

- Los bots no pueden iniciar MDs. El usuario debe enviarle un mensaje al bot primero.
- La URL del webhook debe ser accesible para la Gateway; establece `webhookPublicUrl` si estás detrás de un proxy.
- Las subidas de medios no están soportadas por la API del bot; los medios se envían como URLs.
- El payload del webhook no distingue entre MD y salas; establece `apiUser` + `apiPassword` para habilitar las búsquedas de tipos de sala (de lo contrario, los MD se tratan como salas).

## Control de acceso (MDs)

- Predeterminado: `channels.nextcloud-talk.dmPolicy = "pairing"`. Los remitentes desconocidos reciben un código de emparejamiento.
- Aprobar vía:
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- MD públicos: `channels.nextcloud-talk.dmPolicy="open"` más `channels.nextcloud-talk.allowFrom=["*"]`.
- `allowFrom` coincide solo con los ID de usuario de Nextcloud; se ignoran los nombres para mostrar.

## Salas (grupos)

- Predeterminado: `channels.nextcloud-talk.groupPolicy = "allowlist"` (restringido por mención).
- Permitir salas con `channels.nextcloud-talk.rooms`:

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true },
      },
    },
  },
}
```

- Para no permitir ninguna sala, mantén la lista de permitidos vacía o establece `channels.nextcloud-talk.groupPolicy="disabled"`.

## Capacidades

| Característica    | Estado        |
| ----------------- | ------------- |
| Mensajes directos | Soportado     |
| Salas             | Soportado     |
| Hilos             | No soportado  |
| Medios            | Solo URL      |
| Reacciones        | Soportado     |
| Comandos nativos  | No compatible |

## Referencia de configuración (Nextcloud Talk)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.nextcloud-talk.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.nextcloud-talk.baseUrl`: URL de la instancia de Nextcloud.
- `channels.nextcloud-talk.botSecret`: secreto compartido del bot.
- `channels.nextcloud-talk.botSecretFile`: ruta de archivo regular del secreto. Se rechazan los enlaces simbólicos.
- `channels.nextcloud-talk.apiUser`: usuario de API para búsquedas de sala (detección de MD).
- `channels.nextcloud-talk.apiPassword`: contraseña de API/aplicación para búsquedas de sala.
- `channels.nextcloud-talk.apiPasswordFile`: ruta del archivo de contraseña de API.
- `channels.nextcloud-talk.webhookPort`: puerto de escucha del webhook (predeterminado: 8788).
- `channels.nextcloud-talk.webhookHost`: host del webhook (predeterminado: 0.0.0.0).
- `channels.nextcloud-talk.webhookPath`: ruta del webhook (predeterminado: /nextcloud-talk-webhook).
- `channels.nextcloud-talk.webhookPublicUrl`: URL del webhook accesible externamente.
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom`: lista blanca de MD (IDs de usuario). `open` requiere `"*"`.
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom`: lista blanca de grupos (IDs de usuario).
- `channels.nextcloud-talk.rooms`: configuración por sala y lista blanca.
- `channels.nextcloud-talk.historyLimit`: límite de historial de grupos (0 lo desactiva).
- `channels.nextcloud-talk.dmHistoryLimit`: límite de historial de MD (0 lo desactiva).
- `channels.nextcloud-talk.dms`: anulaciones por MD (historyLimit).
- `channels.nextcloud-talk.textChunkLimit`: tamaño del fragmento de texto saliente (caracteres).
- `channels.nextcloud-talk.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.nextcloud-talk.blockStreaming`: desactivar la transmisión de bloques para este canal.
- `channels.nextcloud-talk.blockStreamingCoalesce`: ajuste de combinación de transmisión de bloques.
- `channels.nextcloud-talk.mediaMaxMb`: límite de medios entrantes (MB).

import es from "/components/footer/es.mdx";

<es />
