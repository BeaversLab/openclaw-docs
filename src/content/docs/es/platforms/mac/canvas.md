---
summary: "Panel Canvas controlado por agente incrustado a través de WKWebView + esquema de URL personalizado"
read_when:
  - Implementing the macOS Canvas panel
  - Adding agent controls for visual workspace
  - Debugging WKWebView canvas loads
title: "Canvas"
---

La aplicación de macOS incorpora un **panel de Canvas** controlado por un agente utilizando `WKWebView`. Es
un espacio de trabajo visual ligero para HTML/CSS/JS, A2UI y pequeñas superficies
de IU interactivas.

## Dónde se encuentra Canvas

El estado de Canvas se almacena en Soporte de aplicaciones:

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

El panel de Canvas sirve esos archivos a través de un **esquema de URL personalizado**:

- `openclaw-canvas://<session>/<path>`

Ejemplos:

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

Si no existe ningún `index.html` en la raíz, la aplicación muestra una **página de andamio incorporada**.

## Comportamiento del panel

- Panel sin bordes y redimensionable, anclado cerca de la barra de menús (o del cursor del ratón).
- Recuerda el tamaño/la posición por sesión.
- Se recarga automáticamente cuando cambian los archivos de lienzo locales.
- Solo hay un panel de Canvas visible a la vez (la sesión se cambia según sea necesario).

Canvas se puede desactivar desde Configuración → **Permitir Canvas**. Cuando está desactivado, los
comandos del nodo canvas devuelven `CANVAS_DISABLED`.

## Superficie de la API del agente

Canvas se expone a través del **WebSocket de Gateway**, por lo que el agente puede:

- mostrar/ocultar el panel
- navegar a una ruta o URL
- evaluar JavaScript
- capturar una imagen instantánea

Ejemplos de CLI:

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

Notas:

- `canvas.navigate` acepta **rutas de canvas locales**, URL `http(s)` y URL `file://`.
- Si pasas `"/"`, Canvas muestra el andamiaje local o `index.html`.

## A2UI en Canvas

A2UI está alojado por el host de lienzo de Gateway y se renderiza dentro del panel de Canvas.
Cuando Gateway anuncia un host de Canvas, la aplicación de macOS navega automáticamente a la
página de host de A2UI en el primer abierto.

URL del host A2UI predeterminado:

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### Comandos A2UI (v0.8)

Actualmente, Canvas acepta mensajes de servidor→cliente **A2UI v0.8**:

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

`createSurface` (v0.9) no es compatible.

Ejemplo de CLI:

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

Prueba rápida:

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## Activar ejecuciones de agente desde Canvas

Canvas puede activar nuevas ejecuciones de agente a través de enlaces profundos:

- `openclaw://agent?...`

Ejemplo (en JS):

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

La aplicación solicita confirmación a menos que se proporcione una clave válida.

## Notas de seguridad

- El esquema de Canvas bloquea el cruce de directorios; los archivos deben estar en la raíz de la sesión.
- El contenido local de Canvas utiliza un esquema personalizado (no se requiere servidor de loopback).
- Las URLs externas `http(s)` solo se permiten cuando se navega explícitamente.

## Relacionado

- [Aplicación macOS](/es/platforms/macos)
- [WebChat](/es/web/webchat)
