---
summary: "Estado, capacidades y configuración del bot de Zalo"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

Estado: experimental. Los MDs son compatibles; el manejo de grupos está disponible con controles de política de grupo explícitos.

## Plugin requerido

Zalo se distribuye como un complemento y no está incluido en la instalación central.

- Instalar vía CLI: `openclaw plugins install @openclaw/zalo`
- O seleccione **Zalo** durante la incorporación y confirme el aviso de instalación
- Detalles: [Complementos](/es/tools/plugin)

## Configuración rápida (principiante)

1. Instale el plugin de Zalo:
   - Desde un checkout de fuente: `openclaw plugins install ./extensions/zalo`
   - Desde npm (si está publicado): `openclaw plugins install @openclaw/zalo`
   - O elija **Zalo** en la incorporación y confirme el aviso de instalación
2. Configure el token:
   - Env: `ZALO_BOT_TOKEN=...`
   - O configuración: `channels.zalo.botToken: "..."`.
3. Reinicie la puerta de enlace (o termine la incorporación).
4. El acceso a DM es por emparejamiento de forma predeterminada; apruebe el código de emparejamiento en el primer contacto.

Configuración mínima:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

## Qué es

Zalo es una aplicación de mensajería centrada en Vietnam; su Bot API permite que la Gateway ejecute un bot para conversaciones 1:1.
Es ideal para soporte o notificaciones donde desea un enrutamiento determinista de vuelta a Zalo.

- Un canal de Zalo Bot API propiedad de la Gateway.
- Enrutamiento determinista: las respuestas vuelven a Zalo; el modelo nunca elige los canales.
- Los MDs comparten la sesión principal del agente.
- Los grupos son compatibles con controles de política (`groupPolicy` + `groupAllowFrom`) y de forma predeterminada tienen un comportamiento de lista de permitidos cerrado por falla.

## Configuración (ruta rápida)

### 1) Crear un token de bot (Plataforma de Bot de Zalo)

1. Vaya a [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) e inicie sesión.
2. Cree un nuevo bot y configure su configuración.
3. Copie el token del bot (formato: `12345689:abc-xyz`).

### 2) Configurar el token (env o config)

Ejemplo:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

Opción Env: `ZALO_BOT_TOKEN=...` (funciona solo para la cuenta predeterminada).

Soporte multicuenta: use `channels.zalo.accounts` con tokens por cuenta y `name` opcional.

3. Reinicie la puerta de enlace. Zalo se inicia cuando se resuelve un token (env o config).
4. El acceso a MD se predetermina a emparejamiento. Apruebe el código cuando el bot sea contactado por primera vez.

## Cómo funciona (comportamiento)

- Los mensajes entrantes se normalizan en el sobre de canal compartido con marcadores de posición de medios.
- Las respuestas siempre se enrutan de vuelta al mismo chat de Zalo.
- Long-polling por defecto; modo webhook disponible con `channels.zalo.webhookUrl`.

## Límites

- El texto saliente se divide en fragmentos de 2000 caracteres (límite de la API de Zalo).
- Las descargas/cargas de medios están limitadas por `channels.zalo.mediaMaxMb` (por defecto 5).
- La transmisión (streaming) está bloqueada por defecto debido al límite de 2000 caracteres, lo que hace que la transmisión sea menos útil.

## Control de acceso (MDs)

### Acceso a MDs

- Por defecto: `channels.zalo.dmPolicy = "pairing"`. Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que sean aprobados (los códigos caducan después de 1 hora).
- Aprobar vía:
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- El emparejamiento es el intercambio de tokens por defecto. Detalles: [Emparejamiento](/es/channels/pairing)
- `channels.zalo.allowFrom` acepta IDs de usuario numéricos (no hay búsqueda de nombre de usuario disponible).

## Control de acceso (Grupos)

- `channels.zalo.groupPolicy` controla el manejo de mensajes entrantes de grupo: `open | allowlist | disabled`.
- El comportamiento por defecto es fail-closed (cerrado en caso de fallo): `allowlist`.
- `channels.zalo.groupAllowFrom` restringe qué IDs de remitente pueden activar el bot en grupos.
- Si `groupAllowFrom` no está establecido, Zalo recurre a `allowFrom` para las comprobaciones de remitente.
- `groupPolicy: "disabled"` bloquea todos los mensajes de grupo.
- `groupPolicy: "open"` permite cualquier miembro del grupo (limitado por mención).
- Nota de ejecución: si falta `channels.zalo` por completo, el tiempo de ejecución todavía recurre a `groupPolicy="allowlist"` por seguridad.

## Long-polling vs webhook

- Por defecto: long-polling (no se requiere una URL pública).
- Modo webhook: establecer `channels.zalo.webhookUrl` y `channels.zalo.webhookSecret`.
  - El secreto del webhook debe tener entre 8 y 256 caracteres.
  - La URL del webhook debe usar HTTPS.
  - Zalo envía eventos con el encabezado `X-Bot-Api-Secret-Token` para su verificación.
  - Gateway HTTP maneja las solicitudes del webhook en `channels.zalo.webhookPath` (por defecto la ruta de la URL del webhook).
  - Las solicitudes deben usar `Content-Type: application/json` (o tipos de medios `+json`).
  - Los eventos duplicados (`event_name + message_id`) se ignoran durante una breve ventana de repetición.
  - El tráfico impulsado está limitado por ruta/origen y puede devolver HTTP 429.

**Nota:** getUpdates (sondeo) y webhook son mutuamente excluyentes según la documentación de la API de Zalo.

## Tipos de mensajes compatibles

- **Mensajes de texto**: Soporte completo con fragmentación de 2000 caracteres.
- **Mensajes de imagen**: Descarga y procesa imágenes entrantes; envía imágenes mediante `sendPhoto`.
- **Stickers**: Se registran pero no se procesan completamente (sin respuesta del agente).
- **Tipos no compatibles**: Se registran (por ejemplo, mensajes de usuarios protegidos).

## Capacidades

| Característica    | Estado                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| Mensajes directos | ✅ Compatible                                                             |
| Grupos            | ⚠️ Compatible con controles de política (lista de permitidos por defecto) |
| Medios (imágenes) | ✅ Compatible                                                             |
| Reacciones        | ❌ No compatible                                                          |
| Hilos             | ❌ No compatible                                                          |
| Encuestas         | ❌ No compatible                                                          |
| Comandos nativos  | ❌ No compatible                                                          |
| Transmisión       | ⚠️ Bloqueado (límite de 2000 caracteres)                                  |

## Objetivos de entrega (CLI/cron)

- Utilice un ID de chat como objetivo.
- Ejemplo: `openclaw message send --channel zalo --target 123456789 --message "hi"`.

## Solución de problemas

**El bot no responde:**

- Verifique que el token sea válido: `openclaw channels status --probe`
- Verifique que el remitente esté aprobado (emparejamiento o allowFrom)
- Revise los registros de la pasarela: `openclaw logs --follow`

**El webhook no recibe eventos:**

- Asegúrese de que la URL del webhook use HTTPS
- Verifique que el token secreto tenga entre 8 y 256 caracteres
- Confirme que el punto final HTTP de la pasarela sea accesible en la ruta configurada
- Compruebe que el sondeo getUpdates no se esté ejecutando (son mutuamente excluyentes)

## Referencia de configuración (Zalo)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.zalo.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.zalo.botToken`: token del bot de Zalo Bot Platform.
- `channels.zalo.tokenFile`: leer el token de una ruta de archivo normal. Se rechazan los enlaces simbólicos.
- `channels.zalo.dmPolicy`: `pairing | allowlist | open | disabled` (por defecto: pairing).
- `channels.zalo.allowFrom`: lista de permitidos para MD (IDs de usuario). `open` requiere `"*"`. El asistente solicitará IDs numéricos.
- `channels.zalo.groupPolicy`: `open | allowlist | disabled` (por defecto: allowlist).
- `channels.zalo.groupAllowFrom`: lista de permitidos de remitentes de grupos (IDs de usuario). Recurre a `allowFrom` si no está configurado.
- `channels.zalo.mediaMaxMb`: límite de capacidad de medios entrantes/salientes (MB, por defecto 5).
- `channels.zalo.webhookUrl`: habilitar modo webhook (se requiere HTTPS).
- `channels.zalo.webhookSecret`: secreto del webhook (8-256 caracteres).
- `channels.zalo.webhookPath`: ruta del webhook en el servidor HTTP de la puerta de enlace.
- `channels.zalo.proxy`: URL del proxy para solicitudes de API.

Opciones multicuenta:

- `channels.zalo.accounts.<id>.botToken`: token por cuenta.
- `channels.zalo.accounts.<id>.tokenFile`: archivo de token normal por cuenta. Se rechazan los enlaces simbólicos.
- `channels.zalo.accounts.<id>.name`: nombre para mostrar.
- `channels.zalo.accounts.<id>.enabled`: habilitar/deshabilitar cuenta.
- `channels.zalo.accounts.<id>.dmPolicy`: política de MD por cuenta.
- `channels.zalo.accounts.<id>.allowFrom`: lista de permitidos por cuenta.
- `channels.zalo.accounts.<id>.groupPolicy`: política de grupo por cuenta.
- `channels.zalo.accounts.<id>.groupAllowFrom`: lista de permitidos de remitentes de grupos por cuenta.
- `channels.zalo.accounts.<id>.webhookUrl`: URL del webhook por cuenta.
- `channels.zalo.accounts.<id>.webhookSecret`: secreto del webhook por cuenta.
- `channels.zalo.accounts.<id>.webhookPath`: ruta del webhook por cuenta.
- `channels.zalo.accounts.<id>.proxy`: URL del proxy por cuenta.

import es from "/components/footer/es.mdx";

<es />
