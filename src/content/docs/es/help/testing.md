---
summary: "Kit de pruebas: suites unitarias/e2e/en vivo, ejecutores de Docker y qué cubre cada prueba"
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
- Ejecución local completa de suite más rápida en una máquina amplia: `pnpm test:max`

Cuando tocas pruebas o quieres mayor confianza:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramientas/imágenes de gateway): `pnpm test:live`
- Apuntar a un archivo en vivo silenciosamente: `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Consejo: cuando solo necesitas un caso fallido, prefiere restringir las pruebas en vivo a través de las variables de entorno de lista blanca descritas a continuación.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como de "realismo creciente" (y mayor volatilidad/costo):

### Unitarias / de integración (predeterminado)

- Comando: `pnpm test`
- Configuración: `scripts/test-parallel.mjs` (ejecuta `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Archivos: `src/**/*.test.ts`, `extensions/**/*.test.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Deben ser rápidas y estables
- Nota del programador:
  - `pnpm test` ahora mantiene un pequeño manifiesto de comportamiento confirmado para las anulaciones verdaderas de pool/aislamiento y una instantánea de tiempo separada para los archivos unit más lentos.
  - Las ejecuciones locales solo de extensiones ahora también usan una instantánea de tiempo de extensiones confirmada, además de un objetivo de lotes compartido ligeramente más grueso en hosts con mucha memoria, por lo que el carril de extensiones compartidas evita generar un lote adicional cuando dos ejecuciones compartidas medidas son suficientes.
  - Los lotes compartidos de extensiones locales de alta memoria también se ejecutan con un límite de trabajadores ligeramente mayor que antes, lo que acortó los dos lotes de extensiones compartidas restantes sin cambiar los carriles de extensiones aisladas.
  - Las ejecuciones de canal locales de alta memoria ahora reutilizan la instantánea de tiempo de canal confirmada para dividir el carril de canales compartidos en unos pocos lotes medidos en lugar de un solo trabajador compartido largo.
  - Los lotes compartidos de canal local de alta memoria también se ejecutan con un límite de trabajadores ligeramente menor que los lotes unit compartidos, lo que ayudó a las reejecuciones de canal específicas a evitar la sobresuscripción de CPU una vez que los carriles de canal aislados ya están en marcha.
  - Las reejecuciones de canal local específicas ahora comienzan a dividir el trabajo del canal compartido un poco antes, lo que evita que las reejecuciones específicas de tamaño mediano dejen un lote de canal compartido sobredimensionado en la ruta crítica.
  - Las reejecuciones unit locales específicas también dividen las selecciones unit compartidas de tamaño mediano en lotes medidos, lo que ayuda a que las reejecuciones específicas grandes se superpongan en lugar de esperar detrás de un solo carril unit compartido largo.
  - Las ejecuciones locales de múltiples superficies con alta memoria también utilizan lotes `unit-fast` compartidos ligeramente más gruesos para que el planificador mixto dedique menos tiempo a iniciar trabajadores de unidad compartidos adicionales antes de que las superficies posteriores puedan superponerse.
  - Las ejecuciones de unidad compartida, extensión, canal y puerta de enlace se mantienen en Vitest `forks`.
  - El contenedor mantiene las excepciones medidas de fork aisladas y los carriles pesados de singleton explícitos en `test/fixtures/test-parallel.behavior.json`.
  - El contenedor separa los archivos medidos más pesados en carriles dedicados en lugar de confiar en una lista de exclusión mantenida manualmente y en crecimiento.
  - Para las ejecuciones locales de solo superficie, los carriles compartidos de unidad, extensión y canal pueden superponer sus puntos críticos aislados en lugar de esperar detrás de un prefijo en serie.
  - Para las ejecuciones locales de múltiples superficies, el contenedor mantiene las fases de superficie compartidas ordenadas, pero los lotes dentro de la misma fase compartida ahora se expanden juntos, el trabajo aislado diferido puede superponerse con la siguiente fase compartida, y el margen `unit-fast` de repuesto ahora inicia ese trabajo diferido antes en lugar de dejar esas ranuras inactivas.
  - Actualice las instantáneas de sincronización con `pnpm test:perf:update-timings` y `pnpm test:perf:update-timings:extensions` después de cambios importantes en la forma del conjunto.
- Nota del ejecutor integrado:
  - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de ejecución de compactación,
    mantenga ambos niveles de cobertura.
  - Añada regresiones de auxiliares enfocadas para los límites de enrutamiento/normalización puros.
  - También mantenga sanos los conjuntos de integración del ejecutor integrado:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esos conjuntos verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de auxiliares no son un
    sustituto suficiente para esas rutas de integración.
- Nota del grupo:
  - La configuración base de Vitest todavía tiene `forks` como valor predeterminado.
  - Los carriles de contenedores de unidad, canal, extensión y puerta de enlace tienen `forks` como valor predeterminado.
  - Las configuraciones de unidad, canal y extensión tienen `isolate: false` como valor predeterminado para un inicio de archivo más rápido.
  - `pnpm test` también pasa `--isolate=false` a nivel de envoltorio (wrapper).
  - Vuelva a activar el aislamiento de archivos de Vitest con `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` o `OPENCLAW_TEST_NO_ISOLATE=false` también fuerzan ejecuciones aisladas.
- Nota de iteración local rápida:
  - `pnpm test:changed` ejecuta el envoltorio con `--changed origin/main`.
  - `pnpm test:changed:max` mantiene el mismo filtro de archivos modificados pero usa el perfil de planificador local agresivo del envoltorio.
  - `pnpm test:max` expone ese mismo perfil de planificador para una ejecución local completa.
  - En las versiones de Node locales compatibles, incluido Node 25, el perfil normal puede usar el paralelismo de carriles de nivel superior. `pnpm test:max` todavía impulsa más al planificador cuando desea una ejecución local más agresiva.
  - La configuración base de Vitest marca los archivos de manifiesto/configuración del envoltorio como `forceRerunTriggers` para que las reejecuciones en modo modificado se mantengan correctas cuando cambian las entradas del planificador.
  - El envoltorio mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles, pero asigna un `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH` local al carril para que los procesos concurrentes de Vitest no compitan en un directorio de caché experimental compartido.
  - Configure `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea una ubicación de caché explícita para la creación de perfiles de ejecución única directa.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest además de la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de creación de perfiles a los archivos modificados desde `origin/main`.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montón del ejecutor para la suite de unitarios con el paralelismo de archivos deshabilitado.

### E2E (prueba de humo del gateway)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `forks` para un aislamiento determinista entre archivos.
  - Utiliza trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- anulaciones útiles:
- `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
- `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Ámbito:
  - Comportamiento de extremo a extremo del gateway de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: prueba de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace OpenShell aislada en el host a través de Docker
  - Crea un sandbox desde un Dockerfile local temporal
  - Ejecuta el backend de OpenShell de OpenClaw sobre `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos remoto canónico a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no forma parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la puerta de enlace de prueba y el sandbox
- Anulaciones útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o a un script de contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Este proveedor/modelo realmente funciona _hoy_ con credenciales reales?”
  - Detectar cambios en el formato del proveedor, peculiaridades de la llamada a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Prefiere ejecutar subconjuntos reducidos en lugar de "todo"
- Las ejecuciones en vivo (live) ejecutan el código fuente `~/.profile` para recuperar las claves de API faltantes.
- De forma predeterminada, las ejecuciones en vivo aún aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los accesorios de unit no puedan mutar tu `~/.openclaw` real.
- Establece `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando intencionalmente necesites que las pruebas en vivo usen tu directorio de inicio real.
- `pnpm test:live` ahora por defecto a un modo más silencioso: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso adicional de `~/.profile` y silencia los registros de arranque de la puerta de enlace y el charla de Bonjour. Establece `OPENCLAW_LIVE_TEST_QUIET=0` si deseas recuperar los registros de inicio completos.
- Rotación de claves de API (específica del proveedor): establece `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo, `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por live mediante `OPENCLAW_LIVE_*_KEY`; las pruebas reintentan ante las respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites Live ahora emiten líneas de progreso a stderr para que las llamadas prolongadas a los proveedores se vean activas incluso cuando la captura de la consola de Vitest está en silencio.
  - `vitest.live.config.ts` desactiva la interceptación de la consola de Vitest para que las líneas de progreso del proveedor/puerta de enlace se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos (heartbeats) del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos (heartbeats) de la puerta de enlace (gateway)/sonda (probe) con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Edición de lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Modificar la red de la puerta de enlace (gateway) / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depurar "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute un `pnpm test:live` limitado

## Live: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos anunciados actualmente** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración previa/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación comando por comando de la puerta de enlace (gateway) `node.invoke` para el nodo Android seleccionado.
- Requisitos previos:
  - La aplicación Android ya está conectada y emparejada con la puerta de enlace (gateway).
  - Aplicación mantenida en primer plano.
  - Permisos/consentimiento de captura otorgados para las capacidades que espera que pasen.
- Sobrescrituras de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de la configuración de Android: [Android App](/en/platforms/android)

## Live: model smoke (profile keys)

Las pruebas en vivo se dividen en dos capas para poder aislar los fallos:

- “Direct model” nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- “Gateway smoke” nos indica si la canalización completa de gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización del modelo directo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar los modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar los modelos para los que tiene credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invoca Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en el smoke de gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y respaldos de env
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacén de perfiles**
- Por qué existe:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente de la pasarela está rota"
  - Contiene pequeñas regresiones aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Pasarela + prueba de humo del agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una pasarela en proceso
  - Crear/aplicar un parche a una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos con claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - una invocación de herramienta real funciona (sondeo de lectura)
    - sondeos de herramienta extra opcionales (sondeo exec+read)
    - Las rutas de regresión de OpenAI (solo llamadas a herramientas → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que lo `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal, luego lo `read` de vuelta.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Predeterminado: lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista de permitidos moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para reducir
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separada por comas)
- Las sondas de herramientas e imágenes siempre están activas en esta prueba en vivo:
  - sonda `read` + sonda `exec+read` (estrés de herramientas)
  - la sonda de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (nivel alto):
    - La prueba genera un PNG diminuto con “CAT” + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - El Gateway analiza los adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje multimodal del usuario al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puede probar en su máquina (y los IDs exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del token de configuración de Anthropic

- Prueba: `src/agents/anthropic.setup-token.live.test.ts`
- Objetivo: verificar que el token de configuración de la CLI de Claude Code (o un perfil de token de configuración pegado) pueda completar un mensaje de Anthropic.
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

## Live: CLI backend smoke (Claude Code CLI u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización (pipeline) de Gateway + agente utilizando un backend de CLI local, sin tocar su configuración predeterminada.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Modelo: `claude-cli/claude-sonnet-4-6`
  - Comando: `claude`
  - Args: `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Anulaciones (opcional):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el mensaje).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivo de imagen como argumentos de CLI en lugar de la inyección en el mensaje.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando `IMAGE_ARG` está configurado.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` para mantener la configuración de MCP de Claude Code CLI habilitada (por defecto deshabilita la configuración de MCP con un archivo temporal vacío).

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
- Ejecuta el smoke del backend CLI en vivo dentro de la imagen Docker del repositorio como el usuario no root `node`, porque Claude CLI rechaza `bypassPermissions` cuando se invoca como root.
- Para `claude-cli`, instala el paquete de Linux `@anthropic-ai/claude-code` en un prefijo escribible en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- Copia `~/.claude` en el contenedor cuando está disponible, pero en máquinas donde la autenticación de Claude está respaldada por `ANTHROPIC_API_KEY`, también preserva `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_OLD` para el hijo de Claude CLI a través de `OPENCLAW_LIVE_CLI_BACKEND_PRESERVE_ENV`.

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de conversación-bind de ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación sintética de message-channel en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Activar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valores predeterminados:
  - Agente ACP: `claude`
  - Canal sintético: contexto de conversación estilo MD de Slack
  - Backend ACP: `acpx`
- Anulaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=/full/path/to/acpx`
- Notas:
  - Este carril utiliza la superficie `chat.send` de la puerta de enlace con campos de ruta de origen sintéticos solo para administradores, de modo que las pruebas puedan adjuntar el contexto del message-channel sin fingir entregar externamente.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND` no está definido, la prueba utiliza el comando acpx configurado/incluido. Si la autenticación del arnés depende de variables de entorno de `~/.profile`, es preferible un comando `acpx` personalizado que preserve las variables de entorno del proveedor.

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
- Este obtiene `~/.profile`, copia el directorio de autenticación de CLI correspondiente (`~/.claude` o `~/.codex`) en el contenedor, instala `acpx` en un prefijo de npm escribible y luego instala la CLI live solicitada (`@anthropic-ai/claude-code` o `@openai/codex`) si falta.
- Dentro de Docker, el ejecutor establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveedor del perfil obtenido disponibles para la CLI del arnés secundario.

### Recetas live recomendadas

Las listas de permitidos explícitas y estrechas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo del gateway:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada a herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa la API de Gemini (clave de API).
- `google-antigravity/...` usa el puente OAuth de Antigravity (punto final del agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa la CLI de Gemini local en su máquina (autenticación separada + peculiaridades de las herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API de Gemini alojada de Google a través de HTTP (clave de API / autenticación de perfil); esto es lo que la mayoría de los usuarios entienden por “Gemini”.
  - CLI: OpenClaw ejecuta un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (soporte de transmisión/herramientas/diferencia de versión).

## Live: matriz de modelos (lo que cubrimos)

No hay una “lista de modelos de CI” fija (live es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de pruebas de humo modernas (llamadas a herramientas + imagen)

Esta es la ejecución de “modelos comunes” que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.2` (opcional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar los modelos más antiguos de Gemini 2.x)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecutar prueba de humo (smoke) de gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elija al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.2` (o `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (conveniente tener):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elija un modelo con capacidad de "tools" que tenga habilitado)
- Cerebras: `cerebras/`… (si tiene acceso)
- LM Studio: `lmstudio/`… (local; la llamada a herramientas depende del modo API)

### Visión: envío de imagen (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imagen.

### Agregadores / puertas de enlace alternativas

Si tiene las claves habilitadas, también admitimos las pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; use `openclaw models scan` para encontrar candidatos con capacidad de herramientas e imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación a través de `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puede incluir en la matriz en vivo (si tiene credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (puntos finales personalizados): `minimax` (nube/API), además de cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar de forma rígida “todos los modelos” en los documentos. La lista autoritativa es lo que `discoverModels(...)` devuelva en tu máquina + las claves que estén disponibles.

## Credenciales (nunca las confirmes en el control de versiones)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo indica “no hay credenciales”, depura de la misma manera en la que depurarías `openclaw models list` / la selección de modelo.

- Almacén de perfil: `~/.openclaw/credentials/` (preferido; lo que significa “claves de perfil” en las pruebas)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Las ejecuciones locales en vivo copian la configuración activa más los almacenes de autenticación en un directorio de prueba temporal de forma predeterminada; las anulaciones de ruta de `agents.*.workspace` / `agentDir` se eliminan en esa copia preparada para que los sondeos no afecten tu espacio de trabajo real del host.

Si deseas confiar en claves de entorno (p. ej., exportadas en tu `~/.profile`), ejecuta las pruebas locales después de `source ~/.profile`, o utiliza los ejecutores de Docker a continuación (ellos pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación opcional de modelo: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Alcance:
  - Enumera cada complemento de proveedor de generación de imágenes registrado
  - Carga las variables de entorno del proveedor faltantes desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/en lugar de los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta las variantes de generación de imágenes estándar a través de la capacidad de tiempo de ejecución compartida:
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Proveedores incluidos actualmente cubiertos:
  - `openai`
  - `google`
- Reducción opcional:
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos grupos:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan `pnpm test:live` dentro de la imagen de Docker del repositorio, montando tu directorio de configuración local y el espacio de trabajo (y obteniendo `~/.profile` si está montado).
- Ejecutores de prueba de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de mayor nivel.

Los ejecutores Docker de modelos en vivo también montan mediante bind (bind-mount) solo los directorios de autenticación de CLI necesarios (o todos los compatibles cuando la ejecución no está limitada), y luego los copian en el directorio home del contenedor antes de la ejecución para que el OAuth de CLI externo pueda actualizar los tokens sin mutar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes del Gateway (dos contenedores, autenticación WS + estado de salud): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Puente de canal MCP (Gateway con semillas + puente stdio + prueba de humo de marco de notificación sin procesar de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (install smoke + `/plugin` alias + Claude-bundle restart semantics): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de modelos en vivo también montan el repositorio actual en modo de solo lectura y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de ejecución ligera mientras aún ejecuta Vitest contra su código fuente/configuración local exacta. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la puerta de enlace no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pase también `OPENCLAW_LIVE_GATEWAY_*` cuando necesite acotar o excluir la cobertura en vivo de la puerta de enlace desde ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor anclado de Open WebUI contra esa puerta de enlace, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default` y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar descargar la imagen de Open WebUI y Open WebUI puede necesitar terminar su propia configuración de arranque en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen un pequeño payload JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Arranca un contenedor de Gateway semillado, inicia un segundo contenedor que genera `openclaw mcp serve` y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envío saliente y notificaciones de canal y permisos estilo Claude a través del puente MCP stdio real. La verificación de notaciones inspecciona los marcos MCP stdio sin procesar directamente, por lo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a exponer.

Prueba de humo de subprocesos en lenguaje sencillo de ACP manual (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de subprocesos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios de autenticación de CLI externos bajo `$HOME` se montan como solo lectura bajo `/host-auth/...` y luego se copian en `/home/node/...` antes de que inicien las pruebas
  - Predeterminado: montar todos los directorios compatibles (`.codex`, `.claude`, `.minimax`)
  - Las ejecuciones de proveedor reducidas montan solo los directorios necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anular manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para garantizar que las credenciales provengan del almacén de perfiles (no de las variables de entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el aviso de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen anclada de Open WebUI

## Pruebas de cordura de la documentación

Ejecute las comprobaciones de documentos después de editarlos: `pnpm check:docs`.
Ejecute la validación completa de anclajes de Mintlify cuando también necesite comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (seguro para CI)

Estas son regresiones de “canalización real” sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta de OpenAI simulada de extremo a extremo a través del bucle de agente de gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como “evaluaciones de confiabilidad del agente”:

- Llamada a herramientas simulada a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (consulte [Habilidades](/en/tools/skills)):

- **Toma de decisiones:** cuando se enumeran las habilidades en el prompt, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de varios turnos que afirman el orden de las herramientas, la persistencia del historial de la sesión y los límites del espacio aislado (sandbox).

Las evaluaciones futuras deben mantenerse primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + orden, lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios enfocados en habilidades (uso frente a evitación, bloqueo, inyección de avisos).
- Evaluaciones en vivo opcionales (opt-in, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma del complemento y del canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una serie de afirmaciones de forma y comportamiento. El carril unitario `pnpm test` por defecto omite intencionalmente estos archivos compartidos de seam y smoke; ejecute los comandos de contrato explícitamente cuando toque superficies compartidas de canales o proveedores.

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
- **actions** - Manejadores de acciones de canal
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Cumplimiento de la política de grupo

### Contratos de estado del proveedor

Ubicado en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondeos de estado del canal
- **registry** - Forma del registro de plugins

### Contratos del proveedor

Ubicado en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato del flujo de autenticación
- **auth-choice** - Elección/selección de autenticación
- **catalog** - API del catálogo de modelos
- **discovery** - Descubrimiento de plugins
- **loader** - Carga de plugins
- **runtime** - Tiempo de ejecución del proveedor
- **shape** - Forma/interfaz del plugin
- **wizard** - Asistente de configuración

### Cuándo ejecutar

- Después de cambiar las exportaciones o subrutas de plugin-sdk
- Después de agregar o modificar un plugin de canal o proveedor
- Después de refactorizar el registro o descubrimiento de plugins

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (orientación)

Cuando corrijas un problema de proveedor/modelo descubierto en vivo:

- Agrega una regresión segura para CI si es posible (proveedor simulado/stub, o captura la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantenga la prueba en vivo limitada y opcional a través de variables de entorno
- Prefiera apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramienta de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Salvaguarda de recorrido SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo muestreado por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los identificadores de ejecución de segmento de recorrido son rechazados.
  - Si agrega una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualice `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los identificadores de objetivo no clasificados para que las nuevas clases no puedan omitirse silenciosamente.
