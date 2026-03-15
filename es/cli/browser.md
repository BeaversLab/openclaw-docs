---
summary: "Referencia de la CLI para `openclaw browser` (perfiles, pestañas, acciones, relé de extensiones)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to use the Chrome extension relay (attach/detach via toolbar button)
title: "navegador"
---

# `openclaw browser`

Administre el servidor de control del navegador de OpenClaw y ejecute acciones del navegador (pestañas, instantáneas, capturas de pantalla, navegación, clics, escritura).

Relacionado:

- Herramienta de navegador + API: [Herramienta de navegador](/es/tools/browser)
- Relé de extensión de Chrome: [Extensión de Chrome](/es/tools/chrome-extension)

## Opciones comunes

- `--url <gatewayWsUrl>`: URL de WebSocket de la puerta de enlace (predeterminado de la configuración).
- `--token <token>`: token de la puerta de enlace (si es necesario).
- `--timeout <ms>`: tiempo de espera de solicitud (ms).
- `--browser-profile <name>`: elija un perfil de navegador (predeterminado de la configuración).
- `--json`: salida legible por máquina (donde sea compatible).

## Inicio rápido (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Perfiles

Los perfiles son configuraciones de enrutamiento del navegador con nombre. En la práctica:

- `openclaw`: inicia/se adjunta a una instancia de Chrome administrada por OpenClaw dedicada (directorio de datos de usuario aislado).
- `user`: controla su sesión de Chrome existente con sesión iniciada a través de Chrome DevTools MCP.
- `chrome-relay`: controla sus pestañas de Chrome existentes a través del relé de extensiones de Chrome.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser delete-profile --name work
```

Usar un perfil específico:

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

## Relé de extensión de Chrome (adjuntar mediante el botón de la barra de herramientas)

Este modo permite que el agente controle una pestaña de Chrome existente que usted adjunta manualmente (no se adjunta automáticamente).

Instale la extensión descomprimida en una ruta estable:

```bash
openclaw browser extension install
openclaw browser extension path
```

Luego Chrome → `chrome://extensions` → habilitar “Modo de desarrollador” → “Cargar descomprimida” → seleccione la carpeta impresa.

Guía completa: [Extensión de Chrome](/es/tools/chrome-extension)

## Control remoto del navegador (proxy de host de nodo)

Si la puerta de enlace se ejecuta en una máquina diferente a la del navegador, ejecute un **host de nodo** en la máquina que tiene Chrome/Brave/Edge/Chromium. La puerta de enlace will proxy las acciones del navegador a ese nodo (no se requiere un servidor de control del navegador separado).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/es/tools/browser), [Remote access](/es/gateway/remote), [Tailscale](/es/gateway/tailscale), [Security](/es/gateway/security)

import es from "/components/footer/es.mdx";

<es />
