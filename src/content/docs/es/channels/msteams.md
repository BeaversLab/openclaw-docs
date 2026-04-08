---
summary: "Estado de soporte, capacidades y configuración del bot de Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> "Abandonad toda esperanza, los que entráis aquí."

Actualizado: 2026-01-21

Estado: se admiten archivos adjuntos de texto + MD; el envío de archivos a canales/grupos requiere `sharePointSiteId` + permisos de Graph (consulte [Sending files in group chats](#sending-files-in-group-chats)). Las encuestas se envían a través de Adaptive Cards. Las acciones de mensaje exponen `upload-file` explícito para envíos priorizados de archivos.

## Plugin incluido

Microsoft Teams se distribuye como un plugin incluido en las versiones actuales de OpenClaw, por lo que no se requiere una instalación separada en la versión empaquetada normal.

Si está en una versión anterior o en una instalación personalizada que excluye Teams incluido, instálelo manualmente:

```bash
openclaw plugins install @openclaw/msteams
```

Copia local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Detalles: [Plugins](/en/tools/plugin)

## Configuración rápida (principiante)

1. Asegúrese de que el complemento de Microsoft Teams esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Cree un **Azure Bot** (App ID + secreto de cliente + ID de inquilino).
3. Configure OpenClaw con esas credenciales.
4. Exponga `/api/messages` (puerto 3978 de forma predeterminada) a través de una URL pública o túnel.
5. Instale el paquete de la aplicación de Teams e inicie la puerta de enlace.

Configuración mínima:

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

Nota: los chats grupales están bloqueados de forma predeterminada (`channels.msteams.groupPolicy: "allowlist"`). Para permitir respuestas grupales, establezca `channels.msteams.groupAllowFrom` (o use `groupPolicy: "open"` para permitir cualquier miembro, restringido por mención).

## Objetivos

- Hable con OpenClaw a través de MDs de Teams, chats grupales o canales.
- Mantenga el enrutamiento determinista: las respuestas siempre vuelven al canal por el que llegaron.
- De forma predeterminada, se comporta de forma segura en el canal (se requieren menciones a menos que se configure lo contrario).

## Escrituras de configuración

De forma predeterminada, se permite a Microsoft Teams escribir actualizaciones de configuración activadas por `/config set|unset` (requiere `commands.config: true`).

Desactivar con:

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## Control de acceso (MDs + grupos)

**Acceso MD**

- Predeterminado: `channels.msteams.dmPolicy = "pairing"`. Los remitentes desconocidos se ignoran hasta que se aprueban.
- `channels.msteams.allowFrom` debe usar IDs de objeto AAD estables.
- Los UPNs/nombres para mostrar son mutables; la coincidencia directa está desactivada de forma predeterminada y solo se habilita con `channels.msteams.dangerouslyAllowNameMatching: true`.
- El asistente puede resolver nombres a IDs a través de Microsoft Graph cuando las credenciales lo permiten.

**Acceso a grupos**

- Predeterminado: `channels.msteams.groupPolicy = "allowlist"` (bloqueado a menos que añadas `groupAllowFrom`). Usa `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté configurado.
- `channels.msteams.groupAllowFrom` controla qué remitentes pueden activar en chats grupales/canales (recurre a `channels.msteams.allowFrom`).
- Establece `groupPolicy: "open"` para permitir cualquier miembro (aún restringido por mención de forma predeterminada).
- Para no permitir **ningún canal**, establece `channels.msteams.groupPolicy: "disabled"`.

Ejemplo:

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"],
    },
  },
}
```

**Lista de permitidos de Teams + canales**

- Limita las respuestas de grupo/canal listando equipos y canales bajo `channels.msteams.teams`.
- Las claves deben usar IDs de equipo estables e IDs de conversación de canal.
- Cuando `groupPolicy="allowlist"` y una lista de permitidos de equipos está presente, solo se aceptan los equipos/canales listados (restringido por mención).
- El asistente de configuración acepta entradas `Team/Channel` y las almacena por ti.
- Al iniciarse, OpenClaw resuelve los nombres de la lista de permitidos de equipos/canales y usuarios a IDs (cuando los permisos de Graph lo permiten)
  y registra el mapeo; los nombres de equipos/canales no resueltos se mantienen tal como se escribieron pero se ignoran para el enrutamiento de forma predeterminada a menos que `channels.msteams.dangerouslyAllowNameMatching: true` esté habilitado.

Ejemplo:

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "My Team": {
          channels: {
            General: { requireMention: true },
          },
        },
      },
    },
  },
}
```

## Cómo funciona

1. Asegúrate de que el complemento de Microsoft Teams esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden añadirlo manualmente con los comandos anteriores.
2. Crea un **Azure Bot** (App ID + secreto + ID de inquilino).
3. Construye un **paquete de aplicación de Teams** que haga referencia al bot e incluya los permisos RSC a continuación.
4. Carga/instala la aplicación de Teams en un equipo (o ámbito personal para MDs).
5. Configura `msteams` en `~/.openclaw/openclaw.json` (o variables de entorno) e inicia la puerta de enlace.
6. La puerta de enlace escucha el tráfico del webhook de Bot Framework en `/api/messages` de forma predeterminada.

## Configuración de Azure Bot (Requisitos previos)

Antes de configurar OpenClaw, necesitas crear un recurso de Azure Bot.

### Paso 1: Crear Azure Bot

1. Ve a [Crear Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Rellena la pestaña **Conceptos básicos**:

   | Campo                     | Valor                                                            |
   | ------------------------- | ---------------------------------------------------------------- |
   | **Identificador del bot** | El nombre de tu bot, p. ej., `openclaw-msteams` (debe ser único) |
   | **Suscripción**           | Selecciona tu suscripción de Azure                               |
   | **Grupo de recursos**     | Crear nuevo o usar existente                                     |
   | **Nivel de precios**      | **Gratis** para desarrollo/pruebas                               |
   | **Tipo de aplicación**    | **Single Tenant** (recomendado - ver nota a continuación)        |
   | **Tipo de creación**      | **Crear nuevo ID de aplicación de Microsoft**                    |

> **Aviso de obsolescencia:** La creación de nuevos bots de varios inquilinos quedó obsoleta después del 2025-07-31. Use **Single Tenant** para nuevos bots.

3. Haga clic en **Review + create** → **Create** (espere ~1-2 minutos)

### Paso 2: Obtener las credenciales

1. Vaya a su recurso de Azure Bot → **Configuration**
2. Copie **Microsoft App ID** → este es su `appId`
3. Haga clic en **Manage Password** → vaya al Registro de la aplicación
4. En **Certificates & secrets** → **New client secret** → copie el **Value** → este es su `appPassword`
5. Vaya a **Overview** → copie **Directory (tenant) ID** → este es su `tenantId`

### Paso 3: Configurar el punto de conexión de mensajería

1. En Azure Bot → **Configuration**
2. Establezca **Messaging endpoint** en la URL de su webhook:
   - Producción: `https://your-domain.com/api/messages`
   - Desarrollo local: Use un túnel (ver [Local Development](#local-development-tunneling) a continuación)

### Paso 4: Habilitar el canal de Teams

1. En Azure Bot → **Channels**
2. Haga clic en **Microsoft Teams** → Configure → Save
3. Acepte los Términos de servicio

## Desarrollo local (Tunelización)

Teams no puede alcanzar `localhost`. Use un túnel para el desarrollo local:

**Opción A: ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**Opción B: Tailscale Funnel**

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Portal para desarrolladores de Teams (Alternativa)

En lugar de crear manualmente un ZIP de manifiesto, puede usar el [Teams Developer Portal](https://dev.teams.microsoft.com/apps):

1. Haga clic en **+ New app**
2. Rellene la información básica (nombre, descripción, información del desarrollador)
3. Vaya a **App features** → **Bot**
4. Seleccione **Enter a bot ID manually** y pegue su ID de aplicación de Azure Bot
5. Verifique los alcances: **Personal**, **Team**, **Group Chat**
6. Haga clic en **Distribute** → **Download app package**
7. En Teams: **Apps** → **Manage your apps** → **Upload a custom app** → seleccione el ZIP

Esto suele ser más fácil que editar manifiestos JSON a mano.

## Prueba del Bot

**Opción A: Azure Web Chat (verifique el webhook primero)**

1. En Azure Portal → su recurso de Azure Bot → **Test in Web Chat**
2. Envíe un mensaje; debería ver una respuesta
3. Esto confirma que su punto de conexión de webhook funciona antes de la configuración de Teams

**Opción B: Teams (después de la instalación de la aplicación)**

1. Instale la aplicación de Teams (carga lateral o catálogo de la organización)
2. Busque el bot en Teams y envíe un MD
3. Verifique los registros de la puerta de enlace para ver la actividad entrante

## Configuración (mínima, solo texto)

1. **Asegúrese de que el complemento de Microsoft Teams esté disponible**
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente:
     - Desde npm: `openclaw plugins install @openclaw/msteams`
     - Desde una copia local: `openclaw plugins install ./path/to/local/msteams-plugin`

2. **Registro del bot**
   - Cree un Azure Bot (ver arriba) y anote:
     - ID de aplicación
     - Secreto de cliente (Contraseña de la aplicación)
     - ID de inquilino (single-tenant)

3. **Manifiesto de la aplicación de Teams**
   - Incluya una entrada `bot` con `botId = <App ID>`.
   - Ámbitos: `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (requerido para el manejo de archivos del ámbito personal).
   - Agregue permisos RSC (abajo).
   - Cree iconos: `outline.png` (32x32) y `color.png` (192x192).
   - Comprima los tres archivos juntos: `manifest.json`, `outline.png`, `color.png`.

4. **Configurar OpenClaw**

   ```json5
   {
     channels: {
       msteams: {
         enabled: true,
         appId: "<APP_ID>",
         appPassword: "<APP_PASSWORD>",
         tenantId: "<TENANT_ID>",
         webhook: { port: 3978, path: "/api/messages" },
       },
     },
   }
   ```

   También puede usar variables de entorno en lugar de claves de configuración:
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Punto de conexión del bot**
   - Establezca el punto de conexión de mensajería de Azure Bot en:
     - `https://<host>:3978/api/messages` (o su ruta/puerto elegido).

6. **Ejecutar el gateway**
   - El canal de Teams se inicia automáticamente cuando el complemento incluido o instalado manualmente está disponible y existe la configuración `msteams` con las credenciales.

## Acción de información del miembro

OpenClaw expone una acción `member-info` respaldada por Graph para Microsoft Teams, de modo que los agentes y las automatizaciones puedan resolver los detalles de los miembros del canal (nombre para mostrar, correo electrónico, rol) directamente desde Microsoft Graph.

Requisitos:

- Permiso RSC `Member.Read.Group` (ya en el manifiesto recomendado)
- Para búsquedas entre equipos: permiso de aplicación de Graph `User.Read.All` con consentimiento de administrador

La acción está limitada por `channels.msteams.actions.memberInfo` (predeterminado: habilitado cuando las credenciales de Graph están disponibles).

## Contexto del historial

- `channels.msteams.historyLimit` controla cuántos mensajes recientes del canal/grupo se incluyen en el mensaje (prompt).
- Recurre a `messages.groupChat.historyLimit`. Establezca `0` para deshabilitar (predeterminado 50).
- El historial de conversaciones recuperado se filtra mediante listas de permitidos de remitentes (`allowFrom` / `groupAllowFrom`), por lo que la inicialización del contexto de la conversación solo incluye mensajes de remitentes permitidos.
- El contexto del archivo adjunto citado (`ReplyTo*` derivado del HTML de respuesta de Teams) actualmente se pasa tal como se recibe.
- En otras palabras, las listas de permitidos controlan quién puede activar el agente; hoy solo se filtran rutas de contexto suplementario específicas.
- El historial de MD se puede limitar con `channels.msteams.dmHistoryLimit` (turnos de usuario). Invalidaciones por usuario: `channels.msteams.dms["<user_id>"].historyLimit`.

## Permisos RSC de Teams actuales (Manifiesto)

Estos son los permisos **resourceSpecific existentes** en nuestro manifiesto de aplicación de Teams. Solo se aplican dentro del equipo/chat donde está instalada la aplicación.

**Para canales (ámbito de equipo):**

- `ChannelMessage.Read.Group` (Aplicación) - recibir todos los mensajes del canal sin @mención
- `ChannelMessage.Send.Group` (Aplicación)
- `Member.Read.Group` (Aplicación)
- `Owner.Read.Group` (Aplicación)
- `ChannelSettings.Read.Group` (Aplicación)
- `TeamMember.Read.Group` (Aplicación)
- `TeamSettings.Read.Group` (Aplicación)

**Para chats de grupo:**

- `ChatMessage.Read.Chat` (Aplicación) - recibir todos los mensajes de chat de grupo sin @mención

## Ejemplo de Manifiesto de Teams (redactado)

Ejemplo mínimo y válido con los campos obligatorios. Reemplace los ID y las URL.

```json5
{
  $schema: "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  manifestVersion: "1.23",
  version: "1.0.0",
  id: "00000000-0000-0000-0000-000000000000",
  name: { short: "OpenClaw" },
  developer: {
    name: "Your Org",
    websiteUrl: "https://example.com",
    privacyUrl: "https://example.com/privacy",
    termsOfUseUrl: "https://example.com/terms",
  },
  description: { short: "OpenClaw in Teams", full: "OpenClaw in Teams" },
  icons: { outline: "outline.png", color: "color.png" },
  accentColor: "#5B6DEF",
  bots: [
    {
      botId: "11111111-1111-1111-1111-111111111111",
      scopes: ["personal", "team", "groupChat"],
      isNotificationOnly: false,
      supportsCalling: false,
      supportsVideo: false,
      supportsFiles: true,
    },
  ],
  webApplicationInfo: {
    id: "11111111-1111-1111-1111-111111111111",
  },
  authorization: {
    permissions: {
      resourceSpecific: [
        { name: "ChannelMessage.Read.Group", type: "Application" },
        { name: "ChannelMessage.Send.Group", type: "Application" },
        { name: "Member.Read.Group", type: "Application" },
        { name: "Owner.Read.Group", type: "Application" },
        { name: "ChannelSettings.Read.Group", type: "Application" },
        { name: "TeamMember.Read.Group", type: "Application" },
        { name: "TeamSettings.Read.Group", type: "Application" },
        { name: "ChatMessage.Read.Chat", type: "Application" },
      ],
    },
  },
}
```

### Advertencias del manifiesto (campos obligatorios)

- `bots[].botId` **debe** coincidir con el ID de la aplicación de Azure Bot.
- `webApplicationInfo.id` **debe** coincidir con el ID de la aplicación de Azure Bot.
- `bots[].scopes` debe incluir las superficies que planea usar (`personal`, `team`, `groupChat`).
- `bots[].supportsFiles: true` es necesario para el manejo de archivos en el ámbito personal.
- `authorization.permissions.resourceSpecific` debe incluir lectura/escritura de canales si desea tráfico de canales.

### Actualizar una aplicación existente

Para actualizar una aplicación de Teams ya instalada (por ejemplo, para agregar permisos RSC):

1. Actualice su `manifest.json` con la nueva configuración
2. **Incremente el campo `version`** (por ejemplo, `1.0.0` → `1.1.0`)
3. **Vuelva a comprimir** el manifiesto con los iconos (`manifest.json`, `outline.png`, `color.png`)
4. Cargue el nuevo archivo zip:
   - **Opción A (Centro de administración de Teams):** Centro de administración de Teams → Aplicaciones de Teams → Administrar aplicaciones → busque su aplicación → Cargar nueva versión
   - **Opción B (Carga lateral):** En Teams → Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación personalizada
5. **Para canales de equipo:** Vuelva a instalar la aplicación en cada equipo para que los nuevos permisos surtan efecto
6. **Cierre y reinicie Teams por completo** (no solo cierre la ventana) para borrar los metadatos de la aplicación en caché

## Capacidades: Solo RSC frente a Graph

### Con **Solo RSC de Teams** (aplicación instalada, sin permisos de API de Graph)

Funciona:

- Leer el **texto** del mensaje del canal.
- Enviar **texto** en el mensaje del canal.
- Recibir archivos adjuntos **personales (MD)**.

NO funciona:

- Canal/grupo **imágenes o contenido de archivos** (la carga útil solo incluye un código auxiliar HTML).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes (más allá del evento de webhook en tiempo real).

### Con **RSC de Teams + Permisos de aplicación de Microsoft Graph**

Añade:

- Descargar contenido alojado (imágenes pegadas en los mensajes).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes del canal/chat a través de Graph.

### RSC frente a Graph API

| Capacidad                        | Permisos RSC                     | Graph API                                                   |
| -------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| **Mensajes en tiempo real**      | Sí (vía webhook)                 | No (solo sondeo)                                            |
| **Mensajes históricos**          | No                               | Sí (puede consultar el historial)                           |
| **Complejidad de configuración** | Solo manifiesto de la aplicación | Requiere consentimiento del administrador + flujo de tokens |
| **Funciona sin conexión**        | No (debe estar ejecutándose)     | Sí (consultar en cualquier momento)                         |

**En resumen:** RSC es para escuchar en tiempo real; Graph API es para acceso histórico. Para ponerse al día con los mensajes perdidos mientras se está sin conexión, necesita Graph API con `ChannelMessage.Read.All` (requiere consentimiento del administrador).

## Medios e historial habilitados para Graph (necesario para canales)

Si necesita imágenes/archivos en **canales** o desea recuperar el **historial de mensajes**, debe habilitar los permisos de Microsoft Graph y otorgar el consentimiento del administrador.

1. En Entra ID (Azure AD) **Registro de aplicación**, agregue **Permisos de aplicación** de Microsoft Graph:
   - `ChannelMessage.Read.All` (archivos adjuntos del canal + historial)
   - `Chat.Read.All` o `ChatMessage.Read.All` (chats grupales)
2. **Otorgar consentimiento del administrador** para el inquilino.
3. Actualiza la **versión del manifiesto** de la aplicación de Teams, vuelve a subirla y **reinstala la aplicación en Teams**.
4. **Cierra y reinicia completamente Teams** para borrar los metadatos de la aplicación en caché.

**Permiso adicional para menciones de usuario:** Las @menciones de usuario funcionan de manera inmediata para los usuarios en la conversación. Sin embargo, si deseas buscar dinámicamente y mencionar usuarios que **no están en la conversación actual**, agrega el permiso `User.Read.All` (Aplicación) y otorga el consentimiento del administrador.

## Limitaciones conocidas

### Tiempos de espera de webhooks

Teams entrega mensajes a través de un webhook HTTP. Si el procesamiento tarda demasiado (por ejemplo, respuestas lentas de LLM), es posible que veas:

- Tiempos de espera de la puerta de enlace
- Teams reintentando el mensaje (causando duplicados)
- Respuestas perdidas

OpenClaw maneja esto retornando rápidamente y enviando respuestas de manera proactiva, pero las respuestas muy lentas aún pueden causar problemas.

### Formato

El markdown de Teams es más limitado que el de Slack o Discord:

- El formato básico funciona: **negrita**, _cursiva_, `code`, enlaces
- El markdown complejo (tablas, listas anidadas) puede no renderizarse correctamente
- Las Tarjetas Adaptativas son compatibles con encuestas y envíos de tarjetas arbitrarios (ver a continuación)

## Configuración

Configuración clave (ver `/gateway/configuration` para patrones de canal compartido):

- `channels.msteams.enabled`: habilitar/deshabilitar el canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: credenciales del bot.
- `channels.msteams.webhook.port` (predeterminado `3978`)
- `channels.msteams.webhook.path` (predeterminado `/api/messages`)
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento)
- `channels.msteams.allowFrom`: lista de permitidos de DM (se recomiendan los IDs de objetos de AAD). El asistente resuelve los nombres a IDs durante la configuración cuando el acceso a Graph está disponible.
- `channels.msteams.dangerouslyAllowNameMatching`: interruptor de emergencia para volver a habilitar la coincidencia mutable de UPN/nombre para mostrar y el enrutamiento directo por nombre de equipo/canal.
- `channels.msteams.textChunkLimit`: tamaño del fragmento de texto saliente.
- `channels.msteams.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes del fragmentado por longitud.
- `channels.msteams.mediaAllowHosts`: lista de permitidos para hosts de archivos adjuntos entrantes (por defecto dominios de Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts`: lista de permitidos para adjuntar encabezados de autorización en reintentos de medios (por defecto hosts de Graph + Bot Framework).
- `channels.msteams.requireMention`: requerir @mención en canales/grupos (por defecto true).
- `channels.msteams.replyStyle`: `thread | top-level` (consulte [Reply Style](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle`: anulación por equipo.
- `channels.msteams.teams.<teamId>.requireMention`: anulación por equipo.
- `channels.msteams.teams.<teamId>.tools`: anulaciones de políticas de herramientas por equipo predeterminadas (`allow`/`deny`/`alsoAllow`) que se usan cuando falta una anulación de canal.
- `channels.msteams.teams.<teamId>.toolsBySender`: anulaciones de políticas de herramientas por remitente por equipo predeterminadas (se admite el comodín `"*"`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`: anulaciones de políticas de herramientas por canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`: anulaciones de políticas de herramientas por remitente por canal (se admite el comodín `"*"`).
- Las claves `toolsBySender` deben usar prefijos explícitos:
  `id:`, `e164:`, `username:`, `name:` (las claves heredadas sin prefijo todavía se asignan solo a `id:`).
- `channels.msteams.actions.memberInfo`: habilitar o deshabilitar la acción de información de miembros respaldada por Graph (por defecto: habilitado cuando las credenciales de Graph están disponibles).
- `channels.msteams.sharePointSiteId`: ID del sitio de SharePoint para cargar archivos en chats grupales/canales (consulte [Sending files in group chats](#sending-files-in-group-chats)).

## Enrutamiento y Sesiones

- Las claves de sesión siguen el formato estándar de agente (consulte [/concepts/session](/en/concepts/session)):
  - Los mensajes directos comparten la sesión principal (`agent:<agentId>:<mainKey>`).
  - Los mensajes de canal/grupo usan el id de conversación:
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Estilo de respuesta: Hilos vs. Publicaciones

Teams introdujo recientemente dos estilos de interfaz de usuario de canal sobre el mismo modelo de datos subyacente:

| Estilo                      | Descripción                                                       | Recomendado `replyStyle`  |
| --------------------------- | ----------------------------------------------------------------- | ------------------------- |
| **Publicaciones** (clásico) | Los mensajes aparecen como tarjetas con respuestas en hilo debajo | `thread` (predeterminado) |
| **Hilos** (estilo Slack)    | Los mensajes fluyen linealmente, más parecido a Slack             | `top-level`               |

**El problema:** La API de Teams no expone qué estilo de interfaz de usuario utiliza un canal. Si usas el `replyStyle` incorrecto:

- `thread` en un canal estilo Hilos → las respuestas aparecen anidadas de manera incómoda
- `top-level` en un canal estilo Publicaciones → las respuestas aparecen como publicaciones de nivel superior separadas en lugar de en el hilo

**Solución:** Configura `replyStyle` por canal según cómo esté configurado el canal:

```json5
{
  channels: {
    msteams: {
      replyStyle: "thread",
      teams: {
        "19:abc...@thread.tacv2": {
          channels: {
            "19:xyz...@thread.tacv2": {
              replyStyle: "top-level",
            },
          },
        },
      },
    },
  },
}
```

## Archivos adjuntos e imágenes

**Limitaciones actuales:**

- **Mensajes directos (MDs):** Las imágenes y los archivos adjuntos funcionan a través de las API de archivos de bot de Teams.
- **Canales/grupos:** Los archivos adjuntos residen en el almacenamiento de M365 (SharePoint/OneDrive). El payload del webhook solo incluye un código auxiliar HTML, no los bytes reales del archivo. **Se requieren permisos de la API de Graph** para descargar archivos adjuntos del canal.
- Para envíos explícitos de archivo primero, usa `action=upload-file` con `media` / `filePath` / `path`; el `message` opcional se convierte en el texto/comentario adjunto, y `filename` anula el nombre cargado.

Sin permisos de Graph, los mensajes del canal con imágenes se recibirán como solo texto (el contenido de la imagen no es accesible para el bot).
De forma predeterminada, OpenClaw solo descarga medios de nombres de host de Microsoft/Teams. Anula esto con `channels.msteams.mediaAllowHosts` (usa `["*"]` para permitir cualquier host).
Los encabezados de autorización solo se adjuntan para hosts en `channels.msteams.mediaAuthAllowHosts` (predeterminado: hosts de Graph + Bot Framework). Mantén esta lista estricta (evita sufijos multiinquilino).

## Envío de archivos en chats grupales

Los bots pueden enviar archivos en MD usando el flujo FileConsentCard (integrado). Sin embargo, **el envío de archivos en chats de grupo/canales** requiere una configuración adicional:

| Contexto                          | Cómo se envían los archivos                  | Configuración necesaria                         |
| --------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| **MD**                            | FileConsentCard → usuario acepta → bot carga | Funciona de fábrica                             |
| **Chats de grupo/canales**        | Cargar a SharePoint → compartir enlace       | Requiere `sharePointSiteId` + permisos de Graph |
| **Imágenes (cualquier contexto)** | Codificadas en Base64 en línea               | Funciona de fábrica                             |

### Por qué los chats de grupo necesitan SharePoint

Los bots no tienen una unidad personal de OneDrive (el punto final de la API de Graph `/me/drive` no funciona para identidades de aplicación). Para enviar archivos en chats de grupo/canales, el bot los carga en un **sitio de SharePoint** y crea un enlace para compartir.

### Configuración

1. **Añadir permisos de la API de Graph** en Entra ID (Azure AD) → Registro de aplicación:
   - `Sites.ReadWrite.All` (Aplicación) - cargar archivos en SharePoint
   - `Chat.Read.All` (Aplicación) - opcional, habilita enlaces para compartir por usuario

2. **Conceder consentimiento de administrador** para el inquilino.

3. **Obtenga su ID de sitio de SharePoint:**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **Configurar OpenClaw:**

   ```json5
   {
     channels: {
       msteams: {
         // ... other config ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2",
       },
     },
   }
   ```

### Comportamiento para compartir

| Permiso                                 | Comportamiento para compartir                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Solo `Sites.ReadWrite.All`              | Enlace para compartir en toda la organización (cualquiera en la organización puede acceder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Enlace para compartir por usuario (solo los miembros del chat pueden acceder)               |

El uso compartido por usuario es más seguro, ya que solo los participantes del chat pueden acceder al archivo. Si falta el permiso `Chat.Read.All`, el bot recurre al uso compartido en toda la organización.

### Comportamiento de reserva

| Escenario                                                | Resultado                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| Chat de grupo + archivo + `sharePointSiteId` configurado | Cargar en SharePoint, enviar enlace para compartir            |
| Chat de grupo + archivo + sin `sharePointSiteId`         | Intentar cargar en OneDrive (puede fallar), enviar solo texto |
| Chat personal + archivo                                  | Flujo FileConsentCard (funciona sin SharePoint)               |
| Cualquier contexto + imagen                              | Codificado en Base64 en línea (funciona sin SharePoint)       |

### Ubicación de almacenamiento de archivos

Los archivos cargados se almacenan en una carpeta `/OpenClawShared/` en la biblioteca de documentos predeterminada del sitio de SharePoint configurado.

## Encuestas (Adaptive Cards)

OpenClaw envía encuestas de Teams como Adaptive Cards (no hay una API de encuestas nativa de Teams).

- CLI: `openclaw message poll --channel msteams --target conversation:<id> ...`
- Los votos son registrados por la puerta de enlace en `~/.openclaw/msteams-polls.json`.
- La puerta de enlace debe permanecer en línea para registrar los votos.
- Las encuestas aún no publican resúmenes de resultados automáticamente (inspeccione el archivo de almacenamiento si es necesario).

## Tarjetas adaptables (arbitrarias)

Envíe cualquier JSON de Tarjeta Adaptable a usuarios o conversaciones de Teams usando la herramienta `message` o la CLI.

El parámetro `card` acepta un objeto JSON de Tarjeta Adaptable. Cuando se proporciona `card`, el texto del mensaje es opcional.

**Herramienta de agente:**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello!" }],
  },
}
```

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

Consulte la [documentación de Tarjetas Adaptables](https://adaptivecards.io/) para obtener el esquema y ejemplos de tarjetas. Para obtener detalles sobre los formatos de destino, consulte [Formatos de destino](#target-formats) a continuación.

## Formatos de destino

Los destinos de MSTeams utilizan prefijos para distinguir entre usuarios y conversaciones:

| Tipo de destino           | Formato                          | Ejemplo                                             |
| ------------------------- | -------------------------------- | --------------------------------------------------- |
| Usuario (por ID)          | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| Usuario (por nombre)      | `user:<display-name>`            | `user:John Smith` (requiere Graph API)              |
| Grupo/canal               | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| Grupo/canal (sin formato) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (si contiene `@thread`) |

**Ejemplos de CLI:**

```bash
# Send to a user by ID
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# Send to a user by display name (triggers Graph API lookup)
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# Send to a group chat or channel
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# Send an Adaptive Card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
```

**Ejemplos de herramientas de agente:**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:John Smith",
  message: "Hello!",
}
```

```json5
{
  action: "send",
  channel: "msteams",
  target: "conversation:19:abc...@thread.tacv2",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello" }],
  },
}
```

Nota: Sin el prefijo `user:`, los nombres se resuelven por defecto a grupo/equipo. Use siempre `user:` cuando apunte a personas por nombre para mostrar.

## Mensajería proactiva

- Los mensajes proactivos solo son posibles **después** de que un usuario haya interactuado, ya que almacenamos las referencias de conversación en ese momento.
- Consulte `/gateway/configuration` para obtener `dmPolicy` y el control de lista de permitidos.

## IDs de Equipo y Canal (Problema común)

El parámetro de consulta `groupId` en las URL de Teams **NO** es el ID de equipo utilizado para la configuración. Extraiga los IDs de la ruta de la URL en su lugar:

**URL del equipo:**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**URL del canal:**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Para la configuración:**

- ID de equipo = segmento de ruta después de `/team/` (decodificado por URL, p. ej., `19:Bk4j...@thread.tacv2`)
- ID de canal = segmento de ruta después de `/channel/` (decodificado por URL)
- **Ignore** el parámetro de consulta `groupId`

## Canales privados

Los bots tienen compatibilidad limitada en canales privados:

| Característica                    | Canales estándar | Canales privados                      |
| --------------------------------- | ---------------- | ------------------------------------- |
| Instalación del bot               | Sí               | Limitada                              |
| Mensajes en tiempo real (webhook) | Sí               | Puede no funcionar                    |
| Permisos RSC                      | Sí               | Puede comportarse de manera diferente |
| @menciones                        | Sí               | Si el bot es accesible                |
| Historial de la API de Graph      | Sí               | Sí (con permisos)                     |

**Soluciones alternativas si los canales privados no funcionan:**

1. Use canales estándar para las interacciones con el bot
2. Use MD: los usuarios siempre pueden enviar mensajes directamente al bot
3. Use la API de Graph para el acceso histórico (requiere `ChannelMessage.Read.All`)

## Solución de problemas

### Problemas comunes

- **Las imágenes no se muestran en los canales:** Faltan permisos de Graph o el consentimiento del administrador. Reinstale la aplicación de Teams y cierre/abra Teams por completo.
- **Sin respuestas en el canal:** se requieren menciones de forma predeterminada; configure `channels.msteams.requireMention=false` o configure por equipo/canal.
- **Discrepancia de versión (Teams aún muestra el manifiesto antiguo):** elimine + vuelva a agregar la aplicación y cierre Teams por completo para actualizar.
- **401 No autorizado desde el webhook:** Se espera al probar manualmente sin el JWT de Azure; significa que el punto de conexión es accesible pero falló la autenticación. Use Azure Web Chat para probar correctamente.

### Errores al cargar el manifiesto

- **"El archivo de icono no puede estar vacío":** El manifiesto hace referencia a archivos de icono que tienen 0 bytes. Cree iconos PNG válidos (32x32 para `outline.png`, 192x192 para `color.png`).
- **"webApplicationInfo.Id ya está en uso":** La aplicación todavía está instalada en otro equipo/chat. Busque y desinstálela primero, o espere 5-10 minutos para la propagación.
- **"Algo salió mal" al cargar:** Cargue a través de [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) en su lugar, abra las DevTools del navegador (F12) → pestaña Red, y verifique el cuerpo de la respuesta para ver el error real.
- **Error al cargar (sideload):** Intente "Cargar una aplicación en el catálogo de aplicaciones de su organización" en lugar de "Cargar una aplicación personalizada": esto a menudo omite las restricciones de carga.

### Los permisos RSC no funcionan

1. Verifique que `webApplicationInfo.id` coincida exactamente con el ID de Aplicación de su bot
2. Vuelva a cargar la aplicación y reinstálela en el equipo/chat
3. Compruebe si su administrador de la organización ha bloqueado los permisos RSC
4. Confirme que está usando el ámbito correcto: `ChannelMessage.Read.Group` para equipos, `ChatMessage.Read.Chat` para chats de grupo

## Referencias

- [Crear Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guía de configuración de Azure Bot
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - crear/administrar aplicaciones de Teams
- [Esquema de manifiesto de la aplicación de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recibir mensajes de canal con RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Referencia de permisos RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Manejo de archivos del bot de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/grupo requiere Graph)
- [Mensajería proactiva](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## Relacionado

- [Resumen de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — autenticación y flujo de emparejamiento de MD
- [Grupos](/en/channels/groups) — comportamiento del chat de grupos y control de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
