---
summary: "Estado de soporte, capacidades y configuración del bot de Microsoft Teams"
read_when:
  - Trabajar en las características del canal de MS Teams
title: "Microsoft Teams"
---

# Microsoft Teams (plugin)

> "Abandonad toda esperanza, los que entráis aquí."

Actualizado: 2026-01-21

Estado: se admiten texto + archivos adjuntos de DM; el envío de archivos a canales/grupos requiere `sharePointSiteId` + permisos de Graph (consulte [Sending files in group chats](#sending-files-in-group-chats)). Las encuestas se envían mediante Adaptive Cards.

## Plugin requerido

Microsoft Teams se distribuye como un plugin y no se incluye en la instalación principal.

**Cambio importante (2026.1.15):** MS Teams se ha movido fuera del núcleo. Si lo usas, debes instalar el plugin.

Explicación: mantiene las instalaciones principales más ligeras y permite que las dependencias de MS Teams se actualicen de forma independiente.

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/msteams
```

Descarga local (al ejecutar desde un repositorio git):

```bash
openclaw plugins install ./extensions/msteams
```

Si elige Teams durante la configuración y se detecta una comprobación de git,
OpenClaw ofrecerá automáticamente la ruta de instalación local.

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida (principiante)

1. Instala el plugin de Microsoft Teams.
2. Crea un **Azure Bot** (App ID + secreto de cliente + ID de inquilino).
3. Configura OpenClaw con esas credenciales.
4. Exponga `/api/messages` (puerto 3978 de forma predeterminada) a través de una URL pública o túnel.
5. Instala el paquete de la aplicación de Teams e inicia la puerta de enlace.

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

- Hablar con OpenClaw a través de MDs de Teams, chats de grupo o canales.
- Mantener el enrutamiento determinista: las respuestas siempre vuelven al canal por el que llegaron.
- De forma predeterminada, comportarse de forma segura en el canal (se requieren menciones a menos que se configure lo contrario).

## Escrituras de configuración

De forma predeterminada, se permite a Microsoft Teams escribir actualizaciones de configuración activadas por `/config set|unset` (requiere `commands.config: true`).

Desactivar con:

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## Control de acceso (MDs + grupos)

**Acceso a MDs**

- Predeterminado: `channels.msteams.dmPolicy = "pairing"`. Los remitentes desconocidos se ignoran hasta que se aprueben.
- `channels.msteams.allowFrom` debe usar IDs de objeto AAD estables.
- Los UPN/nombres para mostrar son mutables; la coincidencia directa está deshabilitada de forma predeterminada y solo se habilita con `channels.msteams.dangerouslyAllowNameMatching: true`.
- El asistente puede resolver nombres a ID a través de Microsoft Graph cuando las credenciales lo permiten.

**Acceso de grupo**

- Predeterminado: `channels.msteams.groupPolicy = "allowlist"` (bloqueado a menos que agregue `groupAllowFrom`). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté establecido.
- `channels.msteams.groupAllowFrom` controla qué remitentes pueden activar en chats grupales/canales (recurra a `channels.msteams.allowFrom`).
- Establezca `groupPolicy: "open"` para permitir cualquier miembro (aún restringido por mención de forma predeterminada).
- Para no permitir **ningún canal**, establezca `channels.msteams.groupPolicy: "disabled"`.

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

- Alcance las respuestas grupales/de canal enumerando equipos y canales en `channels.msteams.teams`.
- Las claves deben usar ID de equipo estables e ID de conversación de canal.
- Cuando `groupPolicy="allowlist"` y hay una lista de permitidos de equipos presente, solo se aceptan los equipos/canales listados (restringido por mención).
- El asistente de configuración acepta entradas `Team/Channel` y las almacena por usted.
- Al iniciarse, OpenClaw resuelve los nombres de permitidos de equipos/canales y usuarios a ID (cuando los permisos de Graph lo permiten)
  y registra la asignación; los nombres de equipos/canales no resueltos se mantienen tal como se escribieron, pero se ignoran para el enrutamiento de forma predeterminada a menos que `channels.msteams.dangerouslyAllowNameMatching: true` esté habilitado.

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

1. Instala el complemento de Microsoft Teams.
2. Crea un **Azure Bot** (ID de aplicación + secreto + ID de inquilino).
3. Compila un **paquete de aplicación de Teams** que haga referencia al bot e incluya los permisos RSC a continuación.
4. Carga/instala la aplicación de Teams en un equipo (o ámbito personal para MDs).
5. Configure `msteams` en `~/.openclaw/openclaw.json` (o variables de entorno) e inicie la puerta de enlace.
6. La puerta de enlace escucha el tráfico del webhook de Bot Framework en `/api/messages` de forma predeterminada.

## Configuración de Azure Bot (Requisitos previos)

Antes de configurar OpenClaw, necesitas crear un recurso de Azure Bot.

### Paso 1: Crear Azure Bot

1. Vaya a [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Rellena la pestaña **Conceptos básicos**:

   | Campo                     | Valor                                                            |
   | ------------------------- | ---------------------------------------------------------------- |
   | **Identificador del bot** | El nombre de su bot, p. ej., `openclaw-msteams` (debe ser único) |
   | **Suscripción**           | Selecciona tu suscripción de Azure                               |
   | **Grupo de recursos**     | Crear nuevo o usar existente                                     |
   | **Plan de precios**       | **Gratis** para desarrollo/pruebas                               |
   | **Tipo de aplicación**    | **Inquilino único** (recomendado - ver nota abajo)               |
   | **Tipo de creación**      | **Crear nuevo id. de aplicación de Microsoft**                   |

> **Aviso de obsolescencia:** La creación de nuevos bots de varios inquilinos quedó obsoleta después del 31-07-2025. Use **Inquilino único** para nuevos bots.

3. Haga clic en **Revisar + crear** → **Crear** (espere ~1-2 minutos)

### Paso 2: Obtener credenciales

1. Vaya a su recurso de Azure Bot → **Configuración**
2. Copie **Microsoft App ID** → este es su `appId`
3. Haga clic en **Administrar contraseña** → vaya al Registro de la aplicación
4. En **Certificates & secrets** → **New client secret** → copie el **Value** → este es su `appPassword`
5. Vaya a **Overview** → copie **Directory (tenant) ID** → este es su `tenantId`

### Paso 3: Configurar el punto de conexión de mensajería

1. En Azure Bot → **Configuración**
2. Establezca el **Punto de conexión de mensajería** en la URL de su webhook:
   - Producción: `https://your-domain.com/api/messages`
   - Desarrollo local: Use un túnel (consulte [Local Development](#local-development-tunneling) a continuación)

### Paso 4: Habilitar el canal de Teams

1. En Azure Bot → **Canales**
2. Haga clic en **Microsoft Teams** → Configurar → Guardar
3. Acepte los Términos de servicio

## Desarrollo local (Túneles)

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

## Portal para desarrolladores de Teams (Alternativo)

En lugar de crear manualmente un archivo ZIP de manifiesto, puede usar el [Teams Developer Portal](https://dev.teams.microsoft.com/apps):

1. Haga clic en **+ Nueva aplicación**
2. Rellene la información básica (nombre, descripción, información del desarrollador)
3. Vaya a **Características de la aplicación** → **Bot**
4. Seleccione **Escribir un id. de bot manualmente** y pegue su id. de aplicación de Azure Bot
5. Marque los ámbitos: **Personal**, **Equipo**, **Chat de grupo**
6. Haga clic en **Distribuir** → **Descargar paquete de aplicación**
7. En Teams: **Aplicaciones** → **Administrar sus aplicaciones** → **Cargar una aplicación personalizada** → seleccione el ZIP

Esto suele ser más fácil que editar manifiestos JSON a mano.

## Probar el bot

**Opción A: Azure Web Chat (verifique primero el webhook)**

1. En Azure Portal → su recurso de Azure Bot → **Probar en Web Chat**
2. Envíe un mensaje: debería ver una respuesta
3. Esto confirma que su punto de conexión de webhook funciona antes de la configuración de Teams

**Opción B: Teams (después de la instalación de la aplicación)**

1. Instale la aplicación de Teams (carga lateral o catálogo de la organización)
2. Busque el bot en Teams y envíe un MD
3. Revise los registros de la puerta de enlace para detectar actividad entrante

## Configuración (mínima, solo texto)

1. **Instale el complemento de Microsoft Teams**
   - Desde npm: `openclaw plugins install @openclaw/msteams`
   - Desde una copia local: `openclaw plugins install ./extensions/msteams`

2. **Registro del bot**
   - Cree un Azure Bot (ver arriba) y anote:
     - ID de aplicación
     - Secreto de cliente (contraseña de la aplicación)
     - ID de inquilino (single-tenant)

3. **Manifiesto de la aplicación de Teams**
   - Incluya una entrada `bot` con `botId = <App ID>`.
   - Ámbitos: `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (necesario para el manejo de archivos en el ámbito personal).
   - Agregue permisos RSC (abajo).
   - Cree iconos: `outline.png` (32x32) y `color.png` (192x192).
   - Comprima los tres archivos juntos: `manifest.json`, `outline.png`, `color.png`.

4. **Configurar OpenClaw**

   ```json
   {
     "msteams": {
       "enabled": true,
       "appId": "<APP_ID>",
       "appPassword": "<APP_PASSWORD>",
       "tenantId": "<TENANT_ID>",
       "webhook": { "port": 3978, "path": "/api/messages" }
     }
   }
   ```

   También puede usar variables de entorno en lugar de claves de configuración:
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Punto de conexión del bot**
   - Establezca el punto de conexión de mensajería del Azure Bot en:
     - `https://<host>:3978/api/messages` (o su ruta/puerto elegido).

6. **Ejecutar la puerta de enlace**
   - El canal de Teams se inicia automáticamente cuando se instala el complemento y existe la configuración `msteams` con las credenciales.

## Contexto del historial

- `channels.msteams.historyLimit` controla cuántos mensajes recientes de canal/grupo se incluyen en el aviso.
- Recurre a `messages.groupChat.historyLimit`. Establezca `0` para desactivar (por defecto 50).
- El historial de MD se puede limitar con `channels.msteams.dmHistoryLimit` (turnos de usuario). Excepciones por usuario: `channels.msteams.dms["<user_id>"].historyLimit`.

## Permisos RSC actuales de Teams (Manifiesto)

Estos son los **permisos resourceSpecific existentes** en el manifiesto de nuestra aplicación de Teams. Solo se aplican dentro del equipo/chat donde la aplicación está instalada.

**Para canales (ámbito de equipo):**

- `ChannelMessage.Read.Group` (Application) - recibir todos los mensajes del canal sin @mención
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Para chats de grupo:**

- `ChatMessage.Read.Chat` (Application) - recibir todos los mensajes de chat de grupo sin @mención

## Manifiesto de Teams de ejemplo (censurado)

Ejemplo mínimo y válido con los campos obligatorios. Reemplace los identificadores y las URL.

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  "manifestVersion": "1.23",
  "version": "1.0.0",
  "id": "00000000-0000-0000-0000-000000000000",
  "name": { "short": "OpenClaw" },
  "developer": {
    "name": "Your Org",
    "websiteUrl": "https://example.com",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "description": { "short": "OpenClaw in Teams", "full": "OpenClaw in Teams" },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#5B6DEF",
  "bots": [
    {
      "botId": "11111111-1111-1111-1111-111111111111",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": true
    }
  ],
  "webApplicationInfo": {
    "id": "11111111-1111-1111-1111-111111111111"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "ChannelMessage.Read.Group", "type": "Application" },
        { "name": "ChannelMessage.Send.Group", "type": "Application" },
        { "name": "Member.Read.Group", "type": "Application" },
        { "name": "Owner.Read.Group", "type": "Application" },
        { "name": "ChannelSettings.Read.Group", "type": "Application" },
        { "name": "TeamMember.Read.Group", "type": "Application" },
        { "name": "TeamSettings.Read.Group", "type": "Application" },
        { "name": "ChatMessage.Read.Chat", "type": "Application" }
      ]
    }
  }
}
```

### Advertencias del manifiesto (campos obligatorios)

- `bots[].botId` **debe** coincidir con el ID de la aplicación Azure Bot.
- `webApplicationInfo.id` **debe** coincidir con el ID de la aplicación Azure Bot.
- `bots[].scopes` debe incluir las superficies que planea usar (`personal`, `team`, `groupChat`).
- Se requiere `bots[].supportsFiles: true` para el manejo de archivos en el ámbito personal.
- `authorization.permissions.resourceSpecific` debe incluir lectura/escritura de canal si desea tráfico de canal.

### Actualización de una aplicación existente

Para actualizar una aplicación de Teams ya instalada (por ejemplo, para agregar permisos RSC):

1. Actualice su `manifest.json` con la nueva configuración
2. **Incremente el campo `version`** (p. ej., `1.0.0` → `1.1.0`)
3. **Vuelva a comprimir** el manifiesto con los iconos (`manifest.json`, `outline.png`, `color.png`)
4. Cargue el nuevo archivo zip:
   - **Opción A (Centro de administración de Teams):** Centro de administración de Teams → Aplicaciones de Teams → Administrar aplicaciones → busque su aplicación → Cargar nueva versión
   - **Opción B (Carga lateral):** En Teams → Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación personalizada
5. **Para canales de equipo:** Vuelva a instalar la aplicación en cada equipo para que los nuevos permisos surtan efecto
6. **Cierre y vuelva a abrir Teams por completo** (no solo cierre la ventana) para borrar los metadatos de la aplicación en caché

## Capacidades: solo RSC frente a Graph

### Con **solo RSC de Teams** (aplicación instalada, sin permisos de Graph API)

Funciona:

- Leer el contenido **de texto** del mensaje del canal.
- Enviar contenido **de texto** del mensaje del canal.
- Recibir archivos adjuntos **personales (MD)**.

NO funciona:

- Contenido **de imágenes o archivos** de canal/grupo (la carga útil solo incluye un código auxiliar HTML).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes (más allá del evento de webhook en vivo).

### Con **RSC de Teams + permisos de aplicación de Microsoft Graph**

Añade:

- Descargar contenidos alojados (imágenes pegadas en los mensajes).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes de canal/chat a través de Graph.

### RSC vs Graph API

| Capacidad                        | Permisos RSC                     | Graph API                                                 |
| -------------------------------- | -------------------------------- | --------------------------------------------------------- |
| **Mensajes en tiempo real**      | Sí (vía webhook)                 | No (solo sondeo)                                          |
| **Mensajes históricos**          | No                               | Sí (puede consultar el historial)                         |
| **Complejidad de configuración** | Solo manifiesto de la aplicación | Requiere consentimiento de administrador + flujo de token |
| **Funciona sin conexión**        | No (debe estar ejecutándose)     | Sí (consultar en cualquier momento)                       |

**En resumen:** RSC es para la escucha en tiempo real; Graph API es para el acceso histórico. Para ponerse al día con los mensajes perdidos mientras está desconectado, necesita Graph API con `ChannelMessage.Read.All` (requiere consentimiento del administrador).

## Medios e historial habilitados para Graph (necesario para canales)

Si necesitas imágenes/archivos en **canales** o deseas obtener el **historial de mensajes**, debes habilitar los permisos de Microsoft Graph y otorgar el consentimiento del administrador.

1. En Entra ID (Azure AD) **App Registration**, agregue **Application permissions** de Microsoft Graph:
   - `ChannelMessage.Read.All` (adjuntos de canal + historial)
   - `Chat.Read.All` o `ChatMessage.Read.All` (chats de grupo)
2. **Otorgar consentimiento de administrador** para el inquilino.
3. Aumente la **manifest version** de la aplicación de Teams, vuelva a cargarla y **reinstale la aplicación en Teams**.
4. **Cierre y reinicie Teams por completo** para borrar los metadatos de la aplicación en caché.

**Permiso adicional para menciones de usuario:** Las @menciones de usuario funcionan de fábrica para los usuarios en la conversación. Sin embargo, si desea buscar y mencionar dinámicamente usuarios que **no están en la conversación actual**, agregue el permiso `User.Read.All` (Aplicación) y otorgue el consentimiento del administrador.

## Limitaciones conocidas

### Tiempo de espera de webhooks

Teams entrega mensajes a través de un webhook HTTP. Si el procesamiento tarda demasiado (p. ej., respuestas lentas de LLM), es posible que vea:

- Tiempos de espera de la puerta de enlace
- Teams reintentando el mensaje (causando duplicados)
- Respuestas perdidas

OpenClaw maneja esto devolviendo rápidamente y enviando respuestas de manera proactiva, pero las respuestas muy lentas aún pueden causar problemas.

### Formato

El formato de Markdown de Teams es más limitado que el de Slack o Discord:

- El formato básico funciona: **negrita**, _cursiva_, `code`, enlaces
- El formato complejo (tablas, listas anidadas) puede no renderizarse correctamente
- Las tarjetas adaptables (Adaptive Cards) son compatibles para encuestas y envíos de tarjetas arbitrarios (ver a continuación)

## Configuración

Configuración clave (ver `/gateway/configuration` para patrones de canales compartidos):

- `channels.msteams.enabled`: habilitar/deshabilitar el canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: credenciales del bot.
- `channels.msteams.webhook.port` (predeterminado `3978`)
- `channels.msteams.webhook.path` (predeterminado `/api/messages`)
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento)
- `channels.msteams.allowFrom`: lista de permitidos para MD (se recomiendan los ID de objeto de AAD). El asistente resuelve los nombres a los ID durante la configuración cuando el acceso a Graph está disponible.
- `channels.msteams.dangerouslyAllowNameMatching`: interruptor de emergencia para volver a habilitar la coincidencia mutable de UPN/nombre para mostrar y el enrutamiento directo por nombre de equipo/canal.
- `channels.msteams.textChunkLimit`: tamaño del fragmento de texto saliente.
- `channels.msteams.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.msteams.mediaAllowHosts`: lista de permitidos para hosts de archivos adjuntos entrantes (predeterminado: dominios de Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts`: lista de permitidos para adjuntar encabezados de autorización en reintentos de medios (predeterminado: hosts de Graph + Bot Framework).
- `channels.msteams.requireMention`: requerir @mención en canales/grupos (predeterminado verdadero).
- `channels.msteams.replyStyle`: `thread | top-level` (ver [Estilo de respuesta](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle`: anulación por equipo.
- `channels.msteams.teams.<teamId>.requireMention`: anulación por equipo.
- `channels.msteams.teams.<teamId>.tools`: anulaciones predeterminadas de la política de herramientas por equipo (`allow`/`deny`/`alsoAllow`) que se usan cuando falta una anulación de canal.
- `channels.msteams.teams.<teamId>.toolsBySender`: anulaciones predeterminadas de la política de herramientas por equipo y por remitente (se admite el comodín `"*"`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`: anulaciones de la política de herramientas por canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`: anulaciones de la política de herramientas por canal y por remitente (se admite el comodín `"*"`).
- Las claves `toolsBySender` deben usar prefijos explícitos:
  `id:`, `e164:`, `username:`, `name:` (las claves heredadas sin prefijo todavía se asignan solo a `id:`).
- `channels.msteams.sharePointSiteId`: ID del sitio de SharePoint para cargar archivos en chats grupales/canales (consulte [Sending files in group chats](#sending-files-in-group-chats)).

## Enrutamiento y Sesiones

- Las claves de sesión siguen el formato de agente estándar (consulte [/concepts/session](/es/concepts/session)):
  - Los mensajes directos comparten la sesión principal (`agent:<agentId>:<mainKey>`).
  - Los mensajes de canal/grupo usan el ID de conversación:
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Estilo de respuesta: Hilos vs. Publicaciones

Teams introdujo recientemente dos estilos de interfaz de usuario de canal sobre el mismo modelo de datos subyacente:

| Estilo                      | Descripción                                                       | `replyStyle` recomendada  |
| --------------------------- | ----------------------------------------------------------------- | ------------------------- |
| **Publicaciones** (clásico) | Los mensajes aparecen como tarjetas con respuestas en hilo debajo | `thread` (predeterminado) |
| **Hilos** (estilo Slack)    | Los mensajes fluyen linealmente, más como en Slack                | `top-level`               |

**El problema:** La API de Teams no expone qué estilo de interfaz de usuario usa un canal. Si usa el `replyStyle` incorrecto:

- `thread` en un canal de estilo Hilos → las respuestas aparecen anidadas de forma incómoda
- `top-level` en un canal de estilo Publicaciones → las respuestas aparecen como publicaciones de nivel superior separadas en lugar de en el hilo

**Solución:** Configure `replyStyle` por canal según cómo esté configurado el canal:

```json
{
  "msteams": {
    "replyStyle": "thread",
    "teams": {
      "19:abc...@thread.tacv2": {
        "channels": {
          "19:xyz...@thread.tacv2": {
            "replyStyle": "top-level"
          }
        }
      }
    }
  }
}
```

## Archivos adjuntos e Imágenes

**Limitaciones actuales:**

- **MDs:** Las imágenes y los archivos adjuntos funcionan a través de las API de archivos de bot de Teams.
- **Canales/grupos:** Los archivos adjuntos residen en el almacenamiento de M365 (SharePoint/OneDrive). El payload del webhook solo incluye un código auxiliar HTML, no los bytes reales del archivo. **Se requieren permisos de la API de Graph** para descargar los archivos adjuntos de los canales.

Sin permisos de Graph, los mensajes de canal con imágenes se recibirán como solo texto (el contenido de la imagen no es accesible para el bot).
De forma predeterminada, OpenClaw solo descarga medios de nombres de host de Microsoft/Teams. Invalide esto con `channels.msteams.mediaAllowHosts` (use `["*"]` para permitir cualquier host).
Los encabezados de autorización solo se adjuntan para los hosts en `channels.msteams.mediaAuthAllowHosts` (de manera predeterminada, hosts de Graph + Bot Framework). Mantenga esta lista estricta (evite sufijos multiinquilino).

## Envío de archivos en chats de grupo

Los bots pueden enviar archivos en mensajes directos (DM) usando el flujo FileConsentCard (integrado). Sin embargo, **el envío de archivos en chats de grupo/canales** requiere una configuración adicional:

| Contexto                          | Cómo se envían los archivos                 | Configuración necesaria                         |
| --------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| **Mensajes directos**             | FileConsentCard → usuario acepta → bot sube | Funciona de serie                               |
| **Chats de grupo/canales**        | Subir a SharePoint → compartir enlace       | Requiere `sharePointSiteId` + permisos de Graph |
| **Imágenes (cualquier contexto)** | Codificadas en Base64 en línea              | Funciona de serie                               |

### Por qué los chats de grupo necesitan SharePoint

Los bots no tienen una unidad personal de OneDrive (el punto de conexión de la API de Graph `/me/drive` no funciona para identidades de aplicación). Para enviar archivos en chats grupales/canales, el bot los carga en un **sitio de SharePoint** y crea un enlace para compartir.

### Configuración

1. **Añada permisos de la API de Graph** en Entra ID (Azure AD) → Registro de aplicaciones:
   - `Sites.ReadWrite.All` (Aplicación) - cargar archivos en SharePoint
   - `Chat.Read.All` (Aplicación) - opcional, habilita enlaces para compartir por usuario

2. **Conceda el consentimiento del administrador** para el inquilino.

3. **Obtenga el ID de su sitio de SharePoint:**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **Configure OpenClaw:**

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

### Comportamiento de uso compartido

| Permiso                                 | Comportamiento de uso compartido                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Solo `Sites.ReadWrite.All`              | Enlace para compartir en toda la organización (cualquiera en la organización puede acceder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Enlace para compartir por usuario (solo los miembros del chat pueden acceder)               |

El uso compartido por usuario es más seguro, ya que solo los participantes del chat pueden acceder al archivo. Si falta el permiso `Chat.Read.All`, el bot vuelve al uso compartido en toda la organización.

### Comportamiento de reserva

| Escenario                                              | Resultado                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Chat grupal + archivo + `sharePointSiteId` configurado | Cargar en SharePoint, enviar enlace para compartir            |
| Chat grupal + archivo + sin `sharePointSiteId`         | Intentar cargar en OneDrive (puede fallar), enviar solo texto |
| Chat personal + archivo                                | Flujo de FileConsentCard (funciona sin SharePoint)            |
| Cualquier contexto + imagen                            | Codificado en Base64 en línea (funciona sin SharePoint)       |

### Ubicación de almacenamiento de archivos

Los archivos cargados se almacenan en una carpeta `/OpenClawShared/` en la biblioteca de documentos predeterminada del sitio de SharePoint configurado.

## Encuestas (Adaptive Cards)

OpenClaw envía encuestas de Teams como Adaptive Cards (no hay una API de encuestas nativa de Teams).

- CLI: `openclaw message poll --channel msteams --target conversation:<id> ...`
- Los votos son registrados por la puerta de enlace en `~/.openclaw/msteams-polls.json`.
- La puerta de enlace debe permanecer en línea para registrar los votos.
- Las encuestas aún no publican automáticamente resúmenes de resultados (inspeccione el archivo de almacenamiento si es necesario).

## Adaptive Cards (arbitrarios)

Envíe cualquier JSON de Adaptive Card a usuarios o conversaciones de Teams mediante la herramienta `message` o la CLI.

El parámetro `card` acepta un objeto JSON de Adaptive Card. Cuando se proporciona `card`, el texto del mensaje es opcional.

**Herramienta de agente:**

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:<id>",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{ "type": "TextBlock", "text": "Hello!" }]
  }
}
```

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

Consulte la [documentación de Adaptive Cards](https://adaptivecards.io/) para ver el esquema y los ejemplos de las tarjetas. Para obtener más detalles sobre los formatos de destino, consulte [Formatos de destino](#target-formats) a continuación.

## Formatos de destino

Los destinos de MSTeams utilizan prefijos para distinguir entre usuarios y conversaciones:

| Tipo de destino            | Formato                          | Ejemplo                                             |
| -------------------------- | -------------------------------- | --------------------------------------------------- |
| Usuario (por ID)           | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| Usuario (por nombre)       | `user:<display-name>`            | `user:John Smith` (requiere Graph API)              |
| Grupo/canal                | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| Grupo/canal (sin procesar) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (si contiene `@thread`) |

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

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:John Smith",
  "message": "Hello!"
}
```

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "conversation:19:abc...@thread.tacv2",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{ "type": "TextBlock", "text": "Hello" }]
  }
}
```

Nota: Sin el prefijo `user:`, los nombres se resuelven por defecto a grupo/equipo. Use siempre `user:` cuando apunte a personas por nombre para mostrar.

## Mensajería proactiva

- Los mensajes proactivos solo son posibles **después** de que un usuario haya interactuado, ya que almacenamos las referencias de conversación en ese momento.
- Consulte `/gateway/configuration` para `dmPolicy` y el control de entrada de lista de permitidos.

## ID de equipo y canal (Problema común)

El parámetro de consulta `groupId` en las URL de Teams **NO** es el ID de equipo utilizado para la configuración. Extraiga los IDs de la ruta de la URL en su lugar:

**URL de equipo:**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**URL de canal:**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Para configuración:**

- ID de equipo = segmento de ruta después de `/team/` (decodificado por URL, p. ej., `19:Bk4j...@thread.tacv2`)
- ID de canal = segmento de ruta después de `/channel/` (decodificado por URL)
- **Ignore** el parámetro de consulta `groupId`

## Canales privados

Los bots tienen compatibilidad limitada en canales privados:

| Característica                    | Canales estándar | Canales privados                      |
| --------------------------------- | ---------------- | ------------------------------------- |
| Instalación del bot               | Sí               | Limitada                              |
| Mensajes en tiempo real (webhook) | Sí               | Puede que no funcione                 |
| Permisos RSC                      | Sí               | Puede comportarse de manera diferente |
| @menciones                        | Sí               | Si el bot es accesible                |
| Historial de Graph API            | Sí               | Sí (con permisos)                     |

**Soluciones alternativas si los canales privados no funcionan:**

1. Use canales estándar para las interacciones del bot
2. Use MDs: los usuarios siempre pueden enviar mensajes al bot directamente
3. Use Graph API para el acceso histórico (requiere `ChannelMessage.Read.All`)

## Solución de problemas

### Problemas comunes

- **Las imágenes no se muestran en los canales:** Faltan permisos de Graph o consentimiento de administrador. Vuelva a instalar la aplicación de Teams y cierre/abra Teams completamente.
- **Sin respuestas en el canal:** se requieren menciones de forma predeterminada; establezca `channels.msteams.requireMention=false` o configure por equipo/canal.
- **Discrepancia de versión (Teams aún muestra el manifiesto antiguo):** elimine + vuelva a agregar la aplicación y cierre Teams completamente para actualizar.
- **401 No autorizado del webhook:** Se espera al probar manualmente sin Azure JWT: significa que el endpoint es accesible pero falló la autenticación. Use Azure Web Chat para probar correctamente.

### Errores de carga de manifiesto

- **"El archivo de icono no puede estar vacío":** El manifierto hace referencia a archivos de icono que tienen 0 bytes. Cree iconos PNG válidos (32x32 para `outline.png`, 192x192 para `color.png`).
- **"webApplicationInfo.Id ya está en uso":** La aplicación aún está instalada en otro equipo/chat. Busquela y desinstálela primero, o espere 5-10 minutos para la propagación.
- **"Algo salió mal" al cargar:** Cargue a través de [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) en su lugar, abra DevTools del navegador (F12) → pestaña Network y verifique el cuerpo de la respuesta para ver el error real.
- **Error de carga lateral (sideload):** Intente "Cargar una aplicación en el catálogo de aplicaciones de su organización" en lugar de "Cargar una aplicación personalizada"; esto a menudo omite las restricciones de carga lateral.

### Permisos RSC no funcionan

1. Verifique que `webApplicationInfo.id` coincida exactamente con el ID de aplicación de su bot
2. Vuelva a cargar la aplicación y reinstálela en el equipo/chat
3. Compruebe si el administrador de su organización ha bloqueado los permisos RSC
4. Confirme que está utilizando el ámbito correcto: `ChannelMessage.Read.Group` para equipos, `ChatMessage.Read.Chat` para chats grupales

## Referencias

- [Crear Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guía de configuración de Azure Bot
- [Portal de desarrolladores de Teams](https://dev.teams.microsoft.com/apps) - crear/gestionar aplicaciones de Teams
- [Esquema de manifiesto de aplicación de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recibir mensajes de canal con RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Referencia de permisos RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Manejo de archivos de bot de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/grupo requiere Graph)
- [Mensajería proactiva](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

import es from "/components/footer/es.mdx";

<es />
