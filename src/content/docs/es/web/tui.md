---
summary: "Interfaz de terminal (TUI): conéctate a la Gateway o ejecuta localmente en modo integrado"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

## Inicio rápido

### Modo Gateway

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

### Modo local

Ejecute la TUI sin un Gateway:

```bash
openclaw chat
# or
openclaw tui --local
```

Notas:

- `openclaw chat` y `openclaw terminal` son alias de `openclaw tui --local`.
- `--local` no se puede combinar con `--url`, `--token` o `--password`.
- El modo local utiliza directamente el tiempo de ejecución del agente integrado. La mayoría de las herramientas locales funcionan, pero las funciones exclusivas del Gateway no están disponibles.
- `openclaw` y `openclaw crestodian` también usan este shell de TUI, con Crestodian como el backend de chat de configuración y reparación local.

## Lo que ves

- Encabezado: URL de conexión, agente actual, sesión actual.
- Registro de chat: mensajes de usuario, respuestas del asistente, avisos del sistema, tarjetas de herramientas.
- Línea de estado: estado de conexión/ejecución (conectando, ejecutando, transmitiendo, inactivo, error).
- Pie de página: estado de conexión + agente + sesión + modelo + think/fast/verbose/trace/reasoning + recuento de tokens + entregar.
- Entrada: editor de texto con autocompletado.

## Modelo mental: agentes + sesiones

- Los agentes son slugs únicos (ej. `main`, `research`). El Gateway expone la lista.
- Las sesiones pertenecen al agente actual.
- Las claves de sesión se almacenan como `agent:<agentId>:<sessionKey>`.
  - Si escribe `/session main`, la TUI lo expande a `agent:<currentAgent>:main`.
  - Si escribe `/session agent:other:main`, cambia explícitamente a esa sesión de agente.
- Ámbito de sesión:
  - `per-sender` (predeterminado): cada agente tiene muchas sesiones.
  - `global`: la TUI siempre usa la sesión `global` (el selector puede estar vacío).
- El agente actual + la sesión siempre son visibles en el pie de página.
- Cuando se inicia sin `--session`, la TUI en modo de puerta de enlace reanuda la última sesión seleccionada para la misma puerta de enlace, agente y alcance de sesión si esa sesión todavía existe. Pasar `--session`, `/session`, `/new` o `/reset` permanece explícito.

## Envío y entrega

- Los mensajes se envían a la puerta de enlace; la entrega a los proveedores está desactivada por defecto.
- Activar la entrega:
  - `/deliver on`
  - o el panel de Configuración
  - o iniciar con `openclaw tui --deliver`

## Selectores y superposiciones

- Selector de modelo: lista los modelos disponibles y establece la anulación de la sesión.
- Selector de agente: elige un agente diferente.
- Selector de sesión: muestra hasta 50 sesiones para el agente actual actualizadas en los últimos 7 días. Usa `/session <key>` para saltar a una sesión conocida más antigua.
- Configuración: alternar entrega, expansión de la salida de herramientas y visibilidad del pensamiento.

## Atajos de teclado

- Intro: enviar mensaje
- Esc: abortar ejecución activa
- Ctrl+C: borrar entrada (presiona dos veces para salir)
- Ctrl+D: salir
- Ctrl+L: selector de modelo
- Ctrl+G: selector de agente
- Ctrl+P: selector de sesión
- Ctrl+O: alternar expansión de la salida de herramientas
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

Solo en modo local:

- `/auth [provider]` abre el flujo de autenticación/inicio de sesión del proveedor dentro de la TUI.

Otros comandos de barra del Gateway (por ejemplo, `/context`) se reenvían al Gateway y se muestran como salida del sistema. Consulte [Slash commands](/es/tools/slash-commands).

## Comandos de shell local

- Prefije una línea con `!` para ejecutar un comando de shell local en el host de la TUI.
- La TUI solicita una vez por sesión permitir la ejecución local; rechazarlo mantiene `!` deshabilitado para la sesión.
- Los comandos se ejecutan en un shell nuevo y no interactivo en el directorio de trabajo de la TUI (sin `cd`/env persistente).
- Los comandos de shell local reciben `OPENCLAW_SHELL=tui-local` en su entorno.
- Un `!` solitario se envía como un mensaje normal; los espacios iniciales no activan la ejecución local.

## Reparar configuraciones desde la TUI local

Use el modo local cuando la configuración actual ya sea válida y desee que
el agente integrado la inspeccione en la misma máquina, la compare con la documentación,
y ayude a reparar las desviaciones sin depender de un Gateway en ejecución.

Si `openclaw config validate` ya está fallando, comience con `openclaw configure`
o `openclaw doctor --fix` primero. `openclaw chat` no omite el guardián de
configuración no válida.

Bucle típico:

1. Iniciar el modo local:

```bash
openclaw chat
```

2. Pregunte al agente qué desea verificar, por ejemplo:

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. Use comandos de shell local para obtener pruebas exactas y validación:

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. Aplique cambios específicos con `openclaw config set` o `openclaw configure`, luego vuelva a ejecutar `!openclaw config validate`.
5. Si Doctor recomienda una migración o reparación automática, revísela y ejecute `!openclaw doctor --fix`.

Consejos:

- Prefiera `openclaw config set` o `openclaw configure` antes que editar `openclaw.json` manualmente.
- `openclaw docs "<query>"` busca el índice de documentación en vivo desde la misma máquina.
- `openclaw config validate --json` es útil cuando desea errores de esquema estructurado y errores de resolución de SecretRef.

## Salida de herramientas

- Las llamadas a herramientas se muestran como tarjetas con argumentos + resultados.
- Ctrl+O alterna entre las vistas contraídas y expandidas.
- Mientras se ejecutan las herramientas, las actualizaciones parciales se transmiten a la misma tarjeta.

## Colores de la terminal

- La TUI mantiene el texto del cuerpo del asistente en el primer plano predeterminado de su terminal, por lo que las terminales oscuras y claras siguen siendo legibles.
- Si tu terminal usa un fondo claro y la detección automática es incorrecta, establece `OPENCLAW_THEME=light` antes de iniciar `openclaw tui`.
- Para forzar la paleta oscura original, establece `OPENCLAW_THEME=dark`.

## Historial + transmisión en tiempo real

- Al conectarse, la TUI carga el historial más reciente (por defecto 200 mensajes).
- Las respuestas en tiempo real se actualizan en su lugar hasta finalizarse.
- La TUI también escucha eventos de herramientas del agente para tarjetas de herramientas más enriquecidas.

## Detalles de conexión

- La TUI se registra con el Gateway como `mode: "tui"`.
- Las reconexiones muestran un mensaje del sistema; las lagunas de eventos se muestran en el registro.

## Opciones

- `--local`: Ejecutar contra el runtime de agente local incrustado
- `--url <url>`: URL del WebSocket del Gateway (por defecto a la configuración o `ws://127.0.0.1:<port>`)
- `--token <token>`: Token del Gateway (si se requiere)
- `--password <password>`: Contraseña del Gateway (si se requiere)
- `--session <key>`: Clave de sesión (por defecto: `main`, o `global` cuando el alcance es global)
- `--deliver`: Entregar las respuestas del asistente al proveedor (desactivado por defecto)
- `--thinking <level>`: Anular el nivel de pensamiento para los envíos
- `--message <text>`: Enviar un mensaje inicial después de conectarse
- `--timeout-ms <ms>`: Tiempo de espera del agente en ms (por defecto `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`: Entradas de historial a cargar (por defecto `200`)

<Warning>Cuando estableces `--url`, la TUI no recurre a las credenciales de configuración o del entorno. Pasa `--token` o `--password` explícitamente. Faltar credenciales explícitas es un error. En modo local, no pases `--url`, `--token`, o `--password`.</Warning>

## Solución de problemas

Sin salida después de enviar un mensaje:

- Ejecuta `/status` en la TUI para confirmar que el Gateway está conectado y inactivo/ocupado.
- Revisa los registros del Gateway: `openclaw logs --follow`.
- Confirma que el agente puede ejecutarse: `openclaw status` y `openclaw models status`.
- Si esperas mensajes en un canal de chat, activa la entrega (`/deliver on` o `--deliver`).

## Solución de problemas de conexión

- `disconnected`: asegúrate de que el Gateway se esté ejecutando y de que tus `--url/--token/--password` sean correctas.
- No hay agentes en el selector: verifica `openclaw agents list` y tu configuración de enrutamiento.
- Selector de sesiones vacío: es posible que estés en el ámbito global o que aún no tengas sesiones.

## Relacionado

- [Interfaz de control](/es/web/control-ui) — interfaz de control basada en web
- [Configuración](/es/cli/config) — inspeccionar, validar y editar `openclaw.json`
- [Doctor](/es/cli/doctor) — comprobaciones guiadas de reparación y migración
- [Referencia de la CLI](/es/cli) — referencia completa de comandos de la CLI
