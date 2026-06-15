---
summary: "Pruebas en vivo (que tocan la red): matriz de modelos, backends de CLI, ACP, proveedores de medios, credenciales"
read_when:
  - Running live model matrix / CLI backend / ACP / media-provider smokes
  - Debugging live-test credential resolution
  - Adding a new provider-specific live test
title: "Pruebas: suites en vivo"
sidebarTitle: "Pruebas en vivo"
---

Para un inicio rápido, ejecutores de QA, suites unitarias/de integración y flujos de Docker, consulte
[Testing](/es/help/testing). Esta página cubre las suites de prueba **live** (que tocan la red):
model matrix, CLI backends, ACP y media-provider live tests, además del manejo de credenciales.

## En vivo: comandos de prueba de humo locales

Exporte la clave del proveedor necesaria en el entorno del proceso antes de las comprobaciones en vivo ad hoc.

Prueba de humo segura de medios:

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

Prueba de humo segura de preparación de llamadas de voz:

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

`voicecall smoke` es una ejecución en seco a menos que `--yes` también esté presente. Use `--yes` solo
cuando intencionalmente desee realizar una llamada de notificación real. Para Twilio, Telnyx y
Plivo, una verificación de preparación exitosa requiere una URL de webhook pública; las alternativas de
bucle local privado/privadas son rechazadas por diseño.

## En vivo: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos actualmente anunciados** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración precondicionada/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación del gateway `node.invoke` comando por comando para el nodo Android seleccionado.
- Configuración previa requerida:
  - Aplicación Android ya conectada + emparejada con el gateway.
  - Aplicación mantenida en primer plano.
  - Permiso/consentimiento de captura otorgado para las capacidades que espera que pasen.
- Anulaciones de destino opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/es/platforms/android)

## En vivo: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- "Direct model" nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Gateway smoke" nos indica si la canalización completa de gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización directa del modelo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Use `getApiKeyForModel` para seleccionar los modelos para los que tiene credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invoca Vitest directamente)
- Establezca `OPENCLAW_LIVE_MODELS=modern`, `small` o `all` (alias para moderno) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en la prueba de humo del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista blanca moderna (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M3, Grok 4.3)
  - `OPENCLAW_LIVE_MODELS=small` para ejecutar la lista blanca restringida de modelos pequeños (rutas compatibles locales Qwen 8B/9B, Ollama Gemma, OpenRouter Qwen/GLM y Z.AI GLM)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
  - Las ejecuciones locales de Ollama con modelos pequeños usan por defecto `http://127.0.0.1:11434`; establezca `OPENCLAW_LIVE_OLLAMA_BASE_URL` solo para LAN, personalizados o endpoints de Ollama Cloud.
  - Los barridos modernos/completos y pequeños usan por defecto sus límites curados; establezca `OPENCLAW_LIVE_MAX_MODELS=0` para un barrido exhaustivo de perfiles seleccionados o un número positivo para un límite menor.
  - Los barridos exhaustivos usan `OPENCLAW_LIVE_TEST_TIMEOUT_MS` para el tiempo de espera de toda la prueba de modelo directo. Predeterminado: 60 minutos.
  - Las sondas de modelo directo se ejecutan con un paralelismo de 20 vías por defecto; establezca `OPENCLAW_LIVE_MODEL_CONCURRENCY` para anular.
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista blanca separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y alternativas de entorno (env)
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacén de perfiles**
- Por qué existe esto:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente de la puerta de enlace (gateway) está rota"
  - Contiene regresiones pequeñas y aisladas (ejemplo: OpenAI Responses/Codex Responses repetición del razonamiento + flujos de llamadas a herramientas)

### Capa 2: Gateway + prueba de humo del agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una puerta de enlace en proceso (in-process gateway)
  - Crear/Parchear una sesión `agent:dev:*` (anulación del modelo por ejecución)
  - Iterar modelos-con-claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - funciona una invocación real de herramienta (sonda de lectura)
    - sondas adicionales opcionales de herramientas (sonda de exec+lectura)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles de la sonda (para que pueda explicar los fallos rápidamente):
  - `read` sondeo: la prueba escribe un archivo nonce en el espacio de trabajo y le pide al agente que `read` y devuelva el nonce.
  - `exec+read` sondeo: la prueba le pide al agente que `exec`-escriba un nonce en un archivo temporal, luego que `read` de vuelta.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `test/helpers/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Predeterminado: lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M3, Grok 4.3)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista de permitidos moderna
  - O configure `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para limitar
  - Los barridos de puerta de enlace modernos/completos tienen un límite predeterminado curado de alta señal; configure `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite más pequeño.
- Cómo seleccionar proveedores (evitar "OpenRouter todo"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separada por comas)
- Los sondeos de herramienta e imagen siempre están activados en esta prueba en vivo:
  - sondeo `read` + sondeo `exec+read` (estrés de herramienta)
  - el sondeo de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (nivel alto):
    - La prueba genera un PNG pequeño con "CAT" + código aleatorio (`test/helpers/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - La puerta de enlace analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje multimodal del usuario al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

<Tip>
Para ver qué puede probar en su máquina (y los ids exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## En vivo: prueba de humo del backend de CLI (Claude, Gemini u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente utilizando un backend de CLI local, sin tocar su configuración predeterminada.
- Los valores predeterminados de las pruebas de humo específicas del backend se encuentran en la definición `cli-backend.ts` de la extensión propietaria.
- Habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Proveedor/modelo predeterminado: `claude-cli/claude-sonnet-4-6`
  - El comportamiento del comando/argumentos/imagen proviene de los metadatos del complemento del backend de CLI propietario.
- Invalidaciones (opcionales):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo de imagen real (las rutas se inyectan en el mensaje). Las recetas de Docker desactivan esto de forma predeterminada a menos que se solicite explícitamente.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos de CLI en lugar de la inyección en el mensaje.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando se establece `IMAGE_ARG`.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` para optar por la sonda de continuidad de la misma sesión de Claude Sonnet -> Opus cuando el modelo seleccionado admite un objetivo de cambio. Las recetas de Docker desactivan esto de forma predeterminada para una fiabilidad agregada.
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` para optar por la sonda de bucle de retorno MCP/herramienta. Las recetas de Docker desactivan esto de forma predeterminada a menos que se solicite explícitamente.

Ejemplo:

```bash
  OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Prueba de humo de configuración MCP de Gemini económica:

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

Esto no le pide a Gemini que genere una respuesta. Escribe la misma configuración del sistema que OpenClaw da a Gemini, y luego ejecuta `gemini --debug mcp list` para demostrar que un servidor `transport: "streamable-http"` guardado se normaliza a la forma HTTP MCP de Gemini y puede conectarse a un servidor MCP HTTP transmitible local.

Receta de Docker:

```bash
pnpm test:docker:live-cli-backend
```

Recetas de Docker de un solo proveedor:

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

Notas:

- El ejecutor de Docker se encuentra en `scripts/test-live-cli-backend-docker.sh`.
- Ejecuta la prueba de humo del backend de CLI en vivo dentro de la imagen Docker del repositorio como el usuario no root `node`.
- Resuelve los metadatos de smoke de CLI desde la extensión propietaria, luego instala el paquete de CLI de Linux coincidente (`@anthropic-ai/claude-code` o `@google/gemini-cli`) en un prefijo escribible en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` requiere OAuth de suscripción portátil de Claude Code a través de `~/.claude/.credentials.json` con `claudeAiOauth.subscriptionType` o `CLAUDE_CODE_OAUTH_TOKEN` de `claude setup-token`. Primero demuestra `claude -p` directo en Docker, luego ejecuta dos turnos de backend de CLI de Gateway sin conservar las variables de entorno de la clave de API de Anthropic. Este canal de suscripción deshabilita por defecto las sondas de MCP/herramientas e imágenes de Claude porque Claude actualmente enruta el uso de aplicaciones de terceros a través de la facturación de uso adicional en lugar de los límites normales del plan de suscripción.
- El smoke en vivo del backend de CLI ahora ejercita el mismo flujo de extremo a extremo para Claude y Gemini: turno de texto, turno de clasificación de imagen y luego llamada a la herramienta MCP `cron` verificada a través de la CLI de Gateway.
- El smoke predeterminado de Claude también parchea la sesión de Sonnet a Opus y verifica que la sesión reanudada todavía recuerde una nota anterior.

## Live: accesibilidad del proxy HTTP/2 de APNs

- Prueba: `src/infra/push-apns-http2.live.test.ts`
- Objetivo: hacer un túnel a través de un proxy HTTP CONNECT local hasta el endpoint de APNs del entorno limitado (sandbox) de Apple, enviar la solicitud de validación HTTP/2 de APNs y afirmar que la respuesta real `403 InvalidProviderToken` de Apple regrese a través de la ruta del proxy.
- Habilitar:
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- Tiempo de espera opcional:
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## Live: smoke de enlace de ACP (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de enlace de conversación de ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación de canal de mensajes sintética en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Habilitar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valores predeterminados:
  - Agentes ACP en Docker: `claude,codex,gemini`
  - Agente ACP para `pnpm test:live ...` directo: `claude`
  - Canal sintético: contexto de conversación estilo mensaje directo de Slack
  - Backend de ACP: `acpx`
- Anulaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.5`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.5`
- Notas:
  - Este carril utiliza la superficie `chat.send` de la puerta de enlace con campos sintéticos de ruta de origen solo para administradores, para que las pruebas puedan adjuntar contexto de canal de mensajes sin fingir entregar externamente.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` no está definido, la prueba utiliza el registro de agentes incorporado del complemento `acpx` incorporado para el agente de arnés ACP seleccionado.
  - La creación de MCP de cron de sesión vinculada es de mejor esfuerzo por defecto porque los arneses ACP externos pueden cancelar las llamadas MCP después de que haya pasado la prueba de vinculación/imagen; establezca `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` para hacer estricta esa sonda de cron posterior a la vinculación.

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
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Notas de Docker:

- El ejecutor de Docker se encuentra en `scripts/test-live-acp-bind-docker.sh`.
- Por defecto, ejecuta la prueba de humo de vinculación de ACP contra los agentes CLI en vivo agregados en secuencia: `claude`, `codex`, y luego `gemini`.
- Use `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` o `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` para reducir la matriz.
- Prepara el material de autenticación CLI coincidente en el contenedor y luego instala la CLI en vivo solicitada (`@anthropic-ai/claude-code`, `@openai/codex`, Factory Droid vía `https://app.factory.ai/cli`, `@google/gemini-cli` o `opencode-ai`) si falta. El backend de ACP en sí es el paquete `acpx/runtime` incorporado del complemento oficial `acpx`.
- La variante Docker Droid prepara `~/.factory` para la configuración, reenvía `FACTORY_API_KEY` y requiere esa clave de API porque la autenticación local de Factory OAuth/keyring no es portátil al contenedor. Utiliza la entrada de registro `droid exec --output-format acp` integrada de ACPX.
- La variante Docker OpenCode es un carril de regresión estricto de un solo agente. Escribe un modelo `OPENCODE_CONFIG_CONTENT` predeterminado temporal desde `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL` (predeterminado `opencode/kimi-k2.6`), y `pnpm test:docker:live-acp-bind:opencode` requiere una transcripción del asistente vinculado en lugar de aceptar la omisión genérica posterior al vínculo.
- Las llamadas directas a la CLI de `acpx` son solo una ruta manual/de solución alternativa para comparar el comportamiento fuera de Gateway. La prueba de humo de vinculación ACP de Docker ejercita el tiempo de ejecución del backend `acpx` integrado de OpenClaw.

## Live: prueba de humo del arnés del servidor de aplicaciones Codex

- Objetivo: validar el arnés Codex propiedad del complemento a través del método normal de puerta de enlace
  `agent`:
  - cargar el complemento `codex` empaquetado
  - seleccionar `openai/gpt-5.5`, que enruta los turnos del agente OpenAI a través de Codex de forma predeterminada
  - enviar un primer turno de agente de puerta de enlace a `openai/gpt-5.5` con el arnés Codex seleccionado
  - enviar un segundo turno a la misma sesión OpenClaw y verificar que el hilo del servidor de aplicaciones pueda reanudarse
  - ejecutar `/codex status` y `/codex models` a través de la misma ruta de comandos de puerta de enlace
  - ejecutar opcionalmente dos sondas de shell escaladas revisadas por Guardian: un comando benigno que debe aprobarse y una carga simulada de secretos que debe denegarse para que el agente pregunte de nuevo
- Prueba: `src/gateway/gateway-codex-harness.live.test.ts`
- Activar: `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modelo predeterminado: `openai/gpt-5.5`
- Sonda de imagen opcional: `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonda MCP/herramienta opcional: `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Sonda de Guardian opcional: `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- La prueba de humo fuerza el proveedor/modelo `agentRuntime.id: "codex"` para que un arnés Codex roto no pueda pasar recurriendo silenciosamente a OpenClaw.
- Auth: Codex app-server auth desde el inicio de sesión de suscripción local de Codex. Docker smokes también pueden proporcionar `OPENAI_API_KEY` para sondas no-Codex cuando sea aplicable, más opcionalmente copiados `~/.codex/auth.json` y `~/.codex/config.toml`.

Local recipe:

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker recipe:

```bash
pnpm test:docker:live-codex-harness
```

Docker notes:

- The Docker runner lives at `scripts/test-live-codex-harness-docker.sh`.
- It passes `OPENAI_API_KEY`, copies Codex CLI auth files when present, installs `@openai/codex` into a writable mounted npm prefix, stages the source tree, then runs only the Codex-harness live test.
- Docker enables the image, MCP/tool, and Guardian probes by default. Set `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` or `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` or `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0` when you need a narrower debug run.
- Docker uses the same explicit Codex runtime config, so legacy aliases or OpenClaw fallback cannot hide a Codex harness regression.

### Recommended live recipes

Narrow, explicit allowlists are fastest and least flaky:

- Single model, direct (no gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- Small-model direct profile:
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- Ollama Cloud API smoke:
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- Single model, gateway smoke:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Tool calling across several providers:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google focus (Gemini API key + Antigravity):
  - Gemini (API key): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google adaptive thinking smoke:
  - Gemini 3 dynamic default: `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 dynamic budget: `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

Notes:

- `google/...` uses the Gemini API (API key).
- `google-antigravity/...` uses the Antigravity OAuth bridge (Cloud Code Assist-style agent endpoint).
- `google-gemini-cli/...` uses the local Gemini CLI on your machine (separate auth + tooling quirks).
- Gemini API vs Gemini CLI:
  - API: OpenClaw calls Google's hosted Gemini API over HTTP (API key / profile auth); this is what most users mean by "Gemini".
  - CLI: OpenClaw invoca un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (streaming/soporte de herramientas/desfase de versión).

## Live: model matrix (lo que cubrimos)

No hay una "lista de modelos de CI" fija (live es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de smoke moderno (llamada a herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.5`
- OpenAI ChatGPT/Codex OAuth: `openai/gpt-5.5`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (API de Gemini): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar los modelos más antiguos de Gemini 2.x)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- DeepSeek: `deepseek/deepseek-v4-flash` y `deepseek/deepseek-v4-pro`
- Z.AI (GLM): `zai/glm-5.1`
- MiniMax: `minimax/MiniMax-M3`

Ejecute el smoke de gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elija al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.5`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- DeepSeek: `deepseek/deepseek-v4-flash`
- Z.AI (GLM): `zai/glm-5.1`
- MiniMax: `minimax/MiniMax-M3`

Cobertura adicional opcional (deseable):

- xAI: `xai/grok-4.3` (o el último disponible)
- Mistral: `mistral/`… (elija un modelo con capacidad de "tools" que tenga habilitado)
- Cerebras: `cerebras/`… (si tiene acceso)
- LM Studio: `lmstudio/`… (local; la llamada a herramientas depende del modo API)

### Vision: envío de imagen (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar la sonda de imagen.

### Agregadores / gateways alternativos

Si tiene claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; usa `openclaw models scan` para encontrar candidatos con capacidad de herramienta e imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación vía `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Vía `models.providers` (endpoints personalizados): `minimax` (nube/API), más cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

<Tip>No escribas "todos los modelos" de forma rígida en los documentos. La lista definitiva es lo que `discoverModels(...)` devuelva en tu máquina más las claves disponibles.</Tip>

## Credenciales (nunca confirmar)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice "sin credenciales", depura de la misma manera en la que depurarías `openclaw models list` / la selección del modelo.

- Perfiles de autenticación por agente: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (esto es lo que significa "claves de perfil" en las pruebas en vivo)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado heredado: `~/.openclaw/credentials/` (se copia en el inicio de la prueba en vivo cuando está presente, pero no es el almacén principal de claves de perfil)
- Las ejecuciones locales en vivo copian la configuración activa, los archivos `auth-profiles.json` por agente, la `credentials/` heredada y los directorios de autenticación de CLI externos compatibles en un directorio de prueba temporal por defecto; los directorios en vivo preparados omiten `workspace/` y `sandboxes/`, y las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan para que los sondeos no afecten su espacio de trabajo real del host.

Si desea confiar en claves de entorno, expórtelas antes de las pruebas locales o use los ejecutores de Docker a continuación con un `OPENCLAW_PROFILE_FILE` explícito.

## Deepgram en vivo (transcripción de audio)

- Prueba: `extensions/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus coding plan en vivo

- Prueba: `extensions/byteplus/live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Medios de flujo de trabajo de ComfyUI en vivo

- Prueba: `extensions/comfy/comfy.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Alcance:
  - Ejercita las rutas de imagen, video y `music_generate` de comfy incluidas
  - Omite cada capacidad a menos que `plugins.entries.comfy.config.<capability>` esté configurado
  - Útil después de cambiar el envío, sondeo, descargas o registro de complementos del flujo de trabajo de comfy

## Generación de imágenes en vivo

- Prueba: `test/image-generation.runtime.live.test.ts`
- Comando: `pnpm test:live test/image-generation.runtime.live.test.ts`
- Arnés: `pnpm test:live:media image`
- Alcance:
  - Enumera todos los complementos de proveedor de generación de imágenes registrados
  - Usa las variables de entorno de proveedor ya exportadas antes de sondear
  - Usa claves API en vivo/entorno antes que los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta cada proveedor configurado a través del tiempo de ejecución compartido de generación de imágenes:
    - `<provider>:generate`
    - `<provider>:edit` cuando el proveedor declara compatibilidad con edición
- Proveedores incluidos actualmente cubiertos:
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- Limitación opcional:
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

Para la ruta de CLI enviada, añada una prueba de humo `infer` después de que la prueba en vivo del proveedor/tiempo de ejecución pase:

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

Esto cubre el análisis de argumentos de la CLI, la resolución de configuración/agente predeterminado, la activación de complementos empaquetados, el tiempo de ejecución compartido de generación de imágenes y la solicitud en vivo del proveedor. Se espera que las dependencias de los complementos estén presentes antes de la carga del tiempo de ejecución.

## Generación de música en vivo

- Prueba: `extensions/music-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media music`
- Alcance:
  - Ejercita la ruta compartida del proveedor de generación de música empaquetado
  - Actualmente cubre Google y MiniMax
  - Utiliza las variables de entorno del proveedor ya exportadas antes de sondear
  - Utiliza claves de API en vivo/entorno antes que los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada solo de solicitud
    - `edit` cuando el proveedor declara `capabilities.edit.enabled`
  - Cobertura actual del carril compartido:
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: archivo en vivo de Comfy separado, no este barrido compartido
- Limitación opcional:
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Generación de vídeo en vivo

- Prueba: `extensions/video-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media video`
- Alcance:
  - Ejercita la ruta compartida del proveedor de generación de vídeo empaquetado
  - Por defecto usa la ruta de smoke segura para el lanzamiento: proveedores que no sean FAL, una solicitud de texto a video por proveedor, un prompt de langosta de un segundo y un límite de operaciones por proveedor de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` por defecto)
  - Omite FAL por defecto porque la latencia de la cola del lado del proveedor puede dominar el tiempo de lanzamiento; pase `--video-providers fal` o `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` para ejecutarlo explícitamente
  - Usa las variables de entorno del proveedor ya exportadas antes de sondear
  - Usa claves API de entorno/en vivo por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta solo `generate` por defecto
  - Establezca `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` para también ejecutar los modos de transformación declarados cuando estén disponibles:
    - `imageToVideo` cuando el proveedor declara `capabilities.imageToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de imagen local respaldada por búfer en el barrido compartido
    - `videoToVideo` cuando el proveedor declara `capabilities.videoToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de video local respaldada por búfer en el barrido compartido
  - Proveedores `imageToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `vydra` porque el `veo3` incluido es solo de texto y el `kling` incluido requiere una URL de imagen remota
  - Cobertura específica del proveedor Vydra:
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ese archivo ejecuta `veo3` de texto a video más un carril `kling` que usa un dispositivo de URL de imagen remota por defecto
  - Cobertura en vivo actual `videoToVideo`:
    - `runway` solo cuando el modelo seleccionado es `runway/gen4_aleph`
  - Proveedores `videoToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `alibaba`, `qwen`, `xai` porque esas rutas actualmente requieren URLs de referencia remotas `http(s)` / MP4
    - `google` porque el carril compartido actual de Gemini/Veo utiliza entrada con respaldo de búfer local y esa ruta no se acepta en el barrido compartido
    - `openai` porque al carril compartido actual le faltan garantías de acceso de edición de video específicas de la organización
- Reducción opcional:
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` para incluir cada proveedor en el barrido predeterminado, incluyendo FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` para reducir el límite de operaciones de cada proveedor para una ejecución de smoke agresiva
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Arnés de medios en vivo

- Comando: `pnpm test:live:media`
- Propósito:
  - Ejecuta las suites compartidas de imágenes, música y video en vivo a través de un punto de entrada nativo del repositorio
  - Utiliza variables de entorno de proveedor ya exportadas
  - Reduce automáticamente cada suite a los proveedores que actualmente tienen autenticación utilizable de forma predeterminada
  - Reutiliza `scripts/test-live.mjs`, por lo que el comportamiento del latido y el modo silencioso se mantiene consistente
- Ejemplos:
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Relacionado

- [Pruebas](/es/help/testing) - suites unitarias, de integración, QA y Docker
