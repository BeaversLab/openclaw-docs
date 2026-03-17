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
- Nota sobre el grupo (pool):
  - OpenClaw usa Vitest `vmForks` en Node 22, 23 y 24 para fragmentos unitarios más rápidos.
  - En Node 25+, OpenClaw retrocede automáticamente a `forks` regular hasta que el repositorio se revalide allí.
  - Anular manualmente con `OPENCLAW_TEST_VM_FORKS=0` (forzar `forks`) o `OPENCLAW_TEST_VM_FORKS=1` (forzar `vmForks`).

### E2E (smoke del gateway)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `vmForks` para un inicio de archivo más rápido.
  - Usa trabajadores adaptativos (CI: 2-4, local: 4-8).
  - Se ejecuta en modo silencioso por defecto para reducir la sobrecarga de E/S de la consola.
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el conteo de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de extremo a extremo de la pasarela de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (puede ser más lento)

### E2E: prueba de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace (gateway) OpenShell aislada en el host mediante Docker
  - Crea un entorno sandbox (caja de arena) desde un Dockerfile local temporal
  - Ejercita el backend OpenShell de OpenClaw a través de `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución predeterminada de `pnpm test:e2e`
  - Requiere una CLI local de `openshell` además de un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la puerta de enlace de prueba y el sandbox
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o a un script contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Config: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Realmente funciona este proveedor/modelo _hoy_ con credenciales reales?”
  - Detecta cambios de formato del proveedor, peculiaridades de llamada a herramientas (tool-calling), problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas de proveedor reales, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Prefiere ejecutar subconjuntos reducidos en lugar de “todo”
  - Las ejecuciones Live obtendrán (source) `~/.profile` para recuperar las claves de API faltantes
- Rotación de claves de API (específico del proveedor): configure `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por live a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan en las respuestas de límite de tasa.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisiones:

- Edición de lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Tocar la red del gateway / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depuración de "mi bot está caído" / fallas específicas del proveedor / llamadas a herramientas: ejecute un `pnpm test:live` limitado

## Live: barrido de capacidades del nodo de Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos actualmente anunciados** por un nodo de Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración previa/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación del gateway `node.invoke` comando por comando para el nodo de Android seleccionado.
- Configuración previa requerida:
  - Aplicación de Android ya conectada + emparejada con el gateway.
  - Aplicación mantenida en primer plano.
  - Permisos/consentimiento de captura otorgados para las capacidades que espera que pasen.
- Anulaciones de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/es/platforms/android)

## Live: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar las fallas:

- "Modelo directo" nos dice si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo del gateway" nos dice si la canalización completa del gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización del modelo directo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Use `getApiKeyForModel` para seleccionar modelos para los que tiene credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas cuando sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invocas Vitest directamente)
- Establece `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente este suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en el smoke del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y alternativas de entorno (env fallbacks)
  - Establece `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar el uso únicamente del **almacén de perfiles**
- Por qué existe:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente del gateway está rota"
  - Contiene regresiones pequeñas y aisladas (ejemplo: OpenAI Responses/Codex Responses repetición de razonamiento + flujos de llamadas a herramientas)

### Capa 2: Gateway + smoke del agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar un gateway en proceso
  - Crear/Parchear una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos con claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - una invocación de herramienta real funciona (sondeo de lectura)
    - sondeos adicionales de herramientas opcionales (sondeo de ejecución + lectura)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que puedas explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal y luego `read`.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invocas Vitest directamente)
- Cómo seleccionar modelos:
  - Predeterminado: lista blanca moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista blanca moderna
  - O configure `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o una lista separada por comas) para limitar
- Cómo seleccionar proveedores (evitar "todo en OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista blanca separada por comas)
- Las sondas de herramientas e imágenes siempre están activas en esta prueba en vivo:
  - sonda `read` + sonda `exec+read` (estrés de herramientas)
  - la sonda de imagen se ejecuta cuando el modelo anuncia compatibilidad con la entrada de imagen
  - Flujo (de alto nivel):
    - La prueba genera un PNG pequeño con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía a través de `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puede probar en su máquina (y los ids exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del token de configuración de Anthropic

- Prueba: `src/agents/anthropic.setup-token.live.test.ts`
- Objetivo: verificar que el token de configuración de Claude Code CLI (o un perfil de token de configuración pegado) pueda completar un prompt de Anthropic.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invoca Vitest directamente)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Fuentes del token (elija una):
  - Perfil: `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Token sin formato: `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Anulación de modelo (opcional):
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Ejemplo de configuración:

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## En vivo: prueba de humo del backend de CLI (Claude Code CLI u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente utilizando un backend de CLI local, sin tocar su configuración predeterminada.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Modelo: `claude-cli/claude-sonnet-4-6`
  - Comando: `claude`
  - Argumentos: `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Anulaciones (opcional):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos de CLI en lugar de la inyección en el prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando se establece `IMAGE_ARG`.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` para mantener habilitada la configuración MCP de Claude Code CLI (por defecto se deshabilita la configuración MCP con un archivo vacío temporal).

Ejemplo:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recetas en vivo recomendadas

Las listas de permitidos explícitas y estrechas son las más rápidas y las menos propensas a fallos:

- Modelo único, directo (sin puerta de enlace):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo de la puerta de enlace:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada de herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` utiliza la API de Gemini (clave de API).
- `google-antigravity/...` utiliza el puente OAuth de Antigravity (endpoint de agente estilo Cloud Code Assist).
- `google-gemini-cli/...` utiliza la CLI de Gemini local en su máquina (autenticación separada + peculiaridades de las herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API de Gemini alojada por Google a través de HTTP (clave de API / autenticación de perfil); esto es lo que la mayoría de los usuarios entienden por "Gemini".
  - CLI: OpenClaw ejecuta un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (transmisión/soporte de herramientas/desviación de versión).

## En vivo: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (en vivo es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de pruebas de humo modernas (llamada de herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.2` (opcional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-5`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evite los modelos Gemini 2.x anteriores)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

Ejecute gateway smoke con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elija al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.2` (o `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

Cobertura adicional opcional (conveniente tener):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elija un modelo con capacidad de “herramientas” que tenga habilitado)
- Cerebras: `cerebras/`… (si tiene acceso)
- LM Studio: `lmstudio/`… (local; la llamada a herramientas depende del modo de API)

### Visión: envío de imagen (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imagen.

### Agregadores / gateways alternativos

Si tiene claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; use `openclaw models scan` para encontrar candidatos con capacidad de herramienta+imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación vía `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puede incluir en la matriz en vivo (si tiene credenciales/configuración):

- Integrado: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Vía `models.providers` (endpoints personalizados): `minimax` (nube/API), más cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar “todos los modelos” en la documentación. La lista autorizada es lo que `discoverModels(...)` devuelva en tu máquina + las claves disponibles.

## Credenciales (nunca las confirmes en el repositorio)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice “sin credenciales” (no creds), depura de la misma manera en la que depurarías `openclaw models list` / la selección de modelo.

- Almacén de perfiles: `~/.openclaw/credentials/` (preferido; lo que significa “profile keys” en las pruebas)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)

Si quieres confiar en claves de entorno (ej. exportadas en tu `~/.profile`), ejecuta pruebas locales después de `source ~/.profile`, o usa los ejecutores de Docker a continuación (pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Plan de codificación BytePlus en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación opcional de modelo: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Ejecutores de Docker (verificaciones opcionales de “funciona en Linux”)

Estos ejecutan `pnpm test:live` dentro de la imagen Docker del repositorio, montando tu directorio de configuración local y el espacio de trabajo (y abasteciendo `~/.profile` si está montado). También montan directorios de autenticación de CLI como `~/.codex`, `~/.claude`, `~/.qwen` y `~/.minimax` cuando están presentes para que OAuth de CLI externa siga disponible dentro del contenedor:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes de Gateway (dos contenedores, autenticación WS + estado de salud): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Complementos (carga de extensión personalizada + prueba de humo del registro): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de modelo en vivo también montan el checkout actual en modo de solo lectura
y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de
ejecución ligera mientras sigue ejecutando Vitest contra tu configuración/fuente local exacta.

Prueba de humo manual de hilos en lenguaje sencillo de ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantén este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de hilos de ACP, así que no lo elimines.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y abastecido antes de ejecutar las pruebas
- Directorios de autenticación de CLI externa bajo `$HOME` (`.codex`, `.claude`, `.qwen`, `.minimax`) se montan en modo de solo lectura a las rutas `/home/node/...` correspondientes cuando están presentes
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para acotar la ejecución
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no de variables de entorno)

## Pruebas de cordura de la documentación

Ejecuta comprobaciones de la documentación después de editar los documentos: `pnpm docs:list`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de “canal real” sin proveedores reales:

- Llamada a herramientas del Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada simulada a herramienta de OpenAI de extremo a extremo a través del bucle de agente del gateway")
- Asistente del Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de WS y escribe la configuración del token de autenticación")

## Evaluaciones de fiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como “evaluaciones de fiabilidad del agente”:

- Llamadas a herramientas simuladas a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Skills](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se listan en el prompt, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usar y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la persistencia del historial de la sesión y los límites del sandbox.

Las evaluaciones futuras deben mantenerse primero deterministas:

- Un ejecutor de escenarios utilizando proveedores simulados para afirmar las llamadas a herramientas + orden, lecturas de archivos de habilidades y cableado de sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso vs. evitar, restricción, inyección de prompt).
- Evaluaciones en vivo opcionales (opt-in, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Agregar regresiones (orientación)

Cuando corriges un problema de proveedor/modelo descubierto en vivo:

- Agrega una regresión segura para CI si es posible (proveedor simulado/stub, o captura la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantén la prueba en vivo estrecha y opcional mediante variables de entorno
- Preferir apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - bug de canalización de sesión/historia/herramienta de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Barrera de protección de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo muestreado por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los ids de ejecución de segmentos de recorrido son rechazados.
  - Si añade una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualice `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los ids de objetivos no clasificados para que las nuevas clases no puedan omitirse silenciosamente.

import es from "/components/footer/es.mdx";

<es />
