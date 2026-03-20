---
summary: "Referencia de la CLI para `openclaw browser` (perfiles, pestañas, acciones, Chrome MCP y CDP)"
read_when:
  - Usas `openclaw browser` y quieres ejemplos de tareas comunes
  - Quieres controlar un navegador que se ejecuta en otra máquina a través de un host de nodo
  - Quieres adjuntarte a tu Chrome local con sesión iniciada a través de Chrome MCP
title: "browser"
---

# `openclaw browser`

Administra el servidor de control del navegador de OpenClaw y ejecuta acciones del navegador (pestañas, instantáneas, capturas de pantalla, navegación, clics, escritura).

Relacionado:

- Herramienta de navegador + API: [Browser tool](/es/tools/browser)

## Marcas comunes

- `--url <gatewayWsUrl>`: URL de WebSocket de Gateway (predeterminado: configuración).
- `--token <token>`: token de Gateway (si es necesario).
- `--timeout <ms>`: tiempo de espera de solicitud (ms).
- `--browser-profile <name>`: elige un perfil de navegador (predeterminado de la configuración).
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

- `openclaw`: inicia o se adjunta a una instancia de Chrome dedicada administrada por OpenClaw (directorio de datos de usuario aislado).
- `user`: controla tu sesión de Chrome existente con sesión iniciada a través de Chrome DevTools MCP.
- perfiles CDP personalizados: apunta a un punto final CDP local o remoto.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
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

Navegar/clic/escribir (automatización de IU basada en referencias):

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome existente a través de MCP

Usa el perfil incorporado `user` o crea tu propio perfil `existing-session`:

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Esta ruta es solo para el host. Para Docker, servidores sin cabeza, Browserless u otras configuraciones remotas, utiliza un perfil CDP en su lugar.

## Control remoto del navegador (proxy de host de nodo)

Si el Gateway se ejecuta en una máquina diferente a la del navegador, ejecuta un **node host** en la máquina que tenga Chrome/Brave/Edge/Chromium. El Gateway enviará por proxy las acciones del navegador a ese nodo (no se requiere un servidor de control del navegador separado).

Usa `gateway.nodes.browser.mode` para controlar el enrutamiento automático y `gateway.nodes.browser.node` para fijar un nodo específico si hay varios conectados.

Seguridad y configuración remota: [Herramienta de navegador](/es/tools/browser), [Acceso remoto](/es/gateway/remote), [Tailscale](/es/gateway/tailscale), [Seguridad](/es/gateway/security)

import en from "/components/footer/en.mdx";

<en />
