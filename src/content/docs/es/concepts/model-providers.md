---
summary: "Resumen de proveedores de modelos con configuraciones de ejemplo y flujos de CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Proveedores de modelos"
sidebarTitle: "Proveedores de modelos"
---

Referencia de **proveedores de modelos/LLM** (no canales de chat como WhatsApp/Telegram). Para ver las reglas de selección de modelos, consulte [Modelos](/es/concepts/models).

## Reglas rápidas

<AccordionGroup>
  <Accordion title="Referencias de modelos y auxiliares de CLI">
    - Las referencias de modelos usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
    - `agents.defaults.models` actúa como una lista de permitidos cuando se establece.
    - Auxiliares de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` establecen los valores predeterminados a nivel de proveedor; `models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` los anulan por modelo.
    - Reglas de respaldo, sondas de enfriamiento y persistencia de anulación de sesión: [Conmutación por error de modelos](/es/concepts/model-failover).

  </Accordion>
  <Accordion title="Añadir autenticación del proveedor no cambia su modelo principal">
    `openclaw configure` conserva un `agents.defaults.model.primary` existente cuando añade o reautentica un proveedor. `openclaw models auth login` hace lo mismo a menos que pase `--set-default`. Los complementos del proveedor aún pueden devolver un modelo predeterminado recomendado en su parche de configuración de autenticación, pero OpenClaw lo trata como "hacer disponible este modelo" cuando ya existe un modelo principal, no como "reemplazar el modelo principal actual".

    Para cambiar intencionalmente el modelo predeterminado, use `openclaw models set <provider/model>` o `openclaw models auth login --provider <id> --set-default`.

  </Accordion>
  <Accordion title="División de proveedor/ejecución de OpenAI">
    Las rutas de la familia OpenAI son específicas del prefijo:

    - `openai/<model>` usa el arnés nativo del servidor de aplicaciones Codex para los turnos del agente de manera predeterminada. Esta es la configuración habitual de suscripción ChatGPT/Codex.
    - `openai-codex/<model>` es una configuración heredada que el médico reescribe a `openai/<model>`.
    - `openai/<model>` más el proveedor/modelo `agentRuntime.id: "pi"` usa PI para rutas de clave de API explícita o de compatibilidad.

    Consulte [OpenAI](/es/providers/openai) y [Arnés Codex](/es/plugins/codex-harness). Si la división de proveedor/ejecución es confusa, lea [Tiempo de ejecución del agente](/es/concepts/agent-runtimes) primero.

    La habilitación automática de complementos sigue el mismo límite: las referencias de agente `openai/*` habilitan el complemento Codex para la ruta predeterminada, y las referencias explícitas de proveedor/modelo `agentRuntime.id: "codex"` o las referencias heredadas `codex/<model>` también lo requieren.

    GPT-5.5 está disponible a través del arnés nativo del servidor de aplicaciones Codex de manera predeterminada en `openai/gpt-5.5`, y solo a través de PI cuando la política de tiempo de ejecución del proveedor/modelo selecciona explícitamente `pi`.

  </Accordion>
  <Accordion title="CLI runtimes">
    Los tiempos de ejecución de la CLI utilizan la misma división: elija referencias de modelos canónicas como `anthropic/claude-*` o `google/gemini-*`, luego establezca la política de tiempo de ejecución del proveedor/modelo en `claude-cli` o `google-gemini-cli` cuando desee un backend de CLI local.

    Las referencias heredadas `claude-cli/*` y `google-gemini-cli/*` migran de nuevo a las referencias de proveedor canónicas con el tiempo de ejecución registrado por separado. Las referencias heredadas `codex-cli/*` migran a `openai/*` y utilizan la ruta del servidor de aplicaciones de Codex; OpenClaw ya no mantiene un backend de CLI de Codex incluido.

  </Accordion>
</AccordionGroup>

## Comportamiento del proveedor propiedad del complemento

La mayor parte de la lógica específica del proveedor reside en los complementos del proveedor (`registerProvider(...)`), mientras que OpenClaw mantiene el bucle de inferencia genérico. Los complementos son responsables de la incorporación, catálogos de modelos, mapeo de variables de entorno de autenticación, normalización de transporte/configuración, limpieza de esquemas de herramientas, clasificación de conmutación por error, actualización de OAuth, informes de uso, perfiles de pensamiento/razonamiento y más.

La lista completa de enlaces de SDK del proveedor y ejemplos de complementos incluidos se encuentra en [Complementos de proveedores](/es/plugins/sdk-provider-plugins). Un proveedor que necesita un ejecutor de solicitudes totalmente personalizado es una superficie de extensión separada y más profunda.

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

## Proveedores integrados (catálogo pi-ai)

OpenClaw se distribuye con el catálogo pi-ai. Estos proveedores no requieren configuración de `models.providers`; simplemente configure la autenticación y elija un modelo.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, además de `OPENCLAW_LIVE_OPENAI_KEY` (anulación única)
- Modelos de ejemplo: `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Verifique la disponibilidad de la cuenta/modelo con `openclaw models list --provider openai` si una instalación o clave de API específica se comporta de manera diferente.
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto`; OpenClaw pasa la elección de transporte a pi-ai.
- Anular por modelo mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- El procesamiento prioritario de OpenAI se puede habilitar mediante `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` y `params.fastMode` mapean las solicitudes directas de `openai/*` Responses a `service_tier=priority` en `api.openai.com`
- Use `params.serviceTier` cuando desee un nivel explícito en lugar del interruptor compartido `/fast`
- Los encabezados ocultos de atribución de OpenClaw (`originator`, `version`, `User-Agent`) se aplican solo en el tráfico nativo de OpenAI hacia `api.openai.com`, no en proxies compatibles con OpenAI genéricos
- Las rutas nativas de OpenAI también mantienen `store` de Responses, sugerencias de caché de prompts y modelado de carga útil compatible con el razonamiento de OpenAI; las rutas de proxy no
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
- Las solicitudes públicas directas a Anthropic admiten el interruptor compartido `/fast` y `params.fastMode`, incluyendo el tráfico autenticado por clave de API y OAuth enviado a `api.anthropic.com`; OpenClaw lo mapea a `service_tier` de Anthropic (`auto` vs `standard_only`)
- La configuración preferida de la CLI de Claude mantiene la referencia del modelo canónica y selecciona el
  backend de la CLI por separado: `anthropic/claude-opus-4-7` con
  `agentRuntime.id: "claude-cli"` con ámbito de modelo. Las referencias
  heredadas `claude-cli/claude-opus-4-7` todavía funcionan por compatibilidad.

<Note>
  El personal de Anthropic nos dijo que el uso de la CLI de Claude estilo OpenClaw vuelve a estar permitido, por lo que OpenClaw trata el reuso de la CLI de Claude y el uso de `claude -p` como sancionados para esta integración a menos que Anthropic publique una nueva política. El token de configuración de Anthropic sigue disponible como una ruta de token compatible con OpenClaw, pero OpenClaw
  ahora prefiere el reuso de la CLI de Claude y `claude -p` cuando esté disponible.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OAuth de OpenAI Codex

- Proveedor: `openai-codex`
- Autenticación: OAuth (ChatGPT)
- Referencia heredada de modelo de PI: `openai-codex/gpt-5.5`
- Referencia de arnés nativo del servidor de aplicaciones de Codex: `openai/gpt-5.5`
- Documentos del arnés del servidor de aplicaciones nativo de Codex: [Arnés de Codex](/es/plugins/codex-harness)
- Referencias de modelos heredadas: `codex/gpt-*`
- Límite del complemento (Plugin boundary): `openai-codex/*` carga el complemento de OpenAI; el complemento nativo del servidor de aplicaciones de Codex se selecciona solo mediante el tiempo de ejecución del arnés de Codex o las referencias `codex/*` heredadas.
- CLI: `openclaw onboard --auth-choice openai-codex` o `openclaw models auth login --provider openai-codex`
- El transporte predeterminado es `auto` (prioridad WebSocket, alternativa SSE)
- Anular por modelo de PI mediante `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- `params.serviceTier` también se reenvía en las solicitudes de respuestas de Codex nativas (`chatgpt.com/backend-api`)
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`) solo se adjuntan en el tráfico nativo de Codex hacia `chatgpt.com/backend-api`, no en los proxies compatibles con OpenAI genéricos
- Comparte el mismo botón de alternancia `/fast` y la configuración `params.fastMode` que `openai/*` directo; OpenClaw asigna eso a `service_tier=priority`
- `openai-codex/gpt-5.5` utiliza el `contextWindow = 400000` nativo del catálogo de Codex y el tiempo de ejecución predeterminado `contextTokens = 272000`; anule el límite del tiempo de ejecución con `models.providers.openai-codex.models[].contextTokens`
- Nota de política: OpenAI Codex OAuth es explícitamente compatible con herramientas/flujos de trabajo externos como OpenClaw.
- Para la ruta común de suscripción más el tiempo de ejecución nativo de Codex, inicie sesión con la autenticación `openai-codex` pero configure `openai/gpt-5.5`; el agente de OpenAI selecciona Codex de forma predeterminada.
- Use el proveedor/modelo `agentRuntime.id: "pi"` solo cuando desee una ruta de compatibilidad a través de PI; de lo contrario, mantenga `openai/gpt-5.5` en el arnés de Codex predeterminado.
- Las referencias `openai-codex/gpt-*` siguen siendo una ruta heredada de PI. Prefiera `openai/gpt-5.5` en el tiempo de ejecución nativo de Codex para la configuración de nuevos agentes, y ejecute `openclaw doctor --fix` cuando desee migrar referencias antiguas de `openai-codex/*` a referencias canónicas `openai/*`.

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
  <Card title="Modelos GLM" href="/es/providers/glm">
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
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, respaldo `GOOGLE_API_KEY` y `OPENCLAW_LIVE_GEMINI_KEY` (anulación única)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- Alias: `google/gemini-3.1-pro` se acepta y normaliza al id de la API en vivo de Gemini de Google, `google/gemini-3.1-pro-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- Thinking: `/think adaptive` usa el pensamiento dinámico de Google. Gemini 3/3.1 omiten un `thinkingLevel` fijo; Gemini 2.5 envía `thinkingBudget: -1`.
- Las ejecuciones directas de Gemini también aceptan `agents.defaults.models["google/<model>"].params.cachedContent` (o el heredado `cached_content`) para reenviar un identificador `cachedContents/...` nativo del proveedor; los aciertos de caché de Gemini aparecen como `cacheRead` de OpenClaw

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

    Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`. **No** debes pegar un id de cliente ni un secreto en `openclaw.json`. El flujo de inicio de sesión de CLI almacena los tokens en perfiles de autenticación en el host de la puerta de enlace.

  </Step>
  <Step title="Establecer proyecto (si es necesario)">
    Si las solicitudes fallan después de iniciar sesión, establece `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace.
  </Step>
</Steps>

Las respuestas JSON de Gemini CLI se analizan desde `response`; el uso retrocede a `stats`, con `stats.cached` normalizado en `cacheRead` de OpenClaw.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5.1`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Alias: `z.ai/*` y `z-ai/*` se normalizan a `zai/*`
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
- El catálogo estático de reserva incluye `kilocode/kilo/auto`; el descubrimiento `https://api.kilo.ai/api/gateway/models` en vivo puede expandir aún más el catálogo de tiempo de ejecución.
- El enrutamiento ascendente exacto detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway, no está codificado en OpenClaw.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedores incluidos

| Proveedor               | Id                               | Entorno de autenticación                                     | Modelo de ejemplo                             |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| BytePlus                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`               |
| Cerebras                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                        |
| Cloudflare AI Gateway   | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | -                                             |
| DeepInfra               | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V3.2`         |
| DeepSeek                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                  |
| GitHub Copilot          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | -                                             |
| Groq                    | `groq`                           | `GROQ_API_KEY`                                               | -                                             |
| Hugging Face Inference  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`                         | `huggingface/deepseek-ai/DeepSeek-R1`         |
| Kilo Gateway            | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                          |
| Kimi Coding             | `kimi`                           | `KIMI_API_KEY` o `KIMICODE_API_KEY`                          | `kimi/kimi-for-coding`                        |
| MiniMax                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                        |
| Mistral                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                |
| Moonshot                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                          |
| NVIDIA                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`    |
| OpenRouter              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                             |
| Qianfan                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                       |
| Qwen Cloud              | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                           |
| StepFun                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                      |
| Together                | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`               |
| Venice                  | `venice`                         | `VENICE_API_KEY`                                             | -                                             |
| Vercel AI Gateway       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`             |
| xAI                     | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4.3`                                |
| Xiaomi                  | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                        |

#### Curiosidades worth knowing

<AccordionGroup>
  <Accordion title="OpenRouter">
    Aplica sus encabezados de atribución de la aplicación y los marcadores `cache_control` de Anthropic solo en las rutas `openrouter.ai` verificadas. Las referencias de DeepSeek, Moonshot y ZAI son elegibles para el TTL de caché para el almacenamiento en caché de avisos gestionado por OpenRouter, pero no reciben marcadores de caché de Anthropic. Como una ruta compatible con OpenAI de estilo proxy, omite el modelado nativo solo de OpenAI (`serviceTier`, Respuestas `store`, sugerencias de caché de avisos, compatibilidad de razonamiento de OpenAI). Las referencias con tecnología de Gemini mantienen únicamente la saneamiento de la firma de pensamiento del proxy-Gemini.
  </Accordion>
  <Accordion title="Kilo Gateway">
    Las referencias respaldadas por Gemini siguen la misma ruta de saneamiento de proxy-Gemini; `kilocode/kilo/auto` y otras referencias no compatibles con el razonamiento de proxy omiten la inyección de razonamiento de proxy.
  </Accordion>
  <Accordion title="MiniMax">
    La incorporación de API-key escribe definiciones explícitas de modelos de chat M2.7 solo de texto; la comprensión de imágenes se mantiene en el proveedor de medios `MiniMax-VL-01` propiedad del complemento.
  </Accordion>
  <Accordion title="NVIDIA">
    Los IDs de modelo utilizan un espacio de nombres `nvidia/<vendor>/<model>` (por ejemplo `nvidia/nvidia/nemotron-...` junto con `nvidia/moonshotai/kimi-k2.5`); los selectores conservan la composición literal `<provider>/<model-id>` mientras que la clave canónica enviada a la API se mantiene con un solo prefijo.
  </Accordion>
  <Accordion title="xAI">
    Utiliza la ruta de Respuestas de xAI. `grok-4.3` es el modelo de chat predeterminado incluido. `/fast` o `params.fastMode: true` reescriben `grok-3`, `grok-3-mini`, `grok-4` y `grok-4-0709` a sus variantes `*-fast`. `tool_stream` está activado de forma predeterminada; desactívelo mediante `agents.defaults.models["xai/<model>"].params.tool_stream=false`.
  </Accordion>
  <Accordion title="Cerebras">
    Se envía como el complemento de proveedor `cerebras` incluido. GLM utiliza `zai-glm-4.7`; la URL base compatible con OpenAI es `https://api.cerebras.ai/v1`.
  </Accordion>
</AccordionGroup>

## Proveedores a través de `models.providers` (URL personalizada/base)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o proxys compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedor incluidos a continuación ya publican un catálogo predeterminado. Use entradas explícitas `models.providers.<id>` solo cuando desee anular la URL base predeterminada, los encabezados o la lista de modelos.

Las comprobaciones de capacidad del modelo en la pasarela también leen metadatos explícitos `models.providers.<id>.models[]`. Si un modelo personalizado o proxy acepta imágenes, establezca `input: ["text", "image"]` en ese modelo para que WebChat y las rutas de archivos adjuntos de origen nodo pasen las imágenes como entradas nativas del modelo en lugar de referencias de medios solo de texto.

`agents.defaults.models["provider/model"]` solo controla la visibilidad del modelo, los alias y los metadatos por modelo para los agentes. No registra un nuevo modelo de tiempo de ejecución por sí mismo. Para modelos de proveedores personalizados, también agregue `models.providers.<provider>.models[]` con al menos el `id` coincidente.

### Moonshot AI (Kimi)

Moonshot se envía como un complemento de proveedor incluido. Utilice el proveedor integrado de forma predeterminada y agregue una entrada explícita `models.providers.moonshot` solo cuando necesite anular la URL base o los metadatos del modelo:

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

Los `kimi/kimi-code` y `kimi/k2p5` heredados siguen aceptándose como identificadores de modelos de compatibilidad y se normalizan al identificador de modelo de API estable de Kimi.

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

En los selectores de incorporación/configuración de modelos, la elección de autenticación de Volcengine prefiere tanto las filas `volcengine/*` como `volcengine-plan/*`. Si esos modelos aún no se han cargado, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector vacío con ámbito de proveedor.

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

La incorporación por defecto es la superficie de codificación, pero al mismo tiempo se registra el catálogo general `byteplus/*`.

En la incorporación/configuración de selectores de modelos, la elección de autenticación de BytePlus prefiere tanto las filas `byteplus/*` como `byteplus-plan/*`. Si esos modelos aún no se han cargado, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector con ámbito de proveedor vacío.

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

MiniMax se configura a través de `models.providers` porque utiliza puntos de conexión personalizados:

- MiniMax OAuth (Global): `--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN): `--auth-choice minimax-cn-oauth`
- Clave de API de MiniMax (Global): `--auth-choice minimax-global-api`
- Clave de API de MiniMax (CN): `--auth-choice minimax-cn-api`
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` para `minimax-portal`

Consulte [/providers/minimax](/es/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

<Note>En la ruta de transmisión compatible con Anthropic de MiniMax, OpenClaw deshabilita el pensamiento de manera predeterminada a menos que lo configure explícitamente, y `/fast on` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.</Note>

División de capacidades propiedad del complemento:

- Los valores predeterminados de texto/chat se mantienen en `minimax/MiniMax-M2.7`
- La generación de imágenes es `minimax/image-01` o `minimax-portal/image-01`
- La comprensión de imágenes es `MiniMax-VL-01` propiedad del complemento en ambas rutas de autenticación de MiniMax
- La búsqueda web se mantiene en el id. de proveedor `minimax`

### LM Studio

LM Studio se incluye como un complemento de proveedor agrupado que utiliza la API nativa:

- Proveedor: `lmstudio`
- Autenticación: `LM_API_TOKEN`
- URL base de inferencia predeterminada: `http://localhost:1234/v1`

Luego configure un modelo (reemplácelo con uno de los ID devueltos por `http://localhost:1234/api/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utiliza los `/api/v1/models` y `/api/v1/models/load` nativos de LM Studio para el descubrimiento y la carga automática, con `/v1/chat/completions` para la inferencia de forma predeterminada. Si desea la carga JIT, TTL y la expulsión automática de LM Studio para gestionar el ciclo de vida del modelo, configure `models.providers.lmstudio.params.preload: false`. Consulte [/providers/lmstudio](/es/providers/lmstudio) para obtener instrucciones de configuración y solución de problemas.

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

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando se activa con `OLLAMA_API_KEY`, y el complemento del proveedor incluido añade Ollama directamente a `openclaw onboard` y al selector de modelos. Consulte [/providers/ollama](/es/providers/ollama) para obtener información sobre incorporación, modo en la nube/local y configuración personalizada.

### vLLM

vLLM se incluye como un complemento de proveedor agrupado para servidores compatibles con OpenAI locales/autoalojados:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para activar el autodescubrimiento local (cualquier valor funciona si su servidor no impone autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

Luego establezca un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consulte [/providers/vllm](/es/providers/vllm) para obtener detalles.

### SGLang

SGLang se distribuye como un complemento de proveedor incluido para servidores compatibles con OpenAI autoalojados rápidos:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para optar por el autodescubrimiento local (cualquier valor funciona si su servidor no exige autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

Luego establezca un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consulte [/providers/sglang](/es/providers/sglang) para obtener detalles.

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
    Para proveedores personalizados, `reasoning`, `input`, `cost`, `contextWindow` y `maxTokens` son opcionales. Al omitirse, OpenClaw toma como predeterminados:

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    Recomendado: establezca valores explícitos que coincidan con los límites de su proxy/modelo.

  </Accordion>
  <Accordion title="Reglas de conformación de rutas de proxy">
    - Para `api: "openai-completions"` en puntos de conexión no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
    - Las rutas compatibles con OpenAI estilo proxy también omiten la conformación de solicitudes nativa solo de OpenAI: sin `service_tier`, sin `store` Responses, sin `store` Completions, sin sugerencias de caché de mensajes, sin conformación de carga útil de compatibilidad de razonamiento de OpenAI y sin encabezados de atribución ocultos de OpenClaw.
    - Para proxies de Completions compatibles con OpenAI que necesitan campos específicos del proveedor, establezca `agents.defaults.models["provider/model"].params.extra_body` (o `extraBody`) para combinar JSON adicional en el cuerpo de la solicitud saliente.
    - Para controles de plantilla de chat de vLLM, establezca `agents.defaults.models["provider/model"].params.chat_template_kwargs`. El complemento vLLM incluido envía automáticamente `enable_thinking: false` y `force_nonempty_content: true` para `vllm/nemotron-3-*` cuando el nivel de pensamiento de la sesión está desactivado.
    - Para modelos locales lentos o hosts remotos de LAN/tailnet, establezca `models.providers.<id>.timeoutSeconds`. Esto extiende el manejo de solicitudes HTTP del modelo del proveedor, incluidos la conexión, los encabezados, la transmisión del cuerpo y la interrupción total de la recuperación protegida, sin aumentar el tiempo de espera de ejecución del agente completo. Si `agents.defaults.timeoutSeconds` o un tiempo de espera específico de la ejecución es menor, aumente también ese límite; los tiempos de espera del proveedor no pueden extender la ejecución completa.
    - Las llamadas HTTP del proveedor de modelos permiten respuestas DNS de IP falsa de Surge, Clash y sing-box en `198.18.0.0/15` y `fc00::/7` solo para el nombre de host del proveedor `baseUrl` configurado. Los puntos de conexión del proveedor personalizados locales también confían en ese origen `scheme://host:port` configurado exacto para solicitudes de modelo protegidas, incluidos los hosts de loopback, LAN y tailnet. Esta no es una nueva opción de configuración; el `baseUrl` que configure extiende la política de solicitud solo para ese origen. La tolerancia del nombre de host de IP falsa y la confianza de origen exacto son mecanismos independientes. Otros destinos privados, de loopback, de enlace local, de metadatos y puertos diferentes aún requieren una aceptación explícita de `models.providers.<id>.request.allowPrivateNetwork: true`. Establezca `models.providers.<id>.request.allowPrivateNetwork: false` para rechazar la confianza de origen exacto.
    - Si `baseUrl` está vacío/omitido, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve en `api.openai.com`).
    - Por seguridad, un `compat.supportsDeveloperRole: true` explícito aún se anula en los puntos de conexión `openai-completions` no nativos.
    - Para `api: "anthropic-messages"` en puntos de conexión no directos (cualquier proveedor que no sea el `anthropic` canónico, o un `models.providers.anthropic.baseUrl` personalizado cuyo host no sea un punto de conexión `api.anthropic.com` público), OpenClaw suprime los encabezados beta implícitos de Anthropic, como `claude-code-20250219`, `interleaved-thinking-2025-05-14` y los marcadores de OAuth, para que los proxies compatibles con Anthropic personalizados no rechacen las marcas beta no compatibles. Establezca `models.providers.<id>.headers["anthropic-beta"]` explícitamente si su proxy necesita características beta específicas.

  </Accordion>
</AccordionGroup>

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Consulte también: [Configuración](/es/gateway/configuration) para ejemplos completos de configuración.

## Relacionado

- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) - claves de configuración del modelo
- [Conmutación por error del modelo](/es/concepts/model-failover) - cadenas de respaldo y comportamiento de reintento
- [Modelos](/es/concepts/models) - configuración y alias de modelos
- [Proveedores](/es/providers) - guías de configuración por proveedor
