---
summary: "Kit de pruebas: suites unit/e2e/live, ejecutores de Docker y qué cubre cada prueba"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Pruebas"
---

# Pruebas

OpenClaw tiene tres suites de Vitest (unitaria/integración, e2e, en vivo) y un pequeño conjunto de ejecutores de Docker.

Este documento es una guía de “cómo probamos”:

- Qué cubre cada suite (y qué deliberadamente _no_ cubre)
- Qué comandos ejecutar para flujos de trabajo comunes (local, pre-push, depuración)
- Cómo las pruebas en vivo descubren credenciales y seleccionan modelos/proveedores
- Cómo agregar regresiones para problemas reales de modelos/proveedores

## Inicio rápido

La mayoría de los días:

- Puerta completa (esperado antes de enviar): `pnpm build && pnpm check && pnpm test`
- Ejecución local de suite completa más rápida en una máquina con espacio: `pnpm test:max`
- Bucle de vigilancia directo de Vitest: `pnpm test:watch`
- El direccionamiento directo de archivos ahora también enruta las rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones segmentadas primero cuando estás iterando sobre un único fallo.
- Sitio de QA respaldado por Docker: `pnpm qa:lab:up`
- Carril de QA respaldado por VM de Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando modificas pruebas o quieres mayor seguridad:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramienta/imagen de gateway): `pnpm test:live`
- Apuntar a un archivo en vivo silenciosamente: `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Consejo: cuando solo necesitas un caso de fallo, prefiere reducir las pruebas live mediante las variables de entorno de lista blanca descritas a continuación.

## Ejecutores específicos de QA

Estos comandos se ubican junto a las suites de prueba principales cuando necesitas realismo de laboratorio de QA:

- `pnpm openclaw qa suite`
  - Ejecuta escenarios de QA respaldados por repositorio directamente en el host.
  - Ejecuta múltiples escenarios seleccionados en paralelo de forma predeterminada con trabajadores de gateway aislados, hasta 64 trabajadores o la cantidad de escenarios seleccionados. Use `--concurrency <count>` para ajustar la cantidad de trabajadores, o `--concurrency 1` para el carril serie anterior.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta la misma suite de QA dentro de una VM Linux desechable de Multipass.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza los mismos indicadores de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones en vivo reenvían las entradas de autenticación QA compatibles que son prácticas para el invitado: claves de proveedor basadas en variables de entorno, la ruta de configuración del proveedor en vivo de QA y `CODEX_HOME` cuando está presente.
  - Los directorios de salida deben permanecer en la raíz del repositorio para que el invitado pueda escribir de vuelta a través
    del espacio de trabajo montado.
  - Escribe el informe y resumen de QA normal más los registros de Multipass bajo `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA respaldado por Docker para trabajos de QA de estilo operador.
- `pnpm openclaw qa matrix`
  - Ejecuta el carril de QA en vivo de Matrix contra un homeserver Tuwunel desechable respaldado por Docker.
  - Este host de QA es solo para repositorio/desarrollo hoy en día. Las instalaciones empaquetadas de OpenClaw no envían `qa-lab`, por lo que no exponen `openclaw qa`.
  - Las checkouts del repositorio cargan el ejecutor incluido directamente; no se necesita ningún paso de instalación de complemento separado.
  - Aprovisiona tres usuarios temporales de Matrix (`driver`, `sut`, `observer`) más una sala privada, luego inicia un hijo de gateway de QA con el complemento de Matrix real como transporte de SUT.
  - Usa la imagen estable anclada de Tuwunel `ghcr.io/matrix-construct/tuwunel:v1.5.1` de manera predeterminada. Anúlala con `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` cuando necesites probar una imagen diferente.
  - Matrix no expone indicadores compartidos de fuente de credenciales porque el carril aprovisiona usuarios desechables localmente.
  - Escribe un informe de QA de Matrix, un resumen y un artefacto de eventos observados en `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real utilizando los tokens del bot del controlador y del SUT desde las variables de entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El ID del grupo debe ser el ID de chat numérico de Telegram.
  - Admite `--credential-source convex` para credenciales agrupadas compartidas. Usa el modo env por defecto, o establece `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` para optar por arrendamientos agrupados.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilita el Modo de Comunicación de Bot a Bot en `@BotFather` para ambos bots y asegúrate de que el bot controlador pueda observar el tráfico del bot del grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados en `.artifacts/qa-e2e/...`.

Los carriles de transporte en vivo comparten un contrato estándar para que los nuevos transportes no se desvíen:

`qa-channel` sigue siendo la suite de QA sintética amplia y no es parte de la matriz
de cobertura de transporte en vivo.

| Carril   | Canary | Mención de puerta | Bloqueo de lista de permitidos | Respuesta de nivel superior | Reanudación de reinicio | Seguimiento de hilos | Aislamiento de hilos | Observación de reacciones | Comando de ayuda |
| -------- | ------ | ----------------- | ------------------------------ | --------------------------- | ----------------------- | -------------------- | -------------------- | ------------------------- | ---------------- |
| Matrix   | x      | x                 | x                              | x                           | x                       | x                    | x                    | x                         |                  |
| Telegram | x      |                   |                                |                             |                         |                      |                      |                           | x                |

### Credenciales compartidas de Telegram a través de Convex (v1)

Cuando `--credential-source convex` (o `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) está habilitado para
`openclaw qa telegram`, el laboratorio de QA adquiere un arrendamiento exclusivo de un grupo respaldado por Convex, envía latidos
a ese arrendamiento mientras el carril se está ejecutando y libera el arrendamiento al apagar.

Andamio del proyecto Convex de referencia:

- `qa/convex-credential-broker/`

Variables de entorno requeridas:

- `OPENCLAW_QA_CONVEX_SITE_URL` (por ejemplo `https://your-deployment.convex.site`)
- Un secreto para el rol seleccionado:
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` para `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` para `ci`
- Selección de rol de credencial:
  - CLI: `--credential-role maintainer|ci`
  - Por defecto de entorno: `OPENCLAW_QA_CREDENTIAL_ROLE` (por defecto es `maintainer`)

Variables de entorno opcionales:

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (por defecto `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (por defecto `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (por defecto `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (por defecto `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (por defecto `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de seguimiento opcional)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permite URL de bucle invertido `http://` de Convex para desarrollo local exclusivo.

`OPENCLAW_QA_CONVEX_SITE_URL` debe usar `https://` en funcionamiento normal.

Los comandos de administrador de mantenimiento (añadir/eliminar/listar pool) requieren
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` específicamente.

Auxiliares de CLI para mantenedores:

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Use `--json` para una salida legible por máquina en scripts y utilidades de CI.

Contrato de punto final predeterminado (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

- `POST /acquire`
  - Solicitud: `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Éxito: `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Agotado/reinteligible: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Éxito: `{ status: "ok" }` (o `2xx` vacío)
- `POST /release`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Éxito: `{ status: "ok" }` (o `2xx` vacío)
- `POST /admin/add` (solo secreto de mantenedor)
  - Solicitud: `{ kind, actorId, payload, note?, status? }`
  - Éxito: `{ status: "ok", credential }`
- `POST /admin/remove` (solo secreto de mantenedor)
  - Solicitud: `{ credentialId, actorId }`
  - Éxito: `{ status: "ok", changed, credential }`
  - Guardia de arrendamiento activo: `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (solo secreto de mantenedor)
  - Solicitud: `{ kind?, status?, includePayload?, limit? }`
  - Éxito: `{ status: "ok", credentials, count }`

Forma del Payload para el tipo Telegram:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` debe ser una cadena de ID de chat de Telegram numérico.
- `admin/add` valida esta forma para `kind: "telegram"` y rechaza los payloads mal formados.

### Agregar un canal a QA

Agregar un canal al sistema QA de markdown requiere exactamente dos cosas:

1. Un adaptador de transporte para el canal.
2. Un paquete de escenarios que ejercite el contrato del canal.

No agregues una nueva raíz de comando QA de nivel superior cuando el host compartido `qa-lab` puede
ser dueño del flujo.

`qa-lab` posee la mecánica del host compartido:

- la raíz del comando `openclaw qa`
- inicio y cierre del suite
- concurrencia de trabajadores
- escritura de artefactos
- generación de reportes
- ejecución de escenarios
- alias de compatibilidad para escenarios más antiguos de `qa-channel`

Los plugins del Runner poseen el contrato de transporte:

- cómo se monta `openclaw qa <runner>` debajo de la raíz compartida `qa`
- cómo se configura el gateway para ese transporte
- cómo se verifica la preparación
- cómo se inyectan los eventos entrantes
- cómo se observan los mensajes salientes
- cómo se exponen las transcripciones y el estado normalizado del transporte
- cómo se ejecutan las acciones respaldadas por el transporte
- cómo se maneja el restablecimiento o limpieza específica del transporte

El mínimo requisito de adopción para un nuevo canal es:

1. Mantén a `qa-lab` como el dueño de la raíz compartida `qa`.
2. Implementa el runner de transporte en la costura del host compartido `qa-lab`.
3. Mantén la mecánica específica del transporte dentro del plugin del runner o del arnés del canal.
4. Monta el runner como `openclaw qa <runner>` en lugar de registrar un comando raíz competidor.
   Los plugins del runner deben declarar `qaRunners` en `openclaw.plugin.json` y exportar un array `qaRunnerCliRegistrations` coincidente desde `runtime-api.ts`.
   Mantén `runtime-api.ts` ligero; la ejecución perezosa de la CLI y del runner debe permanecer detrás de puntos de entrada separados.
5. Escribe o adapta escenarios markdown bajo `qa/scenarios/`.
6. Utilice los asistentes genéricos de escenarios para los nuevos escenarios.
7. Mantenga los alias de compatibilidad existentes funcionando a menos que el repositorio esté realizando una migración intencional.

La regla de decisión es estricta:

- Si el comportamiento puede expresarse una vez en `qa-lab`, póngalo en `qa-lab`.
- Si el comportamiento depende de un transporte de canal, manténgalo en ese complemento (plugin) del ejecutor o en el arnés del complemento.
- Si un escenario necesita una nueva capacidad que más de un canal pueda utilizar, agregue un asistente genérico en lugar de una rama específica del canal en `suite.ts`.
- Si un comportamiento solo es significativo para un transporte, mantenga el escenario específico del transporte y hágalo explícito en el contrato del escenario.

Los nombres preferidos de asistentes genéricos para nuevos escenarios son:

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

Los alias de compatibilidad permanecen disponibles para los escenarios existentes, incluyendo:

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

El trabajo de nuevos canales debe utilizar los nombres de asistentes genéricos.
Los alias de compatibilidad existen para evitar una migración completa, no como modelo para
la creación de nuevos escenarios.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como un "realismo creciente" (y un aumento de la inestabilidad/costo):

### Unitarias / de integración (predeterminado)

- Comando: `pnpm test`
- Configuración: diez ejecuciones secuenciales de fragmentos (`vitest.full-*.config.ts`) sobre los proyectos Vitest existentes
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, y las pruebas de nodo `ui` en la lista blanca cubiertas por `vitest.unit.config.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápido y estable
- Nota de proyectos:
  - Ahora, `pnpm test` sin destino ejecuta once configuraciones de fragmentos más pequeños (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso nativo gigante de proyecto raíz. Esto reduce el pico de RSS en máquinas cargadas y evita que el trabajo de respuesta automática/extensión prive de recursos a suites no relacionadas.
  - `pnpm test --watch` todavía utiliza el gráfico de proyectos nativo raíz `vitest.config.ts`, porque un bucle de vigilancia (watch loop) multi-fragmento no es práctico.
  - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` dirigen objetivos explícitos de archivo/directorio a través de carriles con ámbito (scoped lanes) primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el impuesto de inicio completo del proyecto raíz.
  - `pnpm test:changed` expande las rutas de git cambiadas en los mismos carriles con ámbito cuando la diferencia solo toca archivos de código fuente/prueba enrutables; las ediciones de configuración/configuración aún recurren a la reejecución amplia del proyecto raíz.
  - Las pruebas unitarias ligeras en importaciones de agentes, comandos, complementos, auxiliares de respuesta automática, `plugin-sdk` y áreas similares de utilidades puras se enrutan a través del carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con mucho estado o carga de ejecución se mantienen en los carriles existentes.
  - Los archivos de código fuente auxiliares seleccionados de `plugin-sdk` y `commands` también asignan ejecuciones en modo de cambio a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones de auxiliares evitan volver a ejecutar la suite pesada completa para ese directorio.
  - `auto-reply` ahora tiene tres cubos dedicados: auxiliares centrales de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. Esto mantiene el trabajo de arnés de respuesta más pesado fuera de las pruebas baratas de estado/fragmento/token.
- Nota del ejecutor integrado:
  - Cuando cambies las entradas de descubrimiento de message-tool o el contexto de tiempo de ejecución de compactación,
    mantén ambos niveles de cobertura.
  - Añade regresiones de ayuda centradas para los límites puros de enrutamiento/normalización.
  - También mantén las suites de integración del runner integrado saludables:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esas suites verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayuda no son un
    sustituto suficiente para esas rutas de integración.
- Nota sobre el Pool:
  - La configuración base de Vitest ahora por defecto es `threads`.
  - La configuración compartida de Vitest también corrige `isolate: false` y usa el runner no aislado en los proyectos raíz, e2e y configuraciones en vivo.
  - El carril de la UI raíz mantiene su configuración `jsdom` y optimizador, pero ahora también se ejecuta en el runner compartido no aislado.
  - Cada shard `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false` de la configuración compartida de Vitest.
  - El lanzador compartido `scripts/run-vitest.mjs` ahora también añade `--no-maglev` para los procesos secundarios de Node de Vitest por defecto para reducir la agitación de compilación de V8 durante ejecuciones locales grandes. Establece `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si necesitas comparar con el comportamiento estándar de V8.
- Nota de iteración local rápida:
  - `pnpm test:changed` enruta a través de carriles con ámbito cuando las rutas cambiadas se mapean limpiamente a una suite más pequeña.
  - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento de enrutamiento, solo con un límite de trabajadores más alto.
  - La autoescalada de trabajadores locales ahora es intencionalmente conservadora y también se retracta cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones concurrentes de Vitest hacen menos daño por defecto.
  - La configuración base de Vitest marca los proyectos/archivos de configuración como `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia la conexión de pruebas.
  - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles; establece `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si quieres una ubicación de caché explícita para perfilado directo.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita los informes de duración de importación de Vitest más la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a los archivos modificados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara las `test:changed` enrutadas con la ruta nativa del proyecto raíz para ese diff confirmado e imprime el tiempo de reloj más el RSS máximo de macOS.
- `pnpm test:perf:changed:bench -- --worktree` realiza benchmarks del árbol dirty actual al enrutrar la lista de archivos modificados a través de `scripts/test-projects.mjs` y la configuración raíz de Vitest.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU + montón del ejecutor para la suite unitaria con el paralelismo de archivos deshabilitado.

### E2E (smoke del gateway)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Anulaciones útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de un extremo a otro (end-to-end) del gateway de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y red más pesada
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (puede ser más lento)

### E2E: Smoke del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia un gateway aislado de OpenShell en el host a través de Docker
  - Crea un sandbox desde un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw sobre `sandbox ssh-config` real + exec de SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución predeterminada de `pnpm test:e2e`
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye el gateway de prueba y el sandbox
- Overrides útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar el suite e2e más amplio manualmente
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o un script contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - ¿Realmente funciona este proveedor/modelo _hoy_ con credenciales reales?
  - Detecta cambios de formato del proveedor, peculiaridades de llamada a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Es preferible ejecutar subconjuntos reducidos en lugar de "todo"
- Live ejecuta source `~/.profile` para recuperar claves API faltantes.
- De forma predeterminada, las ejecuciones Live aún aislan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los fixtures unitarios no puedan mutar tu `~/.openclaw` real.
- Establece `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando necesitas intencionalmente que las pruebas en vivo usen tu directorio real.
- `pnpm test:live` ahora tiene un modo más silencioso de forma predeterminada: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso extra de `~/.profile` y silencia los registros de arranque del gateway/chatter de Bonjour. Establece `OPENCLAW_LIVE_TEST_QUIET=0` si quieres recuperar los registros completos de inicio.
- Rotación de claves API (específica del proveedor): establece `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o un override por-live vía `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de tasa.
- Salida de progreso/latido:
  - Los suites Live ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de consola de Vitest está en silencio.
  - `vitest.live.config.ts` desactiva la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/pasarela se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos de la pasarela/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisiones:

- Edición de lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Modificar la red de la pasarela / protocolo WS / emparejamiento: añada `pnpm test:e2e`
- Depuración de "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute un `pnpm test:live` reducido

## En vivo: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos actualmente anunciados** por un nodo Android conectado y afirmar el comportamiento del contrato de comandos.
- Alcance:
  - Configuración precondicionada/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación de la pasarela `node.invoke` comando por comando para el nodo Android seleccionado.
- Requisitos previos:
  - Aplicación Android ya conectada y emparejada con la pasarela.
  - Aplicación mantenida en primer plano.
  - Permisos/consentimiento de captura otorgados para las capacidades que espera que pasen.
- Anulaciones de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de la configuración de Android: [Android App](/es/platforms/android)

## En vivo: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para poder aislar los fallos:

- "Modelo directo" nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo de la pasarela" nos indica si funciona toda la tubería de pasarela+agente para ese modelo (sesiones, historial, herramientas, política de espacio aislado, etc.).

### Capa 1: Finalización del modelo directo (sin pasarela)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Use `getApiKeyForModel` para seleccionar los modelos para los que tiene credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establezca `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en las pruebas de humo de la pasarela (gateway)
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos (allowlist) moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
  - Los barridos modernos/de todos (modern/all) tienen como valor predeterminado un límite curado de alta señal; establezca `OPENCLAW_LIVE_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite más pequeño.
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - De forma predeterminada: almacén de perfiles y alternativas de entorno (env fallbacks)
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacén de perfiles**
- Por qué existe esto:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente de la pasarela (gateway) está rota"
  - Contiene regresiones pequeñas y aisladas (ejemplo: OpenAI Responses/Codex Responses repetición de razonamiento + flujos de llamadas a herramientas)

### Capa 2: Pasarela (Gateway) + pruebas de humo del agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una pasarela (gateway) en proceso
  - Crear/Parchear una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos-con-claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - una invocación de herramienta real funciona (sondeo de lectura)
    - sondeos adicionales de herramientas opcionales (sondeo exec+read)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que lo `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal y luego que lo `read` de vuelta.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorizado) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Predeterminado: lista blanca moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista blanca moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para limitar
  - Los barridos modernos/completos de la puerta de enlace (gateway) tienen como valor predeterminado un límite curado de alta señal; establezca `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite más pequeño.
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista blanca separada por comas)
- Las sondas de herramientas (tool) e imágenes siempre están activas en esta prueba en vivo:
  - sonda `read` + sonda `exec+read` (estrés de herramientas)
  - la sonda de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (nivel alto):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - La puerta de enlace analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puede probar en su máquina (y los ids exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del backend CLI (Claude, Codex, Gemini u otros CLIs locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de la puerta de enlace (Gateway) + agente utilizando un backend CLI local, sin tocar su configuración predeterminada.
- Los valores predeterminados de prueba de humo específicos del backend residen con la definición `cli-backend.ts` de la extensión propietaria.
- Habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Proveedor/modelo predeterminado: `claude-cli/claude-sonnet-4-6`
  - El comportamiento de comando/argumentos/imagen proviene de los metadatos del complemento (plugin) del backend CLI propietario.
- Anulaciones (opcional):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos de CLI en lugar de la inyección en el prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando se establece `IMAGE_ARG`.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` para desactivar la sonda de continuidad de sesión predeterminada Claude Sonnet -> Opus (establézcalo en `1` para forzarla cuando el modelo seleccionado admite un objetivo de cambio).

Ejemplo:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Receta de Docker:

```bash
pnpm test:docker:live-cli-backend
```

Recetas de Docker de un solo proveedor:

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notas:

- El ejecutor de Docker se encuentra en `scripts/test-live-cli-backend-docker.sh`.
- Ejecuta la prueba de humo del backend de CLI en vivo dentro de la imagen Docker del repositorio como el usuario no root `node`.
- Resuelve los metadatos de la prueba de humo de CLI desde la extensión propietaria y luego instala el paquete CLI de Linux coincidente (`@anthropic-ai/claude-code`, `@openai/codex` o `@google/gemini-cli`) en un prefijo escribible y almacenado en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` requiere OAuth de suscripción portátil de Claude Code a través de `~/.claude/.credentials.json` con `claudeAiOauth.subscriptionType` o `CLAUDE_CODE_OAUTH_TOKEN` de `claude setup-token`. Primero prueba el `claude -p` directo en Docker y luego ejecuta dos turnos del backend de CLI del Gateway sin conservar las variables de entorno de la clave API de Anthropic. Este carril de suscripción desactiva las sondas de MCP/herramienta e imagen de Claude de manera predeterminada porque Claude actualmente enruta el uso de aplicaciones de terceros a través de la facturación de uso adicional en lugar de los límites normales del plan de suscripción.
- La prueba de humo del backend de CLI en vivo ahora ejecuta el mismo flujo de extremo a extremo para Claude, Codex y Gemini: turno de texto, turno de clasificación de imágenes y luego la llamada a la herramienta MCP `cron` verificada a través de la CLI del Gateway.
- La prueba de humo predeterminada de Claude también parchea la sesión de Sonnet a Opus y verifica que la sesión reanudada todavía recuerde una nota anterior.

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- Goal: validate the real ACP conversation-bind flow with a live ACP agent:
  - send `/acp spawn <agent> --bind here`
  - bind a synthetic message-channel conversation in place
  - send a normal follow-up on that same conversation
  - verify the follow-up lands in the bound ACP session transcript
- Enable:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Defaults:
  - ACP agents in Docker: `claude,codex,gemini`
  - ACP agent for direct `pnpm test:live ...`: `claude`
  - Synthetic channel: Slack DM-style conversation context
  - ACP backend: `acpx`
- Overrides:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notes:
  - This lane uses the gateway `chat.send` surface with admin-only synthetic originating-route fields so tests can attach message-channel context without pretending to deliver externally.
  - When `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` is unset, the test uses the embedded `acpx` plugin's built-in agent registry for the selected ACP harness agent.

Example:

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker recipe:

```bash
pnpm test:docker:live-acp-bind
```

Single-agent Docker recipes:

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker notes:

- The Docker runner lives at `scripts/test-live-acp-bind-docker.sh`.
- By default, it runs the ACP bind smoke against all supported live CLI agents in sequence: `claude`, `codex`, then `gemini`.
- Use `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`, or `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` to narrow the matrix.
- It sources `~/.profile`, stages the matching CLI auth material into the container, installs `acpx` into a writable npm prefix, then installs the requested live CLI (`@anthropic-ai/claude-code`, `@openai/codex`, or `@google/gemini-cli`) if missing.
- Dentro de Docker, el runner establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveedor del perfil obtenido disponibles para la CLI del arnés secundario.

## Live: Prueba de humo del arnés del servidor de aplicaciones de Codex

- Objetivo: validar el arnés de Codex propiedad del complemento a través de la pasarela normal
  método `agent`:
  - cargar el complemento `codex` empaquetado
  - seleccionar `OPENCLAW_AGENT_RUNTIME=codex`
  - enviar un primer turno del agente de la pasarela a `codex/gpt-5.4`
  - enviar un segundo turno a la misma sesión de OpenClaw y verificar que el hilo del servidor de aplicaciones
    pueda continuar
  - ejecutar `/codex status` y `/codex models` a través de la misma ruta de comando
    de la pasarela
- Prueba: `src/gateway/gateway-codex-harness.live.test.ts`
- Habilitar: `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modelo predeterminado: `codex/gpt-5.4`
- Sonda de imagen opcional: `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonda MCP/herramienta opcional: `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- La prueba de humo establece `OPENCLAW_AGENT_HARNESS_FALLBACK=none` para que un arnés de Codex
  roto no pueda pasar volviendo silenciosamente a PI.
- Autenticación: `OPENAI_API_KEY` del shell/perfil, más `~/.codex/auth.json` y `~/.codex/config.toml` copiados opcionales

Receta local:

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Receta Docker:

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Notas de Docker:

- El runner de Docker se encuentra en `scripts/test-live-codex-harness-docker.sh`.
- Obtiene el `~/.profile` montado, pasa `OPENAI_API_KEY`, copia los archivos de autenticación de la CLI de Codex
  cuando están presentes, instala `@openai/codex` en un prefijo npm montado con permiso de escritura,
  prepara el árbol de fuentes y luego ejecuta solo la prueba en vivo del arnés de Codex.
- Docker habilita las sondas de imagen y MCP/herramienta de manera predeterminada. Establezca
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` o
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` cuando necesite una ejecución de depuración más estrecha.
- Docker también exporta `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, coincidiendo con la configuración de
  la prueba en vivo para que `openai-codex/*` o la reserva a PI no puedan ocultar una regresión
  del arnés de Codex.

### Recetas en vivo recomendadas

Las listas de permitidos estrechas y explícitas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin pasarela):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo de pasarela:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada a herramientas en varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque de Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa la API de Gemini (clave de API).
- `google-antigravity/...` usa el puente OAuth de Antigravity (endpoint de agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa la CLI local de Gemini en tu máquina (autenticación separada + peculiaridades de las herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API alojada de Gemini de Google a través de HTTP (clave de API / autenticación de perfil); esto es a lo que la mayoría de los usuarios se refieren con "Gemini".
  - CLI: OpenClaw ejecuta un binario local `gemini`; tiene su propia autenticación y puede comportarse de manera diferente (transmisión/soporte de herramientas/discrepancia de versión).

## Live: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (live es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de pruebas de humo moderno (llamada a herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.4` (opcional: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (API de Gemini): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar modelos antiguos de Gemini 2.x)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecutar prueba de humo de gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elige al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.4` (o `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (deseable):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elija un modelo con capacidad de "herramientas" que tenga habilitado)
- Cerebras: `cerebras/`… (si tiene acceso)
- LM Studio: `lmstudio/`… (local; la llamada a herramientas depende del modo de API)

### Vision: envío de imágenes (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imágenes.

### Agregadores / puertas de enlace alternativas

Si tiene claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; use `openclaw models scan` para encontrar candidatos con capacidad de herramientas e imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación mediante `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puede incluir en la matriz en vivo (si tiene credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Vía `models.providers` (endpoints personalizados): `minimax` (nube/API), más cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intente codificar "todos los modelos" en los documentos. La lista autorizada es lo que `discoverModels(...)` devuelva en su máquina + las claves que estén disponibles.

## Credenciales (nunca las confirme)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice "sin credenciales", depure de la misma manera que depuraría `openclaw models list` / la selección de modelo.

- Perfiles de autenticación por agente: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (esto es lo que significa "profile keys" en las pruebas en vivo)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado heredado: `~/.openclaw/credentials/` (se copia en el directorio home en vivo por etapas cuando está presente, pero no en el almacenamiento principal de claves de perfil)
- Las ejecuciones locales en vivo copian la configuración activa, los archivos `auth-profiles.json` por agente, el `credentials/` heredado y los directorios de autenticación de CLI externos compatibles en un directorio home de prueba temporal de forma predeterminada; los directorios home en vivo por etapas omiten `workspace/` y `sandboxes/`, y las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan para que las sondas se mantengan fuera de su espacio de trabajo host real.

Si desea confiar en claves de entorno (por ejemplo, exportadas en su `~/.profile`), ejecute pruebas locales después de `source ~/.profile`, o use los ejecutores de Docker a continuación (pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Medios de flujo de trabajo de ComfyUI en vivo

- Prueba: `extensions/comfy/comfy.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Alcance:
  - Ejercita las rutas de imagen, video y `music_generate` de Comfy incluidas
  - Omite cada capacidad a menos que `models.providers.comfy.<capability>` esté configurado
  - Útil después de cambiar el envío, sondeo, descargas o registro de complementos del flujo de trabajo de Comfy

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Arnés: `pnpm test:live:media image`
- Alcance:
  - Enumera cada complemento de proveedor de generación de imágenes registrado
  - Carga las variables de entorno del proveedor faltantes desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Utiliza claves API en vivo/de entorno antes que los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no ocultan las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta las variantes de generación de imágenes existentes a través de la capacidad de tiempo de ejecución compartida:
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Proveedores incluidos actualmente cubiertos:
  - `openai`
  - `google`
- Restricción opcional:
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de env

## Generación de música en vivo

- Prueba: `extensions/music-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media music`
- Ámbito:
  - Ejercita la ruta del proveedor de generación de música compartida e incluida
  - Actualmente cubre Google y MiniMax
  - Carga las variables de entorno del proveedor desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/env delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada solo de prompt
    - `edit` cuando el proveedor declara `capabilities.edit.enabled`
  - Cobertura actual de carril compartido:
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: archivo en vivo de Comfy separado, no este barrido compartido
- Restricción opcional:
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de env

## Generación de video en vivo

- Prueba: `extensions/video-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media video`
- Ámbito:
  - Ejercita la ruta del proveedor de generación de video compartida e incluida
  - Por defecto, utiliza la ruta de humo segura para el lanzamiento: proveedores que no sean FAL, una solicitud de texto a video por proveedor, un prompt de langosta de un segundo y un límite de operaciones por proveedor de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` por defecto)
  - Omite FAL por defecto porque la latencia de la cola del lado del proveedor puede dominar el tiempo de lanzamiento; pasa `--video-providers fal` o `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` para ejecutarlo explícitamente
  - Carga las variables de entorno del proveedor desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Utiliza claves API en vivo/de entorno antes que los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta solo `generate` por defecto
  - Establece `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` para también ejecutar los modos de transformación declarados cuando estén disponibles:
    - `imageToVideo` cuando el proveedor declara `capabilities.imageToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de imagen local respaldada por búfer en el barrido compartido
    - `videoToVideo` cuando el proveedor declara `capabilities.videoToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de video local respaldada por búfer en el barrido compartido
  - Proveedores `imageToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `vydra` porque el `veo3` incluido es solo de texto y el `kling` incluido requiere una URL de imagen remota
  - Cobertura específica del proveedor Vydra:
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ese archivo ejecuta `veo3` de texto a video más un carril `kling` que utiliza un accesorio de URL de imagen remota por defecto
  - Cobertura en vivo actual `videoToVideo`:
    - `runway` solo cuando el modelo seleccionado es `runway/gen4_aleph`
  - Proveedores `videoToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `alibaba`, `qwen`, `xai` porque esas rutas actualmente requieren URLs de referencia remotas `http(s)` / MP4
    - `google` porque el carril compartido actual de Gemini/Veo utiliza entrada respaldada por búfer local y esa ruta no se acepta en el barrido compartido
    - `openai` porque al carril compartido actual le faltan garantías de acceso de repintado/remix de video específicas de la organización
- Reducción opcional:
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` para incluir todos los proveedores en el barrido predeterminado, incluido FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` para reducir el límite de operaciones de cada proveedor para una ejecución de prueba rápida (smoke) agresiva
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del perfil y omitir las anulaciones solo de entorno

## Arnes de media en vivo

- Comando: `pnpm test:live:media`
- Propósito:
  - Ejecuta las suites compartidas de imagen, música y video en vivo a través de un punto de entrada nativo del repositorio
  - Carga automáticamente las variables de entorno del proveedor que faltan desde `~/.profile`
  - Reduce automáticamente cada suite a los proveedores que actualmente tienen autenticación utilizable de forma predeterminada
  - Reutiliza `scripts/test-live.mjs`, por lo que el comportamiento de latido (heartbeat) y modo silencioso (quiet-mode) se mantiene consistente
- Ejemplos:
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo correspondiente a la clave de perfil dentro de la imagen Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando tu directorio de configuración local y espacio de trabajo (y sourceando `~/.profile` si está montado). Los puntos de entrada locales correspondientes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker tienen como valor predeterminado un límite de prueba rápida (smoke) más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` tiene como valor predeterminado `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene como valores predeterminados `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anula esas variables de entorno cuando
  quieras explícitamente el escaneo exhaustivo más grande.
- `test:docker:all` crea la imagen Docker de live una vez a través de `test:docker:live-build` y luego la reutiliza para los dos carriles Docker de live.
- Ejecutores de prueba de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelos en vivo también montan solo los directorios de autenticación de CLI necesarios (o todos los soportados cuando la ejecución no se limita), y luego los copian en el directorio del contenedor antes de la ejecución para que OAuth de CLI externa pueda actualizar los tokens sin mutar el almacenamiento de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Prueba de humo del arnés del servidor de aplicaciones Codex: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes de Gateway (dos contenedores, autenticación WS + estado): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Puente de canal MCP (Gateway inicializado + puente stdio + prueba de humo de marco de notificación sin procesar de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Complementos (prueba de humo de instalación + alias `/plugin` + semánticas de reinicio del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de modelo en vivo también montan el checkout actual en modo de solo lectura y lo organizan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de ejecución ligera mientras se ejecuta Vitest contra tu código fuente/configuración local exacta. El paso de organización omite las grandes cachés locales y las salidas de compilación de la aplicación, como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y los directorios de salida de Gradle o `.build` locales de la aplicación, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la pasarela no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que también pasa `OPENCLAW_LIVE_GATEWAY_*` cuando necesites limitar o excluir la cobertura en vivo de la pasarela en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de pasarela OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor Open WebUI anclado contra esa pasarela, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar extraer la imagen de Open WebUI y Open WebUI puede necesitar terminar su propia configuración de inicio en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor de Gateway sembrado, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envío saliente y notificaciones de canal y permisos estilo Claude a través del puente stdio MCP real. La verificación de notaciones inspecciona los marcos stdio MCP sin procesar directamente para que la prueba de humo valide lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a exponer.

Prueba de humo de subproceso en lenguaje sencillo de ACP manual (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de subprocesos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` para verificar solo las variables de entorno obtenidas de `OPENCLAW_PROFILE_FILE`, utilizando directorios de configuración/espacio de trabajo temporales y sin montajes de autenticación de CLI externos
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como solo lectura bajo `/host-auth...`, luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedor reducidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anular manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen `openclaw:local-live` existente para reejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para garantizar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por el smoke test de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de la imagen fijada de Open WebUI

## Estado de la documentación

Ejecute las comprobaciones de documentación después de editar los documentos: `pnpm check:docs`.
Ejecute la validación completa de anclajes de Mintlify cuando también necesite comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente del gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe config + autenticación forzada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simuladas a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de varios turnos que afirman el orden de las herramientas, la transferencia del historial de la sesión y los límites del entorno limitado.

Las evaluaciones futuras deben mantenerse deterministas primero:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso frente a evitación, bloqueo, inyección de mensajes).
- Evaluaciones en vivo opcionales (opt-in, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma del complemento y del canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de aserciones de forma y comportamiento. El carril `pnpm test` unitario predeterminado omite intencionalmente estos archivos compartidos de costura y humo; ejecute los comandos de contrato explícitamente cuando toque superficies de canales o proveedores compartidos.

### Comandos

- Todos los contratos: `pnpm test:contracts`
- Solo contratos de canal: `pnpm test:contracts:channels`
- Solo contratos de proveedor: `pnpm test:contracts:plugins`

### Contratos de canal

Ubicados en `src/channels/plugins/contracts/*.contract.test.ts`:

- **plugin** - Forma básica del complemento (id, nombre, capacidades)
- **setup** - Contrato del asistente de configuración
- **session-binding** - Comportamiento de vinculación de sesión
- **outbound-payload** - Estructura del payload del mensaje
- **inbound** - Manejo de mensajes entrantes
- **actions** - Manejadores de acciones del canal
- **threading** - Manejo del ID del hilo
- **directory** - API de directorio/lista
- **group-policy** - Cumplimiento de la política de grupo

### Contratos de estado del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondas de estado del canal
- **registry** - Forma del registro de complementos

### Contratos del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato del flujo de autenticación
- **auth-choice** - Elección/selección de autenticación
- **catalog** - API del catálogo de modelos
- **discovery** - Descubrimiento de complementos
- **loader** - Carga de complementos
- **runtime** - Tiempo de ejecución del proveedor
- **shape** - Forma/interfaz del complemento
- **wizard** - Asistente de configuración

### Cuándo ejecutar

- Después de cambiar las exportaciones o las subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o el descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (guía)

Cuando solucione un problema de proveedor/modelo descubierto en vivo:

- Agregue una regresión segura para CI si es posible (proveedor simulado/stub, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantenga la prueba en vivo reducida y opcional a través de variables de entorno
- Prefiera apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Guardrail de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo muestreado por clase de SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si añades una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en ids de objetivos no clasificados para que las nuevas clases no puedan omitirse silenciosamente.
