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

- `--url <gatewayWsUrl>`: URL del WebSocket de puerta de enlace (el valor predeterminado es la configuración).
- `--token <token>`: token de puerta de enlace (si es necesario).
- `--timeout <ms>`: tiempo de espera de la solicitud (ms).
- `--browser-profile <name>`: elija un perfil de navegador (valor predeterminado de la configuración).
- `--json`: salida legible por máquina (donde sea compatible).

## Inicio rápido (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Si falta el comando

Si `openclaw browser` es un comando desconocido, verifique `plugins.allow` en
`~/.openclaw/openclaw.json`.

Cuando `plugins.allow` está presente, el complemento del navegador incluido debe estar enumerado
explícitamente:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

`browser.enabled=true` no restaura el subcomando de la CLI cuando la lista blanca de
complementos excluye `browser`.

Relacionado: [Herramienta de navegador](/en/tools/browser#missing-browser-command-or-tool)

## Perfiles

Los perfiles son configuraciones de enrutamiento de navegador con nombre. En la práctica:

- `openclaw`: inicia o se adjunta a una instancia de Chrome administrada por OpenClaw dedicada (directorio de datos de usuario aislado).
- `user`: controla su sesión de Chrome con sesión iniciada existente a través de Chrome DevTools MCP.
- perfiles CDP personalizados: apuntan a un punto de conexión CDP local o remoto.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser delete-profile --name work
```

Use un perfil específico:

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

Navegar/hacer clic/escribir (automatización de la interfaz de usuario basada en referencias):

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome existente a través de MCP

Use el perfil incorporado `user` o cree su propio perfil `existing-session`:

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Esta ruta es solo para el host. Para Docker, servidores sin cabeza, Browserless u otras configuraciones remotas, use un perfil CDP en su lugar.

## Control remoto del navegador (proxy de host de nodo)

Si la puerta de enlace se ejecuta en una máquina diferente a la del navegador, ejecute un **host de nodo** en la máquina que tenga Chrome/Brave/Edge/Chromium. La puerta de enlace delegará las acciones del navegador a ese nodo (no se requiere un servidor de control de navegador separado).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Seguridad + configuración remota: [Browser tool](/en/tools/browser), [Remote access](/en/gateway/remote), [Tailscale](/en/gateway/tailscale), [Security](/en/gateway/security)
