---
summary: "Plan de migración para hacer de SQLite la capa principal de estado duradero y caché manteniendo la configuración respaldada por archivo"
title: "Refactorización del estado primero en la base de datos"
read_when:
  - Moving OpenClaw runtime data, cache, transcripts, task state, or scratch files into SQLite
  - Designing doctor migrations from legacy JSON or JSONL files
  - Changing backup, restore, VFS, or worker storage behavior
  - Removing session locks, pruning, truncation, or JSON compatibility paths
---

# Refactorización del estado primero en la base de datos

## Decisión

Utilizar una disposición SQLite de dos niveles:

- Base de datos global: `~/.openclaw/state/openclaw.sqlite`
- Base de datos del agente: una base de datos SQLite por agente para el espacio de trabajo propiedad del agente,
  transcripción, VFS, artefacto y estado de tiempo de ejecución grande por agente
- La configuración permanece respaldada en archivos: `openclaw.json` permanece fuera de la
  base de datos. Los perfiles de autenticación de tiempo de ejecución se mueven a SQLite; los archivos de credenciales
  de proveedores externos o CLI permanecen administrados por su propietario fuera de la base de datos de OpenClaw.

La base de datos global es la base de datos del plano de control. Posee el descubrimiento de agentes,
estado compartido de la puerta de enlace, emparejamiento, estado de dispositivo/nodo, libros mayores de tareas y flujos, estado
de complementos, estado de tiempo de ejecución del planificador, metadatos de copia de seguridad y estado de migración.

La base de datos del agente es la base de datos del plano de datos. Posee los metadatos de sesión
del agente, flujo de eventos de transcripción, espacio de trabajo VFS o espacio de nombres de scratch, artefactos
de herramientas, artefactos de ejecución y datos de caché local del agente buscables/indexables.

Esto proporciona una vista global duradera sin forzar grandes espacios de trabajo de agente,
transcripciones y datos binarios de scratch en el carril de escritura de la puerta de enlace compartida.

## Contrato estricto

Esta migración tiene una forma canónica de tiempo de ejecución:

- Las filas de sesión persisten solo los metadatos de la sesión. No deben persistir
  `transcriptLocator`, rutas de archivo de transcripción, rutas JSONL hermanas, rutas de bloqueo,
  metadatos de poda o punteros de compatibilidad de la era de archivos.
- La identidad de la transcripción es siempre la identidad de SQLite: `{agentId, sessionId}` más
  metadatos de tema opcionales donde el protocolo lo necesite.
- `sqlite-transcript://...` no es una identidad de tiempo de ejecución ni de protocolo. El código nuevo no debe
  derivar, persistir, pasar, analizar ni migrar localizadores de transcripción. El tiempo de ejecución y
  las pruebas no deben contener pseudo-localizadores en absoluto; los documentos pueden mencionar la cadena
  solo para prohibirla.
- El `sessions.json` heredado, la transcripción JSONL, `.jsonl.lock`, la poda, el truncamiento,
  y la lógica antigua de rutas de sesión pertenecen solo a la ruta de migración/importación del doctor.
- Los alias de configuración de sesión heredados pertenecen solo a la migración del doctor. El tiempo de ejecución no interpreta `session.idleMinutes`, `session.resetByType.dm``agent:main:*`, ni los alias de sesión principal entre agentes para otro agente configurado.
- La identidad de enrutamiento de sesión es un estado relacional tipado. Las rutas de acceso frecuentes del tiempo de ejecución y la interfaz de usuario deben leer `sessions.session_scope`, `sessions.account_id`, `sessions.primary_conversation_id`, `conversations` y `session_conversations`; no deben analizar `session_key` ni extraer `session_entries.entry_json` para la identidad del proveedor, excepto como una sombra de compatibilidad mientras se eliminan los antiguos sitios de llamada.
- Los marcadores de mensaje directo a nivel de canal, como `dm` frente a `direct`, son vocabulario de enrutamiento, no localizadores de transcripciones ni identificadores de compatibilidad de almacenamiento de archivos.
- La configuración heredada del controlador de enganches (hooks) pertenece solo a las superficies de advertencia/migración del doctor. El tiempo de ejecución no debe cargar `hooks.internal.handlers`; los enganches se ejecutan a través de directorios de enganches descubiertos y solo metadatos `HOOK.md`.
- El inicio del tiempo de ejecución, las rutas de respuesta rápida, la compactación, el restablecimiento, la recuperación, el diagnóstico, el TTS, los enganches de memoria, los subagentes, el enrutamiento de comandos de complementos, los límites del protocolo y los enganches deben pasar `{agentId, sessionId}` a través del tiempo de ejecución.
- Las pruebas deben propagar y afirmar filas de transcripciones de SQLite a través de `{agentId, sessionId}`. Las pruebas que solo demuestren el reenvío de ruta JSONL, la preservación de localizadores proporcionados por el llamador o la compatibilidad de archivos de transcripción deben eliminarse, a menos que cubran la importación del doctor, la materialización de soporte/depuración sin sesión o la forma del protocolo.
- `runEmbeddedPiAgent(...)`, las ejecuciones de workers preparadas y el intento incrustado interno no deben aceptar localizadores de transcripción. Abren el gestor de transcripciones de SQLite mediante `{agentId, sessionId}` y pasan ese gestor a la sesión del agente compatible con PI internalizada, de modo que los llamadores obsoletos no pueden hacer que el ejecutor escriba transcripciones JSON/JSONL.
- Runner diagnostics must store runtime/cache/payload trace records in SQLite.
  Runtime diagnostics must not expose JSONL file override knobs or generic
  transcript JSONL export helpers; user-facing exports can materialize explicit
  artifacts from database rows without feeding file names back into runtime.
- Raw stream logging uses `OPENCLAW_RAW_STREAM=1` plus SQLite diagnostics rows.
  The old pi-mono `PI_RAW_STREAM`, `PI_RAW_STREAM_PATH`, and
  `raw-openai-completions.jsonl` file logger contract is not part of OpenClaw
  runtime or tests.
- QMD memory indexing must not export SQLite transcripts to markdown files.
  QMD indexes configured memory files only; session transcript search stays
  SQLite-backed.
- The QMD SDK subpath is QMD-only for new code. SQLite session transcript
  indexing helpers live on `memory-core-host-engine-session-transcripts`; any
  QMD re-export is compatibility only and must not be used by runtime code.
- Built-in memory indexes live in the owning agent database. Runtime config and
  resolved runtime contracts must not expose `memorySearch.store.path`; doctor
  deletes that legacy config key and current code passes the agent
  `databasePath` internally.

Implementation work should keep deleting code until these statements are true
without exceptions outside doctor/import/export/debug boundaries.

## Goal state and progress

### Hard goal

- One global SQLite database owns control-plane state:
  `state/openclaw.sqlite`.
- One per-agent SQLite database owns data-plane state:
  `agents/<agentId>/agent/openclaw-agent.sqlite`.
- Config remains file-backed. `openclaw.json` is not part of this database
  refactor.
- Legacy files are doctor migration inputs only.
- Runtime never writes or reads session or transcript JSONL as active state.

### Goal states

- `not-started`: file-era runtime code still writes active state.
- `migrating`: doctor/import code can move file data into SQLite.
- `dual-read`: temporary bridge reads both SQLite and legacy files. This state
  is forbidden for this refactor unless it is explicitly documented as
  doctor-only.
- `sqlite-runtime`: runtime reads and writes SQLite only.
- `clean`: las API y pruebas de runtime heredadas se eliminan, y el guardia evita
  regresiones.
- `done`: la documentación, las pruebas, las copias de seguridad, la migración del doctor y las verificaciones de cambios demuestran el
  estado limpio.

### Estado actual

- Sesiones: `clean` para el runtime. Las filas de sesión residen en la base de datos por agente,
  las API del runtime usan `{agentId, sessionId}` o `{agentId, sessionKey}`, y
  `sessions.json` es una entrada heredada solo para el doctor.
- Transcripciones: `clean` para el runtime. Los eventos de transcripción, identidades, instantáneas
  y eventos de runtime de trayectoria residen en la base de datos por agente. El runtime ya
  no acepta localizadores de transcripción ni rutas de transcripción JSONL.
- Ejecutor incrustado de PI: `clean`. Las ejecuciones de PI incrustadas, los trabajadores preparados, la compactación
  y los bucles de reintento usan el ámbito de sesión de SQLite y rechazan los identificadores de transcripción obsoletos.
- Cron: `clean` para el runtime. El runtime usa `cron_jobs` y `cron_run_logs`;
  las pruebas del runtime usan la nomenclatura `storeKey` de SQLite, y las rutas de cron de la era de archivos permanecen solo
  en las pruebas de migración heredadas del doctor.
- Registro de tareas: `clean`. Las filas de runtime de Task y Task Flow residen en
  `state/openclaw.sqlite`; se han eliminado los importadores SQLite de sidecar no enviados.
- Estado del complemento: `clean`. Las filas de estado/blob del complemento residen en la base de datos global compartida;
  se protege contra los ayudantes SQLite de sidecar de estado de complemento antiguos.
- Memoria: `sqlite-runtime` para la memoria integrada y la indexación de transcripciones de sesión.
  Las tablas de índice de memoria residen en la base de datos por agente, el estado de memoria del complemento usa
  filas de estado de complemento compartidas, y los archivos de memoria heredados son entradas de migración del doctor
  o contenido del espacio de trabajo del usuario.
- Copia de seguridad: `sqlite-runtime`. Las etapas de copia de seguridad compactan las instantáneas de SQLite, omiten los sidecars
  WAL/SHM en vivo, verifican la integridad de SQLite y registran las ejecuciones de copia de seguridad en la
  base de datos global.
- Migración del doctor: `migrating`, intencionalmente. El doctor importa el JSON heredado,
  JSONL y los almacenes sidecar retirados a SQLite, registra las ejecuciones/fuentes de migración
  y elimina las fuentes exitosas.
- Secuencias de comandos E2E: `clean` para la cobertura en tiempo de ejecución. La siembra de Docker MCP escribe filas de SQLite. La secuencia de comandos Docker de contexto de tiempo de ejecución crea JSONL heredado solo dentro de la semilla de migración del doctor y nombra explícitamente la ruta del índice de sesión heredada.

### Trabajo restante

- [x] Cambie el nombre de las variables del almacén de pruebas de tiempo de ejecución de cron para que no usen `storePath` a menos que sean entradas heredadas del doctor.
      Archivos: `src/cron/service.test-harness.ts`,
      `src/cron/service.runs-one-shot-main-job-disables-it.test.ts`,
      `src/cron/service/timer.regression.test.ts`,
      `src/cron/service/ops.test.ts`, `src/cron/service/store.test.ts`,
      `src/cron/service.heartbeat-ok-summary-suppressed.test.ts`,
      `src/cron/service.main-job-passes-heartbeat-target-last.test.ts`,
      `src/cron/store.test.ts`.
      Prueba: `pnpm check:database-first-legacy-stores`; `rg -n 'storePath' src/cron --glob '!**/commands/doctor/**'`.
- [x] Elimine o cambie el nombre de los simulacros de pruebas de exportación obsoletos de la era de archivos.
      Archivo: `src/auto-reply/reply/commands-export-test-mocks.ts`.
      Prueba: `rg -n 'resolveSessionFilePath|sessionFile|storePath|transcriptLocator' src/auto-reply/reply`.
- [x] Haga que la semilla JSONL heredada del contexto de tiempo de ejecución de Docker sea obviamente solo para el doctor.
      Archivo: `scripts/e2e/session-runtime-context-docker-client.ts`.
      Prueba: `rg -n 'sessions\\.json|sessionFile|\\.jsonl' scripts/e2e/session-runtime-context-docker-client.ts` muestra solo
      `seedBrokenLegacySessionForDoctorMigration`.
- [x] Mantenga los tipos generados por Kysely alineados después de cualquier cambio en el esquema.
      Archivos: `src/state/openclaw-state-schema.sql`,
      `src/state/openclaw-agent-schema.sql`,
      `src/state/*generated*`.
      Prueba: ningún cambio de esquema en este paso; `pnpm db:kysely:check`;
      `pnpm lint:kysely`.
- [x] Vuelva a ejecutar pruebas enfocadas para los almacenes, comandos y secuencias de comandos modificados.
      Prueba: `pnpm test src/cron/service/store.test.ts src/cron/store.test.ts src/cron/service.heartbeat-ok-summary-suppressed.test.ts src/cron/service.main-job-passes-heartbeat-target-last.test.ts src/cron/service.every-jobs-fire.test.ts src/cron/service.persists-delivered-status.test.ts src/cron/service.runs-one-shot-main-job-disables-it.test.ts src/cron/service/ops.test.ts src/cron/service/timer.regression.test.ts src/auto-reply/reply/commands-export-trajectory.test.ts extensions/telegram/src/thread-bindings.test.ts extensions/slack/src/monitor/message-handler/prepare.test.ts src/acp/translator.session-lineage-meta.test.ts`; `git diff --check`.
- [x] Antes de declarar `done`, ejecute el controlador modificado o la prueba remota amplia.
      Prueba: `pnpm check:changed --timed -- <changed extension paths>` pasó en la ejecución `run_3f1cabf6b25c` de Hetzner Crabbox después de la configuración temporal de Node 24/pnpm y el enrutamiento de ruta explícito para el espacio de trabajo sincronizado sin `.git`.

### No regresar

- Sin localizadores de transcripciones.
- Sin archivos de sesión activos.
- Sin fixtures de prueba JSONL falsos, excepto en las pruebas de migración heredadas del doctor.
- Sin acceso directo a SQLite donde se espera Kysely.
- Sin nuevas migraciones de bases de datos heredadas. Este diseño no se ha enviado; mantenga la versión del esquema en `1` a menos que haya una razón fuerte.

## Suposiciones de lectura de código

No hay decisiones de seguimiento del producto que bloqueen este plan. La implementación debe
proceder con estos supuestos:

- Usar `node:sqlite` directamente y requerir el tiempo de ejecución de Node 22+ para esta ruta
  de almacenamiento.
- Mantener exactamente un archivo de configuración normal. No mover la configuración, los manifiestos
  de complementos o los espacios de trabajo de Git a SQLite en esta refactorización.
- No se requieren archivos de compatibilidad en tiempo de ejecución. Los archivos JSON y JSONL heredados son
  solo entradas de migración. Los archivos complementarios SQLite locales de la rama nunca se distribuyeron y se
  eliminan en lugar de importarse.
- `openclaw doctor --fix` posee el paso de migración de archivos heredados a la base de datos.
  El inicio en tiempo de ejecución y `openclaw migrate` no deben llevar rutas de
  actualización de la base de datos heredadas de OpenClaw.
- La compatibilidad de credenciales sigue la misma regla: las credenciales en tiempo de ejecución residen en
  SQLite. Los archivos `auth-profiles.json` antiguos, `auth.json` por agente y `credentials/oauth.json` compartidos
  son entradas de migración del doctor y luego se eliminan
  después de la importación.
- El estado del catálogo de modelos generado está respaldado por la base de datos. El código en tiempo de ejecución no debe escribir
  `agents/<agentId>/agent/models.json`; los archivos `models.json` existentes son entradas
  heredadas del doctor y se eliminan después de importar en `agent_model_catalogs`.
- El tiempo de ejecución no debe migrar, normalizar ni puentear localizadores de transcripciones. La identidad
  de la transcripción activa es `{agentId, sessionId}` en SQLite. Las rutas de archivo son
  solo entradas heredadas del doctor, y `sqlite-transcript://...` debe desaparecer de
  las superficies de tiempo de ejecución, protocolo, enlace y complemento en lugar de tratarse como un
  identificador de límite.
- Las lecturas de transcripciones SQLite en tiempo de ejecución no ejecutan migraciones de formas de entrada JSONL antiguas ni
  reescriben transcripciones completas para compatibilidad. La normalización de entradas heredadas permanece en
  utilidades explícitas de doctor/importación. El doctor normaliza los archivos de transcripción
  JSONL heredados antes de insertar filas SQLite; las filas actuales del tiempo de ejecución
  ya están escritas en el esquema de transcripción actual. La exportación de trayectoria/sesión
  lee esas filas tal como están y no debe realizar migraciones heredadas en el momento de la exportación.
- Los auxiliares de análisis/migración de transcripciones JSONL heredadas son exclusivos del doctor. El código
  de formato de transcripción en tiempo de ejecución construye solo el contexto de transcripción SQLite actual; el doctor
  posee las actualizaciones de entradas JSONL antiguas antes de insertar filas.
- Se eliminó el antiguo asistente de transmisión de transcripciones JSONL propiedad del tiempo de ejecución. El código de importación de Doctor se encarga de las lecturas explícitas de archivos heredados; el historial de sesiones del tiempo de ejecución lee filas de SQLite.
- Los enlaces del servidor de aplicaciones de Codex utilizan el OpenClaw `sessionId` como clave canónica en el espacio de nombres del estado del complemento Codex. `sessionKey` son metadatos para el enrutamiento/pantalla y no deben reemplazar el id de sesión duradero ni resucitar la identidad del archivo de transcripción.
- Los motores de contexto reciben el contrato actual del tiempo de ejecución directamente. El registro no debe envolver los motores con shims de reintento que eliminen `sessionKey`, `transcriptScope` o `prompt`; los motores que no puedan aceptar los parámetros actuales de base de datos primero deben fallar claramente en lugar de ser puenteados.
- La salida de la copia de seguridad debe seguir siendo un archivo de almacenamiento. El contenido de la base de datos debe ingresar a ese almacenamiento como instantáneas compactas de SQLite, no como archivos adjuntos WAL en vivo sin procesar.
- La búsqueda de transcripciones es útil pero no es necesaria para el primer corte de base de datos primero. Diseñe el esquema para que FTS se pueda agregar más adelante.
- La ejecución del trabajador debe mantenerse experimental detrás de la configuración mientras se estabiliza el límite de la base de datos.

## Hallazgos de lectura de código

La rama actual ya ha superado la etapa de prueba de concepto. La base de datos compartida existe, Node `node:sqlite` está conectado a través de un pequeño asistente de tiempo de ejecución, y los antiguos almacenes ahora escriben en `state/openclaw.sqlite` o en la base de datos propietaria `openclaw-agent.sqlite`.

El trabajo restante no es elegir SQLite; es mantener el nuevo límite limpio y eliminar cualquier interfaz con forma de compatibilidad que todavía se parezca al antiguo mundo de archivos:

- La sesión `storePath` ya no es una identidad de tiempo de ejecución, una forma de accesorio de prueba o un campo de carga de estado. Las pruebas de tiempo de ejecución y puente ya no contienen el nombre del contrato `storePath`; el código de doctor/migración posee ese vocabulario heredado.
- Las escrituras de sesión ya no pasan por la antigua cola `store-writer.ts` en proceso. Las escrituras de parches de SQLite utilizan detección de conflictos y reintento limitado en su lugar.
- El descubrimiento de rutas heredadas todavía tiene usos de migración válidos, pero el código de tiempo de ejecución debe dejar de tratar `sessions.json` y los archivos de transcripción JSONL como posibles objetivos de escritura.
- Las tablas propiedad del agente residen en bases de datos SQLite por agente. La base de datos global mantiene filas de registro/plano de control; la identidad de la transcripción es `{agentId, sessionId}` en las filas de la transcripción por agente. El código en tiempo de ejecución no debe persistir rutas de archivos de transcripción ni migrar localizadores de transcripción.
- Doctor ya importa varios archivos heredados. La limpieza consiste en convertir eso en una única implementación de migración explícita que doctor llama, con un informe de migración duradero.

No hay preguntas adicionales del producto que bloqueen la implementación.

## Estado actual del código

La rama ya tiene una base SQLite compartida real:

- La versión mínima del entorno de ejecución es ahora Node 22+: `package.json`, el guardia del entorno de ejecución de la CLI, los valores predeterminados del instalador, el localizador del entorno de ejecución de macOS, la CI y la documentación pública de instalación están todos de acuerdo. Se ha eliminado el antiguo carril de compatibilidad con Node 22.
- `src/state/openclaw-state-db.ts` abre `openclaw.sqlite`, establece WAL, `synchronous=NORMAL`, `busy_timeout=30000`, `foreign_keys=ON` y aplica el módulo de esquema generado derivado de `src/state/openclaw-state-schema.sql`.
- Los tipos de tabla de Kysely y los módulos de esquema en tiempo de ejecución se generan a partir de bases de datos SQLite desechables creadas a partir de los archivos `.sql` confirmados; el código en tiempo de ejecución ya no mantiene cadenas de esquema copiadas y pegadas para bases de datos globales, por agente o de captura de proxy.
- Los almacenes en tiempo de ejecución derivan los tipos de filas seleccionadas e insertadas de esas interfaces `DB` de Kysely generadas en lugar de replicar manualmente las formas de las filas de SQLite. SQL sin procesar se limita a la aplicación del esquema, pragmas y DDL solo para migraciones.
- Los esquemas SQLite se colapsan en `user_version = 1` porque este diseño de base de datos aún no se ha enviado. Los abridores en tiempo de ejecución crean solo el esquema actual; la importación de archivo a base de datos permanece en el código de doctor, y los asistentes de actualización de bases de datos locales a la rama se han eliminado.
- La propiedad relacional se impone donde el límite de propiedad es canónico: las filas de migración de origen se cascaden desde `migration_runs`, el estado de entrega de tareas se cascada desde `task_runs` y las filas de identidad de la transcripción se cascaden desde los eventos de transcripción.
- Las tablas compartidas actuales incluyen `agent_databases`,
  `auth_profile_stores`, `auth_profile_state`,
  `plugin_state_entries`, `plugin_blob_entries`, `media_blobs`,
  `skill_uploads`, `capture_sessions`, `capture_events`, `capture_blobs`,
  `sandbox_registry_entries`, `cron_run_logs`, `cron_jobs`, `commitments`,
  `delivery_queue_entries`, `model_capability_cache`,
  `workspace_setup_state`, `native_hook_relay_bridges`,
  `current_conversation_bindings`, `plugin_binding_approvals`,
  `tui_last_sessions`, `acp_sessions`, `acp_replay_sessions`,
  `acp_replay_events`, `task_runs`, `task_delivery_state`, `flow_runs`,
  `subagent_runs`, `migration_runs` y `backup_runs`.
- El estado arbitrario propiedad del complemento no obtiene tablas tipadas propiedad del host. Los complementos instalados usan `plugin_state_entries` para cargas útiles JSON versionadas y
  `plugin_blob_entries` para bytes, con propiedad de espacio de nombres/clave, limpieza de TTL,
  respaldo y registros de migración de complementos. El estado de orquestación del complemento propiedad del host aún
  puede tener tablas tipadas cuando el host posee el contrato de consulta, como
  `plugin_binding_approvals`.
- Las migraciones de complementos son migraciones de datos sobre espacios de nombres propiedad del complemento, no migraciones de esquema del host. Un complemento puede migrar sus propias entradas de estado/blob versionadas a través de un proveedor de migraciones, y el host registra el estado de origen/ejecución en el libro mayor de migraciones normal. Las nuevas instalaciones de complementos no requieren cambiar
  `openclaw-state-schema.sql` a menos que el propio host esté tomando posesión de un
  nuevo contrato entre complementos.
- `src/state/openclaw-agent-db.ts` abre
  `agents/<agentId>/agent/openclaw-agent.sqlite`, registra la base de datos en la
  DB global y posee las tablas de sesión, transcripción, VFS, artefacto, caché
  e índice de memoria locales del agente. El descubrimiento del tiempo de ejecución compartido ahora lee el registro `agent_databases` con tipado generado en lugar de reimplementar esa consulta en cada sitio de llamada.
- Las bases de datos globales y por agente registran una fila `schema_meta` con el rol de la base de datos,
  la versión del esquema, las marcas de tiempo y el ID del agente para las bases de datos de agentes. El diseño todavía
  se mantiene en `user_version = 1` porque este esquema SQLite aún no se ha enviado.
- La identidad de sesión por agente ahora tiene una tabla raíz canónica `sessions` indexada por
  `session_id`, con `session_key`, `session_scope`, `account_id`,
  `primary_conversation_id`, marcas de tiempo, campos de visualización, metadatos del modelo,
  ID del harness y vinculación principal/generada como columnas consultables. `session_routes`
  es el índice de ruta activa único de `session_key` al `session_id` actual,
  por lo que una clave de ruta puede pasar a una sesión duradera nueva sin
  hacer que las lecturas en caliente elijan entre filas duplicadas `sessions.session_key`. El antiguo
  payload con forma de compatibilidad `session_entries.entry_json` cuelga de la
  raíz `session_id` duradera mediante clave foránea; ya no es la única
  representación a nivel de esquema de una sesión.
- La identidad externa de la conversación por agente también es relacional:
  `conversations` almacena la identidad normalizada de proveedor/cuenta/conversación, y
  `session_conversations` vincula una sesión de OpenClaw a una o más
  conversaciones externas. Esto cubre sesiones de MD principales compartidas donde múltiples pares pueden
  mapear intencionalmente a una sesión sin mentir en `session_key`. SQLite también
  impone la unicidad para la identidad natural del proveedor, por lo que la misma
  tupla canal/cuenta/tipo/par/hilo no puede bifurcarse entre los IDs de conversación.
  Los pares directos principales compartidos se vinculan con un rol `participant`, por lo que una
  sesión de OpenClaw puede representar múltiples pares de MD externos sin degradar
  a los pares más antiguos en filas relacionadas vagas. `sessions.primary_conversation_id` todavía
  apunta al objetivo de entrega tipificado actual. Las columnas de enrutamiento/estado cerradas
  se imponen con restricciones `CHECK` de SQLite en lugar de basarse solo en
  uniones de TypeScript.
  La proyección de sesión en tiempo de ejecución borra las sombras de enrutamiento de compatibilidad de
  `session_entries.entry_json` antes de aplicar las columnas tipificadas de sesión/conversación,
  por lo que los payloads JSON obsoletos no pueden resucitar objetivos de entrega.
  El enrutamiento de anuncios de subagentes también requiere el contexto de entrega SQLite tipificado;
  ya no recurre a campos de ruta `SessionEntry` de compatibilidad.
  La herencia de entrega explícita de la pasarela `chat.send` lee el contexto de entrega SQLite tipificado
  en lugar de los campos de compatibilidad `origin`/`last*`.
  `tools.effective` también deriva el contexto de proveedor/cuenta/hilo de las filas
  tipificadas de entrega/enrutamiento de SQLite, no de las sombras obsoletas de entrada de sesión `last*`.
  El contexto del mensaje de evento del sistema reconstruye los campos canal/a/cuenta/hilo a partir de
  los campos de entrega tipificados en lugar de las sombras `origin`.
  El asistente compartido `deliveryContextFromSession` y el asignador de sesión a conversación
  ahora ignoran `SessionEntry.origin` por completo; solo los campos de entrega tipificados
  y las filas relacionales de conversación pueden crear una identidad de ruta activa.
  La normalización de la entrada de sesión en tiempo de ejecución elimina `origin` antes de persistir o
  proyectar `entry_json`, y la escritura de metadatos entrantes escribe los campos tipificados de canal/chat
  más las filas relacionales de conversación en lugar de crear nuevas sombras de origen.
- Los eventos de transcripción, las instantáneas de transcripción y los eventos de tiempo de ejecución de trayectoria ahora
  hacen referencia al `sessions` raíz canónico por agente y se eliminan en cascada al
  borrar la sesión. Las filas de identidad/idempotencia de la transcripción siguen eliminándose en cascada desde la
  fila exacta del evento de transcripción.
- Los índices de memoria principal ahora usan tablas explícitas de base de datos de agente
  `memory_index_meta`, `memory_index_sources`, `memory_index_chunks` y
  `memory_embedding_cache`; los índices opcionales FTS/vectoriales usan el mismo
  prefijo `memory_index_*` en lugar de las tablas genéricas `meta`, `files`, `chunks` o
  `chunks_vec`. `memory_index_sources` está indexado por
  `(source_kind, source_key)` y lleva una propiedad `session_id` opcional, por lo que
  las fuentes y los fragmentos derivados de la sesión se eliminan en cascada cuando se borra una sesión. Las
  incrustaciones de fragmentos en caché se almacenan como BLOBs SQLite Float32, no como matrices de texto JSON.
  Estas tablas son caché derivada/de búsqueda, no almacenamiento canónico de transcripciones; se pueden
  borrar y reconstruir desde `sessions`, `transcript_events` y archivos del
  espacio de trabajo de memoria.
- El estado de recuperación de ejecución del subagente ahora reside en filas `subagent_runs` compartidas tipificadas
  con claves de sesión indexadas para hijo, solicitante y controlador. El antiguo
  archivo `subagents/runs.json` es solo entrada para la migración del doctor.
- Los enlaces de conversación actuales ahora residen en filas `current_conversation_bindings` compartidas tipificadas
  indexadas por el ID de conversación normalizado, con columnas de agente/sesión de destino, tipo de conversación, estado, caducidad y metadatos
  almacenados como columnas relacionales en lugar de un registro de enlace opuesto duplicado.
  La clave de enlace duradera incluye el tipo de conversación normalizado, por lo que
  las referencias directas/grupo/canal no pueden colisionar, y SQLite rechaza los valores
  inválidos de tipo/estado de enlace. El antiguo
  archivo `bindings/current-conversations.json` es solo entrada para la migración del doctor.
- La recuperación de la cola de entrega ahora superpone columnas de cola tipificadas para canal, objetivo, cuenta, sesión, reintento, error, envío de plataforma y estado de recuperación sobre el JSON de reproducción. `entry_json` mantiene las cargas útiles de reproducción, los ganchos y la carga útil de formato, pero las columnas tipificadas son la autoridad para el enrutamiento/estado de la cola en caliente.
- Los punteros de restauración de la última sesión de la TUI ahora residen en filas compartidas `tui_last_sessions` tipificadas claveadas por el alcance de la conexión/sesión TUI hasheado. El antiguo archivo JSON de la TUI es solo entrada de migración de doctor.
- Las preferencias predeterminadas de TTS ahora residen en filas SQLite de estado de complemento compartidas claveadas bajo el complemento `speech-core`. El antiguo archivo `settings/tts.json` es solo entrada de migración de doctor; el tiempo de ejecución ya no lee ni escribe archivos JSON de preferencias de TTS, y el resolvedor de rutas heredado vive en el módulo de migración de doctor.
- Los metadatos del objetivo secreto ahora hablan de almacenes en lugar de fingir que cada objetivo de credencial es un archivo de configuración. `openclaw.json` sigue siendo el almacén de configuración; los objetivos de perfil de autenticación usan filas SQLite `auth_profile_stores` tipificadas con credenciales con forma de proveedor mantenidas como cargas útiles JSON.
- La auditoría de secretos ya no escanea los archivos retirados `auth.json` por agente. Doctor se encarga de advertir, importar y eliminar ese archivo heredado.
- Los auxiliares de ruta de perfil de autenticación heredados ahora viven en el código heredado de doctor. Los auxiliares de ruta de perfil de autenticación central exponen la identidad y las ubicaciones de visualización del almacén de autenticación SQLite, no rutas de tiempo de ejecución `auth-profiles.json` o `auth-state.json`.
- Los módulos de tiempo de ejecución de recuperación de ejecución de subagente y caché de capacidades de modelo de OpenRouter ahora mantienen lectores/escritores de instantáneas SQLite separados de los auxiliares de importación JSON heredados solo para doctor. Las capacidades de OpenRouter usan las filas `model_capability_cache` genéricas tipificadas bajo `provider_id = "openrouter"` en lugar de un blob de caché opaco o una tabla de host específica del proveedor. La ejecución de subagente `taskName` se almacena en la columna `subagent_runs.task_name` tipificada; la copia `payload_json` son datos de reproducción/depuración, no la fuente para pantallas en caliente o campos de búsqueda.
- `src/agents/filesystem/virtual-agent-fs.sqlite.ts` implementa un SQLite VFS
  sobre la tabla `vfs_entries` de la base de datos del agente. Las lecturas de directorio, las exportaciones
  recursivas, las eliminaciones y los cambios de nombre usan rangos de prefijos `(namespace, path)` indexados
  en lugar de escanear un espacio de nombres completo o confiar en la coincidencia de rutas `LIKE`.
- `src/agents/runtime-worker.entry.ts` crea un VFS de SQLite por ejecución, almacenes de artefactos de herramientas,
  artefactos de ejecución y caché con ámbito para los trabajadores.
- Los marcadores de finalización de arranque del espacio de trabajo ahora residen en filas `workspace_setup_state` compartidas y tipadas,
  clave por la ruta del espacio de trabajo resuelta, en lugar de `.openclaw/workspace-state.json`; el tiempo de ejecución ya no lee ni reescribe
  el marcador de espacio de trabajo heredado, y las API auxiliares ya no pasan una ruta `.openclaw/setup-state` falsa
  solo para derivar la identidad de almacenamiento.
- Las aprobaciones de ejecución ahora residen en la fila única `exec_approvals_config` de SQLite compartida y tipada.
  Doctor importa `~/.openclaw/exec-approvals.json` heredados;
  las escrituras del tiempo de ejecución ya no crean, reescriben o informan ese archivo como su ubicación
  de almacenamiento activa. El complemento de macOS lee y escribe la misma
  fila de la tabla `state/openclaw.sqlite`; mantiene solo el socket de solicitud de Unix en disco
  porque es IPC, no un estado duradero del tiempo de ejecución.
- La identidad del dispositivo, la autenticación del dispositivo y los módulos de tiempo de ejecución de arranque ahora mantienen sus
  lectores/escritores de instantáneas de SQLite separados de los auxiliares de importación de JSON heredados solo para doctor.
  La identidad del dispositivo usa filas `device_identities` tipadas y los tokens de autenticación
  del dispositivo usan filas `device_auth_tokens` tipadas. Las escrituras de autenticación del dispositivo concilian las filas
  por dispositivo/rol en lugar de truncar la tabla de tokens, y el tiempo de ejecución ya no
  enruta actualizaciones de un solo token a través del antiguo adaptador de toda la tienda. Las cargas útiles
  de JSON heredadas de versión 1 existen solo como formas de importación/exportación de doctor.
- La caché de intercambio de tokens de GitHub Copilot usa la tabla de estado del complemento SQLite compartida
  bajo `github-copilot/token-cache/default`. Es un estado de caché propiedad del proveedor,
  por lo que intencionalmente no agrega una tabla de esquema de host.
- La compactación de GitHub Copilot ya no escribe `openclaw-compaction-*.json`
  sidecars del espacio de trabajo. El arnés llama a la RPC de compactación del historial del SDK para la
  sesión del SDK rastreada, y OpenClaw mantiene el estado duradero de la sesión/transcripción en
  SQLite en lugar de archivos de marcador de compatibilidad.
- El tiempo de ejecución compartido de Swift (`OpenClawKit`) utiliza las mismas filas `state/openclaw.sqlite` para la identidad del dispositivo y la autenticación del dispositivo. Los ayudantes de la aplicación de macOS importan los ayudantes de SQLite compartidos en lugar de ser propietarios de una segunda ruta JSON o SQLite. Un `identity/device.json` heredado bloquea la creación de la identidad hasta que doctor la importe a SQLite, coincidiendo con la puerta de inicio de TypeScript y Android.
- La identidad del dispositivo Android utiliza el mismo material de claves compatible con TypeScript almacenado en filas tipadas `state/openclaw.sqlite#table/device_identities`. Nunca lee o escribe `openclaw/identity/device.json`; un archivo heredado bloquea el inicio hasta que doctor lo importa a SQLite.
- Los tokens de autenticación del dispositivo en caché de Android también utilizan filas tipadas `state/openclaw.sqlite#table/device_auth_tokens` y comparten la misma semántica de token de versión 1 que TypeScript y Swift. El tiempo de ejecución ya no lee claves de compatibilidad `SecurePrefs` `gateway.deviceToken*`; esas pertenecen únicamente a la lógica de migración/doctor.
- El historial de paquetes recientes de notificaciones de Android utiliza filas tipadas `android_notification_recent_packages`. El tiempo de ejecución ya no migra ni lee las antiguas claves CSV de SharedPreferences.
- La creación de la identidad del dispositivo falla de forma cerrada cuando existe un archivo `identity/device.json` heredado, cuando la fila de identidad de SQLite no es válida o cuando no se puede abrir el almacén de identidad de SQLite. Doctor importa y elimina ese archivo primero, por lo que el inicio del tiempo de ejecución no puede rotar silenciosamente la identidad de emparejamiento antes de la migración.
- La selección de identidad del dispositivo es una clave de fila de SQLite, no un localizador de archivo JSON. Las pruebas y los ayudantes de puerta de enlace pasan claves de identidad explícitas; solo la migración de doctor y la puerta de inicio de falla cerrada conocen el nombre de archivo `identity/device.json` retirado.
- La compatibilidad de restablecimiento de sesión ahora reside en la migración de configuración de doctor: `session.idleMinutes` se mueve a `session.reset.idleMinutes`, `session.resetByType.dm` se mueve a `session.resetByType.direct`, y la política de restablecimiento del tiempo de ejecución solo lee claves de restablecimiento canónicas.
- La compatibilidad con la configuración heredada ahora reside bajo `src/commands/doctor/`. La validación normal de `readConfigFileSnapshot()` no importa los detectores heredados del doctor ni anota problemas heredados; `runDoctorConfigPreflight()` añade esos problemas para la reparación/informe del doctor. El flujo de configuración del doctor importa `src/commands/doctor/legacy-config.ts`, y la reparación antigua del id de perfil de OAuth reside bajo `src/commands/doctor/legacy/oauth-profile-ids.ts`.
- Los comandos que no son del doctor no ejecutan automáticamente la reparación de la configuración heredada. Por ejemplo, `openclaw update --channel` ahora falla con una configuración heredada no válida y pide al usuario que ejecute el doctor, en lugar de importar silenciosamente el código de migración del doctor.
- Las notificaciones push web, APNs, Voice Wake, las comprobaciones de actualización y el estado de la configuración ahora usan tablas SQLite compartidas y tipadas para suscripciones, claves VAPID, registros de nodos, filas de activación, filas de enrutamiento, estado de notificación de actualización y entradas de estado de la configuración, en lugar de blobs JSON opacos completos. Las escrituras de instantáneas de push web y APNs ahora concilian las suscripciones/registros por clave principal en lugar de borrar sus tablas; el estado de la configuración hace lo mismo por la ruta de configuración. Sus módulos de tiempo de ejecución mantienen separados los lectores/escritores de instantáneas SQLite de los auxiliares de importación JSON heredados solo para el doctor.
- La configuración del host del nodo ahora usa una fila singleton tipada en la base de datos SQLite compartida; el doctor importa el archivo antiguo `node.json` antes del uso normal en tiempo de ejecución.
- El emparejamiento de dispositivo/nodo, el emparejamiento de canales, las listas permitidas de canales y el estado de arranque ahora usan filas SQLite tipadas en lugar de blobs JSON opacos completos. Las aprobaciones de vinculación de complementos y el estado de los trabajos cron siguen la misma división: los módulos de tiempo de ejecución exponen operaciones respaldadas por SQLite y auxiliares de instantáneas neutrales, y las escrituras de instantáneas de emparejamiento/arranque más aprobaciones de vinculación de complementos concilian las filas por clave principal en lugar de truncar las tablas, mientras que el doctor importa o elimina los archivos JSON antiguos a través de módulos `src/commands/doctor/legacy/*`.
- Los registros de complementos instalados ahora residen en el índice de complementos instalados de SQLite. La lectura/escritura de la configuración en tiempo de ejecución ya no migra ni preserva los datos de configuración creada `plugins.installs` antiguos; el doctor importa esa forma de configuración heredada a SQLite antes del uso normal en tiempo de ejecución.
- Las instantáneas de recuperación de credenciales de QQBot ahora residen en el estado del complemento SQLite bajo `qqbot/credential-backups`. El tiempo de ejecución ya no escribe `qqbot/data/credential-backup*.json`; el doctor importa y elimina esos archivos de respaldo heredados con las otras entradas de estado de QQBot.
- La planificación de la recarga de Gateway compara las instantáneas del índice de complementos instalados de SQLite bajo un espacio de nombres diff `installedPluginIndex.installRecords.*` interno. Las decisiones de recarga del tiempo de ejecución ya no envuelven esas filas en objetos de configuración `plugins.installs` falsos.
- La actualización de credenciales de cuentas con nombre de Matrix ya no ocurre durante las lecturas del tiempo de ejecución. El doctor se encarga del cambio de nombre del `credentials/matrix/credentials.json` de nivel superior anterior cuando se puede resolver una única cuenta predeterminada de Matrix.
- Los módulos del tiempo de ejecución principales de emparejamiento y cron ya no exportan constructores de rutas JSON heredados. Los módulos heredados propiedad del doctor construyen rutas de origen `pending.json`, `paired.json`, `bootstrap.json` y `cron/jobs.json` solo para pruebas de importación y migración. La normalización de la forma de trabajos cron heredados y la importación de registros de ejecución de cron residen en `src/commands/doctor/legacy/cron*.ts`.
- `src/commands/doctor/legacy/runtime-state.ts` importa archivos de estado JSON heredados, incluida la configuración del host del nodo, a SQLite desde el doctor. Los nuevos importadores de archivos heredados permanecen en `src/commands/doctor/legacy/`.
- `src/commands/doctor/state-migrations.ts` importa transcripciones heredadas `sessions.json` y `*.jsonl` directamente a SQLite y elimina las fuentes exitosas. Ya no ensaya transcripciones heredadas raíz a través de `agents/<agentId>/sessions/*.jsonl` ni crea un destino JSONL canónico antes de la importación.
- Las comprobaciones de integridad del estado del doctor ya no escanean directorios de sesión heredados ni ofrecen eliminación de JSONL huérfanos. Los archivos de transcripción heredados son solo entradas de migración, y el paso de migración se encarga de la importación y la eliminación de la fuente.
- La importación del registro de sandbox heredado reside en `src/commands/doctor/legacy/sandbox-registry.ts`; las lecturas y escrituras del registro de sandbox activo permanecen exclusivamente en SQLite.
- La reparación de salud/importación de la transcripción de sesión heredada reside en `src/commands/doctor/legacy/session-transcript-health.ts`; los módulos de comandos del tiempo de ejecución ya no contienen código de análisis de transcripción JSONL o reparación de ramas activas.

Aspectos destacados de la consolidación/eliminación completada:

- El estado del complemento ahora usa la base de datos compartida `state/openclaw.sqlite`. Se eliminó el antiguo importador sidecar `plugin-state/state.sqlite` local a la rama porque ese diseño de SQLite nunca se envió. Los asistentes de prueba/sondeo reportan el `databasePath` compartido en lugar de exponer una ruta SQLite específica del estado del complemento.
- Las tablas de tiempo de ejecución de Task y Task Flow ahora residen en la base de datos compartida `state/openclaw.sqlite` en lugar de `tasks/runs.sqlite` y `tasks/flows/registry.sqlite`; se eliminaron los antiguos importadores sidecar por la misma razón de diseño no enviado.
- `src/config/sessions/store.ts` ya no necesita `storePath` para metadatos entrantes, actualizaciones de ruta o lecturas de fecha de actualización. La persistencia de comandos, la limpieza de sesiones CLI, la profundidad de subagentes, las anulaciones de autenticación y la identidad de sesión de transcripción utilizan las API de filas de agente/sesión. Las escrituras se aplican como parches de filas SQLite con reintento de conflictos optimista.
- La resolución de destino de sesión ahora expone objetivos de base de datos por agente, no rutas `sessions.json` heredadas. La puerta de enlace compartida, los metadatos de ACP, la reparación de rutas del doctor y `openclaw sessions` enumeran `agent_databases` además de los agentes configurados.
- El enrutamiento de sesiones de la puerta de enlace ahora usa `resolveGatewaySessionDatabaseTarget`; el objetivo devuelto lleva `databasePath` y claves de fila SQLite candidatas en lugar de una ruta de archivo de almacén de sesión heredada.
- Los tipos de tiempo de ejecución de sesión de canal ahora exponen `{agentId, sessionKey}` para lecturas de fecha de actualización, metadatos entrantes y actualizaciones de última ruta. El antiguo tipo de compatibilidad `saveSessionStore(storePath, store)` ha desaparecido.
- El tiempo de ejecución del complemento, la API de extensión y la superficie del barril `config/sessions` ahora dirigen el código del complemento a los asistentes de filas de sesión respaldados por SQLite. Las exportaciones de compatibilidad de la biblioteca raíz (`loadSessionStore`, `saveSessionStore`, `resolveStorePath`) permanecen como shims en desuso para los consumidores existentes. El antiguo asistente `resolveLegacySessionStorePath` ha desaparecido; la construcción de rutas `sessions.json` heredadas ahora es local para las migraciones y accesorios de prueba.
- `src/config/sessions/session-entries.sqlite.ts` ahora almacena entradas de sesión canónicas
  en la base de datos por agente y tiene soporte de parche de lectura/actualización/eliminación
  a nivel de fila. La actualización/patch/eliminación en tiempo de ejecución ya no busca variantes de mayúsculas/minúsculas o
  poda claves de alias heredadas; doctor es el responsable de la canonización. El
  asistente de importación JSON independiente ha desaparecido, y la migración combina actualizaciones de filas más nuevas
  en lugar de reemplazar toda la tabla de sesiones. Los asistentes públicos de lectura/lista/carga
  proyectan metadatos de sesión activa desde filas tipadas `sessions` y `conversations`;
  `entry_json` es una sombra de compatibilidad/depuración y puede estar obsoleto o no válido
  sin perder la identidad de sesión tipada ni el contexto de entrega.
- `src/config/sessions/delivery-info.ts` ahora resuelve el contexto de entrega desde las
  filas tipadas por agente `sessions` + `conversations` + `session_conversations`.
  Ya no reconstruye la identidad de entrega en tiempo de ejecución desde
  `session_entries.entry_json`; una fila de conversación tipada faltante es un problema de
  migración/reparación de doctor, no una alternativa en tiempo de ejecución.
- Las decisiones de restablecimiento de sesión almacenada ahora prefieren metadatos tipados `sessions.session_scope`,
  `sessions.chat_type` y `sessions.channel`. El análisis de
  `sessionKey` permanece solo para sufijos de conversación/hilo explícitos en los objetivos de comando; la clasificación de restablecimiento
  de grupo vs directo ya no proviene de la forma de la clave.
- La clasificación de visualización de lista/estado de sesión ahora usa metadatos de chat tipados y el
  tipo de sesión de la puerta de enlace. Ya no trata las subcadenas `:group:` o `:channel:`
  dentro de `session_key` como una verdad duradera de grupo/directo.
- La selección de política de respuesta silenciosa ahora usa solo el tipo de conversación explícito o metadatos
  de superficie. Ya no adivina la política directa/de grupo desde
  subcadenas de `session_key`.
- La resolución del modelo de visualización de sesión ahora recibe el id del agente desde el objetivo de
  la base de datos de sesiones SQLite en lugar de dividirlo desde `session_key`.
- La hidratación del objetivo de anuncio de agente a agente ahora usa `sessions.list`
  `deliveryContext` únicamente. Ya no recupera el enrutamiento de canal/cuenta/hilo
  desde el `origin` heredado, campos `last*` reflejados o la forma `session_key`.
- El rechazo de objetivo de hilo `sessions_send` ahora lee metadatos
  de enrutamiento SQLite tipados. Ya no rechaza ni acepta objetivos analizando sufijos
  de hilo a partir de la clave del objetivo.
- La validación de la política de herramientas con alcance de grupo ahora lee el enrutamiento
  de conversación SQLite tipado para la sesión actual o generada. Ya no confía en la identidad
  de grupo/canal decodificando `sessionKey`; los ids de grupo proporcionados por el llamante se descartan cuando
  ninguna fila de sesión tipada los respalda.
- La coincidencia de sobrescritura del modelo de canal ahora usa metadatos explícitos de grupo
  y conversación principal. Ya no decodifica los ids de conversación principal desde
  `parentSessionKey`.
- La herencia de sobrescritura de modelo almacenada ahora requiere una clave de sesión principal explícita
  desde el contexto de sesión tipado. Ya no deriva sobrescrituras principales desde
  sufijos `:thread:` o `:topic:` en `sessionKey`.
- El contenedor de información de hilo de sesión antiguo y el analizador de hilo de complemento cargado han desaparecido;
  ningún código en tiempo de ejecución importa `config/sessions/thread-info`.
- El auxiliar de conversación de canal ya no expone puentes de análisis de clave de sesión completa.
  Core todavía normaliza los ids brutos de conversación propiedad del proveedor a través de
  `resolveSessionConversation(...)`, pero no reconstruye hechos de ruta
  desde `sessionKey`.
- La entrega de finalización, la política de envío y el mantenimiento de tareas ya no derivan el tipo
  de chat desde la forma `session_key`. El analizador antiguo de clave de tipo de chat ha sido eliminado;
  estas rutas requieren metadatos de sesión tipados, contexto de entrega tipado o
  vocabulario explícito de objetivo de entrega.
- La lista/estado de sesión, diagnósticos, vinculación de cuenta de aprobación, filtrado de latido TUI
  y resúmenes de uso ya no extraen `SessionEntry.origin` para
  enrutamiento de proveedor/cuenta/hilo/pantalla. Las únicas lecturas `origin`
  restantes en tiempo de ejecución son conceptos que no son de sesión u objetos de entrega del turno actual.
- La búsqueda de conversación nativa de solicitud de aprobación ahora lee filas de enrutamiento de sesión por agente con tipo. Ya no analiza la identidad de conversación de canal/grupo/hilo desde `sessionKey`; la falta de metadatos con tipo es un problema de migración/reparación.
- Las cargas útiles de eventos de sesión cambiada/chat/sesión de la puerta de enlace ya no reflejan sombras de ruta `SessionEntry.origin` o `last*`; los clientes reciben `channel`, `chatType` y `deliveryContext` con tipo.
- La resolución de entrega de latidos ahora puede recibir directamente el `deliveryContext` de SQLite con tipo, y el tiempo de ejecución de latidos pasa la fila de entrega de sesión por agente en lugar de confiar en sombras `session_entries` de compatibilidad para el enrutamiento actual.
- La resolución del objetivo de entrega del agente aislado de Cron también hidrata su ruta actual desde la fila de entrega de sesión por agente con tipo antes de recurrir a la carga útil de entrada de compatibilidad.
- La resolución del origen de anuncio del subagente ahora pasa el contexto de entrega de sesión solicitante con tipo a través de `loadRequesterSessionEntry` y prefiere esa fila sobre las sombras `last*`/`deliveryContext` de compatibilidad.
- Las actualizaciones de metadatos de sesión entrantes ahora se fusionan primero con la fila de entrega por agente con tipo; los campos de entrega `SessionEntry` antiguos son solo el respaldo cuando no existe ninguna fila de conversación con tipo.
- La extracción de entrega de reinicio/actualización ahora permite que la entrega `threadId` de SQLite con tipo prevalezca sobre los fragmentos de tema/hilo analizados desde `sessionKey`; el análisis es solo un respaldo para claves con forma de hilo heredadas.
- Los identificadores de canal del contexto del agente de enlace ahora prefieren la identidad de conversación de SQLite con tipo, luego los metadatos explícitos del mensaje. Ya no analizan fragmentos de proveedor/grupo/canal desde `sessionKey`.
- La herencia de ruta externa de la puerta de enlace `chat.send` ahora lee metadatos de enrutamiento de sesión SQLite con tipo en lugar de inferir el ámbito de canal/directo/grupo a partir de piezas `sessionKey`. Las sesiones con ámbito de canal solo heredan cuando el canal de sesión con tipo y el tipo de chat coinciden con el contexto de entrega almacenado; las sesiones principales compartidas mantienen su regla más estricta de CLI/sin metadatos de cliente.
- El enrutamiento de reanudación del centinela de reinicio y de continuación ahora lee filas de entrega/enrutamiento SQLite con tipo antes de poner en cola los reanudadores de latido o las continuaciones de turno del agente enrutado. Ya no reconstruye el contexto de entrega a partir de la sombra JSON de entrada de sesión.
- La resolución de contexto `tools.effective` de la puerta de enlace ahora lee filas de entrega/enrutamiento SQLite con tipo para entradas de proveedor, cuenta, objetivo, hilo y modo de respuesta. Ya no recupera esos campos de enrutamiento activos a partir de sombras de origen `session_entries.entry_json` obsoletas.
- El enrutamiento de consultas de voz en tiempo real ahora resuelve la entrega principal/llamada a partir de filas de sesión SQLite por agente con tipo. Ya no recurre a sombras de compatibilidad `SessionEntry.deliveryContext` al elegir la ruta del mensaje del agente incrustado.
- El relé de latido de generación de ACP y el enrutamiento de flujo principal ahora leen la entrega principal a partir de filas de sesión SQLite con tipo. Ya no reconstruyen el contexto de entrega principal a partir de sombras de entrada de sesión de compatibilidad.
- La preservación de la ruta de entrega de sesión ahora sigue metadatos de chat con tipo y columnas de entrega persistidas. Ya no extrae sugerencias de canal, marcadores directo/principal o la forma del hilo de `sessionKey`; las rutas de chat web internas solo heredan un objetivo externo cuando SQLite ya tiene una identidad de entrega con tipo/persistida para la sesión.
- La extracción de entrega de sesión genérica ahora lee solo la fila exacta de entrega de sesión SQLite con tipo. Ya no analiza sufijos de hilo/tema ni recurre de una clave con forma de hilo a una clave de sesión base.
- El envío de respuesta, la recuperación del centinela de reinicio y el enrutamiento de consultas de voz en tiempo real ahora usan filas exactas de sesión/conversación SQLite con tipo para el enrutamiento de hilos. Ya no recuperan identificadores de hilo ni contextos de entrega de sesión base analizando claves de sesión con forma de hilo.
- La limitación del historial de PI integrado ahora utiliza la proyección de enrutamiento de sesión SQLite tipificada (`sessions` + `conversations` primaria) para el proveedor, el tipo de chat y la identidad del par. Ya no analiza la forma del proveedor, DM, grupo o hilo a partir de `sessionKey`.
- La inferencia de entrega de la herramienta Cron ahora utiliza entrega explícita o solo el contexto de entrega tipificada actual. Ya no decodifica los objetivos de canal, par, cuenta o hilo de `agentSessionKey`.
- Las filas de sesión de tiempo de ejecución ya no llevan el alias de ruta `lastProvider` antiguo. Los ayudantes y las pruebas utilizan campos `lastChannel` y `deliveryContext` tipificados; la migración del doctor es el único lugar que debe traducir alias de ruta más antiguos o sombras `origin` persistidas.
- Los eventos de transcripción, las filas VFS y las filas de artefactos de herramientas ahora se escriben en la base de datos por agente. La tabla de mapeo de archivos de transcripción global no enviada ha desaparecido; el doctor registra las rutas de origen heredadas en filas de migración duraderas en su lugar.
- La búsqueda de transcripciones en tiempo de ejecución ya no escanea desplazamientos de bytes JSONL ni sondea archivos de transcripción heredados. Las rutas de chat/medios/historial de la puerta de enlace leen filas de transcripción de SQLite; el JSONL de sesión ahora es solo una entrada heredada del doctor, no un estado de tiempo de ejecución o un formato de exportación.
- Las relaciones de padre y rama de la transcripción utilizan metadatos `parentTranscriptScope: {agentId, sessionId}` estructurados en los encabezados de transcripción de SQLite, no cadenas de localización `agent-db:...transcript_events...` tipo ruta.
- El contrato del administrador de transcripciones ya no expone constructores `create(cwd)` o `continueRecent(cwd)` implícitos persistidos. Los administradores de transcripciones persistidos se abren con un alcance `{agentId, sessionId}` explícito; solo los administradores en memoria permanecen sin alcance para pruebas y transformaciones de transcripciones puras.
- Las APIs del almacén de transcripciones en tiempo de ejecución resuelven el alcance de SQLite, no las rutas del sistema de archivos. El antiguo ayudante `resolve...ForPath` y las opciones de escritura `transcriptPath` no utilizadas han desaparecido de los llamadores en tiempo de ejecución.
- La resolución de sesión en tiempo de ejecución ahora utiliza `{agentId, sessionId}` y no debe derivar cadenas `sqlite-transcript://<agent>/<session>` para límites externos. Las rutas absolutas JSONL heredadas son solo entradas de migración del doctor.
- Los registros de puente directo de retransmisión de gancho nativo ahora residen en filas compartidas con tipos `native_hook_relay_bridges` claveadas por id de retransmisión. El tiempo de ejecución ya no escribe un registro `/tmp` JSON ni registros genéricos opacos para esos registros de puente de corta duración.
- `runEmbeddedPiAgent(...)` ya no tiene un parámetro de localizador de transcripciones. Los descriptores de trabajador preparados también omiten los localizadores de transcripciones. El estado de la sesión del tiempo de ejecución y las ejecuciones de seguimiento en cola llevan `{agentId, sessionId}` en lugar de identificadores de transcripción derivados.
- La compactación integrada ahora toma el alcance SQLite de `agentId` y `sessionId`. Los ganchos de compactación, las llamadas al motor de contexto, la delegación de CLI y las respuestas de protocolo no deben recibir identificadores `sqlite-transcript://...` derivados. El código de exportación/depuración puede materializar artefactos de usuario explícitos desde las filas, pero no proporciona una ruta de exportación genérica JSONL de sesión ni devuelve los nombres de archivo a la identidad del tiempo de ejecución.
- `/export-session` lee filas de transcripción de SQLite y escribe solo la vista HTML independiente solicitada. El visor integrado ya no reconstruye ni descarga el JSONL de sesión desde esas filas.
- La delegación del motor de contexto ya no analiza un localizador de transcripción para recuperar la identidad del agente. El contexto de tiempo de ejecución preparado lleva el `agentId` resuelto al adaptador de compactación integrado.
- La reescritura de transcripciones y el truncamiento en vivo de resultados de herramientas ahora leen y persisten el estado de la transcripción por `{agentId, sessionId}` y no derivan localizadores temporales para las cargas útiles de eventos de actualización de transcripción.
- La superficie de ayuda del estado de la transcripción ya no tiene variantes basadas en localizadores `readTranscriptState`, `replaceTranscriptStateEvents` o `persistTranscriptStateMutation`. Los llamadores del tiempo de ejecución deben usar las APIs `{agentId, sessionId}`. La importación de Doctor lee archivos heredados por ruta de archivo explícita y escribe filas SQLite; no migra cadenas de localizador.
- El contrato del gestor de sesiones en tiempo de ejecución ya no expone `open(locator)`,
  `forkFrom(locator)` ni `setTranscriptLocator(...)`. Los gestores de sesiones
  persistentes se abren solo mediante `{agentId, sessionId}`; los ayudantes de listado/bifurcación residen en
  las API de sesión y puntos de control orientadas a filas en lugar de la fachada
  del gestor de transcripciones.
- Las API del lector de transcripciones de la puerta de enlace son prioridad de ámbito. Toman
  `{agentId, sessionId}` y no aceptan un localizador de transcripción posicional que
  pudiera convertirse accidentalmente en una identidad en tiempo de ejecución. El análisis activo
  del localizador de transcripción ha desaparecido; las rutas de origen heredadas solo las lee
  el código de importación del doctor.
- Los eventos de actualización de transcripciones también son prioridad de ámbito. `emitSessionTranscriptUpdate`
  ya no acepta una cadena de localizador simple, y los oyentes enrutan mediante
  `{agentId, sessionId}` sin analizar un identificador.
- La transmisión de mensajes de sesión de la puerta de enlace resuelve las claves de sesión desde el ámbito
  de agente/sesión, no desde un localizador de transcripción. El antiguo resolvedor/caché
  de clave de sesión de localizador de transcripción ha desaparecido.
- El filtro de actualizaciones en vivo SSE del historial de sesiones de la puerta de enlace filtra por ámbito de
  agente/sesión. Ya no canónicos candidatos de localizador de transcripción, rutas reales o identidades
  de transcripción con forma de archivo para decidir si una transmisión debe recibir una actualización.
- Los enlaces del ciclo de vida de la sesión ya no derivan ni exponen localizadores de transcripción en
  `session_end`. Los consumidores de los enlaces obtienen `sessionId`, `sessionKey`, ids de
  siguiente sesión y contexto del agente; los archivos de transcripción no son parte del contrato
  del ciclo de vida.
- Los enlaces de restablecimiento tampoco derivan ni exponen localizadores de transcripción. La carga útil
  `before_reset` lleva mensajes de SQLite recuperados más el motivo
  del restablecimiento, mientras que la identidad de la sesión permanece en el contexto del enlace.
- El restablecimiento del arnés del agente ya no acepta un localizador de transcripción. El despacho del
  restablecimiento está limitado por `sessionId`/`sessionKey` más el motivo.
- Los tipos de sesión de extensión de agente ya no exponen `transcriptLocator`; las extensiones
  deben usar el contexto de sesión y las API de tiempo de ejecución en lugar de buscar una
  identidad de transcripción con forma de archivo.
- Los hooks de compactación de plugins ya no exponen localizadores de transcripciones. El contexto del hook ya lleva la identidad de la sesión, y las lecturas de transcripciones deben pasar a través de las APIs de SQLite con conocimiento de alcance (scope-aware) en lugar de manejadores con forma de archivo.
- Los hooks `before_agent_finalize` ya no exponen `transcriptPath`, incluyendo las cargas útiles de retransmisión (relay) de hooks nativos. Los hooks de finalización usan solo el contexto de la sesión.
- Las respuestas de restablecimiento de la puerta de enlace (gateway) ya no sintetizan un localizador de transcripción en la entrada devuelta. El restablecimiento crea filas de transcripción en SQLite, devuelve la entrada de la sesión limpia y deja el acceso a la transcripción a los lectores con conocimiento de alcance.
- Los resultados de ejecución y compactación integradas ya no exponen localizadores de transcripción para la contabilidad de la sesión. La compactación automática solo actualiza el `sessionId` activo, los contadores de compactación y los metadatos de tokens.
- Los resultados de intentos integrados ya no devuelven `transcriptLocatorUsed`, y los resultados del motor de contexto `compact()` ya no devuelven localizadores de transcripción. Los bucles de reintentos en tiempo de ejecución solo aceptan un `sessionId` sucesor.
- Los resultados de anexión de transcripciones del espejo de entrega (delivery-mirror) ya no devuelven localizadores de transcripción. Los llamados obtienen el `messageId` anexado; las señales de actualización de transcripción usan el alcance de SQLite.
- Los ayudantes de bifurcación (fork) de sesión principal devuelven solo el `sessionId` bifurcado. La preparación del subagente pasa el alcance del agente/sesión hijo a los motores.
- Los parámetros del ejecutor CLI y la resembranza del historial ya no aceptan localizadores de transcripción. Las lecturas del historial CLI resuelven el alcance de la transcripción SQLite desde `{agentId, sessionId}` y el contexto de la clave de sesión.
- Los dispositivos de prueba (fixtures) del ejecutor CLI y del ejecutor integrado ahora siembran y leen filas de transcripción SQLite por ID de sesión en lugar de pretender que las sesiones activas son archivos `*.jsonl` o pasar una cadena `sqlite-transcript://...` a través de parámetros de tiempo de ejecución.
- Los eventos de guardia de resultados de herramientas de sesión emiten desde un alcance de sesión conocido incluso cuando un administrador en memoria no tiene un localizador derivado. Sus pruebas ya no falsifican archivos de transcripción `/tmp/*.jsonl` activos.
- Los ayudantes BTW y de punto de control de compactación ahora leen y bifurcan filas de transcripción por alcance de SQLite. Los metadatos del punto de control ahora almacenan solo IDs de sesión e IDs de hoja/entrada; los localizadores derivados ya no se escriben en las cargas útiles del punto de control.
- La búsqueda de claves de transcripción del gateway utiliza el ámbito de transcripción de SQLite en los límites del protocolo y ya no realiza realpath o estadísticas en los nombres de archivo de transcripción.
- La rotación de transcripción por compactación automática escribe filas de transcripción sucesoras directamente a través del almacén de transcripciones de SQLite. Las filas de sesión mantienen solo la identidad de la sesión sucesora, no una ruta JSONL duradera o un localizador persistente.
- La compactación del motor de contexto incorporado utiliza auxiliares de rotación de transcripción con nombre de SQLite. Las pruebas de rotación ya no construyen rutas sucesoras JSONL ni modelan sesiones activas como archivos.
- La retención de imágenes salientes gestionadas clava su caché de mensajes de transcripción desde las estadísticas de transcripción de SQLite en lugar de llamadas de estadísticas del sistema de archivos.
- Los bloqueos de sesión en tiempo de ejecución y el carril heredado independiente `.jsonl.lock` doctor se han eliminado.
- El barril de tiempo de ejecución de Microsoft Teams y el SDK público de complementos ya no reexportan el auxiliar de bloqueo de archivos antiguo; las rutas de estado de complemento duraderas están respaldadas por SQLite.
- Se han eliminado la limpieza por edad/recuento de sesión y la limpieza explícita de sesión. Doctor posee la importación heredada; las sesiones obsoletas se restablecen o eliminan explícitamente.
- Las comprobaciones de integridad de Doctor ya no cuentan un archivo JSONL heredado como una transcripción activa válida para una fila de sesión SQLite. La salud de la transcripción activa es exclusivamente de SQLite; los archivos JSONL heredados se reportan como entradas de migración o limpieza de huérfanos.
- Doctor ya no trata `agents/<agent>/sessions/` como un estado de tiempo de ejecución requerido. Solo escanea ese directorio cuando ya existe, como entrada de importación heredada o limpieza de huérfanos.
- Gateway `sessions.resolve`, rutas de parche/restablecimiento/compactación de sesión, generación de subagentes, aborto rápido, metadatos ACP, sesiones aisladas de latido y parcheo TUI ya no migran ni depuran claves de sesión heredadas como un efecto secundario del trabajo normal de tiempo de ejecución.
- La resolución de sesión de comandos CLI ahora devuelve el `agentId` propietario en lugar de un `storePath`, y ya no copia filas heredadas de sesión principal durante la resolución normal `--to` o `--session-id`. La canonización de filas principales heredadas pertenece solo a doctor.
- La resolución de profundidad del subagente en tiempo de ejecución ya no lee `sessions.json` o almacenes de sesión JSON5. Lee `session_entries` de SQLite por id. de agente, y los metadatos de profundidad/sesión heredados solo pueden ingresar a través de la ruta de importación del doctor.
- Las anulaciones de sesión del perfil de autenticación persisten a través de upserts directos de filas `{agentId, sessionKey}` en lugar de cargar de forma diferida un tiempo de ejecución de almacén de sesión con forma de archivo.
- La puerta de enlace detallada de respuesta automática y los asistentes de actualización de sesión ahora leen/hacen upsert de filas de sesión de SQLite por identidad de sesión y ya no requieren una ruta de almacén heredada antes de tocar el estado de la fila persistida.
- Los asistentes de metadatos de sesión de ejecución de comandos ahora usan nombres y rutas de módulo orientados a entradas; se ha eliminado la antigua superficie del asistente de comandos `session-store`.
- La siembra de encabezados de arranque y el endurecimiento del límite de compactación manual ahora mutan directamente las filas de transcripciones de SQLite. Los llamantes en tiempo de ejecución pasan la identidad de la sesión, no rutas `.jsonl` escribibles.
- La reproducción silenciosa de rotación de sesión copia los turnos recientes de usuario/asistente `{agentId, sessionId}` desde las filas de transcripciones de SQLite. Ya no acepta localizadores de transcripción de origen o destino.
- Las filas de sesión en tiempo de ejecución nuevas ya no almacenan localizadores de transcripciones. Los llamantes usan `{agentId, sessionId}` directamente; los comandos de exportación/depuración pueden elegir nombres de archivos de salida cuando materializan las filas.
- Iniciar una nueva sesión de transcripción persistida ahora siempre abre filas de SQLite por ámbito. El administrador de sesiones ya no reutiliza una ruta o localizador de transcripción de la era de archivos anterior como la identidad para la nueva sesión.
- Las sesiones de transcripción persistidas usan la API explícita `openTranscriptSessionManagerForSession({agentId, sessionId})`. Las fachadas estáticas antiguas `SessionManager.create/openForSession/list/forkFromSession` han desaparecido para que las pruebas y el código en tiempo de ejecución no puedan recrear accidentalmente el descubrimiento de sesiones de la era de archivos.
- El tiempo de ejecución del complemento ya no expone `api.runtime.agent.session.resolveTranscriptLocatorPath`; el código del complemento usa asistentes de filas de SQLite y valores de ámbito.
- La superficie pública del SDK `session-store-runtime` ahora solo exporta asistentes de filas de sesión y de transcripción. Los asistentes sin procesar de apertura/ruta y cierre/restablecimiento de la base de datos SQLite viven en la superficie del SDK enfocada `sqlite-runtime`, por lo que las pruebas de complementos ya no extraen el barril de pruebas amplio en desuso para la limpieza de la base de datos.
- Los clasificadores heredados de nombre de archivo de trayectoria/punto de control `.jsonl` ahora residen en el
  módulo de archivos de sesión heredados del doctor. La validación principal de sesión ya no importa
  ayudantes de artefactos de archivo para decidir identificadores de sesión SQLite normales.
- Las ejecuciones de subagentes de bloqueo de memoria activa utilizan filas de transcripción SQLite en lugar de
  crear archivos `session.jsonl` temporales o persistentes bajo el estado del complemento. La
  antigua opción `transcriptDir` se ha eliminado.
- La generación de slugs puntuales y las ejecuciones del planificador Crestodian utilizan filas de transcripción SQLite
  en lugar de crear archivos `session.jsonl` temporales.
- Las ejecuciones de ayuda `llm-task` y la extracción de compromisos ocultos también utilizan filas de transcripción SQLite,
  por lo que estas sesiones de ayuda solo de modelo ya no crean
  archivos de transcripción JSON/JSONL temporales.
- `TranscriptSessionManager` ahora es solo un ámbito de transcripción SQLite abierto.
  El código de tiempo de ejecución lo abre con `openTranscriptSessionManagerForSession({agentId,
sessionId})`; los flujos de crear, ramificar, continuar, listar y bifurcar residen en sus
  ayudantes de fila SQLite propietarios en lugar de fachadas de administrador estáticas.
  El código de doctor/importación/depuración maneja archivos de origen heredados explícitos fuera del
  administrador de sesión de tiempo de ejecución.
- Los métodos de fachada obsoletos `SessionManager.newSession()` y
  `SessionManager.createBranchedSession()` se eliminaron. Las
  nuevas sesiones y los descendientes de transcripciones se crean mediante su flujo de trabajo SQLite
  propietario en lugar de mutar un administrador ya abierto en una
  sesión persistente diferente.
- Las decisiones de bifurcación y la creación de bifurcaciones de la transcripción principal ya no aceptan
  `storePath` o `sessionsDir`; utilizan el ámbito de
  transcripción SQLite `{agentId, sessionId}` en lugar de metadatos de ruta de sistema de archivos retenidos.
- El host de memoria ya no exporta ayudantes de clasificación de transcripciones de directorio de sesión no operativos;
  el filtrado de transcripciones ahora se deriva de los metadatos de fila SQLite durante la construcción de entradas.
- Las pruebas de exportación de sesiones del host de memoria y QMD utilizan ámbitos de transcripción SQLite. Las rutas
  `agents/<agentId>/sessions/*.jsonl` antiguas solo permanecen cubiertas donde una prueba intencionalmente demuestra la compatibilidad de doctor/importación/exportación.
- La inspección de sesiones en bruto de QA-lab ahora utiliza `sessions.list` a través de la puerta de enlace
  en lugar de leer `agents/qa/sessions/sessions.json`; los comentarios de MSteams
  se añaden directamente a las transcripciones de SQLite sin fabricar una ruta JSONL.
- Los turnos del canal de entrada compartido ahora transportan `{agentId, sessionKey}` en lugar de un
  `storePath` heredado. Las rutas de grabación de LINE, WhatsApp, Slack, Discord, Telegram, Matrix, Signal,
  iMessage, BlueBubbles, Feishu, Google Chat, IRC, Nextcloud Talk, Zalo,
  Zalo Personal, QA Channel, Microsoft Teams, Mattermost, Synology Chat, Tlon,
  Twitch y QQBot ahora leen metadatos de última actualización y graban
  filas de sesión de entrada a través de la identidad de SQLite.
- Se ha eliminado la persistencia del localizador de transcripciones de las filas de sesiones activas.
  `resolveSessionTranscriptTarget` devuelve `agentId`, `sessionId` y metadatos
  opcionales de tema; doctor es el único código que importa nombres de archivos de transcripciones heredados.
- Los encabezados de transcripciones en tiempo de ejecución comienzan en la versión `1` de SQLite. Las actualizaciones de forma antigua JSONL V1/V2/V3
  viven solo en la importación del doctor y normalizan los encabezados importados a
  la versión actual de la transcripción de SQLite antes de que se almacenen las filas.
- El guardián de base de datos primero ahora prohíbe `SessionManager.listAll` y
  `SessionManager.forkFromSession`; los flujos de trabajo de listado de sesiones y bifurcación/restauración
  deben mantenerse en las APIs de SQLite con ámbito por fila.
- El guardián también prohíbe los nombres de asistentes de análisis/reparación de rama activa de transcripciones JSONL heredadas fuera del código de doctor/importación, por lo que el tiempo de ejecución no puede generar una segunda ruta de migración de transcripciones heredada.
- Las ejecuciones de PI integradas rechazan los manejadores de transcripción entrantes. Utilizan la identidad
  `{agentId, sessionId}` de SQLite antes del lanzamiento del trabajador y nuevamente antes de que
  el intento toque el estado de la transcripción. Una entrada `/tmp/*.jsonl` obsoleta no puede seleccionar un
  objetivo de escritura en tiempo de ejecución.
- Los registros de seguimiento de caché, carga útil de Anthropic, flujo raw y cronología de diagnósticos
  ahora se escriben en filas `diagnostic_events` de SQLite tipadas. Los paquetes de estabilidad del gateway
  ahora se escriben en filas `diagnostic_stability_bundles` de SQLite tipadas. Los antiguos
  `diagnostics.cacheTrace.filePath`, `OPENCLAW_CACHE_TRACE_FILE`,
  `OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE` y
  `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` de anulación JSONL se han eliminado, y
  la captura normal de estabilidad ya no escribe archivos `logs/stability/*.json`.
- La persistencia de Cron ahora reconcilia filas `cron_jobs` de SQLite en lugar de
  eliminar/volver a insertar toda la tabla de trabajos en cada guardado. Las escrituras de destino
  de los complementos actualizan directamente las filas de cron coincidentes y mantienen el estado de cron
  en tiempo de ejecución en la misma transacción de la base de datos de estado.
- Los llamadores en tiempo de ejecución de Cron ahora usan una clave de almacenamiento cron de SQLite estable. Las rutas
  `cron.store` heredadas son solo entradas de importación del doctor; las rutas de escritura de destino del gateway de producción, mantenimiento
  de tareas, estado, registro de ejecución y Telegram usan
  `resolveCronStoreKey` y ya no normalizan la ruta de la clave. El estado de Cron ahora
  informa `storeKey` en lugar del campo `storePath` con forma de archivo antiguo.
- La carga y programación en tiempo de ejecución de Cron ya no normalizan formas de trabajos persistidos heredadas
  tales como `jobId`, `schedule.cron`, `atMs` numéricos, booleanos de cadena, o
  `sessionTarget` faltantes. La importación heredada del doctor se encarga de esas reparaciones antes de que las filas
  se inserten en SQLite.
- El inicio (spawn) de ACP ya no resuelve ni persiste rutas de archivos JSONL de transcripciones. La configuración
  de inicio y vinculación de hilos (thread-bind) persiste directamente la fila de sesión de SQLite y mantiene
  el id de sesión como la identidad de transcripción retenida.
- Las APIs de metadatos de sesión de ACP ahora leen/listan/actualizan filas de SQLite por `agentId` y
  ya no exponen `storePath` como parte del contrato de entrada de sesión de ACP.
- La contabilidad de uso de sesión y la agregación de uso del gateway ahora resuelven las transcripciones
  solo por `{agentId, sessionId}`. La caché de costo/uso y los resúmenes
  de sesión descubiertos ya no sintetizan ni devuelven cadenas de localizador de transcripciones.
- El anexo de chat del gateway, la persistencia de aborto parcial, `/sessions.send` y las escrituras de transcripciones de medios del webchat se anexan directamente a través del ámbito de transcripción de SQLite. El asistente de inyección de transcripciones del gateway ya no acepta un parámetro `transcriptLocator`.
- El descubrimiento de transcripciones de SQLite ahora solo enumera los ámbitos y estadísticas de las transcripciones: `{agentId, sessionId, updatedAt, eventCount}`. El asistente de compatibilidad muerto `listSqliteSessionTranscriptLocators` y el campo `locator` por fila han desaparecido.
- El tiempo de ejecución de reparación de transcripciones ahora expone solo `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`. El antiguo asistente de reparación basado en localizadores se ha eliminado; el código de doctor/depuración lee rutas de archivos fuente explícitas y nunca migra cadenas de localizadores.
- El tiempo de ejecución del libro mayor de repetición de ACP ahora almacena filas de repetición por sesión en la base de datos de estado compartido de SQLite en lugar de `acp/event-ledger.json`; el doctor importa y elimina el archivo heredado.
- Los asistentes de lector de transcripciones del gateway ahora residen en `src/gateway/session-transcript-readers.ts` en lugar del antiguo nombre de módulo `session-utils.fs`. La verificación de historial de reintentos de reserva se nombra según el contenido de la transcripción de SQLite en lugar de la superficie del asistente de archivos antiguo.
- Los asistentes de chat inyectado y compactación del gateway ahora pasan el ámbito de transcripción de SQLite a través de las API de asistentes internas en lugar de nombrar valores como rutas de transcripción o archivos fuente.
- La detección de continuación de arranque ahora verifica las filas de transcripción de SQLite a través de `hasCompletedBootstrapTranscriptTurn`; ya no expone un nombre de asistente con forma de archivo.
- Las pruebas del ejecutor incrustado ahora usan la identidad de transcripción de SQLite, y abrir un nuevo administrador de transcripciones siempre requiere un `sessionId` explícito.
- Los asistentes de indexación de memoria ahora usan terminología de transcripción de SQLite de extremo a extremo: el host exporta `listSessionTranscriptScopesForAgent` y `sessionTranscriptKeyForScope`, las colas de sincronización dirigidas `sessionTranscripts`, los resultados de búsqueda de sesiones públicas exponen rutas opacas `transcript:<agent>:<session>`, y la clave de fuente de base de datos interna es `session:<session>` bajo `source_kind='sessions'` en lugar de una ruta de archivo falsa.
- El asistente de deduplicación persistente del SDK de complementos genérico ya no expone opciones con forma de archivo. Las personas que llaman proporcionan claves de ámbito de SQLite y las filas de deduplicación duraderas residen en el estado compartido del complemento.
- El SSO de Microsoft Teams y los tokens OAuth delegados se movieron de archivos JSON bloqueados al estado del complemento SQLite. Doctor importa `msteams-sso-tokens.json` y `msteams-delegated.json`, reconstruye las claves canónicas de tokens SSO desde los cargos útiles y elimina los archivos de origen.
- El estado de la caché de sincronización de Matrix se movió de `bot-storage.json` al estado del complemento SQLite. Doctor importa los cargos útiles de sincronización heredados sin procesar o envueltos y elimina el archivo de origen. Los clientes de Matrix activos y de QA de Matrix pasan un directorio raíz del almacén de sincronización SQLite, no una ruta `sync-store.json` o `bot-storage.json` falsa.
- El estado de migración de criptografía heredada de Matrix se movió de `legacy-crypto-migration.json` al estado del complemento SQLite. Doctor importa el archivo de estado antiguo; las instantáneas de IndexedDB del SDK de Matrix se movieron de `crypto-idb-snapshot.json` a los blobs del complemento SQLite. Las claves de recuperación de Matrix y las credenciales son filas del estado del complemento SQLite; sus archivos JSON antiguos son solo entradas de migración del doctor.
- Los registros de actividad de Memory Wiki ahora usan el estado del complemento SQLite en lugar de `.openclaw-wiki/log.jsonl`. El proveedor de migración de Memory Wiki importa registros JSONL antiguos; el markdown de la wiki y el contenido de la bóveda del usuario permanecen respaldados por archivos como contenido del espacio de trabajo.
- Memory Wiki ya no crea `.openclaw-wiki/state.json` o el directorio `.openclaw-wiki/locks` no utilizado. El proveedor de migración elimina esos archivos de metadatos del complemento retirados si una bóveda antigua aún los tiene.
- Las entradas de auditoría de Crestodian ahora usan el estado principal del complemento SQLite en lugar de `audit/crestodian.jsonl`. Doctor importa el registro de auditoría JSONL heredado y lo elimina después de una importación exitosa.
- Las entradas de auditoría de escritura/observación de configuración ahora usan el estado principal del complemento SQLite en lugar de `logs/config-audit.jsonl`. Doctor importa el registro de auditoría JSONL heredado y lo elimina después de una importación exitosa.
- El complemento de macOS ya no escribe sidecars `logs/config-audit.jsonl` o `logs/config-health.json` locales de la aplicación mientras edita `openclaw.json`. El archivo de configuración permanece respaldado por archivos, las instantáneas de recuperación se quedan junto al archivo de configuración y el estado duradero de auditoría/salud de la configuración pertenece al almacén SQLite de Gateway.
- Los rescues pendientes de aprobación de Crestodian ahora usan el estado del complemento SQLite central en lugar de `crestodian/rescue-pending/*.json`. Doctor importa los archivos de aprobación pendiente heredados y los elimina después de una importación exitosa.
- El estado de armado temporal de Phone Control ahora usa el estado del complemento SQLite en lugar de `plugins/phone-control/armed.json`. Doctor importa el archivo de estado armado heredado al espacio de nombres `phone-control/arm-state` y elimina el archivo.
- Doctor ya no repara las transcripciones JSONL in situ ni crea archivos JSONL de respaldo. Importa la rama activa a SQLite y elimina la fuente heredada.
- La búsqueda de transcripciones del enlace de memoria de sesión usa lecturas SQLite solo de alcance `{agentId, sessionId}`. Su ayudante ya no acepta ni deriva localizadores de transcripción, lecturas de archivos heredadas u opciones de reescritura de archivos.
- Los enlaces de conversación del servidor de aplicaciones de Codex ahora clave el estado del complemento SQLite por la clave de sesión de OpenClaw o un alcance `{agentId, sessionId}` explícito. No deben preservar enlaces de reserva de ruta de transcripción.
- Las lecturas de historial reflejado del servidor de aplicaciones de Codex usan solo el alcance de transcripción SQLite; no deben recuperar la identidad de las rutas de archivos de transcripción.
- Las rutas de restablecimiento de orden de roles y compactación ya no desenlazan los archivos de transcripción antiguos; el restablecimiento solo rota la fila de sesión SQLite y la identidad de la transcripción.
- Las respuestas de restablecimiento y punto de control de la Gateway devuelven filas de sesión limpias más ids de sesión. Ya no sintetizan localizadores de transcripción SQLite para los clientes.
- El soñar del núcleo de memoria ya no poda las filas de sesión sondeando archivos JSONL faltantes. La limpieza de subagentes pasa a través de la API de tiempo de ejecución de sesión en lugar de comprobaciones de existencia del sistema de archivos. Sus pruebas de ingesta de transcripciones siembran filas SQLite directamente en lugar de crear accesorios `agents/<id>/sessions` o marcadores de posición de localizador.
- La indexación de transcripciones de memoria puede exponer `transcript:<agentId>:<sessionId>` como una ruta de búsqueda virtual para auxiliares de cita/lectura. La fuente de índice duradera es relacional (`source_kind='sessions'`, `source_key='session:<sessionId>'`, `session_id=<sessionId>`), por lo que el valor no es un localizador de transcripción en tiempo de ejecución, no es una ruta del sistema de archivos y nunca debe pasarse de vuelta a las APIs de tiempo de ejecución de sesión.
- El estado de memoria del doctor de Gateway lee los recuentos de recuerdo a corto plazo y señales de fase desde las filas de estado del complemento de SQLite en lugar de `memory/.dreams/*.json`; la salida de la CLI y del doctor ahora etiqueta ese almacenamiento como un almacén SQLite, no como una ruta.
- El tiempo de ejecución del núcleo de memoria, el estado de la CLI, los métodos del doctor de Gateway y las fachadas del SDK del complemento ya no auditan ni archivan archivos `.dreams/session-corpus` heredados. Esos archivos son solo entradas de migración; el doctor los importa a SQLite y elimina la fuente después de la verificación. Las filas activas de evidencia de ingesta de sesión ahora usan la ruta virtual de SQLite `memory/session-ingestion/<day>.txt`; el tiempo de ejecución nunca escribe ni deriva el estado de `.dreams/session-corpus`.
- Los artefactos públicos del núcleo de memoria exponen los eventos del host SQLite como el artefacto JSON virtual `memory/events/memory-host-events.json`; ya no reutilizan la ruta de origen `.dreams/events.jsonl` heredada.
- Los registros del contenedor/navegador de Sandbox ahora usan la tabla SQLite compartida `sandbox_registry_entries` con columnas de sesión, imagen, marca de tiempo, backend/config y puerto de navegador escritas. El doctor importa los archivos de registro JSON monolíticos y fragmentados heredados y elimina las fuentes exitosas. Las lecturas del tiempo de ejecución usan las columnas de la fila escrita como fuente de verdad; `entry_json` es solo una copia de reproducción/depuración.
- Los compromisos ahora usan una tabla compartida escrita `commitments` en lugar de un blob JSON de toda la tienda. Las guardadas de instantáneas realizan upserts por id de compromiso y eliminan solo las filas faltantes en lugar de borrar y reinsertar la tabla. El tiempo de ejecución carga los compromisos desde las columnas escritas de alcance, ventana de entrega, estado, intento y texto; `record_json` es solo una copia de reproducción/depuración. El doctor importa el `commitments.json` heredado y lo elimina después de una importación exitosa.
- Las definiciones de trabajos de Cron, el estado de la programación y el historial de ejecuciones ya no tienen escritores o lectores JSON en tiempo de ejecución. El tiempo de ejecución utiliza filas `cron_jobs` con columnas con tipo de programación, carga útil (payload), entrega, alerta de fallo, sesión, estado y estado de ejecución, además de metadatos `cron_run_logs` con tipo para estado, resumen de diagnósticos, estado/error de entrega, sesión/ejecución, modelo y totales de tokens. `job_json` es solo una copia de reproducción/depuración; `state_json` mantiene diagnósticos de tiempo de ejecución anidados que aún no tienen campos de consulta en caliente, mientras que el tiempo de ejecución rehidrata los campos de estado en caliente desde las columnas con tipo. Doctor importa archivos `jobs.json`, `jobs-state.json` y `runs/*.jsonl` heredados y elimina las fuentes importadas. Las escrituras de destino de los complementos actualizan las filas `cron_jobs` coincidentes en lugar de cargar y reemplazar todo el almacén de cron.
- El inicio de Doctor y Gateway traduce el respaldo (fallback) de webhook `notify: true` heredado en una entrega SQLite explícita antes de que se ejecute el programador. Los trabajos que ya anuncian a un chat mantienen esa entrega y reciben un `completionDestination` de webhook; los trabajos sin `cron.webhook` se reportan para su reparación manual.
- Las colas de entrega saliente y de sesión ahora almacenan el estado de la cola, el tipo de entrada, la clave de sesión, el canal, el destino, el id de cuenta, el conteo de reintentos, el último intento/error, el estado de recuperación y los marcadores de envío de plataforma como columnas con tipo en la tabla compartida `delivery_queue_entries`. La recuperación en tiempo de ejecución lee esos campos en caliente desde las columnas con tipo, y las mutaciones de reintento/recuperación actualizan esas columnas directamente sin reescribir el JSON de reproducción. La carga útil JSON completa permanece solo como el blob de reproducción/depuración para los cuerpos de los mensajes y otros datos de reproducción en frío.
- Los registros de imágenes salientes administradas ahora usan filas `managed_outgoing_image_records` compartidas con tipo, con los bytes de los medios aún almacenados en `media_blobs`. El registro JSON permanece solo como una copia de reproducción/depuración.
- Las preferencias del selector de modelo de Discord, los hashes de despliegue de comandos y los enlaces de hilos ahora usan el estado compartido del complemento SQLite. Sus planes de importación JSON heredados residen en la superficie de configuración/migración del doctor del complemento Discord, no en el código de migración central.
- Los detectores de importación heredados del complemento usan módulos con nombres de doctor como `doctor-legacy-state.ts` o `doctor-state-imports.ts`; los módulos de tiempo de ejecución del canal normal no deben importar detectores JSON heredados.
- Los cursores de puesta al día de BlueBubbles y los marcadores de deduplicación de entrada ahora usan el estado compartido del complemento SQLite. Sus planes de importación JSON heredados residen en la superficie de configuración/migración del doctor del complemento BlueBubbles, no en el código de migración central.
- Los desplazamientos de actualización de Telegram, las filas de caché de pegatinas, las filas de caché de mensajes enviados, las filas de caché de nombres de temas y los enlaces de hilos ahora usan el estado compartido del complemento SQLite. Sus planes de importación JSON heredados residen en la superficie de configuración/migración del doctor del complemento Telegram, no en el código de migración central.
- Los cursores de puesta al día de iMessage, las asignaciones de ID corto de respuesta y las filas de deduplicación de eco enviado ahora usan el estado compartido del complemento SQLite. Los antiguos archivos `imessage/catchup/*.json`, `imessage/reply-cache.jsonl` y `imessage/sent-echoes.jsonl` son solo entradas del doctor.
- Las filas de deduplicación de mensajes de Feishu ahora usan el estado compartido del complemento SQLite en lugar de archivos `feishu/dedup/*.json`. Su plan de importación JSON heredado reside en la superficie de configuración/migración del doctor del complemento Feishu, no en el código de migración central.
- Las conversaciones, encuestas, búferes de carga pendiente y aprendizajes de comentarios de Microsoft Teams ahora usan tablas de estado/BLOB del complemento SQLite compartidas. La ruta de carga pendiente usa `plugin_blob_entries`, por lo que los búferes multimedia se almacenan como BLOBs de SQLite en lugar de JSON en base64. Los nombres de los asistentes de tiempo de ejecución ahora usan nomenclatura de estado/SQLite en lugar de nomenclatura de almacén de archivos `*-fs`, y el antiguo shim `storePath` ha desaparecido de estos almacenes. Su plan de importación JSON heredado reside en la superficie de configuración/migración del doctor del complemento Microsoft Teams.
- Los medios de salida alojados de Zalo ahora usan el `plugin_blob_entries` SQLite compartido en lugar de sidecars temporales JSON/bin `openclaw-zalo-outbound-media`.
- El HTML y los metadatos del visor de diferencias ahora usan el `plugin_blob_entries` SQLite compartido en lugar de archivos temporales `meta.json`/`viewer.html`. Las salidas renderizadas PNG/PDF permanecen como materializaciones temporales porque la entrega del canal todavía necesita una ruta de archivo.
- Los documentos administrados por Canvas ahora usan SQLite compartido `plugin_blob_entries` en lugar de un directorio `state/canvas/documents` predeterminado. El host de Canvas sirve esos blobs directamente; los archivos locales se crean solo para contenido `host.root` explícito del operador o materialización temporal cuando un lector de medios posterior requiere una ruta.
- Las decisiones de auditoría de transferencia de archivos ahora usan SQLite compartido `plugin_state_entries` en lugar del registro de ejecución `audit/file-transfer.jsonl` no limitado. Doctor importa el archivo de auditoría JSONL heredado al estado del complemento y elimina la fuente después de una importación limpia.
- Los contratos de proceso de ACPX y la identidad de instancia de puerta de enlace ahora usan el estado del complemento SQLite compartido. Doctor importa el archivo `gateway-instance-id` heredado al estado del complemento y elimina la fuente.
- Los scripts de contenedor generados por ACPX y el inicio aislado de Codex son materializaciones temporales bajo la raíz temporal de OpenClaw, no estado duradero de OpenClaw. Los registros de ejecución duraderos de ACPX son las filas de concesión (lease) e instancia de puerta de enlace de SQLite; la superficie de configuración `stateDir` de ACPX anterior se elimina porque ya no se escribe ningún estado de ejecución allí.
- Los archivos adjuntos de medios de puerta de enlace ahora usan la tabla SQLite `media_blobs` compartida como el almacén de bytes canónico. Las rutas locales devueltas a las superficies de compatibilidad de canal y espacio aislado (sandbox) son materializaciones temporales de la fila de la base de datos, no el almacén de medios duradero. Las listas permitidas (allowlists) de medios de ejecución ya no incluyen raíces `$OPENCLAW_STATE_DIR/media` heredadas o de directorio de configuración `media`; esos directorios son solo fuentes de importación del doctor.
- El completado de Shell ya no escribe archivos de caché `$OPENCLAW_STATE_DIR/completions/*`. Las rutas de instalación, doctor, actualización y pruebas de humo (smoke tests) de lanzamiento usan resultados de completado generados o abastecimiento de perfil (profile sourcing) en lugar de archivos de caché de completado duraderos.
- La área de preparación (staging) de carga de habilidades (skill-upload) de la puerta de enlace ahora usa filas `skill_uploads` compartidas. Los metadatos de carga, las claves de idempotencia y los bytes del archivo residen en SQLite; el instalador solo recibe una ruta de archivo materializada temporal mientras se está ejecutando una instalación.
- Los datos adjuntos en línea de los subagentes ya no se materializan en el espacio de trabajo `.openclaw/attachments/*`. La ruta de generación prepara entradas semilla VFS de SQLite, las ejecuciones en línea siembran esas entradas en el espacio de nombres de datos temporales de ejecución por agente, y las herramientas respaldadas en disco superponen esos datos temporales de SQLite para las rutas de archivos adjuntos. Las antiguas columnas del registro de directorios de archivos adjuntos de ejecución de subagentes y los ganchos de limpieza han desaparecido.
- La hidratación de imágenes de la CLI ya no mantiene archivos de caché `openclaw-cli-images` estables. Los backends externos de la CLI aún reciben rutas de archivos, pero esas rutas son materializaciones temporales por ejecución con limpieza.
- Los diagnósticos de seguimiento de caché, los diagnósticos de carga útil de Anthropic, los diagnósticos de flujo de modelo sin procesar, los eventos de la línea de tiempo de diagnósticos y los paquetes de estabilidad de Gateway ahora escriben filas de SQLite en lugar de archivos `logs/*.jsonl` o `logs/stability/*.json`. Las marcas y variables de entorno de anulación de ruta de ejecución se han eliminado; los comandos de exportación/depuración pueden materializar archivos explícitamente desde las filas de la base de datos.
- El complemento de macOS ya no tiene un escritor `diagnostics.jsonl` rotativo. Los registros de la aplicación van al registro unificado y los diagnósticos duraderos de Gateway permanecen respaldados por SQLite.
- La lista de registros del guardián de puertos de macOS ahora usa filas compartidas y tipadas de SQLite `macos_port_guardian_records` en lugar de un archivo JSON de soporte de aplicaciones o un blob singleton opaco.
- Los bloqueos singleton de Gateway ahora usan filas compartidas y tipadas de SQLite `state_leases` bajo el ámbito `gateway_locks` en lugar de archivos de bloqueo de directorio temporal. Los documentos de solución de problemas de Fly y OAuth ahora apuntan al bloqueo de renovación de autorización/autenticación de SQLite en lugar de la limpieza de bloqueos de archivos obsoletos.
- El estado de centinela de reinicio de Gateway ahora usa filas compartidas y tipadas de SQLite `gateway_restart_sentinel` en lugar de `restart-sentinel.json`; el tiempo de ejecución lee el tipo, estado, enrutamiento, mensaje, continuación y estadísticas del centinela desde columnas tipadas. `payload_json` es solo una copia de reproducción/depuración. El código de tiempo de ejecución borra la fila de SQLite directamente y ya no lleva la tubería de limpieza de archivos.
- La intención de reinicio de Gateway y el estado de traspaso del supervisor ahora usan filas compartidas y tipadas de SQLite `gateway_restart_intent` y `gateway_restart_handoff` en lugar de sidecars `gateway-restart-intent.json` y `gateway-supervisor-restart-handoff.json`.
- La coordinación del singleton de Gateway ahora usa filas tipadas `state_leases` bajo `gateway_locks` en lugar de escribir archivos `gateway.<hash>.lock`. La fila de lease posee el propietario del bloqueo, la caducidad, el latido y la carga de depuración; SQLite posee el límite atómico de adquisición/liberación. La opción de directorio de bloqueo de archivo retirada ha desaparecido; las pruebas usan directamente la identidad de la fila SQLite.
- El antiguo helper de reporte de uso de cron no referenciado que escaneaba archivos `cron/runs/*.jsonl` fue eliminado. Los reportes de historial de ejecuciones de cron deben leer las filas tipadas `cron_run_logs` de SQLite.
- La recuperación de reinicio de la sesión principal ahora descubre agentes candidatos a través del registro `agent_databases` de SQLite en lugar de escanear directorios `agents/*/sessions`.
- La recuperación de corrupción de sesión de Gemini ahora elimina solo la fila de sesión de SQLite; ya no necesita un enlace `storePath` heredado ni intenta desvincular una ruta de transcripción JSONL derivada.
- El manejo de sobrescritura de ruta ahora trata los valores de entorno literales `undefined`/`null` como no establecidos, previniendo bases de datos `undefined/state/*.sqlite` accidentales en la raíz del repositorio durante pruebas o transferencias de shell.
- Las huellas digitales de salud de configuración ahora usan filas `config_health_entries` compartidas tipadas de SQLite en lugar de `logs/config-health.json`, manteniendo el archivo de configuración normal como el único documento de configuración sin credenciales. El compañero de macOS mantiene solo el estado de salud local del proceso y no recrea el antiguo sidecar JSON.
- El tiempo de ejecución del perfil de autenticación ya no importa ni escribe archivos JSON de credenciales. El almacén canónico de credenciales es SQLite; `auth-profiles.json`, `auth.json` por agente y `credentials/oauth.json` compartido son entradas de migración de doctor que se eliminan después de la importación.
- Las pruebas de guardado/estado del perfil de autenticación ahora afirman directamente las tablas de autenticación tipadas de SQLite y solo usan nombres de archivo de perfil de autenticación heredados para entradas de migración de doctor.
- `openclaw secrets apply` limpia el archivo de configuración, el archivo de entorno y el almacén de perfil de autenticación de SQLite solamente. Ya no lleva lógica de compatibilidad que edite `auth.json` retirado por agente; doctor se encarga de importar y eliminar ese archivo.
- Hermes secret migration plans and applies imported API-key profiles directly
  into the SQLite auth-profile store. It no longer writes or verifies
  `auth-profiles.json` as an intermediate target.
- User-facing auth docs now describe
  `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>` instead of
  telling users to inspect or copy `auth-profiles.json`; legacy OAuth/auth JSON
  names remain documented only as doctor-import inputs.
- Core state-path helpers no longer expose the retired `credentials/oauth.json`
  file. The legacy filename is local to the doctor auth import path.
- Install, security, onboarding, model-auth, and SecretRef docs now describe
  SQLite auth-profile rows and whole-state backup/migration instead of
  per-agent auth-profile JSON files.
- PI model discovery now passes canonical credentials into in-memory
  `pi-coding-agent` auth storage. It no longer creates, scrubs, or writes
  per-agent `auth.json` during discovery.
- Voice Wake trigger and routing settings now use typed shared SQLite tables
  instead of `settings/voicewake.json`, `settings/voicewake-routing.json`, or
  opaque generic rows; doctor imports the legacy JSON files and removes them after a
  successful migration.
- Update-check state now uses a typed shared `update_check_state` row instead of
  `update-check.json` or an opaque generic blob; doctor imports
  the legacy JSON file and removes it after a successful migration.
- Config health state now uses typed shared `config_health_entries` rows instead
  of `logs/config-health.json` or an opaque generic blob; doctor
  imports the legacy JSON file and removes it after a successful migration.
- Plugin conversation binding approvals now use typed
  `plugin_binding_approvals` rows instead of opaque shared SQLite state or
  `plugin-binding-approvals.json`; the legacy file is a doctor migration input.
- Generic current-conversation bindings now store typed
  `current_conversation_bindings` rows instead of rewriting
  `bindings/current-conversations.json`; doctor imports the legacy JSON file and
  removes it after a successful migration.
- Los libros de contabilidad de sincronización de fuentes importadas de Memory Wiki ahora almacenan una fila de estado del complemento SQLite por clave de bóveda/fuente en lugar de reescribir `.openclaw-wiki/source-sync.json`; el proveedor de migración importa y elimina el libro de contabilidad JSON heredado.
- Los registros de ejecución de importación de ChatGPT de Memory Wiki ahora almacenan una fila de estado del complemento SQLite por id de bóveda/ejecución en lugar de escribir `.openclaw-wiki/import-runs/*.json`. Las instantáneas de reversión siguen siendo archivos explícitos de la bóveda hasta que el archivado de instantáneas de ejecución de importación se mueva al almacenamiento de blobs.
- Los resúmenes compilados de Memory Wiki ahora almacenan filas de blob del complemento SQLite en lugar de escribir `.openclaw-wiki/cache/agent-digest.json` y `.openclaw-wiki/cache/claims.jsonl`. El proveedor de migración importa los archivos de caché antiguos y elimina el directorio de caché cuando queda vacío.
- El seguimiento de instalación de habilidades de ClawHub ahora almacena una fila de estado del complemento SQLite por espacio de trabajo/habilidad en lugar de escribir o leer sidecars `.clawhub/lock.json` y `.clawhub/origin.json` en tiempo de ejecución. El código en tiempo de ejecución utiliza objetos de estado de instalación rastreada en lugar de abstracciones de archivo de bloqueo/origen. Doctor importa los sidecars heredados de los espacios de trabajo de agente configurados y los elimina después de una importación limpia.
- El índice de complementos instalados ahora lee y escribe la fila singleton compartida SQLite tipada `installed_plugin_index` en lugar de `plugins/installs.json`; el archivo JSON heredado es solo una entrada de migración de doctor y se elimina después de la importación.
- El asistente de ruta `plugins/installs.json` heredado ahora reside en el código heredado de doctor. Los módulos de índice de complementos en tiempo de ejecución exponen solo opciones de persistencia respaldadas por SQLite, no una ruta de archivo JSON.
- El centinela de reinicio, la intención de reinicio y el estado de traspaso del supervisor de Gateway ahora usan filas compartidas SQLite tipadas (`gateway_restart_sentinel`, `gateway_restart_intent` y `gateway_restart_handoff`) en lugar de blobs opacos genéricos. El código de reinicio en tiempo de ejecución no tiene un contrato de centinela/intención/traspaso con forma de archivo.
- La caché de sincronización de Matrix, los metadatos de almacenamiento, los enlaces de hilos, los marcadores de deduplicación de entrada, el estado de enfriamiento de verificación de inicio, las instantáneas de cifrado de IndexedDB del SDK, las credenciales y las claves de recuperación ahora usan tablas de estado/blob compartidas del complemento SQLite. Las estructuras de rutas de tiempo de ejecución ya no exponen una ruta de metadatos `storage-meta.json`; ese nombre de archivo es solo una entrada de migración heredada. Su plan de importación JSON heredado vive en la superficie de configuración/migración del doctor del complemento Matrix.
- El inicio de Matrix ya no escanea, informa ni completa el estado de archivo heredado de Matrix. La detección de archivos de Matrix, la creación de instantáneas de cifrado heredadas, el estado de migración de restauración de claves de sala, la importación y la eliminación de fuentes son propiedad del doctor.
- Se eliminaron los barriles de migración de tiempo de ejecución de Matrix. Los ayudantes de detección y mutación de estado/cifrado heredados son importados por el doctor de Matrix directamente en lugar de ser parte de la superficie de la API de tiempo de ejecución.
- Los marcadores de reutilización de instantáneas de migración de Matrix ahora viven en el estado del complemento SQLite en lugar de `matrix/migration-snapshot.json`; el doctor todavía puede reutilizar el mismo archivo de pre-migración verificado sin escribir un archivo de estado adjunto.
- Los cursores del bus de Nostr y el estado de publicación del perfil ahora usan el estado del complemento SQLite compartido. Su plan de importación JSON heredado vive en la superficie de configuración/migración del doctor del complemento Nostr.
- Los interruptores de sesión de Memoria Activa ahora usan el estado del complemento SQLite compartido en lugar de `session-toggles.json`; activar la memoria nuevamente elimina la fila en lugar de reescribir un objeto JSON.
- Las propuestas y los contadores de revisión del Taller de Habilidades ahora usan el estado del complemento SQLite compartido en lugar de almacenes `skill-workshop/<workspace>.json` por espacio de trabajo. Cada propuesta es una fila separada bajo `skill-workshop/proposals`, y el contador de revisión es una fila separada bajo `skill-workshop/reviews`.
- Las ejecuciones del subagente revisor del Taller de Habilidades ahora usan el solucionador de transcripciones de sesión de tiempo de ejecución en lugar de crear rutas de sesión adjuntas `skill-workshop/<sessionId>.json`.
- Los arrendamientos de proceso ACPX ahora usan el estado del complemento SQLite compartido bajo `acpx/process-leases` en lugar de un registro `process-leases.json` de archivo completo. Cada arrendamiento se almacena como su propia fila, preservando la recolección de procesos obsoletos al inicio sin una ruta de reescritura JSON en tiempo de ejecución.
- Los scripts de contenedor ACPX y el directorio de inicio aislado de Codex se generan en la
  raíz temporal de OpenClaw. Se recrean según sea necesario y no son entradas de copia de seguridad
  ni de migración.
- La persistencia del registro de ejecución de subagentes utiliza filas compartidas tipadas `subagent_runs`. La
  ruta antigua `subagents/runs.json` ahora es solo una entrada de migración del doctor, y
  los nombres de los asistentes de tiempo de ejecución ya no describen la capa de estado como respaldada en disco.
  Las pruebas de tiempo de ejecución ya no crean dispositivos `runs.json` inválidos o vacíos para probar
  el comportamiento del registro; siembran/leen filas de SQLite directamente.
- La copia de seguridad prepara el directorio de estado antes de archivar, copia los archivos que no son de base de datos,
  crea instantáneas de las bases de datos `*.sqlite` con `VACUUM INTO`, omite los archivos adjuntos WAL/SHM
  en vivo, registra los metadatos de la instantánea en el manifiesto del archivo y registra
  las ejecuciones de copia de seguridad completadas en SQLite con el manifiesto del archivo. `openclaw backup
create` validates the written archive by default; `--no-verify` es la
  ruta rápida explícita.
- `openclaw backup restore` valida el archivo antes de la extracción, reutiliza el
  manifiesto normalizado del verificador y restaura los activos del manifiesto verificado en sus
  rutas de origen registradas. Requiere `--yes` para escrituras y admite `--dry-run`
  para un plan de restauración.
- Se ha eliminado el antiguo filtro de ruta volátil de copia de seguridad. La copia de seguridad ya no necesita una
  lista de omisión de live-tar para los archivos JSON/JSONL de sesión o cron heredados porque las
  instantáneas de SQLite se preparan antes de la creación del archivo.
- La preparación del espacio de trabajo de configuración simple y incorporación ya no crea
  directorios `agents/<agentId>/sessions/`. Solo crean config/espacio de trabajo (workspace);
  las filas de sesión y de transcripción de SQLite se crean bajo demanda en la
  base de datos por agente.
- La reparación de permisos de seguridad ahora tiene como objetivo las bases de datos SQLite globales y por agente
  más los archivos adjuntos WAL/SHM en lugar de `sessions.json` y los archivos
  JSONL de transcripción.
- Los nombres de tiempo de ejecución del registro de espacio aislado ahora describen directamente los tipos de registro SQLite
  en lugar de llevar terminología de registro JSON heredada a través del almacén activo.
- `openclaw reset --scope config+creds+sessions` elimina las bases de datos
  `openclaw-agent.sqlite` por agente más los archivos adjuntos WAL/SHM, no solo los directorios
  `sessions/` heredados.
- Los asistentes de sesión agregada de la puerta de enlace ahora usan nombres orientados a entradas:
  `loadCombinedSessionEntriesForGateway` devuelve `{ databasePath, entries }`.
  La antigua nomenclatura de almacenamiento combinado se ha eliminado de los llamadores en tiempo de ejecución.
- La inicialización del canal Docker MCP ahora escribe la fila de sesión principal y los eventos de transcripción en la base de datos SQLite por agente en lugar de crear
  `sessions.json` y una transcripción JSONL.
- El gancho de memoria de sesión incluido ahora resuelve el contexto de sesión anterior desde
  SQLite mediante `{agentId, sessionId}`. Ya no escanea, almacena o sintetiza
  rutas de transcripción o directorios `workspace/sessions`.
- El gancho de registrador de comandos incluido ahora escribe filas de auditoría de comandos en la tabla SQLite `command_log_entries` compartida en lugar de añadir
  `logs/commands.log`.
- Las listas de permitidos de emparejamiento de canales ahora exponen solo asistentes de lectura/escritura respaldados por SQLite en tiempo de ejecución y en el SDK del complemento. El antiguo solucionador de rutas `*-allowFrom.json` y el lector de archivos solo existen bajo el código de importación heredado del doctor.
- `migration_runs` registra las ejecuciones de migración de estado heredado con estado, marcas de tiempo e informes JSON.
- `migration_sources` registra cada origen de archivo heredado importado con hash, tamaño, recuento de registros, tabla de destino, ID de ejecución, estado y estado de eliminación del origen.
- `backup_runs` registra las rutas de los archivos de copia de seguridad, el estado y los manifiestos JSON.
- El esquema global no mantiene una tabla de registro `agents` sin usar. El descubrimiento de la base de datos de agentes es el registro `agent_databases` canónico hasta que el tiempo de ejecución tiene un propietario real de registro de agente.
- La configuración generada del catálogo de modelos se almacena en filas SQLite `agent_model_catalogs` globales tipificadas claveadas por directorio de agente. Los llamadores en tiempo de ejecución usan `ensureOpenClawModelCatalog`; no hay API de compatibilidad `models.json` en el código de tiempo de ejecución. La implementación escribe en SQLite y el registro PI incrustado se rellena desde esa carga almacenada sin crear un archivo `models.json`.
- Se eliminaron la exportación de markdown de transcripción de sesión QMD y la configuración `memory.qmd.sessions`. No hay colección de transcripciones QMD, ninguna ruta de tiempo de ejecución `qmd/sessions*` y ningún puente de memoria de sesión respaldado por archivos.
- El tiempo de ejecución de memory-core importa los asistentes de indexación de transcripciones de SQLite desde
  `openclaw/plugin-sdk/memory-core-host-engine-session-transcripts`, no desde la
  subruta del QMD SDK. La subruta QMD mantiene una reexportación de compatibilidad solo para
  llamadores externos hasta que una limpieza importante del SDK pueda eliminarla.
- El propio `index.sqlite` de QMD es ahora una materialización temporal del tiempo de ejecución respaldada por la
  tabla principal `plugin_blob_entries` de SQLite. El tiempo de ejecución ya no crea un
  sidecar `~/.openclaw/agents/<agentId>/qmd` duradero.
- El complemento opcional `memory-lancedb` ya no crea
  `~/.openclaw/memory/lancedb` como un almacén gestionado implícitamente por OpenClaw. Es un
  backend externo de LanceDB y permanece deshabilitado hasta que el operador configura una
  `dbPath` explícita.
- `check:database-first-legacy-stores` falla el nuevo código fuente de tiempo de ejecución que empareja
  nombres de almacenes heredados con APIs de sistemas de archivos de estilo escritura. También falla el código fuente de tiempo de ejecución
  que reintroduce contratos de puente de transcripciones como
  `transcriptLocator`, `sqlite-transcript://...`, `sessionFile` o
  `storePath`, y escanea las pruebas en busca de esos nombres de contratos de puente también. También
  prohíbe `SessionManager.open(...)` y las fachadas estáticas antiguas de SessionManager para que
  el tiempo de ejecución y las pruebas no puedan recrear silenciosamente un abridor de sesión respaldado en archivo o
  descubrimiento de sesión de la era de archivos. También prohíbe el antiguo gancho/clase de descargador de sesión JSONL
  desde la interfaz de usuario de exportación. También prohíbe los nombres auxiliares de SQLite en forma de sidecar para estado de complemento/tarea;
  las pruebas deben afirmar `databasePath` y la ubicación compartida
  `state/openclaw.sqlite` en lugar de fingir que esas características poseen
  archivos SQLite separados. También prohíbe los antiguos nombres genéricos de tablas SQL de índice de memoria
  (`meta`, `files`, `chunks`, `chunks_vec`,
  `chunks_fts`, `embedding_cache`) en el código fuente de tiempo de ejecución para que la base de datos del agente mantenga
  su esquema explícito `memory_index_*`. También prohíbe la incrustación de esquemas TEXT
  y la incrustación de escrituras de matrices JSON para que los vectores se mantengan como BLOBs de SQLite compactos. Migración,
  doctor, importación y código de exportación explícito no de sesión permanecen permitidos. El
  guardia ahora también cubre los almacenes `cache/*.json` de tiempo de ejecución, sidecars genéricos
  `thread-bindings.json`, registros JSON de estado/ejecución de cron, JSON de salud de configuración,
  sidecars de reinicio y bloqueo, configuraciones de activación por voz, aprobaciones de vinculación de complementos,
  índice de complementos instalados JSON, JSONL de auditoría de transferencia de archivos, registros de actividad de Memory Wiki,
  el registro de texto antiguo empaquetado `command-logger`, y perillas de diagnóstico JSONL de flujo raw pi-mono.
  También prohíbe los antiguos nombres de módulos heredados de doctor a nivel raíz para que
  el código de compatibilidad se mantenga bajo `src/commands/doctor/`. Los manejadores de depuración de Android
  también usan salida logcat/en memoria en lugar de almacenar `camera_debug.log` o
  archivos de caché `debug_logs.txt`.

## Forma del esquema objetivo

Mantenga los esquemas explícitos. El estado de tiempo de ejecución propiedad del host utiliza tablas tipadas. El estado opaco propiedad del complemento utiliza `plugin_state_entries` / `plugin_blob_entries`; no hay una tabla genérica `kv` del host.

Base de datos global:

```text
state_leases(scope, lease_key, owner, expires_at, heartbeat_at, payload_json, created_at, updated_at)
exec_approvals_config(config_key, raw_json, socket_path, has_socket_token, default_security, default_ask, default_ask_fallback, auto_allow_skills, agent_count, allowlist_count, updated_at_ms)
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
agent_databases(agent_id, path, schema_version, last_seen_at, size_bytes)
task_runs(...)
task_delivery_state(...)
flow_runs(...)
subagent_runs(run_id, child_session_key, requester_session_key, controller_session_key, created_at, ended_at, cleanup_handled, payload_json)
current_conversation_bindings(binding_key, binding_id, target_agent_id, target_session_id, target_session_key, channel, account_id, conversation_kind, parent_conversation_id, conversation_id, target_kind, status, bound_at, expires_at, metadata_json, updated_at)
plugin_binding_approvals(plugin_root, channel, account_id, plugin_id, plugin_name, approved_at)
tui_last_sessions(scope_key, session_key, updated_at)
plugin_state_entries(plugin_id, namespace, entry_key, value_json, created_at, expires_at)
plugin_blob_entries(plugin_id, namespace, entry_key, metadata_json, blob, created_at, expires_at)
media_blobs(subdir, id, content_type, size_bytes, blob, created_at, updated_at)
skill_uploads(upload_id, kind, slug, force, size_bytes, sha256, actual_sha256, received_bytes, archive_blob, created_at, expires_at, committed, committed_at, idempotency_key_hash)
web_push_subscriptions(endpoint_hash, subscription_id, endpoint, p256dh, auth, created_at_ms, updated_at_ms)
web_push_vapid_keys(key_id, public_key, private_key, subject, updated_at_ms)
apns_registrations(node_id, transport, token, relay_handle, send_grant, installation_id, topic, environment, distribution, token_debug_suffix, updated_at_ms)
node_host_config(config_key, version, node_id, token, display_name, gateway_host, gateway_port, gateway_tls, gateway_tls_fingerprint, updated_at_ms)
device_identities(identity_key, device_id, public_key_pem, private_key_pem, created_at_ms, updated_at_ms)
device_auth_tokens(device_id, role, token, scopes_json, updated_at_ms)
macos_port_guardian_records(pid, port, command, mode, timestamp)
workspace_setup_state(workspace_key, workspace_path, version, bootstrap_seeded_at, setup_completed_at, updated_at)
native_hook_relay_bridges(relay_id, pid, hostname, port, token, expires_at_ms, updated_at_ms)
model_capability_cache(provider_id, model_id, name, input_text, input_image, reasoning, supports_tools, context_window, max_tokens, cost_input, cost_output, cost_cache_read, cost_cache_write, updated_at_ms)
agent_model_catalogs(catalog_key, agent_dir, raw_json, updated_at)
managed_outgoing_image_records(attachment_id, session_key, message_id, created_at, updated_at, retention_class, alt, original_media_id, original_media_subdir, original_content_type, original_width, original_height, original_size_bytes, original_filename, record_json)
gateway_restart_sentinel(sentinel_key, version, kind, status, ts, session_key, thread_id, delivery_channel, delivery_to, delivery_account_id, message, continuation_json, doctor_hint, stats_json, payload_json, updated_at_ms)
channel_pairing_requests(channel_key, account_id, request_id, code, created_at, last_seen_at, meta_json)
channel_pairing_allow_entries(channel_key, account_id, entry, sort_order, updated_at)
voicewake_triggers(config_key, position, trigger, updated_at_ms)
voicewake_routing_config(config_key, version, default_target_mode, default_target_agent_id, default_target_session_key, updated_at_ms)
voicewake_routing_routes(config_key, position, trigger, target_mode, target_agent_id, target_session_key, updated_at_ms)
update_check_state(state_key, last_checked_at, last_notified_version, last_notified_tag, last_available_version, last_available_tag, auto_install_id, auto_first_seen_version, auto_first_seen_tag, auto_first_seen_at, auto_last_attempt_version, auto_last_attempt_at, auto_last_success_version, auto_last_success_at, updated_at_ms)
config_health_entries(config_path, last_known_good_json, last_promoted_good_json, last_observed_suspicious_signature, updated_at_ms)
sandbox_registry_entries(registry_kind, container_name, session_key, backend_id, runtime_label, image, created_at_ms, last_used_at_ms, config_label_kind, config_hash, cdp_port, no_vnc_port, entry_json, updated_at)
cron_run_logs(store_key, job_id, seq, ts, status, error, summary, diagnostics_summary, delivery_status, delivery_error, delivered, session_id, session_key, run_id, run_at_ms, duration_ms, next_run_at_ms, model, provider, total_tokens, entry_json, created_at)
cron_jobs(store_key, job_id, name, description, enabled, delete_after_run, created_at_ms, agent_id, session_key, schedule_kind, schedule_expr, schedule_tz, every_ms, anchor_ms, at, stagger_ms, session_target, wake_mode, payload_kind, payload_message, payload_model, payload_fallbacks_json, payload_thinking, payload_timeout_seconds, payload_allow_unsafe_external_content, payload_external_content_source_json, payload_light_context, payload_tools_allow_json, delivery_mode, delivery_channel, delivery_to, delivery_thread_id, delivery_account_id, delivery_best_effort, failure_delivery_mode, failure_delivery_channel, failure_delivery_to, failure_delivery_account_id, failure_alert_disabled, failure_alert_after, failure_alert_channel, failure_alert_to, failure_alert_cooldown_ms, failure_alert_include_skipped, failure_alert_mode, failure_alert_account_id, next_run_at_ms, running_at_ms, last_run_at_ms, last_run_status, last_error, last_duration_ms, consecutive_errors, consecutive_skipped, schedule_error_count, last_delivery_status, last_delivery_error, last_delivered, last_failure_alert_at_ms, job_json, state_json, runtime_updated_at_ms, schedule_identity, sort_order, updated_at)
delivery_queue_entries(queue_name, id, status, entry_kind, session_key, channel, target, account_id, retry_count, last_attempt_at, last_error, recovery_state, platform_send_started_at, entry_json, enqueued_at, updated_at, failed_at)
commitments(id, agent_id, session_key, channel, account_id, recipient_id, thread_id, sender_id, kind, sensitivity, source, status, reason, suggested_text, dedupe_key, confidence, due_earliest_ms, due_latest_ms, due_timezone, source_message_id, source_run_id, created_at_ms, updated_at_ms, attempts, last_attempt_at_ms, sent_at_ms, dismissed_at_ms, snoozed_until_ms, expired_at_ms, record_json)
migration_runs(id, started_at, finished_at, status, report_json)
migration_sources(source_key, migration_kind, source_path, target_table, source_sha256, source_size_bytes, source_record_count, last_run_id, status, imported_at, removed_source, report_json)
backup_runs(id, created_at, archive_path, status, manifest_json)
```

Base de datos del agente:

```text
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
sessions(session_id, session_key, session_scope, created_at, updated_at, started_at, ended_at, status, chat_type, channel, account_id, primary_conversation_id, model_provider, model, agent_harness_id, parent_session_key, spawned_by, display_name)
conversations(conversation_id, channel, account_id, kind, peer_id, parent_conversation_id, thread_id, native_channel_id, native_direct_user_id, label, metadata_json, created_at, updated_at)
session_conversations(session_id, conversation_id, role, first_seen_at, last_seen_at)
session_routes(session_key, session_id, updated_at)
session_entries(session_id, session_key, entry_json, updated_at)
transcript_events(session_id, seq, event_json, created_at)
transcript_event_identities(session_id, event_id, seq, event_type, has_parent, parent_id, message_idempotency_key, created_at)
transcript_snapshots(session_id, snapshot_id, reason, event_count, created_at, metadata_json)
vfs_entries(namespace, path, kind, content_blob, metadata_json, updated_at)
tool_artifacts(run_id, artifact_id, kind, metadata_json, blob, created_at)
run_artifacts(run_id, path, kind, metadata_json, blob, created_at)
trajectory_runtime_events(session_id, run_id, seq, event_json, created_at)
memory_index_meta(meta_key, schema_version, provider, model, provider_key, sources_json, scope_hash, chunk_tokens, chunk_overlap, vector_dims, fts_tokenizer, config_hash, updated_at)
memory_index_sources(source_kind, source_key, path, session_id, hash, mtime, size)
memory_index_chunks(id, source_kind, source_key, path, session_id, start_line, end_line, hash, model, text, embedding, embedding_dims, updated_at)
memory_embedding_cache(provider, model, provider_key, hash, embedding, dims, updated_at)
cache_entries(scope, key, value_json, blob, expires_at, updated_at)
```

La búsqueda futura puede agregar tablas FTS sin cambiar las tablas de eventos canónicas:

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

Los valores grandes deben usar columnas `blob`, no codificación de cadena JSON. Mantenga `value_json` para pequeños datos estructurados que deban permanecer inspeccionables con herramientas SQLite simples.

`agent_databases` es el registro canónico para esta rama. No agregue una tabla `agents` hasta que exista un propietario real de registros de agentes; la configuración del agente permanece en `openclaw.json`.

## Forma de la migración del Doctor

El Doctor debe llamar a un paso de migración explícito que sea informable y seguro de ejecutar nuevamente:

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` invoca la implementación de migración de estado después del prelanzamiento de configuración ordinario y crea una copia de seguridad verificada antes de la importación. El inicio del tiempo de ejecución y `openclaw migrate` no deben importar archivos de estado OpenClaw heredados.

Propiedades de la migración:

- Un pase de migración descubre todas las fuentes de archivos heredadas y produce un plan antes de mutar cualquier cosa.
- El Doctor crea un archivo de copia de seguridad verificado previo a la migración antes de importar los archivos heredados.
- Las importaciones son idempotentes y clave por ruta de origen, mtime, tamaño, hash y tabla de destino.
- Los archivos de origen exitosos se eliminan o archivan después de que la base de datos de destino se ha confirmado.
- Las importaciones fallidas dejan la fuente intacta y registran una advertencia en `migration_runs`.
- El código de tiempo de ejecución lee SQLite solo después de que existe la migración.
- No se requiere una ruta de degradación/exportación a archivos de tiempo de ejecución.

## Inventario de migración

Mueva estos a la base de datos global:

- Las escrituras de tiempo de ejecución del registro de tareas ahora usan la base de datos compartida; el importador auxiliar `tasks/runs.sqlite` no enviado se elimina. Las guardadas de instantáneas realizan upsert por ID de tarea y eliminan solo las filas de tarea/entrega faltantes.
- Las escrituras de tiempo de ejecución del flujo de tareas ahora usan la base de datos compartida; el importador auxiliar `tasks/flows/registry.sqlite` no enviado se elimina. Las guardadas de instantáneas realizan upsert por ID de flujo y eliminan solo las filas de flujo faltantes.
- Las escrituras en tiempo de ejecución del estado del complemento ahora usan la base de datos compartida; el importador sidecar `plugin-state/state.sqlite` no enviado ha sido eliminado.
- La búsqueda de memoria incorporada ya no tiene como valor predeterminado `memory/<agentId>.sqlite`; sus tablas de índice residen en la base de datos del agente propietario, y la opción explícita sidecar `memorySearch.store.path` ha sido retirada a la migración de configuración del doctor.
- La reindexación de memoria incorporada restablece solo las tablas propiedad de la memoria en la base de datos del agente. No debe reemplazar todo el archivo SQLite, porque la misma base de datos posee sesiones, transcripciones, filas VFS, artefactos y cachés de tiempo de ejecución.
- Registros de contenedor/navegador de espacio aislado desde JSON monolítico y fragmentado. Las escrituras en tiempo de ejecución ahora usan la base de datos compartida; la importación de JSON heredado permanece.
- Las definiciones de trabajos programados, el estado del programa y el historial de ejecuciones ahora usan SQLite compartido; el doctor importa/elimina los archivos heredados `jobs.json`, `jobs-state.json` y `cron/runs/*.jsonl`
- Identidad/autenticación del dispositivo, envío, verificación de actualizaciones, compromisos, caché del modelo OpenRouter, índice de complementos instalados y enlaces del servidor de aplicaciones
- Los registros de emparejamiento de dispositivo/nodo y los registros de inicialización ahora usan tablas SQLite tipadas
- Los suscriptores de notificaciones de emparejamiento de dispositivos y los marcadores de solicitudes entregadas ahora usan la tabla de estado del complemento SQLite compartida en lugar de `device-pair-notify.json`.
- Los registros de llamadas de voz ahora usan la tabla de estado del complemento SQLite compartida bajo el espacio de nombres `voice-call` / `calls` en lugar de `calls.jsonl`; la CLI del complemento sigue y resume el historial de llamadas respaldado por SQLite.
- Las sesiones de la puerta de enlace QQBot, los registros de usuarios conocidos y el caché de citas de índice de referencia ahora usan el estado del complemento SQLite bajo espacios de nombres `qqbot` (`sessions`, `known-users`, `ref-index`) en lugar de `session-*.json`, `known-users.json` y `ref-index.jsonl`; la migración del doctor/configuración de QQBot importa y elimina los archivos heredados.
- Las preferencias del selector de modelos de Discord, los hashes de despliegue de comandos y los enlaces de hilos
  ahora usan el estado del complemento SQLite bajo `discord` espacios de nombres
  (`model-picker-preferences`, `command-deploy-hashes`, `thread-bindings`)
  en lugar de `model-picker-preferences.json`, `command-deploy-cache.json` y
  `thread-bindings.json`; la migración de doctor/configuración de Discord importa y
  elimina los archivos heredados.
- Los cursores de actualización de BlueBubbles y los marcadores de deduplicación de entrada ahora usan el estado del complemento SQLite
  bajo `bluebubbles` espacios de nombres (`catchup-cursors`, `inbound-dedupe`)
  en lugar de `bluebubbles/catchup/*.json` y
  `bluebubbles/inbound-dedupe/*.json`; la migración de doctor/configuración de BlueBubbles
  importa y elimina los archivos heredados.
- Los desplazamientos de actualización de Telegram, las entradas de caché de pegatinas, las entradas de caché de mensajes de cadena de respuesta,
  las entradas de caché de mensajes enviados, las entradas de caché de nombres de temas y los enlaces
  de hilos ahora usan el estado del complemento SQLite bajo `telegram` espacios de nombres
  (`update-offsets`, `sticker-cache`, `message-cache`, `sent-messages`,
  `topic-names`, `thread-bindings`) en lugar de `update-offset-*.json`,
  `sticker-cache.json`, `*.telegram-messages.json`,
  `*.telegram-sent-messages.json`, `*.telegram-topic-names.json` y
  `thread-bindings-*.json`; la migración de doctor/configuración de Telegram importa y
  elimina los archivos heredados.
- Los cursores de actualización de iMessage, las asignaciones de ID corto de respuesta y las filas de deduplicación de eco enviado
  ahora usan el estado del complemento SQLite bajo `imessage` espacios de nombres (`catchup-cursors`,
  `reply-cache`, `sent-echoes`) en lugar de `imessage/catchup/*.json`,
  `imessage/reply-cache.jsonl` y `imessage/sent-echoes.jsonl`; la migración de
  doctor/configuración de iMessage importa y elimina los archivos heredados.
- Las conversaciones, encuestas, tokens delegados, cargas pendientes y
  aprendizajes de comentarios de Microsoft Teams ahora usan espacios de nombres
  de estado/blob del complemento SQLite
  (`conversations`, `polls`, `delegated-tokens`, `pending-uploads`,
  `feedback-learnings`) en lugar de `msteams-conversations.json`,
  `msteams-polls.json`, `msteams-delegated.json`,
  `msteams-pending-uploads.json` y `*.learnings.json`; la migración de
  doctor/setup de Microsoft Teams importa y elimina los archivos heredados.
- La caché de sincronización de Matrix, los metadatos de almacenamiento, los
  enlaces de hilos, los marcadores de deduplicación entrante, el estado de
  enfriamiento de verificación al inicio, las credenciales, las claves de
  recuperación y las instantáneas de cifrado de IndexedDB del SDK ahora usan
  espacios de nombres de estado/blob del complemento SQLite bajo
  `matrix` (`sync-store`, `storage-meta`, `thread-bindings`, `inbound-dedupe`,
  `startup-verification`, `credentials`, `recovery-key`, `idb-snapshots`)
  en lugar de `bot-storage.json`, `storage-meta.json`, `thread-bindings.json`,
  `inbound-dedupe.json`, `startup-verification.json`, `credentials.json`,
  `recovery-key.json` y `crypto-idb-snapshot.json`; la migración de
  doctor/setup de Matrix importa y elimina esos archivos heredados de las raíces
  de almacenamiento de Matrix con alcance de cuenta.
- Los cursores del bus de Nostr y el estado de publicación del perfil ahora usan
  el estado del complemento SQLite bajo los espacios de nombres
  `nostr` (`bus-state`, `profile-state`) en lugar de
  `bus-state-*.json` y `profile-state-*.json`; la migración de
  doctor/setup de Nostr importa y elimina los archivos heredados.
- Los interruptores de sesión de Active Memory ahora usan el estado del
  complemento SQLite bajo `active-memory/session-toggles` en lugar de `session-toggles.json`.
- Las colas de propuestas de Skill Workshop y los contadores de revisiones ahora usan el estado del complemento de SQLite bajo `skill-workshop/proposals` y `skill-workshop/reviews` en lugar de archivos `skill-workshop/<workspace>.json` por espacio de trabajo.
- Las colas de entrega saliente y de sesión ahora comparten la tabla global SQLite `delivery_queue_entries` bajo nombres de cola separados (`outbound-delivery`, `session-delivery`) en lugar de archivos duraderos `delivery-queue/*.json`, `delivery-queue/failed/*.json` y `session-delivery-queue/*.json`. El paso legacy-state del doctor importa filas pendientes y fallidas, elimina marcadores de entrega obsoletos y borra los archivos JSON antiguos después de la importación. Los campos de enrutamiento en caliente y reintento son columnas tipadas; la carga útil JSON se conserva solo para reproducción/depuración.
- Los contratos de proceso de ACPX ahora usan el estado del complemento de SQLite bajo `acpx/process-leases` en lugar de `process-leases.json`.
- Metadatos de ejecución de copia de seguridad y migración

Mover estos a las bases de datos de los agentes:

- Raíces de sesión del agente y cargas útiles de entrada de sesión con forma de compatibilidad. Hecho para escrituras en tiempo de ejecución: los metadatos de sesión en caliente son consultables en `sessions`, mientras que la carga útil completa con forma heredada `SessionEntry` permanece en `session_entries`.
- Eventos de transcripción del agente. Hecho para escrituras en tiempo de ejecución.
- Puntos de control de compactación e instantáneas de transcripción. Hecho para escrituras en tiempo de ejecución: las copias de transcripción del punto de control son filas de transcripción SQLite y los metadatos del punto de control se registran en `transcript_snapshots`. Los auxiliares de punto de control de la puerta de enlace ahora nombran estos valores como instantáneas de transcripción en lugar de archivos de origen.
- Espacios de nombres de espacio de trabajo/scratch del VFS del agente. Hecho para escrituras del VFS en tiempo de ejecución.
- Cargas útiles de archivos adjuntos de subagentes. Hecho para escrituras en tiempo de ejecución: son entradas de semilla del VFS SQLite y nunca archivos de espacio de trabajo duraderos.
- Artefactos de herramientas. Hecho para escrituras en tiempo de ejecución.
- Artefactos de ejecución. Hecho para escrituras en tiempo de ejecución del trabajador a través de la tabla `run_artifacts` por agente.
- Cachés de tiempo de ejecución locales del agente. Hecho para escrituras de caché con ámbito de tiempo de ejecución del trabajador a través de la tabla `cache_entries` por agente. Las cachés de modelos de toda la puerta de enlace permanecen en la base de datos global a menos que se vuelvan específicas del agente.
- Registros de flujo principal de ACP. Hecho para escrituras en tiempo de ejecución.
- Sesiones de retransmisión del libro mayor de ACP. Realizado para escrituras en tiempo de ejecución mediante `acp_replay_sessions` y `acp_replay_events`; `acp/event-ledger.json` heredado permanece solo como entrada de doctor.
- Metadatos de sesión de ACP. Realizado para escrituras en tiempo de ejecución mediante `acp_sessions`; bloques `entry.acp` heredados en `sessions.json` son solo entrada de migración de doctor.
- Sidecars de trayectoria cuando no son archivos de exportación explícitos. Realizado para escrituras en tiempo de ejecución: la captura de trayectoria escribe filas `trajectory_runtime_events` de la base de datos del agente y refleja artefactos con alcance de ejecución en SQLite. Los sidecars heredados son solo entradas de importación de doctor; la exportación puede materializar salidas fresh de paquetes de soporte JSONL pero no lee ni migra sidecars de trayectoria/transcripción antiguos en tiempo de ejecución. La captura de trayectoria en tiempo de ejecución expone el alcance de SQLite; los auxiliares de ruta JSONL están aislados para soporte de exportación/depuración y no se reexportan desde el módulo de tiempo de ejecución. Los registros de metadatos de trayectoria del ejecutor integrado registran la identidad `{agentId, sessionId, sessionKey}` en lugar de persistir un localizador de transcripción.

Mantener estos respaldados en archivos por ahora:

- `openclaw.json`
- archivos de credenciales de proveedor o CLI
- manifiestos de complemento/paquete
- espacios de trabajo de usuario y repositorios Git cuando se selecciona el modo disco
- registros destinados al seguimiento por el operador, a menos que se mueva una superficie de registro específica

## Plan de Migración

### Fase 0: Congelar el Límite

Hacer explícito el límite de estado duradero antes de mover más filas:

- Agregar una tabla `migration_runs` a la base de datos global.
  Realizado para informes de ejecución de migración de estado heredado.
- Agregar un único servicio de migración de estado propiedad de doctor para la importación de archivo a base de datos.
  Realizado: `openclaw doctor --fix` utiliza la implementación de migración de estado heredado.
- Hacer que `plan` sea de solo lectura y hacer que `apply` cree una copia de seguridad, importe, verifique y luego elimine o ponga en cuarentena los archivos antiguos.
  Realizado: doctor crea una copia de seguridad verificada previa a la migración, pasa la ruta de la copia de seguridad a `migration_runs` y reutiliza las rutas de importación/eliminación.
- Añadir prohibiciones estáticas para que el nuevo código en tiempo de ejecución no pueda escribir archivos de estado heredados mientras
  el código de migración y las pruebas aún puedan poblar/leerlos.
  Hecho para las tiendas heredadas migradas actualmente; el guardia también escanea pruebas anidadas
  en busca de contratos de localizador de transcripciones en tiempo de ejecución prohibidos.

### Fase 1: Finalizar el plano de control global

Mantener el estado de coordinación compartido en `state/openclaw.sqlite`:

- Agentes y registro de la base de datos de agentes
- Libros mayores de tareas y flujos de tareas
- Estado del complemento
- Registro de contenedores/navegadores de sandbox
- Historial de ejecuciones de Cron/programador
- Emparejamiento, dispositivo, push, verificación de actualizaciones, TUI, cachés de modelos de OpenRouter y otro
  estado de tiempo de ejecución pequeño con alcance de puerta de enlace
- Metadatos de copia de seguridad y migración
- Bytes de archivos adjuntos de medios de la puerta de enlace. Hecho para escrituras en tiempo de ejecución; las rutas de archivo directas
  son materializaciones temporales para compatibilidad con los remitentes de canales y la
  zona de preparación del sandbox. Las listas permitidas en tiempo de ejecución aceptan rutas de materialización de SQLite, no raíces de medios de estado/configuración heredadas.
  Doctor importa archivos de medios heredados a
  `media_blobs` y elimina los archivos de origen después de escribir filas exitosas.
- Sesiones de captura, eventos y blobs de carga útil del proxy de depuración. Hecho: las capturas se realizan en vivo
  en la base de datos de estado compartido y se abren a través de la configuración de arranque, esquema,
  WAL y tiempo de espera ocupado de la base de datos de estado compartido. No hay ninguna base de datos sidecar en tiempo de ejecución de proxy de depuración,
  directorio de blobs, o destino de esquema/generación de código generado solo para captura de proxy.

Esta fase también elimina los abridores sidecar duplicados, asistentes de permisos, configuración
de WAL, poda del sistema de archivos y escritores de compatibilidad de esos subsistemas.

### Fase 2: Introducir bases de datos por agente

Crear una base de datos por agente y registrarla desde la base de datos global:

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

La fila global `agent_databases` almacena la ruta, la versión del esquema, la marca de tiempo vista por última vez
y metadatos básicos de tamaño/integridad. El código en tiempo de ejecución solicita al registro
la base de datos del agente en lugar de derivar las rutas de archivo directamente.

La base de datos del agente posee:

- `sessions` como la raíz de sesión canónica, con `session_entries` como la
  tabla de carga útil con forma de compatibilidad adjunta a esa raíz, y
  `session_routes` como la búsqueda `session_key` activa única
- `conversations` y `session_conversations` como la identidad de enrutamiento del proveedor normalizado
  adjunta a las sesiones
- `transcript_events`
- instantáneas de transcripciones y puntos de control de compactación. Hecho para escrituras en tiempo de ejecución.
- `vfs_entries`
- `tool_artifacts` y artefactos de ejecución
- filas de tiempo de ejecución/caché locales del agente. Hecho para cachés con alcance de trabajador.
- eventos de flujo principal de ACP
- eventos de tiempo de ejecución de trayectoria cuando no son artefactos de exportación explícitos

### Fase 3: Reemplazar las API del almacén de sesiones

Hecho para tiempo de ejecución. La superficie del almacén de sesiones con forma de archivo no es un contrato de tiempo de ejecución activo:

- El tiempo de ejecución ya no llama a `loadSessionStore(storePath)` ni trata a `storePath` como identidad de sesión.
- Las operaciones de filas del tiempo de ejecución son `getSessionEntry`, `upsertSessionEntry`, `patchSessionEntry`, `deleteSessionEntry` y `listSessionEntries`.
- Los ayudantes de reescritura de todo el almacén, escritores de archivos, pruebas de cola, poda de alias y parámetros de eliminación de claves heredados han desaparecido del tiempo de ejecución.
- Las exportaciones de compatibilidad del paquete raíz en desuso todavía adaptan las rutas canónicas de `sessions.json` a las API de filas de SQLite.
- El análisis de `sessions.json` permanece solo en el código de migración/importación de doctor y en las pruebas de doctor.
- Las lecturas de reserva del ciclo de vida del tiempo de ejecución leen encabezados de transcripciones de SQLite, no las primeras líneas de JSONL.

Sigue eliminando cualquier cosa que reintroduzca parámetros de bloqueo de archivos, vocabulario de poda/truncamiento como mantenimiento de archivos, identidad de ruta de almacén o pruebas cuya única aserción sea la persistencia de JSON.

### Fase 4: Mover transcripciones, flujos de ACP, trayectorias y VFS

Haz que cada flujo de datos de agente sea nativo de la base de datos:

- Las escrituras de anexión de transcripciones pasan por una transacción SQLite que asegura el encabezado de la sesión, verifica la idempotencia del mensaje, selecciona la cola principal, inserta en `transcript_events` y registra metadatos de identidad consultables en `transcript_event_identities`. Hecho para anexiones directas de mensajes de transcripción y anexiones normales persistidas de `TranscriptSessionManager`; las operaciones de bifurcación explícitas mantienen su elección principal explícita y todavía escriben filas de SQLite sin derivar ningún localizador de archivos.
- Los registros de flujo principal de ACP se convierten en filas, no en archivos `.acp-stream.jsonl`. Hecho.
- La configuración de generación de ACP ya no persiste las rutas de JSONL de transcripciones. Hecho.
- La captura de la trayectoria de tiempo de ejecución escribe filas de eventos/artefactos directamente. El comando explícito de soporte/exportación todavía puede producir artefactos JSONL de paquete de soporte como formato de exportación, pero la exportación de la sesión no recrea el JSONL de la sesión. Hecho.
- Los espacios de trabajo en disco permanecen en el disco cuando se configuran en modo disco.
- El modo de espacio de trabajo VFS de solo scratch y experimental VFS utiliza la base de datos del agente.

La migración importa los archivos JSONL antiguos una sola vez, registra los recuentos/hashes en `migration_runs` y elimina los archivos importados después de las comprobaciones de integridad.

### Fase 5: Copia de Seguridad, Restauración, Vacío y Verificación

Las copias de seguridad siguen siendo un archivo de archivo:

- Establecer un punto de control en cada base de datos global y de agente.
- Crear una instantánea de cada base de datos con la semántica de copia de seguridad de SQLite o `VACUUM INTO`.
- Archivar instantáneas compactas de la base de datos, configuración, credenciales externas y exportaciones de espacios de trabajo solicitadas.
- Omitir los archivos `*.sqlite-wal` y `*.sqlite-shm` sin procesar y en vivo.
- Verificar abriendo cada instantánea de la base de datos y ejecutando `PRAGMA integrity_check`. `openclaw backup create` realiza esta verificación de archivo de forma predeterminada; `--no-verify` omite solo el paso de archivo posterior a la escritura, no la comprobación de integridad de creación de la instantánea.
- La restauración copia las instantáneas de nuevo a sus rutas de destino. Esta rama restablece el diseño de SQLite no enviado a `user_version = 1`; los cambios de esquema enviados en el futuro pueden agregar migraciones explícitas cuando sea necesario.

### Fase 6: Tiempo de Ejecución del Trabajador

Mantener el modo trabajador experimental mientras se implementa la división de la base de datos:

- Los trabajadores reciben el id del agente, el id de ejecución, el modo del sistema de archivos y la identidad del registro de la base de datos.
- Cada trabajador abre su propia conexión SQLite.
- El padre conserva la entrega del canal, las aprobaciones, la configuración y la autoridad de cancelación.
- Comenzar con un trabajador por ejecución activa; agregar agrupación (pooling) solo después de que el ciclo de vida y la propiedad de la conexión de la base de datos sean estables.

### Fase 7: Eliminar el Mundo Antiguo

Hecho para la gestión de sesiones en tiempo de ejecución. El mundo antiguo solo se permite como entrada explícita del doctor o salida de soporte/exportación:

- Sin escrituras de tiempo de ejecución de `sessions.json`, JSONL de transcripción, JSON de registro de sandbox, SQLite sidecar de tarea o SQLite sidecar de estado de complemento.
- Sin poda de archivos JSON/sesión, truncación de transcripción de archivos, bloqueos de archivos de sesión o pruebas de sesión con forma de bloqueo.
- Sin exportaciones de compatibilidad en tiempo de ejecución cuyo propósito sea mantener
  los archivos de sesión antiguos actualizados.
- Las exportaciones de soporte explícito siguen siendo formatos de archivo/materialización
  solicitados por el usuario y no deben volver a introducir los nombres de archivo en la identidad del tiempo de ejecución.

## Copia De Seguridad Y Restauración

Las copias de seguridad deben ser un único archivo de archivo, pero la captura de la base de datos debe ser
nativa de SQLite:

1. Detenga la actividad de escritura de larga duración o entre en una barrera de copia de seguridad corta.
2. Para cada base de datos global y de agente, ejecute un punto de control.
3. Haga una instantánea de cada base de datos utilizando la semántica de copia de seguridad de SQLite o `VACUUM INTO` en un
   directorio de copia de seguridad temporal.
4. Archiva las instantáneas de bases de datos compactadas, el archivo de configuración, el directorio de credenciales,
   los espacios de trabajo seleccionados y un manifiesto.
5. Verifique el archivo abriendo cada instantánea de SQLite incluida y ejecutando
   `PRAGMA integrity_check`.
   `openclaw backup create` hace esto de forma predeterminada; `--no-verify` es solo para
   omitir intencionalmente el paso de archivo posterior a la escritura.

No se base en copias `*.sqlite`, `*.sqlite-wal` y `*.sqlite-shm` en vivo como
el formato de copia de seguridad principal. El manifiesto del archivo debe registrar el rol de la base de datos,
ID del agente, versión del esquema, ruta de origen, ruta de la instantánea, tamaño en bytes y estado de
integridad.

La restauración debe reconstruir los archivos de la base de datos global y de la base de datos del agente a partir de las
instantáneas del archivo. Dado que el diseño de SQLite aún no se ha enviado, esta refactorización
mantiene solo el esquema de versión 1 más la importación de archivo a base de datos del doctor. El comando
de restauración valida primero el archivo y luego reemplaza cada activo del manifiesto del
payload extraído verificado.

## Plan De Refactorización Del Tiempo De Ejecución

1. Añada APIs de registro de bases de datos.
   - Resuelva las rutas de la base de datos global y de la base de datos por agente.
   - Mantenga los esquemas no enviados en `user_version = 1`; no añada código de ejecutor de
     migración de esquemas hasta que un esquema enviado lo necesite.
   - Añada asistentes de cierre/punto de control/integridad utilizados por pruebas, copias de seguridad y doctor.

2. Contraiga los almacenes SQLite acompañantes.
   - Mueva las tablas de estado de los complementos a la base de datos global. Hecho para escrituras
     en tiempo de ejecución; se elimina el importador acompañante heredado no enviado.
   - Mueva las tablas del registro de tareas a la base de datos global. Hecho para escrituras
     en tiempo de ejecución; se elimina el importador acompañante heredado no enviado.
   - Mover las tablas de flujo de tareas a la base de datos global. Hecho para escrituras en tiempo de ejecución; se ha eliminado el importador de sidecar heredado no enviado.
   - Mover las tablas de búsqueda de memoria integradas a cada base de datos de agente. Hecho; `memorySearch.store.path` explícito personalizado ahora se elimina mediante la migración de configuración de doctor. La reindexación completa se realiza in situ solo en las tablas de memoria; se han eliminado la ruta antigua de intercambio de archivo completo y el asistente de intercambio de índice sidecar.
   - Eliminar los apertores de bases de datos duplicados, la configuración de WAL, los asistentes de permisos y las rutas de cierre de esos subsistemas.

3. Mover las tablas propiedad del agente a bases de datos por agente.
   - Crear la base de datos del agente bajo demanda a través del registro global de bases de datos. Hecho.
   - Mover las entradas de sesión en tiempo de ejecución, los eventos de transcripción, las filas VFS y los artefactos de herramientas a las bases de datos de los agentes. Hecho.
   - No migrar las entradas de sesión de base de datos compartida local a la rama, los eventos de transcripción, las filas VFS ni los artefactos de herramientas; ese diseño nunca se envió. Mantener solo la importación heredada de archivo a base de datos en doctor.

4. Reemplazar las API del almacén de sesiones.
   - Eliminar `storePath` como la identidad de tiempo de ejecución. Hecho para el tiempo de ejecución y protegido
     por `check:database-first-legacy-stores`: los metadatos de la sesión, actualizaciones de ruta,
     persistencia de comandos, limpieza de sesiones CLI, vistas previas de razonamiento de Feishu,
     persistencia del estado de la transcripción, profundidad del subagente, anulaciones de sesión del perfil de autenticación,
     lógica de bifurcación principal y la inspección del laboratorio de QA ahora resuelven la
     base de datos desde las claves canónicas de agente/sesión.
     Las respuestas de lista de sesiones de Gateway/TUI/UI/macOS ahora exponen `databasePath`
     en lugar de `path` heredado; las superficies de depuración de macOS muestran la base de datos por agente
     como un estado de solo lectura en lugar de escribir la configuración `session.store`.
     `/status`, la exportación de trayectoria impulsada por chat y los proxies de dependencias CLI ya no
     propagan rutas de almacenamiento heredadas; la lectura de respaldo del uso de transcripciones
     lee SQLite por identidad de agente/sesión. Las pruebas de tiempo de ejecución y puente ya no exponen
     `storePath`; las entradas de doctor/migración son propietarias de ese nombre de campo heredado.
     La carga de sesiones combinadas de Gateway ya no tiene una rama de tiempo de ejecución especial para
     valores `session.store` sin plantilla; agrega filas SQLite por agente.
     El carril de doctor de bloqueo de sesión heredado y su asistente de limpieza `.jsonl.lock`
     se eliminaron; SQLite es ahora el límite de concurrencia de sesión.
     Los sitios de llamada en caliente del tiempo de ejecución usan nombres de asistentes orientados a filas como
     `resolveSessionRowEntry`; el alias de compatibilidad `resolveSessionStoreEntry` antiguo
     se ha eliminado de las exportaciones del tiempo de ejecución y el SDK del complemento.

- Usar operaciones de fila `{ agentId, sessionKey }`.
  Hecho: `getSessionEntry`, `upsertSessionEntry`, `deleteSessionEntry`,
  `patchSessionEntry` y `listSessionEntries` son APIs con prioridad SQLite que no
  requieren una ruta de almacenamiento de sesión. El resumen de estado, el estado del agente local, la salud
  y el comando de listado `openclaw sessions` ahora leen filas por agente directamente
  y muestran rutas de base de datos SQLite por agente en lugar de rutas `sessions.json`.
- Reemplazar el borrado/insertión de toda la tienda con `upsertSessionEntry`,
  `deleteSessionEntry`, `listSessionEntries`, y consultas de limpieza SQL.
  Hecho para el tiempo de ejecución: las rutas críticas ahora usan APIs de filas y parches de filas con reintentos en caso de conflicto;
  los asistentes restantes de importación/reemplazo de toda la tienda se limitan al código de importación de migración
  y pruebas del backend de SQLite.
  - Eliminar `store-writer.ts` y las pruebas de la cola de escritura. Hecho.
  - Eliminar la poda de claves heredadas del tiempo de ejecución y los parámetros de borrado de alias de las inserciones/actualizaciones
    de filas de sesión. Hecho.

5. Eliminar el comportamiento del registro JSON del tiempo de ejecución.
   - Hacer que las lecturas y escrituras del registro del sandbox sean solo de SQLite. Hecho.
   - Importar JSON monolítico y fragmentado solo desde el paso de migración. Hecho.
   - Eliminar los bloqueos del registro fragmentado y las escrituras JSON. Hecho.

- Mantener una tabla de registro tipificada en lugar de almacenar filas de registro como JSON
  genérico opaco si la forma sigue siendo el estado operativo de la ruta crítica. Hecho.

6. Eliminar la mutación de sesión con forma de bloqueo de archivo.
   - Hecho para la creación de bloqueos del tiempo de ejecución y las APIs de bloqueos del tiempo de ejecución.
   - Se ha eliminado el carril de limpieza del doctor heredado independiente `.jsonl.lock`.
   - `session.writeLock` es una configuración heredada migrada por el doctor, no una configuración
     tipificada del tiempo de ejecución.
   - La integridad del estado ya no tiene una ruta separada para la poda de archivos de transcripciones huérfanas;
     la migración del doctor importa/elimina las fuentes JSONL heredadas en un solo lugar.
   - La coordinación singleton de Gateway usa filas SQLite `state_leases` tipificadas bajo
     `gateway_locks` y ya no expone una costura de directorio de bloqueo de archivo.
   - La persistencia de deduplicación del SDK genérico de complementos ya no usa bloqueos de archivo o archivos
     JSON; escribe filas de estado de complementos SQLite compartidas. Hecho.
   - La coordinación de incrustación QMD usa un arrendamiento de estado SQLite en lugar de
     `qmd/embed.lock`. Hecho.

7. Hacer que los trabajadores sean conscientes de la base de datos.
   - Los trabajadores abren sus propias conexiones SQLite.
   - El padre posee la entrega, las devoluciones de llamada de canal y la configuración.
   - El trabajador recibe el id del agente, el id de ejecución, el modo del sistema de archivos y la identidad del registro
     de la base de datos, no identificadores en vivo.
   - `vfs-only` sigue siendo experimental y usa la base de datos del agente como su raíz
     de almacenamiento.
   - Mantener primero un trabajador por ejecución activa. La agrupación puede esperar hasta que la vida útil
     de la conexión de la base de datos y el comportamiento de cancelación sean triviales.

8. Integración de copia de seguridad.
   - Enseñar a la copia de seguridad a crear instantáneas de las bases de datos globales y de agentes mediante la copia de seguridad de SQLite o
     `VACUUM INTO`. Hecho para archivos `*.sqlite` descubiertos bajo el activo de estado.
   - Agregar verificación de copia de seguridad para la integridad de SQLite y la versión del esquema. Hecho para
     la creación de copias de seguridad y las comprobaciones de integridad de verificación de archivo predeterminadas.
   - Registrar los metadatos de ejecución de la copia de seguridad en SQLite. Hecho a través de la tabla compartida `backup_runs`
     con la ruta del archivo, el estado y el manifiesto JSON.
   - Agregar restauración desde instantáneas de archivo verificadas. Hecho: `openclaw backup
restore` valida antes de la extracción, usa el manifiesto
     normalizado del verificador, admite `--dry-run` y requiere `--yes` antes de reemplazar
     las rutas de origen registradas.
   - Incluir la exportación de VFS/espacio de trabajo solo cuando se solicite; no exportar los aspectos internos
     de la sesión como JSON o JSONL.

9. Eliminar pruebas y código obsoletos. Hecho para las superficies de sesión de tiempo de ejecución conocidas.

- Elimina las pruebas que afirman la creación en tiempo de ejecución de archivos `sessions.json` o de transcripción
  JSONL. Hecho para el almacén de sesión principal, chat, eventos de transcripción de la puerta de enlace,
  vista previa, ciclo de vida, actualizaciones de entrada de sesión de comandos, restablecimiento/rastreo de respuesta automática y
  accesorios de «dreaming» del núcleo de memoria, enrutamiento de destino de aprobación, reparación de transcripción de sesión,
  reparación de permisos de seguridad, exportación de trayectoria y exportación de sesión.
  Las pruebas de transcripción de memoria activa ahora afirman los ámbitos de SQLite y ninguna creación de
  archivos JSONL temporales o persistentes.
  Se eliminó la antigua regresión de poda de transcripción de latido porque
  el tiempo de ejecución ya no trunca las transcripciones JSONL.
  Las pruebas de herramientas de lista de sesiones del agente ya no modelan las rutas `sessions.json` heredadas
  como la forma de respuesta de la puerta de enlace; las pruebas de aplicación/interfaz de usuario/macOS usan `databasePath`.
  Las pruebas de uso de transcripción `/status` ahora propagan filas de transcripción de SQLite directamente
  en lugar de escribir archivos JSONL.
  Las pruebas del ciclo de vida de sesión de la puerta de enlace ahora usan auxiliares de propagación de transcripción de SQLite
  directamente; la antigua forma de accesorio de archivo de sesión de una sola línea ha desaparecido de la cobertura de
  restablecimiento y eliminación.
  `sessions.delete` ya no devuelve un campo `archived: []` de la era de archivos; la eliminación
  informa solo el resultado de la mutación de la fila. La antigua opción `deleteTranscript` también
  ha desaparecido: eliminar una sesión elimina la raíz `sessions` canónica y permite
  que SQLite en cascada elimine las filas de transcripción, instantánea y trayectoria propiedad de la sesión, por lo que ningún
  interlocutor puede dejar huérfanos de transcripción ni olvidar una rama de limpieza.
  Las pruebas de captura de trayectoria del motor de contexto ahora leen filas `trajectory_runtime_events`
  de una base de datos de agente aislada en lugar de leer
  `session.trajectory.jsonl`.
  Los scripts de propagación del canal Docker MCP ahora propagan filas de SQLite directamente. Las escrituras
  `sessions.json` directas se limitan a los accesorios del doctor.
  La búsqueda de herramientas de puerta de enlace E2E lee evidencia de llamadas a herramientas de filas de transcripción de SQLite
  en lugar de escanear archivos `agents/<agentId>/sessions/*.jsonl`.
  Los eventos de host del núcleo de memoria y las filas de «scratch» del corpus de sesión ahora viven en el estado
  compartido del complemento de SQLite; `events.jsonl` y `session-corpus/*.txt` son entradas de migración
  heredadas del doctor solamente. Las filas activas usan rutas virtuales `memory/session-ingestion/`,
  no `.dreams/session-corpus`. El antiguo módulo de reparación de «dreaming» del núcleo de memoria
  y sus pruebas de CLI/Puerta de enlace se eliminaron porque el tiempo de ejecución ya
  no posee la reparación de archivos de archivo para ese corpus. Las pruebas
  de puente/artefacto público del núcleo de memoria ya no exponen `.dreams/events.jsonl`; usan
  el nombre de artefacto JSON virtual respaldado por SQLite.
  La documentación de pruebas del SDK/Codex público ahora dice estado de sesión de SQLite en lugar de archivos
  de sesión, y el ejemplo de turno de canal ya no expone un argumento `storePath`.
  El estado de sincronización de Matrix ahora usa el almacén de estado del complemento de SQLite directamente. Los contratos
  activos de cliente/tiempo de ejecución pasan una raíz de almacenamiento de cuenta, no una ruta `bot-storage.json`,
  y el doctor importa los archivos `bot-storage.json` heredados a SQLite antes de eliminar
  la fuente. Los escenarios de QA de reinicio/destrucción de Matrix ahora mutan la fila de sincronización de SQLite
  directamente en lugar de crear o eliminar archivos `bot-storage.json` falsos, y
  el sustrato E2EE pasa una raíz de almacén de sincronización en lugar de una ruta
  `sync-store.json` falsa.
  La selección de la raíz de almacenamiento de Matrix ya no puntúa las raíces por archivos JSON de sincronización/hilo heredados;
  usa metadatos de raíz duraderos más un estado criptográfico real.
  La suite de pruebas del backend de sesión SQLite del tiempo de ejecución ya no fabrica un
  `sessions.json`; los accesorios de origen heredados ahora viven en las pruebas
  del doctor que los importan.
  Las pruebas de sesión de la puerta de enlace ya no exponen un auxiliar `createSessionStoreDir`
  o una configuración de ruta de almacén de sesión temporal no utilizada; los directorios de accesorios son explícitos y la
  configuración directa de filas usa la nomenclatura de filas de sesión de SQLite.
  La cobertura del analizador de almacén de sesión JSON5 exclusivo del doctor se movió fuera de las pruebas de infraestructura
  y a las pruebas de migración del doctor, por lo que las suites de pruebas del tiempo de ejecución ya no poseen el análisis
  heredado de archivos de sesión.
  Las pruebas de tiempo de ejecución de SSO/carga pendiente de Microsoft Teams ya no llevan accesorios
  o analizadores de acompañantes JSON; el análisis heredado de tokens SSO vive solo en el módulo
  de migración del complemento. Las pruebas de Telegram ya no propagan rutas de almacén `/tmp/*.json` falsas;
  restablecen directamente la caché de mensajes respaldada por SQLite. El auxiliar genérico
  de estado de prueba de OpenClaw ya no expone un escritor `auth-profiles.json` heredado;
  las pruebas de migración de autenticación del doctor poseen ese accesorio localmente.
  Las pruebas de tiempo de ejecución para punteros de última sesión de TUI, aprobaciones de ejecución, alternadores
  de memoria activa, verificación de desduplicación/inicio de Matrix, sincronización de fuente de Memory Wiki,
  enlaces de conversación actual, autenticación de incorporación e importaciones de secretos de Hermes ya no
  fabrican archivos acompañantes antiguos ni afirman que los nombres de archivo antiguos están ausentes. Demuestran
  el comportamiento a través de filas de SQLite y APIs de almacén público; las pruebas de doctor/migración
  son el único lugar donde pertenecen los nombres de archivo de origen heredados.
  Las pruebas de tiempo de ejecución para emparejamiento de dispositivo/nodo, allowFrom del canal, intenciones de reinicio,
  entrega de reinicio, entradas de cola de entrega de sesión, salud de configuración, cachés de iMessage,
  trabajos cron, encabezados de transcripción de PI, registros de subagentes y archivos adjuntos de imagen gestionados
  tampoco crean archivos JSON/JSONL retirados solo para probar que se ignoran o están ausentes.
  La recuperación de desbordamiento de PI ya no tiene una alternativa de reescritura/truncamiento de SessionManager:
  la truncación del resultado de la herramienta y las reescrituras de transcripción del motor de contexto mutan las filas
  de transcripción de SQLite y luego actualizan el estado de prompt activo desde la base de datos.
  Las adiciones de mensajes de SessionManager persistentes delegan en el auxiliar de adición de transcripción atómica de SQLite
  para la selección principal y la idempotencia. Las adiciones normales de metadatos/entradas personalizadas también
  seleccionan el principal actual dentro de SQLite, por lo que las instancias obsoletas del gestor no resucitan carreras
  de cadena principal anterior a SQLite.
  La limpieza sintética de la cola de PI para comprobaciones previas de mitad de turno y `sessions_yield` ahora
  recorta el estado de transcripción de SQLite directamente; se eliminó el antiguo puente de eliminación de cola de SessionManager
  y sus pruebas.
  La captura de punto de control de compactación también toma instantáneas solo de SQLite; los interlocutores ya no
  pasan un SessionManager en vivo como una fuente de transcripción alternativa.
- Mantenga las pruebas que siembran archivos heredados solo para la migración.
- La prueba de archivos JSON ha sido reemplazada por la prueba de filas SQL para superficies de runtime activas.

- Agregue prohibiciones estáticas para escrituras de runtime en rutas JSON de sesión/caché heredadas. Hecho para el guardián del repositorio.

10. Haga que el informe de migración sea auditable.
    - Registre ejecuciones de migración en SQLite con marcas de tiempo de inicio/finalización, rutas de origen, hashes de origen, recuentos, advertencias y ruta de respaldo. Hecho: las ejecuciones de migración de estado heredado ahora persisten un informe `migration_runs` con inventario de ruta/tabla de origen, SHA-256 del archivo de origen, tamaños, recuentos de registros, advertencias y ruta de respaldo. Hecho: las ejecuciones de migración de estado heredado también persisten filas `migration_sources` para auditoría a nivel de origen y futuras decisiones de omisión/relleno.
    - Haga que la aplicación sea idempotente. La reejecución después de una importación parcial debe omitir una fuente ya importada o fusionarla por clave estable. Hecho: los índices de sesión, las transcripciones, las colas de entrega, el estado de los complementos, los libros mayores de tareas y las filas globales de SQLite propiedad del agente se importan a través de claves estables o semánticas de upsert/reemplazo, por lo que las reejecuciones se fusionan sin duplicar filas duraderas.
    - Las importaciones fallidas deben mantener el archivo fuente original en su lugar. Hecho: las importaciones fallidas de transcripciones ahora dejan la fuente JSONL original en su ruta detectada, y `migration_sources` registra la fuente como `warning` con `removed_source=0` para la siguiente ejecución del doctor.

## Reglas de rendimiento

- Una conexión por hilo/proceso está bien; no comparta identificadores entre los trabajadores.
- Use WAL, `foreign_keys=ON`, un tiempo de espera de ocupado de 30 s y transacciones de escritura `BEGIN IMMEDIATE` cortas.
- Mantenga los ayudantes de transacción de escritura síncronos a menos que/hasta que una API de transacción asíncrona agregue semánticas explícitas de mutex/contrapresión.
- Mantenga las escrituras de entrega principal pequeñas y transaccionales.
- Evite reescrituras de toda la tienda; use upsert/eliminación a nivel de fila.
- Agregue índices para listas por agente, listas por sesión, fecha de actualización, id. de ejecución y rutas de vencimiento antes de mover el código activo.
- Almacene artefactos grandes, medios y vectores como BLOBs o filas de BLOBs fragmentados, no como JSON base64 o de matriz numérica.
- Mantenga las entradas de estado de complemento opacas pequeñas y con ámbito.
- Añadir limpieza SQL para TTL/expiration en lugar de la poda del sistema de archivos.
  Hecho para las tiendas de propiedad de la base de datos: medios, estado del complemento,
  blobs del complemento, deduplicación persistente y caché de agentes, todos expiran
  a través de filas SQLite. La limpieza restante del sistema de archivos se limita a
  materializaciones temporales o comandos de eliminación explícitos.

## Prohibiciones Estáticas

Añadir una verificación de repositorio que falle nuevas escrituras en tiempo de ejecución a rutas de estado heredadas:

- `sessions.json`
- `*.trajectory.jsonl` excepto las salidas materializadas de support-bundle
- `.acp-stream.jsonl`
- `acp/event-ledger.json`
- `cache/*.json` archivos de caché de tiempo de ejecución
- `agents/<agentId>/agent/auth.json`
- `agents/<agentId>/agent/models.json`
- `credentials/oauth.json`
- `github-copilot.token.json`
- `openrouter-models.json`
- `auth-profiles.json`
- `auth-state.json`
- `exec-approvals.json`
- `workspace-state.json`
- Matriz `credentials*.json` y `recovery-key.json`
- `cron/runs/*.jsonl`
- `cron/jobs.json`
- `jobs-state.json`
- `device-pair-notify.json`
- `devices/pending.json`
- `devices/paired.json`
- `devices/bootstrap.json`
- `nodes/pending.json`
- `nodes/paired.json`
- `identity/device.json`
- `identity/device-auth.json`
- `push/web-push-subscriptions.json`
- `push/vapid-keys.json`
- `push/apns-registrations.json`
- `process-leases.json`
- `gateway-instance-id`
- `session-toggles.json`
- Memory-core `.dreams/events.jsonl`
- Memory-core `.dreams/session-corpus/`
- Memory-core `.dreams/daily-ingestion.json`
- Memory-core `.dreams/session-ingestion.json`
- Memory-core `.dreams/short-term-recall.json`
- Memory-core `.dreams/phase-signals.json`
- Memory-core `.dreams/short-term-promotion.lock`
- Skill Workshop `skill-workshop/<workspace>.json`
- Skill Workshop `skill-workshop/skill-workshop-review-*.json`
- Nostr `bus-state-*.json`
- Nostr `profile-state-*.json`
- `calls.jsonl`
- `known-users.json`
- `ref-index.jsonl`
- QQBot `session-*.json`
- BlueBubbles `bluebubbles/catchup/*.json`
- BlueBubbles `bluebubbles/inbound-dedupe/*.json`
- Telegram `update-offset-*.json`
- Telegram `sticker-cache.json`
- Telegram `*.telegram-messages.json`
- Telegram `*.telegram-sent-messages.json`
- Telegram `*.telegram-topic-names.json`
- Telegram `thread-bindings-*.json`
- iMessage `catchup/*.json`
- iMessage `reply-cache.jsonl`
- iMessage `sent-echoes.jsonl`
- Microsoft Teams `msteams-conversations.json`
- Microsoft Teams `msteams-polls.json`
- Microsoft Teams `msteams-sso-tokens.json`
- Microsoft Teams `msteams-delegated.json`
- Microsoft Teams `msteams-pending-uploads.json`
- Microsoft Teams `*.learnings.json`
- Matrix `bot-storage.json`
- Matrix `sync-store.json`
- Matrix `thread-bindings.json`
- Matrix `inbound-dedupe.json`
- Matrix `startup-verification.json`
- Matrix `storage-meta.json`
- Matrix `crypto-idb-snapshot.json`
- Discord `model-picker-preferences.json`
- Discord `command-deploy-cache.json`
- archivos JSON de fragmentos del registro de espacio aislado
- archivos JSON del puente de retransmisión de enganche nativo `/tmp`
- `plugin-state/state.sqlite`
- sidecars de tiempo de ejecución ad-hoc `openclaw-state.sqlite`
- `tasks/runs.sqlite`
- `tasks/flows/registry.sqlite`
- `bindings/current-conversations.json`
- `restart-sentinel.json`
- `gateway-restart-intent.json`
- `gateway-supervisor-restart-handoff.json`
- `gateway.<hash>.lock`
- `qmd/embed.lock`
- `commands.log`
- `config-health.json`
- `port-guard.json`
- `settings/voicewake.json`
- `settings/voicewake-routing.json`
- `plugin-binding-approvals.json`
- `plugins/installs.json`
- `audit/file-transfer.jsonl`
- `audit/crestodian.jsonl`
- `crestodian/rescue-pending/*.json`
- `plugins/phone-control/armed.json`
- Wiki de memoria `.openclaw-wiki/log.jsonl`
- Wiki de memoria `.openclaw-wiki/state.json`
- Wiki de memoria `.openclaw-wiki/locks/`
- Wiki de memoria `.openclaw-wiki/source-sync.json`
- Wiki de memoria `.openclaw-wiki/import-runs/*.json`
- Wiki de memoria `.openclaw-wiki/cache/agent-digest.json`
- Wiki de memoria `.openclaw-wiki/cache/claims.jsonl`
- ClawHub `.clawhub/lock.json`
- ClawHub `.clawhub/origin.json`
- Decoración del perfil del navegador `.openclaw-profile-decorated`
- Apertura de sesiones con respaldo en archivo `SessionManager.open(...)`
- Fachadas de listado de transcripciones `SessionManager.listAll(...)` y `TranscriptSessionManager.listAll(...)`
- Fachadas de bifurcación de transcripciones `SessionManager.forkFromSession(...)` y
  `TranscriptSessionManager.forkFromSession(...)`
- Fachadas de reemplazo de sesión mutable `SessionManager.newSession(...)` y `TranscriptSessionManager.newSession(...)`
- Fachadas de sesión de rama `SessionManager.createBranchedSession(...)` y
  `TranscriptSessionManager.createBranchedSession(...)`

La prohibición debe permitir a las pruebas crear accesorios heredados y permitir al código de migración
leer/importar/eliminar fuentes de archivos heredadas. Los sidecars de SQLite no enviados siguen prohibidos
y no obtienen permisos de importación del doctor.

## Criterios de finalización

- Las escrituras de datos en tiempo de ejecución y caché van a la base de datos SQLite global o del agente.
- El tiempo de ejecución ya no escribe índices de sesión, JSONL de transcripciones, registro de sandbox
  JSON, SQLite sidecar de tareas o SQLite sidecar de estado de complementos. Los importadores no enviados de
  SQLite sidecar de tareas y de estado de complementos se eliminan.
- La importación de archivos heredados es exclusiva del doctor.
- La copia de seguridad produce un archivo con instantáneas compactas de SQLite y prueba de integridad.
- Los trabajadores del agente pueden ejecutarse con almacenamiento en disco, VFS de scratch o experimental solo VFS.
- Los archivos de configuración y credenciales explícitas siguen siendo los únicos archivos de control persistentes
  no base de datos esperados.
- Las comprobaciones del repositorio evitan reintroducir almacenes de archivos de tiempo de ejecución heredados.
