---
summary: "Extensión de Chrome: permite que OpenClaw controle tu pestaña de Chrome existente"
read_when:
  - Quieres que el agente controle una pestaña de Chrome existente (botón de la barra de herramientas)
  - Necesitas un Gateway remoto + automatización local del navegador mediante Tailscale
  - Quieres entender las implicaciones de seguridad de la toma de control del navegador
title: "Extensión de Chrome"
---

# Extensión de Chrome (retransmisión del navegador)

La extensión de Chrome de OpenClaw permite al agente controlar tus **pestañas existentes de Chrome** (tu ventana normal de Chrome) en lugar de iniciar un perfil de Chrome administrado por openclaw separado.

La acción de adjuntar/desadjuntar se realiza mediante un **único botón en la barra de herramientas de Chrome**.

Si prefieres el flujo de conexión de DevTools MCP oficial de Chrome en lugar del relé de la extensión de OpenClaw, utiliza un perfil de navegador `existing-session` en su lugar. Consulta [Browser](/es/tools/browser#chrome-existing-session-via-mcp). Para la documentación de configuración propia de Chrome, consulta [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
y el [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp).

## Qué es (concepto)

Hay tres partes:

- **Servicio de control del navegador** (Gateway o nodo): la API a la que llama el agente/herramienta (a través del Gateway)
- **Servidor de retransmisión local** (CDP de bucle invertido): actúa de puente entre el servidor de control y la extensión (`http://127.0.0.1:18792` de forma predeterminada)
- **Extensión MV3 de Chrome**: se adjunta a la pestaña activa usando `chrome.debugger` y canaliza los mensajes CDP al relé

Luego, OpenClaw controla la pestaña adjunta a través de la superficie de la herramienta `browser` normal (seleccionando el perfil correcto).

## Instalar / cargar (descomprimida)

1. Instala la extensión en una ruta local estable:

```bash
openclaw browser extension install
```

2. Imprime la ruta del directorio de la extensión instalada:

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- Activa “Modo de desarrollador”
- "Cargar descomprimida" → selecciona el directorio impreso anteriormente

4. Fija la extensión.

## Actualizaciones (sin paso de compilación)

La extensión se distribuye dentro de la versión de OpenClaw (paquete npm) como archivos estáticos. No hay un paso de "compilación" separado.

Después de actualizar OpenClaw:

- Vuelve a ejecutar `openclaw browser extension install` para actualizar los archivos instalados en tu directorio de estado de OpenClaw.
- Chrome → `chrome://extensions` → haz clic en “Recargar” en la extensión.

## Usarla (establecer el token del Gateway una vez)

Para usar el relé de la extensión, crea un perfil de navegador para ella:

Antes de adjuntar por primera vez, abre las Opciones de la extensión y establece:

- `Port` (por defecto `18792`)
- `Gateway token` (debe coincidir con `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`)

Luego crea un perfil:

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

Úsalo:

- CLI: `openclaw browser --browser-profile my-chrome tabs`
- Herramienta del agente: `browser` con `profile="my-chrome"`

### Puertos de puerta de enlace personalizados

Si estás utilizando un puerto de puerta de enlace personalizado, el puerto de relé de la extensión se deriva automáticamente:

**Puerto de relé de la extensión = Puerto de puerta de enlace + 3**

Ejemplo: si `gateway.port: 19001`, entonces:

- Puerto de relé de la extensión: `19004` (puerta de enlace + 3)

Configura la extensión para usar el puerto de relé derivado en la página de Opciones de la extensión.

## Adjuntar / desadjuntar (botón de la barra de herramientas)

- Abre la pestaña que quieres que OpenClaw controle.
- Haz clic en el icono de la extensión.
  - La insignia muestra `ON` cuando está adjuntada.
- Haz clic de nuevo para desadjuntar.

## ¿Qué pestaña controla?

- **No** controla automáticamente “la pestaña que estés mirando”.
- Controla **solo la(s) pestaña(s) que adjuntaste explícitamente** haciendo clic en el botón de la barra de herramientas.
- Para cambiar: abre la otra pestaña y haz clic en el icono de la extensión allí.

## Insignia + errores comunes

- `ON`: adjuntado; OpenClaw puede conducir esa pestaña.
- `…`: conectando al relé local.
- `!`: relé no alcanzable/no autenticado (lo más común: servidor de relé no ejecutándose, o token de puerta de enlace faltante/incorrecto).

Si ves `!`:

- Asegúrate de que la puerta de enlace se esté ejecutando localmente (configuración predeterminada) o ejecuta un host de nodo en esta máquina si la puerta de enlace se ejecuta en otro lugar.
- Abre la página de Opciones de la extensión; valida la accesibilidad del relé + la autenticación del token de puerta de enlace.

## Puerta de enlace remota (usar un host de nodo)

### Puerta de enlace local (misma máquina que Chrome) — generalmente **sin pasos adicionales**

Si la puerta de enlace se ejecuta en la misma máquina que Chrome, inicia el servicio de control del navegador en loopback
e inicia automáticamente el servidor de relé. La extensión se comunica con el relé local; las llamadas de CLI/herramientas van a la puerta de enlace.

### Puerta de enlace remota (la puerta de enlace se ejecuta en otro lugar) — **ejecutar un host de nodo**

Si su Gateway se ejecuta en otra máquina, inicie un host de nodo en la máquina que ejecuta Chrome.
El Gateway actuará como proxy de las acciones del navegador hacia ese nodo; la extensión + el rele se mantienen locales en la máquina del navegador.

Si hay varios nodos conectados, ancle uno con `gateway.nodes.browser.node` o establezca `gateway.nodes.browser.mode`.

## Sandboxing (contenedores de herramientas)

Si su sesión de agente está en sandbox (`agents.defaults.sandbox.mode != "off"`), la herramienta `browser` puede estar restringida:

- De forma predeterminada, las sesiones en sandbox a menudo apuntan al **navegador sandbox** (`target="sandbox"`), no a su Chrome anfitrión.
- La toma de control del rele de la extensión de Chrome requiere controlar el servidor de control del navegador **anfitrión**.

Opciones:

- Lo más fácil: use la extensión desde una sesión/agente **sin sandbox**.
- O permita el control del navegador anfitrión para sesiones en sandbox:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

Luego asegúrese de que la política de herramientas no deniegue la herramienta y (si es necesario) llame a `browser` con `target="host"`.

Depuración: `openclaw sandbox explain`

## Consejos de acceso remoto

- Mantenga el Gateway y el host de nodo en la misma tailnet; evite exponer los puertos del rele a la LAN o a Internet pública.
- Empareje nodos intencionalmente; deshabilite el enrutamiento del proxy del navegador si no desea control remoto (`gateway.nodes.browser.mode="off"`).
- Deje el rele en loopback a menos que tenga una necesidad real entre espacios de nombres. Para WSL2 o configuraciones de host dividido similares, establezca `browser.relayBindHost` en una dirección de enlace explícita como `0.0.0.0`, y luego mantenga el acceso restringido con autenticación de Gateway, emparejamiento de nodos y una red privada.

## Cómo funciona la “ruta de extensión”

`openclaw browser extension path` imprime el directorio en disco **instalado** que contiene los archivos de la extensión.

La CLI intencionalmente **no** imprime una ruta `node_modules`. Ejecute siempre `openclaw browser extension install` primero para copiar la extensión a una ubicación estable en su directorio de estado de OpenClaw.

Si mueve o elimina ese directorio de instalación, Chrome marcará la extensión como rota hasta que la vuelva a cargar desde una ruta válida.

## Implicaciones de seguridad (lea esto)

Esto es potente y arriesgado. Trátelo como si le estuviera dando al modelo “manos en su navegador”.

- La extensión utiliza la API del depurador de Chrome (`chrome.debugger`). Cuando está adjuntada, el modelo puede:
  - hacer clic/escribir/navegar en esa pestaña
  - leer el contenido de la página
  - acceder a todo lo que la sesión iniciada de la pestaña pueda acceder
- **Esto no está aislado** como el perfil dedicado gestionado por openclaw.
  - Si te adjuntas a tu perfil/pestaña de uso diario, estás otorgando acceso al estado de esa cuenta.

Recomendaciones:

- Prefiere un perfil de Chrome dedicado (separado de tu navegación personal) para el uso del relé de la extensión.
- Mantén el Gateway y cualquier host de nodo solo en tailnet; confía en la autenticación del Gateway y el emparejamiento de nodos.
- Evita exponer los puertos de retransmisión a través de la LAN (`0.0.0.0`) y evita Funnel (público).
- El relé bloquea orígenes que no sean de la extensión y requiere autenticación de token de puerta de enlace tanto para `/cdp` como para `/extension`.

Relacionado:

- Resumen de la herramienta del navegador: [Browser](/es/tools/browser)
- Auditoría de seguridad: [Security](/es/gateway/security)
- Configuración de Tailscale: [Tailscale](/es/gateway/tailscale)

import en from "/components/footer/en.mdx";

<en />
