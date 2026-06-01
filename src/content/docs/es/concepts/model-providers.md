---
summary: "Resumen de proveedores de modelos con configuraciones de ejemplo y flujos de CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Proveedores de modelos"
sidebarTitle: "Proveedores de modelos"
---

Referencia de **proveedores de LLM/modelos** (no canales de chat como WhatsApp/Telegram). Para ver las reglas de selección de modelos, consulte [Modelos](/es/concepts/models).

## Reglas rápidas

<AccordionGroup>
  <Accordion title="Referencias de modelo y asistentes de CLI">
    - Las referencias de modelo usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
    - `agents.defaults.models` actúa como una lista de permitidos cuando se establece.
    - Asistentes de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` establecen los valores predeterminados a nivel de proveedor; `models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` los anulan por modelo.
    - Reglas de reserva, sondas de enfriamiento y persistencia de anulación de sesión: [Conmutación por error de modelo](/es/concepts/model-failover).

  </Accordion>
  <Accordion title="Añadir autenticación del proveedor no cambia su modelo principal">
    `openclaw configure` conserva un `agents.defaults.model.primary` existente cuando añade o reautentica un proveedor. `openclaw models auth login` hace lo mismo a menos que pase `--set-default`. Los complementos del proveedor aún pueden devolver un modelo predeterminado recomendado en su parche de configuración de autenticación, pero OpenClaw lo trata como "hacer disponible este modelo" cuando ya existe un modelo principal, no como "reemplazar el modelo principal actual".

    Para cambiar intencionalmente el modelo predeterminado, use `openclaw models set <provider/model>` o `openclaw models auth login --provider <id> --set-default`.

  </Accordion>
  <Accordion title="División de proveedor/ejecución de OpenAI">
    Las rutas de la familia OpenAI son específicas del prefijo:

    - `openai/<model>` utiliza el arnés nativo del servidor de aplicaciones Codex para los turnos del agente de forma predeterminada. Esta es la configuración habitual de suscripción ChatGPT/Codex.
    - `openai-codex/<model>` es una configuración heredada que el médico reescribe a `openai/<model>`.
    - `openai/<model>` más proveedor/modelo `agentRuntime.id: "openclaw"` utiliza el tiempo de ejecución integrado de OpenClaw para rutas de clave de API explícita o compatibilidad.

    Consulte [OpenAI](/es/providers/openai) y [Arnés de Codex](/es/plugins/codex-harness). Si la división de proveedor/ejecución es confusa, lea [Tiempos de ejecución del agente](/es/concepts/agent-runtimes) primero.

    La activación automática del complemento sigue el mismo límite: las referencias de agente `openai/*` activan el complemento Codex para la ruta predeterminada, y las referencias explícitas de proveedor/modelo `agentRuntime.id: "codex"` o las referencias heredadas `codex/<model>` también lo requieren.

    GPT-5.5 está disponible a través del arnés nativo del servidor de aplicaciones Codex de forma predeterminada en `openai/gpt-5.5`, y a través del tiempo de ejecución de OpenClaw cuando la política de tiempo de ejecución del proveedor/modelo selecciona explícitamente `openclaw`.

  </Accordion>
  <Accordion title="CLI runtimes">
    Los tiempos de ejecución de la CLI utilizan la misma división: elija referencias de modelos canónicas como `anthropic/claude-*` o `google/gemini-*`, luego establezca la política de tiempo de ejecución del proveedor/modelo en `claude-cli` o `google-gemini-cli` cuando desee un backend de CLI local.

    Las referencias heredadas `claude-cli/*` y `google-gemini-cli/*` migran de nuevo a las referencias de proveedor canónicas con el tiempo de ejecución registrado por separado. Las referencias heredadas `codex-cli/*` migran a `openai/*` y utilizan la ruta del servidor de aplicaciones de Codex; OpenClaw ya no mantiene un backend de CLI de Codex incluido.

  </Accordion>
</AccordionGroup>

## Comportamiento del proveedor propiedad del complemento

La mayor parte de la lógica específica del proveedor reside en los complementos del proveedor (`registerProvider(...)`), mientras que OpenClaw mantiene el bucle de inferencia genérico. Los complementos son responsables de la incorporación, catálogos de modelos, mapeo de variables de entorno de autenticación, normalización de transporte/configuración, limpieza de esquemas de herramientas, clasificación de conmutación por error, actualización de OAuth, informes de uso, perfiles de pensamiento/razonamiento y más.

La lista completa de enlaces (hooks) del SDK del proveedor y ejemplos de complementos incluidos se encuentra en [Provider plugins](/es/plugins/sdk-provider-plugins). Un proveedor que necesita un ejecutor de solicitudes totalmente personalizado es una superficie de extensión separada y más profunda.

<Note>El comportamiento del ejecutor propiedad del proveedor reside en enlaces explícitos del proveedor, como la política de repetición, la normalización del esquema de herramientas, el ajuste de secuencia y los asistentes de transporte/solicitud. El contenedor estático heredado `ProviderPlugin.capabilities` es solo para compatibilidad y ya no es leído por la lógica de ejecución compartida.</Note>

## Rotación de claves de API

<AccordionGroup>
  <Accordion title="Key sources and priority">
    Configure varias claves mediante:

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (anulación única en vivo, prioridad más alta)
    - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
    - `<PROVIDER>_API_KEY` (clave principal)
    - `<PROVIDER>_API_KEY_*` (lista numerada, p. ej., `<PROVIDER>_API_KEY_1`)

    Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como alternativa. El orden de selección de claves preserva la prioridad y elimina duplicados de los valores.

  </Accordion>
  <Accordion title="Cuándo se activa la rotación">
    - Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de velocidad (por ejemplo `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, o mensajes periódicos de límite de uso).
    - Los fallos que no son por límite de velocidad fallan inmediatamente; no se intenta la rotación de claves.
    - Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

  </Accordion>
</AccordionGroup>

## Complementos oficiales de proveedores

Los complementos oficiales de proveedores publican sus propias filas en el catálogo de modelos. Estos proveedores no requieren `models.providers` entradas de modelo; habilite el complemento del proveedor, configure la autenticación y elija un modelo. Use `models.providers` solo para proveedores personalizados explícitos o configuraciones de solicitud estrechas como tiempos de espera.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, más `OPENCLAW_LIVE_OPENAI_KEY` (anulación única)
- Modelos de ejemplo: `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Verifique la disponibilidad de la cuenta/modelo con `openclaw models list --provider openai` si una instalación específica o una clave API se comportan de manera diferente.
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto`; OpenClaw pasa la elección del transporte al tiempo de ejecución del modelo compartido.
- Anular por modelo mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, o `"auto"`)
- El procesamiento prioritario de OpenAI se puede habilitar mediante `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` y `params.fastMode` mapean las solicitudes directas de Responses de `openai/*` a `service_tier=priority` en `api.openai.com`
- Use `params.serviceTier` cuando desee un nivel explícito en lugar del interruptor compartido `/fast`
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`) se aplican solo en el tráfico nativo de OpenAI hacia `api.openai.com`, no en proxys genéricos compatibles con OpenAI
- Las rutas nativas de OpenAI también mantienen Responses `store`, sugerencias de caché de solicitudes y modelado de carga compatible con el razonamiento de OpenAI; las rutas de proxy no lo hacen
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque las solicitudes en vivo de la API de OpenAI la rechazan y el catálogo actual de Codex no la expone

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- Proveedor: `anthropic`
- Autenticación: `ANTHROPIC_API_KEY`
- Rotación opcional: `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, más `OPENCLAW_LIVE_ANTHROPIC_KEY` (sustitución única)
- Modelo de ejemplo: `anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice apiKey`
- Las solicitudes públicas directas a Anthropic admiten el botón compartido `/fast` y `params.fastMode`, incluido el tráfico autenticado con clave de API y OAuth enviado a `api.anthropic.com`; OpenClaw lo asigna a `service_tier` de Anthropic (`auto` vs `standard_only`)
- La configuración preferida de la CLI de Claude mantiene la referencia del modelo canónica y selecciona el
  backend de la CLI por separado: `anthropic/claude-opus-4-8` con
  `agentRuntime.id: "claude-cli"` con ámbito de modelo. Las referencias
  heredadas `claude-cli/claude-opus-4-7` todavía funcionan por compatibilidad.

<Note>
  El personal de Anthropic nos informó que el uso de la CLI de Claude al estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata el uso de la CLI de Claude y `claude -p` como sancionado para esta integración, a menos que Anthropic publique una nueva política. El token de configuración de Anthropic sigue disponible como una ruta de token compatible con OpenClaw, pero OpenClaw ahora
  prefiere el reuso de la CLI de Claude y `claude -p` cuando está disponible.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OAuth de OpenAI Codex

- Proveedor: `openai-codex`
- Autenticación: OAuth (ChatGPT)
- Referencia de modelo heredada de OpenAI Codex: `openai-codex/gpt-5.5`
- Referencia de arnés nativo del servidor de aplicaciones Codex: `openai/gpt-5.5`
- Documentación del arnés nativo del servidor de aplicaciones Codex: [Codex harness](/es/plugins/codex-harness)
- Referencias de modelos heredadas: `codex/gpt-*`
- Límite del complemento: `openai-codex/*` carga el complemento de OpenAI; el complemento nativo del servidor de aplicaciones de Codex solo se selecciona mediante el tiempo de ejecución del arnés de Codex o referencias heredadas `codex/*`.
- CLI: `openclaw onboard --auth-choice openai-codex` o `openclaw models auth login --provider openai-codex`
- El transporte predeterminado es `auto` (primero WebSocket, respaldo SSE)
- Anular por modelo de OpenAI Codex a través de `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- `params.serviceTier` también se reenvía en las solicitudes de Codex Responses nativas (`chatgpt.com/backend-api`)
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`) solo se adjuntan en el tráfico nativo de Codex hacia `chatgpt.com/backend-api`, no en los proxies compatibles con OpenAI genéricos
- Comparte el mismo interruptor `/fast` y configuración `params.fastMode` que `openai/*` directo; OpenClaw lo asigna a `service_tier=priority`
- `openai-codex/gpt-5.5` utiliza el catálogo de Codex nativo `contextWindow = 400000` y el tiempo de ejecución predeterminado `contextTokens = 272000`; anule el límite de tiempo de ejecución con `models.providers.openai-codex.models[].contextTokens`
- Nota de política: OpenAI Codex OAuth es explícitamente compatible con herramientas/flujos de trabajo externos como OpenClaw.
- Para la ruta común de suscripción más tiempo de ejecución nativo de Codex, inicie sesión con autenticación `openai-codex` pero configure `openai/gpt-5.5`; el agente de OpenAI selecciona Codex de forma predeterminada.
- Use el proveedor/modelo `agentRuntime.id: "openclaw"` solo cuando desee la ruta integrada de OpenClaw; de lo contrario, mantenga `openai/gpt-5.5` en el arnés predeterminado de Codex.
- Las referencias `openai-codex/gpt-*` siguen siendo una ruta heredada de OpenAI Codex. Prefiera `openai/gpt-5.5` en el tiempo de ejecución nativo de Codex para la nueva configuración de agente y ejecute `openclaw doctor --fix` cuando desee migrar las referencias `openai-codex/*` antiguas a referencias canónicas `openai/*`.

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
    },
  },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### Otras opciones alojadas de estilo de suscripción

<CardGroup cols={3}>
  <Card title="Z.AI (GLM)" href="/es/providers/zai">
    Plan de codificación Z.AI o puntos finales de API generales.
  </Card>
  <Card title="MiniMax" href="/es/providers/minimax">
    Plan de codificación MiniMax OAuth o acceso con clave de API.
  </Card>
  <Card title="Qwen Cloud" href="/es/providers/qwen">
    Superficie del proveedor Qwen Cloud además de Alibaba DashScope y la asignación de puntos finales del Plan de codificación.
  </Card>
</CardGroup>

### OpenCode

- Autenticación: `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`)
- Proveedor de tiempo de ejecución Zen: `opencode`
- Proveedor de tiempo de ejecución Go: `opencode-go`
- Modelos de ejemplo: `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice opencode-zen` o `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clave de API)

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY`
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GOOGLE_API_KEY` de reserva y `OPENCLAW_LIVE_GEMINI_KEY` (única anulación)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- Alias: se acepta `google/gemini-3.1-pro` y se normaliza al id de la API en vivo de Gemini de Google, `google/gemini-3.1-pro-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- Pensamiento: `/think adaptive` utiliza el pensamiento dinámico de Google. Gemini 3/3.1 omiten un `thinkingLevel` fijo; Gemini 2.5 envía `thinkingBudget: -1`.
- Las ejecuciones directas de Gemini también aceptan `agents.defaults.models["google/<model>"].params.cachedContent` (o el heredado `cached_content`) para reenviar un identificador `cachedContents/...` nativo del proveedor; los aciertos en la caché de Gemini aparecen como `cacheRead` de OpenClaw

### Google Vertex y CLI de Gemini

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa ADC de gcloud; la CLI de Gemini usa su flujo OAuth

<Warning>OAuth de la CLI de Gemini en OpenClaw es una integración no oficial. Algunos usuarios han informado restricciones en la cuenta de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.</Warning>

Gemini CLI OAuth se incluye como parte del complemento incluido `google`.

<Steps>
  <Step title="Instalar CLI de Gemini">
    <Tabs>
      <Tab title="brew">
        ```bash
        brew install gemini-cli
        ```
      </Tab>
      <Tab title="npm">
        ```bash
        npm install -g @google/gemini-cli
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="Enable plugin">
    ```bash
    openclaw plugins enable google
    ```
  </Step>
  <Step title="Iniciar sesión">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`. **No** debe pegar un id de cliente ni un secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena tokens en perfiles de autenticación en el host de la puerta de enlace.

  </Step>
  <Step title="Establecer proyecto (si es necesario)">
    Si las solicitudes fallan después del inicio de sesión, establezca `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace.
  </Step>
</Steps>

Las respuestas JSON de Gemini CLI se analizan desde `response`; el uso recurre a `stats`, con `stats.cached` normalizado en `cacheRead` de OpenClaw.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5.1`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Las referencias de modelos usan el ID del proveedor `zai/*` canónico.
  - `zai-api-key` detecta automáticamente el punto final de Z.AI coincidente; `zai-coding-global`, `zai-coding-cn`, `zai-global` y `zai-cn` fuerzan una superficie específica

### Vercel AI Gateway

- Proveedor: `vercel-ai-gateway`
- Autenticación: `AI_GATEWAY_API_KEY`
- Modelos de ejemplo: `vercel-ai-gateway/anthropic/claude-opus-4.6`, `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Proveedor: `kilocode`
- Autenticación: `KILOCODE_API_KEY`
- Modelo de ejemplo: `kilocode/kilo/auto`
- CLI: `openclaw onboard --auth-choice kilocode-api-key`
- URL base: `https://api.kilo.ai/api/gateway/`
- El catálogo de respaldo estático incluye `kilocode/kilo/auto`; el descubrimiento `https://api.kilo.ai/api/gateway/models` en vivo puede expandir aún más el catálogo en tiempo de ejecución.
- El enrutamiento ascendente exacto detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway, no está codificado en OpenClaw.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedores incluidos

| Proveedor               | Id                               | Entorno de autenticación                                     | Modelo de ejemplo                                  |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| BytePlus                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`                    |
| Cerebras                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                             |
| Cloudflare AI Gateway   | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | -                                                  |
| DeepInfra               | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V4-Flash`          |
| DeepSeek                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                       |
| GitHub Copilot          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | -                                                  |
| Groq                    | `groq`                           | `GROQ_API_KEY`                                               | -                                                  |
| Hugging Face Inference  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`                         | `huggingface/deepseek-ai/DeepSeek-R1`              |
| Kilo Gateway            | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                               |
| Kimi Coding             | `kimi`                           | `KIMI_API_KEY` o `KIMICODE_API_KEY`                          | `kimi/kimi-for-coding`                             |
| MiniMax                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                             |
| Mistral                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                     |
| Moonshot                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                               |
| NVIDIA                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`         |
| OpenRouter              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                                  |
| Qianfan                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                            |
| Qwen Cloud              | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                                |
| StepFun                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                           |
| Together                | `together`                       | `TOGETHER_API_KEY`                                           | `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Venice                  | `venice`                         | `VENICE_API_KEY`                                             | -                                                  |
| Vercel AI Gateway       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6`      |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`                  |
| xAI                     | `xai`                            | SuperGrok/X Premium OAuth o `XAI_API_KEY`                    | `xai/grok-4.3`                                     |
| Xiaomi                  | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                             |

#### Curiosidades worth knowing

<AccordionGroup>
  <Accordion title="OpenRouter">
    Aplica sus encabezados de atribución de la aplicación y los marcadores `cache_control` de Anthropic solo en las rutas `openrouter.ai` verificadas. Las referencias de DeepSeek, Moonshot y ZAI son elegibles para el TTL de caché para el almacenamiento en caché de prompts administrado por OpenRouter, pero no reciben marcadores de caché de Anthropic. Como una ruta compatible con OpenAI de estilo proxy, omite el modelado nativo-solo-OpenAI (`serviceTier`, Responses `store`, sugerencias de caché de prompts, compatibilidad de razonamiento de OpenAI). Las referencias con soporte de Gemini mantienen solo la sanitización de la firma de pensamiento del proxy-Gemini.
  </Accordion>
  <Accordion title="Kilo Gateway">
    Las referencias con soporte de Gemini siguen la misma ruta de sanitización del proxy-Gemini; `kilocode/kilo/auto` y otras referencias no compatibles con el razonamiento del proxy omiten la inyección de razonamiento del proxy.
  </Accordion>
  <Accordion title="MiniMax">
    La incorporación de clave de API escribe definiciones explícitas de modelos de chat M2.7 solo de texto; la comprensión de imágenes se mantiene en el proveedor de medios `MiniMax-VL-01` propiedad del complemento.
  </Accordion>
  <Accordion title="NVIDIA">
    Los identificadores de modelo utilizan un espacio de nombres `nvidia/<vendor>/<model>` (por ejemplo `nvidia/nvidia/nemotron-...` junto con `nvidia/moonshotai/kimi-k2.5`); los selectores preservan la composición literal `<provider>/<model-id>` mientras que la clave canónica enviada a la API permanece con un solo prefijo.
  </Accordion>
  <Accordion title="xAI">
    Usa la ruta de Respuestas de xAI. La ruta recomendada es SuperGrok/X Premium OAuth; las claves API aún funcionan a través de `XAI_API_KEY` o la configuración del complemento, y Grok `web_search` reutiliza el mismo perfil de autenticación antes de recurrir a la clave API. `grok-4.3` es el modelo de chat predeterminado incluido, y `grok-build-0.1` es seleccionable para trabajo de construcción/código. `/fast` o `params.fastMode: true` reescribe `grok-3`, `grok-3-mini`, `grok-4` y `grok-4-0709` a sus variantes `*-fast`. `tool_stream` está activado de forma predeterminada; desactívelo a través de `agents.defaults.models["xai/<model>"].params.tool_stream=false`.
  </Accordion>
  <Accordion title="Cerebras">
    Se incluye como el complemento de proveedor `cerebras` incluido. GLM usa `zai-glm-4.7`; la URL base compatible con OpenAI es `https://api.cerebras.ai/v1`.
  </Accordion>
</AccordionGroup>

## Proveedores a través de `models.providers` (URL personalizada/base)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o proxies compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedores incluidos a continuación ya publican un catálogo predeterminado. Use entradas explícitas de `models.providers.<id>` solo cuando desee anular la URL base, los encabezados o la lista de modelos predeterminados.

Las comprobaciones de capacidad del modelo de Gateway también leen metadatos explícitos de `models.providers.<id>.models[]`. Si un modelo personalizado o proxy acepta imágenes, establezca `input: ["text", "image"]` en ese modelo para que las rutas de adjuntos de WebChat y de origen de nodo pasen las imágenes como entradas nativas del modelo en lugar de referencias de medios solo de texto.

`agents.defaults.models["provider/model"]` solo controla la visibilidad del modelo, los alias y los metadatos por modelo para los agentes. No registra un nuevo modelo de tiempo de ejecución por sí solo. Para modelos de proveedores personalizados, también agregue `models.providers.<provider>.models[]` con al menos `id` coincidente.

### Moonshot AI (Kimi)

Moonshot se distribuye como un complemento de proveedor empaquetado. Utilice el proveedor integrado de manera predeterminada y agregue una entrada `models.providers.moonshot` explícita solo cuando necesite anular la URL base o los metadatos del modelo:

- Proveedor: `moonshot`
- Autenticación: `MOONSHOT_API_KEY`
- Modelo de ejemplo: `moonshot/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice moonshot-api-key` o `openclaw onboard --auth-choice moonshot-api-key-cn`

IDs de modelos Kimi K2:

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi coding

Kimi Coding utiliza el punto de conexión compatible con Anthropic de Moonshot AI:

- Proveedor: `kimi`
- Autenticación: `KIMI_API_KEY`
- Modelo de ejemplo: `kimi/kimi-for-coding`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

Los heredados `kimi/kimi-code` y `kimi/k2p5` siguen siendo aceptados como identificadores de modelos de compatibilidad y se normalizan al identificador de modelo de API estable de Kimi.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) proporciona acceso a Doubao y otros modelos en China.

- Proveedor: `volcengine` (codificación: `volcengine-plan`)
- Autenticación: `VOLCANO_ENGINE_API_KEY`
- Modelo de ejemplo: `volcengine-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

La incorporación se predetermina a la superficie de codificación, pero el catálogo general `volcengine/*` se registra al mismo tiempo.

En los selectores de incorporación/configuración de modelos, la elección de autenticación de Volcengine prefiere tanto las filas `volcengine/*` como `volcengine-plan/*`. Si esos modelos aún no están cargados, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector vacío con ámbito de proveedor.

<Tabs>
  <Tab title="Modelos estándar">
    - `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127` (Kimi K2.5)
    - `volcengine/glm-4-7-251222` (GLM 4.7)
    - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

  </Tab>
  <Tab title="Modelos de codificación (volcengine-plan)">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`

  </Tab>
</Tabs>

### BytePlus (Internacional)

BytePlus ARK proporciona acceso a los mismos modelos que Volcano Engine para usuarios internacionales.

- Proveedor: `byteplus` (codificación: `byteplus-plan`)
- Auth: `BYTEPLUS_API_KEY`
- Modelo de ejemplo: `byteplus-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

La incorporación predeterminada es la superficie de codificación, pero el catálogo general `byteplus/*` se registra al mismo tiempo.

En los selectores de modelo de incorporación/configuración, la opción de autenticación de BytePlus prefiere las filas `byteplus/*` y `byteplus-plan/*`. Si esos modelos aún no están cargados, OpenClaw vuelve al catálogo sin filtrar en lugar de mostrar un selector vacío con alcance de proveedor.

<Tabs>
  <Tab title="Modelos estándar">
    - `byteplus/seed-1-8-251228` (Seed 1.8)
    - `byteplus/kimi-k2-5-260127` (Kimi K2.5)
    - `byteplus/glm-4-7-251222` (GLM 4.7)

  </Tab>
  <Tab title="Modelos de codificación (byteplus-plan)">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`

  </Tab>
</Tabs>

### Synthetic

Synthetic proporciona modelos compatibles con Anthropic detrás del proveedor `synthetic`:

- Proveedor: `synthetic`
- Auth: `SYNTHETIC_API_KEY`
- Modelo de ejemplo: `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI: `openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax se configura a través de `models.providers` porque utiliza puntos de conexión personalizados:

- MiniMax OAuth (Global): `--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN): `--auth-choice minimax-cn-oauth`
- MiniMax API key (Global): `--auth-choice minimax-global-api`
- MiniMax API key (CN): `--auth-choice minimax-cn-api`
- Auth: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` para `minimax-portal`

Consulte [/providers/minimax](/es/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

<Note>En la ruta de transmisión compatible con Anthropic de MiniMax, OpenClaw deshabilita el pensamiento de forma predeterminada a menos que lo configure explícitamente, y `/fast on` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.</Note>

División de capacidades propiedad del complemento:

- Los valores predeterminados de texto/chat se mantienen en `minimax/MiniMax-M2.7`
- La generación de imágenes es `minimax/image-01` o `minimax-portal/image-01`
- La comprensión de imágenes es `MiniMax-VL-01` propiedad del complemento en ambas rutas de autenticación de MiniMax
- La búsqueda web se mantiene en el id del proveedor `minimax`

### LM Studio

LM Studio se incluye como un complemento de proveedor agrupado que utiliza la API nativa:

- Proveedor: `lmstudio`
- Autenticación: `LM_API_TOKEN`
- URL base de inferencia predeterminada: `http://localhost:1234/v1`

Luego configure un modelo (reemplácelo con uno de los IDs devueltos por `http://localhost:1234/api/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utiliza las `/api/v1/models` y `/api/v1/models/load` nativas de LM Studio para el descubrimiento y la carga automática, con `/v1/chat/completions` para la inferencia de forma predeterminada. Si desea que la carga JIT, el TTL y la expulsión automática de LM Studio sean propietarios del ciclo de vida del modelo, configure `models.providers.lmstudio.params.preload: false`. Consulte [/providers/lmstudio](/es/providers/lmstudio) para la configuración y solución de problemas.

### Ollama

Ollama se incluye como un complemento de proveedor agrupado y utiliza la API nativa de Ollama:

- Proveedor: `ollama`
- Autenticación: No se requiere (servidor local)
- Modelo de ejemplo: `ollama/llama3.3`
- Instalación: [https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando se activa con `OLLAMA_API_KEY`, y el complemento del proveedor incluido añade Ollama directamente a `openclaw onboard` y al selector de modelos. Consulte [/providers/ollama](/es/providers/ollama) para la incorporación, el modo en la nube/local y la configuración personalizada.

### vLLM

vLLM se incluye como un complemento de proveedor agrupado para servidores compatibles con OpenAI locales/autoalojados:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para activar el autodescubrimiento local (cualquier valor funciona si su servidor no impone autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

Luego configure un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consulte [/providers/vllm](/es/providers/vllm) para obtener más detalles.

### SGLang

SGLang se distribuye como un complemento de proveedor incluido para servidores compatibles con OpenAI autoalojados rápidos:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para optar por el autodescubrimiento local (cualquier valor funciona si su servidor no exige autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

Luego configure un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consulte [/providers/sglang](/es/providers/sglang) para obtener más detalles.

### Proxies locales (LM Studio, vLLM, LiteLLM, etc.)

Ejemplo (compatible con OpenAI):

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Campos opcionales predeterminados">
    Para proveedores personalizados, `reasoning`, `input`, `cost`, `contextWindow` y `maxTokens` son opcionales. Cuando se omiten, OpenClaw usa por defecto:

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    Recomendado: establezca valores explícitos que coincidan con los límites de su proxy/modelo.

  </Accordion>
  <Accordion title="Reglas de conformación de rutas de proxy">
    - Para `api: "openai-completions"` en puntos de conexión no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
    - Las rutas compatibles con OpenAI de estilo proxy también omiten la conformación de solicitudes nativa exclusiva de OpenAI: sin `service_tier`, sin Responses `store`, sin Completions `store`, sin sugerencias de caché de avisos, sin conformación de carga útil de compatibilidad de razonamiento de OpenAI y sin encabezados de atribución ocultos de OpenClaw.
    - Para proxies de Completions compatibles con OpenAI que necesitan campos específicos del proveedor, configure `agents.defaults.models["provider/model"].params.extra_body` (o `extraBody`) para fusionar JSON adicional en el cuerpo de la solicitud saliente.
    - Para los controles de plantilla de chat de vLLM, configure `agents.defaults.models["provider/model"].params.chat_template_kwargs`. El complemento vLLM incluido envía automáticamente `enable_thinking: false` y `force_nonempty_content: true` para `vllm/nemotron-3-*` cuando el nivel de pensamiento de la sesión está desactivado.
    - Para modelos locales lentos o hosts remotos de LAN/tailnet, configure `models.providers.<id>.timeoutSeconds`. Esto extiende el manejo de solicitudes HTTP del modelo del proveedor, incluida la conexión, los encabezados, la transmisión del cuerpo y la cancelación total de la búsqueda protegida, sin aumentar el tiempo de espera de ejecución del agente completo. Si `agents.defaults.timeoutSeconds` o un tiempo de espera específico de la ejecución es menor, también aumente ese límite; los tiempos de espera del proveedor no pueden extender toda la ejecución.
    - Las llamadas HTTP del proveedor de modelos permiten respuestas DNS de IP falsas de Surge, Clash y sing-box en `198.18.0.0/15` y `fc00::/7` solo para el nombre de host `baseUrl` del proveedor configurado. Los puntos de conexión del proveedor personalizados locales también confían en ese origen `scheme://host:port` configurado exacto para solicitudes de modelo protegidas, incluidos los hosts de loopback, LAN y tailnet. Esta no es una nueva opción de configuración; el `baseUrl` que configure extiende la política de solicitud solo para ese origen. La permisión del nombre de host de IP falsa y la confianza en el origen exacto son mecanismos independientes. Otros destinos privados, de loopback, de enlace local, de metadatos y puertos diferentes aún requieren una aceptación explícita `models.providers.<id>.request.allowPrivateNetwork: true`. Configure `models.providers.<id>.request.allowPrivateNetwork: false` para no participar en la confianza del origen exacto.
    - Si `baseUrl` está vacío/omitido, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve en `api.openai.com`).
    - Por seguridad, un `compat.supportsDeveloperRole: true` explícito todavía se anula en los puntos de conexión `openai-completions` no nativos.
    - Para `api: "anthropic-messages"` en puntos de conexión no directos (cualquier proveedor que no sea el `anthropic` canónico, o un `models.providers.anthropic.baseUrl` personalizado cuyo host no sea un punto de conexión `api.anthropic.com` público), OpenClaw suprime los encabezados beta implícitos de Anthropic, como `claude-code-20250219`, `interleaved-thinking-2025-05-14` y los marcadores de OAuth, para que los proxies compatibles con Anthropic personalizados no rechacen las marcas beta no compatibles. Configure `models.providers.<id>.headers["anthropic-beta"]` explícitamente si su proxy necesita características beta específicas.

  </Accordion>
</AccordionGroup>

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Consulte también: [Configuración](/es/gateway/configuration) para obtener ejemplos completos de configuración.

## Relacionado

- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) - claves de configuración del modelo
- [Conmutación por error del modelo](/es/concepts/model-failover) - cadenas de reserva y comportamiento de reintentos
- [Modelos](/es/concepts/models) - configuración y alias de modelos
- [Proveedores](/es/providers) - guías de configuración por proveedor
