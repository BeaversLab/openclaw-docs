---
summary: "Kit de pruebas: suites unitarias/e2e/live, ejecutores de Docker y qué cubre cada prueba"
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
- Ejecución local de suite completa más rápida en una máquina con recursos: `pnpm test:max`

Cuando modificas pruebas o deseas mayor confianza:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite Live (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo live específico silenciosamente: `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Consejo: cuando solo necesites un caso fallido, prefiere limitar las pruebas live mediante las variables de entorno de lista blanca descritas a continuación.

## Suites de pruebas (qué se ejecuta dónde)

Piensa en las suites como "realismo creciente" (y mayor inestabilidad/costo):

### Unitaria / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: `scripts/test-parallel.mjs` (ejecuta `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Archivos: `src/**/*.test.ts`, plugin incluido `**/*.test.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación del gateway, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápida y estable
- Nota del programador:
  - `pnpm test` ahora mantiene un pequeño manifiesto de comportamiento registrado para anulaciones reales de grupo/aislamiento y una instantánea de tiempo separada para los archivos unitarios más lentos.
  - Las ejecuciones locales solo de extensiones ahora también usan una instantánea de tiempo de extensiones registrada más un objetivo de lote compartido ligeramente más grueso en hosts con mucha memoria, por lo que el carril de extensiones compartidas evita generar un lote extra cuando dos ejecuciones compartidas medidas son suficientes.
  - Los lotes compartidos locales de extensiones de alta memoria también se ejecutan con un límite de trabajadores ligeramente mayor que antes, lo que acortó los dos lotes de extensiones compartidas restantes sin cambiar los carriles de extensiones aisladas.
  - Las ejecuciones de canal local de alta memoria ahora reutilizan la instantánea de sincronización del canal registrada para dividir el carril de canales compartidos en algunos lotes medidos en lugar de un solo trabajador compartido largo.
  - Los lotes compartidos de canal local de alta memoria también se ejecutan con un límite de trabajadores ligeramente menor que los lotes de unidad compartidos, lo que ayudó a que las reejecuciones específicas del canal evitaran la sobresuscripción de la CPU una vez que los carriles de canal aislados ya están en curso.
  - Las reejecuciones específicas de canal local ahora comienzan a dividir el trabajo del canal compartido un poco antes, lo que evita que las reejecuciones específicas de tamaño mediano dejen un lote de canal compartido demasiado grande en la ruta crítica.
  - Las reejecuciones específicas de unidad local también dividen las selecciones de unidad compartida de tamaño medido en lotes medidos, lo que ayuda a que las reejecuciones enfocadas grandes se superpongan en lugar de esperar detrás de un solo carril de unidad compartida largo.
  - Las ejecuciones locales de múltiples superficies de alta memoria también utilizan lotes compartidos `unit-fast` ligeramente más gruesos para que el planificador mixto pase menos tiempo iniciando trabajadores de unidad compartida adicionales antes de que las superficies posteriores puedan superponerse.
  - Las ejecuciones compartidas de unidad, extensión, canal y gateway se mantienen en Vitest `forks`.
  - El contenedor mantiene las excepciones aisladas de bifurcación medidas y los carriles de singleton pesados explícitos en `test/fixtures/test-parallel.behavior.json`.
  - El contenedor separa los archivos medidos más pesados en carriles dedicados en lugar de confiar en una lista de exclusión mantenida manualmente y en crecimiento.
  - La evaluación comparativa del inicio de la CLI ahora tiene salidas guardadas distintas: `pnpm test:startup:bench:smoke` escribe el artefacto de humo específico en `.artifacts/cli-startup-bench-smoke.json`, `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` con `runs=5` y `warmup=1`, y `pnpm test:startup:bench:update` actualiza el dispositivo registrado en `test/fixtures/cli-startup-bench.json` con `runs=5` y `warmup=1`.
  - Para las ejecuciones locales solo de superficie, los carriles compartidos de unidad, extensión y canal pueden superponer sus puntos calientes aislados en lugar de esperar detrás de un prefijo serie.
  - Para ejecuciones locales multi-superficie, el contenedor mantiene las fases de la superficie compartida ordenadas, pero los lotes dentro de la misma fase compartida ahora se expanden juntos, el trabajo aislado diferido puede superponerse con la siguiente fase compartida, y el margen de `unit-fast` ahora inicia ese trabajo diferido antes en lugar de dejar esas ranuras inactivas.
  - Actualice las instantáneas de tiempo con `pnpm test:perf:update-timings` y `pnpm test:perf:update-timings:extensions` después de cambios importantes en la forma del suite.
- Nota del corredor integrado:
  - Cuando cambie las entradas de descubrimiento de message-tool o el contexto de tiempo de ejecución de compactación,
    mantenga ambos niveles de cobertura.
  - Agregue regresiones de ayudantes enfocadas para los límites de enrutamiento/normalización puros.
  - También mantenga los suites de integración del corredor integrado saludables:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esos suites verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayudantes no son un
    sustituto suficiente para esas rutas de integración.
- Nota del grupo:
  - La configuración base de Vitest todavía tiene por defecto `forks`.
  - Los carriles unit, channel, extension y gateway wrapper tienen por defecto `forks`.
  - Las configuraciones unit, channel y extension tienen por defecto `isolate: false` para un inicio de archivo más rápido.
  - `pnpm test` también pasa `--isolate=false` a nivel del contenedor.
  - Vuelva a optar por el aislamiento de archivos de Vitest con `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` o `OPENCLAW_TEST_NO_ISOLATE=false` también fuerzan ejecuciones aisladas.
- Nota de iteración local rápida:
  - `pnpm test:changed` ejecuta el contenedor con `--changed origin/main`.
  - `pnpm test:changed:max` mantiene el mismo filtro de archivos modificados pero usa el perfil de planificador local agresivo del contenedor.
  - `pnpm test:max` expone ese mismo perfil de planificador para una ejecución local completa.
  - En las versiones de Node locales compatibles, incluyendo Node 25, el perfil normal puede usar el paralelismo de carriles de nivel superior. `pnpm test:max` aún presiona más al planificador cuando desea una ejecución local más agresiva.
  - La configuración base de Vitest marca los archivos de manifiestos/configuración del contenedor como `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambien las entradas del planificador.
  - El contenedor mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles, pero asigna un `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH` local del carril para que los procesos concurrentes de Vitest no compitan en un directorio de caché experimental compartido.
  - Establezca `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea una ubicación de caché explícita para la creación de perfiles de ejecución única directa.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest más la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de creación de perfiles a los archivos cambiados desde `origin/main`.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montón del ejecutor para la suite de unidades con el paralelismo de archivos deshabilitado.

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `forks` para el aislamiento determinista entre archivos.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Anulaciones útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de extremo a extremo del gateway de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (puede ser más lento)

### E2E: OpenShell backend smoke

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia un gateway OpenShell aislado en el host a través de Docker
  - Crea un espacio aislado (sandbox) desde un Dockerfile local temporal
  - Ejercita el backend OpenShell de OpenClaw a través de `sandbox ssh-config` real + ejecución SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados y luego destruye el gateway y el entorno de prueba
- Overrides útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o a un script de contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona este proveedor/modelo realmente _hoy_ con credenciales reales?”
  - Detectar cambios en el formato del proveedor, peculiaridades de tool-calling, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Preferir ejecutar subconjuntos reducidos en lugar de “todo”
- Las ejecuciones Live obtienen `~/.profile` para recuperar las claves de API faltantes.
- De forma predeterminada, las ejecuciones Live aún aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los dispositivos unitarios no puedan mutar tu `~/.openclaw` real.
- Establezca `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando intencionalmente necesite que las pruebas en vivo usen su directorio de inicio real.
- `pnpm test:live` ahora tiene como predeterminado un modo más silencioso: mantiene la salida de progreso `[live] ...`, pero suprime el aviso adicional `~/.profile` y silencia los registros de arranque del gateway y la charla Bonjour. Establezca `OPENCLAW_LIVE_TEST_QUIET=0` si desea recuperar los registros de inicio completos.
- Rotación de claves API (específica del proveedor): establezca `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o override por Live vía `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan en las respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites Live ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de la consola de Vitest está en silencio.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/gateway se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos del gateway/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Edición de lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Tocar la red del gateway / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depuración de "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute una `pnpm test:live` reducida

## Live: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos anunciados actualmente** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración previa/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación comando por comando del gateway `node.invoke` para el nodo Android seleccionado.
- Configuración previa requerida:
  - Aplicación Android ya conectada y emparejada con el gateway.
  - Aplicación mantenida en primer plano.
  - Consentimiento de permisos/captura otorgado para las capacidades que espera que pasen.
- Anulaciones de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/en/platforms/android)

## Live: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para poder aislar los fallos:

- "Modelo directo" nos dice si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo del gateway" nos dice si la canalización completa del gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización del modelo directo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Use `getApiKeyForModel` para seleccionar modelos para los que tiene credenciales
  - Ejecuta una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establece `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para moderno) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en la prueba de humo del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - De forma predeterminada: almacén de perfiles y alternativas de entorno
  - Establece `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar el uso **únicamente del almacén de perfiles**
- Por qué existe:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente del gateway está rota"
  - Contiene regresiones pequeñas y aisladas (ejemplo: OpenAI Responses/Codex Responses repetición del razonamiento + flujos de llamadas a herramientas)

### Capa 2: Prueba de humo del Gateway + agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar un gateway en proceso
  - Crear/aplicar un parche a una sesión `agent:dev:*` (anulación del modelo por ejecución)
  - Iterar modelos-con-claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - funciona una invocación real de herramienta (sondeo de lectura)
    - sondeos opcionales de herramientas adicionales (sondeo de ejecución + lectura)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que puedas explicar los fallos rápidamente):
  - Sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que lo `read` y devuelva el nonce.
  - Sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal y luego lo `read` de vuelta.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Predeterminado: lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista de permitidos moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para limitar
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separada por comas)
- Las sondas de herramientas + imágenes siempre están activas en esta prueba en vivo:
  - sonda `read` + sonda `exec+read` (estrés de herramienta)
  - la sonda de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (nivel alto):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puede probar en su máquina (y los IDs exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del token de configuración de Anthropic

- Prueba: `src/agents/anthropic.setup-token.live.test.ts`
- Objetivo: verificar que el token de configuración de Claude Code CLI (o un perfil de token de configuración pegado) pueda completar un mensaje de Anthropic.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Fuentes de token (elija una):
  - Perfil: `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Token sin procesar: `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Anulación de modelo (opcional):
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Ejemplo de configuración:

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## En vivo: prueba de humo del backend CLI (Claude Code CLI u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente utilizando un backend CLI local, sin tocar su configuración predeterminada.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Modelo: `claude-cli/claude-sonnet-4-6`
  - Comando: `claude`
  - Argumentos: `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Anulaciones (opcionales):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos de CLI en lugar de inyección en el prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando se establece `IMAGE_ARG`.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` para mantener la configuración MCP de Claude Code CLI habilitada (por defecto deshabilita la configuración MCP con un archivo temporal vacío).

Ejemplo:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Receta de Docker:

```bash
pnpm test:docker:live-cli-backend
```

Notas:

- El ejecutor de Docker se encuentra en `scripts/test-live-cli-backend-docker.sh`.
- Ejecuta la prueba de humo del backend CLI en vivo dentro de la imagen Docker del repositorio como el usuario no root `node`, porque Claude CLI rechaza `bypassPermissions` cuando se invoca como root.
- Para `claude-cli`, instala el paquete Linux `@anthropic-ai/claude-code` en un prefijo escribible en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- Copia `~/.claude` en el contenedor cuando está disponible, pero en máquinas donde la autenticación de Claude está respaldada por `ANTHROPIC_API_KEY`, también conserva `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_OLD` para el hijo Claude CLI a través de `OPENCLAW_LIVE_CLI_BACKEND_PRESERVE_ENV`.

## En vivo: prueba de humo de enlace ACP (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de enlace de conversación ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación sintética de canal de mensajes en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Habilitar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valores predeterminados:
  - Agente ACP: `claude`
  - Canal sintético: contexto de conversación estilo mensaje directo de Slack
  - Backend de ACP: `acpx`
- Anulaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=/full/path/to/acpx`
- Notas:
  - Este carril utiliza la superficie `chat.send` de la puerta de enlace con campos de ruta de origen sintéticos solo para administradores, para que las pruebas puedan adjuntar el contexto del canal del mensaje sin fingir la entrega externa.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND` no está establecido, la prueba utiliza el comando acpx configurado/empaquetado. Si la autenticación de su arnés depende de las variables de entorno de `~/.profile`, prefiera un comando `acpx` personalizado que preserve las variables de entorno del proveedor.

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

Notas de Docker:

- El ejecutor de Docker se encuentra en `scripts/test-live-acp-bind-docker.sh`.
- Obtiene `~/.profile`, copia el directorio de inicio de autenticación de CLI coincidente (`~/.claude` o `~/.codex`) en el contenedor, instala `acpx` en un prefijo de npm escribible y luego instala la CLI live solicitada (`@anthropic-ai/claude-code` o `@openai/codex`) si falta.
- Dentro de Docker, el ejecutor establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveedor del perfil obtenido disponibles para la CLI del arnés secundario.

### Recetas live recomendadas

Las listas de permitidos estrechas y explícitas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin puerta de enlace):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo de puerta de enlace:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada a herramientas en varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` utiliza la API de Gemini (clave de API).
- `google-antigravity/...` utiliza el puente OAuth de Antigravity (punto final de agente estilo Cloud Code Assist).
- `google-gemini-cli/...` utiliza la CLI de Gemini local en su máquina (autenticación separada + peculiaridades de herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API alojada de Gemini de Google a través de HTTP (clave de API / autenticación de perfil); esto es lo que la mayoría de los usuarios entienden por "Gemini".
  - CLI: OpenClaw invoca un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (streaming/soporte de herramientas/diferencia de versión).

## Live: matriz de modelos (lo que cubrimos)

No existe una “lista de modelos de CI” fija (live es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de pruebas de humo modernas (tool calling + imagen)

Esta es la ejecución de “modelos comunes” que esperamos que siga funcionando:

- OpenAI (non-Codex): `openai/gpt-5.2` (opcional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar los modelos más antiguos de Gemini 2.x)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecuta pruebas de humo del gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: tool calling (Read + Exec opcional)

Elige al menos uno por familia de proveedor:

- OpenAI: `openai/gpt-5.2` (o `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (bueno tener):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elige un modelo con capacidad de “herramientas” que tengas habilitado)
- Cerebras: `cerebras/`… (si tienes acceso)
- LM Studio: `lmstudio/`… (local; tool calling depende del modo de API)

### Vision: envío de imagen (archivo adjunto → mensaje multimodal)

Incluye al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes con visión de Claude/Gemini/OpenAI, etc.) para ejercitar la sonda de imagen.

### Agregadores / gateways alternativos

Si tienes claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; usa `openclaw models scan` para encontrar candidatos con capacidad de herramienta+imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación mediante `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (puntos de conexión personalizados): `minimax` (nube/API), además de cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar "todos los modelos" en los documentos. La lista autoritativa es lo que `discoverModels(...)` devuelva en tu máquina + las claves que estén disponibles.

## Credenciales (nunca confirms)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice "sin credenciales", depura de la misma manera en la que depurarías `openclaw models list` / la selección del modelo.

- Almacenamiento de perfiles: `~/.openclaw/credentials/` (preferido; a lo que se refiere "claves de perfil" en las pruebas)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Las ejecuciones locales en vivo copian la configuración activa más los almacenes de autenticación en un directorio de prueba temporal de manera predeterminada; las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan en esa copia preparada para que las sondas se mantengan fuera de tu área de trabajo del host real.

Si quieres confiar en claves de entorno (por ejemplo, exportadas en tu `~/.profile`), ejecuta pruebas locales después de `source ~/.profile`, o usa los ejecutores de Docker a continuación (ellos pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Plan de codificación BytePlus en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación opcional de modelo: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Alcance:
  - Enumera cada complemento de proveedor de generación de imágenes registrado
  - Carga las variables de entorno del proveedor faltantes desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/de entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta las variantes de generación de imágenes estándar a través de la capacidad de tiempo de ejecución compartida:
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Proveedores empaquetados actuales cubiertos:
  - `openai`
  - `google`
- Narrowing opcional:
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos grupos:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan `pnpm test:live` dentro de la imagen Docker del repositorio, montando tu directorio de configuración local y espacio de trabajo (y obteniendo `~/.profile` si está montado).
- Ejecutores de pruebas de humo de contenedor: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelos en vivo también montan mediante bind únicamente los directorios de autenticación de CLI necesarios (o todos los compatibles cuando la ejecución no se limita), luego los copian en el directorio principal del contenedor antes de la ejecución para que la OAuth de CLI externa pueda actualizar los tokens sin modificar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes del Gateway (dos contenedores, autenticación WS + estado de salud): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Puente del canal MCP (Gateway inicializado + puente stdio + prueba de humo de marcos de notificación sin procesar de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (prueba de humo de instalación + alias `/plugin` + semánticas de reinicio del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de modelo en vivo también montan el checkout actual de solo lectura
y lo ubican en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen
en tiempo de ejecución ligera mientras se ejecuta Vitest contra tu código fuente/configuración
local exacta. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo
del gateway no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor.
`test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pasa también
`OPENCLAW_LIVE_GATEWAY_*` cuando necesites restringir o excluir la cobertura
en vivo del gateway desde ese carril de Docker.
`test:docker:openwebui` es una prueba de humo de compatibilidad de alto nivel: inicia un
contenedor de gateway OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados,
inicia un contenedor Open WebUI anclado contra ese gateway, inicia sesión a través de
Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una
solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI.
La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar descargar la
imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de inicio en frío.
Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE`
(`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones en Docker.
Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model":
"openclaw/default", ... }`.
`test:docker:mcp-channels` es intencionalmente determinista y no necesita una
cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway sembrado,
inicia un segundo contenedor que genera `openclaw mcp serve`, y luego
verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos,
comportamiento de la cola de eventos en vivo, enrutamiento de envíos salientes y notificaciones de canal +
permisos estilo Claude sobre el puente stdio MCP real. La verificación de notificaciones
inspecciona los cuadros MCP stdio crudos directamente, por lo que la prueba valida lo que
el puente realmente emite, no solo lo que un SDK de cliente específico sucede exponer.

Prueba de humo manual de hilo en lenguaje natural ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación de enrutamiento de hilos ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y origen antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios de autenticación de CLI externos bajo `$HOME` se montan como de solo lectura bajo `/host-auth/...` y luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Predeterminado: montar todos los directorios compatibles (`.codex`, `.claude`, `.minimax`)
  - Las ejecuciones de proveedor reducidas montan solo los directorios necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anular manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none` o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores en el contenedor
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para garantizar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen fijada de Open WebUI

## Integridad de documentos

Ejecuta comprobaciones de documentos después de editar los documentos: `pnpm check:docs`.
Ejecuta la validación completa de anclajes de Mintlify cuando también necesites comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de “canalización real” sin proveedores reales:

- Llamada de herramienta de puerta de enlace (OpenAI simulada, bucle de agente + puerta de enlace real): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada de herramienta de OpenAI simulada de extremo a extremo a través del bucle de agente de la puerta de enlace")
- Asistente de puerta de enlace (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simuladas a través del bucle real de puerta de enlace + agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (consulte [Habilidades](/en/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la transferencia del historial de la sesión y los límites del entorno sandbox.

Las evaluaciones futuras deben mantenerse primero como deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso frente a evitación, restricción, inyección de mensajes).
- Evaluaciones en vivo opcionales (participación opcional, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma del complemento y del canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan un conjunto de aserciones de forma y comportamiento. El carril unitario `pnpm test` predeterminado omite intencionalmente estos archivos compartidos de costura y humo; ejecute los comandos de contrato explícitamente cuando toque superficies compartidas de canal o proveedor.

### Comandos

- Todos los contratos: `pnpm test:contracts`
- Solo contratos de canal: `pnpm test:contracts:channels`
- Solo contratos de proveedor: `pnpm test:contracts:plugins`

### Contratos de canal

Ubicados en `src/channels/plugins/contracts/*.contract.test.ts`:

- **plugin** - Forma básica del complemento (id, nombre, capacidades)
- **setup** - Contrato del asistente de configuración
- **session-binding** - Comportamiento de vinculación de sesión
- **outbound-payload** - Estructura de carga útil del mensaje
- **inbound** - Manejo de mensajes entrantes
- **actions** - Controladores de acciones del canal
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Aplicación de políticas de grupo

### Contratos de estado del proveedor

Ubicado en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondas de estado del canal
- **registry** - Forma del registro de complementos

### Contratos del proveedor

Ubicado en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato de flujo de autenticación
- **auth-choice** - Elección/Selección de autenticación
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
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantenga la prueba en vivo reducida y opcional mediante variables de entorno
- Prefiera apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Guardián de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si agrega una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualice `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en ids de objetivos no clasificados para que las nuevas clases no se puedan omitir silenciosamente.
