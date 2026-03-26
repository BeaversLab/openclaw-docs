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
  - La cobertura unitaria compartida permanece activa, pero el contenedor mueve los archivos más pesados medidos a carriles dedicados en lugar de confiar en una lista de exclusión mantenida manualmente y en crecimiento.
  - Actualice la instantánea de tiempo con `pnpm test:perf:update-timings` después de cambios importantes en la forma del conjunto de pruebas.
- Nota del ejecutor integrado:
  - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación,
    mantenga ambos niveles de cobertura.
  - Añada regresiones de ayuda enfocadas para los límites de enrutamiento/normalización puros.
  - También mantenga los conjuntos de integración del ejecutor integrado saludables:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esos conjuntos verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayuda no son un
    sustituto suficiente para esas rutas de integración.
- Nota del grupo:
  - OpenClaw usa Vitest `vmForks` en Node 22, 23 y 24 para fragmentos unitarios más rápidos.
  - En Node 25+, OpenClaw recurre automáticamente al `forks` regular hasta que el repositorio se vuelva a validar allí.
  - Anule manualmente con `OPENCLAW_TEST_VM_FORKS=0` (forzar `forks`) o `OPENCLAW_TEST_VM_FORKS=1` (forzar `vmForks`).

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `vmForks` para un inicio de archivo más rápido.
  - Usa trabajadores adaptativos (CI: 2-4, local: 4-8).
  - Se ejecuta en modo silencioso por defecto para reducir la sobrecarga de E/S de la consola.
- Anulaciones útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de extremo a extremo del gateway de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: pruebas de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace (gateway) aislada de OpenShell en el host mediante Docker
  - Crea un sandbox desde un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw a través de `sandbox ssh-config` real + exec de SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no forma parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un daemon de Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la puerta de enlace y el sandbox de prueba
- Anulaciones útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI o un script contenedor no predeterminado

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - ¿Este proveedor/modelo realmente funciona _hoy_ con credenciales reales?
  - Detectar cambios de formato de proveedor, peculiaridades de llamadas a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales de proveedores, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Preferir ejecutar subconjuntos reducidos en lugar de "todo"
  - Las ejecuciones en vivo obtendrán (source) `~/.profile` para recuperar claves de API faltantes
- Rotación de claves de API (específica del proveedor): establezca `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por-live a través de `OPENCLAW_LIVE_*_KEY`; las pruebas reintentan en las respuestas de límite de tasa.

## ¿Qué conjunto de pruebas (suite) debería ejecutar?

Use esta tabla de decisión:

- Edición de lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Modificar la red de la pasarela / protocolo WS / emparejamiento: añadir `pnpm test:e2e`
- Depuración de "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecutar un `pnpm test:live` limitado

## En vivo: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos anunciados actualmente** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración previa/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación comando por comando de la pasarela `node.invoke` para el nodo Android seleccionado.
- Configuración previa requerida:
  - Aplicación Android ya conectada y emparejada con la pasarela.
  - Aplicación mantenida en primer plano.
  - Consentimiento de permisos/captura otorgado para las capacidades que esperas que pasen.
- Anulaciones de destino opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/es/platforms/android)

## En vivo: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- "Modelo directo" nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo de la pasarela" nos indica si la tubería completa de pasarela+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización del modelo directo (sin pasarela)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar modelos para los que tienes credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para moderno) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` enfocado en la prueba de humo de la pasarela
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y alternativas de entorno
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacén de perfiles**
- Por qué existe esto:
  - Separa "la API del proveedor está rota / la clave no es válida" de "el canal del agente de la puerta de enlace está roto"
  - Contiene regresiones pequeñas y aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Humo de puerta de enlace + agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una puerta de enlace en proceso
  - Crear/patch una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos con claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - funciona una invocación de herramienta real (sondeo de lectura)
    - sondeos de herramientas adicionales opcionales (sondeo de ejecución + lectura)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal y luego `read`.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Por defecto: lista de permitidos moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista de permitidos moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para limitar
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separada por comas)
- Los sondas de herramienta e imagen siempre están activos en esta prueba en vivo:
  - sondeo `read` + sondeo `exec+read` (estrés de herramientas)
  - el sondeo de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (nivel alto):
    - El test genera un PNG diminuto con “CAT” + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía a través de `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Sugerencia: para ver qué puedes probar en tu máquina (y los ids exactos de `provider/model`), ejecuta:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del token de configuración de Anthropic

- Test: `src/agents/anthropic.setup-token.live.test.ts`
- Objetivo: verificar que el token de configuración de Claude Code CLI (o un perfil de token de configuración pegado) pueda completar un prompt de Anthropic.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Fuentes del token (elija una):
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

- Test: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente utilizando un backend CLI local, sin tocar tu configuración predeterminada.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un adjunto de imagen real (las rutas se inyectan en el prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar rutas de archivos de imagen como argumentos de CLI en lugar de inyección de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando `IMAGE_ARG` está establecido.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar una segunda vuelta y validar el flujo de reanudación.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` para mantener la configuración MCP de Claude Code CLI habilitada (por defecto se deshabilita la configuración MCP con un archivo vacío temporal).

Ejemplo:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recetas en vivo recomendadas

Las listas de permitidos explícitas y estrechas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin puerta de enlace):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo de puerta de enlace:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada de herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa la API de Gemini (clave de API).
- `google-antigravity/...` usa el puente OAuth de Antigravity (punto final del agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa la CLI local de Gemini en su máquina (autenticación separada + peculiaridades de las herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API alojada de Gemini de Google a través de HTTP (clave de API / autenticación de perfil); esto es a lo que la mayoría de los usuarios se refieren con "Gemini".
  - CLI: OpenClaw invoca un binario local `gemini`; tiene su propia autenticación y puede comportarse de manera diferente (flujo continuo/soporte de herramientas/diferencia de versión).

## En vivo: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (en vivo es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto moderno de pruebas de humo (llamada de herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.2` (opcional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (API de Gemini): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar los modelos más antiguos de Gemini 2.x)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

Ejecutar prueba de humo de puerta de enlace con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada de herramientas (Read + Exec opcional)

Elige al menos uno por familia de proveedor:

- OpenAI: `openai/gpt-5.2` (o `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

Cobertura adicional opcional (conveniente tener):

- xAI: `xai/grok-4` (o la última disponible)
- Mistral: `mistral/`… (elige un modelo con capacidad de "herramientas" que tengas habilitado)
- Cerebras: `cerebras/`… (si tienes acceso)
- LM Studio: `lmstudio/`… (local; la llamada a herramientas depende del modo de API)

### Visión: envío de imagen (archivo adjunto → mensaje multimodal)

Incluye al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imágenes.

### Agregadores / puertas de enlace alternativas

Si tienes claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; usa `openclaw models scan` para encontrar candidatos con capacidad de herramienta+imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación mediante `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (endpoints personalizados): `minimax` (nube/API), además de cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar “todos los modelos” en los documentos. La lista definitiva es lo que `discoverModels(...)` devuelva en tu máquina + las claves que estén disponibles.

## Credenciales (nunca las confirmes)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo indica “sin credenciales”, depura de la misma manera en la que depurarías `openclaw models list` / la selección del modelo.

- Almacén de perfiles: `~/.openclaw/credentials/` (preferido; lo que significa “claves de perfil” en las pruebas)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)

Si deseas confiar en claves de entorno (por ejemplo, exportadas en tu `~/.profile`), ejecuta pruebas locales después de `source ~/.profile`, o usa los ejecutores de Docker a continuación (pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Habilitar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus plan de codificación en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Habilitar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación opcional de modelo: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Alcance:
  - Enumera todos los complementos de proveedores de generación de imágenes registrados
  - Carga las variables de entorno del proveedor faltantes desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves API en vivo/de entorno antes que los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
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

Estos ejecutan `pnpm test:live` dentro de la imagen Docker del repositorio, montando tu directorio de configuración local y el espacio de trabajo (y obteniendo `~/.profile` si está montado). También montan directorios de autenticación de CLI como `~/.codex`, `~/.claude`, `~/.qwen` y `~/.minimax` cuando están presentes, y luego los copian en el directorio principal del contenedor antes de la ejecución para que OAuth de CLI externo pueda actualizar los tokens sin mutar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes del Gateway (dos contenedores, autenticación WS + estado): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Complementos (carga de extensión personalizada + prueba de humo del registro): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores de Docker de modelos en vivo también montan la copia actual como de solo lectura y
la ponen en escena en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de
ejecución ligera mientras se ejecuta Vitest contra tu fuente/configuración local exacta.
`test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pasa también
`OPENCLAW_LIVE_GATEWAY_*` cuando necesites limitar o excluir la cobertura en vivo
del gateway en ese carril de Docker.

Prueba de humo manual de subproceso en lenguaje plano ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantén este script para flujos de trabajo de regresión/depuración. Puede volver a ser necesario para la validación del enrutamiento de subprocesos ACP, así que no lo elimines.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido antes de ejecutar las pruebas
- Los directorios de autenticación de CLI externos bajo `$HOME` (`.codex`, `.claude`, `.qwen`, `.minimax`) se montan como solo lectura bajo `/host-auth/...` y luego se copian en `/home/node/...` antes de que inicien las pruebas
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para acotar la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no de variables de entorno)

## Pruebas de cordura de la documentación

Ejecuta comprobaciones de la documentación después de editar los documentos: `pnpm docs:list`.

## Regresión sin conexión (seguro para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente de gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación forzada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe configuración de token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simulada a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Skills](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se listan en el mensaje, ¿elige el agente la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿lee el agente `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la persistencia del historial de sesión y los límites del entorno limitado.

Las evaluaciones futuras deben mantenerse primero como deterministas:

- Un ejecutor de escenarios que utilice proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de sesión.
- Un pequeño conjunto de escenarios enfocados en habilidades (uso frente a evitación, filtrado, inyección de mensajes).
- Evaluaciones en vivo opcionales (opt-in, limitadas por entorno) solo después de que el conjunto seguro para CI esté implementado.

## Pruebas de contrato (forma del complemento y del canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de aserciones de forma y comportamiento.

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
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Cumplimiento de la política de grupo
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

- Después de cambiar las exportaciones o las subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (guía)

Cuando solucionas un problema de proveedor/modelo descubierto en vivo:

- Agrega una regresión segura para CI si es posible (proveedor simulado/stub, o captura la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de velocidad, políticas de autenticación), mantén la prueba en vivo limitada y opcional mediante variables de entorno
- Preferencia por apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Barandilla de cruce de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo muestreado por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), luego afirma que los ids de ejecución de segmento de cruce son rechazados.
  - Si agregas una nueva familia de destino `includeInPlan` SecretRef en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los IDs de destino no clasificados para que las nuevas clases no puedan pasarse por alto silenciosamente.

import es from "/components/footer/es.mdx";

<es />
