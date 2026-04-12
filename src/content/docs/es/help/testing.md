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
- Ejecución local completa de suite más rápida en una máquina con espacio: `pnpm test:max`
- Bucle de vigilancia directo de Vitest: `pnpm test:watch`
- La segmentación directa de archivos ahora enruta también las rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones segmentadas primero cuando estás iterando sobre un único fallo.
- Sitio de QA respaldado por Docker: `pnpm qa:lab:up`
- Carril de QA respaldado por VM Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando modificas pruebas o quieres mayor seguridad:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite Live (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo live de forma silenciosa: `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Consejo: cuando solo necesitas un caso de fallo, prefiere reducir las pruebas live mediante las variables de entorno de lista blanca descritas a continuación.

## Ejecutores específicos de QA

Estos comandos se ubican junto a las suites de prueba principales cuando necesitas realismo de laboratorio de QA:

- `pnpm openclaw qa suite`
  - Ejecuta escenarios de QA respaldados por repositorio directamente en el host.
  - Ejecuta múltiples escenarios seleccionados en paralelo por defecto con
    trabajadores de gateway aislados, hasta 64 trabajadores o el recuento de escenarios seleccionados. Usa
    `--concurrency <count>` para ajustar el recuento de trabajadores, o `--concurrency 1` para
    el carril serie anterior.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta la misma suite de QA dentro de una VM Linux desechable de Multipass.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza las mismas marcas de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones Live reenvían las entradas de autenticación de QA compatibles que son prácticas para el invitado:
    claves de proveedor basadas en entorno, la ruta de configuración del proveedor live de QA y `CODEX_HOME`
    cuando está presente.
  - Los directorios de salida deben permanecer en la raíz del repositorio para que el invitado pueda escribir de vuelta a través
    del espacio de trabajo montado.
  - Escribe el informe de QA normal + resumen además de los registros de Multipass en
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA respaldado por Docker para trabajos de QA de estilo operador.
- `pnpm openclaw qa matrix`
  - Ejecuta el carril de QA en vivo de Matrix contra un homeserver Tuwunel desechable respaldado por Docker.
  - Aprovisiona tres usuarios temporales de Matrix (`driver`, `sut`, `observer`) más una sala privada, luego inicia un hijo de puerta de enlace de QA con el plugin real de Matrix como transporte SUT.
  - Usa la imagen estable anclada de Tuwunel `ghcr.io/matrix-construct/tuwunel:v1.5.1` por defecto. Anule con `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` cuando necesite probar una imagen diferente.
  - Escribe un informe de QA de Matrix, un resumen y un artefacto de eventos observados bajo `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real usando los tokens del bot del controlador y del SUT del entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El id de grupo debe ser el id de chat numérico de Telegram.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilite el Modo de comunicación de bot a bot en `@BotFather` para ambos bots y asegúrese de que el bot del controlador pueda observar el tráfico del bot del grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados bajo `.artifacts/qa-e2e/...`.

Los carriles de transporte en vivo comparten un contrato estándar para que los nuevos transportes no se desvíen:

`qa-channel` sigue siendo la suite de QA sintética amplia y no es parte de la matriz de cobertura de transporte en vivo.

| Carril   | Canary | Bloqueo de mención | Bloqueo de lista blanca | Respuesta de nivel superior | Reanudación de reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda |
| -------- | ------ | ------------------ | ----------------------- | --------------------------- | ----------------------- | ------------------- | ------------------- | ----------------------- | ---------------- |
| Matrix   | x      | x                  | x                       | x                           | x                       | x                   | x                   | x                       |                  |
| Telegram | x      |                    |                         |                             |                         |                     |                     |                         | x                |

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como “realismo creciente” (y mayor inestabilidad/costo):

### Unidad / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: diez ejecuciones de fragmentos secuenciales (`vitest.full-*.config.ts`) sobre los proyectos Vitest existentes con alcance
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, y las pruebas de nodo en lista blanca `ui` cubiertas por `vitest.unit.config.ts`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (gateway auth, routing, tooling, parsing, config)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápido y estable
- Nota de proyectos:
  - `pnpm test` no dirigido ahora ejecuta once configuraciones de shard más pequeñas (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso gigante de proyecto raíz nativo. Esto reduce el pico de RSS en máquinas cargadas y evita que el trabajo de auto-reply/extensión prive de recursos a suites no relacionadas.
  - `pnpm test --watch` todavía utiliza el gráfico de proyecto raíz `vitest.config.ts` nativo, porque un bucle de vigilancia multi-shard no es práctico.
  - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` enrutan objetivos explícitos de archivo/directorio a través de carriles con ámbito primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar la tasa de inicio completa del proyecto raíz.
  - `pnpm test:changed` expande las rutas de git cambiadas a los mismos carriles con ámbito cuando el diff solo toca archivos de fuente/prueba enrutables; las ediciones de configuración/configuración todavía vuelven a la reejecución amplia del proyecto raíz.
  - Las pruebas unitarias ligeras en importaciones de agentes, comandos, complementos, ayudantes de auto-reply, `plugin-sdk` y áreas de utilidad pura similares se enrutan a través del carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con mucho estado/runtime se mantienen en los carriles existentes.
  - Los archivos fuente auxiliares `plugin-sdk` y `commands` seleccionados también asignan las ejecuciones en modo modificado a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones auxiliares evitan volver a ejecutar el conjunto pesado completo para ese directorio.
  - `auto-reply` ahora tiene tres cubos dedicados: auxiliares principales de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. Esto mantiene el trabajo de arnés de respuesta más pesado fuera de las pruebas baratas de estado/chunk/token.
- Nota sobre el ejecutor integrado:
  - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de ejecución de compactación,
    mantenga ambos niveles de cobertura.
  - Agregue regresiones auxiliares enfocadas para los límites de enrutamiento/normalización puros.
  - Mantenga también sanos los conjuntos de integración del ejecutor integrado:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Esos conjuntos verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
    a través de las rutas `run.ts` / `compact.ts` reales; las pruebas solo auxiliares no son un
    sustituto suficiente para esas rutas de integración.
- Nota sobre el grupo:
  - La configuración base de Vitest ahora por defecto es `threads`.
  - La configuración compartida de Vitest también corrige `isolate: false` y utiliza el ejecutor no aislado en los proyectos raíz, configuraciones e2e y live.
  - El carril de la IU raíz mantiene su configuración y optimizador `jsdom`, pero ahora también se ejecuta en el ejecutor compartido no aislado.
  - Cada fragmento `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false` de la configuración compartida de Vitest.
  - El iniciador `scripts/run-vitest.mjs` compartido ahora también agrega `--no-maglev` para los procesos secundarios de Node de Vitest de forma predeterminada para reducir la agitación de compilación de V8 durante las grandes ejecuciones locales. Establezca `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si necesita comparar con el comportamiento stock de V8.
- Nota de iteración rápida local:
  - `pnpm test:changed` se enruta a través de carriles con ámbito cuando las rutas cambiadas se asignan limpiamente a un conjunto más pequeño.
  - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento de enrutamiento, solo con un límite de trabajadores más alto.
  - El autoescalado del trabajador local es intencionalmente conservador ahora y también se reduce cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones simultáneas de Vitest causan menos daño de forma predeterminada.
  - La configuración base de Vitest marca los proyectos/archivos de configuración como `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia la conexión de pruebas.
  - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts compatibles; establezca `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea una ubicación de caché explícita para el perfilado directo.
- Nota de depuración de rendimiento:
  - `pnpm test:perf:imports` habilita el informe de duración de importación de Vitest más la salida de desglose de importación.
  - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a los archivos modificados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara `test:changed` enrutado con la ruta nativa del proyecto raíz para ese diff confirmado e imprime el tiempo transcurrido más el RSS máximo de macOS.
- `pnpm test:perf:changed:bench -- --worktree` evalúa el árbol sucio actual enrutarando la lista de archivos modificados a través de `scripts/test-projects.mjs` y la configuración raíz de Vitest.
  - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para el inicio y la sobrecarga de transformación de Vitest/Vite.
  - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montículo del ejecutor para la suite de unidades con el paralelismo de archivos deshabilitado.

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de extremo a extremo de puerta de enlace de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la tubería)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: OpenShell backend smoke

- Comando: `pnpm test:e2e:openshell`
- Archivo: `test/openshell-sandbox.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace OpenShell aislada en el host mediante Docker
  - Crea un entorno de prueba (sandbox) desde un Dockerfile local temporal
  - Ejercita el backend OpenShell de OpenClaw sobre `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local y un demonio Docker funcional
  - Utiliza `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la puerta de enlace de prueba y el sandbox
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o a un script contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Config: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - “¿Funciona este proveedor/modelo realmente _hoy_ con credenciales reales?”
  - Detectar cambios en el formato del proveedor, peculiaridades en la llamada de herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Se prefiere ejecutar subconjuntos reducidos en lugar de "todo"
- Las ejecuciones live ejecutan el source `~/.profile` para recuperar las claves de API faltantes.
- De manera predeterminada, las ejecuciones live aún aíslan `HOME` y copian el material de configuración/autenticación en un hogar de prueba temporal para que los fixtures unitarios no puedan mutar su `~/.openclaw` real.
- Establezca `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando necesite intencionalmente que las pruebas live usen su directorio home real.
- `pnpm test:live` ahora tiene como valor predeterminado un modo más silencioso: mantiene la salida de progreso `[live] ...`, pero suprime el aviso adicional `~/.profile` y silencia los registros de arranque de la puerta de enlace y el ruido de Bonjour. Establezca `OPENCLAW_LIVE_TEST_QUIET=0` si desea recuperar los registros de inicio completos.
- Rotación de claves API (específica del proveedor): establezca `*_API_KEYS` con formato de comas/puntos y comas o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por ejecución en vivo mediante `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites en vivo ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de la consola de Vitest está silenciosa.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/gateway se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos del gateway/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Editando lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Modificando la red del gateway / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depurando "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute una `pnpm test:live` reducida

## En vivo: barrido de capacidades del nodo Android

- Prueba: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Objetivo: invocar **todos los comandos actualmente anunciados** por un nodo Android conectado y afirmar el comportamiento del contrato del comando.
- Alcance:
  - Configuración previa/manual (la suite no instala/ejecuta/empareja la aplicación).
  - Validación `node.invoke` del gateway comando por comando para el nodo Android seleccionado.
- Configuración previa requerida:
  - Aplicación Android ya conectada + emparejada con el gateway.
  - Aplicación mantenida en primer plano.
  - Consentimiento de permisos/captura otorgado para las capacidades que espera que pasen.
- Anulaciones de objetivo opcionales:
  - `OPENCLAW_ANDROID_NODE_ID` o `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Detalles completos de configuración de Android: [Android App](/en/platforms/android)

## En vivo: prueba de humo del modelo (claves de perfil)

Las pruebas en vivo se dividen en dos capas para que podamos aislar los fallos:

- “Direct model” nos indica si el proveedor/modelo puede responder en absoluto con la clave dada.
- “Gateway smoke” nos indica si la tubería completa de gateway+agente funciona para ese modelo (sesiones, historial, herramientas, política de sandbox, etc.).

### Capa 1: Finalización directa del modelo (sin gateway)

- Prueba: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descubiertos
  - Usar `getApiKeyForModel` para seleccionar modelos para los que tenga credenciales
  - Ejecutar una pequeña finalización por modelo (y regresiones específicas donde sea necesario)
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Establecer `OPENCLAW_LIVE_MODELS=modern` (o `all`, alias para modern) para ejecutar realmente esta suite; de lo contrario, se omite para mantener `pnpm test:live` centrado en el smoke del gateway
- Cómo seleccionar modelos:
  - `OPENCLAW_LIVE_MODELS=modern` para ejecutar la lista de permitidos moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` es un alias para la lista de permitidos moderna
  - o `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (lista de permitidos separada por comas)
  - Los barridos modernos/de todo por defecto tienen un límite curado de alta señal; establezca `OPENCLAW_LIVE_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite menor.
- Cómo seleccionar proveedores:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (lista de permitidos separada por comas)
- De dónde provienen las claves:
  - Por defecto: almacén de perfiles y alternativas de entorno (env)
  - Establecer `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar el uso **solo del almacén de perfiles**
- Por qué existe:
  - Separa “la API del proveedor está rota / la clave no es válida” de “la tubería del agente del gateway está rota”
  - Contiene regresiones pequeñas y aisladas (ejemplo: repetición del razonamiento de OpenAI Responses/Codex Responses + flujos de llamadas a herramientas)

### Capa 2: Smoke del gateway + agente de desarrollo (lo que realmente hace “@openclaw”)

- Prueba: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar un gateway en proceso
  - Crear/aplicar un parche a una sesión `agent:dev:*` (anulación de modelo por ejecución)
  - Iterar modelos con claves y afirmar:
    - respuesta “significativa” (sin herramientas)
    - una invocación de herramienta real funciona (sondeo de lectura)
    - sondeos adicionales opcionales de herramientas (sondeo de exec+lectura)
    - las rutas de regresión de OpenAI (solo llamada a herramienta → seguimiento) siguen funcionando
- Detalles del sondeo (para que pueda explicar los fallos rápidamente):
  - `read` sonda: la prueba escribe un archivo nonce en el espacio de trabajo y pide al agente que `read` y repita el nonce.
  - `exec+read` sonda: la prueba pide al agente que `exec` escriba un nonce en un archivo temporal y luego `read` de vuelta.
  - sonda de imagen: la prueba adjunta un PNG generado (gato + código aleatorio) y espera que el modelo devuelva `cat <CODE>`.
  - Referencia de implementación: `src/gateway/gateway-models.profiles.live.test.ts` y `src/gateway/live-image-probe.ts`.
- Cómo habilitar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
- Cómo seleccionar modelos:
  - Por defecto: lista blanca moderna (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` es un alias para la lista blanca moderna
  - O establezca `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (o lista separada por comas) para limitar
  - Los barridos modernos/de todo el gateway por defecto tienen un límite curado de alta señal; establezca `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` para un barrido moderno exhaustivo o un número positivo para un límite más pequeño.
- Cómo seleccionar proveedores (evitar "todo OpenRouter"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (lista blanca separada por comas)
- Las sondas de herramientas e imágenes siempre están activas en esta prueba en vivo:
  - `read` sonda + `exec+read` sonda (estrés de herramientas)
  - la sonda de imagen se ejecuta cuando el modelo anuncia soporte de entrada de imagen
  - Flujo (alto nivel):
    - La prueba genera un PNG diminuto con "CAT" + código aleatorio (`src/gateway/live-image-probe.ts`)
    - Lo envía a través de `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - El gateway analiza los archivos adjuntos en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - El agente integrado reenvía un mensaje de usuario multimodal al modelo
    - Aserción: la respuesta contiene `cat` + el código (tolerancia OCR: se permiten errores menores)

Consejo: para ver qué puede probar en su máquina (y los ids exactos de `provider/model`), ejecute:

```bash
openclaw models list
openclaw models list --json
```

## En vivo: prueba de humo del backend CLI (Claude, Codex, Gemini u otras CLI locales)

- Prueba: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar la canalización del Gateway + el agente utilizando un backend CLI local, sin tocar tu configuración predeterminada.
- Los valores predeterminados de prueba de humo específicos del backend residen con la definición `cli-backend.ts` de la extensión propietaria.
- Activar:
  - `pnpm test:live` (o `OPENCLAW_LIVE_TEST=1` si se invoca Vitest directamente)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valores predeterminados:
  - Proveedor/modelo predeterminado: `claude-cli/claude-sonnet-4-6`
  - El comportamiento de comando/argumentos/imagen proviene de los metadatos del complemento del backend CLI propietario.
- Anulaciones (opcionales):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar un archivo adjunto de imagen real (las rutas se inyectan en el prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para pasar las rutas de los archivos de imagen como argumentos CLI en lugar de inyección en el prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (o `"list"`) para controlar cómo se pasan los argumentos de imagen cuando se establece `IMAGE_ARG`.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar un segundo turno y validar el flujo de reanudación.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` para desactivar la prueba de continuidad predeterminada de Claude Sonnet -> Opus en la misma sesión (establézcalo en `1` para forzarla cuando el modelo seleccionado admite un objetivo de cambio).

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
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notas:

- El ejecutor de Docker se encuentra en `scripts/test-live-cli-backend-docker.sh`.
- Ejecuta la prueba de humo del backend CLI en vivo dentro de la imagen Docker del repositorio como el usuario no root `node`.
- Resuelve los metadatos de la prueba de humo CLI desde la extensión propietaria, luego instala el paquete CLI de Linux correspondiente (`@anthropic-ai/claude-code`, `@openai/codex` o `@google/gemini-cli`) en un prefijo escribible y en caché en `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (predeterminado: `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` requiere una suscripción portable a Claude Code OAuth a través de `~/.claude/.credentials.json` con `claudeAiOauth.subscriptionType` o `CLAUDE_CODE_OAUTH_TOKEN` de `claude setup-token`. Primero prueba `claude -p` directa en Docker, luego ejecuta dos turnos del backend de la CLI de Gateway sin preservar las variables de entorno de la API key de Anthropic. Este canal de suscripción deshabilita las sondas de MCP/herramientas e imágenes de Claude de forma predeterminada porque Claude actualmente enruta el uso de aplicaciones de terceros a través de la facturación de uso adicional en lugar de los límites normales del plan de suscripción.
- La prueba de humo del backend de la CLI en vivo ahora ejercita el mismo flujo de extremo a extremo para Claude, Codex y Gemini: turno de texto, turno de clasificación de imágenes y luego llamada a la herramienta MCP `cron` verificada a través de la CLI de Gateway.
- La prueba de humo predeterminada de Claude también parchea la sesión de Sonnet a Opus y verifica que la sesión reanudada todavía recuerde una nota anterior.

## En vivo: Prueba de humo de enlace ACP (`/acp spawn ... --bind here`)

- Prueba: `src/gateway/gateway-acp-bind.live.test.ts`
- Objetivo: validar el flujo real de enlace de conversación ACP con un agente ACP en vivo:
  - enviar `/acp spawn <agent> --bind here`
  - vincular una conversación sintética de canal de mensajes en su lugar
  - enviar un seguimiento normal en esa misma conversación
  - verificar que el seguimiento llegue a la transcripción de la sesión ACP vinculada
- Habilitar:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Predeterminados:
  - Agentes ACP en Docker: `claude,codex,gemini`
  - Agente ACP para `pnpm test:live ...` directa: `claude`
  - Canal sintético: contexto de conversación estilo MD de Slack
  - Backend de ACP: `acpx`
- Anulaciones:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notas:
  - Este canal utiliza la superficie `chat.send` del gateway con campos de ruta de origen sintéticos solo para administradores, para que las pruebas puedan adjuntar contexto de canal de mensajes sin fingir entregar externamente.
  - Cuando `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` no está definido, la prueba utiliza el registro de agentes integrado del complemento `acpx` para el agente de harness ACP seleccionado.

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
- De forma predeterminada, ejecuta la prueba de humo de vinculación de ACP contra todos los agentes CLI en vivo compatibles en secuencia: `claude`, `codex` y luego `gemini`.
- Use `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` o `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` para limitar la matriz.
- Obtiene `~/.profile`, prepara el material de autenticación CLI coincidente en el contenedor, instala `acpx` en un prefijo npm con permisos de escritura y luego instala el CLI en vivo solicitado (`@anthropic-ai/claude-code`, `@openai/codex` o `@google/gemini-cli`) si falta.
- Dentro de Docker, el ejecutor establece `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` para que acpx mantenga las variables de entorno del proveedor del perfil obtenido disponibles para el CLI del harness secundario.

## En vivo: Prueba de humo del harness de app-server de Codex

- Objetivo: validar el harness de Codex propiedad del complemento a través de la puerta de enlace normal
  método `agent`:
  - cargar el complemento `codex` incluido
  - seleccionar `OPENCLAW_AGENT_RUNTIME=codex`
  - enviar un primer turno de agente de puerta de enlace a `codex/gpt-5.4`
  - enviar un segundo turno a la misma sesión de OpenClaw y verificar que el hilo del
    app-server pueda reanudarse
  - ejecutar `/codex status` y `/codex models` a través de la misma ruta de comando de
    puerta de enlace
- Prueba: `src/gateway/gateway-codex-harness.live.test.ts`
- Habilitar: `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modelo predeterminado: `codex/gpt-5.4`
- Sonda de imagen opcional: `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonda de MCP/herramienta opcional: `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- La prueba de humo establece `OPENCLAW_AGENT_HARNESS_FALLBACK=none` para que un harness de Codex
  roto no pueda pasar volviendo silenciosamente a PI.
- Autenticación: `OPENAI_API_KEY` del shell/perfil, más `~/.codex/auth.json` y `~/.codex/config.toml` opcionales copiados

Receta local:

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Receta de Docker:

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Notas de Docker:

- El ejecutor de Docker se encuentra en `scripts/test-live-codex-harness-docker.sh`.
- Obtiene el `~/.profile` montado, pasa `OPENAI_API_KEY`, copia los archivos de autenticación de Codex CLI
  cuando están presentes, instala `@openai/codex` en un prefijo npm montado con permisos de escritura,
  prepara el árbol de fuentes y luego ejecuta solo la prueba en vivo del arnés de Codex.
- Docker habilita la imagen y las sondas de MCP/herramientas por defecto. Establezca
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` o
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` cuando necesite una ejecución de depuración más limitada.
- Docker también exporta `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, coincidiendo con la configuración de
  prueba en vivo para que `openai-codex/*` o el retorno de PI no puedan ocultar una regresión del arnés de Codex.

### Recetas en vivo recomendadas

Las listas de permitidos explícitas y limitadas son las más rápidas y las menos propensas a fallos:

- Modelo único, directo (sin puerta de enlace):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, prueba de humo de puerta de enlace:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Llamada a herramientas a través de varios proveedores:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Enfoque en Google (clave de API de Gemini + Antigravity):
  - Gemini (clave de API): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa la API de Gemini (clave de API).
- `google-antigravity/...` usa el puente OAuth de Antigravity (punto final del agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa la CLI local de Gemini en su máquina (autenticación separada + peculiaridades de herramientas).
- API de Gemini vs CLI de Gemini:
  - API: OpenClaw llama a la API alojada de Gemini de Google a través de HTTP (clave de API / autenticación de perfil); esto es lo que la mayoría de los usuarios entienden por "Gemini".
  - CLI: OpenClaw ejecuta un binario local `gemini`; tiene su propia autenticación y puede comportarse de manera diferente (transmisión/soporte de herramientas/desajuste de versión).

## En vivo: matriz de modelos (lo que cubrimos)

No hay una "lista de modelos de CI" fija (en vivo es optativo), pero estos son los modelos **recomendados** para cubrir regularmente en una máquina de desarrollo con claves.

### Conjunto moderno de pruebas de humo (llamada a herramientas + imagen)

Esta es la ejecución de "modelos comunes" que esperamos que siga funcionando:

- OpenAI (no Codex): `openai/gpt-5.4` (opcional: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google (API de Gemini): `google/gemini-3.1-pro-preview` y `google/gemini-3-flash-preview` (evitar los modelos Gemini 2.x antiguos)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` y `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Ejecuta la prueba de humo del gateway con herramientas + imagen:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Línea base: llamadas a herramientas (Read + Exec opcional)

Elige al menos uno por familia de proveedores:

- OpenAI: `openai/gpt-5.4` (o `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (o `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (o `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

Cobertura adicional opcional (conveniente tener):

- xAI: `xai/grok-4` (o el más reciente disponible)
- Mistral: `mistral/`… (elige un modelo con capacidad de "tools" que tengas habilitado)
- Cerebras: `cerebras/`… (si tienes acceso)
- LM Studio: `lmstudio/`… (local; las llamadas a herramientas dependen del modo API)

### Visión: envío de imagen (adjunto → mensaje multimodal)

Incluye al menos un modelo con capacidad de imagen en `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI con capacidad de visión, etc.) para ejercitar el sondeo de imágenes.

### Agregadores / gateways alternativos

Si tienes claves habilitadas, también admitimos pruebas a través de:

- OpenRouter: `openrouter/...` (cientos de modelos; usa `openclaw models scan` para encontrar candidatos con capacidad de herramienta+imagen)
- OpenCode: `opencode/...` para Zen y `opencode-go/...` para Go (autenticación vía `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Más proveedores que puedes incluir en la matriz en vivo (si tienes credenciales/configuración):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- A través de `models.providers` (endpoints personalizados): `minimax` (nube/API), más cualquier proxy compatible con OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Consejo: no intentes codificar «todos los modelos» en la documentación. La lista autorizada es lo que `discoverModels(...)` devuelva en tu máquina + las claves que estén disponibles.

## Credenciales (nunca las confirmes/commitees)

Las pruebas en vivo descubren las credenciales de la misma manera que lo hace la CLI. Implicaciones prácticas:

- Si la CLI funciona, las pruebas en vivo deberían encontrar las mismas claves.
- Si una prueba en vivo dice «no creds» (sin credenciales), depura de la misma manera en que depurarías `openclaw models list` / la selección de modelo.

- Perfiles de autenticación por agente: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (esto es lo que significa «profile keys» en las pruebas en vivo)
- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado heredado: `~/.openclaw/credentials/` (se copia en el inicio de la prueba en vivo preparado cuando está presente, pero no es el almacén principal de claves de perfil)
- Las ejecuciones locales en vivo copian la configuración activa, los archivos `auth-profiles.json` por agente, el `credentials/` heredado y los directorios de autenticación externos de la CLI compatibles en un directorio de prueba temporal de forma predeterminada; los inicios en vivo preparados omiten `workspace/` y `sandboxes/`, y las anulaciones de ruta `agents.*.workspace` / `agentDir` se eliminan para que las sondas no afecten tu espacio de trabajo real del host.

Si deseas confiar en claves de entorno (por ejemplo, exportadas en tu `~/.profile`), ejecuta pruebas locales después de `source ~/.profile`, o usa los ejecutores de Docker a continuación (pueden montar `~/.profile` en el contenedor).

## Deepgram en vivo (transcripción de audio)

- Prueba: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Plan de codificación BytePlus en vivo

- Prueba: `src/agents/byteplus.live.test.ts`
- Activar: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Anulación de modelo opcional: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Flujo de trabajo de medios ComfyUI en vivo

- Prueba: `extensions/comfy/comfy.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Ámbito:
  - Ejercita las rutas de imagen, video y `music_generate` cómodas incluidas
  - Omite cada capacidad a menos que `models.providers.comfy.<capability>` esté configurado
  - Útil después de cambiar el envío, sondeo, descargas o registro de complementos del flujo de trabajo cómodo

## Generación de imágenes en vivo

- Prueba: `src/image-generation/runtime.live.test.ts`
- Comando: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Arnés: `pnpm test:live:media image`
- Ámbito:
  - Enumera cada complemento de proveedor de generación de imágenes registrado
  - Carga las variables de entorno del proveedor faltantes desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Utiliza claves API en vivo/entorno por delante de los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite proveedores sin autenticación/perfil/modelo utilizable
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

## Generación de música en vivo

- Prueba: `extensions/music-generation-providers.live.test.ts`
- Activar: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Arnés: `pnpm test:live:media music`
- Ámbito:
  - Ejercita la ruta del proveedor de generación de música compartida incluida
  - Actualmente cubre Google y MiniMax
  - Carga las variables de entorno del proveedor desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/entorno por delante de los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada solo de prompt
    - `edit` cuando el proveedor declara `capabilities.edit.enabled`
  - Cobertura actual de carril compartido:
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
- Alcance:
  - Ejercita la ruta compartida del proveedor de generación de video incluido
  - Carga las variables de entorno del proveedor desde su shell de inicio de sesión (`~/.profile`) antes de sondear
  - Usa claves de API en vivo/entorno por delante de los perfiles de autenticación almacenados de forma predeterminada, por lo que las claves de prueba obsoletas en `auth-profiles.json` no enmascaran las credenciales reales del shell
  - Omite los proveedores sin autenticación/perfil/modelo utilizable
  - Ejecuta ambos modos de tiempo de ejecución declarados cuando están disponibles:
    - `generate` con entrada solo de prompt
    - `imageToVideo` cuando el proveedor declara `capabilities.imageToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de imagen local respaldada por búfer en el barrido compartido
    - `videoToVideo` cuando el proveedor declara `capabilities.videoToVideo.enabled` y el proveedor/modelo seleccionado acepta entrada de video local respaldada por búfer en el barrido compartido
  - Proveedores `imageToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `vydra` porque `veo3` incluido es solo de texto y `kling` incluido requiere una URL de imagen remota
  - Cobertura específica del proveedor Vydra:
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ese archivo ejecuta `veo3` texto a video más un carril `kling` que usa una URL de imagen remota por defecto
  - Cobertura live actual de `videoToVideo`:
    - `runway` solo cuando el modelo seleccionado es `runway/gen4_aleph`
  - Proveedores `videoToVideo` declarados pero omitidos actualmente en el barrido compartido:
    - `alibaba`, `qwen`, `xai` porque esas rutas actualmente requieren URLs de referencia `http(s)` / MP4 remotas
    - `google` porque el carril compartido actual Gemini/Veo usa entrada con respaldo de búfer local y esa ruta no se acepta en el barrido compartido
    - `openai` porque el carril compartido actual carece de garantías de acceso específicas de la organización para inpaint/remix de video
- Reducción opcional:
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- Comportamiento de autenticación opcional:
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para forzar la autenticación del almacenamiento de perfiles e ignorar las anulaciones solo de entorno

## Arnés live de medios

- Comando: `pnpm test:live:media`
- Propósito:
  - Ejecuta las suites live compartidas de imagen, música y video a través de un punto de entrada nativo del repositorio
  - Carga automáticamente las variables de entorno del proveedor faltantes desde `~/.profile`
  - Reduce automáticamente cada suite a los proveedores que actualmente tienen autenticación utilizable por defecto
  - Reutiliza `scripts/test-live.mjs`, por lo que el comportamiento de latido y modo silencioso se mantiene constante
- Ejemplos:
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos live: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo live con clave de perfil coincidente dentro de la imagen Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando tu directorio de configuración local y espacio de trabajo (y sourceando `~/.profile` si está montado). Los puntos de entrada locales coincidentes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores live de Docker tienen un límite de smoke predeterminado más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` tiene por defecto `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene por defecto `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anule esas variables de entorno cuando
  desee explícitamente el análisis exhaustivo más grande.
- `test:docker:all` construye la imagen live de Docker una vez mediante `test:docker:live-build`, luego la reutiliza para los dos carriles live de Docker.
- Ejecutores de smoke de contenedor: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels`, y `test:docker:plugins` inician uno o más contenedores reales y verifican rutas de integración de alto nivel.

Los ejecutores de Docker de modelos live también montan mediante bind solo los directorios de autenticación de CLI necesarios (o todos los soportados cuando la ejecución no está limitada), luego los copian en el directorio principal del contenedor antes de la ejecución para que el OAuth de CLI externo pueda actualizar los tokens sin modificar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- ACP bind smoke: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Gateway networking (dos contenedores, WS auth + health): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- MCP channel bridge (Gateway sembrado + puente stdio + smoke de marco de notificación raw de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Complementos (install smoke + `/plugin` alias + Claude-bundle restart semantics): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Los ejecutores de Docker de modelo en vivo también montan el checkout actual en modo de solo lectura
y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de
ejecución ligera mientras se ejecuta Vitest contra tu código fuente/configuración local exacta.
El paso de preparación omite las cachés locales grandes y las salidas de compilación de la aplicación tales como
`.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y `.build` local de la aplicación o
directorios de salida de Gradle para que las ejecuciones en vivo de Docker no pasen minutos copiando
artefactos específicos de la máquina.
También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la puerta de enlace no inicien
trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor.
`test:docker:live-models` aún ejecuta `pnpm test:live`, así que pasa también
`OPENCLAW_LIVE_GATEWAY_*` cuando necesites restringir o excluir la cobertura en vivo de la puerta de enlace
de ese carril de Docker.
`test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un
contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados,
inicia un contenedor Open WebUI anclado contra esa puerta de enlace, inicia sesión a través de
Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una
solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI.
La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar extraer la
imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de inicio en frío.
Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE`
(`~/.profile` por defecto) es la forma principal de proporcionarla en ejecuciones Dockerizadas.
Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model":
"openclaw/default", ... }`.
`test:docker:mcp-channels` es intencionalmente determinista y no necesita una
cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway con semilla,
inicia un segundo contenedor que genera `openclaw mcp serve`, y luego
verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos,
comportamiento de la cola de eventos en vivo, enrutamiento de envío saliente, y notificaciones de canal +
permisos estilo Claude a través del puente MCP stdio real. La verificación de notificaciones
inspecciona los marcos MCP stdio sin procesar directamente para que la prueba de humo valide lo que el
puente realmente emite, no solo lo que un SDK de cliente específico sucede exponer.

Prueba de humo de subproceso en lenguaje sencillo de ACP manual (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conserve este script para flujos de trabajo de regresión/depuración. Es posible que se necesite nuevamente para la validación del enrutamiento de subprocesos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como de solo lectura bajo `/host-auth...`, luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedores restringidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anule manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para restringir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen `openclaw:local-live` existente para reejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI anclada

## Cordialidad de los documentos

Ejecuta las comprobaciones de documentos después de editar los documentos: `pnpm check:docs`.
Ejecuta la validación completa de anclajes de Mintlify cuando también necesites comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente del gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad del agente":

- Llamada a herramientas simuladas a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (consulte [Skills](/en/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarla y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la persistencia del historial de sesión y los límites del entorno aislado.

Las evaluaciones futuras deben seguir siendo deterministas primero:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso frente a evitación, restricción, inyección de mensajes).
- Evaluaciones en vivo opcionales (opcional, limitadas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su
contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan un conjunto de
afirmaciones de forma y comportamiento. El carril unitario `pnpm test` predeterminado omite
intencionalmente estos archivos compartidos de seam y smoke; ejecute los comandos de contrato explícitamente
cuando toque superficies compartidas de canal o proveedor.

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

Cuando corrijas un problema de proveedor/modelo descubierto en vivo:

- Agrega una regresión segura para CI si es posible (proveedor simulado/stub, o captura la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de velocidad, políticas de autenticación), mantén la prueba en vivo estrecha y opcional mediante variables de entorno
- Preferir apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada segura para CI de la puerta de enlace
- Salvaguarda de recorrido SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo muestreado por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si añades una nueva familia de destinos `includeInPlan` SecretRef en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los IDs de destino no clasificados para que las nuevas clases no puedan omitirse silenciosamente.
