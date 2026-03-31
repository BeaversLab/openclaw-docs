---
summary: "Interfaz de terminal (TUI): conéctese a la Gateway desde cualquier máquina"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (Interfaz de terminal)

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
- Historial de chat: mensajes del usuario, respuestas del asistente, avisos del sistema, tarjetas de herramientas.
- Línea de estado: estado de conexión/ejecución (conectando, ejecutando, transmitiendo, inactivo, error).
- Pie de página: estado de conexión + agente + sesión + modelo + pensamiento/verboso/razonamiento + recuentos de tokens + entregar.
- Entrada: editor de texto con autocompletado.

## Modelo mental: agentes + sesiones

- Los agentes son identificadores únicos (slugs) (por ejemplo, `main`, `research`). La Gateway expone la lista.
- Las sesiones pertenecen al agente actual.
- Las claves de sesión se almacenan como `agent:<agentId>:<sessionKey>`.
  - Si escribe `/session main`, la TUI lo expande a `agent:<currentAgent>:main`.
  - Si escribe `/session agent:other:main`, cambia explícitamente a esa sesión de agente.
- Ámbito de sesión:
  - `per-sender` (predeterminado): cada agente tiene muchas sesiones.
  - `global`: la TUI siempre usa la sesión `global` (el selector puede estar vacío).
- El agente actual + sesión siempre son visibles en el pie de página.

## Envío + entrega

- Los mensajes se envían a la Gateway; la entrega a los proveedores está desactivada de forma predeterminada.
- Activar la entrega:
  - `/deliver on`
  - o el panel Configuración
  - o iniciar con `openclaw tui --deliver`

## Selectores + superposiciones

- Selector de modelo: enumera los modelos disponibles y establece la anulación de sesión.
- Selector de agente: elija un agente diferente.
- Selector de sesión: muestra solo las sesiones del agente actual.
- Configuración: alternar entrega, expansión de salida de herramientas y visibilidad del pensamiento.

## Atajos de teclado

- Enter: enviar mensaje
- Esc: abortar ejecución activa
- Ctrl+C: borrar entrada (presione dos veces para salir)
- Ctrl+D: salir
- Ctrl+L: selector de modelo
- Ctrl+G: selector de agente
- Ctrl+P: selector de sesión
- Ctrl+O: alternar expansión de salida de herramientas
- Ctrl+T: alternar visibilidad del pensamiento (recarga el historial)

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

Otros comandos de barra del Gateway (por ejemplo, `/context`) se reenvían al Gateway y se muestran como resultado del sistema. Consulte [Comandos de barra](/en/tools/slash-commands).

## Comandos de shell local

- Prefije una línea con `!` para ejecutar un comando de shell local en el host de la TUI.
- La TUI solicita una vez por sesión permitir la ejecución local; si se rechaza, `!` se mantiene deshabilitado para la sesión.
- Los comandos se ejecutan en un shell nuevo y no interactivo en el directorio de trabajo de la TUI (sin `cd`/env persistente).
- Un `!` solitario se envía como un mensaje normal; los espacios iniciales no activan la ejecución local.

## Resultado de la herramienta

- Las llamadas a herramientas se muestran como tarjetas con argumentos y resultados.
- Ctrl+O alterna entre las vistas contraídas y expandidas.
- Mientras se ejecutan las herramientas, las actualizaciones parciales se transmiten en la misma tarjeta.

## Historial + transmisión

- Al conectarse, la TUI carga el historial más reciente (200 mensajes por defecto).
- Las respuestas de transmisión se actualizan en el lugar hasta que se finalizan.
- La TUI también escucha los eventos de herramientas del agente para obtener tarjetas de herramientas más ricas.

## Detalles de conexión

- La TUI se registra en el Gateway como `mode: "tui"`.
- Las reconexiones muestran un mensaje del sistema; las brechas de eventos se muestran en el registro.

## Opciones

- `--url <url>`: URL de WebSocket del Gateway (el valor predeterminado es la configuración o `ws://127.0.0.1:<port>`)
- `--token <token>`: token del Gateway (si es necesario)
- `--password <password>`: Contraseña del Gateway (si se requiere)
- `--session <key>`: Clave de sesión (predeterminado: `main`, o `global` cuando el ámbito es global)
- `--deliver`: Entregar las respuestas del asistente al proveedor (desactivado de forma predeterminada)
- `--thinking <level>`: Anular el nivel de reflexión para los envíos
- `--timeout-ms <ms>`: Tiempo de espera del agente en ms (predeterminado en `agents.defaults.timeoutSeconds`)

Nota: cuando configuras `--url`, la TUI no recurre a las credenciales del entorno o de la configuración.
Pasa `--token` o `--password` explícitamente. La ausencia de credenciales explícitas es un error.

## Solución de problemas

Sin salida después de enviar un mensaje:

- Ejecuta `/status` en la TUI para confirmar que el Gateway está conectado e inactivo/ocupado.
- Revisa los registros del Gateway: `openclaw logs --follow`.
- Confirma que el agente puede ejecutarse: `openclaw status` y `openclaw models status`.
- Si esperas mensajes en un canal de chat, habilita la entrega (`/deliver on` o `--deliver`).
- `--history-limit <n>`: Entradas de historial para cargar (predeterminado 200)

## Solución de problemas

- `disconnected`: asegúrate de que el Gateway se esté ejecutando y que tus `--url/--token/--password` sean correctas.
- No hay agentes en el selector: revisa `openclaw agents list` y tu configuración de enrutamiento.
- Selector de sesión vacío: es posible que estés en el ámbito global o que aún no tengas sesiones.
