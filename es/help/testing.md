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

- Ejecución completa (esperado antes del push): `pnpm build && pnpm check && pnpm test`

Cuando tocas pruebas o quieres mayor seguridad:

- Ejecución de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`

Consejo: cuando solo necesitas un caso fallido, preferible acotar las pruebas en vivo mediante las variables de entorno de lista blanca descritas a continuación.

## Suites de pruebas (qué se ejecuta dónde)

Piensa en las suites como un “realismo creciente” (y mayor inestabilidad/costo):

### Unitaria / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: `scripts/test-parallel.mjs` (ejecuta `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Archivos: `src/**/*.test.ts`, `extensions/**/*.test.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación del gateway, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápida y estable
- Nota del planificador:
  - `pnpm test` ahora mantiene un pequeño manifiesto de comportamiento verificado para las anulaciones verdaderas de grupo/aislamiento y una instantánea de tiempo separada para los archivos unitarios más lentos.
  - La cobertura unitaria compartida ahora por defecto es `threads`, mientras que el manifiesto mantiene las excepciones medidas solo de bifurcación y los carriles pesados de singleton explícitos.
  - El carril de extensión compartida todavía por defecto es `threads`; el contenedor mantiene excepciones explícitas solo de bifurcación en `test/fixtures/test-parallel.behavior.json` cuando un archivo no puede compartir de forma segura un trabajador no aislado.
  - La suite de canales (`vitest.channels.config.ts`) ahora también por defecto es `threads`; la ejecución de control de suite completa directa del 22 de marzo de 2026 pasó limpia sin excepciones de bifurcación específicas del canal.
  - El contenedor extrae los archivos medidos más pesados en carriles dedicados en lugar de confiar en una lista de exclusión mantenido manualmente y en crecimiento.
  - Actualice la instantánea de tiempo con `pnpm test:perf:update-timings` después de cambios importantes en la forma de la suite.
- Nota del ejecutor integrado:
  - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación,
    mantenga ambos niveles de cobertura.
  - Agregue regresiones de ayudante enfocadas para límites puros de enrutamiento/normalización.
  - También mantenga las suites de integración del ejecutor integrado saludables:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esas suites verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayudantes no son un
    sustituto suficiente para esas rutas de integración.
- Nota del grupo:
  - La configuración base de Vitest todavía por defecto es `forks`.
  - Los carriles del contenedor de unidades por defecto son `threads`, con excepciones explícitas de manifiesto solo de bifurcación.
  - La configuración con ámbito de extensión por defecto es `threads`.
  - La configuración con ámbito de canal por defecto es `threads`.
  - Las configuraciones de unidad, canal y extensión por defecto son `isolate: false` para un inicio de archivo más rápido.
  - `pnpm test` también pasa `--isolate=false` a nivel del contenedor.
  - Opte por volver al aislamiento de archivos de Vitest con `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` o `OPENCLAW_TEST_NO_ISOLATE=false` también fuerzan ejecuciones aisladas.
- Nota de iteración local rápida:
  - `pnpm test:changed` ejecuta el contenedor con `--changed origin/main`.
  - La configuración base de Vitest marca los archivos de manifiestos/configuración del contenedor como `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambian las entradas del planificador.
  - La caché del módulo del sistema de archivos de Vitest ahora está habilitada por defecto para las reejecuciones de pruebas del lado de Node.
  - Deshabilítelo con `OPENCLAW_VITEST_FS_MODULE_CACHE=0` o `OPENCLAW_VITEST_FS_MODULE_CACHE=false` si sospecha de un comportamiento obsoleto de la caché de transformación.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest más la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a los archivos cambiados desde `origin/main`.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y de montón (heap) del ejecutor para la suite de unit con el paralelismo de archivos deshabilitado.

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `forks` para el aislamiento determinista entre archivos.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 por defecto).
  - Se ejecuta en modo silencioso por defecto para reducir la sobrecarga de E/S de la consola.
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de un extremo a otro (end-to-end) de la puerta de enlace de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: OpenShell backend smoke

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace aislada de OpenShell en el host mediante Docker
  - Crea un sandbox desde un Dockerfile temporal local
  - Ejercita el backend OpenShell de OpenClaw a través de `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución predeterminada de `pnpm test:e2e`
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye el gateway de prueba y el sandbox
- Útiles overrides:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el suite e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario de CLI no predeterminado o a un script wrapper

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Config: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona realmente este proveedor/modelo _hoy_ con credenciales reales?”
  - Detectar cambios en el formato del proveedor, peculiaridades de las llamadas a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas de proveedor reales, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Preferir ejecutar subconjuntos limitados en lugar de “todo”
  - Las ejecuciones Live obtendrán `~/.profile` para recuperar las claves de API faltantes
- Rotación de claves de API (específica del proveedor): establecer `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o override por live a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de tasa.
- Salida de progreso/latido:
  - Los suites Live ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de la consola de Vitest está en silencio.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/gateway se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos de modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos de gateway/probe con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Editando lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Modificando la red del gateway / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depurando “mi bot está caído” / fallas específicas del proveedor / llamadas a herramientas: ejecute un `pnpm test:live` limitado

## En vivo: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos anunciados actualmente** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración precondicionada/manual (el suite no instala/ejecuta/empareja la aplicación).
  - Validación de `node.invoke` del puerta de enlace comando por comando para el nodo Android seleccionado.
- Configuración previa requerida:
  - Aplicación Android ya conectada + emparejada con el puerta de enlace.
  - Aplicación mantenida en primer plano.
  - Permisos/consentimiento de captura otorgados para las capacidades que esperas que pasen.
- Anulaciones de destino opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/es/platforms/android)

## En vivo: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- "Modelo directo" nos dice si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo del puerta de enlace" nos dice si la tubería completa del puerta de enlace+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización de modelo directo (sin puerta de enlace)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar modelos para los que tienes credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente este suite; de lo contrario, se omite para mantener `pnpm test:live` enfocado en la prueba de humo del puerta de enlace
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y alternativas de entorno
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacén de perfiles**
- Por qué existe esto:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente de la puerta de enlace está rota"
  - Contiene pequeñas regresiones aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Prueba de humo de la puerta de enlace + agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una puerta de enlace en proceso
  - Crear/patchear una sesión `agent:dev:*` (anulación del modelo por ejecución)
  - Iterar modelos-con-claves y afirmar:
    - una respuesta "significativa" (sin herramientas)
    - funciona una invocación de herramienta real (sondeo de lectura)
    - sondeos de herramienta adicionales opcionales (sondeo de exec+read)
    - las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que lo `read` y repita el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal y luego lo `read` de vuelta.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Predeterminado: lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista de permitidos moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para acotar
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separada por comas)
- Los sondas de herramienta + imagen siempre están activados en esta prueba en vivo:
  - sondeo `read` + sondeo `exec+read` (estrés de herramienta)
  - el sondeo de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (alto nivel):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje multimodal del usuario al modelo
    - Afirmación: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puedes probar en tu máquina (y los ids exactos de `provider/model`), ejecuta:

```bash
openclaw models list
openclaw models list --json
```

## Live: prueba de humo del token de configuración de Anthropic

- Prueba: `src/agents/anthropic.setup-token.live.test.ts`
- Objetivo: verificar que el token de configuración de la CLI de Claude Code (o un perfil de token de configuración pegado) pueda completar un mensaje de Anthropic.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Fuentes del token (elige una):
  - Perfil: `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Token sin procesar: `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Anulación del modelo (opcional):
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Ejemplo de configuración:

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: prueba de humo del backend de CLI (CLI de Claude Code u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente utilizando un backend de CLI local, sin tocar tu configuración predeterminada.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Modelo: `claude-cli/claude-sonnet-4-6`
  - Comando: `claude`
  - Argumentos: `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- anulaciones (opcional):
- `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
- `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
- `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
- `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
- `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
- `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el mensaje).
- `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos de CLI en lugar de inyección en el mensaje.
- `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando `IMAGE_ARG` está establecido.
- `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` para mantener la configuración MCP de la CLI de Claude Code habilitada (por defecto se deshabilita la configuración MCP con un archivo temporal vacío).

Ejemplo:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recetas live recomendadas

Las listas de permitidos (allowlists) estrechas y explícitas son las más rápidas y menos propensas a fallos:

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
- `google-antigravity/...` usa el puente OAuth de Antigravity (extremo del agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa la CLI de Gemini local en su máquina (autenticación separada + peculiaridades de las herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API de Gemini alojada de Google a través de HTTP (clave de API / autenticación de perfil); esto es lo que la mayoría de los usuarios entienden por "Gemini".
  - CLI: OpenClaw ejecuta un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (streaming/soporte de herramientas/discrepancia de versión).

## Live: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (live es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de prueba de humo moderna (llamada a herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.2` (opcional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (API de Gemini): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar los modelos más antiguos de Gemini 2.x)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecutar prueba de humo del gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elija al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.2` (o `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (deseable):

- xAI: `xai/grok-4` (o la más reciente disponible)
- Mistral: `mistral/`… (elige un modelo capaz de usar "herramientas" que tengas habilitado)
- Cerebras: `cerebras/`… (si tienes acceso)
- LM Studio: `lmstudio/`… (local; el uso de herramientas depende del modo API)

### Visión: envío de imágenes (archivo adjunto → mensaje multimodal)

Incluye al menos un modelo capaz de procesar imágenes en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imágenes.

### Agregadores / pasarelas alternativas

Si tienes claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; usa `openclaw models scan` para encontrar candidatos con capacidad de herramientas e imágenes)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación vía `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (puntos de conexión personalizados): `minimax` (nube/API), además de cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar “todos los modelos” en la documentación. La lista autorizada es lo que `discoverModels(...)` devuelve en tu máquina + las claves que estén disponibles.

## Credenciales (nunca las confirmes)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice “sin credenciales”, depura de la misma manera en la que depurarías `openclaw models list` / la selección de modelos.

- Almacén de perfiles: `~/.openclaw/credentials/` (preferido; lo que significa “claves de perfil” en las pruebas)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)

Si deseas confiar en claves de entorno (por ejemplo, exportadas en tu `~/.profile`), ejecuta pruebas locales después de `source ~/.profile`, o usa los ejecutores de Docker a continuación (ellos pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Alcance:
  - Enumera cada complemento de proveedor de generación de imágenes registrado
  - Carga las variables de entorno del proveedor faltantes desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves API en vivo/de entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta las variantes de generación de imágenes estándar a través de la capacidad de tiempo de ejecución compartida:
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
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan `pnpm test:live` dentro de la imagen Docker del repositorio, montando su directorio de configuración local y el espacio de trabajo (y obteniendo `~/.profile` si está montado).
- Ejecutores de pruebas de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network` y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores de Docker de modelos en vivo también montan con bind solo los directorios de autenticación de CLI necesarios (o todos los compatibles cuando la ejecución no se limita), luego los copian en el directorio principal del contenedor antes de la ejecución para que el OAuth de CLI externo pueda actualizar los tokens sin mutar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes de Gateway (dos contenedores, autenticación WS + estado): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Complementos (prueba de humo de instalación + alias `/plugin` + semántica de reinicio del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de live-model también montan la copia actual (checkout) en modo de solo lectura y la ponen en escena en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras se ejecuta Vitest contra tu código fuente/configuración local exacta. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo del gateway no inicien trabajadores de canal reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pasa también `OPENCLAW_LIVE_GATEWAY_*` cuando necesites limitar o excluir la cobertura en vivo del gateway en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de alto nivel: inicia un contenedor de gateway OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor de Open WebUI anclado (pinned) contra ese gateway, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default` y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. La primera ejecución puede ser notablemente más lenta porque es posible que Docker necesite extraer la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de arranque en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model": "openclaw/default", ... }`.

Prueba de humo manual de subprocesos en lenguaje plano de ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conserva este script para flujos de trabajo de regresión/depuración. Puede volver a ser necesario para la validación del enrutamiento de subprocesos de ACP, así que no lo elimines.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y originado (sourced) antes de ejecutar las pruebas
- Los directorios de autenticación de CLI externos bajo `$HOME` se montan en modo de solo lectura bajo `/host-auth/...` y luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Predeterminado: montar todos los dirs compatibles (`.codex`, `.claude`, `.qwen`, `.minimax`)
  - Las ejecuciones de proveedor reducidas montan solo los dirs necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anular manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del env)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el prompt de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen fijada de Open WebUI

## Pruebas de cordura de documentos

Ejecutar comprobaciones de documentos después de editar los docs: `pnpm docs:list`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de “canalización real” sin proveedores reales:

- Llamada de herramienta de puerta de enlace (OpenAI simulado, bucle de puerta de enlace real + agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada de herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente de puerta de enlace")
- Asistente de puerta de enlace (WS `wizard.start`/`wizard.next`, escribe config + autenticación forzada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente sobre ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como “evaluaciones de confiabilidad del agente”:

- Llamada de herramienta simulada a través del bucle de agente y puerta de enlace real (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se listan en el prompt, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de varios turnos que afirman el orden de las herramientas, la continuidad del historial de la sesión y los límites del espacio aislado.

Las evaluaciones futuras deben ser primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso vs. evitación, bloqueo, inyección de prompts).
- Evaluaciones en vivo opcionales (participación opcional, limitadas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan un conjunto de aserciones de forma y comportamiento.

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
- **actions** - Manejadores de acciones del canal
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Cumplimiento de la política de grupo
- **status** - Sondeos de estado del canal
- **registry** - Forma del registro de complementos

### Contratos de proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato de flujo de autenticación
- **auth-choice** - Elección/selección de autenticación
- **catalog** - API de catálogo de modelos
- **discovery** - Descubrimiento de complementos
- **loader** - Carga de complementos
- **runtime** - Tiempo de ejecución del proveedor
- **shape** - Forma/interfaz del complemento
- **wizard** - Asistente de configuración

### Cuándo ejecutar

- Después de cambiar las exportaciones o las subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (orientación)

Cuando solucione un problema de proveedor/modelo descubierto en vivo:

- Agregue una regresión segura para CI si es posible (proveedor simulado/tipo simulado, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantenga la prueba en vivo estrecha y opcional mediante variables de entorno
- Preferir dirigirse a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramienta de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Barra de protección de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si agrega una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualice `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los ids de objetivo no clasificados para que las nuevas clases no se puedan omitir silenciosamente.

import es from "/components/footer/es.mdx";

<es />
