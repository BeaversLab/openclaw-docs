---
summary: "Estado, capacidades y configuración del bot de Zalo"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

Estado: experimental. Los MDs son compatibles. La sección [Capacidades](#capabilities) a continuación refleja el comportamiento actual del bot del Marketplace.

## Complemento incluido

Zalo se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las construcciones empaquetadas normales no necesitan una instalación por separado.

Si está en una versión anterior o en una instalación personalizada que excluye a Zalo, instálelo manualmente:

- Instalar a través de CLI: `openclaw plugins install @openclaw/zalo`
- O desde una verificación de código fuente: `openclaw plugins install ./path/to/local/zalo-plugin`
- Detalles: [Complementos](/en/tools/plugin)

## Configuración rápida (principiante)

1. Asegúrese de que el complemento Zalo esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden añadirlo manualmente con los comandos anteriores.
2. Configure el token:
   - Entorno: `ZALO_BOT_TOKEN=...`
   - O configuración: `channels.zalo.accounts.default.botToken: "..."`.
3. Reinicie la puerta de enlace (o finalice la configuración).
4. El acceso a DM es por emparejamiento de forma predeterminada; apruebe el código de emparejamiento en el primer contacto.

Configuración mínima:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## Qué es

Zalo es una aplicación de mensajería centrada en Vietnam; su Bot API permite que la Gateway ejecute un bot para conversaciones 1:1.
Es ideal para soporte o notificaciones donde desea un enrutamiento determinista de vuelta a Zalo.

Esta página refleja el comportamiento actual de OpenClaw para los **bots de Zalo Bot Creator / Marketplace**.
Los **bots de Official Account (OA) de Zalo** son una superficie de producto diferente de Zalo y pueden comportarse de manera diferente.

- Un canal de la API de Bot de Zalo propiedad del Gateway.
- Enrutamiento determinista: las respuestas vuelven a Zalo; el modelo nunca elige los canales.
- Los MDs comparten la sesión principal del agente.
- La sección [Capabilities](#capabilities) a continuación muestra el soporte actual del bot de Marketplace.

## Configuración (camino rápido)

### 1) Crear un token de bot (Plataforma de Bot de Zalo)

1. Vaya a [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) e inicie sesión.
2. Cree un nuevo bot y configure sus ajustes.
3. Copie el token completo del bot (típicamente `numeric_id:secret`). Para bots de Marketplace, el token de tiempo de ejecución utilizable puede aparecer en el mensaje de bienvenida del bot después de su creación.

### 2) Configurar el token (entorno o configuración)

Ejemplo:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

Si luego se mueve a una superficie de bot de Zalo donde los grupos están disponibles, puede agregar configuraciones específicas del grupo como `groupPolicy` y `groupAllowFrom` explícitamente. Para ver el comportamiento actual del bot de Marketplace, consulte [Capabilities](#capabilities).

Opción de entorno: `ZALO_BOT_TOKEN=...` (funciona solo para la cuenta predeterminada).

Soporte multicuenta: use `channels.zalo.accounts` con tokens por cuenta y `name` opcional.

3. Reinicie el gateway. Zalo se inicia cuando se resuelve un token (entorno o configuración).
4. El acceso a MDs por defecto es el emparejamiento. Apruebe el código cuando el bot sea contactado por primera vez.

## Cómo funciona (comportamiento)

- Los mensajes entrantes se normalizan en el sobre de canal compartido con marcadores de posición de medios.
- Las respuestas siempre se enrutan de vuelta al mismo chat de Zalo.
- Larga encuesta por defecto; modo webhook disponible con `channels.zalo.webhookUrl`.

## Límites

- El texto de salida se divide en fragmentos de 2000 caracteres (límite de la API de Zalo).
- Las descargas/cargas de medios están limitadas por `channels.zalo.mediaMaxMb` (por defecto 5).
- La transmisión (streaming) está bloqueada por defecto debido al límite de 2000 caracteres, lo que hace que la transmisión sea menos útil.

## Control de acceso (MDs)

### Acceso a MDs

- Por defecto: `channels.zalo.dmPolicy = "pairing"`. Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
- Aprobar a través de:
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- El emparejamiento es el intercambio de tokens predeterminado. Detalles: [Emparejamiento](/en/channels/pairing)
- `channels.zalo.allowFrom` acepta IDs de usuario numéricos (no hay búsqueda de nombre de usuario disponible).

## Control de acceso (Grupos)

Para los **bots de Zalo Bot Creator / Marketplace**, el soporte de grupos no estaba disponible en la práctica porque el bot no podía ser añadido a un grupo en absoluto.

Eso significa que las claves de configuración relacionadas con grupos a continuación existen en el esquema, pero no se podían usar para los bots de Marketplace:

- `channels.zalo.groupPolicy` controla el manejo de mensajes entrantes de grupo: `open | allowlist | disabled`.
- `channels.zalo.groupAllowFrom` restringe qué IDs de remitente pueden activar el bot en grupos.
- Si `groupAllowFrom` no está establecido, Zalo recurre a `allowFrom` para las comprobaciones de remitente.
- Nota de ejecución: si `channels.zalo` falta por completo, la ejecución todavía recurre a `groupPolicy="allowlist"` por seguridad.

Los valores de la política de grupo (cuando el acceso a grupos está disponible en la superficie de su bot) son:

- `groupPolicy: "disabled"` — bloquea todos los mensajes de grupo.
- `groupPolicy: "open"` — permite cualquier miembro del grupo (limitado por mención).
- `groupPolicy: "allowlist"` — predeterminado de cierre por fallo; solo se aceptan los remitentes permitidos.

Si está utilizando una superficie de producto de bot de Zalo diferente y ha verificado el comportamiento de funcionamiento del grupo, documente eso por separado en lugar de asumir que coincide con el flujo del bot de Marketplace.

## Sondeo prolongado vs webhook

- Predeterminado: sondeo prolongado (no se requiere una URL pública).
- Modo webhook: establezca `channels.zalo.webhookUrl` y `channels.zalo.webhookSecret`.
  - El secreto del webhook debe tener entre 8 y 256 caracteres.
  - La URL del webhook debe usar HTTPS.
  - Zalo envía eventos con el encabezado `X-Bot-Api-Secret-Token` para su verificación.
  - Gateway HTTP maneja las solicitudes webhook en `channels.zalo.webhookPath` (el valor predeterminado es la ruta de URL del webhook).
  - Las solicitudes deben usar `Content-Type: application/json` (o tipos de medios `+json`).
  - Los eventos duplicados (`event_name + message_id`) se ignoran durante una breve ventana de repetición.
  - El tráfico repentino está limitado por tasa por ruta/origen y puede devolver HTTP 429.

**Nota:** getUpdates (sondeo) y webhook son mutuamente excluyentes según la documentación de la API de Zalo.

## Tipos de mensajes compatibles

Para ver un resumen rápido de soporte, consulte [Capabilities](#capabilities). Las notas a continuación añaden detalles donde el comportamiento necesita contexto adicional.

- **Mensajes de texto**: Compatibilidad total con fragmentación de 2000 caracteres.
- **URL simples en texto**: Se comportan como entrada de texto normal.
- **Vistas previas de enlaces / tarjetas de enlaces enriquecidas**: Consulte el estado del Marketplace-bot en [Capabilities](#capabilities); no activaban una respuesta de manera confiable.
- **Mensajes de imagen**: Consulte el estado del Marketplace-bot en [Capabilities](#capabilities); el manejo de imágenes entrantes no era confiable (indicador de escritura sin una respuesta final).
- **Stickers**: Consulte el estado del Marketplace-bot en [Capabilities](#capabilities).
- **Notas de voz / archivos de audio / video / archivos adjuntos genéricos**: Consulte el estado del Marketplace-bot en [Capabilities](#capabilities).
- **Tipos no compatibles**: Registrados (por ejemplo, mensajes de usuarios protegidos).

## Capacidades

Esta tabla resume el comportamiento actual del **Creador de bots de Zalo / bot de Marketplace** en OpenClaw.

| Característica               | Estado                                               |
| ---------------------------- | ---------------------------------------------------- |
| Mensajes directos            | ✅ Compatible                                        |
| Grupos                       | ❌ No disponible para bots de Marketplace            |
| Medios (imágenes entrantes)  | ⚠️ Limitado / verifique en su entorno                |
| Medios (imágenes salientes)  | ⚠️ No vuelto a probar para bots de Marketplace       |
| URL simples en texto         | ✅ Compatible                                        |
| Vistas previas de enlaces    | ⚠️ No fiable para bots de Marketplace                |
| Reacciones                   | ❌ No compatible                                     |
| Stickers                     | ⚠️ Sin respuesta del agente para bots de Marketplace |
| Notas de voz / audio / video | ⚠️ Sin respuesta del agente para bots de Marketplace |
| Archivos adjuntos            | ⚠️ Sin respuesta del agente para bots de Marketplace |
| Hilos                        | ❌ No compatible                                     |
| Encuestas                    | ❌ No compatible                                     |
| Comandos nativos             | ❌ No compatible                                     |
| Transmisión (Streaming)      | ⚠️ Bloqueado (límite de 2000 caracteres)             |

## Objetivos de entrega (CLI/cron)

- Utilice un id de chat como objetivo.
- Ejemplo: `openclaw message send --channel zalo --target 123456789 --message "hi"`.

## Solución de problemas

**El bot no responde:**

- Compruebe que el token sea válido: `openclaw channels status --probe`
- Verifique que el remitente esté aprobado (emparejamiento o allowFrom)
- Consulte los registros de la puerta de enlace: `openclaw logs --follow`

**El webhook no recibe eventos:**

- Asegúrese de que la URL del webhook use HTTPS
- Verifique que el token secreto tenga entre 8 y 256 caracteres
- Confirme que el punto final HTTP de la puerta de enlace sea accesible en la ruta configurada
- Compruebe que el sondeo de getUpdates no se esté ejecutando (son mutuamente excluyentes)

## Referencia de configuración (Zalo)

Configuración completa: [Configuration](/en/gateway/configuration)

Las claves planas de nivel superior (`channels.zalo.botToken`, `channels.zalo.dmPolicy` y similares) son un método abreviado heredado de una sola cuenta. Se prefiere `channels.zalo.accounts.<id>.*` para las nuevas configuraciones. Ambas formas todavía están documentadas aquí porque existen en el esquema.

Opciones del proveedor:

- `channels.zalo.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.zalo.botToken`: token de bot de la plataforma Zalo Bot.
- `channels.zalo.tokenFile`: leer el token desde una ruta de archivo normal. Se rechazan los enlaces simbólicos.
- `channels.zalo.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento).
- `channels.zalo.allowFrom`: lista de permitidos de DM (IDs de usuario). `open` requiere `"*"`. El asistente solicitará los IDs numéricos.
- `channels.zalo.groupPolicy`: `open | allowlist | disabled` (predeterminado: lista de permitidos). Presente en la configuración; consulte [Capabilities](#capabilities) y [Access control (Groups)](#access-control-groups) para conocer el comportamiento actual del bot del Marketplace.
- `channels.zalo.groupAllowFrom`: lista de permitidos de remitentes de grupo (IDs de usuario). Recurre a `allowFrom` cuando no está establecido.
- `channels.zalo.mediaMaxMb`: límite de medios entrantes/salientes (MB, predeterminado 5).
- `channels.zalo.webhookUrl`: habilitar el modo webhook (se requiere HTTPS).
- `channels.zalo.webhookSecret`: secreto del webhook (8-256 caracteres).
- `channels.zalo.webhookPath`: ruta del webhook en el servidor HTTP de la puerta de enlace.
- `channels.zalo.proxy`: URL del proxy para las solicitudes de API.

Opciones multicuenta:

- `channels.zalo.accounts.<id>.botToken`: token por cuenta.
- `channels.zalo.accounts.<id>.tokenFile`: archivo de token normal por cuenta. Se rechazan los enlaces simbólicos.
- `channels.zalo.accounts.<id>.name`: nombre para mostrar.
- `channels.zalo.accounts.<id>.enabled`: habilitar/deshabilitar cuenta.
- `channels.zalo.accounts.<id>.dmPolicy`: política de DM por cuenta.
- `channels.zalo.accounts.<id>.allowFrom`: lista de permitidos por cuenta.
- `channels.zalo.accounts.<id>.groupPolicy`: política de grupo por cuenta. Presente en la configuración; consulte [Capabilities](#capabilities) y [Access control (Groups)](#access-control-groups) para conocer el comportamiento actual del bot del Marketplace.
- `channels.zalo.accounts.<id>.groupAllowFrom`: lista de permitidos de remitentes de grupo por cuenta.
- `channels.zalo.accounts.<id>.webhookUrl`: URL de webhook por cuenta.
- `channels.zalo.accounts.<id>.webhookSecret`: secreto de webhook por cuenta.
- `channels.zalo.accounts.<id>.webhookPath`: ruta de webhook por cuenta.
- `channels.zalo.accounts.<id>.proxy`: URL de proxy por cuenta.

## Relacionado

- [Descripción general de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — flujo de autenticación y emparejamiento de DM
- [Grupos](/en/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
