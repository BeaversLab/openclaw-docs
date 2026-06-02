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
- Después de que un archivo de configuración ha establecido los ajustes, `openclaw` y `openclaw crestodian` también utilizan este shell de la TUI, con Crestodian como el backend de chat para la configuración y reparación local.

## Lo que ves

- Encabezado: URL de conexión, agente actual, sesión actual.
- Registro de chat: mensajes de usuario, respuestas del asistente, avisos del sistema, tarjetas de herramientas.
- Línea de estado: estado de conexión/ejecución (conectando, ejecutando, transmitiendo, inactivo, error).
- Pie de página: estado de conexión + agente + sesión + modelo + estado del objetivo + think/fast/verbose/trace/reasoning + recuento de tokens + deliver.
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
- Si la sesión tiene un [goal](/es/tools/goal), el pie de página muestra su estado compacto
  tal como `Pursuing goal`, `Goal paused (/goal resume)` o
  `Goal achieved`.
- Cuando se inicia sin `--session`, la TUI en modo gateway reanuda la última sesión seleccionada para el mismo gateway, agente y ámbito de sesión si esa sesión todavía existe. Pasar `--session`, `/session`, `/new` o `/reset` permanece explícito.

## Envío y entrega

- Los mensajes se envían al Gateway; la entrega a los proveedores está desactivada por defecto.
- La TUI es una superficie de origen interna como WebChat, no un canal de salida genérico. Los arneses que requieren `tools.message` para respuestas visibles pueden satisfacer el turno activo de la TUI con un `message.send` sin destino; la entrega explícita al proveedor todavía usa canales configurados normales y nunca recurre a `lastChannel`.
- Activar la entrega:
  - `/deliver on`
  - o el panel Configuración
  - o iniciar con `openclaw tui --deliver`

## Selectores y superposiciones

- Selector de modelo: lista los modelos disponibles y establece la anulación de sesión.
- Selector de agente: elige un agente diferente.
- Selector de sesión: muestra hasta 50 sesiones para el agente actual actualizadas en los últimos 7 días. Usa `/session <key>` para saltar a una sesión conocida más antigua.
- Configuración: alternar entrega, expansión de salida de herramientas y visibilidad de pensamiento.

## Atajos de teclado

- Enter: enviar mensaje
- Esc: abortar ejecución activa
- Ctrl+C: borrar entrada (presiona dos veces para salir)
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
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/goal [status] | /goal start <objective> | /goal pause|resume|complete|block|clear`
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
- La TUI solicita una vez por sesión permitir la ejecución local; al declinar, `!` se mantiene deshabilitado para la sesión.
- Los comandos se ejecutan en un shell nuevo y no interactivo en el directorio de trabajo de la TUI (sin `cd`/env persistente).
- Los comandos de shell local reciben `OPENCLAW_SHELL=tui-local` en su entorno.
- Un `!` solitario se envía como un mensaje normal; los espacios iniciales no activan la ejecución local.

## Reparar configuraciones desde la TUI local

Use el modo local cuando la configuración actual ya sea válida y desee que
el agente integrado la inspeccione en la misma máquina, la compare con la documentación
y ayude a reparar las desviaciones sin depender de un Gateway en ejecución.

Si `openclaw config validate` ya está fallando, comience con `openclaw configure`
o `openclaw doctor --fix` primero. `openclaw chat` no omite el guardián de
configuración no válida.

Bucle típico:

1. Iniciar modo local:

```bash
openclaw chat
```

2. Pregunte al agente qué desea que verifique, por ejemplo:

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. Use comandos de shell local para obtener evidencia exacta y validación:

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. Aplique cambios específicos con `openclaw config set` o `openclaw configure`, luego vuelva a ejecutar `!openclaw config validate`.
5. Si Doctor recomienda una migración o reparación automática, revísela y ejecute `!openclaw doctor --fix`.

Consejos:

- Prefiera `openclaw config set` o `openclaw configure` antes que editar manualmente `openclaw.json`.
- `openclaw docs "<query>"` busca en el índice de documentación en vivo desde la misma máquina.
- `openclaw config validate --json` es útil cuando desea errores de esquema estructurado y de SecretRef/resolubilidad.

## Salida de la herramienta

- Las llamadas a herramientas se muestran como tarjetas con argumentos + resultados.
- Ctrl+O alterna entre las vistas contraídas y expandidas.
- Mientras se ejecutan las herramientas, las actualizaciones parciales se transmiten a la misma tarjeta.

## Colores de la terminal

- La interfaz de usuario de texto (TUI) mantiene el texto del cuerpo del asistente en el primer plano predeterminado de su terminal, de modo que las terminales oscuras y claras sigan siendo legibles.
- Si su terminal usa un fondo claro y la detección automática es incorrecta, establezca `OPENCLAW_THEME=light` antes de iniciar `openclaw tui`.
- Para forzar la paleta oscura original en su lugar, establezca `OPENCLAW_THEME=dark`.

## Historial + transmisión

- Al conectarse, la TUI carga el historial más reciente (predeterminado: 200 mensajes).
- Las respuestas transmitidas se actualizan en su lugar hasta que se finalizan.
- La TUI también escucha los eventos de herramientas del agente para obtener tarjetas de herramientas más enriquecidas.

## Detalles de la conexión

- La TUI se registra con el Gateway como `mode: "tui"`.
- Las reconexiones muestran un mensaje del sistema; las brechas de eventos se muestran en el registro.

## Opciones

- `--local`: Ejecutar contra el tiempo de ejecución del agente integrado local
- `--url <url>`: URL de WebSocket del Gateway (predeterminado: configuración o `ws://127.0.0.1:<port>`)
- `--token <token>`: Token del Gateway (si es necesario)
- `--password <password>`: Contraseña del Gateway (si es necesario)
- `--session <key>`: Clave de sesión (predeterminado: `main`, o `global` cuando el ámbito es global)
- `--deliver`: Entregar las respuestas del asistente al proveedor (predeterminado: desactivado)
- `--thinking <level>`: Anular el nivel de pensamiento para los envíos
- `--message <text>`: Enviar un mensaje inicial después de conectarse
- `--timeout-ms <ms>`: Tiempo de espera del agente en ms (predeterminado: `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`: Historial de entradas a cargar (predeterminado `200`)

<Warning>Cuando establece `--url`, la TUI no recurre a las credenciales de configuración o del entorno. Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error. En el modo local, no pase `--url`, `--token`, o `--password`.</Warning>

## Solución de problemas

Sin salida después de enviar un mensaje:

- Ejecute `/status` en la TUI para confirmar que el Gateway está conectado y inactivo/ocupado.
- Verifique los registros del Gateway: `openclaw logs --follow`.
- Confirme que el agente puede ejecutarse: `openclaw status` y `openclaw models status`.
- Si espera mensajes en un canal de chat, habilite la entrega (`/deliver on` o `--deliver`).

## Solución de problemas de conexión

- `disconnected`: asegúrese de que el Gateway se esté ejecutando y que sus `--url/--token/--password` sean correctas.
- Sin agentes en el selector: verifique `openclaw agents list` y su configuración de enrutamiento.
- Selector de sesiones vacío: es posible que esté en el alcance global o que aún no tenga sesiones.

## Relacionado

- [Control UI](/es/web/control-ui) — interfaz de control basada en web
- [Config](/es/cli/config) — inspeccionar, validar y editar `openclaw.json`
- [Doctor](/es/cli/doctor) — comprobaciones guiadas de reparación y migración
- [CLI Reference](/es/cli) — referencia completa de comandos de la CLI
