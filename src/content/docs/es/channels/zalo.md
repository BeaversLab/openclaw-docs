---
summary: "Estado, capacidades y configuración del bot de Zalo"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

Estado: experimental. Los MDs son compatibles. La sección [Capacidades](#capabilities) a continuación refleja el comportamiento actual del bot de Marketplace.

## Complemento incluido

Zalo se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las compilaciones empaquetadas normales no necesitan una instalación separada.

Si está en una compilación anterior o en una instalación personalizada que excluye Zalo, instálelo manualmente:

- Instalar vía CLI: `openclaw plugins install @openclaw/zalo`
- O desde una salida del código fuente: `openclaw plugins install ./path/to/local/zalo-plugin`
- Detalles: [Complementos](/es/tools/plugin)

## Configuración rápida (principiante)

1. Asegúrese de que el complemento Zalo esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Establezca el token:
   - Entorno: `ZALO_BOT_TOKEN=...`
   - O configuración: `channels.zalo.accounts.default.botToken: "..."`.
3. Reinicie la puerta de enlace (o termine la configuración).
4. El acceso a MD es por emparejamiento de forma predeterminada; apruebe el código de emparejamiento en el primer contacto.

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

Zalo es una aplicación de mensajería centrada en Vietnam; su API de Bot permite que la Puerta de enlace ejecute un bot para conversaciones 1:1.
Es adecuada para soporte o notificaciones donde desea un enrutamiento determinista de vuelta a Zalo.

Esta página refleja el comportamiento actual de OpenClaw para **bots de Zalo Bot Creator / Marketplace**.
Los **bots de Cuenta Oficial (OA) de Zalo** son una superficie de producto diferente de Zalo y pueden comportarse de manera diferente.

- Un canal de la API de Bot de Zalo propiedad de la Puerta de enlace.
- Enrutamiento determinista: las respuestas vuelven a Zalo; el modelo nunca elige los canales.
- Los MDs comparten la sesión principal del agente.
- La sección [Capacidades](#capabilities) a continuación muestra el soporte actual para bots de Marketplace.

## Configuración (ruta rápida)

### 1) Crear un token de bot (Plataforma de Bot de Zalo)

1. Vaya a [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) e inicie sesión.
2. Cree un nuevo bot y configure su configuración.
3. Copie el token completo del bot (típicamente `numeric_id:secret`). Para los bots de Marketplace, el token de tiempo de ejecución utilizable puede aparecer en el mensaje de bienvenida del bot después de la creación.

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

Si luego cambia a una superficie de bot de Zalo donde los grupos están disponibles, puede agregar una configuración específica del grupo como `groupPolicy` y `groupAllowFrom` explícitamente. Para el comportamiento actual del bot de Marketplace, consulte [Capacidades](#capabilities).

Opción de entorno: `ZALO_BOT_TOKEN=...` (funciona solo para la cuenta predeterminada).

Soporte multi-cuenta: use `channels.zalo.accounts` con tokens por cuenta y opcional `name`.

3. Reinicie la puerta de enlace. Zalo se inicia cuando se resuelve un token (entorno o configuración).
4. El acceso a MD se establece por defecto en emparejamiento. Aprobar el código cuando el bot sea contactado por primera vez.

## Cómo funciona (comportamiento)

- Los mensajes entrantes se normalizan en el sobre del canal compartido con marcadores de posición de medios.
- Las respuestas siempre se enrutan de vuelta al mismo chat de Zalo.
- Sondeo largo (long-polling) por defecto; modo webhook disponible con `channels.zalo.webhookUrl`.

## Límites

- El texto saliente se divide en fragmentos de 2000 caracteres (límite de la API de Zalo).
- Las descargas/cargas de medios están limitadas por `channels.zalo.mediaMaxMb` (por defecto 5).
- La transmisión (streaming) está bloqueada por defecto debido al límite de 2000 caracteres, lo que hace que la transmisión sea menos útil.

## Control de acceso (MDs)

### Acceso a MD

- Por defecto: `channels.zalo.dmPolicy = "pairing"`. Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
- Aprobar a través de:
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- El emparejamiento es el intercambio de tokens por defecto. Detalles: [Emparejamiento](/es/channels/pairing)
- `channels.zalo.allowFrom` acepta IDs de usuario numéricos (no hay búsqueda de nombre de usuario disponible).

## Control de acceso (Grupos)

Para los **bots de Zalo Bot Creator / Marketplace**, el soporte de grupos no estaba disponible en la práctica porque el bot no podía añadirse a un grupo en absoluto.

Eso significa que las claves de configuración relacionadas con grupos a continuación existen en el esquema, pero no eran utilizables para los bots de Marketplace:

- `channels.zalo.groupPolicy` controla el manejo de entrada de grupos: `open | allowlist | disabled`.
- `channels.zalo.groupAllowFrom` restringe qué IDs de remitente pueden activar el bot en grupos.
- Si `groupAllowFrom` no está configurado, Zalo recurre a `allowFrom` para las verificaciones de remitente.
- Nota de ejecución: si `channels.zalo` falta por completo, el tiempo de ejecución aún recurre a `groupPolicy="allowlist"` por seguridad.

Los valores de la política de grupo (cuando el acceso a grupos está disponible en la superficie de su bot) son:

- `groupPolicy: "disabled"` — bloquea todos los mensajes de grupo.
- `groupPolicy: "open"` — permite cualquier miembro del grupo (restringido por mención).
- `groupPolicy: "allowlist"` — valor predeterminado de cierre seguro; solo se aceptan remitentes permitidos.

Si está utilizando una superficie de producto de bot de Zalo diferente y ha verificado el comportamiento del grupo de trabajo, documente eso por separado en lugar de asumir que coincide con el flujo del bot de Marketplace.

## Sondeo largo (long-polling) vs webhook

- Predeterminado: sondeo largo (no se requiere una URL pública).
- Modo webhook: configure `channels.zalo.webhookUrl` y `channels.zalo.webhookSecret`.
  - El secreto del webhook debe tener de 8 a 256 caracteres.
  - La URL del webhook debe usar HTTPS.
  - Zalo envía eventos con el encabezado `X-Bot-Api-Secret-Token` para su verificación.
  - Gateway HTTP maneja las solicitudes del webhook en `channels.zalo.webhookPath` (el valor predeterminado es la ruta de la URL del webhook).
  - Las solicitudes deben usar `Content-Type: application/json` (o tipos de medios `+json`).
  - Los eventos duplicados (`event_name + message_id`) se ignoran durante una breve ventana de reproducción.
  - El tráfico explosivo está limitado por tasa por ruta/fuente y puede devolver HTTP 429.

**Nota:** getUpdates (sondeo) y webhook son mutuamente excluyentes según la documentación de la API de Zalo.

## Tipos de mensajes compatibles

Para ver una descripción general rápida del soporte, consulte [Capacidades](#capabilities). Las notas a continuación añaden detalles donde el comportamiento necesita contexto adicional.

- **Mensajes de texto**: Soporte completo con fragmentación de 2000 caracteres.
- **URL simples en el texto**: Se comportan como entrada de texto normal.
- **Vistas previas de enlaces / tarjetas de enlaces enriquecidas**: Consulte el estado del bot de Marketplace en [Capacidades](#capabilities); no activaban de manera confiable una respuesta.
- **Mensajes de imagen**: Consulte el estado del bot de Marketplace en [Capacidades](#capabilities); el manejo de imágenes entrantes no era confiable (indicador de escritura sin una respuesta final).
- **Stickers**: Consulte el estado del bot de Marketplace en [Capacidades](#capabilities).
- **Notas de voz / archivos de audio / video / archivos adjuntos genéricos**: Consulte el estado del bot de Marketplace en [Capacidades](#capabilities).
- **Tipos no compatibles**: Se registran (por ejemplo, mensajes de usuarios protegidos).

## Capacidades

Esta tabla resume el comportamiento actual del **Creador de bots de Zalo / bot de Marketplace** en OpenClaw.

| Característica               | Estado                                               |
| ---------------------------- | ---------------------------------------------------- |
| Mensajes directos            | ✅ Compatible                                        |
| Grupos                       | ❌ No disponible para bots de Marketplace            |
| Medios (imágenes entrantes)  | ⚠️ Limitado / verifique en su entorno                |
| Medios (imágenes salientes)  | ⚠️ No se ha vuelto a probar para bots de Marketplace |
| URL simples en texto         | ✅ Compatible                                        |
| Vistas previas de enlaces    | ⚠️ No fiable para bots de Marketplace                |
| Reacciones                   | ❌ No compatible                                     |
| Pegatinas                    | ⚠️ Sin respuesta del agente para bots de Marketplace |
| Notas de voz / audio / video | ⚠️ Sin respuesta del agente para bots de Marketplace |
| Archivos adjuntos            | ⚠️ Sin respuesta del agente para bots de Marketplace |
| Hilos                        | ❌ No compatible                                     |
| Encuestas                    | ❌ No compatible                                     |
| Comandos nativos             | ❌ No compatible                                     |
| Transmisión                  | ⚠️ Bloqueado (límite de 2000 caracteres)             |

## Objetivos de entrega (CLI/cron)

- Use un id de chat como objetivo.
- Ejemplo: `openclaw message send --channel zalo --target 123456789 --message "hi"`.

## Solución de problemas

**El bot no responde:**

- Verifique que el token sea válido: `openclaw channels status --probe`
- Verifique que el remitente esté aprobado (emparejamiento o allowFrom)
- Revise los registros de la puerta de enlace: `openclaw logs --follow`

**El webhook no recibe eventos:**

- Asegúrese de que la URL del webhook use HTTPS
- Verifique que el token secreto tenga entre 8 y 256 caracteres
- Confirme que el punto final HTTP de la puerta de enlace sea accesible en la ruta configurada
- Compruebe que el sondeo getUpdates no se esté ejecutando (son mutuamente excluyentes)

## Referencia de configuración (Zalo)

Configuración completa: [Configuration](/es/gateway/configuration)

Las claves planas de nivel superior (`channels.zalo.botToken`, `channels.zalo.dmPolicy` y similares) son una abreviatura heredada de una sola cuenta. Prefiera `channels.zalo.accounts.<id>.*` para nuevas configuraciones. Ambas formas aún están documentadas aquí porque existen en el esquema.

Opciones del proveedor:

- `channels.zalo.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.zalo.botToken`: token de bot de Zalo Bot Platform.
- `channels.zalo.tokenFile`: leer token de una ruta de archivo regular. Los enlaces simbólicos son rechazados.
- `channels.zalo.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento).
- `channels.zalo.allowFrom`: lista blanca de DM (IDs de usuario). `open` requiere `"*"`. El asistente pedirá los IDs numéricos.
- `channels.zalo.groupPolicy`: `open | allowlist | disabled` (predeterminado: lista blanca). Presente en la configuración; consulte [Capabilities](#capabilities) y [Access control (Groups)](#access-control-groups) para el comportamiento actual del bot de Marketplace.
- `channels.zalo.groupAllowFrom`: lista de permitidos de remitentes de grupos (IDs de usuario). Recurre a `allowFrom` si no se establece.
- `channels.zalo.mediaMaxMb`: límite de medios entrantes/salientes (MB, valor predeterminado 5).
- `channels.zalo.webhookUrl`: habilitar modo webhook (se requiere HTTPS).
- `channels.zalo.webhookSecret`: secreto del webhook (8-256 caracteres).
- `channels.zalo.webhookPath`: ruta del webhook en el servidor HTTP de la puerta de enlace.
- `channels.zalo.proxy`: URL de proxy para solicitudes de API.

Opciones multicuenta:

- `channels.zalo.accounts.<id>.botToken`: token por cuenta.
- `channels.zalo.accounts.<id>.tokenFile`: archivo de token normal por cuenta. Se rechazan los enlaces simbólicos.
- `channels.zalo.accounts.<id>.name`: nombre para mostrar.
- `channels.zalo.accounts.<id>.enabled`: habilitar/deshabilitar cuenta.
- `channels.zalo.accounts.<id>.dmPolicy`: política de MD por cuenta.
- `channels.zalo.accounts.<id>.allowFrom`: lista de permitidos por cuenta.
- `channels.zalo.accounts.<id>.groupPolicy`: política de grupo por cuenta. Presente en la configuración; consulte [Capabilities](#capabilities) y [Access control (Groups)](#access-control-groups) para el comportamiento actual del bot de Marketplace.
- `channels.zalo.accounts.<id>.groupAllowFrom`: lista de permitidos de remitentes de grupos por cuenta.
- `channels.zalo.accounts.<id>.webhookUrl`: URL del webhook por cuenta.
- `channels.zalo.accounts.<id>.webhookSecret`: secreto del webhook por cuenta.
- `channels.zalo.accounts.<id>.webhookPath`: ruta del webhook por cuenta.
- `channels.zalo.accounts.<id>.proxy`: URL de proxy por cuenta.

## Relacionado

- [Channels Overview](/es/channels) — todos los canales compatibles
- [Pairing](/es/channels/pairing) — flujo de autenticación y emparejamiento de MD
- [Groups](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Channel Routing](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Security](/es/gateway/security) — modelo de acceso y endurecimiento
