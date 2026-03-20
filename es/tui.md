---
summary: "Terminal UI (TUI): conéctese a la Gateway desde cualquier máquina"
read_when:
  - Quiere un tutorial para principiantes de la TUI
  - Necesita la lista completa de funciones, comandos y accesos directos de la TUI
title: "TUI"
---

# TUI (Terminal UI)

## Inicio rápido

1. Inicie la Gateway.

```bash
openclaw gateway
```

2. Abra la TUI.

```bash
openclaw tui
```

3. Escriba un mensaje y presione Enter.

Gateway remota:

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

Use `--password` si su Gateway usa autenticación por contraseña.

## Lo que ve

- Encabezado: URL de conexión, agente actual, sesión actual.
- Registro de chat: mensajes del usuario, respuestas del asistente, avisos del sistema, tarjetas de herramientas.
- Línea de estado: estado de conexión/ejecución (conectando, ejecutando, transmitiendo, inactivo, error).
- Pie de página: estado de conexión + agente + sesión + modelo + pensar/detallado/razonamiento + recuento de tokens + entregar.
- Entrada: editor de texto con autocompletado.

## Modelo mental: agentes + sesiones

- Los agentes son identificadores únicos (p. ej. `main`, `research`). La Gateway expone la lista.
- Las sesiones pertenecen al agente actual.
- Las claves de sesión se almacenan como `agent:<agentId>:<sessionKey>`.
  - Si escribe `/session main`, la TUI lo expande a `agent:<currentAgent>:main`.
  - Si escribe `/session agent:other:main`, cambia explícitamente a esa sesión de agente.
- Ámbito de sesión:
  - `per-sender` (predeterminado): cada agente tiene muchas sesiones.
  - `global`: la TUI siempre usa la sesión `global` (el selector puede estar vacío).
- El agente actual + la sesión siempre son visibles en el pie de página.

## Envío + entrega

- Los mensajes se envían a la Gateway; la entrega a los proveedores está desactivada de forma predeterminada.
- Activar la entrega:
  - `/deliver on`
  - o el panel Configuración
  - o inicie con `openclaw tui --deliver`

## Selectores + superposiciones

- Selector de modelo: lista los modelos disponibles y establece la anulación de sesión.
- Selector de agente: elija un agente diferente.
- Selector de sesión: muestra solo las sesiones del agente actual.
- Configuración: alternar entrega, expansión de salida de herramientas y visibilidad de pensamiento.

## Atajos de teclado

- Enter: enviar mensaje
- Esc: abortar ejecución activa
- Ctrl+C: borrar entrada (presione dos veces para salir)
- Ctrl+D: salir
- Ctrl+L: selector de modelo
- Ctrl+G: selector de agente
- Ctrl+P: selector de sesión
- Ctrl+O: alternar expansión de salida de herramientas
- Ctrl+T: alternar visibilidad de pensamiento (recarga el historial)

## Comandos de barra

Núcleo:

- `/help`
- `/status`
- `/agent <id>` (o `/agents`)
- `/session <key>` (o `/sessions`)
- `/model <provider/model>` (o `/models`)

Controles de sesión:

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (alias: `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Ciclo de vida de la sesión:

- `/new` o `/reset` (restablecer la sesión)
- `/abort` (abortar la ejecución activa)
- `/settings`
- `/exit`

Otros comandos de barra diagonal del Gateway (por ejemplo, `/context`) se reenvían al Gateway y se muestran como resultado del sistema. Consulte [Slash commands](/es/tools/slash-commands).

## Comandos de shell local

- Prefije una línea con `!` para ejecutar un comando de shell local en el host de la TUI.
- La TUI solicita una vez por sesión permitir la ejecución local; si se rechaza, `!` permanece deshabilitado para la sesión.
- Los comandos se ejecutan en un shell nuevo y no interactivo en el directorio de trabajo de la TUI (sin `cd`/env persistente).
- Un `!` solitario se envía como un mensaje normal; los espacios al principio no activan la ejecución local.

## Resultado de herramientas

- Las llamadas a herramientas se muestran como tarjetas con argumentos y resultados.
- Ctrl+O alterna entre las vistas contraída y expandida.
- Mientras se ejecutan las herramientas, las actualizaciones parciales se transmiten en la misma tarjeta.

## Historial + transmisión

- Al conectarse, la TUI carga el historial más reciente (por defecto, 200 mensajes).
- Las respuestas de transmisión se actualizan en su lugar hasta que se finaliza.
- La TUI también escucha los eventos de herramientas del agente para obtener tarjetas de herramientas más enriquecidas.

## Detalles de conexión

- La TUI se registra en el Gateway como `mode: "tui"`.
- Las reconexiones muestran un mensaje del sistema; las brechas de eventos se muestran en el registro.

## Opciones

- `--url <url>`: URL de WebSocket del Gateway (por defecto, configuración o `ws://127.0.0.1:<port>`)
- `--token <token>`: token del Gateway (si es necesario)
- `--password <password>`: Contraseña de Gateway (si es necesaria)
- `--session <key>`: Clave de sesión (predeterminado: `main`, o `global` cuando el ámbito es global)
- `--deliver`: Entregar las respuestas del asistente al proveedor (desactivado de forma predeterminada)
- `--thinking <level>`: Anular el nivel de pensamiento para los envíos
- `--timeout-ms <ms>`: Tiempo de espera del agente en ms (predeterminado `agents.defaults.timeoutSeconds`)

Nota: cuando estableces `--url`, la TUI no recurre a las credenciales de configuración o del entorno.
Pasa `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

## Solución de problemas

Sin salida después de enviar un mensaje:

- Ejecuta `/status` en la TUI para confirmar que el Gateway está conectado e inactivo/ocupado.
- Revisa los registros del Gateway: `openclaw logs --follow`.
- Confirma que el agente puede ejecutarse: `openclaw status` y `openclaw models status`.
- Si esperas mensajes en un canal de chat, activa la entrega (`/deliver on` o `--deliver`).
- `--history-limit <n>`: Entradas de historial para cargar (predeterminado 200)

## Solución de problemas

- `disconnected`: asegúrate de que el Gateway se esté ejecutando y que tus `--url/--token/--password` sean correctas.
- Sin agentes en el selector: revisa `openclaw agents list` y tu configuración de enrutamiento.
- Selector de sesión vacío: es posible que estés en el ámbito global o que aún no tengas sesiones.

import es from "/components/footer/es.mdx";

<es />
