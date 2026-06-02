---
summary: "Estado de soporte, capacidades y configuración del bot de Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

Estado: se admiten archivos adjuntos de texto y MD; el envío de archivos a canales/grupos requiere `sharePointSiteId` + permisos de Graph (consulte [Sending files in group chats](#sending-files-in-group-chats)). Las encuestas se envían mediante Adaptive Cards. Las acciones de mensaje exponen `upload-file` explícito para envíos priorizando archivos.

## Complemento incluido

Microsoft Teams se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que no
se requiere una instalación separada en la compilación empaquetada normal.

Si está en una versión anterior o en una instalación personalizada que excluye el complemento Teams incluido, instale el paquete npm directamente:

```bash
openclaw plugins install @openclaw/msteams
```

Use el paquete básico para seguir la etiqueta de lanzamiento oficial actual. Fije una versión exacta solo cuando necesite una instalación reproducible.

Pago local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida

El [`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) gestiona el registro del bot, la creación del manifiesto y la generación de credenciales en un solo comando.

**1. Instalar e iniciar sesión**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>La CLI de Teams está actualmente en versión preliminar. Los comandos y las marcas pueden cambiar entre versiones.</Note>

**2. Iniciar un túnel** (Teams no puede acceder a localhost)

Instale y autentique la CLI de devtunnel si aún no lo ha hecho ([guía de introducción](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)).

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>Se requiere `--allow-anonymous` porque Teams no puede autenticarse con devtunnels. Cada solicitud entrante del bot sigue siendo validada automáticamente por el SDK de Teams.</Note>

Alternativas: `ngrok http 3978` o `tailscale funnel 3978` (pero estos pueden cambiar las URL en cada sesión).

**3. Crear la aplicación**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

Este único comando:

- Crea una aplicación Entra ID (Azure AD)
- Genera un secreto de cliente
- Compila y carga un manifiesto de aplicación de Teams (con iconos)
- Registra el bot (administrado por Teams de forma predeterminada: no se necesita suscripción a Azure)

El resultado mostrará `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID` y un **Teams App ID**; anote estos para los siguientes pasos. También ofrece instalar la aplicación directamente en Teams.

**4. Configurar OpenClaw** utilizando las credenciales de la salida:

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

`teams app create` le pedirá que instale la aplicación; seleccione "Install in Teams" (Instalar en Teams). Si lo omitió, puede obtener el enlace más tarde:

```bash
teams app get <teamsAppId> --install-link
```

**6. Verificar que todo funciona**

```bash
teams app doctor <teamsAppId>
```

Esto ejecuta diagnósticos en el registro del bot, la configuración de la aplicación AAD, la validez del manifiesto y la configuración de SSO.

Para los despliegues en producción, considere el uso de [federated authentication](/es/channels/msteams#federated-authentication-certificate-plus-managed-identity) (certificado o identidad administrada) en lugar de secretos de cliente.

<Note>Los chats de grupo están bloqueados de forma predeterminada (`channels.msteams.groupPolicy: "allowlist"`). Para permitir respuestas de grupo, configure `channels.msteams.groupAllowFrom`, o use `groupPolicy: "open"` para permitir cualquier miembro (restringido por mención).</Note>

## Objetivos

- Hablar con OpenClaw mediante MDs de Teams, chats de grupo o canales.
- Mantener el enrutamiento determinista: las respuestas siempre vuelven al canal por el que llegaron.
- De forma predeterminada, adoptar un comportamiento de canal seguro (se requieren menciones a menos que se configure lo contrario).

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

- Predeterminado: `channels.msteams.dmPolicy = "pairing"`. Los remitentes desconocidos se ignoran hasta que sean aprobados.
- `channels.msteams.allowFrom` debe usar ID de objetos AAD estables o grupos de acceso de remitentes estáticos como `accessGroup:core-team`.
- No confíe en la coincidencia de UPN/nombre para mostrar para las listas de permitidos: pueden cambiar. OpenClaw deshabilita la coincidencia de nombres directa de forma predeterminada; actívela explícitamente con `channels.msteams.dangerouslyAllowNameMatching: true`.
- El asistente puede resolver nombres a identificadores mediante Microsoft Graph cuando las credenciales lo permiten.

**Acceso a grupos**

- Predeterminado: `channels.msteams.groupPolicy = "allowlist"` (bloqueado a menos que agregue `groupAllowFrom`). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté configurado.
- `channels.msteams.groupAllowFrom` controla qué remitentes o grupos de acceso de remitentes estáticos pueden activarse en chats grupales/canales (recurre a `channels.msteams.allowFrom`).
- Configure `groupPolicy: "open"` para permitir cualquier miembro (aún restringido por mención de forma predeterminada).
- Para no permitir ningún canal, configure `channels.msteams.groupPolicy: "disabled"`.

Ejemplo:

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000", "accessGroup:core-team"],
    },
  },
}
```

**Lista de permitidos de Teams + canales**

- Alcance las respuestas de grupos/canales listando los equipos y canales en `channels.msteams.teams`.
- Las claves deben usar ID de conversación de Teams estables de los enlaces de Teams, no nombres para mostrar mutables.
- Cuando `groupPolicy="allowlist"` y hay una lista de permitidos de equipos presente, solo se aceptan los equipos/canales listados (restringido por mención).
- El asistente de configuración acepta entradas `Team/Channel` y las almacena por usted.
- Al iniciar, OpenClaw resuelve los nombres de equipo/canal y de lista de permitidos de usuarios a ID (cuando los permisos de Graph lo permiten)
  y registra el mapeo; los nombres de equipo/canal no resueltos se mantienen tal como se escribieron pero se ignoran para el enrutamiento de forma predeterminada a menos que `channels.msteams.dangerouslyAllowNameMatching: true` esté habilitado.

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
2. Cree un **Azure Bot** (App ID + secreto + ID de inquilino).
3. Compile un **paquete de aplicación de Teams** que haga referencia al bot e incluya los permisos RSC a continuación.
4. Cargue/instale la aplicación de Teams en un equipo (o en el ámbito personal para MDs).
5. Configure `msteams` en `~/.openclaw/openclaw.json` (o variables de entorno) e inicie la puerta de enlace.
6. La puerta de enlace escucha el tráfico del webhook de Bot Framework en `/api/messages` de forma predeterminada.

### Paso 1: Crear Azure Bot

1. Vaya a [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Rellene la pestaña **Aspectos básicos**:

   | Campo                    | Valor                                                            |
   | ------------------------ | ---------------------------------------------------------------- |
   | **Identificador de bot** | El nombre de su bot, p. ej., `openclaw-msteams` (debe ser único) |
   | **Suscripción**          | Seleccione su suscripción de Azure                               |
   | **Grupo de recursos**    | Crear nuevo o usar existente                                     |
   | **Nivel de precios**     | **Gratis** para desarrollo/pruebas                               |
   | **Tipo de aplicación**   | **Single Tenant** (recomendado: consulte la nota a continuación) |
   | **Tipo de creación**     | **Crear nuevo Microsoft App ID**                                 |

<Warning>La creación de nuevos bots multiinquilino quedó obsoleta después del 2025-07-31. Use **Single Tenant** para nuevos bots.</Warning>

3. Haga clic en **Revisar y crear** → **Crear** (espere ~1-2 minutos)

### Paso 2: Obtener credenciales

1. Vaya al recurso de su Azure Bot → **Configuración**
2. Copie **Microsoft App ID** → este es su `appId`
3. Haga clic en **Administrar contraseña** → vaya al Registro de la aplicación
4. En **Certificados y secretos** → **Nuevo secreto de cliente** → copie el **Valor** → este es su `appPassword`
5. Vaya a **Información general** → copie el **ID de directorio (inquilino)** → este es su `tenantId`

### Paso 3: Configurar el extremo de mensajería

1. En Azure Bot → **Configuración**
2. Establezca el **Extremo de mensajería** en la URL de su webhook:
   - Producción: `https://your-domain.com/api/messages`
   - Desarrollo local: use un túnel (consulte [Local Development](#local-development-tunneling) a continuación)

### Paso 4: Habilitar el canal de Teams

1. En Azure Bot → **Canales**
2. Haga clic en **Microsoft Teams** → Configurar → Guardar
3. Acepte los Términos de servicio

### Paso 5: Crear el manifiesto de la aplicación de Teams

- Incluye una entrada `bot` con `botId = <App ID>`.
- Ámbitos: `personal`, `team`, `groupChat`.
- `supportsFiles: true` (necesario para el manejo de archivos en el ámbito personal).
- Añada permisos RSC (consulte [RSC Permissions](#current-teams-rsc-permissions-manifest)).
- Crea iconos: `outline.png` (32x32) y `color.png` (192x192).
- Comprime los tres archivos juntos: `manifest.json`, `outline.png`, `color.png`.

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

> Agregado en 2026.4.11

Para implementaciones en producción, OpenClaw admite **autenticación federada** como una alternativa más segura a los secretos de cliente. Hay dos métodos disponibles:

### Opción A: Autenticación basada en certificados

Use un certificado PEM registrado con su registro de aplicación de Entra ID.

**Configuración:**

1. Genere u obtenga un certificado (formato PEM con clave privada).
2. En Entra ID → Registro de aplicación → **Certificados y secretos** → **Certificados** → Cargar el certificado público.

**Configuración:**

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
2. Una **credencial de identidad federada** vincula la identidad administrada al registro de la aplicación de Entra ID.
3. En tiempo de ejecución, OpenClaw usa `@azure/identity` para adquirir tokens desde el endpoint IMDS de Azure (`169.254.169.254`).
4. El token se pasa al SDK de Teams para la autenticación del bot.

**Requisitos previos:**

- Infraestructura de Azure con identidad administrada habilitada (identidad de carga de trabajo de AKS, App Service, VM)
- Credencial de identidad federada creada en el registro de la aplicación de Entra ID
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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (solo para identidad asignada por el usuario)

### Configuración de la identidad de carga de trabajo de AKS

Para implementaciones de AKS que usan identidad de carga de trabajo:

1. **Habilite la identidad de carga de trabajo** en su clúster de AKS.
2. **Cree una credencial de identidad federada** en el registro de la aplicación de Entra ID:

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

5. **Asegura el acceso de red** a IMDS (`169.254.169.254`) - si usas NetworkPolicy, añade una regla de salida que permita el tráfico a `169.254.169.254/32` en el puerto 80.

### Comparación de tipos de autenticación

| Método                     | Config                                         | Pros                                       | Contras                                        |
| -------------------------- | ---------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **Secreto de cliente**     | `appPassword`                                  | Configuración sencilla                     | Se requiere rotación de secretos, menos segura |
| **Certificado**            | `authType: "federated"` + `certificatePath`    | Sin secreto compartido a través de la red  | Sobrecarga de gestión de certificados          |
| **Identidad administrada** | `authType: "federated"` + `useManagedIdentity` | Sin contraseña, sin secretos que gestionar | Se requiere infraestructura de Azure           |

**Comportamiento predeterminado:** Cuando no se establece `authType`, OpenClaw utiliza de forma predeterminada la autenticación con secreto de cliente. Las configuraciones existentes siguen funcionando sin cambios.

## Desarrollo local (túnel)

Teams no puede alcanzar `localhost`. Usa un túnel de desarrollo persistente para que tu URL se mantenga igual entre sesiones:

```bash
# One-time setup:
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
```

Alternativas: `ngrok http 3978` o `tailscale funnel 3978` (las URL pueden cambiar en cada sesión).

Si la URL de su túnel cambia, actualice el punto de conexión:

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## Probar el Bot

**Ejecutar diagnósticos:**

```bash
teams app doctor <teamsAppId>
```

Verifica el registro del bot, la aplicación AAD, el manifiesto y la configuración de SSO de una sola vez.

**Enviar un mensaje de prueba:**

1. Instala la aplicación de Teams (usa el enlace de instalación de `teams app get <id> --install-link`)
2. Buscar el bot en Teams y enviar un MD
3. Verificar los registros de la puerta de enlace para ver la actividad entrante

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

OpenClaw expone una acción `member-info` respaldada por Graph para Microsoft Teams, para que los agentes y las automatizaciones puedan resolver los detalles de los miembros del canal (nombre para mostrar, correo electrónico, rol) directamente desde Microsoft Graph.

Requisitos:

- permiso RSC `Member.Read.Group` (ya incluido en el manifiesto recomendado)
- Para búsquedas entre equipos: permiso de aplicación de Graph `User.Read.All` con consentimiento de administrador

La acción está limitada por `channels.msteams.actions.memberInfo` (predeterminado: habilitado cuando las credenciales de Graph están disponibles).

## Contexto de historial

- `channels.msteams.historyLimit` controla cuántos mensajes recientes del canal/grupo se incluyen en el prompt.
- De forma predeterminada, utiliza `messages.groupChat.historyLimit`. Establezca `0` para deshabilitar (predeterminado 50).
- El historial de hilos recuperado se filtra mediante listas de permitidos de remitentes (`allowFrom` / `groupAllowFrom`), por lo que la inicialización del contexto del hilo solo incluye mensajes de remitentes permitidos.
- El contexto de los archivos adjuntos citados (`ReplyTo*` derivado del HTML de respuesta de Teams) actualmente se pasa tal como se recibe.
- En otras palabras, las listas permitidas controlan quién puede activar el agente; hoy solo se filtran rutas de contexto suplementarias específicas.
- El historial de MD se puede limitar con `channels.msteams.dmHistoryLimit` (turnos de usuario). Invalidaciones por usuario: `channels.msteams.dms["<user_id>"].historyLimit`.

## Permisos RSC actuales de Teams (manifiesto)

Estos son los permisos **resourceSpecific existentes** en nuestro manifiesto de aplicación de Teams. Solo se aplican dentro del equipo/chat donde está instalada la aplicación.

**Para canales (ámbito de equipo):**

- `ChannelMessage.Read.Group` (Aplicación): recibir todos los mensajes del canal sin @mención
- `ChannelMessage.Send.Group` (Aplicación)
- `Member.Read.Group` (Aplicación)
- `Owner.Read.Group` (Aplicación)
- `ChannelSettings.Read.Group` (Aplicación)
- `TeamMember.Read.Group` (Aplicación)
- `TeamSettings.Read.Group` (Aplicación)

**Para chats de grupo:**

- `ChatMessage.Read.Chat` (Aplicación): recibir todos los mensajes de chat de grupo sin @mención

Para agregar permisos RSC a través de la CLI de Teams:

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## Manifiesto de Teams de ejemplo (censurado)

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
- `authorization.permissions.resourceSpecific` debe incluir lectura/escritura de canal si desea tráfico de canal.

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
2. **Incremente el campo `version`** (por ejemplo, `1.0.0` → `1.1.0`)
3. **Vuelva a comprimir (Re-zip)** el manifiesto con los iconos (`manifest.json`, `outline.png`, `color.png`)
4. Suba el nuevo archivo zip:
   - **Centro de administración de Teams:** Aplicaciones de Teams → Administrar aplicaciones → busque su aplicación → Subir nueva versión
   - **Carga lateral:** En Teams → Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación personalizada

</details>

## Capacidades: Solo RSC frente a Graph

### Con **solo Teams RSC** (aplicación instalada, sin permisos de API de Graph)

Funciona:

- Leer el contenido de **texto** de los mensajes del canal.
- Enviar contenido de **texto** de mensajes al canal.
- Recibir archivos adjuntos **personales (MD)**.

NO funciona:

- Contenido de **imágenes o archivos** de canales/grupos (la carga útil solo incluye un código auxiliar HTML).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes (más allá del evento de webhook en tiempo real).

### Con **Teams RSC + Permisos de aplicación de Microsoft Graph**

Añade:

- Descargar contenidos alojados (imágenes pegadas en los mensajes).
- Descargar archivos adjuntos almacenados en SharePoint/OneDrive.
- Leer el historial de mensajes de canales/chats a través de Graph.

### RSC frente a API de Graph

| Capacidad                        | Permisos RSC                     | API de Graph                                              |
| -------------------------------- | -------------------------------- | --------------------------------------------------------- |
| **Mensajes en tiempo real**      | Sí (vía webhook)                 | No (solo sondeo)                                          |
| **Mensajes históricos**          | No                               | Sí (puede consultar el historial)                         |
| **Complejidad de configuración** | Solo manifiesto de la aplicación | Requiere consentimiento de administrador + flujo de token |
| **Funciona sin conexión**        | No (debe estar en ejecución)     | Sí (consultar en cualquier momento)                       |

**En resumen:** RSC es para la escucha en tiempo real; Graph API es para el acceso histórico. Para ponerse al día con los mensajes perdidos mientras está desconectado, necesita Graph API con `ChannelMessage.Read.All` (requiere consentimiento de administrador).

## Medios e historial habilitados para Graph (necesario para canales)

Si necesita imágenes/archivos en **canales** o desea recuperar el **historial de mensajes**, debe habilitar los permisos de Microsoft Graph y otorgar el consentimiento del administrador.

1. En Entra ID (Azure AD) **Registro de aplicación**, agregue **Permisos de aplicación** de Microsoft Graph:
   - `ChannelMessage.Read.All` (archivos adjuntos del canal + historial)
   - `Chat.Read.All` o `ChatMessage.Read.All` (chats grupales)
2. **Otorgar consentimiento de administrador** para el inquilino.
3. Aumente la **versión del manifiesto** de la aplicación de Teams, cárguela de nuevo y **reinstale la aplicación en Teams**.
4. **Cierra completamente y vuelve a iniciar Teams** para borrar los metadatos de la aplicación en caché.

**Permiso adicional para menciones de usuario:** Las @menciones de usuario funcionan de fábrica para los usuarios en la conversación. Sin embargo, si desea buscar dinámicamente y mencionar usuarios que **no están en la conversación actual**, agregue el permiso `User.Read.All` (Aplicación) y otorgue el consentimiento del administrador.

## Limitaciones conocidas

### Tiempos de espera de webhooks

Teams entrega mensajes a través de un webhook HTTP. Si el procesamiento tarda demasiado (por ejemplo, respuestas lentas del LLM), es posible que veas:

- Tiempos de espera de la puerta de enlace
- Teams reintentando el mensaje (causando duplicados)
- Respuestas perdidas

OpenClaw maneja esto respondiendo rápidamente y enviando respuestas de manera proactiva, pero las respuestas muy lentas aún pueden causar problemas.

### Soporte de la nube y la URL del servicio de Teams

Esta ruta de Teams respaldada por SDK se valida en tiempo real para la nube pública de Microsoft Teams.

Las respuestas entrantes utilizan el contexto de turno del SDK de Teams entrante. Las operaciones proactivas fuera de contexto: envíos, ediciones, eliminaciones, tarjetas, encuestas, mensajes de consentimiento de archivos y respuestas largas en cola, utilizan la referencia de conversación almacenada `serviceUrl`. La nube pública usa por defecto el entorno de nube pública del SDK de Teams y permite referencias almacenadas en el host público del conector de Teams: `https://smba.trafficmanager.net/`.

La nube pública es la predeterminada. No necesita establecer `channels.msteams.cloud` o `channels.msteams.serviceUrl` para bots de nube pública normales.

Para las nubes de Teams que no sean públicas, establezca `cloud` y el límite proactivo coincidente cuando Microsoft publique uno:

- `channels.msteams.cloud` selecciona la predefinición de la nube del SDK de Teams para la autenticación, validación de JWT, servicios de tokens y ámbito de Graph.
- `channels.msteams.serviceUrl` selecciona el límite del punto de conexión del Bot Connector utilizado para validar las referencias de conversación almacenadas antes de envíos, ediciones, eliminaciones, tarjetas, encuestas, mensajes de consentimiento de archivos y respuestas largas en cola proactivas. Es necesario para las nubes del SDK de USGov y DoD. Para China/21Vianet, OpenClaw utiliza la predefinición `China` del SDK y acepta las URL de servicio almacenadas/configuradas solo en hosts del canal de Bot Framework de Azure China.

Microsoft publica los puntos de conexión globales proactivos del Bot Connector en la sección [Create the conversation](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages?tabs=dotnet#create-the-conversation) de la documentación de mensajería proactiva de Teams. Use el `serviceUrl` de la actividad entrante cuando esté disponible; si necesita un punto de conexión proactivo global, use la tabla de Microsoft.

| Entorno de Teams | Configuración de OpenClaw                                                              | Proactivo `serviceUrl`                             |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Público          | no se necesita configuración de nube/serviceUrl                                        | `https://smba.trafficmanager.net/teams`            |
| GCC              | establezca `serviceUrl`; no existe una predefinición de nube del SDK de Teams separada | `https://smba.infra.gcc.teams.microsoft.com/teams` |
| GCC High         | `cloud: "USGov"` + `serviceUrl`                                                        | `https://smba.infra.gov.teams.microsoft.us/teams`  |
| DoD              | `cloud: "USGovDoD"` + `serviceUrl`                                                     | `https://smba.infra.dod.teams.microsoft.us/teams`  |
| China/21Vianet   | `cloud: "China"`                                                                       | use el `serviceUrl` de la actividad entrante       |

Ejemplo para GCC, donde Microsoft documenta una URL de servicio proactiva separada, pero el SDK de Teams no expone una predefinición de nube GCC separada:

```json
{
  "channels": {
    "msteams": {
      "serviceUrl": "https://smba.infra.gcc.teams.microsoft.com/teams"
    }
  }
}
```

Ejemplo para GCC High:

```json
{
  "channels": {
    "msteams": {
      "cloud": "USGov",
      "serviceUrl": "https://smba.infra.gov.teams.microsoft.us/teams"
    }
  }
}
```

`channels.msteams.serviceUrl` está restringido a los hosts del Bot Connector de Microsoft Teams compatibles. Cuando se configura una URL de servicio, OpenClaw verifica que la `serviceUrl` de la conversación almacenada use el mismo host antes de que se ejecuten envíos, ediciones, eliminaciones, tarjetas, encuestas o respuestas largas en cola proactivos. Con la configuración predeterminada de la nube pública, OpenClaw falla de forma segura si una conversación almacenada apunta fuera del host público del Conector de Teams. Reciba un mensaje nuevo de la conversación después de cambiar la configuración de la nube/URL del servicio para que la referencia de la conversación almacenada esté actualizada.

China/21Vianet no tiene una URL global proactiva `smba` separada en la tabla de endpoints proactivos de Teams de Microsoft. Configure `cloud: "China"` para que el SDK de Teams use los endpoints de autenticación, token y JWT de Azure China. Los envíos proactivos entonces requieren una referencia de conversación almacenada de una actividad de entrada de Teams China, o una URL de servicio configurada explícitamente, en el límite del canal del Bot Framework de Azure China (`*.botframework.azure.cn`). Los auxiliares de Teams respaldados por Graph están deshabilitados actualmente para `cloud: "China"` hasta que OpenClaw enrute las solicitudes de Graph a través del endpoint de Graph de Azure China.

### Formato

El formato de Markdown de Teams es más limitado que el de Slack o Discord:

- El formato básico funciona: **negrita**, _cursiva_, `code`, enlaces
- El formato complejo (tablas, listas anidadas) puede no representarse correctamente
- Las tarjetas adaptables (Adaptive Cards) son compatibles para encuestas y envíos de presentación semántica (ver más abajo)

## Configuración

Configuraciones clave (ver `/gateway/configuration` para patrones de canal compartidos):

- `channels.msteams.enabled`: habilitar/deshabilitar el canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: credenciales del bot.
- `channels.msteams.cloud`: entorno de nube del SDK de Teams (`Public`, `USGov`, `USGovDoD` o `China`; por defecto `Public`). Establézcalo con `serviceUrl` para nubes de SDK de USGov/DoD; China utiliza la preconfiguración del SDK y las referencias de conversación almacenadas de Azure China Bot Framework, con las asistentes respaldados por Graph deshabilitados hasta que se implemente el enrutamiento de Azure China Graph.
- `channels.msteams.serviceUrl`: límite de la URL del servicio Bot Connector para operaciones proactivas del SDK. La nube pública utiliza el valor predeterminado del SDK; establézcalo para GCC (`https://smba.infra.gcc.teams.microsoft.com/teams`), GCC High o DoD. China acepta los hosts del canal de Azure China Bot Framework cuando la referencia de conversación almacenada proviene de Teams operado por 21Vianet.
- `channels.msteams.webhook.port` (por defecto `3978`)
- `channels.msteams.webhook.path` (por defecto `/api/messages`)
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled` (por defecto: emparejamiento)
- `channels.msteams.allowFrom`: lista de permitidos de DM (se recomiendan los IDs de objetos de AAD). El asistente resuelve los nombres a IDs durante la configuración cuando el acceso a Graph está disponible.
- `channels.msteams.dangerouslyAllowNameMatching`: interruptor de emergencia para volver a habilitar la coincidencia mutable de UPN/nombre para mostrar y el enrutamiento directo de nombre de equipo/canal.
- `channels.msteams.textChunkLimit`: tamaño del fragmento de texto saliente.
- `channels.msteams.chunkMode`: `length` (por defecto) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.msteams.mediaAllowHosts`: lista de permitidos para hosts de archivos adjuntos entrantes (por defecto dominios de Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts`: lista de permitidos para adjuntar cabeceras de Autorización en reintentos de medios (por defecto hosts de Graph + Bot Framework).
- `channels.msteams.requireMention`: requerir @mención en canales/grupos (por defecto verdadero).
- `channels.msteams.replyStyle`: `thread | top-level` (consulte [Reply Style](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle`: anulación por equipo.
- `channels.msteams.teams.<teamId>.requireMention`: anulación por equipo.
- `channels.msteams.teams.<teamId>.tools`: anulaciones predeterminadas de la política de herramientas por equipo (`allow`/`deny`/`alsoAllow`) utilizadas cuando falta una anulación de canal.
- `channels.msteams.teams.<teamId>.toolsBySender`: anulaciones predeterminadas de la política de herramientas por equipo y por remitente (se admite el comodín `"*"`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: anulación por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`: anulaciones de la política de herramientas por canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`: anulaciones de la política de herramientas por canal y por remitente (se admite el comodín `"*"`).
- Las claves `toolsBySender` deben usar prefijos explícitos:
  `channel:`, `id:`, `e164:`, `username:`, `name:` (las claves heredadas sin prefijo todavía se asignan solo a `id:`).
- `channels.msteams.actions.memberInfo`: habilitar o deshabilitar la acción de información de miembro respaldada por Graph (predeterminado: habilitado cuando están disponibles las credenciales de Graph).
- `channels.msteams.authType`: tipo de autenticación - `"secret"` (predeterminado) o `"federated"`.
- `channels.msteams.certificatePath`: ruta al archivo de certificado PEM (federado + autenticación de certificado).
- `channels.msteams.certificateThumbprint`: huella digital del certificado (opcional, no necesario para la autenticación).
- `channels.msteams.useManagedIdentity`: habilitar la autenticación de identidad administrada (modo federado).
- `channels.msteams.managedIdentityClientId`: ID de cliente para la identidad administrada asignada por el usuario.
- `channels.msteams.sharePointSiteId`: ID del sitio de SharePoint para cargar archivos en chats grupales/canales (consulte [Sending files in group chats](#sending-files-in-group-chats)).

## Enrutamiento y sesiones

- Las claves de sesión siguen el formato estándar de agente (consulte [/concepts/session](/es/concepts/session)):
  - Los mensajes directos comparten la sesión principal (`agent:<agentId>:<mainKey>`).
  - Los mensajes de canal/grupo usan el id de conversación:
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

### Precedencia de resolución

Cuando el bot envía una respuesta a un canal, `replyStyle` se resuelve desde la invalidación más específica hasta el valor predeterminado. El primer valor que no sea `undefined` gana:

1. **Por canal** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **Por equipo** — `channels.msteams.teams.<teamId>.replyStyle`
3. **Global** — `channels.msteams.replyStyle`
4. **Predeterminado implícito** — derivado de `requireMention`:
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

Si establece `requireMention: false` globalmente sin un `replyStyle` explícito, las menciones en los canales estilo Publicaciones aparecerán como publicaciones de nivel superior incluso cuando el mensaje entrante fue una respuesta en hilo. Fije `replyStyle: "thread"` a nivel global, de equipo o de canal para evitar sorpresas.

### Preservación del contexto del hilo

Cuando `replyStyle: "thread"` está en vigor y el bot fue mencionado (@mentioned) desde dentro de un hilo del canal, OpenClaw vuelve a adjuntar la raíz del hilo original a la referencia de conversación saliente (`19:…@thread.tacv2;messageid=<root>`) para que la respuesta aterrice dentro del mismo hilo. Esto es válido tanto para envíos en vivo (en turno) como para envíos proactivos realizados después de que el contexto de turno del Bot Framework haya caducado (por ejemplo, agentes de larga duración, respuestas a llamadas de herramientas en cola a través de `mcp__openclaw__message`).

La raíz del hilo se toma de la `threadId` almacenada en la referencia de conversación. Las referencias almacenadas más antiguas que preceden a `threadId` vuelven a `activityId` (cualquier actividad entrante que haya iniciado la conversación por última vez), por lo que las implementaciones existentes siguen funcionando sin necesidad de reinicio.

Cuando `replyStyle: "top-level"` está en vigor, las entradas de hilos de canal se responden intencionalmente como nuevas publicaciones de nivel superior; no se adjunta ningún sufijo de hilo. Este es el comportamiento correcto para los canales de estilo Threads; si ve publicaciones de nivel superior donde esperaba respuestas en hilo, su `replyStyle` está configurado incorrectamente para ese canal.

## Adjuntos e imágenes

**Limitaciones actuales:**

- **MDs (Mensajes directos):** Las imágenes y los adjuntos de archivos funcionan a través de las APIs de archivos de bots de Teams.
- **Canales/grupos:** Los adjuntos residen en el almacenamiento de M365 (SharePoint/OneDrive). El payload del webhook solo incluye un código auxiliar HTML, no los bytes reales del archivo. **Se requieren permisos de la API de Graph** para descargar los adjuntos del canal.
- Para envíos explícitos de archivo primero, use `action=upload-file` con `media` / `filePath` / `path`; el `message` opcional se convierte en el texto/comentario acompañante, y `filename` anula el nombre cargado.

Sin permisos de Graph, los mensajes del canal con imágenes se recibirán como solo texto (el contenido de la imagen no es accesible para el bot).
Por defecto, OpenClaw solo descarga medios de nombres de host de Microsoft/Teams. Anule esto con `channels.msteams.mediaAllowHosts` (use `["*"]` para permitir cualquier host).
Los encabezados de autorización solo se adjuntan para los hosts en `channels.msteams.mediaAuthAllowHosts` (por defecto son hosts de Graph + Bot Framework). Mantenga esta lista estricta (evite sufijos multiinquilino).

## Enviar archivos en chats de grupo

Los bots pueden enviar archivos en mensajes directos (DMs) usando el flujo FileConsentCard (integrado). Sin embargo, **el envío de archivos en chats de grupo/canales** requiere una configuración adicional:

| Contexto                          | Cómo se envían los archivos                  | Configuración necesaria                         |
| --------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| **Mensajes directos (DMs)**       | FileConsentCard → usuario acepta → bot carga | Funciona de fábrica                             |
| **Chats de grupo/canales**        | Cargar a SharePoint → compartir enlace       | Requiere `sharePointSiteId` + permisos de Graph |
| **Imágenes (cualquier contexto)** | Codificadas en Base64 en línea               | Funciona de fábrica                             |

### Por qué los chats de grupo necesitan SharePoint

Los bots no tienen una unidad personal de OneDrive (el punto final de la API de Graph `/me/drive` no funciona para identidades de aplicación). Para enviar archivos en chats de grupo/canales, el bot los carga en un **sitio de SharePoint** y crea un enlace para compartir.

### Configuración

1. **Agregar permisos de la API de Graph** en Entra ID (Azure AD) → Registro de aplicación:
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

El uso compartido por usuario es más seguro, ya que solo los participantes del chat pueden acceder al archivo. Si falta el permiso `Chat.Read.All`, el bot vuelve al uso compartido en toda la organización.

### Comportamiento de reserva

| Escenario                                                | Resultado                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| Chat de grupo + archivo + `sharePointSiteId` configurado | Cargar a SharePoint, enviar enlace para compartir             |
| Chat de grupo + archivo + sin `sharePointSiteId`         | Intentar cargar en OneDrive (puede fallar), enviar solo texto |
| Chat personal + archivo                                  | Flujo de FileConsentCard (funciona sin SharePoint)            |
| Cualquier contexto + imagen                              | En línea codificado en Base64 (funciona sin SharePoint)       |

### Ubicación de almacenamiento de archivos

Los archivos cargados se almacenan en una carpeta `/OpenClawShared/` en la biblioteca de documentos predeterminada del sitio de SharePoint configurado.

## Encuestas (Adaptive Cards)

OpenClaw envía encuestas de Teams como Adaptive Cards (no hay una API de encuestas nativa de Teams).

- CLI: `openclaw message poll --channel msteams --target conversation:<id> ...`
- Los votos son registrados por la puerta de enlace en el SQLite del estado del complemento de OpenClaw bajo `state/openclaw.sqlite`.
- Los archivos `msteams-polls.json` existentes se importan una vez cuando se inicia el complemento MSTeams.
- La puerta de enlace debe permanecer en línea para registrar los votos.
- Las encuestas aún no publican resúmenes de resultados automáticamente y aún no hay una CLI de resultados de encuestas compatible.

## Tarjetas de presentación

Envíe cargas útiles de presentación semántica a usuarios o conversaciones de Teams utilizando la herramienta `message`, la CLI o la entrega de respuesta normal. OpenClaw las representa como tarjetas adaptables de Teams (Teams Adaptive Cards) a partir del contrato de presentación genérico.

El parámetro `presentation` acepta bloques semánticos. Cuando se proporciona `presentation`, el texto del mensaje es opcional. Los botones se representan como acciones de envío o URL de tarjeta adaptable. Los menús de selección aún no son nativos en el renderizador de Teams, por lo que OpenClaw los degrada a texto legible antes de la entrega.

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

<Note>Sin el prefijo `user:`, los nombres se resuelven por defecto a grupo o equipo. Use siempre `user:` cuando dirija mensajes a personas por su nombre para mostrar.</Note>

## Mensajería proactiva

- Los mensajes proactivos solo son posibles **después** de que un usuario haya interactuado, ya que almacenamos las referencias de conversación en ese momento.
- Consulte `/gateway/configuration` para `dmPolicy` y el control de acceso mediante lista blanca (allowlist gating).

## ID de equipo y canal (Error común)

El parámetro de consulta `groupId` en las URL de Teams **NO** es el ID del equipo utilizado para la configuración. Extraiga los IDs de la ruta de la URL en su lugar:

**URL de equipo:**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**URL de canal:**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Para configuración:**

- Clave de equipo = segmento de ruta después de `/team/` (decodificado por URL, p. ej., `19:Bk4j...@thread.tacv2`%; los inquilinos antiguos pueden mostrar `@thread.skype`, que también es válido)
- Clave de canal = segmento de ruta después de `/channel/` (decodificado por URL)
- **Ignore** el parámetro de consulta `groupId` para el enrutamiento de OpenClaw. Es el ID de grupo de Microsoft Entra, no el ID de conversación de Bot Framework que se usa en las actividades entrantes de Teams.

## Canales privados

Los bots tienen compatibilidad limitada en los canales privados:

| Característica                    | Canales estándar | Canales privados                      |
| --------------------------------- | ---------------- | ------------------------------------- |
| Instalación del bot               | Sí               | Limitado                              |
| Mensajes en tiempo real (webhook) | Sí               | Puede no funcionar                    |
| Permisos RSC                      | Sí               | Puede comportarse de manera diferente |
| @menciones                        | Sí               | Si el bot es accesible                |
| Historial de Graph API            | Sí               | Sí (con permisos)                     |

**Soluciones alternativas si los canales privados no funcionan:**

1. Usar canales estándar para las interacciones del bot
2. Usar MD: los usuarios siempre pueden enviar un mensaje al bot directamente
3. Usar Graph API para el acceso histórico (requiere `ChannelMessage.Read.All`)

## Solución de problemas

### Problemas comunes

- **Las imágenes no se muestran en los canales:** Faltan permisos de Graph o el consentimiento del administrador. Reinstale la aplicación de Teams y cierre y vuelva a abrir Teams por completo.
- **Sin respuestas en el canal:** de manera predeterminada, se requieren menciones; configure `channels.msteams.requireMention=false` o configure por equipo/canal.
- **Discrepancia de versión (Teams aún muestra el manifiesto antiguo):** elimine + vuelva a agregar la aplicación y cierre Teams por completo para actualizar.
- **401 Unauthorized desde el webhook:** Se espera al probar manualmente sin el JWT de Azure; significa que el punto de conexión es accesible pero falló la autenticación. Use Azure Web Chat para probar correctamente.

### Errores de carga de manifiesto

- **"Icon file cannot be empty":** El manifiesto hace referencia a archivos de icono que tienen 0 bytes. Cree iconos PNG válidos (32x32 para `outline.png`, 192x192 para `color.png`).
- **"webApplicationInfo.Id already in use":** La aplicación aún está instalada en otro equipo/chat. Busque y desinstálela primero, o espere de 5 a 10 minutos para la propagación.
- **"Something went wrong" al cargar:** Cargue a través de [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) en su lugar, abra las DevTools del navegador (F12) → pestaña Network y verifique el cuerpo de la respuesta para ver el error real.
- **Error de carga lateral (sideload):** Intente "Upload an app to your org's app catalog" en lugar de "Upload a custom app": esto a menudo evita las restricciones de carga lateral.

### Permisos RSC no funcionan

1. Verifique que `webApplicationInfo.id` coincida exactamente con el ID de aplicación de su bot
2. Vuelva a cargar la aplicación y reinstálela en el equipo/chat
3. Compruebe si el administrador de su organización ha bloqueado los permisos RSC
4. Confirme que está utilizando el ámbito correcto: `ChannelMessage.Read.Group` para equipos, `ChatMessage.Read.Chat` para chats de grupo

## Referencias

- [Crear Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - guía de configuración de Azure Bot
- [Portal para desarrolladores de Teams](https://dev.teams.microsoft.com/apps) - crear/gestionar aplicaciones de Teams
- [Esquema de manifiesto de la aplicación de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recibir mensajes de canal con RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Referencia de permisos RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Manejo de archivos de bots de Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/grupo requiere Graph)
- [Mensajería proactiva](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - CLI de Teams para la gestión de bots

## Relacionado

- [Descripción general de canales](/es/channels) - todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) - autenticación por MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) - comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) - enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) - modelo de acceso y endurecimiento
