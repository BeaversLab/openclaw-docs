---
summary: "Estado de soporte, capacidades y configuración de la aplicación de Google Chat"
read_when:
  - Working on Google Chat channel features
title: "Google Chat"
---

Estado: listo para MDs y espacios a través de webhooks de la API de Google Chat (solo HTTP).

## Configuración rápida (principiante)

1. Cree un proyecto de Google Cloud y habilite la **Google Chat API**.
   - Vaya a: [Credenciales de la API de Google Chat](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - Habilite la API si aún no está habilitada.
2. Cree una **cuenta de servicio**:
   - Presione **Create Credentials** > **Service Account**.
   - Póngale el nombre que desee (p. ej., `openclaw-chat`).
   - Deje los permisos en blanco (presione **Continue**).
   - Deje los principales con acceso en blanco (presione **Done**).
3. Cree y descargue la **JSON Key**:
   - En la lista de cuentas de servicio, haga clic en la que acaba de crear.
   - Vaya a la pestaña **Keys**.
   - Haga clic en **Add Key** > **Create new key**.
   - Seleccione **JSON** y presione **Create**.
4. Guarde el archivo JSON descargado en su host de puerta de enlace (p. ej., `~/.openclaw/googlechat-service-account.json`).
5. Cree una aplicación de Google Chat en la [Configuración de Chat de Google Cloud Console](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat):
   - Rellene la **Application info**:
     - **App name**: (p. ej. `OpenClaw`)
     - **Avatar URL**: (p. ej. `https://openclaw.ai/logo.png`)
     - **Description**: (p. ej. `Personal AI Assistant`)
   - Habilite **Interactive features**.
   - En **Functionality**, marque **Join spaces and group conversations**.
   - En **Connection settings**, seleccione **HTTP endpoint URL**.
   - En **Triggers**, seleccione **Use a common HTTP endpoint URL for all triggers** y configúrelo con la URL pública de su puerta de enlace seguida de `/googlechat`.
     - _Consejo: Ejecute `openclaw status` para encontrar la URL pública de su puerta de enlace._
   - En **Visibility**, marque **Make this Chat app available to specific people and groups in `<Your Domain>`**.
   - Ingrese su dirección de correo electrónico (p. ej. `user@example.com`) en el cuadro de texto.
   - Haga clic en **Save** en la parte inferior.
6. **Habilitar el estado de la aplicación**:
   - Después de guardar, **actualice la página**.
   - Busque la sección **App status** (generalmente cerca de la parte superior o inferior después de guardar).
   - Cambie el estado a **Live - available to users**.
   - Haga clic en **Save** nuevamente.
7. Configure OpenClaw con la ruta de la cuenta de servicio + audiencia del webhook:
   - Env: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - O config: `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`.
8. Configure el tipo de audiencia del webhook + valor (coincide con la configuración de su aplicación de Chat).
9. Inicie la puerta de enlace. Google Chat enviará una solicitud POST a la ruta de su webhook.

## Agregar a Google Chat

Una vez que la puerta de enlace se esté ejecutando y su correo electrónico se haya agregado a la lista de visibilidad:

1. Vaya a [Google Chat](https://chat.google.com/).
2. Haga clic en el icono **+** (más) junto a **Mensajes directos**.
3. En la barra de búsqueda (donde normalmente agrega personas), escriba el **Nombre de la aplicación** que configuró en la Consola de Google Cloud.
   - **Nota**: El bot _no_ aparecerá en la lista de navegación del "Marketplace" porque es una aplicación privada. Debe buscarlo por su nombre.
4. Seleccione su bot de los resultados.
5. Haga clic en **Agregar** o **Chat** para iniciar una conversación 1:1.
6. Envíe "Hello" para activar el asistente.

## URL pública (Solo webhook)

Los webhooks de Google Chat requieren un endpoint HTTPS público. Por seguridad, **exponga solo la ruta `/googlechat`** a Internet. Mantenga el panel de OpenClaw y otros endpoints confidenciales en su red privada.

### Opción A: Tailscale Funnel (Recomendado)

Use Tailscale Serve para el panel privado y Funnel para la ruta pública del webhook. Esto mantiene `/` privado mientras expone solo `/googlechat`.

1. **Verifique a qué dirección está vinculada su puerta de enlace:**

   ```bash
   ss -tlnp | grep 18789
   ```

   Anote la dirección IP (por ejemplo, `127.0.0.1`, `0.0.0.0` o su IP de Tailscale como `100.x.x.x`).

2. **Exponga el panel solo a la red de Tailscale (tailnet) (puerto 8443):**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **Exponga públicamente solo la ruta del webhook:**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **Autorice el nodo para el acceso a Funnel:**
   Si se le solicita, visite la URL de autorización que se muestra en la salida para habilitar Funnel para este nodo en su política de tailnet.

5. **Verifique la configuración:**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

Su URL pública de webhook será:
`https://<node-name>.<tailnet>.ts.net/googlechat`

Su panel privado permanecerá solo en la tailnet:
`https://<node-name>.<tailnet>.ts.net:8443/`

Use la URL pública (sin `:8443`) en la configuración de la aplicación de Google Chat.

> Nota: Esta configuración persiste tras los reinicios. Para eliminarla más tarde, ejecute `tailscale funnel reset` y `tailscale serve reset`.

### Opción B: Proxy inverso (Caddy)

Si utiliza un proxy inverso como Caddy, delegue solo la ruta específica:

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

1. Google Chat envía webhooks POST a la puerta de enlace. Cada solicitud incluye un encabezado `Authorization: Bearer <token>`.
   - OpenClaw verifica la autenticación del portador antes de leer/analizar los cuerpos completos del webhook cuando el encabezado está presente.
   - Las solicitudes del complemento de Google Workspace que llevan `authorizationEventObject.systemIdToken` en el cuerpo son compatibles a través de un presupuesto de cuerpo previo a la autenticación más estricto.
2. OpenClaw verifica el token contra el `audienceType` + `audience` configurado:
   - `audienceType: "app-url"` → la audiencia es su URL de webhook HTTPS.
   - `audienceType: "project-number"` → la audiencia es el número del proyecto de Cloud.
3. Los mensajes se enrutan por espacio:
   - Los MD usan la clave de sesión `agent:<agentId>:googlechat:direct:<spaceId>`.
   - Los espacios usan la clave de sesión `agent:<agentId>:googlechat:group:<spaceId>`.
4. El acceso por MD es por emparejamiento de forma predeterminada. Los remitentes desconocidos reciben un código de emparejamiento; apruébelo con:
   - `openclaw pairing approve googlechat <code>`
5. Los espacios de grupo requieren una mención (@) de forma predeterminada. Use `botUser` si la detección de menciones necesita el nombre de usuario de la aplicación.

## Objetivos

Use estos identificadores para la entrega y las listas de permitidos:

- Mensajes directos: `users/<userId>` (recomendado).
- El correo electrónico sin formato `name@example.com` es mutable y solo se usa para la coincidencia directa de listas de permitidos cuando `channels.googlechat.dangerouslyAllowNameMatching: true`.
- En desuso: `users/<email>` se trata como un ID de usuario, no como una lista de permitidos de correo electrónico.
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
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          allow: true,
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
- También se admite `serviceAccountRef` (SecretRef de env/archivo), incluidas las referencias por cuenta bajo `channels.googlechat.accounts.<id>.serviceAccountRef`.
- La ruta de webhook predeterminada es `/googlechat` si no se establece `webhookPath`.
- `dangerouslyAllowNameMatching` vuelve a activar la coincidencia de entidades de correo electrónico mutable para las listas de permitidos (modo de compatibilidad de emergencia).
- Las reacciones están disponibles a través de la herramienta `reactions` y `channels action` cuando `actions.reactions` está habilitado.
- Las acciones de mensaje exponen `send` para texto y `upload-file` para envíos explícitos de adjuntos. `upload-file` acepta `media` / `filePath` / `path` más opcional `message`, `filename` y targeting de hilos.
- `typingIndicator` admite `none`, `message` (predeterminado) y `reaction` (la reacción requiere OAuth de usuario).
- Los adjuntos se descargan a través de la API de Chat y se almacenan en la canalización de medios (tamaño limitado por `mediaMaxMb`).

Detalles de referencia de secretos: [Gestión de secretos](/es/gateway/secrets).

## Solución de problemas

### 405 Método no permitido

Si el Explorador de registros de Google Cloud muestra errores como:

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

Esto significa que el controlador de webhook no está registrado. Causas comunes:

1. **Canal no configurado**: Falta la sección `channels.googlechat` en tu configuración. Verifica con:

   ```bash
   openclaw config get channels.googlechat
   ```

   Si devuelve "Config path not found", añade la configuración (consulta [Aspectos destacados de la configuración](#config-highlights)).

2. **Complemento no habilitado**: Verifica el estado del complemento:

   ```bash
   openclaw plugins list | grep googlechat
   ```

   Si muestra "disabled", añade `plugins.entries.googlechat.enabled: true` a tu configuración.

3. **Gateway no reiniciado**: Después de añadir la configuración, reinicia el gateway:

   ```bash
   openclaw gateway restart
   ```

Verifica que el canal se esté ejecutando:

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### Otros problemas

- Verifica `openclaw channels status --probe` para ver si hay errores de autenticación o falta de configuración de audiencia.
- Si no llegan mensajes, confirma la URL del webhook y las suscripciones de eventos de la aplicación de Chat.
- Si el bloqueo de menciones impide las respuestas, establece `botUser` en el nombre del recurso de usuario de la aplicación y verifica `requireMention`.
- Usa `openclaw logs --follow` mientras envías un mensaje de prueba para ver si las solicitudes llegan al gateway.

Documentos relacionados:

- [Configuración del gateway](/es/gateway/configuration)
- [Seguridad](/es/gateway/security)
- [Reacciones](/es/tools/reactions)

## Relacionado

- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento para MD
- [Grupos](/es/channels/groups) — comportamiento del chat en grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
