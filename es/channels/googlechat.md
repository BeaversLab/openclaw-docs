---
summary: "Estado de compatibilidad de la aplicación de Google Chat, capacidades y configuración"
read_when:
  - Trabajando en las funciones del canal de Google Chat
title: "Google Chat"
---

# Google Chat (API de Chat)

Estado: listo para mensajes directos y espacios a través de los webhooks de la API de Google Chat (solo HTTP).

## Configuración rápida (principiante)

1. Crea un proyecto de Google Cloud y habilita la **Google Chat API**.
   - Vaya a: [Credenciales de la API de Google Chat](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - Habilita la API si aún no está habilitada.
2. Crea una **Cuenta de servicio**:
   - Presiona **Crear credenciales** > **Cuenta de servicio**.
   - Póngale el nombre que quiera (p. ej., `openclaw-chat`).
   - Deja los permisos en blanco (presiona **Continuar**).
   - Deja los principales con acceso en blanco (presiona **Listo**).
3. Crea y descarga la **Clave JSON**:
   - En la lista de cuentas de servicio, haz clic en la que acabas de crear.
   - Ve a la pestaña **Claves**.
   - Haz clic en **Agregar clave** > **Crear nueva clave**.
   - Selecciona **JSON** y presiona **Crear**.
4. Guarde el archivo JSON descargado en su host de puerta de enlace (p. ej., `~/.openclaw/googlechat-service-account.json`).
5. Cree una aplicación de Google Chat en la [Configuración de chat de Google Cloud Console](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat):
   - Rellena la **Información de la aplicación**:
     - **Nombre de la aplicación**: (p. ej. `OpenClaw`)
     - **URL del avatar**: (p. ej. `https://openclaw.ai/logo.png`)
     - **Descripción**: (p. ej. `Personal AI Assistant`)
   - Habilita **Características interactivas**.
   - En **Funcionalidad**, marca **Unirse a espacios y conversaciones en grupo**.
   - En **Configuración de conexión**, selecciona **URL del endpoint HTTP**.
   - En **Activadores (Triggers)**, seleccione **Usar una URL de endpoint HTTP común para todos los activadores** y configúrela con la URL pública de su puerta de enlace seguida de `/googlechat`.
     - _Consejo: Ejecute `openclaw status` para encontrar la URL pública de su puerta de enlace._
   - En **Visibilidad**, marque **Hacer que esta aplicación de Chat esté disponible para personas y grupos específicos en &lt;Su dominio&gt;**.
   - Introduzca su dirección de correo electrónico (p. ej., `user@example.com`) en el cuadro de texto.
   - Haz clic en **Guardar** en la parte inferior.
6. **Habilitar el estado de la aplicación**:
   - Después de guardar, **actualiza la página**.
   - Busca la sección **Estado de la aplicación** (generalmente cerca de la parte superior o inferior después de guardar).
   - Cambia el estado a **En vivo - disponible para los usuarios**.
   - Haz clic en **Guardar** de nuevo.
7. Configure OpenClaw con la ruta de la cuenta de servicio + audiencia del webhook:
   - Entorno: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - O configuración: `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`.
8. Establezca el tipo + valor de audiencia del webhook (coincide con la configuración de su aplicación de Chat).
9. Inicie la puerta de enlace. Google Chat enviará un POST a la ruta de su webhook.

## Añadir a Google Chat

Una vez que la puerta de enlace se esté ejecutando y su correo electrónico se haya añadido a la lista de visibilidad:

1. Vaya a [Google Chat](https://chat.google.com/).
2. Haga clic en el icono **+** (más) junto a **Mensajes directos**.
3. En la barra de búsqueda (donde normalmente añade personas), escriba el **Nombre de la aplicación** que configuró en Google Cloud Console.
   - **Nota**: El bot _no_ aparecerá en la lista de navegación del "Marketplace" porque es una aplicación privada. Debe buscarlo por nombre.
4. Seleccione su bot de los resultados.
5. Haga clic en **Añadir** o **Chat** para iniciar una conversación 1:1.
6. Envíe "Hello" para activar el asistente.

## URL pública (Solo webhook)

Los webhooks de Google Chat requieren un endpoint HTTPS público. Por seguridad, **exponga solo la ruta `/googlechat`** a internet. Mantenga el panel de OpenClaw y otros endpoints sensibles en su red privada.

### Opción A: Tailscale Funnel (Recomendado)

Use Tailscale Serve para el panel privado y Funnel para la ruta del webhook público. Esto mantiene `/` privado mientras expone solo `/googlechat`.

1. **Compruebe a qué dirección está vinculada su puerta de enlace:**

   ```bash
   ss -tlnp | grep 18789
   ```

   Tenga en cuenta la dirección IP (p. ej., `127.0.0.1`, `0.0.0.0`, o su IP de Tailscale como `100.x.x.x`).

2. **Exponga el panel solo a la tailnet (puerto 8443):**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **Exponga solo la ruta del webhook públicamente:**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **Autorizar el nodo para el acceso a Funnel:**
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

Si utiliza un proxy inverso como Caddy, haga proxy solo de la ruta específica:

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

Con esta configuración, cualquier solicitud a `your-domain.com/` será ignorada o devolverá un 404, mientras que `your-domain.com/googlechat` se enruta de forma segura a OpenClaw.

### Opción C: Cloudflare Tunnel

Configure las reglas de ingreso de su túnel para enrutar solo la ruta del webhook:

- **Ruta**: `/googlechat` -> `http://localhost:18789/googlechat`
- **Regla predeterminada**: HTTP 404 (No encontrado)

## Cómo funciona

1. Google Chat envía webhooks POST al gateway. Cada solicitud incluye un encabezado `Authorization: Bearer <token>`.
   - OpenClaw verifica la autenticación del portador antes de leer/analizar los cuerpos completos de los webhooks cuando el encabezado está presente.
   - Las solicitudes de complementos de Google Workspace que llevan `authorizationEventObject.systemIdToken` en el cuerpo se admiten mediante un presupuesto de cuerpo de preautenticación más estricto.
2. OpenClaw verifica el token contra el `audienceType` + `audience` configurado:
   - `audienceType: "app-url"` → la audiencia es su URL de webhook HTTPS.
   - `audienceType: "project-number"` → la audiencia es el número de proyecto de Cloud.
3. Los mensajes se enrutan por espacio:
   - Los MD usan la clave de sesión `agent:<agentId>:googlechat:direct:<spaceId>`.
   - Los espacios usan la clave de sesión `agent:<agentId>:googlechat:group:<spaceId>`.
4. El acceso a MD es por emparejamiento por defecto. Los remitentes desconocidos reciben un código de emparejamiento; apruébelo con:
   - `openclaw pairing approve googlechat <code>`
5. Los espacios de grupo requieren una mención (@-mention) de forma predeterminada. Use `botUser` si la detección de menciones necesita el nombre de usuario de la aplicación.

## Objetivos

Use estos identificadores para la entrega y las listas de permitidos:

- Mensajes directos: `users/<userId>` (recomendado).
- El correo electrónico sin formato `name@example.com` es mutable y solo se usa para la coincidencia directa de listas de permitidos cuando `channels.googlechat.dangerouslyAllowNameMatching: true`.
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
- También se admite `serviceAccountRef` (env/archivo SecretRef), incluidas las referencias por cuenta bajo `channels.googlechat.accounts.<id>.serviceAccountRef`.
- La ruta de webhook predeterminada es `/googlechat` si `webhookPath` no está configurada.
- `dangerouslyAllowNameMatching` vuelve a habilitar la coincidencia de principales de correo electrónico mutable para listas de permitidos (modo de compatibilidad de emergencia).
- Las reacciones están disponibles a través de la herramienta `reactions` y `channels action` cuando `actions.reactions` está habilitado.
- `typingIndicator` admite `none`, `message` (predeterminado) y `reaction` (la reacción requiere OAuth de usuario).
- Los archivos adjuntos se descargan a través de la API de Chat y se almacenan en la canalización de medios (el tamaño está limitado por `mediaMaxMb`).

Detalles de referencia de secretos: [Secrets Management](/es/gateway/secrets).

## Solución de problemas

### 405 Method Not Allowed

Si el Explorador de registros de Google Cloud muestra errores como:

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

Esto significa que el controlador de webhook no está registrado. Causas comunes:

1. **Canal no configurado**: Falta la sección `channels.googlechat` en su configuración. Verifíquelo con:

   ```bash
   openclaw config get channels.googlechat
   ```

   Si devuelve "Config path not found", añada la configuración (consulte [Config highlights](#config-highlights)).

2. **Complemento no habilitado**: Verifique el estado del complemento:

   ```bash
   openclaw plugins list | grep googlechat
   ```

   Si muestra "disabled", añada `plugins.entries.googlechat.enabled: true` a su configuración.

3. **Pasarela no reiniciada**: Después de añadir la configuración, reinicie la pasarela:

   ```bash
   openclaw gateway restart
   ```

Verifique que el canal se esté ejecutando:

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### Otros problemas

- Compruebe `openclaw channels status --probe` para ver si hay errores de autenticación o falta de configuración de audiencia.
- Si no llega ningún mensaje, confirme la URL del webhook de la aplicación de Chat + las suscripciones de eventos.
- Si el bloqueo de menciones impide las respuestas, establezca `botUser` en el nombre del recurso de usuario de la aplicación y verifique `requireMention`.
- Use `openclaw logs --follow` mientras envía un mensaje de prueba para ver si las solicitudes llegan a la puerta de enlace.

Documentación relacionada:

- [Gateway configuration](/es/gateway/configuration)
- [Security](/es/gateway/security)
- [Reactions](/es/tools/reactions)

import en from "/components/footer/en.mdx";

<en />
