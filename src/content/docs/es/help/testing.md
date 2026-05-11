---
summary: "Kit de pruebas: suites unitarias/e2e/live, ejecutores de Docker y qué cubre cada prueba"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Pruebas"
---

OpenClaw tiene tres suites de Vitest (unitaria/integración, e2e, en vivo) y un pequeño conjunto de ejecutores de Docker. Este documento es una guía de "cómo probamos":

- Qué cubre cada suite (y qué deliberadamente _no_ cubre).
- Qué comandos ejecutar para flujos de trabajo comunes (local, pre-push, depuración).
- Cómo las pruebas en vivo descubren las credenciales y seleccionan modelos/proveedores.
- Cómo agregar regresiones para problemas reales de modelos/proveedores.

<Note>
**El stack de QA (qa-lab, qa-channel, live transport lanes)** está documentado por separado:

- [Resumen de QA](/es/concepts/qa-e2e-automation) — arquitectura, superficie de comandos, creación de escenarios.
- [Matrix QA](/es/concepts/qa-matrix) — referencia para `pnpm openclaw qa matrix`.
- [Canal de QA](/es/channels/qa-channel) — el complemento de transporte sintético utilizado por escenarios respaldados por repositorios.

Esta página cubre la ejecución de las suites de prueba regulares y los ejecutores de Docker/Parallels. La sección de ejecutores específicos de QA a continuación ([Ejecutores específicos de QA](#qa-specific-runners)) enumera las invocaciones concretas de `qa` y remite a las referencias anteriores.

</Note>

## Inicio rápido

La mayoría de los días:

- Puerta completa (esperado antes de enviar): `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Ejecución local de suite completa más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de vigilancia directo de Vitest: `pnpm test:watch`
- El direccionamiento directo de archivos ahora también enruta las rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones específicas primero cuando estás iterando en un solo fallo.
- Sitio de QA respaldado por Docker: `pnpm qa:lab:up`
- Carril de QA respaldado por VM de Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando tocas pruebas o quieres mayor confianza:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo en vivo silenciosamente: `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Barrido de modelo en vivo con Docker: `pnpm test:docker:live-models`
  - Cada modelo seleccionado ahora ejecuta un turno de texto más una pequeña prueba de estilo de lectura de archivo.
    Los modelos cuyos metadatos anuncian entrada `image` también ejecutan un pequeño turno de imagen.
    Desactive las pruebas adicionales con `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` o
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` cuando aisle fallos del proveedor.
  - Cobertura de CI: el `OpenClaw Scheduled Live And E2E Checks` diario y el
    `OpenClaw Release Checks` manual llaman ambos al flujo de trabajo reutilizable live/E2E con
    `include_live_suites: true`, que incluye trabajos matriciales separados de modelos vivos en Docker fragmentados por proveedor.
  - Para reejecuciones de CI enfocadas, despache `OpenClaw Live And E2E Checks (Reusable)`
    con `include_live_suites: true` y `live_models_only: true`.
  - Agregue nuevos secretos de proveedor de alta señal a `scripts/ci-hydrate-live-auth.sh`
    más `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` y sus
    llamadores programados/de lanzamiento.
- Prueba de humo de chat vinculado de Codex nativo: `pnpm test:docker:live-codex-bind`
  - Ejecuta un carril live de Docker contra la ruta del servidor de aplicaciones de Codex, vincula un
    MD de Slack sintético con `/codex bind`, ejercita `/codex fast` y
    `/codex permissions`, y luego verifica una respuesta simple y un archivo adjunto de imagen
    que se enrutan a través del enlace del plugin nativo en lugar de ACP.
- Prueba de humo del arnés del servidor de aplicaciones de Codex: `pnpm test:docker:live-codex-harness`
  - Ejecuta turnos de agente de gateway a través del arnés del servidor de aplicaciones de Codex propiedad del plugin,
    verifica `/codex status` y `/codex models`, y por defecto ejercita pruebas de imagen,
    cron MCP, sub-agente y Guardian. Desactive la prueba de sub-agente con
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` cuando aisle otros fallos del
    servidor de aplicaciones de Codex. Para una verificación enfocada del sub-agente, desactive las otras pruebas:
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Esto sale después de la prueba del sub-agente a menos que
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` esté configurado.
- Prueba de humo del comando de rescate de Crestodian: `pnpm test:live:crestodian-rescue-channel`
  - Verificación opcional de doble seguridad para la superficie del comando de rescate
    del canal de mensajes. Ejercita `/crestodian status`, pone en cola un cambio
    persistente de modelo, responde `/crestodian yes` y verifica la ruta de escritura de auditoría/configuración.
- Prueba de humo de Docker del planificador de Crestodian: `pnpm test:docker:crestodian-planner`
  - Ejecuta Crestodian en un contenedor sin configuración con una CLI de Claude falsa en `PATH`
    y verifica que el planificador difuso de respaldo se traduzca en una escritura de configuración tipificada auditada.
- Prueba de humo de Docker de primera ejecución de Crestodian: `pnpm test:docker:crestodian-first-run`
  - Comienza desde un directorio de estado de OpenClaw vacío, enruta `openclaw` desnudo hacia
    Crestodian, aplica escrituras de configuración/modelo/agente/complemento de Discord + SecretRef,
    valida la configuración y verifica las entradas de auditoría. La misma ruta de configuración del Anillo 0
    también está cubierta en QA Lab por
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Prueba de humo de costos de Moonshot/Kimi: con `MOONSHOT_API_KEY` establecido, ejecute
  `openclaw models list --provider moonshot --json`, luego ejecute un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  aislado contra `moonshot/kimi-k2.6`. Verifique que el JSON informe Moonshot/K2.6 y que
  la transcripción del asistente almacene `usage.cost` normalizado.

<Tip>Cuando solo necesita un caso fallido, prefiera reducir las pruebas en vivo mediante las variables de entorno de lista de permitidos descritas a continuación.</Tip>

## Ejecutores específicos de QA

Estos comandos se encuentran junto a las suites de prueba principales cuando necesita realismo del laboratorio de QA:

CI ejecuta QA Lab en flujos de trabajo dedicados. `Parity gate` se ejecuta en PRs coincidentes y
desde envío manual con proveedores simulados. `QA-Lab - All Lanes` se ejecuta cada noche en
`main` y desde envío manual con el gate de paridad simulada, carril Matrix en vivo,
carril Telegram en vivo administrado por Convex, y carril Discord en vivo administrado por Convex como
trabajos paralelos. Las comprobaciones programadas de QA y lanzamiento pasan Matrix `--profile fast`
explícitamente, mientras que la entrada predeterminada del flujo de trabajo manual y la CLI de Matrix permanecen
`all`; el envío manual puede fragmentar `all` en `transport`, `media`, `e2ee-smoke`,
`e2ee-deep`, y `e2ee-cli` trabajos. `OpenClaw Release Checks` ejecuta paridad más
los carriles rápidos de Matrix y Telegram antes de la aprobación del lanzamiento.

- `pnpm openclaw qa suite`
  - Ejecuta escenarios de QA respaldados por el repositorio directamente en el host.
  - Ejecuta múltiples escenarios seleccionados en paralelo de forma predeterminada con workers
    de gateway aislados. `qa-channel` tiene una concurrencia predeterminada de 4 (limitada por la
    cantidad de escenarios seleccionados). Usa `--concurrency <count>` para ajustar el número
    de workers, o `--concurrency 1` para el carril serie antiguo.
  - Sale con un código distinto de cero cuando algún escenario falla. Usa `--allow-failures` cuando
    quieras los artefactos sin un código de salida fallido.
  - Soporta los modos de proveedor `live-frontier`, `mock-openai` y `aimock`.
    `aimock` inicia un servidor de proveedor local con respaldo AIMock para cobertura
    experimental de fixtures y protocolos-mock sin reemplazar el carril
    `mock-openai` que es consciente del escenario.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta la misma suite de QA dentro de una VM Linux desechable de Multipass.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza las mismas banderas de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones en vivo reenvían las entradas de autenticación QA compatibles que son prácticas para el invitado:
    claves de proveedor basadas en variables de entorno, la ruta de configuración del proveedor QA en vivo y `CODEX_HOME`
    cuando está presente.
  - Los directorios de salida deben permanecer en la raíz del repositorio para que el invitado pueda escribir de vuelta a través
    del espacio de trabajo montado.
  - Escribe el informe y resumen de QA normal además de los registros de Multipass en
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA con respaldo de Docker para trabajos de QA de estilo operador.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construye un tarball de npm desde el checkout actual, lo instala globalmente en
    Docker, ejecuta el onboarding no interactivo de la clave de API de OpenAI, configura Telegram
    de forma predeterminada, verifica que habilitar el plugin instala las dependencias de tiempo de ejecución
    bajo demanda, ejecuta doctor y ejecuta un turno de agente local contra un punto final
    de OpenAI simulado.
  - Usa `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` para ejecutar el mismo carril de instalación
    empaquetada con Discord.
- `pnpm test:docker:session-runtime-context`
  - Ejecuta una prueba de humo determinista de Docker con la aplicación compilada para las transcripciones de contexto de tiempo de ejecución integrado. Verifica que el contexto de tiempo de ejecución oculto de OpenClaw se conserve como un mensaje personalizado que no se muestra, en lugar de filtrarse en el turno visible del usuario, y luego carga un JSONL de sesión rota afectada y verifica que `openclaw doctor --fix` lo reescriba en la rama activa con una copia de seguridad.
- `pnpm test:docker:npm-telegram-live`
  - Instala un candidato de paquete OpenClaw en Docker, ejecuta el onboarding del paquete instalado, configura Telegram a través de la CLI instalada y luego reutiliza el carril de QA de Telegram en vivo con ese paquete instalado como la pasarela SUT.
  - Por defecto es `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`; establece `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` o `OPENCLAW_CURRENT_PACKAGE_TGZ` para probar un archivo tar local resuelto en lugar de instalar desde el registro.
  - Utiliza las mismas credenciales de entorno de Telegram o la fuente de credenciales de Convex que `pnpm openclaw qa telegram`. Para la automatización de CI/lanzamiento, establece `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` más `OPENCLAW_QA_CONVEX_SITE_URL` y el secreto del rol. Si `OPENCLAW_QA_CONVEX_SITE_URL` y un secreto de rol de Convex están presentes en CI, el contenedor Docker selecciona Convex automáticamente.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` anula el `OPENCLAW_QA_CREDENTIAL_ROLE` compartido solo para este carril.
  - GitHub Actions expone este carril como el flujo de trabajo manual de mantenimiento `NPM Telegram Beta E2E`. No se ejecuta al fusionar (merge). El flujo de trabajo utiliza el entorno `qa-live-shared` y los arrendamientos de credenciales de CI de Convex.
- GitHub Actions también expone `Package Acceptance` para la prueba de producto de ejecución paralela (side-run) contra un paquete candidato. Acepta una referencia confiable, especificación npm publicada, URL de archivo tar HTTPS más SHA-256, o artefacto de tarball de otra ejecución, sube el `openclaw-current.tgz` normalizado como `package-under-test` y luego ejecuta el planificador Docker E2E existente con perfiles de carril de smoke, package, product, full o custom. Establece `telegram_mode=mock-openai` o `live-frontier` para ejecutar el flujo de trabajo de QA de Telegram contra el mismo artefacto `package-under-test`.
  - Prueba de producto de la última versión beta:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- La prueba de URL exacta de tarball requiere un resumen (digest):

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- La prueba de artefacto descarga un artefacto tarball de otra ejecución de Actions:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:bundled-channel-deps`
  - Empaqueta e instala la compilación actual de OpenClaw en Docker, inicia el Gateway
    con OpenAI configurado y luego habilita los canales/plugins incluidos mediante ediciones
    de configuración.
  - Verifica que el descubrimiento de la configuración deje ausentes las dependencias de tiempo de ejecución del plugin sin configurar, que la primera ejecución configurada del Gateway o del doctor instale a pedido las dependencias de tiempo de ejecución de cada plugin incluido, y que un segundo reinicio no reinstale las dependencias que ya se activaron.
  - También instala una línea base conocida anterior de npm, habilita Telegram antes de ejecutar
    `openclaw update --tag <candidate>` y verifica que el doctor posterior a la actualización del candidato repare las dependencias de tiempo de ejecución del canal incluido sin una
    reparación posterior a la instalación en el lado del arnés (harness).
- `pnpm test:parallels:npm-update`
  - Ejecuta la prueba de humo de actualización de instalación empaquetada nativa a través de los invitados de Parallels. Cada
    plataforma seleccionada primero instala el paquete de línea base solicitado, luego ejecuta
    el comando instalado `openclaw update` en el mismo invitado y verifica la
    versión instalada, el estado de actualización, la preparación de la puerta de enlace y un turno de agente
    local.
  - Use `--platform macos`, `--platform windows` o `--platform linux` mientras
    itera en un invitado. Use `--json` para la ruta del artefacto de resumen y
    el estado por carril.
  - El carril de OpenAI usa `openai/gpt-5.5` para la prueba de turno de agente en vivo por
    defecto. Pase `--model <provider/model>` o configure
    `OPENCLAW_PARALLELS_OPENAI_MODEL` cuando valide deliberadamente otro
    modelo de OpenAI.
  - Envuelva las ejecuciones locales largas en un tiempo de espera del host para que los bloqueos del transporte de Parallels no
    puedan consumir el resto de la ventana de pruebas:

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - El script escribe registros de carril anidados bajo `/tmp/openclaw-parallels-npm-update.*`.
    Inspeccione `windows-update.log`, `macos-update.log` o `linux-update.log`
    antes de asumir que el contenedor externo está colgado.
  - La actualización de Windows puede pasar de 10 a 15 minutos en el doctor posterior a la actualización/reparación de
    dependencias de tiempo de ejecución en un invitado frío; eso aún es saludable cuando el registro
    de depuración de npm anidado está avanzando.
  - No ejecute este contenedor agregado en paralelo con carriles de humo individuales de Parallels
    macOS, Windows o Linux. Comparten el estado de la máquina virtual y pueden colisionar en
    la restauración de instantáneas, el servicio de paquetes o el estado de la puerta de enlace del invitado.
  - La prueba posterior a la actualización ejecuta la superficie del complemento empaquetado normal porque
    las fachadas de capacidad como el habla, la generación de imágenes y la comprensión
    multimedia se cargan a través de las API de tiempo de ejecución empaquetadas incluso cuando el
    turno del agente solo verifica una respuesta de texto simple.

- `pnpm openclaw qa aimock`
  - Inicia solo el servidor del proveedor local AIMock para pruebas de humeo
    de protocolo directo.
- `pnpm openclaw qa matrix`
  - Ejecuta el carril de QA en vivo de Matrix contra un servidor doméstico Tuwunel desechable respaldado por Docker. Solo para descarga de código fuente — las instalaciones empaquetadas no envían `qa-lab`.
  - CLI completo, catálogo de perfiles/escenarios, variables de entorno y diseño de artefactos: [Matrix QA](/es/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real utilizando los tokens del bot de control y del bot SUT desde las variables de entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El id del grupo debe ser el id de chat numérico de Telegram.
  - Admite `--credential-source convex` para credenciales compartidas agrupadas. Utilice el modo env por defecto, o establezca `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` para optar por arrendamientos agrupados.
  - Sale con código distinto de cero cuando falla cualquier escenario. Use `--allow-failures` cuando
    desee artefactos sin un código de salida fallido.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilite el Modo de Comunicación Bot-a-Bot en `@BotFather` para ambos bots y asegúrese de que el bot de control pueda observar el tráfico del bot del grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados en `.artifacts/qa-e2e/...`. Los escenarios de respuesta incluyen RTT desde la solicitud de envío del controlador hasta la respuesta observada del SUT.

Los carriles de transporte en vivo comparten un contrato estándar para que los nuevos transportes no se desvíen; la matriz de cobertura por carril reside en [QA overview → Live transport coverage](/es/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` es la suite sintética amplia y no forma parte de esa matriz.

### Credenciales compartidas de Telegram a través de Convex (v1)

Cuando `--credential-source convex` (o `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) está habilitado para `openclaw qa telegram`, el laboratorio de QA adquiere un contrato exclusivo de un grupo respaldado por Convex, envía latidos a ese contrato mientras el carril se está ejecutando y libera el contrato al apagar.

Andamiaje del proyecto Convex de referencia:

- `qa/convex-credential-broker/`

Variables de entorno requeridas:

- `OPENCLAW_QA_CONVEX_SITE_URL` (por ejemplo `https://your-deployment.convex.site`)
- Un secreto para el rol seleccionado:
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` para `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` para `ci`
- Selección del rol de credenciales:
  - CLI: `--credential-role maintainer|ci`
  - Predeterminado de entorno: `OPENCLAW_QA_CREDENTIAL_ROLE` (predeterminado a `ci` en CI, `maintainer` de lo contrario)

Variables de entorno opcionales:

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (predeterminado `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (predeterminado `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (predeterminado `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (predeterminado `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (predeterminado `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de traza opcional)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permite URLs de Convex `http://` de bucle invertido para el desarrollo exclusivamente local.

`OPENCLAW_QA_CONVEX_SITE_URL` debe usar `https://` en operación normal.

Los comandos de administrador de mantenimiento (pool add/remove/list) requieren específicamente `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`.

Auxiliares de CLI para los mantenedores:

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Use `doctor` antes de las ejecuciones en vivo para verificar la URL del sitio Convex, los secretos del intermediario, el prefijo del punto final, el tiempo de espera HTTP y la accesibilidad de administrador/lista sin imprimir los valores de los secretos. Use `--json` para una salida legible por máquina en scripts y utilidades de CI.

Contrato de punto final predeterminado (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

- `POST /acquire`
  - Solicitud: `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Éxito: `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Agotado/reintentable: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
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

Formato de carga útil para el tipo Telegram:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` debe ser una cadena de ID de chat de Telegram numérica.
- `admin/add` valida este formato para `kind: "telegram"` y rechaza las cargas útiles mal formadas.

### Agregar un canal a QA

La arquitectura y los nombres de los auxiliares de escenarios para los nuevos adaptadores de canal se encuentran en [Descripción general de QA → Agregar un canal](/es/concepts/qa-e2e-automation#adding-a-channel). El requisito mínimo: implementar el ejecutor de transporte en la costura del host compartido `qa-lab`, declarar `qaRunners` en el manifiesto del complemento, montar como `openclaw qa <runner>` y escribir escenarios bajo `qa/scenarios/`.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como un "realismo creciente" (y un aumento de la inestabilidad/costo):

### Unitaria / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: las ejecuciones no dirigidas utilizan el conjunto de fragmentos `vitest.full-*.config.ts` y pueden expandir los fragmentos multiproyecto en configuraciones por proyecto para la programación paralela
- Archivos: inventarios principales/unitarios bajo `src/**/*.test.ts`, `packages/**/*.test.ts` y `test/**/*.test.ts`; las pruebas unitarias de la interfaz de usuario se ejecutan en el fragmento dedicado `unit-ui`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Deben ser rápidas y estables

<AccordionGroup>
  <Accordion title="Proyectos, fragmentos y carriles con ámbito">

    - `pnpm test` sin destino ejecuta doce configuraciones de fragmentos más pequeñas (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso gigante de proyecto raíz nativo. Esto reduce el RSS pico en máquinas cargadas y evita que el trabajo de respuesta automática y extensiones afecte a otras suites.
    - `pnpm test --watch` todavía utiliza el gráfico de proyectos raíz nativo `vitest.config.ts`, ya que un bucle de vigilancia (watch loop) multi-fragmento no es práctico.
    - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` enrutan objetivos explícitos de archivo/directorio a través de carriles con ámbito primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el impuesto de inicio completo del proyecto raíz.
    - `pnpm test:changed` expande las rutas git cambiadas en carriles con ámbito baratos de forma predeterminada: ediciones directas de pruebas, archivos `*.test.ts` hermanos, asignaciones de origen explícitas y dependientes del gráfico de importación local. Las ediciones de configuración/configuración/paquete no ejecutan pruebas de forma amplia a menos que utilice explícitamente `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` es la puerta de verificación local inteligente normal para trabajos estrechos. Clasifica la diferencia en núcleo, pruebas de núcleo, extensiones, pruebas de extensiones, aplicaciones, documentos, metadatos de lanzamiento, herramientas Docker en vivo y herramientas, y luego ejecuta los comandos de verificación de tipos (typecheck), lint y guardia correspondientes. No ejecuta pruebas de Vitest; llame a `pnpm test:changed` o `pnpm test <target>` explícito para pruebas de validación. Los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones de versión/configuración/dependencia-raíz dirigidas, con una guardia que rechacha cambios de paquete fuera del campo de versión de nivel superior.
    - Las ediciones del arnés ACP de Docker en vivo ejecutan comprobaciones enfocadas: sintaxis de shell para los scripts de autenticación de Docker en vivo y una ejecución en seco (dry-run) del programador de Docker en vivo. Los cambios de `package.json` se incluyen solo cuando la diferencia se limita a `scripts["test:docker:live-*"]`; las ediciones de dependencia, exportación, versión y otras ediciones de superficie de paquete todavía utilizan las protecciones más amplias.
    - Las pruebas unitarias con importación ligera de agentes, comandos, complementos, asistentes de respuesta automática, `plugin-sdk` y áreas similares de utilidad pura se enrutan a través del carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con estado/pesados en tiempo de ejecución se mantienen en los carriles existentes.
    - Los archivos de origen auxiliares `plugin-sdk` y `commands` seleccionados también asignan ejecuciones en modo de cambio a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones de los asistentes evitan volver a ejecutar la suite pesada completa para ese directorio.
    - `auto-reply` tiene cubos dedicados para asistentes de núcleo de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. El CI divide aún más el subárbol de respuesta en fragmentos de ejecutor de agente, despacho y comandos/enrutamiento de estado, de modo que un cubo con muchas importaciones no sea propietario de toda la cola de Node.

  </Accordion>

  <Accordion title="Cobertura del runner integrado">

    - Cuando cambies las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación, mantén ambos niveles de cobertura.
    - Añade regresiones de ayuda enfocadas para los límites de enrutamiento y normalización puros.
    - Mantén las suites de integración del runner integrado saludables:
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Esas suites verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
      a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayuda no son
      un sustituto suficiente para esas rutas de integración.

  </Accordion>

  <Accordion title="Valores predeterminados del pool y aislamiento de Vitest">

    - La configuración base de Vitest tiene como valor predeterminado `threads`.
    - La configuración compartida de Vitest corrige `isolate: false` y utiliza el
      runner no aislado en las configuraciones de proyectos raíz, e2e y live.
    - El carril de la UI raíz mantiene su configuración `jsdom` y su optimizador, pero también se ejecuta en el
      runner no aislado compartido.
    - Cada fragmento `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false`
      de la configuración compartida de Vitest.
    - `scripts/run-vitest.mjs` añade `--no-maglev` para los procesos secundarios de Node
      de Vitest de forma predeterminada para reducir la sobrecarga de compilación de V8 durante las ejecuciones locales grandes.
      Establece `OPENCLAW_VITEST_ENABLE_MAGLEV=1` para comparar con el comportamiento
      estándar de V8.

  </Accordion>

  <Accordion title="Iteración local rápida">

    - `pnpm changed:lanes` muestra qué carriles arquitectónicos activa un diff.
    - El ganador de pre-commit es solo de formateo. Reorganiza los archivos formateados y
      no ejecuta lint, typecheck o pruebas.
    - Ejecute `pnpm check:changed` explícitamente antes de la entrega o el push cuando
      necesite la puerta de verificación local inteligente.
    - `pnpm test:changed` se enruta a través de carriles con ámbito económico por defecto. Use
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el agente
      decida que una edición de arnés, configuración, paquete o contrato realmente necesita una cobertura
      más amplia de Vitest.
    - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento de
      enrutamiento, solo con un límite de trabajadores más alto.
    - El autoescalado de trabajadores locales es intencionalmente conservador y se reduce
      cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones
      concurrentes de Vitest causan menos daño por defecto.
    - La configuración base de Vitest marca los archivos de proyectos/configuración como
      `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia
      la cableadura de las pruebas.
    - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts
      compatibles; establezca `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea
      una ubicación de caché explícita para perfilado directo.

  </Accordion>

  <Accordion title="Depuración de rendimiento">

    - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest más
      la salida de desglose de importaciones.
    - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a
      los archivos modificados desde `origin/main`.
    - Los datos de tiempo de fragmentación (shard) se escriben en `.artifacts/vitest-shard-timings.json`.
      Las ejecuciones de configuración completa usan la ruta de configuración como clave; los fragmentos (shards) de CI con patrón de inclusión
      añaden el nombre del fragmento para que los fragmentos filtrados puedan ser rastreados
      por separado.
    - Cuando una prueba frecuente todavía pasa la mayor parte de su tiempo en importaciones de inicio,
      mantenga las dependencias pesadas detrás de una costura `*.runtime.ts` local estrecha y
      simule esa costura directamente en lugar de importar profundamente los asistentes de tiempo de ejecución solo
      para pasarlos a través de `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compara las rutas
      `test:changed` con la ruta nativa del proyecto raíz para ese
      diff confirmado e imprime el tiempo de reloj más el RSS máximo de macOS.
    - `pnpm test:perf:changed:bench -- --worktree` evalúa el rendimiento del
      árbol sucio actual enrutando la lista de archivos modificados a través de
      `scripts/test-projects.mjs` y la configuración raíz de Vitest.
    - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para
      la sobrecarga de inicio y transformación de Vitest/Vite.
    - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montículo del ejecutor para la
      suite de unitarios con el paralelismo de archivos deshabilitado.

  </Accordion>
</AccordionGroup>

### Estabilidad (gateway)

- Comando: `pnpm test:stability:gateway`
- Configuración: `vitest.gateway.config.ts`, forzada a un trabajador
- Alcance:
  - Inicia un Gateway de bucle local (loopback) real con diagnóstico habilitado de forma predeterminada
  - Impulsa un churn sintético de mensajes, memoria y cargas útiles grandes a través de la ruta de eventos de diagnóstico
  - Consulta `diagnostics.stability` a través del Gateway WS RPC
  - Cubre los asistentes de persistencia del paquete de estabilidad de diagnóstico
  - Asevera que la grabadora permanece limitada, las muestras sintéticas de RSS se mantienen bajo el presupuesto de presión y las profundidades de la cola por sesión se drenan de vuelta a cero
- Expectativas:
  - Seguro para CI y sin claves
  - Carril estrecho para el seguimiento de regresiones de estabilidad, no un sustituto de la suite completa de Gateway

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, y pruebas E2E de bundled-plugin bajo `extensions/`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 por defecto).
  - Se ejecuta en modo silencioso por defecto para reducir la sobrecarga de E/S de la consola.
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el conteo de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento end-to-end de la puerta de enlace de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: prueba de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `extensions/openshell/src/backend.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace aislada de OpenShell en el host mediante Docker
  - Crea un sandbox desde un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw sobre `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la puerta de enlace de prueba y el sandbox
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o un script contenedor

### En vivo (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, y pruebas en vivo de bundled-plugin bajo `extensions/`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona este proveedor/modelo realmente _hoy_ con credenciales reales?”
  - Detectar cambios en el formato del proveedor, peculiaridades de las llamadas a herramientas, problemas de autenticación y el comportamiento de los límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de velocidad
  - Prefiere ejecutar subconjuntos reducidos en lugar de “todo”
- Live ejecuta source `~/.profile` para recuperar las claves de API faltantes.
- De forma predeterminada, las ejecuciones live aún aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los dispositivos unitarios no puedan mutar tu `~/.openclaw` real.
- Establece `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando intencionalmente necesites que las pruebas live usen tu directorio real.
- `pnpm test:live` ahora por defecto usa un modo más silencioso: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso adicional de `~/.profile` y silencia los registros de arranque de la puerta de enlace (gateway) y el ruido de Bonjour. Establece `OPENCLAW_LIVE_TEST_QUIET=0` si deseas recuperar los registros de inicio completos.
- Rotación de claves de API (específico del proveedor): establece `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o una anulación por live a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de velocidad.
- Salida de progreso/latido:
  - Las suites live ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de consola de Vitest está silenciosa.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/puerta de enlace se transmitan inmediatamente durante las ejecuciones live.
  - Ajusta los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajusta los latidos de la puerta de enlace (gateway)/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Usa esta tabla de decisión:

- Editando lógica/pruebas: ejecuta `pnpm test` (y `pnpm test:coverage` si cambiaste mucho)
- Modificando la red de la puerta de enlace (gateway) / protocolo WS / emparejamiento: añade `pnpm test:e2e`
- Depurando “mi bot está caído” / fallos específicos del proveedor / llamadas a herramientas: ejecuta un `pnpm test:live` reducido

## Pruebas live (que tocan la red)

Para la matriz de modelos en vivo, pruebas de humo del backend de CLI, pruebas de humo de ACP, arnés del app-server de Codex y todas las pruebas en vivo de proveedores de medios (Deepgram, BytePlus, ComfyUI, imagen, música, video, arnés de medios), además del manejo de credenciales para ejecuciones en vivo, consulte [Testing — live suites](/es/help/testing-live).

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo con clave de perfil correspondiente dentro de la imagen de Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando su directorio de configuración local y el espacio de trabajo (y originando `~/.profile` si está montado). Los puntos de entrada locales correspondientes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker tienen como valor predeterminado un límite de humo más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` tiene como valor predeterminado `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene como valores predeterminados `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anule esas variables de entorno cuando
  desee explícitamente el escaneo exhaustivo más grande.
- `test:docker:all` construye la imagen Docker de live una vez a través de `test:docker:live-build`, empaqueta OpenClaw una vez como un tarball de npm mediante `scripts/package-openclaw-for-docker.mjs`, y luego construye/reutiliza dos imágenes `scripts/e2e/Dockerfile`. La imagen básica es solo el ejecutor Node/Git para los carriles de instalación/actualización/dependencias de complementos; esos carriles montan el tarball preconstruido. La imagen funcional instala el mismo tarball en `/app` para los carriles de funcionalidad de la aplicación construida. Las definiciones de los carriles Docker residen en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador reside en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. El agregado utiliza un planificador local ponderado: `OPENCLAW_DOCKER_ALL_PARALLELISM` controla las ranuras de procesos, mientras que los límites de recursos evitan que los carriles pesados de live, npm-install y multi-servicio se inicien todos a la vez. Si un solo carril es más pesado que los límites activos, el planificador aún puede iniciarlo cuando el grupo está vacío y luego lo mantiene ejecutándose solo hasta que la capacidad esté disponible nuevamente. Los valores predeterminados son 10 ranuras, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; ajuste `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` solo cuando el host Docker tenga más espacio libre. El ejecutor realiza un preflight de Docker de forma predeterminada, elimina los contenedores obsoletos de E2E de OpenClaw, imprime el estado cada 30 segundos, almacena los tiempos de los carriles exitosos en `.artifacts/docker-tests/lane-timings.json` y utiliza esos tiempos para iniciar primero los carriles más largos en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto de carriles ponderados sin construir ni ejecutar Docker, o `node scripts/test-docker-all.mjs --plan-json` para imprimir el plan de CI para los carriles seleccionados, las necesidades de paquete/imagen y las credenciales.
- `Package Acceptance` es la puerta de enlace de paquetes nativa de GitHub para "¿funciona este archivo tar instalable como un producto?" Resuelve un paquete candidato de `source=npm`, `source=ref`, `source=url` o `source=artifact`, lo carga como `package-under-test` y luego ejecuta los carriles Docker E2E reutilizables contra ese archivo tar exacto en lugar de reempaquetar la referencia seleccionada. `workflow_ref` selecciona los scripts de flujo de trabajo/mensajería de confianza, mientras que `package_ref` selecciona la confirmación/rama/etiqueta de origen para empaquetar cuando `source=ref`; esto permite que la lógica de aceptación actual valide confirmaciones de confianza anteriores. Los perfiles se ordenan por amplitud: `smoke` es instalación rápida/canal/agente más puerta de enlace/configuración, `package` es el contrato de paquete/actualización/complemento y el reemplazo nativo predeterminado para la mayor parte de la cobertura de paquete/actualización de Parallels, `product` agrega canales MCP, limpieza de cron/subagente, búsqueda web de OpenAI y OpenWebUI, y `full` ejecuta los fragmentos Docker de ruta de lanzamiento con OpenWebUI. La validación de lanzamiento ejecuta un delta de paquete personalizado (`bundled-channel-deps-compat plugins-offline`) más control de calidad de paquete de Telegram porque los fragmentos Docker de ruta de lanzamiento ya cubren los carriles superpuestos de paquete/actualización/complemento. Los comandos de reejecución de GitHub Docker dirigidos generados a partir de artefactos incluyen entradas de artefacto de paquete previo e imagen preparada cuando están disponibles, por lo que los carriles fallidos pueden evitar reconstruir el paquete y las imágenes.
- Las comprobaciones de compilación y lanzamiento ejecutan `scripts/check-cli-bootstrap-imports.mjs` después de tsdown. El guardia recorre el gráfico de compilación estático desde `dist/entry.js` y `dist/cli/run-main.js` y falla si el inicio previo al despacho importa dependencias de paquetes como Commander, interfaz de usuario de solicitud, undici o registro antes del despacho de comandos. El control de humo de CLI empaquetada también cubre la ayuda raíz, la ayuda de incorporación, la ayuda del doctor, el estado, el esquema de configuración y un comando de lista de modelos.
- La compatibilidad heredada de Package Acceptance está limitada a `2026.4.25` (`2026.4.25-beta.*` incluido). Hasta ese límite, el arnés tolera solo lagunas en los metadatos de paquetes enviados: entradas de inventario de QA privadas omitidas, `gateway install --wrapper` faltantes, archivos de parche faltantes en el accesorio git derivado del tarball, `update.channel` persistidos faltantes, ubicaciones heredadas de registros de instalación de complementos, persistencia de registros de instalación del marketplace faltante y migración de metadatos de configuración durante `plugins update`. Para paquetes posteriores a `2026.4.25`, esas rutas son fallas estrictas.
- Ejecutores de prueba de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:update-channel-switch`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update` y `test:docker:config-reload` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelos en vivo también montan mediante bind solo los directorios de autenticación de CLI necesarios (o todos los compatibles cuando la ejecución no se ha reducido), luego los copian en el directorio principal del contenedor antes de la ejecución para que el OAuth de CLI externo pueda actualizar los tokens sin mutar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`; cubre Claude, Codex y Gemini de forma predeterminada, con una cobertura estricta de Droid/OpenCode a través de `pnpm test:docker:live-acp-bind:droid` y `pnpm test:docker:live-acp-bind:opencode`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Prueba de humo del arnés del servidor de aplicaciones de Codex: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo de Observability: `pnpm qa:otel:smoke` es un carril de checkout de código fuente privado de QA. Intencionalmente no forma parte de los carriles de lanzamiento de Docker del paquete porque el archivo tar de npm omite el Lab de QA.
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Prueba de humo de onboarding/canal/agente del tarball de Npm: `pnpm test:docker:npm-onboard-channel-agent` instala el tarball empaquetado de OpenClaw globalmente en Docker, configura OpenAI a través del onboarding de referencia de entorno (env-ref) más Telegram por defecto, verifica que el doctor repare las dependencias de tiempo de ejecución del complemento activado y ejecuta un turno de agente de OpenAI simulado. Reutilice un tarball preconstruido con `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la reconstrucción del host con `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` o cambie de canal con `OPENCLAW_NPM_ONBOARD_CHANNEL=discord`.
- Prueba de humo de cambio de canal de actualización: `pnpm test:docker:update-channel-switch` instala el tarball empaquetado de OpenClaw globalmente en Docker, cambia del paquete `stable` a git `dev`, verifica que el canal persistente y el complemento funcionen después de la actualización, luego vuelve a cambiar al paquete `stable` y verifica el estado de la actualización.
- Prueba de humo del contexto de tiempo de ejecución de la sesión: `pnpm test:docker:session-runtime-context` verifica la persistencia de la transcripción del contexto de tiempo de ejecución oculto más la reparación del doctor de las ramas de reescritura de indicaciones (prompt) duplicadas afectadas.
- Prueba de humo de instalación global de Bun: `bash scripts/e2e/bun-global-install-smoke.sh` empaqueta el árbol actual, lo instala con `bun install -g` en un directorio home aislado y verifica que `openclaw infer image providers --json` devuelva proveedores de imágenes empaquetadas en lugar de colgarse. Reutilice un tarball preconstruido con `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la compilación del host con `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` o copie `dist/` desde una imagen Docker construida con `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Instalador Docker smoke: `bash scripts/test-install-sh-docker.sh` comparte una caché de npm entre sus contenedores root, update y direct-npm. Update smoke usa por defecto npm `latest` como línea base estable antes de actualizar al tarball candidato. Anúlelo con `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` localmente, o con la entrada `update_baseline_version` del flujo de trabajo Install Smoke en GitHub. Las verificaciones del instalador no root mantienen una caché de npm aislada para que las entradas de caché propiedad de root no enmascaren el comportamiento de instalación local del usuario. Establezca `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` para reutilizar la caché root/update/direct-npm en ejecuciones locales repetidas.
- Install Smoke CI omite la actualización global duplicada de direct-npm con `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1`; ejecute el script localmente sin esa variable de entorno cuando se necesite cobertura directa de `npm install -g`.
- Agents delete shared workspace CLI smoke: `pnpm test:docker:agents-delete-shared-workspace` (script: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construye por defecto la imagen del Dockerfile raíz, inicializa dos agentes con un espacio de trabajo en un directorio home aislado del contenedor, ejecuta `agents delete --json` y verifica el JSON válido más el comportamiento del espacio de trabajo retenido. Reutilice la imagen install-smoke con `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (dos contenedores, WS auth + health): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke: `pnpm test:docker:browser-cdp-snapshot` (script: `scripts/e2e/browser-cdp-snapshot-docker.sh`) construye la imagen E2E de origen más una capa de Chromium, inicia Chromium con CDP sin procesar, ejecuta `browser doctor --deep` y verifica que las instantáneas de rol de CDP cubran las URL de los enlaces, los elementos clicables promovidos por el cursor, las referencias de iframe y los metadatos de los marcos.
- OpenAI Responses web_search minimal reasoning regression: `pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) ejecuta un servidor OpenAI simulado a través de Gateway, verifica que `web_search` eleve `reasoning.effort` de `minimal` a `low`, luego fuerza el rechazo del esquema del proveedor y comprueba que el detalle sin procesar aparezca en los registros de Gateway.
- Puente de canal MCP (Gateway inicializado + puente stdio + prueba de humo de marco de notificación raw de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Herramientas MCP del paquete Pi (servidor MCP stdio real + prueba de humo de permitir/denegar del perfil Pi incrustado): `pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Limpieza MCP de Cron/subagente (Gateway real + desmontaje del hijo MCP stdio después de ejecuciones de cron aisladas y subagentes de una sola vez): `pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Complementos (prueba de humo de instalación, instalación/desinstalación de ClawHub, actualizaciones del mercado y activación/inspección del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  Establezca `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` para omitir el bloque en vivo de ClawHub, o anule el paquete predeterminado con `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` y `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`.
- Prueba de humo de actualización de complemento sin cambios: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Prueba de humo de metadatos de recarga de configuración: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Dependencias de runtime del complemento empaquetado: `pnpm test:docker:bundled-channel-deps` crea una pequeña imagen de ejecución Docker por defecto, compila y empaqueta OpenClaw una vez en el host, y luego monta ese archivo tar en cada escenario de instalación de Linux. Reutilice la imagen con `OPENCLAW_SKIP_DOCKER_BUILD=1`, omita la recompilación del host después de una compilación local reciente con `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0`, o apunte a un archivo tar existente con `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`. El agregado Docker completo y el fragmento `bundled-channels` de la ruta de lanzamiento preempaquetan este archivo tar una vez, y luego dividen las comprobaciones de canal empaquetadas en carriles independientes, incluidos carriles de actualización separados para Telegram, Discord, Slack, Feishu, memory-lancedb y ACPX. El fragmento heredado `plugins-integrations` sigue siendo un alias de agregado para reejecuciones manuales. Use `OPENCLAW_BUNDLED_CHANNELS=telegram,slack` para reducir la matriz de canales al ejecutar el carril empaquetado directamente, o `OPENCLAW_BUNDLED_CHANNEL_UPDATE_TARGETS=telegram,acpx` para reducir el escenario de actualización. El carril también verifica que `channels.<id>.enabled=false` y `plugins.entries.<id>.enabled=false` supriman la reparación de dependencias de doctor/runtime.
- Reduce las dependencias de tiempo de ejecución del plugin empaquetado mientras se itera deshabilitando escenarios no relacionados, por ejemplo:
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`.

Para precompilar y reutilizar manualmente la imagen funcional compartida:

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Las anulaciones de imagen específicas de la suite, como `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, tienen prioridad cuando se establecen. Cuando `OPENCLAW_SKIP_DOCKER_BUILD=1` apunta a una imagen compartida remota, los scripts la descargan si aún no es local. Las pruebas de Docker de QR e instalador mantienen sus propios Dockerfiles porque validan el comportamiento del paquete/instalación en lugar del tiempo de ejecución de la aplicación compilada compartida.

Los ejecutores Docker de modelo en vivo también montan el checkout actual en modo de solo lectura y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras se ejecuta Vitest contra su código fuente/configuración local exacta. El paso de preparación omite las cachés locales grandes exclusivas y los resultados de compilación de la aplicación, como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y `.build` locales o directorios de resultados de Gradle, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la puerta de enlace no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pase también `OPENCLAW_LIVE_GATEWAY_*` cuando necesite limitar o excluir la cobertura en vivo de la puerta de enlace en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor Open WebUI anclado contra esa puerta de enlace, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar extraer la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de inicio en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Arranca un contenedor de puerta de enlace semillado, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envío saliente y las notificaciones de canal y permisos estilo Claude a través del puente MCP stdio real. La verificación de notaciones inspecciona directamente los marcos MCP stdio sin procesar, de modo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a exponer. `test:docker:pi-bundle-mcp-tools` es determinista y no necesita una clave de modelo en vivo. Construye la imagen Docker del repositorio, inicia un servidor de sonda MCP stdio real dentro del contenedor, materializa ese servidor a través del tiempo de ejecución MCP del paquete Pi incrustado, ejecuta la herramienta y luego verifica que `coding` y `messaging` mantengan las herramientas `bundle-mcp` mientras que `minimal` y `tools.deny: ["bundle-mcp"]` las filtran. `test:docker:cron-mcp-cleanup` es determinista y no necesita una clave de modelo en vivo. Inicia una puerta de enlace semillada con un servidor de sonda MCP stdio real, ejecuta un turno cron aislado y un turno hijo de una sola vez `/subagents spawn`, y luego verifica que el proceso hijo MCP salga después de cada ejecución.

Prueba de humo manual de hilo en lenguaje natural de ACP (no en CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de hilos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido (sourced) antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` para verificar solo las variables de entorno obtenidas desde `OPENCLAW_PROFILE_FILE`, utilizando directorios de configuración/espacio de trabajo temporales y sin montajes de autenticación de CLI externos
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como de solo lectura bajo `/host-auth...`, luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedor restringidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anule manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para restringir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen `openclaw:local-live` existente para reejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI fijada

## Cordura de la documentación

Ejecute las comprobaciones de la documentación después de editar los documentos: `pnpm check:docs`.
Ejecute la validación completa de anclajes de Mintlify cuando también necesite comprobaciones de encabezados dentro de la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta de OpenAI simulada de extremo a extremo a través del bucle de agente de gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación forzada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simuladas a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (consulte [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la persistencia del historial de sesión y los límites del espacio aislado.

Las evaluaciones futuras deben mantenerse primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso vs. evitación, filtrado, inyección de mensajes).
- Evaluaciones en vivo opcionales (opcional, limitadas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento (plugin) y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de aserciones de forma y comportamiento. El carril (lane) unitario `pnpm test` por omisión omite intencionalmente estos archivos compartidos de seam y smoke; ejecute los comandos de contrato explícitamente cuando toque superficies compartidas de canal o proveedor.

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
- **threading** - Manejo del ID de hilo (Thread ID)
- **directory** - API de directorio/lista de contactos
- **group-policy** - Cumplimiento de políticas de grupo

### Contratos de estado del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondas de estado del canal
- **registry** - Forma del registro de complementos

### Contratos del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato de flujo de autenticación
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

Cuando corrija un problema de proveedor/modelo descubierto en live:

- Agregue una regresión segura para CI si es posible (proveedor mock/stub, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo para live (límites de tasa, políticas de autenticación), mantenga la prueba live estrecha y opcional mediante variables de entorno
- Preferentemente apunte a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error en la canalización de sesión/historia/herramientas del gateway → prueba de humo live del gateway o prueba mock del gateway segura para CI
- Guardia de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), y luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si añades una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los ids de objetivos no clasificados para que las nuevas clases no puedan omitirse silenciosamente.

## Relacionado

- [Pruebas en vivo](/es/help/testing-live)
- [CI](/es/ci)
