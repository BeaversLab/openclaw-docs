---
summary: "Soluciona problemas de inicio de CDP de Chrome/Brave/Edge/Chromium para el control del navegador de OpenClaw en Linux"
read_when: "El control del navegador falla en Linux, especialmente con snap Chromium"
title: "Solución de problemas del navegador"
---

## Problema: "Error al iniciar Chrome CDP en el puerto 18800"

El servidor de control del navegador de OpenClaw no puede iniciar Chrome/Brave/Edge/Chromium con el error:

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### Causa raíz

En Ubuntu (y muchas distribuciones de Linux), la instalación predeterminada de Chromium es un **paquete snap**. El confinamiento de AppArmor de Snap interfiere con la forma en que OpenClaw genera y supervisa el proceso del navegador.

El comando `apt install chromium` instala un paquete stub que redirige a snap:

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

Esto NO es un navegador real; es solo un contenedor.

Otros fallos comunes de inicio en Linux:

- `The profile appears to be in use by another Chromium process` significa que Chrome
  encontró archivos de bloqueo `Singleton*` obsoletos en el directorio del perfil gestionado. OpenClaw
  elimina esos bloqueos y reintentan una vez cuando el bloqueo apunta a un proceso muerto o
  de un host diferente.
- `Missing X server or $DISPLAY` significa que se solicitó explícitamente
  un navegador visible en un host sin una sesión de escritorio. De forma predeterminada, los perfiles
  gestionados locales ahora vuelven al modo sin cabeza en Linux cuando `DISPLAY` y
  `WAYLAND_DISPLAY` no están establecidos. Si establece `OPENCLAW_BROWSER_HEADLESS=0`,
  `browser.headless: false` o `browser.profiles.<name>.headless: false`,
  elimine esa invalidación con interfaz, establezca `OPENCLAW_BROWSER_HEADLESS=1`, inicie `Xvfb`,
  ejecute `openclaw browser start --headless` para un inicio gestionado de un solo uso, o ejecute
  OpenClaw en una sesión de escritorio real.

### Solución 1: Instalar Google Chrome (Recomendado)

Instale el paquete `.deb` oficial de Google Chrome, que no está en sandbox por snap:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
```

Luego actualice su configuración de OpenClaw (`~/.openclaw/openclaw.json`):

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### Solución 2: Usar Snap Chromium con el modo de solo conexión

Si debe usar Chromium snap, configure OpenClaw para que se conecte a un navegador iniciado manualmente:

1. Actualizar configuración:

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. Iniciar Chromium manualmente:

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. Opcionalmente, cree un servicio de usuario systemd para iniciar Chrome automáticamente:

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Habilitar con: `systemctl --user enable --now openclaw-browser.service`

### Verificar que el navegador funciona

Verificar estado:

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

Probar navegación:

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### Referencia de configuración

| Opción                           | Descripción                                                                          | Predeterminado                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `browser.enabled`                | Habilitar control del navegador                                                      | `true`                                                                             |
| `browser.executablePath`         | Ruta al binario de un navegador basado en Chromium (Chrome/Brave/Edge/Chromium)      | autodetectado (prefiere el navegador predeterminado cuando sea basado en Chromium) |
| `browser.headless`               | Ejecutar sin GUI                                                                     | `false`                                                                            |
| `OPENCLAW_BROWSER_HEADLESS`      | Invalidación por proceso para el modo headless del navegador local administrado      | sin establecer                                                                     |
| `browser.noSandbox`              | Añadir el indicador `--no-sandbox` (necesario para algunas configuraciones de Linux) | `false`                                                                            |
| `browser.attachOnly`             | No iniciar el navegador, solo adjuntarse al existente                                | `false`                                                                            |
| `browser.cdpPort`                | Puerto del Protocolo Chrome DevTools                                                 | `18800`                                                                            |
| `browser.localLaunchTimeoutMs`   | Tiempo de espera de descubrimiento de Chrome administrado local                      | `15000`                                                                            |
| `browser.localCdpReadyTimeoutMs` | Tiempo de espera de preparación del CDP posterior al inicio administrado local       | `8000`                                                                             |

En Raspberry Pi, hosts VPS antiguos o almacenamiento lento, aumente `browser.localLaunchTimeoutMs` cuando Chrome necesite más tiempo para exponer su endpoint HTTP del CDP. Aumente `browser.localCdpReadyTimeoutMs` cuando el inicio tenga éxito pero `openclaw browser start` todavía reporte `not reachable after start`. Los valores deben ser enteros positivos hasta `120000` ms; los valores de configuración no válidos son rechazados.

### Problema: "No se encontraron pestañas de Chrome para profile=\"user\""

Estás utilizando un perfil `existing-session` / Chrome MCP. OpenClaw puede ver el Chrome local, pero no hay pestañas abiertas disponibles para adjuntar.

Opciones de solución:

1. **Usar el navegador administrado:** `openclaw browser start --browser-profile openclaw`
   (o configure `browser.defaultProfile: "openclaw"`).
2. **Usar Chrome MCP:** asegúrese de que Chrome local se esté ejecutando con al menos una pestaña abierta, luego vuelva a intentar con `--browser-profile user`.

Notas:

- `user` es solo para el host. Para servidores Linux, contenedores o hosts remotos, prefiera perfiles CDP.
- `user` / otros perfiles `existing-session` mantienen los límites actuales de Chrome MCP:
  acciones impulsadas por referencias, ganchos de carga de un solo archivo, sin invalidaciones de tiempo de espera de diálogo, sin
  `wait --load networkidle`, y sin `responsebody`, exportación de PDF, intercepción de
  descargas o acciones por lotes.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl`; solo configúrelos para CDP remoto.
- Los perfiles de CDP remoto aceptan `http://`, `https://`, `ws://` y `wss://`.
  Use HTTP(S) para el descubrimiento de `/json/version`, o WS(S) cuando su servicio de
  navegador le proporcione una URL de socket directa de DevTools.

## Relacionado

- [Navegador](/es/tools/browser)
- [Inicio de sesión del navegador](/es/tools/browser-login)
- [Solución de problemas del navegador en WSL2](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
