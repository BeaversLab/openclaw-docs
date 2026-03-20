---
summary: "Soluciona problemas de inicio de CDP de Chrome/Brave/Edge/Chromium para el control del navegador OpenClaw en Linux"
read_when: "El control del navegador falla en Linux, especialmente con Chromium snap"
title: "Solución de problemas del navegador"
---

# Solución de problemas del navegador (Linux)

## Problema: "Error al iniciar Chrome CDP en el puerto 18800"

El servidor de control del navegador de OpenClaw no puede iniciar Chrome/Brave/Edge/Chromium con el error:

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### Causa raíz

En Ubuntu (y muchas distribuciones de Linux), la instalación predeterminada de Chromium es un **paquete snap**. El confinamiento AppArmor de Snap interfiere con la forma en que OpenClaw inicia y supervisa el proceso del navegador.

El comando `apt install chromium` instala un paquete stub que redirige a snap:

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

Esto NO es un navegador real, es solo un contenedor.

### Solución 1: Instalar Google Chrome (Recomendado)

Instale el paquete oficial `.deb` de Google Chrome, que no está aislado por snap:

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

### Solución 2: Usar Snap Chromium con modo de solo conexión

Si debe usar snap Chromium, configure OpenClaw para que se conecte a un navegador iniciado manualmente:

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

| Opción                   | Descripción                                                                          | Predeterminado                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `browser.enabled`        | Habilitar control del navegador                                                      | `true`                                                                              |
| `browser.executablePath` | Ruta al binario de un navegador basado en Chromium (Chrome/Brave/Edge/Chromium)      | autodetectado (prefiere el navegador predeterminado cuando está basado en Chromium) |
| `browser.headless`       | Ejecutar sin interfaz gráfica                                                        | `false`                                                                             |
| `browser.noSandbox`      | Añadir el indicador `--no-sandbox` (necesario para algunas configuraciones de Linux) | `false`                                                                             |
| `browser.attachOnly`     | No iniciar el navegador, solo conectarse al existente                                | `false`                                                                             |
| `browser.cdpPort`        | Puerto del protocolo Chrome DevTools                                                 | `18800`                                                                             |

### Problema: "No se encontraron pestañas de Chrome para profile=\"user\""

Estás utilizando un perfil `existing-session` / Chrome MCP. OpenClaw puede ver el Chrome local,
pero no hay pestañas abiertas disponibles a las que adjuntarse.

Opciones de solución:

1. **Usar el navegador administrado:** `openclaw browser start --browser-profile openclaw`
   (o establecer `browser.defaultProfile: "openclaw"`).
2. **Usar Chrome MCP:** asegúrese de que Chrome local se esté ejecutando con al menos una pestaña abierta, luego vuelva a intentarlo con `--browser-profile user`.

Notas:

- `user` es solo para el host local. Para servidores Linux, contenedores o hosts remotos, prefiera perfiles CDP.
- Los perfiles `openclaw` locales asignan automáticamente `cdpPort`/`cdpUrl`; solo establezca esos para CDP remoto.

import es from "/components/footer/es.mdx";

<es />
