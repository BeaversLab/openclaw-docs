---
summary: "Estado de soporte, capacidades y configuración del bot de Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> "Abandonad toda esperanza, los que entráis aquí."

Actualizado: 2026-03-25

Estado: se admiten archivos adjuntos de texto + MD; el envío de archivos a canales/grupos requiere `sharePointSiteId` + permisos de Graph (consulte [Enviar archivos en chats grupales](#sending-files-in-group-chats)). Las encuestas se envían mediante tarjetas adaptables. Las acciones de mensaje exponen `upload-file` explícito para envíos priorizando archivos.

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

Configuración mínima (secreto de cliente):

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

Para implementaciones en producción, considere el uso de [autenticación federada](#federated-authentication-certificate--managed-identity) (certificado o identidad administrada) en lugar de secretos de cliente.

Nota: los chats grupales están bloqueados de forma predeterminada (`channels.msteams.groupPolicy: "allowlist"`). Para permitir respuestas en grupos, establezca `channels.msteams.groupAllowFrom` (o use `groupPolicy: "open"` para permitir cualquier miembro, limitado por mención).

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
- `channels.msteams.allowFrom` debe usar ID de objetos de AAD estables.
- Los UPN/nombres para mostrar son mutables; la coincidencia directa está deshabilitada de forma predeterminada y solo se habilita con `channels.msteams.dangerouslyAllowNameMatching: true`.
- El asistente puede resolver nombres a ID a través de Microsoft Graph cuando las credenciales lo permiten.

**Acceso de grupo**

- Predeterminado: `channels.msteams.groupPolicy = "allowlist"` (bloqueado a menos que agregue `groupAllowFrom`). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté establecido.
- `channels.msteams.groupAllowFrom` controla qué remitentes pueden activar en chats grupales/canales (recurre a `channels.msteams.allowFrom`).
- Establezca `groupPolicy: "open"` para permitir cualquier miembro (aún limitado por mención de forma predeterminada).
- Para permitir **ningún canal**, establezca `channels.msteams.groupPolicy: "disabled"`.

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

- Alcance las respuestas de grupo/canal listando equipos y canales bajo `channels.msteams.teams`.
- Las claves deben usar ID de equipo estables e ID de conversación de canal.
- Cuando `groupPolicy="allowlist"` y una lista de permitidos (allowlist) de equipos están presentes, solo se aceptan los equipos/canales listados (restringido por mención).
- El asistente de configuración acepta entradas `Team/Channel` y las almacena por usted.
- Al iniciar, OpenClaw resuelve los nombres de las listas de permitidos de equipos/canales y usuarios a ID (cuando los permisos de Graph lo permiten)
  y registra el mapeo; los nombres de equipos/canales no resueltos se mantienen tal como se escribieron pero se ignoran para el enrutamiento de manera predeterminada a menos que `channels.msteams.dangerouslyAllowNameMatching: true` esté habilitado.

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

1. Asegúrese de que el complemento de Microsoft Teams esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas o personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Cree un **Azure Bot** (ID de aplicación + secreto + ID de inquilino).
3. Construya un **paquete de aplicación de Teams** que haga referencia al bot e incluya los permisos RSC a continuación.
4. Cargue/instale la aplicación de Teams en un equipo (o en el ámbito personal para mensajes directos).
5. Configure `msteams` en `~/.openclaw/openclaw.json` (o variables de entorno) e inicie la puerta de enlace.
6. La puerta de enlace escucha el tráfico del webhook de Bot Framework en `/api/messages` de manera predeterminada.

## Configuración de Azure Bot (Requisitos previos)

Antes de configurar OpenClaw, debe crear un recurso de Azure Bot.

### Paso 1: Crear Azure Bot

1. Vaya a [Crear Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Rellene la pestaña **Conceptos básicos**:

   | Campo                     | Valor                                                                 |
   | ------------------------- | --------------------------------------------------------------------- |
   | **Identificador del bot** | El nombre de su bot, por ejemplo, `openclaw-msteams` (debe ser único) |
   | **Suscripción**           | Seleccione su suscripción de Azure                                    |
   | **Grupo de recursos**     | Crear nuevo o usar existente                                          |
   | **Nivel de precios**      | **Gratis** para desarrollo/pruebas                                    |
   | **Tipo de aplicación**    | **Inquilino único** (recomendado - ver nota a continuación)           |
   | **Tipo de creación**      | **Crear nuevo identificador de aplicación de Microsoft**              |

> **Aviso de obsolescencia:** La creación de nuevos bots multiinquilino quedó obsoleta después del 31-07-2025. Use **Inquilino único** para los nuevos bots.

3. Haga clic en **Revisar + crear** → **Crear** (espere ~1-2 minutos)

### Paso 2: Obtener credenciales

1. Vaya a su recurso de Azure Bot → **Configuración**
2. Copie el **Identificador de aplicación de Microsoft** → este es su `appId`
3. Haga clic en **Administrar contraseña** → vaya al registro de la aplicación
4. En **Certificados y secretos** → **Nuevo secreto de cliente** → copie el **Valor** → este es su `appPassword`
5. Vaya a **Overview** → copie **Directory (tenant) ID** → este es su `tenantId`

### Paso 3: Configurar el punto de conexión de mensajería

1. En Azure Bot → **Configuration**
2. Establezca **Messaging endpoint** en su URL de webhook:
   - Producción: `https://your-domain.com/api/messages`
   - Desarrollo local: Use un túnel (ver [Local Development](#local-development-tunneling) a continuación)

### Paso 4: Habilitar el canal de Teams

1. En Azure Bot → **Channels**
2. Haga clic en **Microsoft Teams** → Configure → Guardar
3. Acepte los Términos de servicio

## Autenticación federada (Certificado + Identidad administrada)

> Añadido en 2026.3.24

Para despliegues en producción, OpenClaw admite **autenticación federada** como una alternativa más segura a los secretos de cliente. Hay dos métodos disponibles:

### Opción A: Autenticación basada en certificados

Use un certificado PEM registrado con su registro de aplicación Entra ID.

**Configuración:**

1. Genere u obtenga un certificado (formato PEM con clave privada).
2. En Entra ID → App Registration → **Certificates & secrets** → **Certificates** → Suba el certificado público.

**Config:**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      certificatePath: "/path/to/cert.pem",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**Variables de entorno:**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### Opción B: Identidad administrada de Azure

Use Azure Managed Identity para la autenticación sin contraseña. Esto es ideal para despliegues en la infraestructura de Azure (AKS, App Service, máquinas virtuales de Azure) donde hay una identidad administrada disponible.

**Cómo funciona:**

1. El pod/VM del bot tiene una identidad administrada (asignada por el sistema o por el usuario).
2. Una **credencial de identidad federada** vincula la identidad administrada al registro de la aplicación Entra ID.
3. En tiempo de ejecución, OpenClaw usa `@azure/identity` para adquirir tokens desde el punto de conexión IMDS de Azure (`169.254.169.254`).
4. El token se pasa al SDK de Teams para la autenticación del bot.

**Requisitos previos:**

- Infraestructura de Azure con identidad administrada habilitada (identidad de carga de trabajo de AKS, App Service, VM)
- Credencial de identidad federada creada en el registro de la aplicación Entra ID
- Acceso de red a IMDS (`169.254.169.254:80`) desde el pod/VM

**Config (identidad administrada asignada por el sistema):**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**Config (identidad administrada asignada por el usuario):**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      managedIdentityClientId: "<MI_CLIENT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**Variables de entorno:**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (solo para asignada por el usuario)

### Configuración de la identidad de carga de trabajo de AKS

Para implementaciones en AKS que usan identidad de carga de trabajo:

1. **Habilite la identidad de carga de trabajo** en su clúster de AKS.
2. **Cree una credencial de identidad federada** en el registro de aplicaciones de Entra ID:

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. **Anote la cuenta de servicio de Kubernetes** con el ID de cliente de la aplicación:

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. **Etiquete el pod** para la inyección de identidad de carga de trabajo:

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **Asegure el acceso a la red** a IMDS (`169.254.169.254`) — si usa NetworkPolicy, agregue una regla de salida que permita el tráfico a `169.254.169.254/32` en el puerto 80.

### Comparación de tipos de autenticación

| Método                     | Configuración                                  | Ventajas                                   | Desventajas                                    |
| -------------------------- | ---------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **Secreto de cliente**     | `appPassword`                                  | Configuración sencilla                     | Se requiere rotación de secretos, menos seguro |
| **Certificado**            | `authType: "federated"` + `certificatePath`    | Sin secreto compartido a través de la red  | Sobrecarga de gestión de certificados          |
| **Identidad administrada** | `authType: "federated"` + `useManagedIdentity` | Sin contraseña, sin secretos que gestionar | Se requiere infraestructura de Azure           |

**Comportamiento predeterminado:** Cuando no se establece `authType`, OpenClaw utiliza de forma predeterminada la autenticación mediante secreto de cliente. Las configuraciones existentes siguen funcionando sin cambios.

## Desarrollo local (Tunelización)

Teams no puede alcanzar `localhost`. Utilice un túnel para el desarrollo local:

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

En lugar de crear manualmente un archivo ZIP de manifiesto, puede utilizar el [Portal para desarrolladores de Teams](https://dev.teams.microsoft.com/apps):

1. Haga clic en **+ Nueva aplicación**
2. Rellene la información básica (nombre, descripción, información del desarrollador)
3. Vaya a **Características de la aplicación** → **Bot**
4. Seleccione **Escribir un identificador de bot manualmente** y pegue su ID de aplicación de Azure Bot
5. Marque los ámbitos: **Personal**, **Equipo**, **Chat de grupo**
6. Haga clic en **Distribuir** → **Descargar paquete de aplicaciones**
7. En Teams: **Aplicaciones** → **Administrar sus aplicaciones** → **Cargar una aplicación personalizada** → seleccione el archivo ZIP

Esto suele ser más fácil que editar manifiestos JSON a mano.

## Prueba del Bot

**Opción A: Azure Web Chat (verifique el webhook primero)**

1. En Azure Portal → recurso de Azure Bot → **Probar en Web Chat**
2. Envíe un mensaje: debería ver una respuesta
3. Esto confirma que su punto de conexión webhook funciona antes de la configuración de Teams

**Opción B: Teams (después de la instalación de la aplicación)**

1. Instale la aplicación de Teams (carga lateral o catálogo de la organización)
2. Busque el bot en Teams y envíe un mensaje directo
3. Compruebe los registros de la puerta de enlace para ver la actividad entrante

## Configuración (texto mínimo)

1. **Asegúrese de que el complemento de Microsoft Teams esté disponible**
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente:
     - Desde npm: `openclaw plugins install @openclaw/msteams`
     - Desde una copia local: `openclaw plugins install ./path/to/local/msteams-plugin`

2. **Registro del bot**
   - Cree un Azure Bot (ver arriba) y anote:
     - App ID
     - Secreto de cliente (Contraseña de la aplicación)
     - ID de inquilino (single-tenant)

3. **Manifiesto de la aplicación de Teams**
   - Incluya una entrada `bot` con `botId = <App ID>`.
   - Ámbitos: `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (requerido para el manejo de archivos de ámbito personal).
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
   - `MSTEAMS_AUTH_TYPE` (opcional: `"secret"` o `"federated"`)
   - `MSTEAMS_CERTIFICATE_PATH` (federado + certificado)
   - `MSTEAMS_CERTIFICATE_THUMBPRINT` (opcional, no requerido para autenticación)
   - `MSTEAMS_USE_MANAGED_IDENTITY` (federado + identidad administrada)
   - `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` (solo MI asignada por el usuario)

5. **Endpoint del bot**
   - Establezca el Endpoint de Mensajería del Azure Bot en:
     - `https://<host>:3978/api/messages` (o su ruta/puerto elegido).

6. **Ejecutar la puerta de enlace**
   - El canal de Teams se inicia automáticamente cuando el complemento empaquetado o instalado manualmente está disponible y existe la configuración `msteams` con las credenciales.

## Acción de información de miembro

OpenClaw expone una acción `member-info` respaldada por Graph para Microsoft Teams, de modo que los agentes y automatizaciones puedan resolver los detalles de los miembros del canal (nombre para mostrar, correo electrónico, rol) directamente desde Microsoft Graph.

Requisitos:

- Permiso RSC `Member.Read.Group` (ya está en el manifiesto recomendado)
- Para búsquedas entre equipos: permiso de aplicación de Graph `User.Read.All` con consentimiento de administrador

La acción está limitada por `channels.msteams.actions.memberInfo` (predeterminado: habilitado cuando las credenciales de Graph están disponibles).

## Contexto del historial

- `channels.msteams.historyLimit` controla cuántos mensajes recientes del canal/grupo se incluyen en el aviso.
- Recurre a `messages.groupChat.historyLimit`. Establezca `0` para desactivar (predeterminado 50).
- El historial de hilos recuperado se filtra por listas de permitidos de remitentes (`allowFrom` / `groupAllowFrom`), por lo que la inicialización del contexto del hilo solo incluye mensajes de remitentes permitidos.
- El contexto de los datos adjuntos citados (`ReplyTo*` derivados del HTML de respuesta de Teams) actualmente se pasa tal como se recibe.
- En otras palabras, las listas de permitidos controlan quién puede activar el agente; hoy solo se filtran rutas de contexto suplementario específicas.
- El historial de MD se puede limitar con `channels.msteams.dmHistoryLimit` (turnos de usuario). Invalidaciones por usuario: `channels.msteams.dms["<user_id>"].historyLimit`.

## Permisos RSC actuales de Teams (Manifiesto)

Estos son los **permisos resourceSpecific existentes** en nuestro manifiesto de la aplicación de Teams. Solo se aplican dentro del equipo/chat donde está instalada la aplicación.

**Para canales (alcance de equipo):**

- `ChannelMessage.Read.Group` (Aplicación) - recibir todos los mensajes del canal sin @mención
- `ChannelMessage.Send.Group` (Aplicación)
- `Member.Read.Group` (Aplicación)
- `Owner.Read.Group` (Aplicación)
- `ChannelSettings.Read.Group` (Aplicación)
- `TeamMember.Read.Group` (Aplicación)
- `TeamSettings.Read.Group` (Aplicación)

**Para chats de grupo:**

- `ChatMessage.Read.Chat` (Aplicación) - recibir todos los mensajes de chat de grupo sin @mención

## Ejemplo de manifiesto de Teams (censurado)

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
- `authorization.permissions.resourceSpecific` debe incluir lectura/escritura de canal si desea tráfico del canal.

### Actualizar una aplicación existente

Para actualizar una aplicación de Teams ya instalada (por ejemplo, para agregar permisos RSC):

1. Actualice su `manifest.json` con la nueva configuración
2. **Incremente el campo `version`** (p. ej., `1.0.0` → `1.1.0`)
3. **Vuelva a comprimir** el manifiesto con los iconos (`manifest.json`, `outline.png`, `color.png`)
4. Cargue el nuevo archivo zip:
   - **Opción A (Centro de administración de Teams):** Centro de administración de Teams → Aplicaciones de Teams → Administrar aplicaciones → buscar su aplicación → Cargar nueva versión
   - **Opción B (Carga lateral):** En Teams → Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación personalizada
5. **Para canales de equipo:** Vuelva a instalar la aplicación en cada equipo para que los nuevos permisos surtan efecto
6. **Cierre y reinicie Teams por completo** (no solo cierre la ventana) para borrar los metadatos de la aplicación en caché

## Capacidades: Solo RSC frente a Graph

### Con **solo RSC de Teams** (aplicación instalada, sin permisos de API de Graph)

Funciona:

- Leer el contenido de **texto** del mensaje del canal.
- Enviar contenido de **texto** del mensaje del canal.
- Recibir archivos adjuntos **personales (MD)**.

NO funciona:

- Contenido de **imágenes o archivos** de canal/grupo (la carga útil solo incluye código auxiliar HTML).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes (más allá del evento de webhook en vivo).

### Con **RSC de Teams + Permisos de aplicación de Microsoft Graph**

Añade:

- Descargar contenido alojado (imágenes pegadas en los mensajes).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes de canal/chat a través de Graph.

### RSC frente a Graph API

| Capacidad                        | Permisos RSC                  | Graph API                                                  |
| -------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| **Mensajes en tiempo real**      | Sí (vía webhook)              | No (solo sondeo)                                           |
| **Mensajes históricos**          | No                            | Sí (puede consultar el historial)                          |
| **Complejidad de configuración** | Solo manifiesto de aplicación | Requiere consentimiento de administrador + flujo de tokens |
| **Funciona sin conexión**        | No (debe estar ejecutándose)  | Sí (consultar en cualquier momento)                        |

**En resumen:** RSC es para la escucha en tiempo real; Graph API es para el acceso histórico. Para ponerse al día con los mensajes perdidos mientras se estaba sin conexión, necesita Graph API con `ChannelMessage.Read.All` (requiere consentimiento de administrador).

## Medios e historial habilitados para Graph (necesario para canales)

Si necesitas imágenes/archivos en **canales** o deseas obtener el **historial de mensajes**, debes habilitar los permisos de Microsoft Graph y otorgar el consentimiento del administrador.

1. En el **Registro de aplicaciones** de Entra ID (Azure AD), agrega **permisos de aplicación** de Microsoft Graph:
   - `ChannelMessage.Read.All` (datos adjuntos del canal + historial)
   - `Chat.Read.All` o `ChatMessage.Read.All` (chats de grupo)
2. **Otorga el consentimiento del administrador** para el inquilino.
3. Incrementa la **versión del manifiesto** de la aplicación de Teams, vuelve a cargarla y **reinstala la aplicación en Teams**.
4. **Cierra Teams completamente y vuelve a iniciarlo** para borrar los metadatos de la aplicación almacenados en caché.

**Permiso adicional para menciones de usuario:** Las @menciones de usuario funcionan de fábrica para los usuarios en la conversación. Sin embargo, si deseas buscar y mencionar dinámicamente usuarios que **no están en la conversación actual**, agrega el permiso `User.Read.All` (Application) y otorga el consentimiento del administrador.

## Limitaciones conocidas

### Tiempos de espera de webhook

Teams entrega mensajes a través de un webhook HTTP. Si el procesamiento tarda demasiado (por ejemplo, respuestas lentas de LLM), es posible que veas:

- Tiempos de espera de la puerta de enlace
- Teams reintentando el mensaje (causando duplicados)
- Respuestas perdidas

OpenClaw maneja esto respondiendo rápidamente y enviando respuestas de manera proactiva, pero las respuestas muy lentas aún pueden causar problemas.

### Formato

El formato Markdown de Teams es más limitado que el de Slack o Discord:

- El formato básico funciona: **negrita**, _cursiva_, `code`, enlaces
- El formato complejo de Markdown (tablas, listas anidadas) puede no mostrarse correctamente
- Adaptive Cards son compatibles para encuestas y envíos de tarjetas arbitrarios (ver abajo)

## Configuración

Configuraciones clave (ver `/gateway/configuration` para patrones de canales compartidos):

- `channels.msteams.enabled`: habilitar/deshabilitar el canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: credenciales del bot.
- `channels.msteams.webhook.port` (predeterminado `3978`)
- `channels.msteams.webhook.path` (predeterminado `/api/messages`)
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento)
- `channels.msteams.allowFrom`: lista de permitidos para MD (se recomiendan los IDs de objeto de AAD). El asistente resuelve los nombres a los IDs durante la configuración cuando el acceso a Graph está disponible.
- `channels.msteams.dangerouslyAllowNameMatching`: interruptor de emergencia para volver a habilitar la coincidencia mutable de UPN/nombre para mostrar y el enrutamiento directo por nombre de equipo/canal.
- `channels.msteams.textChunkLimit`: tamaño del fragmento de texto saliente.
- `channels.msteams.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.msteams.mediaAllowHosts`: lista de permitidos para hosts de datos adjuntos entrantes (predeterminado en dominios de Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts`: lista de permitidos para adjuntar encabezados de autorización en reintentos de medios (predeterminado en hosts de Graph + Bot Framework).
- `channels.msteams.requireMention`: requerir @mención en canales/grupos (verdadero de forma predeterminada).
- `channels.msteams.replyStyle`: `thread | top-level` (consulte [Reply Style](#reply-style-threads-vs-posts)).
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
- `channels.msteams.actions.memberInfo`: habilita o deshabilita la acción de información de miembro respaldada por Graph (predeterminado: habilitado cuando las credenciales de Graph están disponibles).
- `channels.msteams.authType`: tipo de autenticación — `"secret"` (predeterminado) o `"federated"`.
- `channels.msteams.certificatePath`: ruta al archivo de certificado PEM (autenticación federada + certificado).
- `channels.msteams.certificateThumbprint`: huella digital del certificado (opcional, no requerido para autenticación).
- `channels.msteams.useManagedIdentity`: habilitar autenticación de identidad administrada (modo federado).
- `channels.msteams.managedIdentityClientId`: ID de cliente para identidad administrada asignada por el usuario.
- `channels.msteams.sharePointSiteId`: ID del sitio de SharePoint para cargar archivos en chats de grupo/canales (consulte [Enviar archivos en chats de grupo](#sending-files-in-group-chats)).

## Enrutamiento y Sesiones

- Las claves de sesión siguen el formato estándar de agente (consulte [/concepts/session](/en/concepts/session)):
  - Los mensajes directos comparten la sesión principal (`agent:<agentId>:<mainKey>`).
  - Los mensajes de canal/grupo usan el ID de conversación:
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Estilo de respuesta: Hilos vs. Publicaciones

Teams introdujo recientemente dos estilos de interfaz de usuario de canal sobre el mismo modelo de datos subyacente:

| Estilo                      | Descripción                                                       | Recomendado `replyStyle`  |
| --------------------------- | ----------------------------------------------------------------- | ------------------------- |
| **Publicaciones** (clásico) | Los mensajes aparecen como tarjetas con respuestas en hilo debajo | `thread` (predeterminado) |
| **Hilos** (estilo Slack)    | Los mensajes fluyen linealmente, más parecido a Slack             | `top-level`               |

**El problema:** La API de Teams no expone qué estilo de interfaz de usuario usa un canal. Si usa el `replyStyle` incorrecto:

- `thread` en un canal estilo Hilos → las respuestas aparecen anidadas de manera incómoda
- `top-level` en un canal estilo Publicaciones → las respuestas aparecen como publicaciones de nivel superior separadas en lugar de en el hilo

**Solución:** Configure `replyStyle` por canal según cómo esté configurado el canal:

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

- **Mensajes directos:** Las imágenes y los archivos adjuntos funcionan a través de las APIs de archivos de bot de Teams.
- **Canales/grupos:** Los archivos adjuntos residen en el almacenamiento de M365 (SharePoint/OneDrive). La carga útil del webhook solo incluye un código auxiliar HTML, no los bytes reales del archivo. **Se requieren permisos de la API de Graph** para descargar los archivos adjuntos del canal.
- Para envíos explícitos de archivo primero, use `action=upload-file` con `media` / `filePath` / `path`; el `message` opcional se convierte en el texto/comentario adjunto, y `filename` anula el nombre cargado.

Sin permisos de Graph, los mensajes del canal con imágenes se recibirán como texto solamente (el contenido de la imagen no es accesible para el bot).
Por defecto, OpenClaw solo descarga medios de nombres de host de Microsoft/Teams. Anule esto con `channels.msteams.mediaAllowHosts` (use `["*"]` para permitir cualquier host).
Los encabezados de autorización solo se adjuntan para los hosts en `channels.msteams.mediaAuthAllowHosts` (por defecto hosts de Graph + Bot Framework). Mantenga esta lista estricta (evite sufijos multiinquilino).

## Envío de archivos en chats de grupo

Los bots pueden enviar archivos en MDs utilizando el flujo FileConsentCard (integrado). Sin embargo, **el envío de archivos en chats de grupo/canales** requiere una configuración adicional:

| Contexto                          | Cómo se envían los archivos                        | Configuración necesaria                         |
| --------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| **MDs**                           | FileConsentCard → el usuario acepta → el bot carga | Funciona de fábrica                             |
| **Chats de grupo/canales**        | Cargar en SharePoint → compartir enlace            | Requiere `sharePointSiteId` + permisos de Graph |
| **Imágenes (cualquier contexto)** | Codificadas en Base64 en línea                     | Funciona de fábrica                             |

### Por qué los chats de grupo necesitan SharePoint

Los bots no tienen una unidad personal de OneDrive (el punto final de la API de Graph `/me/drive` no funciona para identidades de aplicación). Para enviar archivos en chats de grupo/canales, el bot los carga en un **sitio de SharePoint** y crea un enlace para compartir.

### Configuración

1. **Agregue permisos de la API de Graph** en Entra ID (Azure AD) → Registro de la aplicación:
   - `Sites.ReadWrite.All` (Aplicación) - carga archivos en SharePoint
   - `Chat.Read.All` (Aplicación) - opcional, habilita enlaces para compartir por usuario

2. **Conceda el consentimiento del administrador** para el inquilino.

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

### Comportamiento para compartir

| Permiso                                 | Comportamiento para compartir                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Solo `Sites.ReadWrite.All`              | Enlace de uso compartido en toda la organización (cualquiera de la organización puede acceder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Enlace de uso compartido por usuario (solo los miembros del chat pueden acceder)               |

El uso compartido por usuario es más seguro, ya que solo los participantes del chat pueden acceder al archivo. Si falta el permiso `Chat.Read.All`, el bot recurre al uso compartido en toda la organización.

### Comportamiento de reserva

| Escenario                                                | Resultado                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| Chat de grupo + archivo + `sharePointSiteId` configurado | Cargar en SharePoint, enviar enlace de uso compartido         |
| Chat de grupo + archivo + sin `sharePointSiteId`         | Intentar cargar en OneDrive (puede fallar), enviar solo texto |
| Chat personal + archivo                                  | Flujo FileConsentCard (funciona sin SharePoint)               |
| Cualquier contexto + imagen                              | Codificado en línea en Base64 (funciona sin SharePoint)       |

### Ubicación de almacenamiento de archivos

Los archivos cargados se almacenan en una carpeta `/OpenClawShared/` en la biblioteca de documentos predeterminada del sitio de SharePoint configurado.

## Encuestas (Adaptive Cards)

OpenClaw envía encuestas de Teams como Adaptive Cards (no hay una API nativa de encuestas de Teams).

- CLI: `openclaw message poll --channel msteams --target conversation:<id> ...`
- Los votos son registrados por la puerta de enlace en `~/.openclaw/msteams-polls.json`.
- La puerta de enlace debe permanecer en línea para registrar los votos.
- Las encuestas aún no publican resúmenes de resultados automáticamente (inspeccione el archivo de almacenamiento si es necesario).

## Adaptive Cards (arbitrarios)

Envíe cualquier JSON de Adaptive Card a usuarios o conversaciones de Teams utilizando la herramienta `message` o la CLI.

El parámetro `card` acepta un objeto JSON de Adaptive Card. Cuando se proporciona `card`, el texto del mensaje es opcional.

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

Consulte la [documentación de Adaptive Cards](https://adaptivecards.io/) para ver el esquema y ejemplos de tarjetas. Para obtener detalles sobre los formatos de destino, consulte [Formatos de destino](#target-formats) a continuación.

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

**Ejemplos de herramientas del agente:**

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

Nota: Sin el prefijo `user:`, los nombres se resuelven por defecto a grupo/equipo. Use siempre `user:` cuando se dirija a personas por su nombre para mostrar.

## Mensajería proactiva

- Los mensajes proactivos solo son posibles **después** de que un usuario haya interactuado, ya que almacenamos las referencias de conversación en ese momento.
- Consulte `/gateway/configuration` para `dmPolicy` y el control de permisos de lista de permitidos.

## ID de equipo y canal (Problema común)

El parámetro de consulta `groupId` en las URLs de Teams **NO** es el ID de equipo utilizado para la configuración. Extraiga los ID de la ruta de la URL en su lugar:

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
| Mensajes en tiempo real (webhook) | Sí               | Puede que no funcione                 |
| Permisos RSC                      | Sí               | Puede comportarse de manera diferente |
| @menciones                        | Sí               | Si el bot es accesible                |
| Historial de Graph API            | Sí               | Sí (con permisos)                     |

**Soluciones alternativas si los canales privados no funcionan:**

1. Use canales estándar para las interacciones del bot
2. Use MDs: los usuarios siempre pueden enviar mensajes directamente al bot
3. Use Graph API para el acceso histórico (requiere `ChannelMessage.Read.All`)

## Solución de problemas

### Problemas comunes

- **Las imágenes no se muestran en los canales:** Faltan permisos de Graph o el consentimiento del administrador. Reinstale la aplicación de Teams y cierre y vuelva a abrir Teams por completo.
- **Sin respuestas en el canal:** se requieren menciones de forma predeterminada; establezca `channels.msteams.requireMention=false` o configure por equipo/canal.
- **Incoherencia de versión (Teams todavía muestra el manifiesto antiguo):** elimine y vuelva a agregar la aplicación y cierre Teams por completo para actualizar.
- **401 Unauthorized del webhook:** Es esperado al probar manualmente sin el JWT de Azure: significa que el punto de conexión es accesible pero la autenticación falló. Use Azure Web Chat para probar correctamente.

### Errores de carga de manifiesto

- **"Icon file cannot be empty":** El manifiesto hace referencia a archivos de iconos que tienen 0 bytes. Cree iconos PNG válidos (32x32 para `outline.png`, 192x192 para `color.png`).
- **"webApplicationInfo.Id already in use":** La aplicación todavía está instalada en otro equipo/chat. Busque y desinstálela primero, o espere 5-10 minutos para la propagación.
- **"Something went wrong" al cargar:** Cargue a través de [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) en su lugar, abra las herramientas de desarrollo del navegador (F12) → pestaña Network y verifique el cuerpo de la respuesta para ver el error real.
- **Error al realizar la instalación lateral:** Intente "Upload an app to your org's app catalog" en lugar de "Upload a custom app"; esto a menudo evita las restricciones de instalación lateral.

### Los permisos RSC no funcionan

1. Verifique que `webApplicationInfo.id` coincida exactamente con el App ID de su bot
2. Vuelva a cargar la aplicación y reinstálela en el equipo/chat
3. Compruebe si el administrador de su organización ha bloqueado los permisos RSC
4. Confirme que está utilizando el ámbito correcto: `ChannelMessage.Read.Group` para equipos, `ChatMessage.Read.Chat` para chats de grupo

## Referencias

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guía de configuración de Azure Bot
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - crear/administrar aplicaciones de Teams
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/grupo requiere Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## Relacionado

- [Channels Overview](/en/channels) — todos los canales compatibles
- [Pairing](/en/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Groups](/en/channels/groups) — comportamiento del chat de grupo y limitación de menciones
- [Channel Routing](/en/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Security](/en/gateway/security) — modelo de acceso y fortalecimiento
