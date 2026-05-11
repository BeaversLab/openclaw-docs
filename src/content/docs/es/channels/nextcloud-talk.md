---
summary: "Estado de soporte, capacidades y configuración de Nextcloud Talk"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

Estado: complemento incluido (bot de webhook). Se admiten mensajes directos, salas, reacciones y mensajes en markdown.

## Complemento incluido

Nextcloud Talk se incluye como un complemento integrado en las versiones actuales de OpenClaw, por lo que
las compilaciones empaquetadas normales no necesitan una instalación separada.

Si está en una compilación antigua o una instalación personalizada que excluye Nextcloud Talk,
instálelo manualmente:

Instalar vía CLI (registro npm):

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

Repositorio local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

Detalles: [Complementos](/es/tools/plugin)

## Configuración rápida (principiante)

1. Asegúrese de que el complemento Nextcloud Talk esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden añadirlo manualmente con los comandos anteriores.
2. En su servidor Nextcloud, cree un bot:

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. Active el bot en la configuración de la sala de destino.
4. Configure OpenClaw:
   - Config: `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - O env: `NEXTCLOUD_TALK_BOT_SECRET` (solo cuenta predeterminada)

   Configuración de CLI:

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --url https://cloud.example.com \
     --token "<shared-secret>"
   ```

   Campos explícitos equivalentes:

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret "<shared-secret>"
   ```

   Secreto respaldado por archivo:

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. Reinicie la puerta de enlace (o termine la configuración).

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

- Los bots no pueden iniciar MDs. El usuario debe enviar un mensaje al bot primero.
- La URL del webhook debe ser accesible por la Gateway; establezca `webhookPublicUrl` si está detrás de un proxy.
- Las cargas de medios no son compatibles con la API del bot; los medios se envían como URL.
- El payload del webhook no distingue entre MDs y salas; configure `apiUser` + `apiPassword` para habilitar las búsquedas de tipo de sala (de lo contrario, los MDs se tratan como salas).

## Control de acceso (MDs)

- Predeterminado: `channels.nextcloud-talk.dmPolicy = "pairing"`. Los remitentes desconocidos reciben un código de emparejamiento.
- Aprobar vía:
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- MDs públicos: `channels.nextcloud-talk.dmPolicy="open"` más `channels.nextcloud-talk.allowFrom=["*"]`.
- `allowFrom` coincide solo con los IDs de usuario de Nextcloud; se ignoran los nombres para mostrar.

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

- Para no permitir salas, mantenga la lista de permitidos vacía o establezca `channels.nextcloud-talk.groupPolicy="disabled"`.

## Capacidades

| Característica    | Estado        |
| ----------------- | ------------- |
| Mensajes directos | Compatible    |
| Salas             | Soportado     |
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
- `channels.nextcloud-talk.botSecretFile`: ruta del secreto de archivo normal. Se rechazan los enlaces simbólicos.
- `channels.nextcloud-talk.apiUser`: usuario de API para búsquedas de salas (detección de MD).
- `channels.nextcloud-talk.apiPassword`: contraseña de API/aplicación para búsquedas de salas.
- `channels.nextcloud-talk.apiPasswordFile`: ruta del archivo de contraseña de API.
- `channels.nextcloud-talk.webhookPort`: puerto de escucha del webhook (predeterminado: 8788).
- `channels.nextcloud-talk.webhookHost`: host del webhook (predeterminado: 0.0.0.0).
- `channels.nextcloud-talk.webhookPath`: ruta del webhook (predeterminado: /nextcloud-talk-webhook).
- `channels.nextcloud-talk.webhookPublicUrl`: URL del webhook accesible externamente.
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom`: lista de permitidos de MD (IDs de usuario). `open` requiere `"*"`.
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom`: lista de permitidos de grupos (IDs de usuario).
- `channels.nextcloud-talk.rooms`: configuración por sala y lista de permitidos.
- `channels.nextcloud-talk.historyLimit`: límite de historial de grupos (0 lo desactiva).
- `channels.nextcloud-talk.dmHistoryLimit`: límite de historial de MD (0 lo desactiva).
- `channels.nextcloud-talk.dms`: anulaciones por MD (historyLimit).
- `channels.nextcloud-talk.textChunkLimit`: tamaño del fragmento de texto saliente (caracteres).
- `channels.nextcloud-talk.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.nextcloud-talk.blockStreaming`: desactivar la transmisión en bloque para este canal.
- `channels.nextcloud-talk.blockStreamingCoalesce`: ajuste de combinación de transmisión en bloque.
- `channels.nextcloud-talk.mediaMaxMb`: límite de medios entrantes (MB).

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de MD
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
