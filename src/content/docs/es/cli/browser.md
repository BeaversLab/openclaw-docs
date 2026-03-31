---
summary: "Referencia de la CLI para `openclaw browser` (perfiles, pestañas, acciones, Chrome MCP y CDP)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "navegador"
---

# `openclaw browser`

Administre el servidor de control del navegador de OpenClaw y ejecute acciones del navegador (pestañas, instantáneas, capturas de pantalla, navegación, clics, escritura).

Relacionado:

- Herramienta de navegador + API: [Herramienta de navegador](/en/tools/browser)

## Opciones comunes

- `--url <gatewayWsUrl>`: URL de WebSocket de la puerta de enlace (predeterminado: configuración).
- `--token <token>`: token de la puerta de enlace (si es necesario).
- `--timeout <ms>`: tiempo de espera de la solicitud (ms).
- `--browser-profile <name>`: elige un perfil de navegador (predeterminado de la configuración).
- `--json`: salida legible por máquina (cuando sea compatible).

## Inicio rápido (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Perfiles

Los perfiles son configuraciones de enrutamiento del navegador con nombre. En la práctica:

- `openclaw`: inicia o se adjunta a una instancia de Chrome administrada por OpenClaw dedicada (directorio de datos de usuario aislado).
- `user`: controla tu sesión de Chrome existente iniciada a través de Chrome DevTools MCP.
- perfiles CDP personalizados: apuntan a un punto de conexión CDP local o remoto.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser delete-profile --name work
```

Usa un perfil específico:

```bash
openclaw browser --browser-profile work tabs
```

## Pestañas

```bash
openclaw browser tabs
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## Instantánea / captura de pantalla / acciones

Instantánea:

```bash
openclaw browser snapshot
```

Captura de pantalla:

```bash
openclaw browser screenshot
```

Navegar/clic/escribir (automatización de interfaz de usuario basada en referencias):

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome existente a través de MCP

Usa el perfil integrado `user` o crea tu propio perfil `existing-session`:

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Esta ruta es solo para el host. Para Docker, servidores sin cabeza, Browserless u otras configuraciones remotas, utiliza un perfil CDP en su lugar.

## Control remoto del navegador (proxy de host de nodo)

Si la puerta de enlace se ejecuta en una máquina diferente a la del navegador, ejecuta un **node host** en la máquina que tenga Chrome/Brave/Edge/Chromium. La puerta de enlace enviará mediante proxy las acciones del navegador a ese nodo (no se requiere un servidor de control del navegador separado).

Usa `gateway.nodes.browser.mode` para controlar el enrutamiento automático y `gateway.nodes.browser.node` para anclar un nodo específico si hay varios conectados.

Seguridad + configuración remota: [Herramienta de navegador](/en/tools/browser), [Acceso remoto](/en/gateway/remote), [Tailscale](/en/gateway/tailscale), [Seguridad](/en/gateway/security)
