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

## Envío y entrega

- Los mensajes se envían a la Gateway; la entrega a los proveedores está desactivada por defecto.
- Activar la entrega:
  - `/deliver on`
  - o el panel de Configuración
  - o comience con `openclaw tui --deliver`

## Selectores y superposiciones

- Selector de modelos: enumera los modelos disponibles y establece la anulación de la sesión.
- Selector de agentes: elige un agente diferente.
- Selector de sesiones: muestra solo las sesiones del agente actual.
- Configuración: activar o desactivar la entrega, la expansión de la salida de herramientas y la visibilidad del pensamiento.

## Atajos de teclado

- Enter: enviar mensaje
- Esc: abortar ejecución activa
- Ctrl+C: borrar entrada (presiona dos veces para salir)
- Ctrl+D: salir
- Ctrl+L: selector de modelos
- Ctrl+G: selector de agentes
- Ctrl+P: selector de sesiones
- Ctrl+O: alternar expansión de la salida de herramientas
- Ctrl+T: alternar la visibilidad del pensamiento (recarga el historial)

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
- La TUI solicita una vez por sesión para permitir la ejecución local; si se rechaza, `!` permanece deshabilitado para la sesión.
- Los comandos se ejecutan en un shell nuevo y no interactivo en el directorio de trabajo de la TUI (sin `cd`/env persistente).
- Los comandos de shell local reciben `OPENCLAW_SHELL=tui-local` en su entorno.
- Un `!` solitario se envía como un mensaje normal; los espacios iniciales no activan la ejecución local.

## Reparar configuraciones desde la TUI local

Use el modo local cuando la configuración actual ya es válida y desea que
el agente integrado la inspeccione en la misma máquina, la compare con la documentación,
y ayude a reparar desviaciones sin depender de un Gateway en ejecución.

Si `openclaw config validate` ya está fallando, comience con `openclaw configure`
o `openclaw doctor --fix` primero. `openclaw chat` no omite el guardián de configuración no válida.

Bucle típico:

1. Iniciar el modo local:

```bash
openclaw chat
```

2. Pregunte al agente qué desea verificar, por ejemplo:

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. Use comandos de shell local para obtener pruebas y validación exactas:

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. Aplique cambios limitados con `openclaw config set` o `openclaw configure` y luego vuelva a ejecutar `!openclaw config validate`.
5. Si Doctor recomienda una migración o reparación automática, revísela y ejecute `!openclaw doctor --fix`.

Consejos:

- Prefiera `openclaw config set` o `openclaw configure` en lugar de editar manualmente `openclaw.json`.
- `openclaw docs "<query>"` busca el índice de documentos en vivo desde la misma máquina.
- `openclaw config validate --json` es útil cuando desea errores de esquema estructurado y de SecretRef/resolvability.

## Salida de herramientas

- Las llamadas a herramientas se muestran como tarjetas con argumentos + resultados.
- Ctrl+O alterna entre las vistas contraídas y expandidas.
- Mientras se ejecutan las herramientas, las actualizaciones parciales se transmiten a la misma tarjeta.

## Colores de la terminal

- La TUI mantiene el texto del cuerpo del asistente en el primer plano predeterminado de su terminal, por lo que las terminales oscuras y claras siguen siendo legibles.
- Si su terminal usa un fondo claro y la detección automática es incorrecta, establezca `OPENCLAW_THEME=light` antes de iniciar `openclaw tui`.
- Para forzar la paleta oscura original en su lugar, establezca `OPENCLAW_THEME=dark`.

## Historial + streaming

- Al conectar, la TUI carga el historial más reciente (por defecto 200 mensajes).
- Las respuestas en streaming se actualizan en su lugar hasta que se finalizan.
- La TUI también escucha los eventos de herramientas del agente para tarjetas de herramientas más ricas.

## Detalles de la conexión

- La TUI se registra en el Gateway como `mode: "tui"`.
- Las reconexiones muestran un mensaje del sistema; las brechas de eventos se muestran en el registro.

## Opciones

- `--local`: Ejecutar contra el tiempo de ejecución del agente integrado local
- `--url <url>`: URL de WebSocket del Gateway (el valor predeterminado es la configuración o `ws://127.0.0.1:<port>`)
- `--token <token>`: Token del Gateway (si se requiere)
- `--password <password>`: Contraseña de Gateway (si es requerida)
- `--session <key>`: Clave de sesión (predeterminado: `main`, o `global` cuando el alcance es global)
- `--deliver`: Entregar las respuestas del asistente al proveedor (desactivado por defecto)
- `--thinking <level>`: Anular el nivel de pensamiento para los envíos
- `--message <text>`: Enviar un mensaje inicial después de conectar
- `--timeout-ms <ms>`: Tiempo de espera del agente en ms (por defecto `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`: Entradas de historial a cargar (predeterminado `200`)

<Warning>Cuando configura `--url`, la TUI no recurre a las credenciales de configuración o del entorno. Pase `--token` o `--password` explícitamente. Faltar credenciales explícitas es un error. En modo local, no pase `--url`, `--token`, o `--password`.</Warning>

## Solución de problemas

Sin salida después de enviar un mensaje:

- Ejecute `/status` en la TUI para confirmar que el Gateway está conectado y inactivo/ocupado.
- Revise los registros del Gateway: `openclaw logs --follow`.
- Confirme que el agente puede ejecutarse: `openclaw status` y `openclaw models status`.
- Si espera mensajes en un canal de chat, habilite la entrega (`/deliver on` o `--deliver`).

## Solución de problemas de conexión

- `disconnected`: asegúrese de que el Gateway se esté ejecutando y que sus `--url/--token/--password` sean correctas.
- No hay agentes en el selector: revise `openclaw agents list` y su configuración de enrutamiento.
- Selector de sesiones vacío: es posible que se encuentre en el ámbito global o que aún no tenga sesiones.

## Relacionado

- [Control UI](/es/web/control-ui) — interfaz de control basada en web
- [Config](/es/cli/config) — inspeccionar, validar y editar `openclaw.json`
- [Doctor](/es/cli/doctor) — verificaciones guiadas de reparación y migración
- [CLI Reference](/es/cli) — referencia completa de comandos de la CLI
