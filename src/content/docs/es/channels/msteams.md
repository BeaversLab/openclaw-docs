---
summary: "Estado de soporte, capacidades y configuración del bot de Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

Estado: se admite texto + archivos adjuntos en MD; el envío de archivos a canales/grupos requiere `sharePointSiteId` + permisos de Graph (consulte [Sending files in group chats](#sending-files-in-group-chats)). Las encuestas se envían mediante Adaptive Cards. Las acciones de mensaje exponen un `upload-file` explícito para envíos prioritarios de archivos.

## Complemento incluido

Microsoft Teams se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que no
se requiere una instalación separada en la compilación empaquetada normal.

Si utiliza una versión anterior o una instalación personalizada que excluye Teams incluido,
instálelo manualmente:

```bash
openclaw plugins install @openclaw/msteams
```

Copia local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida

El [`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) gestiona el registro del bot, la creación de manifiestos y la generación de credenciales en un solo comando.

**1. Instale e inicie sesión**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>La CLI de Teams se encuentra actualmente en versión preliminar. Los comandos y las opciones pueden cambiar entre versiones.</Note>

**2. Inicie un túnel** (Teams no puede acceder a localhost)

Instale y autentique la CLI de devtunnel si aún no lo ha hecho ([guía de introducción](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)).

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>`--allow-anonymous` es obligatorio porque Teams no puede autenticarse con devtunnels. Cada solicitud entrante del bot sigue siendo validada automáticamente por el SDK de Teams.</Note>

Alternativas: `ngrok http 3978` o `tailscale funnel 3978` (pero estos pueden cambiar las URL en cada sesión).

**3. Cree la aplicación**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

Este único comando:

- Crea una aplicación de Entra ID (Azure AD)
- Genera un secreto de cliente
- Compila y carga un manifiesto de aplicación de Teams (con iconos)
- Registra el bot (gestionado por Teams de forma predeterminada; no se necesita una suscripción de Azure)

La salida mostrará `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID` y un **Teams App ID**; anote estos datos para los siguientes pasos. También ofrece la opción de instalar la aplicación directamente en Teams.

**4. Configure OpenClaw** utilizando las credenciales de la salida:

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<CLIENT_ID>",
      appPassword: "<CLIENT_SECRET>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

O use variables de entorno directamente: `MSTEAMS_APP_ID`, `MSTEAMS_APP_PASSWORD`, `MSTEAMS_TENANT_ID`.

**5. Instalar la aplicación en Teams**

`teams app create` le pedirá que instale la aplicación; seleccione "Install in Teams". Si lo omitió, puede obtener el enlace más tarde:

```bash
teams app get <teamsAppId> --install-link
```

**6. Verificar que todo funciona**

```bash
teams app doctor <teamsAppId>
```

Esto ejecuta diagnósticos en el registro del bot, la configuración de la aplicación AAD, la validez del manifiesto y la configuración de SSO.

Para implementaciones en producción, considere el uso de [federated authentication](/es/channels/msteams#federated-authentication-certificate-plus-managed-identity) (certificado o identidad administrada) en lugar de secretos de cliente.

<Note>Los chats de grupo están bloqueados de forma predeterminada (`channels.msteams.groupPolicy: "allowlist"`). Para permitir respuestas de grupo, establezca `channels.msteams.groupAllowFrom`, o use `groupPolicy: "open"` para permitir cualquier miembro (limitado por mención).</Note>

## Objetivos

- Hablar con OpenClaw a través de MDs de Teams, chats de grupo o canales.
- Mantener el enrutamiento determinista: las respuestas siempre vuelven al canal por el que llegaron.
- De forma predeterminada, se comporta de forma segura en los canales (se requieren menciones a menos que se configure lo contrario).

## Escrituras de configuración

De forma predeterminada, se permite a Microsoft Teams escribir actualizaciones de configuración activadas por `/config set|unset` (requiere `commands.config: true`).

Desactivar con:

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## Control de acceso (MDs + grupos)

**Acceso a MD**

- Predeterminado: `channels.msteams.dmPolicy = "pairing"`. Los remitentes desconocidos se ignoran hasta que se aprueben.
- `channels.msteams.allowFrom` debe usar IDs de objeto AAD estables.
- No confíe en la coincidencia de UPN/nombre para mostrar para las listas de permitidos; pueden cambiar. OpenClaw deshabilita la coincidencia directa de nombres de forma predeterminada; actívela explícitamente con `channels.msteams.dangerouslyAllowNameMatching: true`.
- El asistente puede resolver nombres a IDs a través de Microsoft Graph cuando las credenciales lo permiten.

**Acceso a grupos**

- Predeterminado: `channels.msteams.groupPolicy = "allowlist"` (bloqueado a menos que agregue `groupAllowFrom`). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté establecido.
- `channels.msteams.groupAllowFrom` controla qué remitentes pueden activar en chats de grupo/canales (recurre a `channels.msteams.allowFrom`).
- Establezca `groupPolicy: "open"` para permitir cualquier miembro (aún limitado por mención de forma predeterminada).
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

**Teams + lista de permitidos de canales**

- Alcance las respuestas de grupos/canales listando equipos y canales en `channels.msteams.teams`.
- Las claves deben usar IDs de equipo estables y IDs de conversación de canal.
- Cuando `groupPolicy="allowlist"` y una lista de permitidos de equipos está presente, solo se aceptan los equipos/canales listados (restringido por mención).
- El asistente de configuración acepta entradas `Team/Channel` y las almacena por usted.
- Al iniciar, OpenClaw resuelve los nombres de la lista de permitidos de equipos/canales y usuarios a IDs (cuando los permisos de Graph lo permiten)
  y registra el mapeo; los nombres de equipos/canales no resueltos se mantienen tal como se escribieron pero se ignoran para el enrutamiento por defecto a menos que `channels.msteams.dangerouslyAllowNameMatching: true` esté habilitado.

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

<details>
<summary><strong>Configuración manual (sin la CLI de Teams)</strong></summary>

Si no puede usar la CLI de Teams, puede configurar el bot manualmente a través de Azure Portal.

### Cómo funciona

1. Asegúrese de que el complemento de Microsoft Teams esté disponible (incluido en las versiones actuales).
2. Cree un **Azure Bot** (ID de aplicación + secreto + ID de inquilino).
3. Construya un **paquete de aplicación de Teams** que haga referencia al bot e incluya los permisos RSC a continuación.
4. Cargue/instale la aplicación de Teams en un equipo (o ámbito personal para MDs).
5. Configure `msteams` en `~/.openclaw/openclaw.json` (o variables de entorno) e inicie la puerta de enlace.
6. La puerta de enlace escucha el tráfico webhook de Bot Framework en `/api/messages` por defecto.

### Paso 1: Crear Azure Bot

1. Vaya a [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Rellene la pestaña **Conceptos básicos**:

   | Campo                     | Valor                                                            |
   | ------------------------- | ---------------------------------------------------------------- |
   | **Identificador del bot** | El nombre de su bot, p. ej., `openclaw-msteams` (debe ser único) |
   | **Suscripción**           | Seleccione su suscripción de Azure                               |
   | **Grupo de recursos**     | Crear nuevo o usar existente                                     |
   | **Nivel de precios**      | **Gratis** para desarrollo/pruebas                               |
   | **Tipo de aplicación**    | **Single Tenant** (recomendado - ver nota abajo)                 |
   | **Tipo de creación**      | **Crear nuevo Microsoft App ID**                                 |

<Warning>La creación de nuevos bots multiinquilino quedó obsoleta después del 2025-07-31. Use **Single Tenant** para bots nuevos.</Warning>

3. Haga clic en **Revisar y crear** → **Crear** (espere ~1-2 minutos)

### Paso 2: Obtener credenciales

1. Vaya a su recurso de Azure Bot → **Configuración**
2. Copie **Microsoft App ID** → este es su `appId`
3. Haga clic en **Administrar contraseña** → vaya al registro de la aplicación
4. En **Certificados y secretos** → **Nuevo secreto de cliente** → copie el **Valor** → este es su `appPassword`
5. Vaya a **Información general** → copie el **Id. de directorio (inquilino)** → este es su `tenantId`

### Paso 3: Configurar el punto de conexión de mensajería

1. En Azure Bot → **Configuración**
2. Establezca el **Punto de conexión de mensajería** en la URL de su webhook:
   - Producción: `https://your-domain.com/api/messages`
   - Desarrollo local: Use un túnel (ver [Desarrollo local](#local-development-tunneling) a continuación)

### Paso 4: Habilitar el canal de Teams

1. En Azure Bot → **Canales**
2. Haga clic en **Microsoft Teams** → Configurar → Guardar
3. Acepte los Términos de servicio

### Paso 5: Crear el manifiesto de la aplicación de Teams

- Incluya una entrada `bot` con `botId = <App ID>`.
- Ámbitos: `personal`, `team`, `groupChat`.
- `supportsFiles: true` (necesario para el manejo de archivos en el ámbito personal).
- Añada permisos RSC (ver [Permisos RSC](#current-teams-rsc-permissions-manifest)).
- Cree iconos: `outline.png` (32x32) y `color.png` (192x192).
- Comprima los tres archivos juntos: `manifest.json`, `outline.png`, `color.png`.

### Paso 6: Configurar OpenClaw

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

Variables de entorno: `MSTEAMS_APP_ID`, `MSTEAMS_APP_PASSWORD`, `MSTEAMS_TENANT_ID`.

### Paso 7: Ejecutar el Gateway

El canal de Teams se inicia automáticamente cuando el complemento está disponible y existe la configuración `msteams` con las credenciales.

</details>

## Autenticación federada (certificado más identidad administrada)

> Añadido en 2026.3.24

Para despliegues en producción, OpenClaw admite **autenticación federada** como una alternativa más segura a los secretos de cliente. Hay dos métodos disponibles:

### Opción A: Autenticación basada en certificados

Use un certificado PEM registrado con su registro de aplicación de Entra ID.

**Configuración:**

1. Genere u obtenga un certificado (formato PEM con clave privada).
2. En Entra ID → Registro de aplicación → **Certificados y secretos** → **Certificados** → Cargue el certificado público.

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

Use Azure Managed Identity para la autenticación sin contraseña. Esto es ideal para implementaciones en la infraestructura de Azure (AKS, App Service, máquinas virtuales de Azure) donde hay disponible una identidad administrada.

**Cómo funciona:**

1. El pod/VM del bot tiene una identidad administrada (asignada por el sistema o asignada por el usuario).
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

Para las implementaciones de AKS que usan identidad de carga de trabajo:

1. **Habilite la identidad de carga de trabajo** en su clúster de AKS.
2. **Cree una credencial de identidad federada** en el registro de la aplicación Entra ID:

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

5. **Asegúrese del acceso de red** a IMDS (`169.254.169.254`): si usa NetworkPolicy, agregue una regla de salida que permita el tráfico a `169.254.169.254/32` en el puerto 80.

### Comparación de tipos de autenticación

| Método                     | Configuración                                  | Ventajas                                   | Desventajas                                       |
| -------------------------- | ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| **Secreto de cliente**     | `appPassword`                                  | Configuración sencilla                     | Se requiere la rotación de secretos, menos seguro |
| **Certificado**            | `authType: "federated"` + `certificatePath`    | Sin secreto compartido a través de la red  | Sobrecarga de gestión de certificados             |
| **Identidad administrada** | `authType: "federated"` + `useManagedIdentity` | Sin contraseña, sin secretos que gestionar | Se requiere infraestructura de Azure              |

**Comportamiento predeterminado:** Cuando no se establece `authType`, OpenClaw usa de forma predeterminada la autenticación de secreto de cliente. Las configuraciones existentes siguen funcionando sin cambios.

## Desarrollo local (túnel)

Teams no puede alcanzar `localhost`. Utiliza un túnel de desarrollo persistente para que tu URL se mantenga igual en todas las sesiones:

```bash
# One-time setup:
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
```

Alternativas: `ngrok http 3978` o `tailscale funnel 3978` (las URL pueden cambiar en cada sesión).

Si la URL de tu túnel cambia, actualiza el punto de conexión:

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## Prueba del Bot

**Ejecutar diagnósticos:**

```bash
teams app doctor <teamsAppId>
```

Verifica el registro del bot, la aplicación AAD, el manifiesto y la configuración de SSO de una sola vez.

**Enviar un mensaje de prueba:**

1. Instala la aplicación de Teams (usa el enlace de instalación de `teams app get <id> --install-link`)
2. Busca el bot en Teams y envía un mensaje directo
3. Revisa los registros de la puerta de enlace para ver la actividad entrante

## Variables de entorno

Todas las claves de configuración se pueden establecer mediante variables de entorno:

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE` (opcional: `"secret"` o `"federated"`)
- `MSTEAMS_CERTIFICATE_PATH` (federado + certificado)
- `MSTEAMS_CERTIFICATE_THUMBPRINT` (opcional, no necesario para autenticación)
- `MSTEAMS_USE_MANAGED_IDENTITY` (federado + identidad administrada)
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` (solo identidad administrada asignada por el usuario)

## Acción de información de miembro

OpenClaw expone una acción `member-info` respaldada por Graph para Microsoft Teams, de modo que los agentes y las automatizaciones puedan resolver los detalles de los miembros del canal (nombre para mostrar, correo electrónico, rol) directamente desde Microsoft Graph.

Requisitos:

- Permiso RSC `Member.Read.Group` (ya incluido en el manifiesto recomendado)
- Para búsquedas entre equipos: permiso de aplicación de Graph `User.Read.All` con consentimiento de administrador

La acción está limitada por `channels.msteams.actions.memberInfo` (predeterminado: habilitado cuando las credenciales de Graph están disponibles).

## Contexto del historial

- `channels.msteams.historyLimit` controla cuántos mensajes recientes del canal/grupo se incluyen en el mensaje.
- Recurre a `messages.groupChat.historyLimit`. Establece `0` para desactivar (predeterminado 50).
- El historial de hilos recuperado se filtra mediante listas de permitidos de remitentes (`allowFrom` / `groupAllowFrom`), por lo que la siembra de contexto del hilo solo incluye mensajes de remitentes permitidos.
- El contexto de archivos adjuntos citados (`ReplyTo*` derivado del HTML de respuesta de Teams) se pasa actualmente tal como se recibe.
- En otras palabras, las listas permitidas controlan quién puede activar el agente; hoy solo se filtran rutas de contexto suplementario específicas.
- El historial de MD se puede limitar con `channels.msteams.dmHistoryLimit` (turnos de usuario). Invalidaciones por usuario: `channels.msteams.dms["<user_id>"].historyLimit`.

## Permisos RSC actuales de Teams (manifiesto)

Estos son los **permisos resourceSpecific existentes** en el manifiesto de nuestra aplicación de Teams. Solo se aplican dentro del equipo/chat donde está instalada la aplicación.

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

Para agregar permisos RSC a través de la CLI de Teams:

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

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
- `bots[].supportsFiles: true` es obligatorio para el manejo de archivos en el ámbito personal.
- `authorization.permissions.resourceSpecific` debe incluir lectura/escritura de canales si desea tráfico de canales.

### Actualizar una aplicación existente

Para actualizar una aplicación de Teams ya instalada (por ejemplo, para agregar permisos RSC):

```bash
# Download, edit, and re-upload the manifest
teams app manifest download <teamsAppId> manifest.json
# Edit manifest.json locally...
teams app manifest upload manifest.json <teamsAppId>
# Version is auto-bumped if content changed
```

Después de actualizar, reinstale la aplicación en cada equipo para que los nuevos permisos surtan efecto y **cierre y vuelva a abrir Teams por completo** (no solo cierre la ventana) para borrar los metadatos de la aplicación en caché.

<details>
<summary>Actualización manual del manifiesto (sin CLI)</summary>

1. Actualice su `manifest.json` con la nueva configuración
2. **Incrementar el campo `version`** (p. ej., `1.0.0` → `1.1.0`)
3. **Volver a comprimir (re-zip)** el manifiesto con los iconos (`manifest.json`, `outline.png`, `color.png`)
4. Subir el nuevo archivo zip:
   - **Centro de administración de Teams:** Aplicaciones de Teams → Administrar aplicaciones → buscar su aplicación → Cargar nueva versión
   - **Carga lateral (Sideload):** En Teams → Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación personalizada

</details>

## Capacidades: Solo RSC vs Graph

### Con **Solo RSC de Teams** (aplicación instalada, sin permisos de Graph API)

Funciona:

- Leer el contenido de **texto** de los mensajes del canal.
- Enviar contenido de **texto** de mensajes del canal.
- Recibir archivos adjuntos **personales (MD)**.

NO funciona:

- Contenido de **imágenes o archivos** de canal/grupo (la carga útil solo incluye un código auxiliar HTML).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes (más allá del evento de webhook en vivo).

### Con **RSC de Teams + Permisos de aplicación de Microsoft Graph**

Añade:

- Descarga de contenidos alojados (imágenes pegadas en los mensajes).
- Descarga de archivos adjuntos almacenados en SharePoint/OneDrive.
- Lectura del historial de mensajes de canal/chat a través de Graph.

### RSC vs Graph API

| Capacidad                        | Permisos RSC                  | Graph API                                                 |
| -------------------------------- | ----------------------------- | --------------------------------------------------------- |
| **Mensajes en tiempo real**      | Sí (vía webhook)              | No (solo sondeo)                                          |
| **Mensajes históricos**          | No                            | Sí (puede consultar el historial)                         |
| **Complejidad de configuración** | Solo manifiesto de aplicación | Requiere consentimiento de administrador + flujo de token |
| **Funciona sin conexión**        | No (debe estar ejecutándose)  | Sí (consultar en cualquier momento)                       |

**En resumen:** RSC es para la escucha en tiempo real; Graph API es para el acceso histórico. Para recuperar mensajes perdidos mientras se está sin conexión, necesita Graph API con `ChannelMessage.Read.All` (requiere consentimiento de administrador).

## Medios e historial habilitados para Graph (necesario para canales)

Si necesita imágenes/archivos en **canales** o desea obtener el **historial de mensajes**, debe habilitar los permisos de Microsoft Graph y otorgar el consentimiento del administrador.

1. En el **Registro de aplicación** de Entra ID (Azure AD), agregue permisos de **aplicación** de Microsoft Graph:
   - `ChannelMessage.Read.All` (archivos adjuntos del canal + historial)
   - `Chat.Read.All` o `ChatMessage.Read.All` (chats grupales)
2. **Otorgar consentimiento de administrador** para el inquilino.
3. Aumente la **versión del manifiesto** de la aplicación de Teams, vuelva a cargarla y **reinstale la aplicación en Teams**.
4. **Cierre y reinicie por completo Teams** para borrar los metadatos de la aplicación almacenados en caché.

**Permiso adicional para menciones de usuario:** Las @menciones de usuario funcionan de inmediato para los usuarios en la conversación. Sin embargo, si desea buscar y mencionar dinámicamente usuarios que **no están en la conversación actual**, agregue el permiso `User.Read.All` (Aplicación) y otorgue el consentimiento del administrador.

## Limitaciones conocidas

### Tiempo de espera de webhooks

Teams entrega mensajes a través de un webhook HTTP. Si el procesamiento tarda demasiado (por ejemplo, respuestas lentas del LLM), es posible que vea:

- Tiempos de espera de la puerta de enlace
- Teams reintentando el mensaje (causando duplicados)
- Respuestas perdidas

OpenClaw maneja esto respondiendo rápidamente y enviando respuestas de manera proactiva, pero las respuestas muy lentas aún pueden causar problemas.

### Formato

El formato markdown de Teams es más limitado que el de Slack o Discord:

- El formato básico funciona: **negrita**, _cursiva_, `code`, enlaces
- El formato markdown complejo (tablas, listas anidadas) puede no renderizarse correctamente
- Las tarjetas adaptables (Adaptive Cards) son compatibles para encuestas y envíos de presentaciones semánticas (ver a continuación)

## Configuración

Configuraciones clave (ver `/gateway/configuration` para patrones de canal compartido):

- `channels.msteams.enabled`: habilitar/deshabilitar el canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: credenciales del bot.
- `channels.msteams.webhook.port` (predeterminado `3978`)
- `channels.msteams.webhook.path` (predeterminado `/api/messages`)
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento)
- `channels.msteams.allowFrom`: lista de permitidos para MD (se recomiendan los ID de objeto de AAD). El asistente resuelve los nombres a ID durante la configuración cuando el acceso a Graph está disponible.
- `channels.msteams.dangerouslyAllowNameMatching`: interruptor de emergencia para volver a habilitar la coincidencia mutable de UPN/nombre para mostrar y el enrutamiento directo por nombre de equipo/canal.
- `channels.msteams.textChunkLimit`: tamaño del fragmento de texto saliente.
- `channels.msteams.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.msteams.mediaAllowHosts`: lista de permitidos para hosts de archivos adjuntos entrantes (predeterminado: dominios de Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts`: lista de permitidos para adjuntar cabeceras de autorización en reintentos de medios (por defecto, hosts de Graph + Bot Framework).
- `channels.msteams.requireMention`: requiere @mención en canales/grupos (por defecto verdadero).
- `channels.msteams.replyStyle`: `thread | top-level` (consulte [Reply Style](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle`: anulación por equipo.
- `channels.msteams.teams.<teamId>.requireMention`: anulación por equipo.
- `channels.msteams.teams.<teamId>.tools`: anulaciones de política de herramientas predeterminadas por equipo (`allow`/`deny`/`alsoAllow`) que se usan cuando falta una anulación de canal.
- `channels.msteams.teams.<teamId>.toolsBySender`: anulaciones de política de herramientas por equipo y por remitente predeterminadas (se admite el comodín `"*"`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`: anulaciones de política de herramientas por canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`: anulaciones de política de herramientas por canal y por remitente (se admite el comodín `"*"`).
- Las claves de `toolsBySender` deben usar prefijos explícitos:
  `id:`, `e164:`, `username:`, `name:` (las claves heredadas sin prefijo todavía asignan solo a `id:`).
- `channels.msteams.actions.memberInfo`: habilitar o deshabilitar la acción de información de miembro respaldada por Graph (predeterminado: habilitado cuando las credenciales de Graph están disponibles).
- `channels.msteams.authType`: tipo de autenticación — `"secret"` (predeterminado) o `"federated"`.
- `channels.msteams.certificatePath`: ruta al archivo de certificado PEM (autenticación federada + de certificado).
- `channels.msteams.certificateThumbprint`: huella digital del certificado (opcional, no se requiere para la autenticación).
- `channels.msteams.useManagedIdentity`: habilitar la autenticación de identidad administrada (modo federado).
- `channels.msteams.managedIdentityClientId`: ID de cliente para la identidad administrada asignada por el usuario.
- `channels.msteams.sharePointSiteId`: ID del sitio de SharePoint para cargar archivos en chats grupales/canales (consulte [Envío de archivos en chats grupales](#sending-files-in-group-chats)).

## Enrutamiento y Sesiones

- Las claves de sesión siguen el formato estándar de agente (consulte [/concepts/session](/es/concepts/session)):
  - Los mensajes directos comparten la sesión principal (`agent:<agentId>:<mainKey>`).
  - Los mensajes de canal/grupo utilizan el ID de conversación:
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Estilo de respuesta: hilos vs. publicaciones

Teams introdujo recientemente dos estilos de interfaz de usuario de canal sobre el mismo modelo de datos subyacente:

| Estilo                      | Descripción                                                       | `replyStyle` recomendado  |
| --------------------------- | ----------------------------------------------------------------- | ------------------------- |
| **Publicaciones** (clásico) | Los mensajes aparecen como tarjetas con respuestas en hilo debajo | `thread` (predeterminado) |
| **Hilos** (estilo Slack)    | Los mensajes fluyen linealmente, más parecido a Slack             | `top-level`               |

**El problema:** La API de Teams no expone qué estilo de interfaz de usuario utiliza un canal. Si utiliza el `replyStyle` incorrecto:

- `thread` en un canal estilo Hilos → las respuestas aparecen anidadas de forma incómoda
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

## Archivos adjuntos e Imágenes

**Limitaciones actuales:**

- **MDs:** Las imágenes y los archivos adjuntos funcionan a través de las API de archivos de bots de Teams.
- **Canales/grupos:** Los archivos adjuntos residen en el almacenamiento de M365 (SharePoint/OneDrive). La carga útil del webhook solo incluye un código auxiliar HTML, no los bytes reales del archivo. **Se requieren permisos de la API de Graph** para descargar archivos adjuntos del canal.
- Para envíos explícitos de primero el archivo, use `action=upload-file` con `media` / `filePath` / `path`; el `message` opcional se convierte en el texto/comentario acompañante, y `filename` anula el nombre cargado.

Sin permisos de Graph, los mensajes de canal con imágenes se recibirán como texto solamente (el contenido de la imagen no es accesible para el bot).
De forma predeterminada, OpenClaw solo descarga medios de nombres de host de Microsoft/Teams. Invalide esto con `channels.msteams.mediaAllowHosts` (use `["*"]` para permitir cualquier host).
Los encabezados de autorización solo se adjuntan para hosts en `channels.msteams.mediaAuthAllowHosts` (de forma predeterminada, hosts de Graph + Bot Framework). Mantenga esta lista estricta (evite sufijos multiinquilino).

## Enviar archivos en chats de grupo

Los bots pueden enviar archivos en mensajes directos (DMs) usando el flujo FileConsentCard (integrado). Sin embargo, **el envío de archivos en chats de grupo/canales** requiere una configuración adicional:

| Contexto                          | Cómo se envían los archivos                 | Configuración necesaria                         |
| --------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| **Mensajes directos (DMs)**       | FileConsentCard → usuario acepta → bot sube | Funciona de fábrica                             |
| **Chats de grupo/canales**        | Subir a SharePoint → compartir enlace       | Requiere `sharePointSiteId` + permisos de Graph |
| **Imágenes (cualquier contexto)** | Codificadas en línea en Base64              | Funciona de fábrica                             |

### Por qué los chats de grupo necesitan SharePoint

Los bots no tienen una unidad personal de OneDrive (el punto de conexión de la API de Graph `/me/drive` no funciona para identidades de aplicaciones). Para enviar archivos en chats de grupo/canales, el bot los sube a un **sitio de SharePoint** y crea un enlace para compartir.

### Configuración

1. **Agregue permisos de la API de Graph** en Entra ID (Azure AD) → Registro de aplicación:
   - `Sites.ReadWrite.All` (Aplicación) - subir archivos a SharePoint
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

| Permiso                                 | Comportamiento para compartir                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Solo `Sites.ReadWrite.All`              | Enlace para compartir en toda la organización (cualquiera en la organización puede acceder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Enlace para compartir por usuario (solo los miembros del chat pueden acceder)               |

El uso compartido por usuario es más seguro, ya que solo los participantes del chat pueden acceder al archivo. Si falta el permiso `Chat.Read.All`, el bot recurre al uso compartido en toda la organización.

### Comportamiento de respaldo

| Escenario                                                | Resultado                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| Chat de grupo + archivo + `sharePointSiteId` configurado | Subir a SharePoint, enviar enlace para compartir            |
| Chat de grupo + archivo + sin `sharePointSiteId`         | Intentar carga a OneDrive (puede fallar), enviar solo texto |
| Chat personal + archivo                                  | Flujo de FileConsentCard (funciona sin SharePoint)          |
| Cualquier contexto + imagen                              | En línea codificado en Base64 (funciona sin SharePoint)     |

### Ubicación de almacenamiento de archivos

Los archivos cargados se almacenan en una carpeta `/OpenClawShared/` en la biblioteca de documentos predeterminada del sitio de SharePoint configurado.

## Encuestas (Adaptive Cards)

OpenClaw envía encuestas de Teams como tarjetas adaptables (no hay una API nativa de encuestas de Teams).

- CLI: `openclaw message poll --channel msteams --target conversation:<id> ...`
- Los votos son registrados por la puerta de enlace en `~/.openclaw/msteams-polls.json`.
- La puerta de enlace debe permanecer en línea para registrar los votos.
- Las encuestas aún no publican resúmenes de resultados automáticamente (inspeccione el archivo de almacenamiento si es necesario).

## Tarjetas de presentación

Envíe cargas útiles de presentación semántica a usuarios o conversaciones de Teams usando la herramienta `message` o la CLI. OpenClaw las representa como tarjetas adaptables de Teams desde el contrato de presentación genérico.

El parámetro `presentation` acepta bloques semánticos. Cuando se proporciona `presentation`, el texto del mensaje es opcional.

**Herramienta de agente:**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello!" }],
  },
}
```

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello!"}]}'
```

Para obtener detalles sobre los formatos de destino, consulte [Formatos de destino](#target-formats) a continuación.

## Formatos de destino

Los destinos de MSTeams usan prefijos para distinguir entre usuarios y conversaciones:

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

# Send a presentation card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello"}]}'
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
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello" }],
  },
}
```

<Note>Sin el prefijo `user:`, los nombres se resuelven por defecto a grupo o equipo. Use siempre `user:` cuando apunte a personas por su nombre para mostrar.</Note>

## Mensajería proactiva

- Los mensajes proactivos solo son posibles **después** de que un usuario haya interactuado, porque en ese punto almacenamos las referencias de la conversación.
- Consulte `/gateway/configuration` para obtener `dmPolicy` y el control de lista de permitidos.

## IDs de equipo y canal (Error común)

El parámetro de consulta `groupId` en las URLs de Teams **NO** es el ID de equipo que se usa para la configuración. Extraiga los IDs de la ruta de la URL en su lugar:

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

- ID de equipo = segmento de ruta después de `/team/` (decodificado en URL, p. ej., `19:Bk4j...@thread.tacv2`)
- ID del canal = segmento de ruta después de `/channel/` (decodificado en URL)
- **Ignore** el parámetro de consulta `groupId`

## Canales privados

Los bots tienen soporte limitado en canales privados:

| Característica                    | Canales Estándar | Canales Privados                      |
| --------------------------------- | ---------------- | ------------------------------------- |
| Instalación del bot               | Sí               | Limitado                              |
| Mensajes en tiempo real (webhook) | Sí               | Puede no funcionar                    |
| Permisos RSC                      | Sí               | Puede comportarse de manera diferente |
| @menciones                        | Sí               | Si el bot es accesible                |
| Historial de Graph API            | Sí               | Sí (con permisos)                     |

**Soluciones alternativas si los canales privados no funcionan:**

1. Use canales estándar para las interacciones del bot
2. Use MDs: los usuarios siempre pueden enviar mensajes al bot directamente
3. Use Graph API para el acceso histórico (requiere `ChannelMessage.Read.All`)

## Solución de problemas

### Problemas comunes

- **Las imágenes no se muestran en los canales:** Faltan permisos de Graph o el consentimiento del administrador. Reinstale la aplicación de Teams y cierre y vuelva a abrir Teams por completo.
- **Sin respuestas en el canal:** se requieren menciones de forma predeterminada; establezca `channels.msteams.requireMention=false` o configure por equipo/canal.
- **Desajuste de versión (Teams aún muestra el manifiesto antiguo):** elimine y vuelva a agregar la aplicación y cierre Teams por completo para actualizar.
- **401 No autorizado desde el webhook:** Se espera al probar manualmente sin JWT de Azure: significa que el punto de conexión es accesible pero falló la autenticación. Use Azure Web Chat para probar correctamente.

### Errores de carga de manifiesto

- **"El archivo de icono no puede estar vacío":** El manifiesto hace referencia a archivos de icono que tienen 0 bytes. Cree iconos PNG válidos (32x32 para `outline.png`, 192x192 para `color.png`).
- **"webApplicationInfo.Id ya está en uso":** La aplicación aún está instalada en otro equipo/chat. Busque y desinstálela primero, o espere 5-10 minutos para la propagación.
- **"Algo salió mal" al cargar:** Cargue a través de [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) en su lugar, abra las DevTools del navegador (F12) → pestaña Red y verifique el cuerpo de la respuesta para ver el error real.
- **Error al cargar aplicación de forma local:** Intente "Cargar una aplicación en el catálogo de aplicaciones de su organización" en lugar de "Cargar una aplicación personalizada"; esto a menudo evita las restricciones de carga local.

### Los permisos RSC no funcionan

1. Verifique que `webApplicationInfo.id` coincida exactamente con el Id. de aplicación (App ID) de su bot
2. Vuelva a cargar la aplicación y reinstálela en el equipo/chat
3. Compruebe si el administrador de su organización ha bloqueado los permisos RSC
4. Confirme que está utilizando el ámbito correcto: `ChannelMessage.Read.Group` para equipos, `ChatMessage.Read.Chat` para chats de grupo

## Referencias

- [Crear Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guía de configuración de Azure Bot
- [Portal para desarrolladores de Teams](https://dev.teams.microsoft.com/apps) - crear/administrar aplicaciones de Teams
- [Esquema de manifiesto de la aplicación de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recibir mensajes de canal con RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Referencia de permisos RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Manejo de archivos de bot de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/grupo requiere Graph)
- [Mensajería proactiva](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - CLI de Teams para la gestión de bots

## Relacionado

- [Información general de canales](/es/channels) — todos los canales admitidos
- [Emparejamiento](/es/channels/pairing) — autenticación por MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento (hardening)
