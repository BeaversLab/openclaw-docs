---
summary: "Acceso y autenticación del panel de control de Gateway (interfaz de usuario de control)"
read_when:
  - Changing dashboard authentication or exposure modes
title: "Panel de control"
---

El panel de control de Gateway es la interfaz de usuario de control del navegador que se sirve en `/` de forma predeterminada
(anular con `gateway.controlUi.basePath`).

Apertura rápida (Gateway local):

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))
- Con `gateway.tls.enabled: true`, use `https://127.0.0.1:18789/` y
  `wss://127.0.0.1:18789` para el endpoint de WebSocket.

Referencias clave:

- [Control UI](/es/web/control-ui) para el uso y las capacidades de la interfaz de usuario.
- [Tailscale](/es/gateway/tailscale) para la automatización de Serve/Funnel.
- [Web surfaces](/es/web) para los modos de enlace y las notas de seguridad.

La autenticación se aplica en el protocolo de enlace WebSocket a través de la ruta de autenticación de la gateway configurada:

- `connect.params.auth.token`
- `connect.params.auth.password`
- Encabezados de identidad de Tailscale Serve cuando `gateway.auth.allowTailscale: true`
- encabezados de identidad de proxy de confianza cuando `gateway.auth.mode: "trusted-proxy"`

Consulte `gateway.auth` en [Gateway configuration](/es/gateway/configuration).

Nota de seguridad: la interfaz de usuario de control es una **superficie de administración** (chat, configuración, aprobaciones de ejecución). No la exponga públicamente. La interfaz de usuario mantiene los tokens de URL del panel en sessionStorage para la sesión de la pestaña del navegador actual y la URL de la gateway seleccionada, y los elimina de la URL después de la carga. Se prefiere localhost, Tailscale Serve o un túnel SSH.

## Ruta rápida (recomendado)

- Después de la incorporación, la CLI abre automáticamente el panel e imprime un enlace limpio (sin token).
- Vuelva a abrir en cualquier momento: `openclaw dashboard` (copia el enlace, abre el navegador si es posible, muestra un consejo de SSH si no tiene interfaz gráfica).
- Si fallan la entrega al portapapeles y al navegador, `openclaw dashboard` todavía imprime la
  URL limpia y le indica que utilice el token de `OPENCLAW_GATEWAY_TOKEN` o
  `gateway.auth.token` como la clave de fragmento de URL `token`; no imprime los valores
  de los tokens en los registros.
- Si la interfaz de usuario solicita autenticación de secreto compartido, pegue el token o
  contraseña configurada en la configuración de Control UI.

## Conceptos básicos de autenticación (local vs remota)

- **Localhost**: abra `http://127.0.0.1:18789/`.
- **Gateway TLS**: cuando `gateway.tls.enabled: true`, los enlaces del panel de estado usan
  `https://` y los enlaces WebSocket de Control UI usan `wss://`.
- **Fuente del token de secreto compartido**: `gateway.auth.token` (o
  `OPENCLAW_GATEWAY_TOKEN`); `openclaw dashboard` puede pasarlo a través del fragmento de URL
  para un arranque inicial único, y Control UI lo mantiene en sessionStorage para la
  sesión actual de la pestaña del navegador y la URL de gateway seleccionada en lugar de localStorage.
- Si `gateway.auth.token` está administrado por SecretRef, `openclaw dashboard`
  imprime/copia/abre una URL sin token por diseño. Esto evita exponer
  tokens administrados externamente en los registros del shell, el historial del portapapeles o los argumentos de
  inicio del navegador.
- Si `gateway.auth.token` está configurado como SecretRef y no está resuelto en su
  shell actual, `openclaw dashboard` todavía imprime una URL sin token más
  orientación de configuración de autenticación accionable.
- **Contraseña de secreto compartido**: use el `gateway.auth.password` configurado (o
  `OPENCLAW_GATEWAY_PASSWORD`). El panel no persiste las contraseñas entre
  recargas.
- **Modos con identidad**: Tailscale Serve puede satisfacer la autenticación de Control UI/WebSocket mediante encabezados de identidad cuando `gateway.auth.allowTailscale: true`, y un proxy inverso con conocimiento de identidad que no sea de bucle local puede satisfacer `gateway.auth.mode: "trusted-proxy"`. En esos modos, el panel de control no necesita un secreto compartido pegado para el WebSocket.
- **No localhost**: use Tailscale Serve, un enlace de secreto compartido que no sea de bucle local, un proxy inverso con conocimiento de identidad que no sea de bucle local con `gateway.auth.mode: "trusted-proxy"`, o un túnel SSH. Las API HTTP todavía usan autenticación de secreto compartido a menos que ejecute intencionalmente ingreso privado `gateway.auth.mode: "none"` o autenticación HTTP de proxy confiable. Vea [Superficies web](/es/web).

<a id="if-you-see-unauthorized-1008"></a>

## Si ve "unauthorized" / 1008

- Asegúrese de que la puerta de enlace sea alcanzable (local: `openclaw status`; remoto: túnel SSH `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abrir `http://127.0.0.1:18789/`).
- Para `AUTH_TOKEN_MISMATCH`, los clientes pueden hacer un reintento confiable con un token de dispositivo almacenado en caché cuando la puerta de enlace devuelve sugerencias de reintento. Ese reintento con token en caché reutiliza los alcances aprobados en caché del token; los llamadores explícitos `deviceToken` / explícitos `scopes` mantienen su conjunto de alcances solicitados. Si la autenticación aún falla después de ese reintento, resuelva la deriva del token manualmente.
- Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero token/contraseña compartido explícito, luego `deviceToken` explícito, luego token de dispositivo almacenado, luego token de inicialización.
- En la ruta asincrónica de Control UI de Tailscale Serve, los intentos fallidos para el mismo `{scope, ip}` se serializan antes de que el limitador de autenticación fallida los registre, por lo que el segundo reintento incorrecto concurrente ya puede mostrar `retry later`.
- Para obtener los pasos de reparación de la deriva del token, siga la [Lista de verificación de recuperación de deriva de token](/es/cli/devices#token-drift-recovery-checklist).
- Recupere o proporcione el secreto compartido desde el host de la puerta de enlace:
  - Token: `openclaw config get gateway.auth.token`
  - Contraseña: resuelva la `gateway.auth.password` configurada o `OPENCLAW_GATEWAY_PASSWORD`
  - Token administrado por SecretRef: resuelva el proveedor de secretos externo o exporte `OPENCLAW_GATEWAY_TOKEN` en este shell, luego vuelva a ejecutar `openclaw dashboard`
  - No hay secreto compartido configurado: `openclaw doctor --generate-gateway-token`
- En la configuración del panel, pegue el token o la contraseña en el campo de autenticación, luego conéctese.
- El selector de idioma de la interfaz de usuario se encuentra en **Overview -> Gateway Access -> Language**.
  Es parte de la tarjeta de acceso, no de la sección Appearance.

## Relacionado

- [Interfaz de control](/es/web/control-ui)
- [WebChat](/es/web/webchat)
