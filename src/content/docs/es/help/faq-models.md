---
summary: "Preguntas frecuentes: modelos predeterminados, selección, alias, cambio, conmutación por error y perfiles de autenticación"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "Preguntas frecuentes: modelos y autenticación"
sidebarTitle: "Preguntas frecuentes sobre modelos"
---

Preguntas y respuestas sobre modelos y perfiles de autenticación. Para la configuración, sesiones, puerta de enlace, canales y solución de problemas, consulte las [preguntas frecuentes] principales(/en/help/faq).

## Modelos: predeterminados, selección, alias, cambio

<AccordionGroup>
  <Accordion title='¿Cuál es el "modelo predeterminado"?'>
    El modelo predeterminado de OpenClaw es aquello que configure como:

    ```
    agents.defaults.model.primary
    ```

    Los modelos se referencian como `provider/model` (ejemplo: `openai/gpt-5.5` o `openai-codex/gpt-5.5`). Si omite el proveedor, OpenClaw primero intenta un alias, luego una coincidencia única de proveedor configurado para esa identificación de modelo exacta, y solo luego recurre al proveedor predeterminado configurado como una ruta de compatibilidad obsoleta. Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un predeterminado obsoleto de un proveedor eliminado. Aún debe configurar `provider/model` **explícitamente**.

  </Accordion>

  <Accordion title="¿Qué modelo recomiendas?">
    **Predeterminado recomendado:** utiliza el modelo más fuerte de la última generación disponible en tu pila de proveedores.
    **Para agentes con herramientas habilitadas o entradas no confiables:** prioriza la fuerza del modelo sobre el costo.
    **Para chat rutinario o de bajo riesgo:** utiliza modelos de respaldo más baratos y enruta por rol de agente.

    MiniMax tiene su propia documentación: [MiniMax](/es/providers/minimax) y
    [Modelos locales](/es/gateway/local-models).

    Regla general: utiliza el **mejor modelo que puedas permitirte** para trabajo de alto riesgo, y un modelo más barato
    para chat rutinario o resúmenes. Puedes enrutar modelos por agente y usar sub-agentes para
    paralelizar tareas largas (cada sub-agente consume tokens). Consulta [Modelos](/es/concepts/models) y
    [Sub-agentes](/es/tools/subagents).

    Advertencia fuerte: los modelos más débiles o sobrecuantizados son más vulnerables a la inyección
    de avisos (prompt injection) y a comportamientos inseguros. Consulta [Seguridad](/es/gateway/security).

    Más contexto: [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelos sin borrar mi configuración?">
    Usa **comandos de modelo** o edita solo los campos del **modelo**. Evita reemplazos completos de la configuración.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - editar `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evita `config.apply` con un objeto parcial a menos que tengas la intención de reemplazar toda la configuración.
    Para ediciones RPC, inspecciona primero con `config.schema.lookup` y prefiere `config.patch`. La carga útil de búsqueda te proporciona la ruta normalizada, la documentación/restricciones del esquema superficial y los resúmenes de hijos inmediatos.
    para actualizaciones parciales.
    Si sobrescribiste la configuración, restáurala desde una copia de seguridad o vuelve a ejecutar `openclaw doctor` para reparar.

    Documentación: [Modelos](/es/concepts/models), [Configurar](/es/cli/configure), [Config](/es/cli/config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la vía más fácil para modelos locales.

    Configuración más rápida:

    1. Instale Ollama desde `https://ollama.com/download`
    2. Extraiga un modelo local como `ollama pull gemma4`
    3. Si también desea modelos en la nube, ejecute `ollama signin`
    4. Ejecute `openclaw onboard` y elija `Ollama`
    5. Seleccione `Local` o `Cloud + Local`

    Notas:

    - `Cloud + Local` le proporciona modelos en la nube además de sus modelos locales de Ollama
    - los modelos en la nube como `kimi-k2.5:cloud` no necesitan una extracción local
    - para el cambio manual, use `openclaw models list` y `openclaw models set ollama/<model>`

    Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la inyección de prompt. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas. Si aún desea modelos pequeños, habilite el sandboxing y listas de permisos estrictas de herramientas.

    Documentación: [Ollama](/es/providers/ollama), [Modelos locales](/es/gateway/local-models),
    [Proveedores de modelos](/es/concepts/model-providers), [Seguridad](/es/gateway/security),
    [Sandboxing](/es/gateway/sandboxing).

  </Accordion>

<Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
  - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor. - Compruebe la configuración actual de tiempo de ejecución en cada puerta de enlace con `openclaw models status`. - Para agentes sensibles a la seguridad o con herramientas habilitadas, use el modelo más potente de la última generación disponible.
</Accordion>

  <Accordion title="¿Cómo cambio de modelo sobre la marcha (sin reiniciar)?">
    Use el comando `/model` como un mensaje independiente:

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    Estos son los alias integrados. Se pueden agregar alias personalizados a través de `agents.defaults.models`.

    Puede listar los modelos disponibles con `/model`, `/model list` o `/model status`.

    `/model` (y `/model list`) muestran un selector numerado compacto. Seleccione por número:

    ```
    /model 3
    ```

    También puede forzar un perfil de autenticación específico para el proveedor (por sesión):

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Consejo: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está usando y qué perfil de autenticación se probará a continuación.
    También muestra el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

    **¿Cómo desanclar un perfil que configuré con @profile?**

    Ejecute `/model` de nuevo **sin** el sufijo `@profile`:

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
    Use `/model status` para confirmar qué perfil de autenticación está activo.

  </Accordion>

  <Accordion title="¿Puedo usar GPT 5.5 para tareas diarias y Codex 5.5 para programación?">
    Sí. Configure uno como predeterminado y cambie según sea necesario:

    - **Cambio rápido (por sesión):** `/model openai/gpt-5.5` para tareas actuales de clave de API directa de OpenAI o `/model openai-codex/gpt-5.5` para tareas OAuth de GPT-5.5 Codex.
    - **Predeterminado:** establezca `agents.defaults.model.primary` en `openai/gpt-5.5` para el uso de clave de API o `openai-codex/gpt-5.5` para el uso OAuth de GPT-5.5 Codex.
    - **Sub-agentes:** envíe tareas de programación a sub-agentes con un modelo predeterminado diferente.

    Consulte [Modelos](/es/concepts/models) y [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo configuro el modo rápido para GPT 5.5?">
    Utilice un interruptor de sesión o una configuración predeterminada:

    - **Por sesión:** envíe `/fast on` mientras la sesión esté utilizando `openai/gpt-5.5` o `openai-codex/gpt-5.5`.
    - **Por defecto del modelo:** establezca `agents.defaults.models["openai/gpt-5.5"].params.fastMode` o `agents.defaults.models["openai-codex/gpt-5.5"].params.fastMode` en `true`.

    Ejemplo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    Para OpenAI, el modo rápido se asigna a `service_tier = "priority"` en las solicitudes nativas de Responses compatibles. El `/fast` de la sesión anula los valores predeterminados de configuración del modelo.

    Consulte [Thinking and fast mode](/es/tools/thinking) y [OpenAI fast mode](/es/providers/openai#fast-mode).

  </Accordion>

  <Accordion title='¿Por qué veo "Model ... is not allowed" y luego ninguna respuesta?'>
    Si `agents.defaults.models` está establecido, se convierte en la **lista de permitidos** para `/model` y cualquier
    anulación de sesión. Elegir un modelo que no esté en esa lista devuelve:

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Ese error se devuelve **en lugar de** una respuesta normal. Solución: añada el modelo a
    `agents.defaults.models`, elimine la lista de permitidos o elija un modelo de `/model list`.

  </Accordion>

  <Accordion title='¿Por qué veo "Unknown model: minimax/MiniMax-M2.7"?'>
    Esto significa que el **proveedor no está configurado** (no se encontró ninguna configuración del proveedor MiniMax ni perfil de autenticación), por lo que no se puede resolver el modelo.

    Lista de verificación para solucionarlo:

    1. Actualice a una versión actual de OpenClaw (o ejecútela desde el código fuente `main`) y luego reinicie la puerta de enlace.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista la autenticación de MiniMax en los perfiles de entorno/autenticación para que se pueda inyectar el proveedor coincidente
       (`MINIMAX_API_KEY` para `minimax`, `MINIMAX_OAUTH_TOKEN` o MiniMax OAuth almacenado para
       `minimax-portal`).
    3. Utilice el id exacto del modelo (distingue mayúsculas y minúsculas) para su ruta de autenticación:
       `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed` para la configuración
       de clave de API, o `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` para la configuración de OAuth.
    4. Ejecute:

       ```bash
       openclaw models list
       ```

       y elija de la lista (o `/model list` en el chat).

    Consulte [MiniMax](/es/providers/minimax) y [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?">
    Sí. Use **MiniMax como predeterminado** y cambie de modelos **por sesión** cuando sea necesario.
    Las alternativas (fallbacks) son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

    **Opción A: cambiar por sesión**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    Luego:

    ```
    /model gpt
    ```

    **Opción B: agentes separados**

    - Agente A predeterminado: MiniMax
    - Agente B predeterminado: OpenAI
    - Enrutar por agente o usar `/agent` para cambiar

    Documentación: [Modelos](/es/concepts/models), [Enrutamiento multiagente](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

  </Accordion>

  <Accordion title="¿Son opus / sonnet / gpt atajos integrados?">
    Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.5` para configuraciones con clave de API, o `openai-codex/gpt-5.5` cuando se configura para Codex OAuth
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    Si defines tu propio alias con el mismo nombre, tu valor tendrá prioridad.

  </Accordion>

  <Accordion title="¿Cómo defino/sobrescribo los atajos de modelo (alias)?">
    Los alias provienen de `agents.defaults.models.<modelId>.alias`. Ejemplo:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    Entonces, `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve en ese ID de modelo.

  </Accordion>

  <Accordion title="¿Cómo añado modelos de otros proveedores como OpenRouter o Z.AI?">
    OpenRouter (pago por token; muchos modelos):

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI (modelos GLM):

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    Si haces referencia a un proveedor/modelo pero falta la clave del proveedor necesaria, obtendrás un error de autenticación en tiempo de ejecución (p. ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave API para el proveedor después de añadir un nuevo agente**

    Esto suele significar que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y
    se almacena en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Opciones de solución:

    - Ejecuta `openclaw agents add <id>` y configura la autenticación durante el asistente.
    - O copia `auth-profiles.json` del `agentDir` del agente principal al `agentDir` del nuevo agente.

    **No** reutilices `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

  </Accordion>
</AccordionGroup>

## Conmutación por error de modelo (failover) y "All models failed"

<AccordionGroup>
  <Accordion title="¿Cómo funciona el conmutación por error?">
    La conmutación por error ocurre en dos etapas:

    1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
    2. **Respaldo del modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican períodos de enfriamiento a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene limitaciones de velocidad o falla temporalmente.

    El cubo de limitación de velocidad incluye más que simples respuestas `429`. OpenClaw
    también trata mensajes como `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted` y límites
    periódicos de la ventana de uso (`weekly/monthly limit reached`) como límites
    de velocidad que justifican la conmutación por error.

    Algunas respuestas que parecen de facturación no son `402`, y algunas respuestas HTTP `402`
    también permanecen en ese cubo transitorio. Si un proveedor devuelve
    texto de facturación explícito en `401` o `403`, OpenClaw aún puede mantenerlo en
    el carril de facturación, pero los comparadores de texto específicos del proveedor se limitan al
    proveedor que los posee (por ejemplo, OpenRouter `Key limit exceeded`). Si un mensaje `402`
    parece más bien un límite de ventana de uso reintentable o un
    límite de gasto de la organización/espacio de trabajo (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw lo trata como
    `rate_limit`, no como una desactivación prolongada por facturación.

    Los errores de desbordamiento de contexto son diferentes: firmas como
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model`, o `ollama error: context length
    exceeded` permanecen en la ruta de compactación/reintento en lugar de avanzar el respaldo
    del modelo.

    El texto de error genérico del servidor es intencionalmente más estrecho que "cualquier cosa con
    unknown/error en él". OpenClaw sí trata formas transitorias con ámbito de proveedor
    como `An unknown error occurred` simple de Anthropic, `Provider returned error` simple de OpenRouter,
    errores de motivo de detención como `Unhandled stop reason:
    error`, JSON `api_error` con texto de servidor transitorio
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` como
    señales de tiempo de espera/sobrecarga que justifican la conmutación por error cuando el contexto del
    proveedor coincide.
    El texto de respaldo interno genérico como `LLM request failed with an unknown
    error.` se mantiene conservador y no activa el respaldo del modelo por sí solo.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó utilizar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

    **Lista de verificación de solución:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas frente a heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno es cargada por la puerta de enlace (Gateway)**
      - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta la puerta de enlace a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones de múltiples agentes significan que puede haber múltiples archivos `auth-profiles.json`.
    - **Verificación de estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de solución para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero la puerta de enlace
    no puede encontrarlo en su almacén de autenticación.

    - **Usar Claude CLI**
      - Ejecute `openclaw models auth login --provider anthropic --method cli --set-default` en el host de la puerta de enlace.
    - **Si desea utilizar una clave de API en su lugar**
      - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de la puerta de enlace**.
      - Limpie cualquier orden fija que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando comandos en el host de la puerta de enlace**
      - En el modo remoto, los perfiles de autenticación residen en la máquina de la puerta de enlace, no en su portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó usar Google Gemini y falló?">
    Si la configuración de su modelo incluye Google Gemini como reserva (o cambió a un atajo de Gemini), OpenClaw lo intentará durante la conmutación por error del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

    Solución: proporcione la autenticación de Google o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que la reserva no enrute allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Google Antigravity)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo de una
    transmisión abortada/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Google Antigravity Claude. Si aún aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

  </Accordion>
</AccordionGroup>

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/es/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones de multicuenta)

<AccordionGroup>
  <Accordion title="¿Qué es un perfil de autenticación?">
    Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles residen en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="¿Cuáles son los ID de perfil típicos?">
    OpenClaw utiliza ID con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe una identidad de correo electrónico)
    - `anthropic:<email>` para identidades de OAuth
    - ID personalizados que elija (p. ej. `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se intenta primero?">
    Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; mapea IDs a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un **periodo de enfriamiento** (cooldown) corto (límites de velocidad/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

    Los periodos de enfriamiento por límites de velocidad pueden estar limitados al modelo. Un perfil que se está enfriando para un modelo todavía puede ser utilizable para un modelo hermano en el mismo proveedor, mientras que las ventanas de facturación/deshabilitado siguen bloqueando todo el perfil.

    También puede establecer una anulación de orden **por agente** (almacenada en `auth-state.json` de ese agente) a través de la CLI:

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    Para apuntar a un agente específico:

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    Para verificar qué se intentará realmente, use:

    ```bash
    openclaw models status --probe
    ```

    Si se omite un perfil almacenado del orden explícito, el sondeo informa `excluded_by_auth_order` para ese perfil en lugar de intentarlo silenciosamente.

  </Accordion>

  <Accordion title="OAuth vs. clave de API - ¿cuál es la diferencia?">
    OpenClaw admite ambos:

    - **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponda).
    - **Las claves de API** utilizan la facturación de pago por token.

    El asistente admite explícitamente Anthropic Claude CLI, OpenAI Codex OAuth y claves de API.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Preguntas frecuentes](/es/help/faq) — las preguntas frecuentes principales
- [Preguntas frecuentes: inicio rápido y configuración de primera ejecución](/es/help/faq-first-run)
- [Selección de modelo](/es/concepts/model-providers)
- [Conmutación por error de modelo](/es/concepts/model-failover)
