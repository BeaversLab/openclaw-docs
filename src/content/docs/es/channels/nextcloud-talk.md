---
summary: "Estado de soporte de Nextcloud Talk, capacidades y configuración"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

# Nextcloud Talk

Estado: complemento incluido (webhook bot). Se admiten mensajes directos, salas, reacciones y mensajes markdown.

## Complemento incluido

Nextcloud Talk se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que
las versiones empaquetadas normales no necesitan una instalación separada.

Si está en una versión anterior o en una instalación personalizada que excluye Nextcloud Talk,
instálelo manualmente:

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

Revisión local (al ejecutar desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida (principiante)

1. Asegúrese de que el complemento Nextcloud Talk esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. En su servidor Nextcloud, cree un bot:

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. Habilite el bot en la configuración de la sala de destino.
4. Configure OpenClaw:
   - Configuración: `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - O env: `NEXTCLOUD_TALK_BOT_SECRET` (solo cuenta predeterminada)
5. Reinicie el puerta de enlace (o termine la configuración).

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

- Los bots no pueden iniciar MD. El usuario debe enviar un mensaje al bot primero.
- La URL del webhook debe ser accesible por el Gateway; configure `webhookPublicUrl` si está detrás de un proxy.
- Las cargas de medios no son compatibles con la API del bot; los medios se envían como URL.
- El payload del webhook no distingue entre MD y salas; configure `apiUser` + `apiPassword` para habilitar búsquedas de tipo de sala (de lo contrario, los MD se tratan como salas).

## Control de acceso (MD)

- Predeterminado: `channels.nextcloud-talk.dmPolicy = "pairing"`. Los remitentes desconocidos reciben un código de emparejamiento.
- Aprobar a través de:
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- MD públicos: `channels.nextcloud-talk.dmPolicy="open"` más `channels.nextcloud-talk.allowFrom=["*"]`.
- `allowFrom` coincide solo con los ID de usuario de Nextcloud; se ignoran los nombres para mostrar.

## Salas (grupos)

- Predeterminado: `channels.nextcloud-talk.groupPolicy = "allowlist"` (restringido a menciones).
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

- Para no permitir salas, mantenga la lista de permitidos vacía o configure `channels.nextcloud-talk.groupPolicy="disabled"`.

## Capacidades

| Característica    | Estado        |
| ----------------- | ------------- |
| Mensajes directos | Soportado     |
| Salas             | Compatible    |
| Hilos             | No compatible |
| Medios            | Solo URL      |
| Reacciones        | Compatible    |
| Comandos nativos  | No compatible |

## Referencia de configuración (Nextcloud Talk)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.nextcloud-talk.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.nextcloud-talk.baseUrl`: URL de la instancia de Nextcloud.
- `channels.nextcloud-talk.botSecret`: secreto compartido del bot.
- `channels.nextcloud-talk.botSecretFile`: ruta del secreto de archivo regular. Se rechazan los enlaces simbólicos.
- `channels.nextcloud-talk.apiUser`: usuario de API para búsquedas de salas (detección de MD).
- `channels.nextcloud-talk.apiPassword`: contraseña de API/aplicación para búsquedas de salas.
- `channels.nextcloud-talk.apiPasswordFile`: ruta del archivo de contraseña de API.
- `channels.nextcloud-talk.webhookPort`: puerto del escucha de webhook (predeterminado: 8788).
- `channels.nextcloud-talk.webhookHost`: host del webhook (predeterminado: 0.0.0.0).
- `channels.nextcloud-talk.webhookPath`: ruta del webhook (predeterminado: /nextcloud-talk-webhook).
- `channels.nextcloud-talk.webhookPublicUrl`: URL del webhook accesible externamente.
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom`: lista de permitidos de MD (ID de usuario). `open` requiere `"*"`.
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom`: lista de permitidos de grupo (ID de usuario).
- `channels.nextcloud-talk.rooms`: configuración por sala y lista de permitidos.
- `channels.nextcloud-talk.historyLimit`: límite de historial de grupo (0 lo deshabilita).
- `channels.nextcloud-talk.dmHistoryLimit`: límite de historial de MD (0 lo deshabilita).
- `channels.nextcloud-talk.dms`: anulaciones por MD (historyLimit).
- `channels.nextcloud-talk.textChunkLimit`: tamaño del fragmento de texto saliente (caracteres).
- `channels.nextcloud-talk.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.nextcloud-talk.blockStreaming`: deshabilitar la transmisión en bloque para este canal.
- `channels.nextcloud-talk.blockStreamingCoalesce`: ajuste de combinación de transmisión en bloque.
- `channels.nextcloud-talk.mediaMaxMb`: límite de medios entrantes (MB).

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
