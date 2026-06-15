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
  <Accordion title="Referencias de modelos y asistentes de CLI">
    - Las referencias de modelos usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
    - `agents.defaults.models` actúa como una lista de permitidos cuando se configura.
    - Asistentes de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` establecen valores predeterminados a nivel de proveedor; `models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` los anulan por modelo.
    - Reglas de respaldo, sondas de enfriamiento y persistencia de anulación de sesión: [Conmutación por error de modelos](/es/concepts/model-failover).

  </Accordion>
  <Accordion title="Añadir autenticación del proveedor no cambia su modelo principal">
    `openclaw configure` conserva un `agents.defaults.model.primary` existente cuando añade o reautentica un proveedor. `openclaw models auth login` hace lo mismo a menos que pase `--set-default`. Los complementos del proveedor aún pueden devolver un modelo predeterminado recomendado en su parche de configuración de autenticación, pero OpenClaw lo trata como "hacer disponible este modelo" cuando ya existe un modelo principal, no como "reemplazar el modelo principal actual".

    Para cambiar intencionalmente el modelo predeterminado, use `openclaw models set <provider/model>` o `openclaw models auth login --provider <id> --set-default`.

  </Accordion>
  <Accordion title="División de proveedor/tiempo de ejecución de OpenAI">
    Las rutas de la familia OpenAI son específicas del prefijo:

    - `openai/<model>` usa el arnés nativo del servidor de aplicaciones Codex para los turnos del agente de forma predeterminada. Esta es la configuración habitual de suscripción de ChatGPT/Codex.
    - Las referencias de modelos de Codex heredadas son configuraciones heredadas que el doctor reescribe como `openai/<model>`.
    - `openai/<model>` más proveedor/modelo `agentRuntime.id: "openclaw"` usa el tiempo de ejecución integrado de OpenClaw para rutas explícitas de clave de API o compatibilidad.

    Consulte [OpenAI](/es/providers/openai) y [Arnés de Codex](/es/plugins/codex-harness). Si la división de proveedor/tiempo de ejecución es confusa, lea [Tiempos de ejecución de agentes](/es/concepts/agent-runtimes) primero.

    La habilitación automática de complementos sigue el mismo límite: las referencias de agente `openai/*` habilitan el complemento Codex para la ruta predeterminada, y las referencias explícitas de proveedor/modelo `agentRuntime.id: "codex"` o heredadas `codex/<model>` también lo requieren.

    GPT-5.5 está disponible a través del arnés nativo del servidor de aplicaciones Codex de forma predeterminada en `openai/gpt-5.5`, y a través del tiempo de ejecución de OpenClaw cuando la política de tiempo de ejecución del proveedor/modelo selecciona explícitamente `openclaw`.

  </Accordion>
  <Accordion title="Runtimes de CLI">
    Los runtimes de CLI usan la misma división: elija referencias de modelo canónicas como `anthropic/claude-*` o `google/gemini-*`, luego establezca la política de runtime del proveedor/modelo en `claude-cli` o `google-gemini-cli` cuando desee un backend de CLI local.

    Las referencias heredadas `claude-cli/*` y `google-gemini-cli/*` migran de vuelta a las referencias de proveedor canónicas con el runtime registrado por separado. Las referencias heredadas `codex-cli/*` migran a `openai/*` y usan la ruta del servidor de aplicaciones de Codex; OpenClaw ya no mantiene un backend de CLI de Codex incluido.

  </Accordion>
</AccordionGroup>

## Comportamiento del proveedor propiedad del complemento

La mayor parte de la lógica específica del proveedor reside en los complementos del proveedor (`registerProvider(...)`) mientras que OpenClaw mantiene el bucle de inferencia genérico. Los complementos son propietarios de la incorporación, los catálogos de modelos, el mapeo de variables de entorno de autenticación, la normalización de transporte/configuración, la limpieza del esquema de herramientas, la clasificación de conmutación por error, la actualización de OAuth, los informes de uso, los perfiles de pensamiento/razonamiento y más.

La lista completa de enlaces del SDK del proveedor y ejemplos de complementos incluidos reside en [Complementos del proveedor](/es/plugins/sdk-provider-plugins). Un proveedor que necesita un ejecutor de solicitudes totalmente personalizado es una superficie de extensión separada y más profunda.

<Note>El comportamiento del ejecutor propiedad del proveedor reside en enlaces explícitos del proveedor, como la política de reproducción, la normalización del esquema de herramientas, el ajuste de transmisión y los ayudantes de transporte/solicitud. El paquete estático heredado `ProviderPlugin.capabilities` es solo para compatibilidad y ya no es leído por la lógica del ejecutor compartido.</Note>

## Rotación de claves de API

<AccordionGroup>
  <Accordion title="Fuentes y prioridad de claves">
    Configure varias claves mediante:

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (anulación única en vivo, prioridad más alta)
    - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
    - `<PROVIDER>_API_KEY` (clave principal)
    - `<PROVIDER>_API_KEY_*` (lista numerada, ej. `<PROVIDER>_API_KEY_1`)

    Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como alternativa. El orden de selección de claves preserva la prioridad y elimina los duplicados de los valores.

  </Accordion>
  <Accordion title="Cuándo se activa la rotación">
    - Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de velocidad (por ejemplo `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, o mensajes periódicos de límite de uso).
    - Los fallos que no son por límite de velocidad fallan inmediatamente; no se intenta la rotación de claves.
    - Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

  </Accordion>
</AccordionGroup>

## Complementos oficiales de proveedores

Los complementos de proveedores oficiales publican sus propias filas en el catálogo de modelos. Estos proveedores no requieren entradas de modelo `models.providers`; habilite el complemento del proveedor, configure la autenticación y elija un modelo. Use `models.providers` solo para proveedores personalizados explícitos o configuraciones de solicitud específicas como tiempos de espera.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, más `OPENCLAW_LIVE_OPENAI_KEY` (anulación única)
- Modelos de ejemplo: `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Verifique la disponibilidad de la cuenta/modelo con `openclaw models list --provider openai` si una instalación o clave de API específica se comporta de manera diferente.
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto`; OpenClaw pasa la elección de transporte al tiempo de ejecución del modelo compartido.
- Anular por modelo a través de `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, o `"auto"`)
- El procesamiento prioritario de OpenAI se puede habilitar a través de `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` y `params.fastMode` asignan las solicitudes directas de Respuestas de `openai/*` a `service_tier=priority` en `api.openai.com`
- Use `params.serviceTier` cuando desee un nivel explícito en lugar del interruptor compartido `/fast`
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`) se aplican solo en el tráfico nativo de OpenAI hacia `api.openai.com`, no en proxies compatibles con OpenAI genéricos
- Las rutas nativas de OpenAI también mantienen las `store` de Responses, sugerencias de caché de indicaciones y el modelado de carga útil compatible con el razonamiento de OpenAI; las rutas de proxy no lo hacen
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque las solicitudes en vivo de la API de OpenAI la rechazan y el catálogo actual de Codex no la expone

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- Proveedor: `anthropic`
- Autenticación: `ANTHROPIC_API_KEY`
- Rotación opcional: `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, más `OPENCLAW_LIVE_ANTHROPIC_KEY` (anulación única)
- Modelo de ejemplo: `anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice apiKey`
- Las solicitudes públicas directas de Anthropic admiten el interruptor compartido `/fast` y `params.fastMode`, incluido el tráfico autenticado con clave de API y OAuth enviado a `api.anthropic.com`; OpenClaw lo asigna a `service_tier` de Anthropic (`auto` vs `standard_only`)
- La configuración preferida de la CLI de Claude mantiene la referencia del modelo canónica y selecciona el
  backend de la CLI por separado: `anthropic/claude-opus-4-8` con
  `agentRuntime.id: "claude-cli"` con alcance de modelo. Las referencias
  `claude-cli/claude-opus-4-7` heredadas todavía funcionan por compatibilidad.

<Note>
  El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata el reuso de la CLI de Claude y el uso de `claude -p` como sancionados para esta integración a menos que Anthropic publique una nueva política. El token de configuración de Anthropic sigue estando disponible como una ruta de token compatible con OpenClaw, pero
  ahora OpenClaw prefiere el reuso de la CLI de Claude y `claude -p` cuando está disponible.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OAuth de OpenAI ChatGPT/Codex

- Proveedor: `openai`
- Autenticación: OAuth (ChatGPT)
- Referencia de modelo de OpenAI Codex heredada: `openai/gpt-5.5`
- Referencia de arnés del servidor de aplicaciones nativo de Codex: `openai/gpt-5.5`
- Documentación del arnés nativo del servidor de aplicaciones de Codex: [Codex harness](/es/plugins/codex-harness)
- Referencias de modelos heredadas: `codex/gpt-*`
- Límite del complemento: `openai/*` carga el complemento de OpenAI; el complemento nativo del servidor de aplicaciones de Codex es seleccionado por el tiempo de ejecución del arnés de Codex.
- CLI: `openclaw onboard --auth-choice openai` o `openclaw models auth login --provider openai`
- El transporte predeterminado es `auto` (WebSocket primero, respaldo SSE)
- Anular por modelo de OpenAI Codex mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, o `"auto"`)
- `params.serviceTier` también se reenvía en las solicitudes nativas de Codex Responses (`chatgpt.com/backend-api`)
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`) solo se adjuntan en el tráfico nativo de Codex hacia `chatgpt.com/backend-api`, no en proxies compatibles con OpenAI genéricos
- Comparte el mismo interruptor `/fast` y configuración `params.fastMode` que el `openai/*` directo; OpenClaw lo asigna a `service_tier=priority`
- `openai/gpt-5.5` usa el `contextWindow = 400000` nativo del catálogo de Codex y el tiempo de ejecución predeterminado `contextTokens = 272000`; anule el límite de tiempo de ejecución con `models.providers.openai.models[].contextTokens`
- Nota de política: OpenAI Codex OAuth es explícitamente compatible con herramientas/flujos de trabajo externos como OpenClaw.
- Para la ruta común de suscripción más tiempo de ejecución nativo de Codex, inicie sesión con autenticación `openai` y configure `openai/gpt-5.5`; el agente de OpenAI activa la selección de Codex de forma predeterminada.
- Use el proveedor/modelo `agentRuntime.id: "openclaw"` solo cuando desee la ruta OpenClaw integrada; de lo contrario, mantenga `openai/gpt-5.5` en el arnés predeterminado de Codex.
- las referencias GPT de Codex heredadas son un estado heredado, no una ruta de proveedor en vivo. Use `openai/gpt-5.5` en el tiempo de ejecución nativo de Codex para la nueva configuración de agente y ejecute `openclaw doctor --fix` para migrar las referencias de modelos heredadas de Codex antiguas a referencias canónicas `openai/*`.

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
      openai: {
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
- Proveedor de tiempo de ejecución de Zen: `opencode`
- Proveedor de runtime de Go: `opencode-go`
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
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GOOGLE_API_KEY` de respaldo (fallback) y `OPENCLAW_LIVE_GEMINI_KEY` (única anulación)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- Alias: `google/gemini-3.1-pro` se acepta y se normaliza al id de la API Gemini en vivo de Google, `google/gemini-3.1-pro-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- Pensamiento (Thinking): `/think adaptive` usa el pensamiento dinámico de Google. Gemini 3/3.1 omite un `thinkingLevel` fijo; Gemini 2.5 envía `thinkingBudget: -1`.
- Las ejecuciones directas de Gemini también aceptan `agents.defaults.models["google/<model>"].params.cachedContent` (o el heredado `cached_content`) para reenviar un identificador `cachedContents/...` nativo del proveedor; los aciertos de caché de Gemini aparecen como `cacheRead` de OpenClaw

### Google Vertex y CLI de Gemini

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa ADC de gcloud; la CLI de Gemini usa su flujo OAuth

<Warning>OAuth de la CLI de Gemini en OpenClaw es una integración no oficial. Algunos usuarios han informado restricciones en la cuenta de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.</Warning>

Gemini CLI OAuth se incluye como parte del complemento incluido (bundled) `google`.

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

    Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`. **No** debe pegar un id de cliente o secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena tokens en perfiles de autenticación en el host de la puerta de enlace.

  </Step>
  <Step title="Establecer proyecto (si es necesario)">
    Si las solicitudes fallan después de iniciar sesión, configure `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace.
  </Step>
</Steps>

Las respuestas JSON de la CLI de Gemini se analizan desde `response`; el uso vuelve a `stats`, con `stats.cached` normalizado a OpenClaw `cacheRead`.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5.1`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Las referencias de modelo utilizan el ID de proveedor canónico `zai/*`.
  - `zai-api-key` detecta automáticamente el punto final Z.AI coincidente; `zai-coding-global`, `zai-coding-cn`, `zai-global` y `zai-cn` fuerzan una superficie específica

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
- El catálogo de respaldo estático incluye `kilocode/kilo/auto`; el descubrimiento en vivo de `https://api.kilo.ai/api/gateway/models` puede expandir aún más el catálogo en tiempo de ejecución.
- El enrutamiento ascendente exacto detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway, no está codificado en OpenClaw.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedores incluidos

| Proveedor                                  | Id                               | Entorno de autenticación                                     | Modelo de ejemplo                                          |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| BytePlus                                   | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`                            |
| Cerebras                                   | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                                     |
| Cloudflare AI Gateway                      | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | -                                                          |
| DeepInfra                                  | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V4-Flash`                  |
| DeepSeek                                   | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                               |
| GitHub Copilot                             | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | -                                                          |
| GMI Cloud                                  | `gmi`                            | `GMI_API_KEY`                                                | `gmi/google/gemini-3.1-flash-lite`                         |
| Groq                                       | `groq`                           | `GROQ_API_KEY`                                               | -                                                          |
| Hugging Face Inference                     | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`                         | `huggingface/deepseek-ai/DeepSeek-R1`                      |
| Kilo Gateway                               | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                                       |
| Kimi Coding                                | `kimi`                           | `KIMI_API_KEY` o `KIMICODE_API_KEY`                          | `kimi/kimi-for-coding`                                     |
| MiniMax                                    | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M3`                                       |
| Mistral                                    | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                             |
| Moonshot                                   | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                                       |
| NVIDIA                                     | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`                 |
| NovitaAI                                   | `novita`                         | `NOVITA_API_KEY`                                             | `novita/deepseek/deepseek-v3-0324`                         |
| [Ollama Cloud](/es/providers/ollama-cloud) | `ollama-cloud`                   | `OLLAMA_API_KEY`                                             | `ollama-cloud/kimi-k2.6`                                   |
| OpenRouter                                 | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                                          |
| Qianfan                                    | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                                    |
| Qwen Cloud                                 | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                                        |
| [Qwen OAuth](/es/providers/qwen-oauth)     | `qwen-oauth`                     | `QWEN_API_KEY`                                               | `qwen-oauth/qwen3.5-plus`                                  |
| StepFun                                    | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                                   |
| Together                                   | `together`                       | `TOGETHER_API_KEY`                                           | `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`         |
| Venice                                     | `venice`                         | `VENICE_API_KEY`                                             | -                                                          |
| Vercel AI Gateway                          | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6`              |
| Volcano Engine (Doubao)                    | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`                          |
| xAI                                        | `xai`                            | SuperGrok/X Premium OAuth o `XAI_API_KEY`                    | `xai/grok-4.3`                                             |
| Xiaomi                                     | `xiaomi` / `xiaomi-token-plan`   | `XIAOMI_API_KEY` / `XIAOMI_TOKEN_PLAN_API_KEY`               | `xiaomi/mimo-v2-flash` / `xiaomi-token-plan/mimo-v2.5-pro` |

#### Peculiaridades worth knowing

<AccordionGroup>
  <Accordion title="OpenRouter">
    Aplica sus encabezados de atribución de aplicación y marcadores `cache_control` de Anthropic solo en rutas `openrouter.ai` verificadas. Las referencias de DeepSeek, Moonshot y ZAI son elegibles para TTL de caché para el almacenamiento en caché de solicitudes administrado por OpenRouter, pero no reciben marcadores de caché de Anthropic. Como una ruta compatible con OpenAI de estilo proxy, omite el modelado nativo-solo-OpenAI (`serviceTier`, Respuestas `store`, sugerencias de caché de solicitudes, compatibilidad de razonamiento de OpenAI). Las referencias respaldadas por Gemini mantienen solo la saneamiento de firmas de pensamiento proxy-Gemini.
  </Accordion>
  <Accordion title="Kilo Gateway">
    Las referencias respaldadas por Gemini siguen la misma ruta de saneamiento proxy-Gemini; `kilocode/kilo/auto` y otras referencias no compatibles con razonamiento proxy omiten la inyección de razonamiento proxy.
  </Accordion>
  <Accordion title="MiniMax">
    La incorporación con clave de API escribe definiciones explícitas de modelos de chat M3 y M2.7; la comprensión de imágenes se mantiene en el proveedor de medios `MiniMax-VL-01` propiedad del complemento.
  </Accordion>
  <Accordion title="NVIDIA">
    Los ID de modelo utilizan un espacio de nombres `nvidia/<vendor>/<model>` (por ejemplo `nvidia/nvidia/nemotron-...` junto con `nvidia/moonshotai/kimi-k2.5`); los selectores preservan la composición literal `<provider>/<model-id>` mientras que la clave canónica enviada a la API se mantiene con prefijo único.
  </Accordion>
  <Accordion title="xAI">
    Utiliza la ruta de Respuestas xAI. La ruta recomendada es SuperGrok/X Premium OAuth; las claves de API aún funcionan a través de `XAI_API_KEY` o la configuración del complemento, y Grok `web_search` reutiliza el mismo perfil de autenticación antes del respaldo de la clave de API. `grok-4.3` es el modelo de chat predeterminado incluido, y `grok-build-0.1` es seleccionable para trabajo centrado en construcción/código. `/fast` o `params.fastMode: true` reescriben `grok-3`, `grok-3-mini`, `grok-4` y `grok-4-0709` a sus variantes `*-fast`. `tool_stream` está activado de forma predeterminada; desactívelo mediante `agents.defaults.models["xai/<model>"].params.tool_stream=false`.
  </Accordion>
  <Accordion title="Cerebras">
    Se envía como el complemento de proveedor `cerebras` incluido. GLM usa `zai-glm-4.7`; la URL base compatible con OpenAI es `https://api.cerebras.ai/v1`.
  </Accordion>
</AccordionGroup>

## Proveedores a través de `models.providers` (URL personalizada/base)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o proxys compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedor incluidos a continuación ya publican un catálogo predeterminado. Use entradas explícitas `models.providers.<id>` solo cuando desee anular la URL base predeterminada, los encabezados o la lista de modelos.

Las comprobaciones de capacidad del modelo de Gateway también leen metadatos explícitos `models.providers.<id>.models[]`. Si un modelo personalizado o proxy acepta imágenes, establezca `input: ["text", "image"]` en ese modelo para que las rutas de adjuntos de WebChat y de origen del nodo pasen las imágenes como entradas nativas del modelo en lugar de referencias de medios de solo texto.

`agents.defaults.models["provider/model"]` solo controla la visibilidad del modelo, los alias y los metadatos por modelo para los agentes. No registra por sí solo un nuevo modelo en tiempo de ejecución. Para modelos de proveedores personalizados, también agregue `models.providers.<provider>.models[]` con al menos el `id` coincidente.

### Moonshot AI (Kimi)

Moonshot se distribuye como un complemento de proveedor incluido. Utilice el proveedor integrado de forma predeterminada y agregue una entrada explícita `models.providers.moonshot` solo cuando necesite anular la URL base o los metadatos del modelo:

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

Kimi Coding utiliza el endpoint compatible con Anthropic de Moonshot AI:

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

Los modelos heredados `kimi/kimi-code` y `kimi/k2p5` siguen siendo aceptados como IDs de modelos de compatibilidad y se normalizan al ID de modelo de API estable de Kimi.

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

La incorporación (onboarding) tiene como valor predeterminado la superficie de codificación, pero el catálogo general `volcengine/*` se registra al mismo tiempo.

En los selectores de modelo de incorporación/configuración, la elección de autenticación de Volcengine prefiere las filas `volcengine/*` y `volcengine-plan/*`. Si esos modelos aún no se han cargado, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector con ámbito de proveedor vacío.

<Tabs>
  <Tab title="Standard models">
    - `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127` (Kimi K2.5)
    - `volcengine/glm-4-7-251222` (GLM 4.7)
    - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

  </Tab>
  <Tab title="Coding models (volcengine-plan)">
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
- Autenticación: `BYTEPLUS_API_KEY`
- Modelo de ejemplo: `byteplus-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

La incorporación (onboarding) utiliza por defecto la superficie de codificación, pero el catálogo general de `byteplus/*` se registra al mismo tiempo.

En los selectores de incorporación/configuración de modelos, la elección de autenticación de BytePlus prefiere tanto las filas `byteplus/*` como `byteplus-plan/*`. Si esos modelos aún no se han cargado, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector vacío con ámbito de proveedor.

<Tabs>
  <Tab title="Standard models">
    - `byteplus/seed-1-8-251228` (Seed 1.8)
    - `byteplus/kimi-k2-5-260127` (Kimi K2.5)
    - `byteplus/glm-4-7-251222` (GLM 4.7)

  </Tab>
  <Tab title="Coding models (byteplus-plan)">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`

  </Tab>
</Tabs>

### Sintético

Sintético proporciona modelos compatibles con Anthropic detrás del proveedor `synthetic`:

- Proveedor: `synthetic`
- Autenticación: `SYNTHETIC_API_KEY`
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

MiniMax se configura a través de `models.providers` porque utiliza endpoints personalizados:

- OAuth de MiniMax (Global): `--auth-choice minimax-global-oauth`
- OAuth de MiniMax (CN): `--auth-choice minimax-cn-oauth`
- Clave de API de MiniMax (Global): `--auth-choice minimax-global-api`
- Clave de API de MiniMax (CN): `--auth-choice minimax-cn-api`
- Auth: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` para `minimax-portal`

Consulte [/providers/minimax](/es/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

<Note>En la ruta de transmisión compatible con Anthropic de MiniMax, OpenClaw desactiva el pensamiento de forma predeterminada a menos que lo configure explícitamente, y `/fast on` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.</Note>

División de capacidades propiedad del complemento:

- Los valores predeterminados de texto/chat se mantienen en `minimax/MiniMax-M3`
- La generación de imágenes es `minimax/image-01` o `minimax-portal/image-01`
- La comprensión de imágenes es `MiniMax-VL-01` propiedad del complemento en ambas rutas de autenticación de MiniMax
- La búsqueda web se mantiene en el id de proveedor `minimax`

### LM Studio

LM Studio se distribuye como un complemento de proveedor incluido que utiliza la API nativa:

- Proveedor: `lmstudio`
- Auth: `LM_API_TOKEN`
- URL base de inferencia predeterminada: `http://localhost:1234/v1`

Luego, configure un modelo (reemplácelo con uno de los IDs devueltos por `http://localhost:1234/api/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utiliza el `/api/v1/models` y `/api/v1/models/load` nativos de LM Studio para el descubrimiento + carga automática, con `/v1/chat/completions` para la inferencia de forma predeterminada. Si desea que la carga JIT, el TTL y la expulsión automática de LM Studio sean propietarios del ciclo de vida del modelo, configure `models.providers.lmstudio.params.preload: false`. Consulte [/providers/lmstudio](/es/providers/lmstudio) para ver la configuración y la solución de problemas.

### Ollama

Ollama se distribuye como un complemento de proveedor incluido y utiliza la API nativa de Ollama:

- Proveedor: `ollama`
- Auth: No se requiere (servidor local)
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

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando optas por participar con `OLLAMA_API_KEY`, y el complemento del proveedor incluido añade Ollama directamente a `openclaw onboard` y al selector de modelos. Consulta [/providers/ollama](/es/providers/ollama) para obtener información sobre incorporación, modo en la nube/local y configuración personalizada.

### vLLM

vLLM se incluye como un complemento de proveedor para servidores compatibles con OpenAI autoalojados o locales:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de tu servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para optar por el descubrimiento automático localmente (cualquier valor funciona si tu servidor no exige autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

Luego, configura un modelo (reemplázalo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consulta [/providers/vllm](/es/providers/vllm) para obtener más detalles.

### SGLang

SGLang se incluye como un complemento de proveedor para servidores compatibles con OpenAI autoalojados y rápidos:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de tu servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para optar por el descubrimiento automático localmente (cualquier valor funciona si tu servidor no exige autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

Luego, configura un modelo (reemplázalo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consulta [/providers/sglang](/es/providers/sglang) para obtener más detalles.

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
    Para proveedores personalizados, `reasoning`, `input`, `cost`, `contextWindow` y `maxTokens` son opcionales. Cuando se omiten, OpenClaw utiliza por defecto:

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    Recomendado: establece valores explícitos que coincidan con los límites de tu proxy/modelo.

  </Accordion>
  <Accordion title="Reglas de configuración de ruta de proxy">
    - Para `api: "openai-completions"` en puntos de conexión no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
    - Las rutas compatibles con OpenAI de estilo proxy también omiten la configuración de solicitudes nativas solo de OpenAI: sin `service_tier`, sin Responses `store`, sin Completions `store`, sin sugerencias de caché de mensajes, sin configuración de carga compatible con el razonamiento de OpenAI y sin encabezados de atribución ocultos de OpenClaw.
    - Para los proxies de Completions compatibles con OpenAI que necesitan campos específicos del proveedor, establezca `agents.defaults.models["provider/model"].params.extra_body` (o `extraBody`) para fusionar JSON adicional en el cuerpo de la solicitud saliente.
    - Para los controles de plantilla de chat de vLLM, establezca `agents.defaults.models["provider/model"].params.chat_template_kwargs`. El complemento vLLM incluido envía automáticamente `enable_thinking: false` y `force_nonempty_content: true` para `vllm/nemotron-3-*` cuando el nivel de pensamiento de la sesión está desactivado.
    - Para modelos locales lentos o hosts remotos de LAN/tailnet, establezca `models.providers.<id>.timeoutSeconds`. Esto extiende el manejo de solicitudes HTTP del modelo del proveedor, incluida la conexión, los encabezados, la transmisión del cuerpo y la interrupción total de la búsqueda protegida, sin aumentar el tiempo de espera de ejecución del agente completo. Si `agents.defaults.timeoutSeconds` o un tiempo de espera específico de la ejecución es menor, también aumente ese límite; los tiempos de espera del proveedor no pueden extender la ejecución completa.
    - Las llamadas HTTP del proveedor de modelos permiten respuestas DNS de IP falsificadas de Surge, Clash y sing-box en `198.18.0.0/15` y `fc00::/7` solo para el nombre de host del proveedor `baseUrl` configurado. Los puntos de conexión de proveedores personalizados locales también confían en ese origen `scheme://host:port` configurado exacto para solicitudes de modelo protegidas, incluidos los hosts de loopback, LAN y tailnet. Esta no es una nueva opción de configuración; el `baseUrl` que configure extiende la política de solicitud solo para ese origen. La permisividad del nombre de host de IP falsificada y la confianza en el origen exacto son mecanismos independientes. Otros destinos privados, de loopback, de enlace local, de metadatos y puertos diferentes aún requieren un `models.providers.<id>.request.allowPrivateNetwork: true` de aceptación explícito. Establezca `models.providers.<id>.request.allowPrivateNetwork: false` para optar por no participar en la confianza de origen exacto.
    - Si `baseUrl` está vacío/omitido, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve en `api.openai.com`).
    - Por seguridad, un `compat.supportsDeveloperRole: true` explícito aún se anula en los puntos de conexión `openai-completions` no nativos.
    - Para `api: "anthropic-messages"` en puntos de conexión no directos (cualquier proveedor que no sea `anthropic` canónico, o un `models.providers.anthropic.baseUrl` personalizado cuyo host no sea un punto de conexión `api.anthropic.com` público), OpenClaw suprime los encabezados beta implícitos de Anthropic, como `claude-code-20250219`, `interleaved-thinking-2025-05-14` y los marcadores de OAuth, para que los proxies compatibles con Anthropic personalizados no rechacen las marcas beta no compatibles. Establezca `models.providers.<id>.headers["anthropic-beta"]` explícitamente si su proxy necesita características beta específicas.

  </Accordion>
</AccordionGroup>

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Consulte también: [Configuración](/es/gateway/configuration) para ver ejemplos de configuración completos.

## Relacionado

- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) - claves de configuración del modelo
- [Conmutación por error del modelo](/es/concepts/model-failover) - cadenas de reserva y comportamiento de reintento
- [Modelos](/es/concepts/models) - configuración y alias de modelos
- [Proveedores](/es/providers) - guías de configuración por proveedor
