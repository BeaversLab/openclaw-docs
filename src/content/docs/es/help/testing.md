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

- Full gate (esperado antes del push): `pnpm build && pnpm check && pnpm test`
- Ejecución local de suite completa más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de vigilancia directo de Vitest: `pnpm test:watch`
- El direccionamiento directo a archivos ahora enruta las rutas de extensión/canal también: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Sitio de QA con soporte de Docker: `pnpm qa:lab:up`

Cuando modificas pruebas o deseas mayor confianza:

- Coverage gate: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite Live (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo live específico de forma silenciosa: `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Consejo: cuando solo necesitas un caso fallido, prefiere reducir las pruebas live mediante las variables de entorno de lista de permitidos (allowlist) descritas a continuación.

## Suites de pruebas (qué se ejecuta dónde)

Piensa en las suites como “realismo creciente” (y aumento de la inestabilidad/coste):

### Unitaria / integración (predeterminado)

- Comando: `pnpm test`
- Config: diez ejecuciones de fragmentos secuenciales (`vitest.full-*.config.ts`) sobre los proyectos Vitest existentes con alcance
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, y las pruebas de nodo `ui` en lista blanca cubiertas por `vitest.unit.config.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación del gateway, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápida y estable
- Nota sobre proyectos:
  - `pnpm test` sin destino ahora ejecuta once configuraciones de fragmentos más pequeñas (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un proceso nativo gigante de proyecto raíz. Esto reduce el RSS máximo en máquinas cargadas y evita que el trabajo de respuesta automática/extensión prive de recursos a suites no relacionadas.
  - `pnpm test --watch` todavía utiliza el gráfico de proyecto raíz nativo `vitest.config.ts`, porque un bucle de observación (watch loop) de múltiples fragmentos no es práctico.
  - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` dirigen objetivos explícitos de archivo/directorio primero a través de carriles con ámbito, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el costo completo de inicio del proyecto raíz.
  - `pnpm test:changed` expande las rutas de git modificadas en los mismos carriles con ámbito cuando el diff solo toca archivos de origen/prueba enrutables; las ediciones de configuración/configuración (setup) todavía vuelven a la reejecución más amplia del proyecto raíz.
  - Las pruebas seleccionadas de `plugin-sdk` y `commands` también se dirigen a través de carriles ligeros dedicados que omiten `test/setup-openclaw-runtime.ts`; los archivos con estado/pesados en tiempo de ejecución se mantienen en los carriles existentes.
  - Los archivos de origen auxiliares seleccionados de `plugin-sdk` y `commands` también asignan las ejecuciones en modo modificado a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones de los auxiliares evitan volver a ejecutar la suite pesada completa para ese directorio.
  - `auto-reply` ahora tiene tres cubos dedicados: auxiliares centrales de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. Esto mantiene el trabajo de arnés de respuesta más pesado fuera de las pruebas económicas de estado/fragmento/token.
- Nota del ejecutor integrado:
  - Cuando cambias las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación,
    mantén ambos niveles de cobertura.
  - Agrega regresiones auxiliares enfocadas para los límites puros de enrutamiento/normalización.
  - También mantén los conjuntos de integración del runner integrados saludables:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esos conjuntos verifican que los ids con ámbito y el comportamiento de compactación sigan fluyendo
    a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayudantes no son un
    sustituto suficiente para esas rutas de integración.
- Nota sobre el pool:
  - La configuración base de Vitest ahora usa por defecto `threads`.
  - La configuración compartida de Vitest también corrige `isolate: false` y usa el runner no aislado en las configuraciones de los proyectos raíz, e2e y live.
  - El carril UI raíz mantiene su configuración y optimizador `jsdom`, pero ahora también se ejecuta en el runner compartido no aislado.
  - Cada shard `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false` de la configuración compartida de Vitest.
  - El lanzador compartido `scripts/run-vitest.mjs` ahora también añade `--no-maglev` para los procesos secundarios Node de Vitest por defecto para reducir la sobrecarga de compilación de V8 durante ejecuciones locales grandes. Establece `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si necesitas comparar con el comportamiento estándar de V8.
- Nota de iteración local rápida:
  - `pnpm test:changed` se enruta a través de carriles con ámbito cuando las rutas cambiadas se asignan limpiamente a un conjunto más pequeño.
  - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento de enrutamiento, solo con un límite superior de trabajadores más alto.
  - El autoescalado de trabajadores locales ahora es intencionalmente conservador y también se reduce cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones concurrentes de Vitest causan menos daño por defecto.
  - La configuración base de Vitest marca los proyectos/archivos de configuración como `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia el cableado de las pruebas.
  - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles; establece `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si deseas una ubicación de caché explícita para perfiles directos.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest además de la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a los archivos cambiados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara `test:changed` enrutadas con la ruta del proyecto raíz nativo para ese diff confirmado e imprime el tiempo de ejecución más el RSS máximo de macOS.
- `pnpm test:perf:changed:bench -- --worktree` evalúa el rendimiento del árbol sucio actual enrutando la lista de archivos modificados a través de `scripts/test-projects.mjs` y la configuración raíz de Vitest.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del subproceso principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y de memoria del ejecutor para la suite de unidad con el paralelismo de archivos desactivado.

### E2E (prueba de humo del gateway)

- Comando: `pnpm test:e2e`
- Config: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Anulaciones útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a activar la salida detallada de la consola.
- Ámbito:
  - Comportamiento end-to-end del gateway de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (puede ser más lento)

### E2E: prueba de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Ámbito:
  - Inicia un gateway aislado de OpenShell en el host mediante Docker
  - Crea un entorno sandbox a partir de un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw sobre `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local y un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye el gateway y el sandbox de prueba
- Anulaciones útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente la suite e2e más amplia
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI o script de envoltorio no predeterminado

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona realmente este proveedor/modelo _hoy_ con credenciales reales?”
  - Detectar cambios de formato del proveedor, peculiaridades de llamadas a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Preferir ejecutar subconjuntos reducidos en lugar de “todo”
- Las ejecuciones en vivo originan `~/.profile` para recuperar las claves de API faltantes.
- De forma predeterminada, las ejecuciones en vivo todavía aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que las accesorios unitarios no puedan mutar tu `~/.openclaw` real.
- Establece `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando necesites intencionalmente que las pruebas en vivo usen tu directorio de inicio real.
- `pnpm test:live` ahora tiene por defecto un modo más silencioso: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso adicional de `~/.profile` y silencia los registros de arranque de la puerta de enlace (gateway) y el chat de Bonjour. Establece `OPENCLAW_LIVE_TEST_QUIET=0` si deseas recuperar los registros completos de inicio.
- Rotación de claves de API (específica del proveedor): establece `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por cada ejecución en vivo a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites en vivo ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de consola de Vitest está silenciosa.
  - `vitest.live.config.ts` deshabilita la interceptación de consola de Vitest para que las líneas de progreso del proveedor/puerta de enlace (gateway) se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajusta los latidos de modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajusta los latidos de gateway/probe con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Usa esta tabla de decisiones:

- Editando lógica/pruebas: ejecuta `pnpm test` (y `pnpm test:coverage` si cambiaste mucho)
- Tocando redes de gateway / protocolo WS / emparejamiento: añade `pnpm test:e2e`
- Depurando "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecuta un `pnpm test:live` reducido

## Live: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos anunciados actualmente** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración precondicionada/manual (la suite no instala/ejecuta/empareja la app).
  - Validación comando por comando de gateway `node.invoke` para el nodo Android seleccionado.
- Configuración previa requerida:
  - App de Android ya conectada y emparejada con el gateway.
  - App mantenida en primer plano.
  - Consentimiento de permisos/captura concedido para las capacidades que esperas que pasen.
- Sobrescrituras de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/en/platforms/android)

## Live: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- "Modelo directo" nos dice si el proveedor/modelo puede responder en absoluto con la clave dada.
- "Prueba de humo de gateway" nos dice si la tubería completa de gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Completación de modelo directo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar modelos para los que tienes credenciales
  - Ejecutar una pequeña completación por modelo (y regresiones dirigidas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si invocas Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para moderno) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` enfocado en la prueba de humo del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y alternativas de entorno
  - Establezca `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar solo el **almacén de perfiles**
- Por qué existe:
  - Separa "la API del proveedor está rota / la clave no es válida" de "la canalización del agente de la puerta de enlace está rota"
  - Contiene regresiones pequeñas y aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Humo de la puerta de enlace + agente de desarrollo (lo que "@openclaw" realmente hace)

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar una puerta de enlace en proceso
  - Crear/patchear una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos-con-claves y afirmar:
    - respuesta "significativa" (sin herramientas)
    - funciona una invocación de herramienta real (sondeo de lectura)
    - sondeos de herramientas adicionales opcionales (sondeo de ejecución+lectura)
    - Las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - sondeo `read`: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que lo `read` y devuelva el nonce.
  - sondeo `exec+read`: la prueba pide al agente que `exec`-escriba un nonce en un archivo temporal, luego lo `read` de vuelta.
  - sondeo de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Por defecto: lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista de permitidos moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para limitar
- Cómo seleccionar proveedores (evitar "todo en OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista de permitidos separada por comas)
- Las sondas de herramientas e imágenes siempre están activas en esta prueba en vivo:
  - sonda `read` + sonda `exec+read` (estrés de herramientas)
  - la sonda de imágenes se ejecuta cuando el modelo anuncia soporte de entrada de imágenes
  - Flujo (nivel alto):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía mediante `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puede probar en su máquina (y los ids exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del backend de CLI (Claude, Codex, Gemini u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización de Gateway + agente utilizando un backend de CLI local, sin tocar su configuración predeterminada.
- Los valores predeterminados de prueba de humo específicos del backend se encuentran en la definición `cli-backend.ts` de la extensión propietaria.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Proveedor/modelo predeterminado: `claude-cli/claude-sonnet-4-6`
  - El comportamiento de comando/argumentos/imágenes proviene de los metadatos del complemento del backend de CLI propietario.
- Anulaciones (opcional):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el mensaje).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de archivos de imagen como argumentos de CLI en lugar de inyección en el mensaje.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando se establece `IMAGE_ARG`.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` para desactivar la sonda de continuidad de misma sesión predeterminada de Claude Sonnet -> Opus (establezca en `1` para forzarla cuando el modelo seleccionado admita un destino de cambio).

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
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notas:

- El ejecutor de Docker se encuentra en `scripts/test-live-cli-backend-docker.sh`.
- Ejecuta la prueba de humo del backend de CLI en vivo dentro de la imagen de Docker del repositorio como el usuario no root `node`.
- Resuelve los metadatos de la prueba de humo de CLI desde la extensión propietaria, luego instala el paquete de CLI de Linux coincidente (`@anthropic-ai/claude-code`, `@openai/codex` o `@google/gemini-cli`) en un prefijo escribible en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- La prueba de humo del backend de CLI en vivo ahora ejercita el mismo flujo de extremo a extremo para Claude, Codex y Gemini: turno de texto, turno de clasificación de imágenes y luego llamada de herramienta MCP `cron` verificada a través de la CLI de la pasarela.
- La prueba de humo predeterminada de Claude también parchea la sesión de Sonnet a Opus y verifica que la sesión reanudada todavía recuerde una nota anterior.

## En vivo: Prueba de humo de enlace ACP (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de enlace de conversación ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación sintética del canal de mensajes en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Activar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Predeterminados:
  - Agentes ACP en Docker: `claude,codex,gemini`
  - Agente ACP para `pnpm test:live ...` directo: `claude`
  - Canal sintético: contexto de conversación estilo MD de Slack
  - Backend ACP: `acpx`
- Anulaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notas:
  - Este carril utiliza la superficie `chat.send` de la puerta de enlace con campos de origen-sintéticos solo para administradores, de modo que las pruebas pueden adjuntar contexto de canal de mensajes sin fingir entregar externamente.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` no está establecido, la prueba utiliza el registro de agentes integrado del complemento `acpx` para el agente de arnés ACP seleccionado.

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

Recetas de Docker de un solo agente:

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Notas de Docker:

- El ejecutor de Docker se encuentra en `scripts/test-live-acp-bind-docker.sh`.
- De forma predeterminada, ejecuta la prueba de vinculación de ACP (ACP bind smoke) contra todos los agentes CLI en vivo admitidos en secuencia: `claude`, `codex` y luego `gemini`.
- Use `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` o `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` para limitar la matriz.
- Obtiene `~/.profile`, prepara el material de autenticación CLI coincidente en el contenedor, instala `acpx` en un prefijo npm grabable y luego instala el CLI en vivo solicitado (`@anthropic-ai/claude-code`, `@openai/codex` o `@google/gemini-cli`) si falta.
- Dentro de Docker, el ejecutor establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveente del perfil obtenido disponibles para el CLI de arneses secundario.

### Recetas en vivo recomendadas

Las listas de permitidos (allowlists) estrechas y explícitas son las más rápidas y menos propensas a fallos:

- Modelo único, directo (sin puerta de enlace):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo de la puerta de enlace:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada de herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` utiliza la API de Gemini (clave de API).
- `google-antigravity/...` utiliza el puente OAuth de Antigravity (punto final del agente estilo Cloud Code Assist).
- `google-gemini-cli/...` utiliza la CLI de Gemini local en su máquina (autenticación separada + peculiaridades de herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API de Gemini alojada de Google a través de HTTP (clave de API / autenticación de perfil); esto es lo que la mayoría de los usuarios entienden por "Gemini".
  - CLI: OpenClaw invoca un binario `gemini` local; tiene su propia autenticación y puede comportarse de manera diferente (streaming/soporte de herramientas/diferencia de versión).

## Live: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (live es opcional), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto de humo moderno (llamada a herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (non-Codex): `openai/gpt-5.4` (opcional: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evite los modelos Gemini 2.x anteriores)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecute la prueba de humo de la puerta de enlace con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamada a herramientas (Read + Exec opcional)

Elija al menos uno por familia de proveedor:

- OpenAI: `openai/gpt-5.4` (o `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (deseable):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`... (elija un modelo "capaz de herramientas" que tenga habilitado)
- Cerebras: `cerebras/`... (si tiene acceso)
- LM Studio: `lmstudio/`... (local; la llamada a herramientas depende del modo API)

### Visión: envío de imagen (archivo adjunto → mensaje multimodal)

Incluya al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar el sondeo de imágenes.

### Agregadores / puertas de enlace alternativas

Si tiene las claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; use `openclaw models scan` para encontrar candidatos con capacidad de herramientas e imágenes)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación vía `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Vía `models.providers` (endpoints personalizados): `minimax` (nube/API), más cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar "todos los modelos" en los documentos. La lista autoritativa es lo que `discoverModels(...)` devuelva en tu máquina + las claves disponibles.

## Credenciales (nunca commits)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice "sin credenciales", depura de la misma manera en la que depurarías `openclaw models list` / la selección del modelo.

- Perfiles de autenticación por agente: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (esto es lo que significa "claves de perfil" en las pruebas en vivo)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado heredado: `~/.openclaw/credentials/` (copiado al inicio en vivo preparado cuando está presente, pero no al almacén principal de claves de perfil)
- Las ejecuciones locales en vivo copian la configuración activa, los archivos `auth-profiles.json` por agente, los `credentials/` heredados y los directorios de autenticación CLI externos compatibles en un directorio de prueba temporal de forma predeterminada; los directorios en vivo por etapas omiten `workspace/` y `sandboxes/`, y las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan para que los sondeos no accedan a su espacio de trabajo host real.

Si desea confiar en claves de entorno (p. ej., exportadas en su `~/.profile`), ejecute pruebas locales después de `source ~/.profile`, o use los ejecutores de Docker a continuación (ellos pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Medios de flujo de trabajo ComfyUI en vivo

- Prueba: `extensions/comfy/comfy.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Alcance:
  - Ejercita las rutas de imagen, video y `music_generate` cómodas incluidas
  - Omite cada capacidad a menos que se configure `models.providers.comfy.<capability>`
  - Útil después de cambiar el envío, sondeo, descargas o registro de complementos del flujo de trabajo cómodo

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Arnés: `pnpm test:live:media image`
- Alcance:
  - Enumera todos los complementos de proveedor de generación de imágenes registrados
  - Carga las variables de entorno del proveedor faltantes desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves API en vivo/de entorno por delante de los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no ocultan las credenciales reales del shell
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
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacenamiento de perfiles e ignorar las anulaciones solo de entorno

## Generación de música en vivo

- Prueba: `extensions/music-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media music`
- Ámbito:
  - Ejercita la ruta compartida del proveedor de generación de música incluida
  - Actualmente cubre Google y MiniMax
  - Carga las variables de entorno del proveedor desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada solo de solicitud
    - `edit` cuando el proveedor declara `capabilities.edit.enabled`
  - Cobertura actual de carril compartido:
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: archivo en vivo de Comfy separado, no este barrido compartido
- Narrowing opcional:
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacenamiento de perfiles e ignorar las anulaciones solo de entorno

## Generación de video en vivo

- Prueba: `extensions/video-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media video`
- Ámbito:
  - Ejercita la ruta compartida del proveedor de generación de video incluida
  - Carga las variables de entorno del proveedor desde tu shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/entorno por delante de los perfiles de autenticación almacenados por defecto, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada solo de solicitud
    - `imageToVideo` cuando el proveedor declara `capabilities.imageToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de imagen local respaldada por búfer en el barrido compartido
    - `videoToVideo` cuando el proveedor declara `capabilities.videoToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de video local respaldada por búfer en el barrido compartido
  - Proveedores `imageToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `vydra` porque el `veo3` incluido es solo de texto y el `kling` incluido requiere una URL de imagen remota
  - Cobertura específica del proveedor Vydra:
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ese archivo ejecuta `veo3` de texto a video más un carril `kling` que usa un dispositivo de URL de imagen remota de forma predeterminada
  - Cobertura en vivo actual de `videoToVideo`:
    - `runway` solo cuando el modelo seleccionado es `runway/gen4_aleph`
  - Proveedores `videoToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `alibaba`, `qwen`, `xai` porque esas rutas actualmente requieren URLs de referencia `http(s)` / MP4 remotas
    - `google` porque el carril Gemini/Veo compartido actual usa entrada local respaldada por búfer y esa ruta no se acepta en el barrido compartido
    - `openai` porque el carril compartido actual carece de garantías de acceso específicas de la organización para inpaint/remix de video
- Reducción opcional:
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacén de perfiles e ignorar las anulaciones solo de entorno

## Arnés de medios en vivo

- Comando: `pnpm test:live:media`
- Propósito:
  - Ejecuta los conjuntos de pruebas en vivo de imagen, música y video compartidos a través de un punto de entrada nativo del repositorio
  - Carga automáticamente las variables de entorno del proveedor faltantes desde `~/.profile`
  - Reduce automáticamente cada conjunto de pruebas a proveedores que actualmente tienen autenticación utilizable de forma predeterminada
  - Reutiliza `scripts/test-live.mjs`, por lo que el comportamiento de latido y modo silencioso se mantiene constante
- Ejemplos:
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo de clave de perfil coincidente dentro de la imagen Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando tu directorio de configuración local y espacio de trabajo (y obteniendo `~/.profile` si está montado). Los puntos de entrada locales coincidentes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker tienen como valor predeterminado un límite de prueba de humo más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` tiene como valor predeterminado `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene como valores predeterminados `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anula esas variables de entorno cuando
  quieras explícitamente el barrido exhaustivo más grande.
- `test:docker:all` construye la imagen Docker en vivo una vez a través de `test:docker:live-build` y luego la reutiliza para los dos carriles Docker en vivo.
- Ejecutores de prueba de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelos en vivo también montan mediante enlace solo los directorios de autenticación de CLI necesarios (o todos los admitidos cuando la ejecución no se limita) y luego los copian en el directorio principal del contenedor antes de la ejecución, para que el OAuth de CLI externa pueda actualizar los tokens sin mutar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Gateway networking (two containers, WS auth + health): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (install smoke + `/plugin` alias + Claude-bundle restart semantics): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores Docker de modelo en vivo también montan la copia actual en modo de solo lectura y la preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras se ejecuta Vitest contra su fuente/configuración local exacta. El paso de preparación omite las grandes cachés locales exclusivas y los resultados de compilación de la aplicación como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y `.build` local de la aplicación o los directorios de salida de Gradle, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la puerta de enlace no inicien trabajadores de canal reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` aún ejecuta `pnpm test:live`, por lo que también pase `OPENCLAW_LIVE_GATEWAY_*` cuando necesite restringir o excluir la cobertura en vivo de la puerta de enlace en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor Open WebUI anclado contra esa puerta de enlace, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar descargar la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de arranque en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` de forma predeterminada) es la forma principal de proporcionarla en las ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway con semilla, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envíos salientes y las notificaciones de canal + permisos estilo Claude sobre el puente stdio MCP real. La verificación de notaciones inspecciona los cuadros stdio MCP sin procesar directamente, por lo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a mostrar.

Prueba de humo de subprocesos en lenguaje sencillo de ACP manual (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conserve este script para flujos de trabajo de regresión/depuración. Es posible que vuelva a ser necesario para la validación del enrutamiento de subprocesos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y originado antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como de solo lectura bajo `/host-auth...` y luego se copian en `/home/node/...` antes de que inicien las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedores reducidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anule manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none` o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para garantizar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el aviso de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI anclada

## Cordura de los documentos

Ejecuta las comprobaciones de documentación después de editar los documentos: `pnpm check:docs`.
Ejecuta la validación completa de anclajes de Mintlify cuando también necesites comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, bucle real de gateway + agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta de OpenAI simulada de extremo a extremo a través del bucle del agente del gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente sobre ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simuladas a través del bucle real del gateway + agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que todavía falta para las habilidades (ver [Habilidades](/en/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de varios turnos que afirman el orden de las herramientas, la transferencia del historial de sesión y los límites del espacio aislado (sandbox).

Las evaluaciones futuras deben ser primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso frente a evitación, bloqueo, inyección de mensajes).
- Evaluaciones en vivo opcionales (opt-in, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan un conjunto de afirmaciones de forma y comportamiento. El carril unitario `pnpm test` predeterminado omite intencionalmente estos archivos compartidos de costura (seam) y pruebas de humo (smoke); ejecuta los comandos de contrato explícitamente cuando tocas superficies compartidas de canales o proveedores.

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
- **group-policy** - Aplicación de políticas de grupo

### Contratos de estado del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondas de estado del canal
- **registry** - Forma del registro de complementos

### Contratos del proveedor

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

- Después de cambiar las exportaciones o subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (orientación)

Cuando corrijas un problema de proveedor/modelo descubierto en vivo:

- Agrega una regresión segura para CI si es posible (proveedor simulado/stub, o captura la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo para vivo (límites de tasa, políticas de autenticación), mantén la prueba en vivo limitada y de participación opcional mediante variables de entorno
- Preferir apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Barrera de seguridad para el recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si agregas una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en ids de objetivos no clasificados para que las nuevas clases no puedan omitirse silenciosamente.
