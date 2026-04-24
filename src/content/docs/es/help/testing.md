---
summary: "Kit de pruebas: suites unit/e2e/live, ejecutores Docker y qué cubre cada prueba"
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

- Full gate (esperado antes del push): `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Ejecución local de suite completa más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de vigilancia directo de Vitest: `pnpm test:watch`
- El direccionamiento directo de archivos ahora también enruta rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones segmentadas primero cuando estás iterando sobre un único fallo.
- Sitio de QA con respaldo de Docker: `pnpm qa:lab:up`
- Carril de QA con respaldo de VM Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando modificas pruebas o quieres mayor seguridad:

- Coverage gate: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo en vivo silenciosamente: `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Prueba rápida de costos de Moonshot/Kimi: con `MOONSHOT_API_KEY` configurado, ejecute
  `openclaw models list --provider moonshot --json`, luego ejecute un
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  aislado contra `moonshot/kimi-k2.6`. Verifique que el JSON informe Moonshot/K2.6 y que
  la transcripción del asistente almacene `usage.cost` normalizados.

Consejo: cuando solo necesite un caso fallido, prefiera reducir las pruebas en vivo mediante las variables de entorno de lista de permitidos descritas a continuación.

## Ejecutores específicos de QA

Estos comandos se encuentran junto a las suites de pruebas principales cuando necesita realismo de laboratorio de QA:

CI ejecuta QA Lab en flujos de trabajo dedicados. `Parity gate` se ejecuta en PRs coincidentes y
desde despacho manual con proveedores simulados. `QA-Lab - All Lanes` se ejecuta noche a noche en
`main` y desde despacho manual con el mock parity gate, el carril Matrix en vivo y
el carril Telegram en vivo administrado por Convex como trabajos paralelos. `OpenClaw Release Checks`
ejecuta los mismos carriles antes de la aprobación de la versión.

- `pnpm openclaw qa suite`
  - Ejecuta escenarios de QA con respaldo en repositorio directamente en el host.
  - Ejecuta múltiples escenarios seleccionados en paralelo de forma predeterminada con trabajadores
    de gateway aislados. `qa-channel` tiene una concurrencia predeterminada de 4 (limitada por la
    cantidad de escenarios seleccionados). Use `--concurrency <count>` para ajustar la cantidad
    de trabajadores, o `--concurrency 1` para el carril serie anterior.
  - Sale con un valor distinto de cero cuando algún escenario falla. Use `--allow-failures` cuando desee
    artefactos sin un código de salida de error.
  - Soporta los modos de proveedor `live-frontier`, `mock-openai` y `aimock`.
    `aimock` inicia un servidor de proveedor local respaldado por AIMock para cobertura experimental
    de fixtures y protocolos-mock sin reemplazar el carril `mock-openai` que es consciente del escenario.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta la misma suite de QA dentro de una máquina virtual Linux Multipass desechable.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza los mismos indicadores de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones en vivo reenvían las entradas de autenticación de QA compatibles que son prácticas para el huésped:
    claves de proveedor basadas en variables de entorno, la ruta de configuración del proveedor de QA en vivo y `CODEX_HOME`
    cuando está presente.
  - Los directorios de salida deben permanecer en la raíz del repositorio para que el huésped pueda escribir de nuevo a través
    del espacio de trabajo montado.
  - Escribe el informe y resumen de QA normal más los registros de Multipass en
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA respaldado por Docker para trabajo de QA estilo operador.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construye un paquete tarball npm desde el checkout actual, lo instala globalmente en
    Docker, ejecuta el registro no interactivo de la clave API de OpenAI, configura Telegram
    por defecto, verifica que habilitar el complemento instala las dependencias de tiempo de ejecución
    bajo demanda, ejecuta doctor y ejecuta un turno de agente local contra un punto final de OpenAI
    simulado.
  - Use `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` para ejecutar el mismo carril de instalación empaquetada
    con Discord.
- `pnpm test:docker:bundled-channel-deps`
  - Empaqueta e instala la compilación actual de OpenClaw en Docker, inicia el Gateway
    con OpenAI configurado y luego habilita los canales/complementos incluidos mediante ediciones
    de configuración.
  - Verifica que el descubrimiento de configuración deja ausentes las dependencias de tiempo de ejecución del complemento no configurado,
    la primera ejecución configurada del Gateway o doctor instala las dependencias de tiempo de ejecución de cada complemento incluido
    bajo demanda, y un segundo reinicio no
    reinstala las dependencias que ya estaban activadas.
  - También instala una línea base npm antigua conocida, habilita Telegram antes de ejecutar
    `openclaw update --tag <candidate>` y verifica que el doctor posterior a la actualización del candidato repare las dependencias de tiempo de ejecución del canal incluido sin una
    reparación posterior a la instalación en el lado del arnés.
- `pnpm openclaw qa aimock`
  - Inicia solo el servidor del proveedor local AIMock para pruebas de humo del protocolo directo.
- `pnpm openclaw qa matrix`
  - Ejecuta el carril de QA en vivo de Matrix contra un homeserver Tuwunel respaldado por Docker desechable.
  - Este host de QA es solo para repo/dev hoy. Las instalaciones empaquetadas de OpenClaw no envían `qa-lab`, por lo que no exponen `openclaw qa`.
  - Las checkouts del repo cargan el ejecutor incluido directamente; no se necesita ningún paso de instalación de plugin separado.
  - Aprovisiona tres usuarios temporales de Matrix (`driver`, `sut`, `observer`) más una sala privada, luego inicia un hijo de puerta de enlace de QA con el plugin real de Matrix como transporte SUT.
  - Utiliza la imagen estable de Tuwunel fijada `ghcr.io/matrix-construct/tuwunel:v1.5.1` por defecto. Anule con `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` cuando necesite probar una imagen diferente.
  - Matrix no expone marcas de fuente de credenciales compartidas porque el carril aprovisiona usuarios desechables localmente.
  - Escribe un informe de QA de Matrix, un resumen, un artefacto de eventos observados y un registro de salida combinado stdout/stderr bajo `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real utilizando los tokens del bot de controlador y SUT desde el entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El id del grupo debe ser el id de chat numérico de Telegram.
  - Admite `--credential-source convex` para credenciales compartidas agrupadas. Use el modo env por defecto, o establezca `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` para optar por contratos agrupados.
  - Sale con un valor distinto de cero cuando falla cualquier escenario. Use `--allow-failures` cuando quiera artefactos sin un código de salida fallido.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilite el Modo de Comunicación Bot a Bot en `@BotFather` para ambos bots y asegúrese de que el bot de controlador pueda observar el tráfico del bot del grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados bajo `.artifacts/qa-e2e/...`.

Los carriles de transporte en vivo comparten un contrato estándar para que los nuevos transportes no se desvíen:

`qa-channel` sigue siendo la suite de QA sintética amplia y no es parte de la matriz de cobertura de transporte en vivo.

| Lane     | Canary | Mención de bloqueo | Bloqueo de lista permitida | Respuesta de nivel superior | Reanudación de reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda |
| -------- | ------ | ------------------ | -------------------------- | --------------------------- | ----------------------- | ------------------- | ------------------- | ----------------------- | ---------------- |
| Matriz   | x      | x                  | x                          | x                           | x                       | x                   | x                   | x                       |                  |
| Telegram | x      |                    |                            |                             |                         |                     |                     |                         | x                |

### Credenciales compartidas de Telegram vía Convex (v1)

Cuando `--credential-source convex` (o `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) está habilitado para `openclaw qa telegram`, el laboratorio de QA adquiere un contrato exclusivo de un grupo respaldado por Convex, envía latidos a ese contrato mientras se ejecuta el carril y libera el contrato al apagar.

Andamiaje del proyecto Convex de referencia:

- `qa/convex-credential-broker/`

Variables de entorno requeridas:

- `OPENCLAW_QA_CONVEX_SITE_URL` (por ejemplo `https://your-deployment.convex.site`)
- Un secreto para el rol seleccionado:
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` para `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` para `ci`
- Selección de rol de credencial:
  - CLI: `--credential-role maintainer|ci`
  - Predeterminado de entorno: `OPENCLAW_QA_CREDENTIAL_ROLE` (predeterminado a `ci` en CI, `maintainer` de lo contrario)

Variables de entorno opcionales:

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (predeterminado `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (predeterminado `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (predeterminado `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (predeterminado `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (predeterminado `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de rastro opcional)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permite URLs de Convex de bucle invertido `http://` para el desarrollo local únicamente.

`OPENCLAW_QA_CONVEX_SITE_URL` debe usar `https://` en funcionamiento normal.

Los comandos de administración de mantenimiento (añadir/eliminar/listar grupo) requieren específicamente `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`.

Ayudantes de CLI para los mantenedores:

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Use `--json` para una salida legible por máquina en scripts y utilidades de CI.

Contrato de endpoint predeterminado (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

- `POST /acquire`
  - Solicitud: `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Éxito: `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Agotado/reinteligible: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Éxito: `{ status: "ok" }` (o vacío `2xx`)
- `POST /release`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Éxito: `{ status: "ok" }` (o vacío `2xx`)
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

Forma del payload para el tipo Telegram:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` debe ser una cadena de ID de chat de Telegram numérica.
- `admin/add` valida esta forma para `kind: "telegram"` y rechaza payloads malformados.

### Agregar un canal a QA

Agregar un canal al sistema QA de markdown requiere exactamente dos cosas:

1. Un adaptador de transporte para el canal.
2. Un paquete de escenarios que ejercite el contrato del canal.

No agregues una nueva raíz de comando QA de nivel superior cuando el host compartido `qa-lab` pueda
ser dueño del flujo.

`qa-lab` es propietario de la mecánica del host compartido:

- la raíz de comando `openclaw qa`
- inicio y cierre del conjunto de pruebas (suite)
- concurrencia de trabajadores
- escritura de artefactos
- generación de informes
- ejecución de escenarios
- alias de compatibilidad para escenarios `qa-channel` más antiguos

Los complementos del corredor (runner plugins) son propietarios del contrato de transporte:

- cómo se monta `openclaw qa <runner>` debajo de la raíz compartida `qa`
- cómo se configura la puerta de enlace (gateway) para ese transporte
- cómo se verifica la preparación (readiness)
- cómo se inyectan los eventos entrantes
- cómo se observan los mensajes salientes
- cómo se exponen las transcripciones y el estado normalizado del transporte
- cómo se ejecutan las acciones respaldadas por el transporte
- cómo se maneja el restablecimiento o la limpieza específicos del transporte

El mínimo requisito de adopción para un nuevo canal es:

1. Mantén `qa-lab` como el propietario de la raíz `qa` compartida.
2. Implementa el ejecutor del transporte en la costura del host `qa-lab` compartida.
3. Mantén los mecánicos específicos del transporte dentro del complemento del ejecutor o el arnés del canal.
4. Monta el ejecutor como `openclaw qa <runner>` en lugar de registrar un comando raíz competidor.
   Los complementos del ejecutor deben declarar `qaRunners` en `openclaw.plugin.json` y exportar una matriz `qaRunnerCliRegistrations` coincidente desde `runtime-api.ts`.
   Mantén `runtime-api.ts` ligero; la ejecución diferida de la CLI y del ejecutor debe permanecer detrás de puntos de entrada separados.
5. Crea o adapta escenarios en markdown bajo los directorios temáticos `qa/scenarios/`.
6. Utiliza los asistentes de escenarios genéricos para los nuevos escenarios.
7. Mantén los alias de compatibilidad existentes funcionando a menos que el repositorio esté realizando una migración intencional.

La regla de decisión es estricta:

- Si el comportamiento puede expresarse una vez en `qa-lab`, ponlo en `qa-lab`.
- Si el comportamiento depende de un transporte de canal, manténlo en ese complemento del ejecutor o arnés del complemento.
- Si un escenario necesita una nueva capacidad que más de un canal puede usar, agrega un asistente genérico en lugar de una rama específica del canal en `suite.ts`.
- Si un comportamiento solo es significativo para un transporte, mantén el escenario específico del transporte y haz que eso sea explícito en el contrato del escenario.

Los nombres preferidos para los asistentes genéricos de nuevos escenarios son:

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

Los alias de compatibilidad permanecen disponibles para escenarios existentes, incluyendo:

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

El trabajo de nuevos canales debe usar los nombres de ayudantes genéricos.
Los alias de compatibilidad existen para evitar una migración de "flag day", no como modelo para
la creación de nuevos escenarios.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como un "realismo creciente" (y una mayor inestabilidad/costo):

### Unitaria / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: diez ejecuciones secuenciales de fragmentos (`vitest.full-*.config.ts`) sobre los proyectos Vitest con ámbito existentes
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, y las pruebas de nodo `ui` en la lista blanca cubiertas por `vitest.unit.config.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápida y estable
- Nota de proyectos:
  - El comando `pnpm test` sin destino ahora ejecuta once configuraciones de fragmentos más pequeñas (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso gigante de proyecto raíz nativo. Esto reduce el pico de RSS en máquinas cargadas y evita que el trabajo de auto-respuesta/extensión prive de recursos a suites no relacionadas.
  - `pnpm test --watch` todavía usa el gráfico de proyecto raíz nativo `vitest.config.ts`, porque un bucle de vigilancia multi-fragmento no es práctico.
  - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` dirigen objetivos explícitos de archivo/directorio a través de carriles con ámbito primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el impuesto completo de inicio del proyecto raíz.
  - `pnpm test:changed` expande las rutas de git modificadas en los mismos carriles con ámbito cuando el diff solo toca archivos fuente/prueba enrutables; las ediciones de configuración/configuración aún vuelven a la reejecución amplia del proyecto raíz.
  - `pnpm check:changed` es la puerta de enlace local inteligente normal para un trabajo estrecho. Clasifica el diff en core, pruebas de core, extensiones, pruebas de extensiones, aplicaciones, documentos, metadatos de lanzamiento y herramientas, y luego ejecuta los carriles de verificación de tipo/lint/prueba coincidentes. Los cambios del SDK público de complementos y del contrato de complementos incluyen la validación de extensiones porque las extensiones dependen de esos contratos principales. Los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones de versión/configuración/dependencias raíz específicas en lugar de la suite completa, con una guardia que rechaza los cambios de paquete fuera del campo de versión de nivel superior.
  - Las pruebas unitarias ligeras de importación de agentes, comandos, complementos, ayudantes de auto-respuesta, `plugin-sdk` y áreas similares de utilidad pura se enrutan a través del carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con mucho estado/runtime permanecen en los carriles existentes.
  - Los archivos fuente de ayuda `plugin-sdk` y `commands` seleccionados también asignan las ejecuciones en modo modificado a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones de ayuda evitan volver a ejecutar la suite pesada completa para ese directorio.
  - `auto-reply` ahora tiene tres depósitos dedicados: ayudantes principales de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. Esto mantiene el trabajo del arnés de respuesta más pesado fuera de las pruebas baratas de estado/chunk/token.
- Nota sobre el ejecutor integrado:
  - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de ejecución de compactación,
    mantenga ambos niveles de cobertura.
  - Agregue regresiones de ayuda enfocadas para límites puros de enrutamiento/normalización.
  - Mantenga también las suites de integración del ejecutor integrado saludables:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esas suites verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayuda no son un
    sustituto suficiente para esas rutas de integración.
- Nota sobre el grupo:
  - La configuración base de Vitest ahora tiene por defecto `threads`.
  - La configuración compartida de Vitest también soluciona `isolate: false` y utiliza el ejecutor no aislado en los proyectos raíz, e2e y configuraciones en vivo.
  - El carril de la interfaz de usuario raíz mantiene su configuración `jsdom` y optimizador, pero ahora también se ejecuta en el ejecutor compartido no aislado.
  - Cada fragmento `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false` de la configuración compartida de Vitest.
  - El iniciador compartido `scripts/run-vitest.mjs` ahora también añade `--no-maglev` para los procesos secundarios de Node de Vitest por defecto para reducir la sobrecarga de compilación de V8 durante las ejecuciones locales grandes. Establezca `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si necesita comparar con el comportamiento estándar de V8.
- Nota de iteración rápida local:
  - `pnpm changed:lanes` muestra qué carriles arquitectónicos activa una diferencia.
  - El enlace de preconfirmación ejecuta `pnpm check:changed --staged` después del formateo/linting preparado, por lo que las confirmaciones solo del núcleo no pagan el costo de las pruebas de extensión a menos que toquen contratos públicos de cara a la extensión. Las confirmaciones solo de metadatos de lanzamiento se mantienen en el carril de versión/configuración/dependencia-raíz objetivo.
  - Si el conjunto exacto de cambios preparados ya se validó con puertas iguales o más fuertes, use `scripts/committer --fast "<message>" <files...>` para omitir solo la reejecución del enlace con alcance modificado. El formateo/linting preparado todavía se ejecutan. Mencione las puertas completadas en su entrega. Esto también es aceptable después de que una falla aislada y errática del enlace se vuelve a ejecutar y pasa con prueba de alcance.
  - `pnpm test:changed` se enruta a través de carriles con alcance cuando las rutas modificadas se asignan claramente a un conjunto más pequeño.
  - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento de enrutamiento, solo con un límite más alto de trabajadores.
  - El autoescalado de trabajadores locales ahora es intencionalmente conservador y también se retrae cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones concurrentes de Vitest causan menos daño por defecto.
  - La configuración base de Vitest marca los archivos de proyectos/configuración como `forceRerunTriggers` para que las reejecuciones en modo modificado permanezcan correctas cuando cambia el cableado de las pruebas.
  - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles; configure `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea una ubicación de caché explícita para el perfilado directo.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita los informes de duración de importación de Vitest además de la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a los archivos modificados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara la `test:changed` enrutada con la ruta nativa del proyecto raíz para ese diff confirmado e imprime el tiempo transcurrido más el RSS máximo de macOS.
- `pnpm test:perf:changed:bench -- --worktree` realiza un benchmark del árbol sucio actual enrutando la lista de archivos modificados a través de `scripts/test-projects.mjs` y la configuración raíz de Vitest.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montón del ejecutor para la suite unitaria con el paralelismo de archivos deshabilitado.

### Estabilidad (gateway)

- Comando: `pnpm test:stability:gateway`
- Configuración: `vitest.gateway.config.ts`, forzado a un trabajador
- Alcance:
  - Inicia un Gateway de bucle invertido real con diagnósticos habilitados de forma predeterminada
  - Impulsa mensajes sintéticos del gateway, memoria y rotación de grandes cargas útiles a través de la ruta de eventos de diagnóstico
  - Consulta `diagnostics.stability` a través del RPC de WebSocket del Gateway
  - Cubre los auxiliares de persistencia del paquete de estabilidad de diagnóstico
  - Asevera que la grabadora permanece acotada, que las muestras sintéticas de RSS se mantienen por debajo del presupuesto de presión y que las profundidades de la cola por sesión se drenan hasta cero
- Expectativas:
  - Seguro para CI y sin claves
  - Carril estrecho para el seguimiento de regresiones de estabilidad, no un sustituto de la suite completa del Gateway

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts` y pruebas E2E de bundled-plugin bajo `extensions/`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Anulaciones útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar la cuenta de trabajadores (limitada a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a activar la salida detallada de la consola.
- Alcance:
  - Comportamiento integral de extremo a extremo de pasarela de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: Prueba de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `extensions/openshell/src/backend.e2e.test.ts`
- Alcance:
  - Inicia una pasarela OpenShell aislada en el host mediante Docker
  - Crea un entorno limitado (sandbox) desde un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw sobre `sandbox ssh-config` real + ejecución SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del entorno limitado
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local y un demonio Docker funcional
  - Utiliza `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la pasarela de prueba y el entorno limitado
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI o script de contenedor no predeterminado

### En vivo (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, y pruebas en vivo de complementos incluidos bajo `extensions/`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona este proveedor/modelo realmente _hoy_ con credenciales reales?”
  - Detectar cambios en el formato del proveedor, peculiaridades de llamada a herramientas, problemas de autenticación y comportamiento de límite de tasa
- Expectativas:
  - No estable en CI por diseño (redes reales, políticas de proveedor reales, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Prefiere ejecutar subconjuntos reducidos en lugar de “todo”
- Las ejecuciones en vivo obtienen el código fuente `~/.profile` para recuperar las claves de API faltantes.
- De forma predeterminada, las ejecuciones en vivo aún aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los dispositivos unitarios no puedan mutar su `~/.openclaw` real.
- Establezca `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando intencionalmente necesite que las pruebas en vivo usen su directorio de inicio real.
- `pnpm test:live` ahora tiene de forma predeterminada un modo más silencioso: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso adicional de `~/.profile` y silencia los registros de arranque de la puerta de enlace y el ruido de Bonjour. Establezca `OPENCLAW_LIVE_TEST_QUIET=0` si desea volver a tener los registros de inicio completos.
- Rotación de claves de API (específica del proveedor): configure `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por ejecución en vivo a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan en las respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites en vivo ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activamente incluso cuando la captura de la consola de Vitest está en silencio.
  - `vitest.live.config.ts` deshabilita la interceptación de la consola de Vitest para que las líneas de progreso del proveedor/puerta de enlace se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos de la puerta de enlace/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Editando lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Tocando la red de la puerta de enlace / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depurando "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute una `pnpm test:live` limitada

## Live: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **cada comando anunciado actualmente** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración precondicionada/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación comando por comando del gateway `node.invoke` para el nodo Android seleccionado.
- Requisitos previos:
  - Aplicación Android ya conectada y vinculada al gateway.
  - Aplicación mantenida en primer plano.
  - Permisos/consentimiento de captura otorgados para las capacidades que esperas que pasen.
- Anulaciones de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/es/platforms/android)

## En vivo: prueba rápida del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- "Modelo directo" nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba rápida del gateway" nos indica si la tubería completa del gateway+agente funciona para ese modelo (sesiones, historial, herramientas, políticas de sandbox, etc.).

### Capa 1: Finalización directa del modelo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar los modelos para los que tienes credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en la prueba rápida del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos modernos (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos modernos
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
  - Los barridos modernos/de todos por defecto tienen un límite curado de alta señal; establece `OPENCLAW_LIVE_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite menor.
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacenamiento de perfiles y alternativas de entorno
  - Establecer `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar el uso solo del **almacenamiento de perfiles**
- Por qué existe:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la tubería del agente del gateway está rota"
  - Contiene pequeñas regresiones aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Gateway + prueba de humo del agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar un gateway dentro del proceso
  - Crear/Parchear una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos con claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - funciona una invocación real de herramienta (sondeo de lectura)
    - sondeos opcionales de herramientas adicionales (sondeo de ejecución + lectura)
    - las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que puedas explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal y luego `read`.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Por defecto: lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias de la lista de permitidos moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista de comas) para acotar
  - Los barridos modernos/de todo el gateway por defecto usan un límite curado de alta señal; establezca `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite más pequeño.
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separados por comas)
- Los sondeos de herramienta + imagen siempre están activos en esta prueba en vivo:
  - sondeo `read` + sondeo `exec+read` (estrés de herramienta)
  - el sondeo de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (alto nivel):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje multimodal del usuario al modelo
    - Afirmación: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puedes probar en tu máquina (y los ids exactos de `provider/model`), ejecuta:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del backend CLI (Claude, Codex, Gemini u otras CLIs locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente usando un backend CLI local, sin tocar tu configuración predeterminada.
- Los valores predeterminados de prueba de humo específicos del backend residen en la definición de `cli-backend.ts` de la extensión propietaria.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Proveedor/modelo predeterminado: `claude-cli/claude-sonnet-4-6`
  - El comportamiento de comando/argumentos/imagen proviene de los metadatos del plugin del backend CLI propietario.
- Anulaciones (opcional):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un adjunto de imagen real (las rutas se inyectan en el prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos CLI en lugar de inyección en el prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando `IMAGE_ARG` está configurado.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` para desactivar la sonda de continuidad de sesión predeterminada Claude Sonnet -> Opus (establézcalo en `1` para forzarla cuando el modelo seleccionado admita un objetivo de cambio).

Ejemplo:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Receta Docker:

```bash
pnpm test:docker:live-cli-backend
```

Recetas Docker de un solo proveedor:

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notas:

- El ejecutor Docker se encuentra en `scripts/test-live-cli-backend-docker.sh`.
- Ejecuta la prueba de humo del backend CLI en vivo dentro de la imagen Docker del repositorio como el usuario no root `node`.
- Resuelve los metadatos de prueba de humo de CLI desde la extensión propietaria, luego instala el paquete de CLI de Linux coincidente (`@anthropic-ai/claude-code`, `@openai/codex` o `@google/gemini-cli`) en un prefijo escribible en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` requiere OAuth de suscripción portátil de Claude Code a través de `~/.claude/.credentials.json` con `claudeAiOauth.subscriptionType` o `CLAUDE_CODE_OAUTH_TOKEN` de `claude setup-token`. Primero prueba `claude -p` directo en Docker, luego ejecuta dos turnos de CLI-backend del Gateway sin conservar las variables de entorno de la API key de Anthropic. Este carril de suscripción deshabilita las sondas de MCP/herramientas e imágenes de Claude de forma predeterminada porque Claude actualmente enruta el uso de aplicaciones de terceros a través de la facturación de uso adicional en lugar de los límites normales del plan de suscripción.
- La prueba de humo de CLI-backend en vivo ahora ejercita el mismo flujo de extremo a extremo para Claude, Codex y Gemini: turno de texto, turno de clasificación de imágenes y luego llamada a herramienta MCP `cron` verificada a través de la CLI del Gateway.
- La prueba de humo predeterminada de Claude también parchea la sesión de Sonnet a Opus y verifica que la sesión reanudada todavía recuerde una nota anterior.

## En vivo: Prueba de humo de enlace ACP (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de enlace de conversación ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación sintética del canal de mensajes en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Habilitar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valores predeterminados:
  - Agentes ACP en Docker: `claude,codex,gemini`
  - Agente ACP para `pnpm test:live ...` directo: `claude`
  - Canal sintético: contexto de conversación estilo DM de Slack
  - Backend de ACP: `acpx`
- Invalidaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.4`
- Notas:
  - Este carril utiliza la superficie `chat.send` de la puerta de enlace con campos de ruta de origen sintéticos solo para administradores, para que las pruebas puedan adjuntar contexto del canal de mensajes sin fingir entregar externamente.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` no está definido, la prueba utiliza el registro de agentes integrado del complemento `acpx` para el agente de arnés ACP seleccionado.

Ejemplo:

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Receta de Docker:

```bash
pnpm test:docker:live-acp-bind
```

Recetas de Docker de agente único:

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Notas de Docker:

- El ejecutor de Docker se encuentra en `scripts/test-live-acp-bind-docker.sh`.
- Por defecto, ejecuta la prueba de humo de enlace ACP (ACP bind smoke) contra todos los agentes CLI en vivo compatibles en secuencia: `claude`, `codex`, y luego `gemini`.
- Use `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`, o `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` para reducir la matriz.
- Obtiene `~/.profile`, prepara el material de autenticación CLI coincidente en el contenedor, instala `acpx` en un prefijo npm escribible, y luego instala el CLI en vivo solicitado (`@anthropic-ai/claude-code`, `@openai/codex`, o `@google/gemini-cli`) si falta.
- Dentro de Docker, el ejecutor establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveedor del perfil obtenido disponibles para el CLI de arneses secundario.

## En vivo: Prueba de humo del arnés del servidor de aplicaciones Codex

- Objetivo: validar el arnés Codex propiedad del complemento a través del método de puerta de enlace
  normal `agent`:
  - cargar el complemento `codex` incluido
  - seleccionar `OPENCLAW_AGENT_RUNTIME=codex`
  - enviar un primer turno de agente de puerta de enlace a `codex/gpt-5.4`
  - enviar un segundo turno a la misma sesión de OpenClaw y verificar que el hilo del
    servidor de aplicaciones pueda reanudarse
  - ejecutar `/codex status` y `/codex models` a través de la misma ruta de
    comando de puerta de enlace
  - ejecutar opcionalmente dos sondas de shell escaladas revisadas por Guardian: un comando benigno
    que debe ser aprobado y una carga falsa de secretos que debe ser denegada
    para que el agente pregunte de vuelta
- Prueba: `src/gateway/gateway-codex-harness.live.test.ts`
- Activar: `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modelo predeterminado: `codex/gpt-5.4`
- Sonda de imagen opcional: `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonda MCP/herramienta opcional: `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Sonda Guardian opcional: `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- La prueba de humo establece `OPENCLAW_AGENT_HARNESS_FALLBACK=none` para que un arnés de Codex
  roto no pueda pasar mediante una reversión silenciosa a PI.
- Autenticación: `OPENAI_API_KEY` del shell/perfil, más `~/.codex/auth.json` y `~/.codex/config.toml`
  copiados opcionales

Receta local:

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Receta Docker:

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Notas de Docker:

- El ejecutor Docker se encuentra en `scripts/test-live-codex-harness-docker.sh`.
- Obtiene el `~/.profile` montado, pasa `OPENAI_API_KEY`, copia los archivos
  de autenticación de la CLI de Codex cuando están presentes, instala `@openai/codex` en
  un prefijo npm montado con permisos de escritura, prepara el árbol de fuentes y luego ejecuta
  solo la prueba en vivo del arnés de Codex.
- Docker habilita la imagen, la MCP/herramienta y las sondas Guardian de forma predeterminada. Establezca
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` o
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` o
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0` cuando necesite una
  ejecución de depuración más específica.
- Docker también exporta `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, coincidiendo con la configuración de
  la prueba en vivo para que `openai-codex/*` o la reversión a PI no puedan ocultar una
  regresión del arnés de Codex.

### Recetas en vivo recomendadas

Las listas de permitidos explícitas y estrechas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo del gateway:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada a herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa la API de Gemini (clave de API).
- `google-antigravity/...` usa el puente OAuth de Antigravity (punto final de agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa la CLI local de Gemini en su máquina (autenticación separada + peculiaridades de herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API de Gemini alojada por Google a través de HTTP (clave de API / autenticación de perfil); esto es a lo que la mayoría de los usuarios se refieren con "Gemini".
  - CLI: OpenClaw usa un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (soporte de streaming/herramientas/diferencia de versión).

## En vivo: matriz de modelos (lo que cubrimos)

No hay una “lista de modelos de CI” fija (en vivo es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de pruebas de humo modernas (tool calling + imagen)

Esta es la ejecución de “modelos comunes” que esperamos que siga funcionando:

- OpenAI (non-Codex): `openai/gpt-5.4` (opcional: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar modelos Gemini 2.x más antiguos)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecutar prueba de humo del gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: tool calling (Read + Exec opcional)

Elija al menos uno por familia de proveedor:

- OpenAI: `openai/gpt-5.4` (o `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (deseable):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elija un modelo capaz de “herramientas” que tenga habilitado)
- Cerebras: `cerebras/`… (si tiene acceso)
- LM Studio: `lmstudio/`… (local; tool calling depende del modo API)

### Visión: envío de imagen (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imagen.

### Agregadores / gateways alternativos

Si tiene claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; use `openclaw models scan` para encontrar candidatos con capacidad de herramienta+imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (auth a través de `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (endpoints personalizados): `minimax` (nube/API), además de cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar "todos los modelos" en la documentación. La lista autorizada es lo que `discoverModels(...)` devuelva en tu máquina + las claves disponibles.

## Credenciales (nunca las confirmes)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo indica "sin credenciales", depura de la misma manera en que depurarías `openclaw models list` / la selección del modelo.

- Perfiles de autenticación por agente: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (esto es lo que significa "profile keys" en las pruebas en vivo)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado heredado: `~/.openclaw/credentials/` (se copia en el inicio de prueba en vivo preparado cuando está presente, pero no es el almacén principal de claves de perfil)
- Las ejecuciones locales en vivo copian la configuración activa, los archivos `auth-profiles.json` por agente, el `credentials/` heredado y los directorios de autenticación de CLI externos admitidos en un inicio de prueba temporal de manera predeterminada; los inicios de prueba en vivo preparados omiten `workspace/` y `sandboxes/`, y las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan para que los sondas no accedan a tu espacio de trabajo real del host.

Si deseas confiar en claves de entorno (por ejemplo, exportadas en tu `~/.profile`), ejecuta las pruebas locales después de `source ~/.profile`, o usa los ejecutores de Docker a continuación (ellos pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `extensions/deepgram/audio.live.test.ts`
- Habilitar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## Plan de codificación BytePlus en vivo

- Prueba: `extensions/byteplus/live.test.ts`
- Habilitar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Flujo de trabajo de medios ComfyUI en vivo

- Prueba: `extensions/comfy/comfy.live.test.ts`
- Habilitar: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Alcance:
  - Ejercita las rutas de imagen, video y `music_generate` incluidas en comfy
  - Omite cada capacidad a menos que `models.providers.comfy.<capability>` esté configurado
  - Útil después de cambiar el envío, el sondeo, las descargas o el registro de plugins del flujo de trabajo comfy

## Generación de imágenes en vivo

- Prueba: `test/image-generation.runtime.live.test.ts`
- Comando: `pnpm test:live test/image-generation.runtime.live.test.ts`
- Arnés: `pnpm test:live:media image`
- Alcance:
  - Enumera cada complemento de proveedor de generación de imágenes registrado
  - Carga las variables de entorno del proveedor faltantes desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/de entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no ocultan las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta las variantes de generación de imágenes estándar a través de la capacidad de tiempo de ejecución compartida:
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Proveedores incluidos actualmente cubiertos:
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `vydra`
  - `xai`
- Narrowing opcional:
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,xai:default-generate,xai:default-edit"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Generación de música en vivo

- Prueba: `extensions/music-generation-providers.live.test.ts`
- Habilitar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media music`
- Ámbito:
  - Ejercita la ruta del proveedor de generación de música empaquetada y compartida
  - Actualmente cubre Google y MiniMax
  - Carga las variables de entorno del proveedor desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Utiliza claves API en vivo/entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no ocultan las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizables
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada de solo prompt
    - `edit` cuando el proveedor declara `capabilities.edit.enabled`
  - Cobertura actual del carril compartido:
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: archivo en vivo de Comfy separado, no este barrido compartido
- Restricción opcional:
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Generación de video en vivo

- Prueba: `extensions/video-generation-providers.live.test.ts`
- Habilitar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media video`
- Ámbito:
  - Ejercita la ruta del proveedor de generación de video empaquetada y compartida
  - Por defecto, toma la ruta de prueba de humo segura para el lanzamiento: proveedores que no sean FAL, una solicitud de texto a video por proveedor, un prompt de langosta de un segundo y un límite de operaciones por proveedor de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` por defecto)
  - Omite FAL por defecto porque la latencia de la cola del lado del proveedor puede dominar el tiempo de lanzamiento; pasa `--video-providers fal` o `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` para ejecutarlo explícitamente
  - Carga las variables de entorno del proveedor desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Utiliza claves API en vivo/entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no ocultan las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizables
  - Ejecuta solo `generate` por defecto
  - Establezca `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` para también ejecutar los modos de transformación declarados cuando estén disponibles:
    - `imageToVideo` cuando el proveedor declara `capabilities.imageToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de imagen local respaldada por búfer en el barrido compartido
    - `videoToVideo` cuando el proveedor declara `capabilities.videoToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de video local respaldada por búfer en el barrido compartido
  - Proveedores `imageToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `vydra` porque el `veo3` incluido es solo de texto y el `kling` incluido requiere una URL de imagen remota
  - Cobertura de Vydra específica del proveedor:
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ese archivo ejecuta texto a video `veo3` más un carril `kling` que usa una fixture de URL de imagen remota por defecto
  - Cobertura en vivo `videoToVideo` actual:
    - `runway` solo cuando el modelo seleccionado es `runway/gen4_aleph`
  - Proveedores `videoToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `alibaba`, `qwen`, `xai` porque esas rutas actualmente requieren URLs de referencia `http(s)` / MP4 remotas
    - `google` porque el carril Gemini/Veo compartido actual usa entrada local respaldada por búfer y esa ruta no es aceptada en el barrido compartido
    - `openai` porque el carril compartido actual carece de garantías de acceso específicas de la organización para retoque/remix de video
- Reducción opcional:
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` para incluir cada proveedor en el barrido predeterminado, incluido FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` para reducir el límite de operaciones de cada proveedor para una ejecución de prueba de humo agresiva
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Arnés de medios en vivo

- Comando: `pnpm test:live:media`
- Propósito:
  - Ejecuta las suites de imagen, música y video en vivo compartidas a través de un punto de entrada nativo del repositorio
  - Carga automáticamente las variables de entorno del proveedor faltantes desde `~/.profile`
  - Limita automáticamente cada suite a los proveedores que actualmente tienen una autenticación utilizable de forma predeterminada
  - Reutiliza `scripts/test-live.mjs`, por lo que el comportamiento del latido y el modo silencioso se mantiene constante
- Ejemplos:
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo correspondiente a la clave de perfil dentro de la imagen Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando tu directorio de configuración local y el espacio de trabajo (y obteniendo `~/.profile` si está montado). Los puntos de entrada locales correspondientes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker tienen como valor predeterminado un límite de prueba más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` tiene como valor predeterminado `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene como valor predeterminado `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anula esas variables de entorno cuando
  desees explícitamente el escaneo exhaustivo más grande.
- `test:docker:all` construye la imagen Docker en vivo una vez a través de `test:docker:live-build`, luego la reutiliza para los dos carriles de Docker en vivo. También construye una imagen compartida `scripts/e2e/Dockerfile` a través de `test:docker:e2e-build` y la reutiliza para los ejecutores de prueba de humo del contenedor E2E que ejercitan la aplicación construida.
- Ejecutores de pruebas de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:gateway-network`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update` y `test:docker:config-reload` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelo en vivo también montan mediante bind solo los directorios de autenticación CLI necesarios (o todos los admitidos cuando la ejecución no está limitada), luego los copian en el directorio home del contenedor antes de la ejecución para que la OAuth de CLI externa pueda actualizar los tokens sin modificar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- Prueba de humo del backend CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Prueba de humo del arnés del servidor de aplicaciones Codex: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Prueba de humo de incorporación/canal/agente de tarball npm: `pnpm test:docker:npm-onboard-channel-agent` instala globalmente el tarball empaquetado de OpenClaw en Docker, configura OpenAI mediante la incorporación de referencia de entorno más Telegram por defecto, verifica que al habilitar el complemento se instalen sus dependencias de tiempo de ejecución bajo demanda, ejecuta doctor y ejecuta un turno de agente OpenAI simulado. Reutilice un tarball preconstruido con `OPENCLAW_NPM_ONBOARD_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la reconstrucción del host con `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` o cambie el canal con `OPENCLAW_NPM_ONBOARD_CHANNEL=discord`.
- Redes de Gateway (dos contenedores, autenticación WS + estado): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Regresión de razonamiento mínimo de web_search de OpenAI Responses: `pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) ejecuta un servidor simulado de OpenAI a través de Gateway, verifica que `web_search` eleve `reasoning.effort` de `minimal` a `low`, luego fuerza el rechazo del esquema del proveedor y comprueba que el detalle sin procesar aparezca en los registros de Gateway.
- Puente de canal MCP (Gateway presembrado + puente stdio + prueba de humo de marco de notificación sin procesar de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Herramientas MCP del paquete Pi (servidor MCP stdio real + perfil incrustado Pi permitir/denegar prueba de humo): `pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Limpieza MCP de Cron/subagente (Gateway real + desmontaje de hijo MCP stdio después de ejecuciones de cron aisladas y subagente de una sola vez): `pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (prueba de humo de instalación + alias `/plugin` + semántica de reinicio del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
- Prueba de humo de actualización de plugin sin cambios: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Prueba de humo de recarga de metadatos de configuración: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Dependencias de tiempo de ejecución del paquete de complementos: `pnpm test:docker:bundled-channel-deps` crea una pequeña imagen de ejecutor de Docker de manera predeterminada, compila y empaqueta OpenClaw una vez en el host y luego monta ese archivo tar en cada escenario de instalación de Linux. Reutilice la imagen con `OPENCLAW_SKIP_DOCKER_BUILD=1`, omita la reconstrucción del host después de una compilación local nueva con `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` o apunte a un archivo tar existente con `OPENCLAW_BUNDLED_CHANNEL_PACKAGE_TGZ=/path/to/openclaw-*.tgz`.
- Reduzca las dependencias de tiempo de ejecución del paquete de complementos mientras itera deshabilitando escenarios no relacionados, por ejemplo:
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`.

Para precompilar y reutilizar manualmente la imagen compartida de la aplicación compilada:

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Las anulaciones de imagen específicas de la suite como `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` todavía tienen prioridad cuando se establecen. Cuando `OPENCLAW_SKIP_DOCKER_BUILD=1` apunta a una imagen compartida remota, los scripts la descargan si aún no está local. Las pruebas de Docker de QR e instalador mantienen sus propios Dockerfiles porque validan el comportamiento del paquete/instalación en lugar del tiempo de ejecución de la aplicación compilada compartida.

Los ejecutores Docker de modelo en vivo también montan la copia actual (checkout) de solo lectura y la preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras se ejecuta Vitest contra su configuración y código fuente local exactos. El paso de preparación omite las cachés locales grandes y las salidas de compilación de la aplicación, como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y los directorios de salida de `.build` o Gradle locales de la aplicación, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También configuran `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la puerta de enlace no inicien trabajadores de canal reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pase también `OPENCLAW_LIVE_GATEWAY_*` cuando necesite acotar o excluir la cobertura en vivo de la puerta de enlace en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor anclado de Open WebUI contra esa puerta de enlace, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default` y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar extraer la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de arranque en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` de forma predeterminada) es la principal forma de proporcionarla en ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen una pequeña carga útil JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor de puerta de enlace con semilla (seeded), inicia un segundo contenedor que genera `openclaw mcp serve` y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envío saliente y notificaciones de canal y permisos al estilo Claude a través del puente stdio MCP real. La verificación de notaciones inspecciona los marcos stdio MCP sin procesar directamente, por lo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a exponer. `test:docker:pi-bundle-mcp-tools` es determinista y no necesita una clave de modelo en vivo. Construye la imagen Docker del repositorio, inicia un servidor de sonda stdio MCP real dentro del contenedor, materializa ese servidor a través del tiempo de ejecución MCP del paquete Pi incrustado, ejecuta la herramienta y luego verifica que `coding` y `messaging` mantengan las herramientas `bundle-mcp` mientras que `minimal` y `tools.deny: ["bundle-mcp"]` las filtran. `test:docker:cron-mcp-cleanup` es determinista y no necesita una clave de modelo en vivo. Inicia una puerta de enlace con semilla con un servidor de sonda stdio MCP real, ejecuta un turno cron aislado y un turno hijo de un solo disparo `/subagents spawn`, y luego verifica que el proceso hijo MCP salga después de cada ejecución.

Prueba de humo manual de subprocesos en lenguaje natural de ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de subprocesos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` para verificar solo las variables de entorno obtenidas de `OPENCLAW_PROFILE_FILE`, usando directorios de configuración/espacio de trabajo temporales y sin montajes de autenticación CLI externos
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación CLI externos bajo `$HOME` se montan como de solo lectura bajo `/host-auth...`, luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedores limitadas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anular manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para limitar la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen `openclaw:local-live` existente para reejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por el humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen anclada de Open WebUI

## Integridad de la documentación

Ejecuta comprobaciones de documentación después de editar documentos: `pnpm check:docs`.
Ejecuta la validación completa de anclajes de Mintlify cuando también necesites comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente del gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación forzada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simulada a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades están listadas en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usar y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la persistencia del historial de sesión y los límites del sandbox.

Las evaluaciones futuras deben mantenerse deterministas primero:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar llamadas a herramientas + orden, lecturas de archivos de habilidades y cableado de sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso vs. evitar, restricción, inyección de mensaje).
- Evaluaciones en vivo opcionales (opción activada, limitadas por entorno) solo después de que esté en su lugar el conjunto seguro para CI.

## Pruebas de contrato (forma del complemento y del canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de afirmaciones de forma y comportamiento. El carril `pnpm test` unit predeterminado omite intencionalmente estos archivos compartidos de seam y smoke; ejecute los comandos de contrato explícitamente cuando toque superficies compartidas de canal o proveedor.

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
- **actions** - Controladores de acciones del canal
- **threading** - Manejo del ID de hilo
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

- Después de cambiar las exportaciones o subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (orientación)

Cuando solucione un problema de proveedor/modelo descubierto en vivo:

- Agregue una regresión segura para CI si es posible (proveedor simulado/stub, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de velocidad, políticas de autenticación), mantenga la prueba en vivo limitada y opcional mediante variables de entorno
- Prefiera apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error en la canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Guardia de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los ids de ejecución de segmentos de recorrido son rechazados.
  - Si añades una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente con ids de objetivos no clasificados para que las nuevas clases no puedan omitirse silenciosamente.
