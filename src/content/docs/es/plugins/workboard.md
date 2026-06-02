---
summary: "Tablero de trabajo opcional del panel para tarjetas propiedad de agentes y transferencia de sesión"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Plugin de Workboard"
---

El complemento Workboard añade un tablero opcional estilo Kanban a la
[Control UI](/es/web/control-ui). Úselo para recopilar tarjetas de trabajo del tamaño de un agente, asignarlas
a los agentes y saltar desde una tarjeta a la sesión del panel vinculada.

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
vista muestra un estado de plugin no disponible en lugar de los datos de tarjetas locales.

## Qué contienen las tarjetas

Cada tarjeta almacena:

- título y notas
- estado: `triage`, `backlog`, `todo`, `scheduled`, `ready`, `running`,
  `review`, `blocked` o `done`
- prioridad: `low`, `normal`, `high` o `urgent`
- etiquetas
- id de agente opcional
- sesión vinculada opcional, ejecución, tarea o URL de origen
- metadatos de ejecución opcionales para una sesión de Codex o Claude iniciada desde la tarjeta
- metadatos compactos para intentos, comentarios, enlaces, pruebas, artefactos, automatización,
  archivos adjuntos, registros de trabajo (logs), estado del protocolo de trabajo, reclamaciones, diagnósticos,
  notificaciones, plantillas, estado de archivo y detección de sesiones obsoletas
- eventos recientes de tarjetas tales como creada, movida, vinculada, reclamada, latido,
  intento, prueba, artefacto, diagnóstico, notificación, despacho, archivo, obsoleto
  o cambios actualizados por el agente

Las tarjetas se almacenan en el estado del Gateway del plugin. Son locales para el directorio de
estado del Gateway y se mueven con el resto del estado de OpenClaw de ese Gateway.

Workboard mantiene metadatos compactos por tarjeta para que los operadores puedan ver cómo se movió una tarjeta a través del tablero sin abrir la sesión vinculada. Los eventos, resúmenes de intentos, fragmentos de prueba, enlaces relacionados, comentarios, marcadores de archivo y marcadores de sesión obsoleta son metadatos intencionalmente locales; no reemplazan las transcripciones de sesión ni el historial de problemas de GitHub.

## Ejecuciones de tarjetas

Las tarjetas no vinculadas pueden iniciar el trabajo desde la tarjeta. Iniciar utiliza el agente predeterminado y el modelo configurado del Gateway. Las acciones de Codex y Claude son opciones explícitas de modelo opcionales:

- Ejecutar Codex o Ejecutar Claude crea una sesión en el panel, envía el prompt de la tarjeta
  y marca la tarjeta como `running`.
- Abrir Codex o Abrir Claude crea una sesión del panel vinculada sin enviar el aviso de la tarjeta ni mover la tarjeta, por lo que puede trabajar manualmente mientras permanece adjunta al tablero.

Los metadatos de ejecución almacenan el motor seleccionado, modo, referencia del modelo, clave de sesión,
id de ejecución y estado del ciclo de vida en la tarjeta. Las ejecuciones de Codex usan
`openai/gpt-5.5`; las ejecuciones de Claude usan `anthropic/claude-sonnet-4-6`.

Cada ejecución vinculada también registra un resumen de intento en el mismo registro de tarjeta. El resumen de intento mantiene el motor, el modo, el modelo, el id. de ejecución, las marcas de tiempo, el estado y el recuento acumulado de fallos para que los fallos repetidos sigan siendo visibles en el tablero.

## Coordinación de agentes

Workboard también expone herramientas de agente opcionales para flujos de trabajo conscientes del tablero:

- `workboard_list` enumera tarjetas compactas con estado de reclamación y diagnóstico, con un
  filtro de tablero opcional.
- `workboard_read` devuelve una tarjeta más el contexto del trabajo (worker) delimitado construido a partir de notas,
  intentos, comentarios, enlaces, pruebas, artefactos, resultados principales, trabajo
  reciente del asignado y diagnósticos activos.
- `workboard_create` crea una tarjeta con padres opcionales, inquilino, habilidades,
  metadatos de tablero y espacio de trabajo, clave de idempotencia, límite de tiempo de ejecución y presupuesto de reintentos.
- `workboard_link` vincula una tarjeta principal a una tarjeta secundaria. Las secundarias permanecen en `todo`
  hasta que todos los padres alcancen `done`; luego, la promoción de despacho las mueve a
  `ready`.
- `workboard_claim` reclama una tarjeta para el agente que llama y mueve las tarjetas de backlog, pendientes
  o listas a `running`.
- `workboard_heartbeat` actualiza el latido del reclamo durante ejecuciones más largas.
- `workboard_release` libera el reclamo después de la finalización, pausa o entrega y
  puede mover la tarjeta al siguiente estado.
- `workboard_complete` y `workboard_block` son herramientas de ciclo de vida estructuradas para
  resúmenes finales, pruebas, artefactos, manifiestos de tarjetas creadas y motivos
  de bloqueo. Los manifiestos de tarjetas creadas deben hacer referencia a las tarjetas vinculadas de vuelta a la
  tarjeta completada, lo que evita que hijos fantasmas aparezcan en los resúmenes.
- `workboard_attachment_add`, `workboard_attachment_read` y
  `workboard_attachment_delete` almacenan pequeños adjuntos de tarjetas en el estado SQLite
  del complemento, los indexan en la tarjeta y los exponen en el contexto del trabajador.
- `workboard_worker_log` y `workboard_protocol_violation` registran líneas de registro
  del trabajador y bloquean tarjetas cuando un trabajador automatizado se detiene sin llamar
  a `workboard_complete` o `workboard_block`.
- `workboard_board_create`, `workboard_board_archive` y
  `workboard_board_delete` administran los metadatos persistentes del tablero, como el nombre para mostrar,
  la descripción, el estado de archivo y el espacio de trabajo predeterminado.
- `workboard_runs` devuelve el historial de intentos de ejecución persistente almacenado en una tarjeta.
- `workboard_specify` convierte una tarjeta de triaje o backlog aproximada en una tarjeta
  `todo` aclarada y registra el resumen de la especificación en la tarjeta.
- `workboard_decompose` distribuye una tarjeta de orquestación principal en secundarias vinculadas,
  hereda los metadatos del tablero y del inquilino, y puede completar la tarjeta principal con un
  manifiesto de tarjetas creadas.
- `workboard_notify_subscribe`, `workboard_notify_list`,
  `workboard_notify_events`, `workboard_notify_advance` y
  `workboard_notify_unsubscribe` gestionan las suscripciones de notificaciones en el estado
  del complemento. Las lecturas de eventos son seguras contra reiteraciones; la herramienta de avance mueve el cursor duradero
  para que las personas que llaman puedan reanudar sin perder o leer dos veces eventos de tarjetas completados, fallidos o
  obsoletos.
- `workboard_boards`, `workboard_stats`, `workboard_promote`,
  `workboard_reassign`, `workboard_reclaim`, `workboard_comment`,
  `workboard_proof`, `workboard_unblock` y `workboard_dispatch` permiten a un agente
  inspeccionar espacios de nombres del tablero, ver estadísticas de la cola, recuperar trabajo atascado, agregar notas de transferencia,
  adjuntar referencias de pruebas o artefactos, mover trabajo bloqueado de vuelta a `todo`,
  y promocionar la promoción de dependencias o la limpieza de reclamaciones obsoletas.

Las tarjetas reclamadas rechazan mutaciones de herramientas de agente de otros agentes a menos que la persona que llama
tenga el token de reclamación devuelto por `workboard_claim`. Los operadores del tablero todavía usan
la superficie RPC normal de Gateway y pueden recuperar o reasignar tarjetas.

Workboard almacena datos duraderos del tablero en una base de datos relacional SQLite propiedad del complemento
en el directorio de estado de OpenClaw. Los tableros, tarjetas, etiquetas, eventos del ciclo de vida,
intentos de ejecución, comentarios, enlaces de dependencia, pruebas, referencias de artefactos,
metadatos y blobs de archivos adjuntos, diagnósticos, notificaciones, registros de trabajadores,
estado del protocolo y suscripciones se conservan en las tablas de Workboard en lugar de
entradas de clave-valor del complemento. Una exportación de tarjeta aún conserva la narrativa del tablero
sin incluir el contenido de los blobs de archivos adjuntos.

Las instalaciones que usaron Workboard en el lanzamiento `.28` pueden ejecutar
`openclaw doctor --fix` para migrar los espacios de nombres del estado del complemento heredados enviados
(`workboard.cards`, `workboard.boards` y `workboard.notify`) a la
base de datos relacional. Si está presente un espacio de nombres `workboard.attachments` heredado,
el médico también migra esos blobs de archivos adjuntos.

Los diagnósticos del tablero de trabajo se calculan a partir de los metadatos locales de las tarjetas. Las comprobaciones integradas marcan las tarjetas asignadas que esperan demasiado tiempo, las tarjetas en ejecución sin latidos recientes, las tarjetas bloqueadas que necesitan atención, los fallos repetidos, las tarjetas completadas sin pruebas y las tarjetas en ejecución que solo tienen un enlace suelto a la sesión.

El despacho es intencionalmente local a la Gateway. No genera procesos arbitrarios del sistema operativo; las sesiones normales de OpenClaw siguen siendo propietarias de la ejecución. Un empujón de despacho (dispatch nudge) promueve tarjetas listas para dependencias, registra metadatos de despacho en tarjetas listas, bloquea reclamaciones caducadas o ejecuciones agotadas por tiempo, marca las tarjetas de triaje configuradas en el tablero como candidatas a orquestación y deja suscripciones duraderas de notificación para la persona que llama que entrega las notificaciones.

Los metadatos del tablero pueden incluir configuraciones de orquestación como `autoDecompose`, `autoDecomposePerDispatch`, `defaultAssignee` y `orchestratorProfile`. OpenClaw registra la intención de orquestación y la expone en el contexto del trabajador; la especificación, descomposición o el inicio de la sesión real aún ocurre a través de las herramientas normales de Workboard y el flujo de sesión del panel de control.

## Sincronización del ciclo de vida de la sesión

Las tarjetas se pueden vincular a sesiones existentes del panel de control o a la sesión creada cuando se inicia el trabajo desde una tarjeta. Las tarjetas vinculadas muestran el ciclo de vida de la sesión en línea: en ejecución, obsoleta, inactiva vinculada, completada, fallida o faltante.

Si falta la sesión vinculada, la tarjeta permanece vinculada por contexto y aún ofrece controles de inicio para que pueda reiniciar el trabajo en una nueva sesión del panel de control. Si una sesión vinculada activa deja de informar actividad reciente, Workboard marca la tarjeta como obsoleta y almacena el marcador como metadatos de la tarjeta hasta que el ciclo de vida lo borre.

También puede capturar una sesión existente del panel de control desde la pestaña Sesiones con Agregar a Workboard. La tarjeta se vincula a esa sesión, usa la etiqueta de la sesión o el aviso de usuario reciente como título, y inicializa las notas a partir del aviso de usuario reciente más la última respuesta del asistente cuando el historial de chat está disponible.

Workboard sigue la sesión vinculada mientras la tarjeta aún está en un estado de trabajo activo:

- sesión vinculada activa -> `running`
- sesión vinculada completada -> `review`
- sesión vinculada fallida, terminada, agotada por tiempo o abortada -> `blocked`

Los estados de revisión manual tienen prioridad. Si mueves una tarjeta a `review`, `blocked` o `done`,
Workboard dejará de mover automáticamente esa tarjeta hasta que la vuelvas a mover a `todo` o
`running`.

## Flujo de trabajo del panel

1. Abre la pestaña Workboard en el Control UI.
2. Crea una tarjeta con un título, notas, prioridad, etiquetas, agente opcional y
   sesión vinculada opcional.
3. O abre Sesiones y elige Añadir a Workboard para una sesión existente.
4. Arrastra la tarjeta entre columnas o usa los controles de columna.
5. Inicia el trabajo desde la tarjeta para crear o reutilizar una sesión del panel.
6. Abre la sesión vinculada desde la tarjeta mientras el agente trabaja.
7. Permite que la sincronización del ciclo de vida mueva el trabajo en curso a revisión o bloqueado, y luego mueve
   manualmente la tarjeta a completado cuando se acepte.

Iniciar una tarjeta usa sesiones normales de Gateway. El complemento Workboard solo almacena
los metadatos y enlaces de la tarjeta; la transcripción de la conversación, la selección del modelo y el ciclo de vida
de ejecución siguen siendo propiedad del sistema de sesiones regular.

Usa Detener en una tarjeta vinculada en vivo para abortar la ejecución de la sesión activa. Workboard marca
esa tarjeta como `blocked` para que permanezca visible para el seguimiento.

Las nuevas tarjetas pueden comenzar a partir de plantillas de Workboard para correcciones de errores, documentación, lanzamientos, revisiones
de PR o trabajo de complementos. Las plantillas rellenan previamente el título, las notas, las etiquetas y la prioridad,
y el id de la plantilla seleccionada se almacena como metadatos de la tarjeta.

## Permisos

El complemento registra métodos RPC de Gateway bajo el espacio de nombres `workboard.*`:

- `workboard.cards.list` requiere `operator.read`
- `workboard.cards.export` requiere `operator.read`
- `workboard.cards.diagnostics` requiere `operator.read`
- `workboard.cards.diagnostics.refresh` requiere `operator.write`
- attachment list/get y las lecturas de eventos de notificación requieren `operator.read`
- el avance del cursor de notificación requiere `operator.write`
- los métodos create, update, move, delete, comment, link, dependency link, proof, artifact,
  attachment add/delete, worker log, protocol violation, claim, heartbeat,
  release, complete, block, unblock, dispatch, bulk y archive requieren
  `operator.write`

Los navegadores conectados con acceso de operador de solo lectura pueden inspeccionar el tablero pero no pueden mutar las tarjetas.

## Configuración

Workboard no tiene configuración específica del complemento hoy. Actívelo o desactívelo con la entrada estándar del complemento:

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

Desactívelo nuevamente con:

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## Solución de problemas

### La pestaña indica que Workboard no está disponible

Verifique la política del complemento:

```bash
openclaw plugins inspect workboard --runtime --json
```

Si `plugins.allow` está configurado, agregue `workboard` a esa lista blanca. Si `plugins.deny` contiene `workboard`, elimínelo antes de habilitar el complemento.

### Las tarjetas no guardan

Confirme que la conexión del navegador tenga acceso `operator.write`. Las sesiones de operador de solo lectura pueden listar las tarjetas pero no pueden crearlas, editarlas, moverlas ni eliminarlas.

### Iniciar una tarjeta no abre la sesión esperada

Workboard crea enlaces a sesiones normales del tablero. Verifique el ID del agente de la tarjeta y la sesión vinculada, luego abra la vista de Sesiones o Chat para inspeccionar el estado real de ejecución.

## Relacionado

- [Control UI](/es/web/control-ui)
- [Complementos](/es/tools/plugin)
- [Administrar complementos](/es/plugins/manage-plugins)
- [Sesiones](/es/concepts/session)
