---
summary: "Tablero de trabajo opcional del panel para tarjetas propiedad de agentes y transferencia de sesión"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Plugin de Workboard"
---

El plugin Workboard añade un tablero estilo Kanban opcional a la
[Interfaz de Control](/es/web/control-ui). Úselo para recopilar tarjetas de trabajo del tamaño de un agente, asignarlas
a agentes y rastrear la tarea en segundo plano vinculada, la ejecución y la sesión
del panel desde una sola tarjeta.

Workboard es intencionalmente pequeño. Rastrea el trabajo operativo local para un
OpenClaw Gateway; no es un reemplazo para GitHub Issues, Linear, Jira u
otros sistemas de gestión de proyectos de equipo.

## Estado predeterminado

Workboard es un plugin incluido y está deshabilitado de forma predeterminada a menos que lo habilite
en la configuración del plugin.

Habilítelo con:

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

Luego abra el panel:

```bash
openclaw dashboard
```

La pestaña Workboard aparece en la navegación del panel. Si la pestaña es visible
pero el plugin está deshabilitado o bloqueado por `plugins.allow` / `plugins.deny`, la
vista muestra un estado de plugin no disponible en lugar de los datos de la tarjeta local.

## Qué contienen las tarjetas

Cada tarjeta almacena:

- título y notas
- estado: `triage`, `backlog`, `todo`, `scheduled`, `ready`, `running`,
  `review`, `blocked`, o `done`
- prioridad: `low`, `normal`, `high`, o `urgent`
- etiquetas
- id de agente opcional
- tarea, ejecución, sesión o URL de origen vinculada opcional
- metadatos de ejecución opcionales para una ejecución de Codex o Claude iniciada desde la tarjeta
- metadatos compactos para intentos, comentarios, enlaces, pruebas, artefactos, automatización,
  archivos adjuntos, registros de trabajo (logs), estado del protocolo de trabajo, reclamaciones, diagnósticos,
  notificaciones, plantillas, estado de archivo y detección de sesiones obsoletas
- eventos recientes de tarjetas tales como creada, movida, vinculada, reclamada, latido,
  intento, prueba, artefacto, diagnóstico, notificación, despacho, archivo, obsoleto
  o cambios actualizados por el agente

Las tarjetas se almacenan en el estado del Gateway del plugin. Son locales para el directorio de
estado del Gateway y se mueven con el resto del estado de OpenClaw de ese Gateway.

Workboard mantiene metadatos compactos por tarjeta para que los operadores puedan ver cómo se movió una tarjeta a través del tablero sin abrir la sesión vinculada. Los eventos, resúmenes de intentos, fragmentos de prueba, enlaces relacionados, comentarios, marcadores de archivo y marcadores de sesión obsoleta son metadatos intencionalmente locales; no reemplazan las transcripciones de sesión ni el historial de problemas de GitHub.

## Ejecuciones y tareas de tarjetas

Las tarjetas no vinculadas pueden iniciar trabajo desde la tarjeta. Los inicios autónomos utilizan la ruta de ejecución del agente con seguimiento de tareas del Gateway, luego Workboard vincula la tarea resultante,
el id de ejecución y la clave de sesión nuevamente en la tarjeta. El inicio utiliza el agente predeterminado
y el modelo configurado del Gateway. Las acciones de Codex y Claude son opciones explícitas de modelo opcionales:

- Ejecutar Codex o Ejecutar Claude inicia una ejecución de agente respaldada por tareas, envía el mensaje
  de la tarjeta y marca la tarjeta como `running`.
- Abrir Codex o Abrir Claude crea una sesión del panel vinculada sin enviar el aviso de la tarjeta ni mover la tarjeta, por lo que puede trabajar manualmente mientras permanece adjunta al tablero.

Los metadatos de ejecución almacenan el motor seleccionado, el modo, la referencia del modelo, la clave de sesión,
el id de ejecución, el id de tarea cuando está disponible y el estado del ciclo de vida en la tarjeta. Las ejecuciones de
Codex usan `openai/gpt-5.5`; las ejecuciones de Claude usan
`anthropic/claude-sonnet-4-6`.

Cada ejecución vinculada también registra un resumen de intento en el mismo registro de tarjeta. El resumen de intento mantiene el motor, el modo, el modelo, el id. de ejecución, las marcas de tiempo, el estado y el recuento acumulado de fallos para que los fallos repetidos sigan siendo visibles en el tablero.

El panel actualiza el estado de las tareas desde el libro mayor de tareas del Gateway y vuelve a vincular las tareas con las tarjetas mediante el id. de tarea, el id. de ejecución o la clave de sesión vinculada. Si una tarea está en cola o en ejecución, el ciclo de vida de la tarjeta muestra el estado de tarea activa. Si la tarea finaliza, falla, expira o se cancela, el ciclo de vida de la tarjeta avanza hacia un estado de revisión o bloqueado utilizando la misma sincronización del ciclo de vida que las sesiones vinculadas.

## Coordinación de agentes

Workboard también expone herramientas opcionales de agente para flujos de trabajo con conocimiento del tablero:

- `workboard_list` enumera tarjetas compactas con estado de reclamación y diagnóstico, con un
  filtro de tablero opcional.
- `workboard_read` devuelve una tarjeta más el contexto del trabajador delimitado creado a partir de notas,
  intentos, comentarios, enlaces, pruebas, artefactos, resultados principales,
  trabajo reciente del asignado y diagnósticos activos.
- `workboard_create` crea una tarjeta con padres opcionales, inquilino, habilidades,
  metadatos del tablero y del espacio de trabajo, clave de idempotencia, límite de tiempo de ejecución y presupuesto de reintentos.
- `workboard_link` vincula una tarjeta principal con una tarjeta secundaria. Las secundarias se mantienen en `todo`
  hasta que cada padre alcanza `done`; luego, la promoción de despachado las mueve a
  `ready`.
- `workboard_claim` reclama una tarjeta para el agente que llama y mueve las tarjetas de acumulación, pendientes
  o listas a `running`.
- `workboard_heartbeat` actualiza el latido de la reclamación durante ejecuciones más largas.
- `workboard_release` libera la reclamación después de la finalización, pausa o transferencia y
  puede mover la tarjeta a un siguiente estado.
- `workboard_complete` y `workboard_block` son herramientas de ciclo de vida estructuradas para
  resúmenes finales, pruebas, artefactos, manifiestos de tarjetas creadas y motivos
  de bloqueo. Los manifiestos de tarjetas creadas deben hacer referencia a las tarjetas vinculadas a la
  tarjeta completada, lo que evita que hijos fantasmas aparezcan en los resúmenes.
- `workboard_attachment_add`, `workboard_attachment_read` y
  `workboard_attachment_delete` almacenan pequeños adjuntos de tarjetas en el estado SQLite
  del complemento, las indexan en la tarjeta y las exponen en el contexto del trabajador.
- `workboard_worker_log` y `workboard_protocol_violation` registran líneas de registro del trabajador y bloquean tarjetas cuando un trabajador automatizado se detiene sin llamar a `workboard_complete` o `workboard_block`.
- `workboard_board_create`, `workboard_board_archive` y `workboard_board_delete` administran los metadatos del tablero persistidos, como el nombre para mostrar, la descripción, el estado de archivo y el espacio de trabajo predeterminado.
- `workboard_runs` devuelve el historial de intentos de ejecución persistidos almacenados en una tarjeta.
- `workboard_specify` convierte una tarjeta de triaje o de registro aproximada en una tarjeta `todo` aclarada y registra el resumen de la especificación en la tarjeta.
- `workboard_decompose` distribuye una tarjeta de orquestación principal en elementos secundarios vinculados, hereda los metadatos del tablero y del inquilino, y puede completar la principal con un manifiesto de tarjetas creadas.
- `workboard_notify_subscribe`, `workboard_notify_list`, `workboard_notify_events`, `workboard_notify_advance` y `workboard_notify_unsubscribe` administran las suscripciones de notificación en el estado del complemento. Las lecturas de eventos son seguras contra repetición; la herramienta de avance mueve el cursor duradero para que las llamadas puedan reanudarse sin perder ni leer dos veces eventos de tarjetas completados, fallidos o obsoletos.
- `workboard_boards`, `workboard_stats`, `workboard_promote`, `workboard_reassign`, `workboard_reclaim`, `workboard_comment`, `workboard_proof`, `workboard_unblock` y `workboard_dispatch` permiten que un agente inspeccione los espacios de nombres del tablero, vea las estadísticas de la cola, recupere el trabajo atascado, agregue notas de entrega, adjunte referencias de pruebas o artefactos, mueva el trabajo bloqueado de vuelta a `todo` y promueva la promoción de dependencias o la limpieza de reclamaciones obsoletas.

Las tarjetas reclamadas rechazan las mutaciones de herramientas de agente de otros agentes a menos que quien llama tenga el token de reclamación devuelto por `workboard_claim`. Los operadores del tablero de instrumentos todavía usan la superficie RPC normal de Gateway y pueden recuperar o reasignar tarjetas.

Workboard almacena datos duraderos del tablero en una base de datos relacional SQLite propiedad del plugin
bajo el directorio de estado de OpenClaw. Los tableros, tarjetas, etiquetas, eventos del ciclo de vida,
intentos de ejecución, comentarios, enlaces de dependencias, pruebas, referencias de artefactos,
metadatos y blobs de adjuntos, diagnósticos, notificaciones, registros de trabajadores,
estado del protocolo y suscripciones se conservan en las tablas de Workboard en lugar de
entradas de clave-valor del plugin. Una exportación de tarjeta aún conserva la narrativa del tablero
sin incluir el contenido de los blobs de adjuntos.

Las instalaciones que usaron Workboard en el lanzamiento `.28` pueden ejecutar
`openclaw doctor --fix` para migrar los espacios de nombres heredados del estado del plugin enviados
(`workboard.cards`, `workboard.boards` y `workboard.notify`) a la
base de datos relacional. Si está presente un espacio de nombres heredado `workboard.attachments`,
el doctor también migra esos blobs de adjuntos.

Los diagnósticos de Workboard se calculan a partir de los metadatos locales de las tarjetas. Las comprobaciones integradas
marcan las tarjetas asignadas que esperan demasiado tiempo, las tarjetas en ejecución sin latido reciente,
las tarjetas bloqueadas que necesitan atención, fallos repetidos, tarjetas terminadas sin pruebas,
y tarjetas en ejecución que solo tienen un enlace suelto a la sesión.

El despacho es intencionalmente local al Gateway. No genera procesos arbitrarios del
sistema operativo; las sesiones normales de subagente de OpenClaw aún son propietarias de la ejecución. La
acción de despacho promociona tarjetas listas para dependencias, registra metadatos de despacho en
tarjetas listas, bloquea reclamaciones caducadas o ejecuciones agotadas por tiempo, marca las tarjetas de triaje configuradas en el tablero
como candidatas a orquestación, luego reclama un pequeño lote de tarjetas
listas e inicia ejecuciones de trabajadores a través del tiempo de ejecución de subagente del Gateway. Las
tarjetas asignadas usan claves de sesión de trabajador `agent:<id>:subagent:workboard-*`; las tarjetas
sin asignar usan claves sin ámbito `subagent:workboard-*` para que el Gateway aún resuelva el
agente predeterminado configurado. Los trabajadores obtienen un contexto de tarjeta limitado más el token de reclamación
que necesitan para enviar latido, completar o bloquear la tarjeta a través de las herramientas de Workboard.

### Selección del trabajador de despacho

De forma predeterminada, cada pase de distribución inicia como máximo tres trabajadores. Las tarjetas listas se ordenan por prioridad, posición y hora de creación, y luego se filtran para evitar propiedad activa duplicada. Una distribución inicia solo una tarjeta para un propietario o agente determinado en el mismo pase, y omite los propietarios que ya tienen trabajo en ejecución o revisión en el tablero.

Las tarjetas archivadas, las tarjetas con reclamaciones activas y las tarjetas sin estado `ready` no se seleccionan para el inicio de trabajadores. Aún pueden verse afectadas por el lado de los datos de la distribución cuando se aplican reclamaciones obsoletas, promoción de dependencias o limpieza por tiempo de espera.

### Prompt y ciclo de vida del trabajador

El prompt del trabajador incluye el título de la tarjeta, las notas y el contexto delimitados, el tablero asignado y el protocolo de trabajador de Workboard. También incluye el propietario de la reclamación y el token de reclamación para que el trabajador pueda llamar a `workboard_heartbeat`, `workboard_complete` o `workboard_block` sin que otro actor se haga cargo de la tarjeta.

Cuando un trabajador se inicia correctamente, Workboard almacena la clave de sesión, el id de ejecución, el motor, el modo, la etiqueta del modelo, el estado y el registro del trabajador en la tarjeta. La clave de sesión es determinista para el tablero y la tarjeta, lo que hace que las distribuciones repetidas se enruten de vuelta al mismo carril de trabajador en lugar de crear sesiones no relacionadas.

Si no se puede iniciar un trabajador después de que se reclama una tarjeta, Workboard bloquea la tarjeta, borra la reclamación, registra el error de inicio de ejecución y agrega una línea de registro del trabajador. Ese error es visible en el panel, JSON de CLI, herramientas de agente y diagnóstico de tarjetas.

### Puntos de entrada de distribución

Los inicios de trabajadores de tarjetas listas pueden ocurrir desde:

- la acción de distribución del panel
- `openclaw workboard dispatch`
- `/workboard dispatch` en un canal con capacidad de comandos

Los tres puntos de entrada utilizan el tiempo de ejecución del subagente de Gateway cuando Gateway está disponible. La CLI tiene un operador de reserva adicional: si Gateway está fuera de línea o no expone el método de distribución de Workboard y no se proporcionó un objetivo `--url` o `--token` explícito, ejecuta una distribución de solo datos contra el estado local de SQLite. Esa reserva puede promover dependencias, limpiar reclamaciones obsoletas y bloquear ejecuciones que han excedido el tiempo, pero no puede iniciar trabajadores.

Los metadatos del tablero pueden incluir configuraciones de orquestación como `autoDecompose`,
`autoDecomposePerDispatch`, `defaultAssignee` y `orchestratorProfile`.
OpenClaw registra la intención de orquestación y la expone en el contexto del trabajador; la
especificación y descomposición reales todavía ocurren a través de las herramientas
normales de Workboard.

## CLI y comando de barra

El complemento registra un comando raíz de CLI:

```bash
openclaw workboard list
openclaw workboard create "Fix stale card lifecycle" --priority high --labels bug,workboard
openclaw workboard show <card-id>
openclaw workboard dispatch
```

`openclaw workboard dispatch` llama al Gateway en ejecución para que los inicios de los trabajadores usen el
mismo tiempo de ejecución del subagente que el tablero. Si el Gateway no está disponible, recurre
al envío de solo datos para que la promoción de dependencias, la limpieza de reclamaciones obsoletas y
el bloqueo por tiempo de espera aún puedan ejecutarse. Los fallos de autenticación, permisos y validación aún
aparecen como errores de comando, al igual que los fallos para objetivos explícitos `--url` o `--token`.

El comando de barra `/workboard` admite la misma ruta compacta de operador:
`/workboard list`, `/workboard show <card-id>`, `/workboard create <title>` y
`/workboard dispatch`. List y show son operaciones de lectura para remitentes de comandos
autorizados. Create y dispatch requieren estado de propietario en las superficies de chat o un cliente
Gateway con `operator.write` o `operator.admin`.

Consulte [Workboard CLI](/es/cli/workboard) para obtener indicadores de comando, salida JSON, comportamiento de alternancia del Gateway,
manejo de prefijos de id inequívocos, reglas de selección de envío y
solución de problemas.

## Sincronización del ciclo de vida de la sesión

Las tarjetas se pueden vincular a sesiones existentes del tablero o a la sesión creada
cuando inicia el trabajo desde una tarjeta. Las tarjetas vinculadas muestran el ciclo de vida de la sesión en línea:
en ejecución, obsoleta, inactiva vinculada, completada, fallida o faltante.

Si falta la sesión vinculada, la tarjeta permanece vinculada por contexto y todavía
ofrece controles de inicio para que pueda reiniciar el trabajo en una sesión nueva del tablero.
Si una sesión vinculada activa deja de informar actividad reciente, Workboard marca la
tarjeta como obsoleta y almacena el marcador como metadatos de la tarjeta hasta que el ciclo de vida lo borra.

También puedes capturar una sesión de dashboard existente desde la pestaña Sesiones con
Agregar a Workboard. La tarjeta está vinculada a esa sesión, usa la etiqueta de la sesión o
el último mensaje del usuario como título, y completa las notas con el último mensaje del usuario más
la última respuesta del asistente cuando el historial de chat está disponible.

Workboard sigue la sesión vinculada mientras la tarjeta todavía esté en un estado de trabajo
activo:

- sesión vinculada activa -> `running`
- sesión vinculada completada -> `review`
- sesión vinculada fallida, eliminada, con tiempo de espera agotado o abortada -> `blocked`

Los estados de revisión manual tienen prioridad. Si mueves una tarjeta a `review`, `blocked` o `done`,
Workboard detiene el movimiento automático de esa tarjeta hasta que la muevas de vuelta a `todo` o
`running`.

## Flujo de trabajo del Dashboard

1. Abre la pestaña Workboard en el Control UI.
2. Crea una tarjeta con un título, notas, prioridad, etiquetas, agente opcional y
   sesión vinculada opcional.
3. O abre Sesiones y elige Agregar a Workboard para una sesión existente.
4. Arrastra la tarjeta entre columnas o usa los controles de columna.
5. Inicia el trabajo desde la tarjeta para crear o reutilizar una sesión de dashboard.
6. Abre la sesión vinculada desde la tarjeta mientras el agente trabaja.
7. Permite que la sincronización del ciclo de vida mueva el trabajo en ejecución a revisión o bloqueado, y luego mueve
   manualmente la tarjeta a listo cuando sea aceptado.

Iniciar una tarjeta usa sesiones normales del Gateway. El complemento Workboard solo almacena
metadatos y enlaces de la tarjeta; la transcripción de la conversación, la selección del modelo y el ciclo de vida
de la ejecución siguen siendo propiedad del sistema regular de sesiones.

Usa Detener en una tarjeta vinculada en vivo para abortar la ejecución de la sesión activa. Workboard marca
esa tarjeta como `blocked` para que permanezca visible para el seguimiento.

Las nuevas tarjetas pueden comenzar desde plantillas de Workboard para correcciones de errores, documentación, lanzamientos, revisiones
de PR o trabajo de complementos. Las plantillas rellenan previamente el título, notas, etiquetas y prioridad,
y el id de la plantilla seleccionada se almacena como metadatos de la tarjeta.

## Permisos

El complemento registra métodos RPC del Gateway bajo el espacio de nombres `workboard.*`:

- `workboard.cards.list` requiere `operator.read`
- `workboard.cards.export` requiere `operator.read`
- `workboard.cards.diagnostics` requiere `operator.read`
- `workboard.cards.diagnostics.refresh` requiere `operator.write`
- el listado/obtención de archivos adjuntos y las lecturas de eventos de notificación requieren `operator.read`
- el avance del cursor de notificaciones requiere `operator.write`
- los métodos create, update, move, delete, comment, link, dependency link, proof,
  artifact, attachment add/delete, worker log, protocol violation, claim, heartbeat,
  release, complete, block, unblock, dispatch, bulk y archive requieren
  `operator.write`

Los navegadores conectados con acceso de solo lectura de operador pueden inspeccionar el tablero pero
no pueden mutar las tarjetas.

## Configuración

Workboard no tiene configuración específica del plugin hoy. Actívelo o desactívelo con la
entrada estándar de plugin:

```json5
{
  plugins: {
    entries: {
      workboard: {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Desactívelo de nuevo con:

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## Solución de problemas

### La pestaña indica que Workboard no está disponible

Verifique la política de plugins:

```bash
openclaw plugins inspect workboard --runtime --json
```

Si `plugins.allow` está configurado, añada `workboard` a esa lista blanca. Si
`plugins.deny` contiene `workboard`, elimínelo antes de habilitar el plugin.

### Las tarjetas no se guardan

Confirme que la conexión del navegador tenga acceso `operator.write`. Las sesiones de
operador de solo lectura pueden listar las tarjetas pero no pueden crearlas, editarlas, moverlas o eliminarlas.

### Iniciar una tarjeta no abre la sesión esperada

Workboard crea enlaces a sesiones normales del panel de control. Verifique el id de agente de la
tarjeta y la sesión vinculada, luego abra la vista de Sesiones o Chat para inspeccionar el estado real
de ejecución.

### El despacho no inicia un trabajador

Confirme que hay al menos una tarjeta `ready` sin una reclamación activa:

```bash
openclaw workboard list --status ready
```

Si la CLI informa un despacho solo de datos, inicie o reinicie el Gateway y reintente.
El despacho solo de datos actualiza el estado local del tablero pero no puede iniciar ejecuciones
de trabajador subagente.

Las tarjetas también pueden omitirse cuando otra tarjeta para el mismo propietario o agente
ya está en ejecución o esperando revisión. Complete, bloquee o libere ese trabajo
activo antes de despachar más trabajo para el mismo propietario.

## Relacionado

- [Control UI](/es/web/control-ui)
- [Workboard CLI](/es/cli/workboard)
- [Plugins](/es/tools/plugin)
- [Manage plugins](/es/plugins/manage-plugins)
- [Sesiones](/es/concepts/session)
