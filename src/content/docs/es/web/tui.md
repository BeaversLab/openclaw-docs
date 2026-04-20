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
- Registro de chat: mensajes de usuario, respuestas del asistente, avisos del sistema, tarjetas de herramientas.
- Línea de estado: estado de conexión/ejecución (conectando, ejecutando, transmitiendo, inactivo, error).
- Pie de página: estado de conexión + agente + sesión + modelo + think/fast/verbose/trace/reasoning + recuento de tokens + deliver.
- Entrada: editor de texto con autocompletado.

## Modelo mental: agentes + sesiones

- Los agentes son identificadores únicos (p. ej., `main`, `research`). La Gateway expone la lista.
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
  - o inicie con `openclaw tui --deliver`

## Selectores + superposiciones

- Selector de modelo: lista los modelos disponibles y establece la anulación de la sesión.
- Selector de agente: elige un agente diferente.
- Selector de sesión: muestra solo las sesiones del agente actual.
- Configuración: activar/desactivar entrega, expansión de salida de herramientas y visibilidad de pensamiento.

## Atajos de teclado

- Enter: enviar mensaje
- Esc: interrumpir ejecución activa
- Ctrl+C: borrar entrada (presione dos veces para salir)
- Ctrl+D: salir
- Ctrl+L: selector de modelo
- Ctrl+G: selector de agente
- Ctrl+P: selector de sesión
- Ctrl+O: alternar expansión de salida de herramientas
- Ctrl+T: alternar visibilidad de pensamiento (recarga el historial)

## Comandos de barra

Principal:

- `/help`
- `/status`
- `/agent <id>` (o `/agents`)
- `/session <key>` (o `/sessions`)
- `/model <provider/model>` (o `/models`)

Controles de sesión:

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
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

Otros comandos de barra del Gateway (por ejemplo, `/context`) se reenvían al Gateway y se muestran como salida del sistema. Consulte [Slash commands](/es/tools/slash-commands).

## Comandos de shell local

- Prefije una línea con `!` para ejecutar un comando de shell local en el host de la TUI.
- La TUI solicita una vez por sesión permitir la ejecución local; si se rechaza, `!` permanece deshabilitado para la sesión.
- Los comandos se ejecutan en un shell nuevo y no interactivo en el directorio de trabajo de la TUI (sin `cd`/env persistente).
- Los comandos de shell local reciben `OPENCLAW_SHELL=tui-local` en su entorno.
- Un `!` solitario se envía como un mensaje normal; los espacios iniciales no activan la ejecución local.

## Salida de herramientas

- Las llamadas a herramientas se muestran como tarjetas con argumentos + resultados.
- Ctrl+O alterna entre las vistas contraídas y expandidas.
- Mientras se ejecutan las herramientas, las actualizaciones parciales se transmiten a la misma tarjeta.

## Colores de terminal

- La TUI mantiene el texto del cuerpo del asistente en el primer plano predeterminado de su terminal, por lo que los terminales oscuros y claros siguen siendo legibles.
- Si su terminal usa un fondo claro y la detección automática es incorrecta, establezca `OPENCLAW_THEME=light` antes de iniciar `openclaw tui`.
- Para forzar la paleta oscura original en su lugar, establezca `OPENCLAW_THEME=dark`.

## Historial + streaming

- Al conectarse, la TUI carga el historial más reciente (predeterminado 200 mensajes).
- Las respuestas en streaming se actualizan en su lugar hasta que se finalizan.
- La TUI también escucha los eventos de herramientas del agente para obtener tarjetas de herramientas más ricas.

## Detalles de conexión

- La TUI se registra en el Gateway como `mode: "tui"`.
- Las reconexiones muestran un mensaje del sistema; los huecos en los eventos se muestran en el registro.

## Opciones

- `--url <url>`: URL del WebSocket de Gateway (por defecto usa la configuración o `ws://127.0.0.1:<port>`)
- `--token <token>`: Token de Gateway (si es necesario)
- `--password <password>`: Contraseña de Gateway (si es necesario)
- `--session <key>`: Clave de sesión (predeterminado: `main`, o `global` cuando el alcance es global)
- `--deliver`: Entrega las respuestas del asistente al proveedor (desactivado por defecto)
- `--thinking <level>`: Anular el nivel de pensamiento para los envíos
- `--message <text>`: Enviar un mensaje inicial después de conectar
- `--timeout-ms <ms>`: Tiempo de espera del agente en ms (por defecto `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`: Entradas del historial a cargar (predeterminado `200`)

Nota: cuando configura `--url`, la TUI no recurre a las credenciales de configuración o de entorno.
Pase `--token` o `--password` explícitamente. Faltar credenciales explícitas es un error.

## Solución de problemas

Sin salida después de enviar un mensaje:

- Ejecute `/status` en la TUI para confirmar que el Gateway está conectado e inactivo/ocupado.
- Verifique los registros de Gateway: `openclaw logs --follow`.
- Confirme que el agente puede ejecutarse: `openclaw status` y `openclaw models status`.
- Si espera mensajes en un canal de chat, habilite la entrega (`/deliver on` o `--deliver`).

## Solución de problemas de conexión

- `disconnected`: asegúrese de que Gateway se esté ejecutando y que sus `--url/--token/--password` sean correctos.
- Sin agentes en el selector: verifique `openclaw agents list` y su configuración de enrutamiento.
- Selector de sesión vacío: es posible que esté en el alcance global o que aún no tenga sesiones.

## Relacionado

- [Interfaz de control (Control UI)](/es/web/control-ui) — interfaz de control basada en web
- [Referencia de CLI](/es/cli) — referencia completa de comandos de CLI
