---
summary: "Acceso y autenticación al dashboard de Gateway (interfaz de control Control UI)"
read_when:
  - Cambiar los modos de autenticación o exposición del dashboard
title: "Dashboard"
---

# Panel de control (Interfaz de usuario de control)

El dashboard de Gateway es la interfaz de control (Control UI) del navegador que se sirve en `/` de forma predeterminada
(anular con `gateway.controlUi.basePath`).

Apertura rápida (Gateway local):

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))

Referencias clave:

- [Control UI](/es/web/control-ui) para ver el uso y las capacidades de la interfaz de usuario.
- [Tailscale](/es/gateway/tailscale) para la automatización de Serve/Funnel.
- [Superficies web (Web surfaces)](/es/web) para ver los modos de enlace y las notas de seguridad.

La autenticación se aplica en el protocolo de enlace de WebSocket mediante `connect.params.auth`
(token o contraseña). Consulte `gateway.auth` en [Configuración de Gateway](/es/gateway/configuration).

Nota de seguridad: la interfaz de control (Control UI) es una **superficie de administración** (chat, configuración, aprobaciones de ejecución).
No la exponga públicamente. La interfaz de usuario guarda los tokens de URL del dashboard en sessionStorage
para la sesión de la pestaña actual del navegador y la URL de Gateway seleccionada, y los elimina de la URL después de la carga.
Se prefiere localhost, Tailscale Serve o un túnel SSH.

## Acceso rápido (recomendado)

- Después de la incorporación, la CLI abre automáticamente el panel de control e imprime un enlace limpio (sin token).
- Volver a abrir en cualquier momento: `openclaw dashboard` (copia el enlace, abre el navegador si es posible, muestra una sugerencia de SSH si no hay interfaz gráfica).
- Si la interfaz de usuario solicita autenticación, pegue el token de `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de la interfaz de control (Control UI).

## Conceptos básicos de tokens (local vs. remoto)

- **Localhost**: abrir `http://127.0.0.1:18789/`.
- **Fuente del token**: `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`); `openclaw dashboard` puede pasarlo a través de un fragmento de URL para un arranque único y la interfaz de control (Control UI) lo mantiene en sessionStorage para la sesión de la pestaña actual del navegador y la URL de Gateway seleccionada en lugar de localStorage.
- Si `gateway.auth.token` está administrado por SecretRef, `openclaw dashboard` imprime/copia/abre una URL sin token por diseño. Esto evita exponer tokens administrados externamente en registros de shell, historial del portapapeles o argumentos de lanzamiento del navegador.
- Si `gateway.auth.token` está configurado como SecretRef y no está resuelto en su shell actual, `openclaw dashboard` aún imprime una URL sin token más orientación de configuración de autenticación practicable.
- **No localhost**: use Tailscale Serve (sin token para Control UI/WebSocket si `gateway.auth.allowTailscale: true`, asume un host de puerta de enlace confiable; las API de HTTP aún necesitan token/contraseña), vinculación de tailnet con un token o un túnel SSH. Consulte [Superficies web](/es/web).

## Si ve "unauthorized" / 1008

- Asegúrese de que la puerta de enlace sea accesible (local: `openclaw status`; remoto: túnel SSH `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abrir `http://127.0.0.1:18789/`).
- Para `AUTH_TOKEN_MISMATCH`, los clientes pueden realizar un reintento confiable con un token de dispositivo almacenado en caché cuando la puerta de enlace devuelve sugerencias de reintento. Si la autenticación sigue fallando después de ese reintento, resuelva la desviación del token manualmente.
- Para los pasos de reparación de la desviación del token, siga la [Lista de verificación de recuperación de desviación de token](/es/cli/devices#token-drift-recovery-checklist).
- Recupere o proporcione el token desde el host de la puerta de enlace:
  - Configuración en texto plano: `openclaw config get gateway.auth.token`
  - Configuración administrada por SecretRef: resuelva el proveedor de secretos externo o exporte `OPENCLAW_GATEWAY_TOKEN` en este shell, luego vuelva a ejecutar `openclaw dashboard`
  - No hay ningún token configurado: `openclaw doctor --generate-gateway-token`
- En la configuración del panel, pegue el token en el campo de autenticación y luego conéctese.

import es from "/components/footer/es.mdx";

<es />
