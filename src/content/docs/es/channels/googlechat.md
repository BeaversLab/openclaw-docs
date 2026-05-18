---
summary: "Estado de soporte, capacidades y configuración de la aplicación de Google Chat"
read_when:
  - Working on Google Chat channel features
title: "Google Chat"
---

Estado: complemento descargable para MDs y espacios a través de webhooks de la API de Google Chat (solo HTTP).

## Instalar

Instale Google Chat antes de configurar el canal:

```bash
openclaw plugins install @openclaw/googlechat
```

Copia local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/googlechat-plugin
```

## Configuración rápida (principiante)

1. Cree un proyecto de Google Cloud y habilite la **Google Chat API**.
   - Ir a: [Credenciales de la API de Google Chat](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - Habilite la API si aún no está habilitada.
2. Cree una **Service Account** (Cuenta de servicio):
   - Presione **Create Credentials** > **Service Account**.
   - Póngale el nombre que desee (por ejemplo, `openclaw-chat`).
   - Deje los permisos en blanco (presione **Continue**).
   - Deje los principales con acceso en blanco (presione **Done**).
3. Cree y descargue la **JSON Key** (Clave JSON):
   - En la lista de cuentas de servicio, haga clic en la que acaba de crear.
   - Vaya a la pestaña **Keys**.
   - Haga clic en **Add Key** > **Create new key**.
   - Seleccione **JSON** y presione **Create**.
4. Almacene el archivo JSON descargado en su host de puerta de enlace (por ejemplo, `~/.openclaw/googlechat-service-account.json`).
5. Cree una aplicación de Google Chat en la [Configuración de Chat de Google Cloud Console](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat):
   - Rellene la **Application info** (Información de la aplicación):
     - **App name**: (por ejemplo, `OpenClaw`)
     - **Avatar URL**: (por ejemplo, `https://openclaw.ai/logo.png`)
     - **Description**: (por ejemplo, `Personal AI Assistant`)
   - Habilite las **Interactive features** (Características interactivas).
   - En **Functionality** (Funcionalidad), marque **Join spaces and group conversations** (Unirse a espacios y conversaciones grupales).
   - En **Connection settings** (Configuración de conexión), seleccione **HTTP endpoint URL**.
   - En **Triggers** (Disparadores), seleccione **Use a common HTTP endpoint URL for all triggers** y configúrelo en la URL pública de su puerta de enlace seguida de `/googlechat`.
     - _Consejo: Ejecute `openclaw status` para encontrar la URL pública de su puerta de enlace._
   - En **Visibility** (Visibilidad), marque **Make this Chat app available to specific people and groups in `<Your Domain>`** (Hacer disponible esta aplicación de Chat para personas y grupos específicos en).
   - Ingrese su dirección de correo electrónico (por ejemplo, `user@example.com`) en el cuadro de texto.
   - Haga clic en **Save** en la parte inferior.
6. **Habilitar el estado de la aplicación**:
   - Después de guardar, **actualice la página**.
   - Busque la sección **App status** (Estado de la aplicación) (generalmente cerca de la parte superior o inferior después de guardar).
   - Cambia el estado a **Live - available to users**.
   - Haz clic en **Save** nuevamente.
7. Configura OpenClaw con la ruta de la cuenta de servicio + audiencia del webhook:
   - Env: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - O configuración: `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`.
8. Establece el tipo de audiencia del webhook + valor (coincide con la configuración de tu aplicación de Chat).
9. Inicia la puerta de enlace (gateway). Google Chat enviará un POST a tu ruta de webhook.

## Agregar a Google Chat

Una vez que la puerta de enlace se esté ejecutando y tu correo electrónico se haya agregado a la lista de visibilidad:

1. Ir a [Google Chat](https://chat.google.com/).
2. Haz clic en el icono **+** (más) junto a **Direct Messages**.
3. En la barra de búsqueda (donde normalmente agregas personas), escribe el **App name** que configuraste en Google Cloud Console.
   - **Nota**: El bot _not_ aparecerá en la lista de navegación de "Marketplace" porque es una aplicación privada. Debes buscarlo por nombre.
4. Selecciona tu bot de los resultados.
5. Haz clic en **Add** o **Chat** para iniciar una conversación 1:1.
6. Envía "Hello" para activar el asistente.

## URL pública (Solo Webhook)

Los webhooks de Google Chat requieren un endpoint HTTPS público. Por seguridad, **expón solo la ruta `/googlechat`** a Internet. Mantén el panel de OpenClaw y otros endpoints confidenciales en tu red privada.

### Opción A: Tailscale Funnel (Recomendado)

Usa Tailscale Serve para el panel privado y Funnel para la ruta pública del webhook. Esto mantiene `/` privado mientras expone solo `/googlechat`.

1. **Verifica a qué dirección está vinculada tu puerta de enlace:**

   ```bash
   ss -tlnp | grep 18789
   ```

   Toma nota de la dirección IP (p. ej., `127.0.0.1`, `0.0.0.0` o tu IP de Tailscale como `100.x.x.x`).

2. **Exponer el panel solo a la red tailnet (puerto 8443):**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **Exponer solo la ruta del webhook públicamente:**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **Autorizar el nodo para el acceso Funnel:**
   Si se solicita, visita la URL de autorización que se muestra en la salida para habilitar Funnel para este nodo en tu política de tailnet.

5. **Verificar la configuración:**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

Tu URL pública de webhook será:
`https://<node-name>.<tailnet>.ts.net/googlechat`

Tu panel privado permanece solo para la tailnet:
`https://<node-name>.<tailnet>.ts.net:8443/`

Usa la URL pública (sin `:8443`) en la configuración de la aplicación de Google Chat.

> Nota: Esta configuración persiste después de reiniciar. Para eliminarla más tarde, ejecuta `tailscale funnel reset` y `tailscale serve reset`.

### Opción B: Proxy inverso (Caddy)

Si utiliza un proxy inverso como Caddy, Configure solo el proxy de la ruta específica:

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

Con esta configuración, cualquier solicitud a `your-domain.com/` se ignorará o devolverá como 404, mientras que `your-domain.com/googlechat` se enruta de forma segura a OpenClaw.

### Opción C: Túnel de Cloudflare

Configure las reglas de ingreso de su túnel para enrutar solo la ruta del webhook:

- **Ruta**: `/googlechat` -> `http://localhost:18789/googlechat`
- **Regla predeterminada**: HTTP 404 (No encontrado)

## Cómo funciona

1. Google Chat envía publicaciones POST de webhook a la puerta de enlace. Cada solicitud incluye un encabezado `Authorization: Bearer <token>`.
   - OpenClaw verifica la autenticación del portador antes de leer/analizar los cuerpos completos del webhook cuando el encabezado está presente.
   - Las solicitudes del complemento de Google Workspace que llevan `authorizationEventObject.systemIdToken` en el cuerpo son compatibles a través de un presupuesto de cuerpo previo a la autenticación más estricto.
2. OpenClaw verifica el token contra el `audienceType` + `audience` configurado:
   - `audienceType: "app-url"` → la audiencia es su URL de webhook HTTPS.
   - `audienceType: "project-number"` → la audiencia es el número de proyecto de Cloud.
3. Los mensajes se enrutan por espacio:
   - Los MD utilizan la clave de sesión `agent:<agentId>:googlechat:direct:<spaceId>`.
   - Los espacios utilizan la clave de sesión `agent:<agentId>:googlechat:group:<spaceId>`.
4. El acceso a MD es emparejamiento por defecto. Los remitentes desconocidos reciben un código de emparejamiento; apruebe con:
   - `openclaw pairing approve googlechat <code>`
5. Los espacios grupales requieren una mención @ por defecto. Use `botUser` si la detección de menciones necesita el nombre de usuario de la aplicación.

## Objetivos

Utilice estos identificadores para la entrega y las listas de permitidos:

- Mensajes directos: `users/<userId>` (recomendado).
- El correo electrónico sin procesar `name@example.com` es mutable y solo se usa para la coincidencia directa de listas de permitidos cuando `channels.googlechat.dangerouslyAllowNameMatching: true`.
- Obsoleto: `users/<email>` se trata como un ID de usuario, no como una lista de permitidos de correo electrónico.
- Espacios: `spaces/<spaceId>`.

## Aspectos destacados de la configuración

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // or serviceAccountRef: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; helps mention detection
      allowBots: false,
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          enabled: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Short answers only.",
        },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

Notas:

- Las credenciales de la cuenta de servicio también se pueden pasar en línea con `serviceAccount` (cadena JSON).
- También se admite `serviceAccountRef` (env/archivo SecretRef), incluidas las referencias por cuenta bajo `channels.googlechat.accounts.<id>.serviceAccountRef`.
- La ruta predeterminada del webhook es `/googlechat` si no se establece `webhookPath`.
- `dangerouslyAllowNameMatching` vuelve a activar la coincidencia de principales de correo electrónico mutable para listas de permitidos (modo de compatibilidad de emergencia).
- Las reacciones están disponibles a través de la herramienta `reactions` y `channels action` cuando `actions.reactions` está habilitado.
- Las acciones de mensaje exponen `send` para texto y `upload-file` para envíos de adjuntos explícitos. `upload-file` acepta `media` / `filePath` / `path` más `message` opcional, `filename`, y orientación de hilos.
- `typingIndicator` admite `none`, `message` (predeterminado) y `reaction` (la reacción requiere OAuth de usuario).
- Los adjuntos se descargan a través de la API de Chat y se almacenan en la canalización de medios (el tamaño está limitado por `mediaMaxMb`).
- Los mensajes de Google Chat creados por bots se ignoran de forma predeterminada. Si configura intencionalmente `allowBots: true`, los mensajes aceptados creados por bots usan [protección compartida contra bucles de bots](/es/channels/bot-loop-protection). Configure `channels.defaults.botLoopProtection` y luego anule con `channels.googlechat.botLoopProtection` o `channels.googlechat.groups.<space>.botLoopProtection` cuando un espacio necesite un presupuesto diferente.

Detalles de referencia de secretos: [Gestión de secretos](/es/gateway/secrets).

## Solución de problemas

### 405 Método no permitido

Si el Explorador de registros de Google Cloud muestra errores como:

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

Esto significa que el controlador de webhook no está registrado. Causas comunes:

1. **Canal no configurado**: Falta la sección `channels.googlechat` en su configuración. Verifique con:

   ```bash
   openclaw config get channels.googlechat
   ```

   Si devuelve "Config path not found", agregue la configuración (consulte [Aspectos destacados de la configuración](#config-highlights)).

2. **Complemento no habilitado**: Verifique el estado del complemento:

   ```bash
   openclaw plugins list | grep googlechat
   ```

   Si muestra "disabled", agregue `plugins.entries.googlechat.enabled: true` a su configuración.

3. **Gateway no reiniciado**: Después de agregar la configuración, reinicie el gateway:

   ```bash
   openclaw gateway restart
   ```

Verifique que el canal se esté ejecutando:

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### Otros problemas

- Verifique `openclaw channels status --probe` para ver si hay errores de autenticación o falta de configuración de audiencia.
- Si no llegan mensajes, confirme la URL del webhook de la aplicación de Chat y las suscripciones de eventos.
- Si el bloqueo de menciones impide las respuestas, establezca `botUser` en el nombre del recurso de usuario de la aplicación y verifique `requireMention`.
- Use `openclaw logs --follow` mientras envía un mensaje de prueba para ver si las solicitudes llegan al gateway.

Documentos relacionados:

- [Configuración del gateway](/es/gateway/configuration)
- [Seguridad](/es/gateway/security)
- [Reacciones](/es/tools/reactions)

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de MD
- [Grupos](/es/channels/groups) — comportamiento del chat en grupo y bloqueo de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
