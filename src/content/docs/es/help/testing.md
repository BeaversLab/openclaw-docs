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

- Gate completo (esperado antes de hacer push): `pnpm build && pnpm check && pnpm test`
- Ejecución local de suite completa más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de vigilancia (watch loop) directo de Vitest (config de proyectos modernos): `pnpm test:watch`
- El direccionamiento directo de archivos ahora también enruta rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`

Cuando tocas pruebas o quieres mayor seguridad:

- Gate de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramientas/imágenes de gateway): `pnpm test:live`
- Apuntar a un archivo en vivo silenciosamente: `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Consejo: cuando solo necesitas un caso fallido, prefiere limitar las pruebas en vivo mediante las variables de entorno de lista blanca descritas a continuación.

## Suites de pruebas (qué se ejecuta dónde)

Piensa en las suites como “realismo creciente” (y mayor inestabilidad/costo):

### Unitarias / integración (predeterminado)

- Comando: `pnpm test`
- Config: Vitest nativo `projects` a través de `vitest.config.ts`
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, y las pruebas de nodo `ui` en lista blanca cubiertas por `vitest.unit.config.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de gateway, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápida y estable
- Nota de proyectos:
  - `pnpm test`, `pnpm test:watch` y `pnpm test:changed` ahora usan la misma configuración raíz `projects` de Vitest nativo.
  - Los filtros de archivos directos se enrutan nativamente a través del gráfico del proyecto raíz, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` funciona sin un contenedor personalizado.
- Nota del ejecutor integrado:
  - Cuando cambias las entradas de descubrimiento de herramientas de mensajes o el contexto de ejecución de compactación,
    mantén ambos niveles de cobertura.
  - Añada regresiones de ayuda centradas para los límites de enrutamiento/normalización puros.
  - Mantenga también sanas las suites de integración del ejecutor embebido:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esas suites verifican que los ids con ámbito y el comportamiento de compactación sigan fluyendo
    a través de las rutas `run.ts` / `compact.ts` reales; las pruebas solo de ayuda no son un
    sustituto suficiente para esas rutas de integración.
- Nota sobre el pool:
  - La configuración base de Vitest ahora usa por defecto `threads`.
  - La configuración compartida de Vitest también corrige `isolate: false` y usa el ejecutor no aislado en los proyectos raíz, configuraciones e2e y live.
  - El carril de la UI raíz mantiene su configuración `jsdom` y optimizador, pero ahora también se ejecuta en el ejecutor no aislado compartido.
  - `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false` de la configuración de proyectos `vitest.config.ts` raíz.
  - El iniciador `scripts/run-vitest.mjs` compartido ahora también añade `--no-maglev` para los procesos secundarios de Node de Vitest por defecto para reducir la sobrecarga de compilación de V8 durante las ejecuciones locales grandes. Establezca `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si necesita comparar con el comportamiento estándar de V8.
- Nota de iteración local rápida:
  - `pnpm test:changed` ejecuta la configuración de proyectos nativos con `--changed origin/main`.
  - `pnpm test:max` y `pnpm test:changed:max` mantienen la misma configuración de proyectos nativos, solo con un límite de trabajadores más alto.
  - La autoescalada de trabajadores locales es ahora intencionalmente conservadora y también se reduce cuando la carga promedio del host ya es alta, por lo que múltiples ejecuciones simultáneas de Vitest causan menos daño por defecto.
  - La configuración base de Vitest marca los archivos de proyectos/configuración como `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia el cableado de las pruebas.
  - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles; establezca `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea una ubicación de caché explícita para el perfilado directo.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest más la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a los archivos cambiados desde `origin/main`.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montón del ejecutor para la suite unitaria con el paralelismo de archivos deshabilitado.

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de ejecución:
  - Usa Vitest `threads` con `isolate: false`, igual que el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el conteo de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento end-to-end del gateway de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la tubería)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (puede ser más lento)

### E2E: OpenShell backend smoke

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia un gateway OpenShell aislado en el host mediante Docker
  - Crea un sandbox desde un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw sobre `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye el gateway de prueba y el sandbox
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar la suite e2e más amplia manualmente
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o un script contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona este proveedor/modelo realmente _hoy_ con credenciales reales?”
  - Detectar cambios de formato del proveedor, peculiaridades de llamadas a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Prefiere ejecutar subconjuntos reducidos en lugar de "todo"
- Las ejecuciones en vivo obtienen (source) `~/.profile` para recuperar las claves de API faltantes.
- Por defecto, las ejecuciones en vivo aún aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los accesorios unitarios no puedan mutar tu `~/.openclaw` real.
- Establece `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando necesitas intencionalmente que las pruebas en vivo usen tu directorio de inicio real.
- `pnpm test:live` ahora usa por defecto un modo más silencioso: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso extra de `~/.profile` y silencia los registros de arranque de la pasarela/el ruido de Bonjour. Establece `OPENCLAW_LIVE_TEST_QUIET=0` si quieres recuperar los registros completos de inicio.
- Rotación de claves de API (específica del proveedor): establece `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por ejecución en vivo a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites en vivo ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de consola de Vitest está silenciosa.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/pasarela se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajusta los latidos de modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajusta los latidos de pasarela/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Usa esta tabla de decisión:

- Editando lógica/pruebas: ejecuta `pnpm test` (y `pnpm test:coverage` si cambiaste mucho)
- Tocar la red del gateway / protocolo WS / emparejamiento: añadir `pnpm test:e2e`
- Depuración de "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecutar una `pnpm test:live` restringida

## Live: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos actualmente anunciados** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración previa/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación `node.invoke` del gateway comando por comando para el nodo Android seleccionado.
- Configuración previa requerida:
  - Aplicación Android ya conectada y emparejada con el gateway.
  - Aplicación mantenida en primer plano.
  - Permisos/consentimiento de captura otorgados para las capacidades que esperas que pasen.
- Invalidaciones de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/en/platforms/android)

## Live: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- "Modelo directo" nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo del gateway" nos indica si la canalización completa del gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización del modelo directo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar modelos para los que tienes credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en la prueba de humo del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos modernos (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos modernos
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (lista blanca separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity"` (lista blanca separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacenamiento de perfil y respaldos de entorno
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacenamiento de perfil**
- Por qué existe esto:
  - Separa “la API del proveedor está rota / la clave no es válida” de “la tubería del agente de la puerta de enlace está rota”
  - Contiene pequeñas regresiones aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Prueba de humo de la puerta de enlace + agente de desarrollo (lo que realmente hace "@openclaw")

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una puerta de enlace dentro del proceso
  - Crear/aplicar un parche a una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos con claves y afirmar:
    - respuesta “significativa” (sin herramientas)
    - funciona una invocación de herramienta real (sondeo de lectura)
    - sondeos de herramientas adicionales opcionales (sondeo de ejecución + lectura)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal, luego que `read`.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Por defecto: lista blanca moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista blanca moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para acotar
- Cómo seleccionar proveedores (evitar “todo por OpenRouter”):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,openai,anthropic,zai,minimax"` (lista blanca separada por comas)
- Los sondas de herramientas e imágenes siempre están activos en esta prueba en vivo:
  - sondeo `read` + sondeo `exec+read` (estrés de herramientas)
  - el sondeo de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (alto nivel):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía a través de `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Sugerencia: para ver qué puede probar en su máquina (y los ids exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de enlace de conversación ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación de canal de mensajes sintética en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Habilitar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valores predeterminados:
  - Agente ACP: `claude`
  - Canal sintético: contexto de conversación estilo DM de Slack
  - Backend ACP: `acpx`
- Anulaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notas:
  - Este carril utiliza la superficie `chat.send` de la puerta de enlace con campos de ruta de origen sintéticos solo para administradores, de modo que las pruebas puedan adjuntar contexto de canal de mensajes sin pretender entregar externamente.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` no está configurado, la prueba utiliza el registro de agentes integrado del complemento `acpx` para el agente de arnés ACP seleccionado.

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
- Obtiene `~/.profile`, prepara el material de autenticación CLI coincidente en el contenedor, instala `acpx` en un prefijo npm escribible y luego instala la CLI en vivo solicitada (`@anthropic-ai/claude-code` o `@openai/codex`) si falta.
- Dentro de Docker, el ejecutable establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveedor del perfil obtenido disponibles para el arnés CLI secundario.

### Recetas en vivo recomendadas

Las listas de permitidos (allowlists) estrechas y explícitas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo del gateway:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada a herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa la API de Gemini (clave de API).
- `google-antigravity/...` usa el puente OAuth de Antigravity (punto final del agente estilo Cloud Code Assist).

## En vivo: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (en vivo es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de pruebas de humo moderno (llamada a herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.4` (opcional: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (API de Gemini): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar modelos Gemini 2.x más antiguos)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecutar prueba de humo del gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elija al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.4` (o `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (conveniente tener):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elija un modelo con capacidad de “herramientas” que tenga habilitado)
- Cerebras: `cerebras/`… (si tiene acceso)
- LM Studio: `lmstudio/`… (local; la llamada a herramientas depende del modo API)

### Vision: envío de imagen (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes con visión de Claude/Gemini/OpenAI, etc.) para ejercitar la sonda de imagen.

### Agregadores / puertas de enlace alternativas

Si tiene claves habilitadas, también admitimos las pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; use `openclaw models scan` para encontrar candidatos con capacidad de herramientas+imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación mediante `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puede incluir en la matriz en vivo (si tiene credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (endpoints personalizados): `minimax` (nube/API), además de cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intente codificar “todos los modelos” en los documentos. La lista definitiva es lo que `discoverModels(...)` devuelva en su máquina + las claves que estén disponibles.

## Credenciales (nunca las confirme)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo indica “sin credenciales”, depure de la misma manera que depuraría `openclaw models list` / la selección del modelo.

- Perfiles de autenticación por agente: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (esto es lo que significa "profile keys" en las pruebas en vivo)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado heredado: `~/.openclaw/credentials/` (se copia en el inicio de sesión en vivo preparado cuando está presente, pero no en el almacén principal de claves de perfil)
- Las ejecuciones locales en vivo copian la configuración activa, los archivos `auth-profiles.json` por agente, el `credentials/` heredado y los directorios de autenticación CLI externos compatibles en un inicio de prueba temporal por defecto; las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan en esa configuración preparada para que las sondas no accedan a su espacio de trabajo real del host.

Si desea confiar en claves de entorno (por ejemplo, exportadas en su `~/.profile`), ejecute pruebas locales después de `source ~/.profile`, o use los ejecutores de Docker a continuación (pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Plan de codificación BytePlus en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Medios de flujo de trabajo ComfyUI en vivo

- Prueba: `extensions/comfy/comfy.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Alcance:
  - Ejercita las rutas de imagen, video y `music_generate` incluidas en comfy
  - Omite cada capacidad a menos que `models.providers.comfy.<capability>` esté configurado
  - Útil después de cambiar el envío, sondeo, descargas o registro de complementos del flujo de trabajo de comfy

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Alcance:
  - Enumera todos los complementos de proveedor de generación de imágenes registrados
  - Carga las variables de entorno del proveedor faltantes desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves API en vivo/de entorno antes que los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta las variantes de generación de imágenes estándar a través de la capacidad de tiempo de ejecución compartida:
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Proveedores integrados actuales cubiertos:
  - `openai`
  - `google`
- Reducción opcional:
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Generación de música en vivo

- Prueba: `extensions/music-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Alcance:
  - Ejecuta la ruta compartida del proveedor de generación de música integrado
  - Actualmente cubre Google y MiniMax
  - Carga las variables de entorno del proveedor desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
- Reducción opcional:
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo coincidente con la clave de perfil dentro de la imagen Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando tu directorio de configuración local y espacio de trabajo (y obteniendo `~/.profile` si está montado). Los puntos de entrada locales coincidentes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker por defecto tienen un límite de pruebas de humo más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` por defecto es `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` por defecto es `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anula esas variables de entorno cuando
  quieras explícitamente el escaneo exhaustivo más grande.
- `test:docker:all` construye la imagen Docker en vivo una vez a través de `test:docker:live-build`, luego la reutiliza para los dos carriles Docker en vivo.
- Ejecutores de pruebas de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelos en vivo también montan con bind-mount solo los directorios de autenticación de CLI necesarios (o todos los admitidos cuando la ejecución no se limita), luego los copian en el directorio principal del contenedor antes de la ejecución para que OAuth de CLI externo pueda actualizar los tokens sin modificar el almacenamiento de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Redes de Gateway (dos contenedores, autenticación WS + estado): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Puente de canal MCP (Gateway sembrado + puente stdio + prueba de humo de marco de notificación sin procesar de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Complementos (prueba de humo de instalación + alias `/plugin` + semánticas de reinicio del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de modelo en vivo también montan el código actual en modo de solo lectura (bind-mount) y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras se ejecuta Vitest contra tu código fuente/configuración local exacta.
El paso de preparación omite las cachés locales grandes y las salidas de compilación de la aplicación, como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y los directorios de salida `.build` locales de la aplicación o de Gradle, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina.
También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la gateway no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor.
`test:docker:live-models` todavía ejecuta `pnpm test:live`, así que también pasa `OPENCLAW_LIVE_GATEWAY_*` cuando necesites reducir o excluir la cobertura en vivo de la gateway en ese carril de Docker.
`test:docker:openwebui` es una prueba de humo de compatibilidad de mayor nivel: inicia un contenedor de gateway OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor Open WebUI anclado contra esa gateway, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI.
La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar descargar la imagen de Open WebUI y Open WebUI puede necesitar terminar su propia configuración de inicio en frío.
Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones Dockerizadas.
Las ejecuciones exitosas imprimen una pequeña carga útil JSON como `{ "ok": true, "model":
"openclaw/default", ... }`.
`test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway semillado, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envíos salientes y notificaciones de canal y permisos estilo Claude a través del puente stdio MCP real. La verificación de notaciones inspecciona los marcos stdio MCP sin procesar directamente, de modo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico decide exponer.

Prueba de humo de hilo en lenguaje plano de ACP manual (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede volver a ser necesario para la validación del enrutamiento de hilos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como de solo lectura bajo `/host-auth...`, luego se copian en `/home/node/...` antes de que inicien las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedores reducidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anule manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el aviso de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI fijada

## Cordura de documentos

Ejecuta comprobaciones de documentos después de editar los documentos: `pnpm check:docs`.
Ejecuta la validación completa de anclajes de Mintlify cuando también necesites comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta de OpenAI simulada de extremo a extremo a través del bucle de agente del gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación forzada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de WS y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simulada a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (consulta [Habilidades](/en/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el prompt, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la transferencia del historial de la sesión y los límites del espacio aislado.

Las evaluaciones futuras deben mantenerse primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (usar frente a evitar, restricción, inyección de prompt).
- Evaluaciones en vivo opcionales (participación voluntaria, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su
contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan un conjunto de
afirmaciones de forma y comportamiento. El carril unitario `pnpm test` por defecto intencionalmente
omite estos archivos compartidos de costura y prueba de humo; ejecuta los comandos de contrato explícitamente
cuando toques superficies compartidas de canal o proveedor.

### Comandos

- Todos los contratos: `pnpm test:contracts`
- Solo contratos de canal: `pnpm test:contracts:channels`
- Solo contratos de proveedor: `pnpm test:contracts:plugins`

### Contratos de canal

Ubicado en `src/channels/plugins/contracts/*.contract.test.ts`:

- **plugin** - Forma básica del complemento (id, nombre, capacidades)
- **setup** - Contrato del asistente de configuración
- **session-binding** - Comportamiento de vinculación de sesión
- **outbound-payload** - Estructura del payload del mensaje
- **inbound** - Manejo de mensajes entrantes
- **actions** - Manejadores de acciones del canal
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Cumplimiento de políticas de grupo

### Contratos de estado del proveedor

Ubicado en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondeos de estado del canal
- **registry** - Forma del registro de complementos

### Contratos de proveedor

Ubicado en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato de flujo de autenticación
- **auth-choice** - Elección/selección de autenticación
- **catalog** - API de catálogo de modelos
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

Cuando soluciona un problema de proveedor/modelo descubierto en vivo:

- Agregue una regresión segura para CI si es posible (proveedor simulado/stub, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de velocidad, políticas de autenticación), mantenga la prueba en vivo estrecha y opcional a través de variables de entorno
- Prefiera apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramienta de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada segura para CI de la puerta de enlace
- Guardaílla de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si agrega una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualice `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en ids de objetivo no clasificados para que las nuevas clases no puedan omitirse silenciosamente.
