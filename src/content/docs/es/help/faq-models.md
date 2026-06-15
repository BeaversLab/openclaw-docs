---
summary: "Preguntas frecuentes: modelos predeterminados, selección, alias, cambio, conmutación por error y perfiles de autenticación"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "Preguntas frecuentes: modelos y autenticación"
sidebarTitle: "Preguntas frecuentes sobre modelos"
---

Preguntas y respuestas sobre modelos y perfiles de autenticación. Para la configuración, sesiones, puerta de enlace, canales y solución de problemas, consulte las [Preguntas frecuentes](/es/help/faq) principales.

## Modelos: predeterminados, selección, alias, cambio

<AccordionGroup>
  <Accordion title='¿Cuál es el "modelo predeterminado"?'>
    El modelo predeterminado de OpenClaw es cualquiera que haya configurado como:

    ```
    agents.defaults.model.primary
    ```

    Los modelos se referencian como `provider/model` (ejemplo: `openai/gpt-5.5` o `anthropic/claude-sonnet-4-6`). Si omite el proveedor, OpenClaw primero intenta un alias, luego una coincidencia única de proveedor configurado para ese ID de modelo exacto, y solo luego recurre al proveedor predeterminado configurado como una ruta de compatibilidad obsoleta. Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un valor predeterminado obsoleto de un proveedor eliminado. Aún debe configurar `provider/model` de forma **explícita**.

  </Accordion>

  <Accordion title="¿Qué modelo recomienda?">
    **Predeterminado recomendado:** use el modelo de última generación más fuerte disponible en su pila de proveedores.
    **Para agentes con herramientas habilitadas o entradas que no son de confianza:** dé prioridad a la fuerza del modelo sobre el costo.
    **Para chat rutinario o de bajo riesgo:** use modelos alternativos más económicos y enrute según el rol del agente.

    MiniMax tiene su propia documentación: [MiniMax](/es/providers/minimax) y
    [Modelos locales](/es/gateway/local-models).

    Regla general: use el **mejor modelo que pueda permitirse** para el trabajo de alto riesgo y un modelo
    más económico para el chat rutinario o los resúmenes. Puede enrutar modelos por agente y usar subagentes para
    paralelizar tareas largas (cada subagente consume tokens). Consulte [Modelos](/es/concepts/models) y
    [Subagentes](/es/tools/subagents).

    Advertencia importante: los modelos más débiles o sobre-cuantizados son más vulnerables a la inyección de
    instrucciones y al comportamiento inseguro. Consulte [Seguridad](/es/gateway/security).

    Más contexto: [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelo sin borrar mi configuración?">
    Use **comandos de modelo** o edite solo los campos **model**. Evite reemplazos completos de la configuración.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - editar `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evite `config.apply` con un objeto parcial a menos que pretenda reemplazar toda la configuración.
    Para ediciones RPC, inspeccione primero con `config.schema.lookup` y prefiera `config.patch`. La carga de búsqueda (lookup payload) le proporciona la ruta normalizada, documentos/restricciones del esquema superficial y resúmenes de hijos inmediatos.
    para actualizaciones parciales.
    Si sobrescribió la configuración, restáurela desde una copia de seguridad o vuelva a ejecutar `openclaw doctor` para repararla.

    Documentación: [Models](/es/concepts/models), [Configure](/es/cli/configure), [Config](/es/cli/config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la opción más fácil para modelos locales.

    Configuración más rápida:

    1. Instala Ollama desde `https://ollama.com/download`
    2. Descarga un modelo local como `ollama pull gemma4`
    3. Si también quieres modelos en la nube, ejecuta `ollama signin`
    4. Ejecuta `openclaw onboard` y elige `Ollama`
    5. Elige `Local` o `Cloud + Local`

    Notas:

    - `Cloud + Local` te proporciona modelos en la nube además de tus modelos locales de Ollama
    - los modelos en la nube como `kimi-k2.5:cloud` no necesitan una descarga local
    - para cambiar manualmente, usa `openclaw models list` y `openclaw models set ollama/<model>`

    Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la
    inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas.
    Si todavía quieres modelos pequeños, habilita el sandboxing y listas de permisos estrictas para herramientas.

    Documentación: [Ollama](/es/providers/ollama), [Modelos locales](/es/gateway/local-models),
    [Proveedores de modelos](/es/concepts/model-providers), [Seguridad](/es/gateway/security),
    [Sandboxing](/es/gateway/sandboxing).

  </Accordion>

  <Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
    - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor.
    - Compruebe la configuración actual de tiempo de ejecución en cada puerta de enlace con `openclaw models status`.
    - Para agentes sensibles a la seguridad o con herramientas habilitadas, use el modelo más potente de la última generación disponible.

  </Accordion>

  <Accordion title="¿Cómo cambio de modelo al vuelo (sin reiniciar)?">
    Utilice el comando `/model` como un mensaje independiente:

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    Estos son los alias integrados. Se pueden añadir alias personalizados a través de `agents.defaults.models`.

    Puede listar los modelos disponibles con `/model`, `/model list` o `/model status`.

    `/model` (y `/model list`) muestra un selector numérico compacto. Seleccione por número:

    ```
    /model 3
    ```

    También puede forzar un perfil de autenticación específico para el proveedor (por sesión):

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Sugerencia: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está utilizando y qué perfil de autenticación se probará a continuación.
    También muestra el endpoint del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

    **¿Cómo desanclar un perfil que configuré con @profile?**

    Vuelva a ejecutar `/model` **sin** el sufijo `@profile`:

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
    Utilice `/model status` para confirmar qué perfil de autenticación está activo.

  </Accordion>

  <Accordion title="Si dos proveedores exponen el mismo id de modelo, ¿cuál usa /model?">
    `/model provider/model` selecciona esa ruta de proveedor exacta para la sesión.

    Por ejemplo, `qianfan/deepseek-v4-flash` y `deepseek/deepseek-v4-flash` son referencias de modelo diferentes aunque ambas contienen `deepseek-v4-flash`. OpenClaw no debe cambiar silenciosamente de un proveedor a otro solo porque el id de modelo simple coincida.

    Una referencia `/model` seleccionada por el usuario también es estricta para la política de respaldo. Si ese proveedor/modelo seleccionado no está disponible, la respuesta falla visiblemente en lugar de responder desde `agents.defaults.model.fallbacks`. Las cadenas de respaldo configuradas aún se aplican a los valores predeterminados configurados, a los principales de trabajos cron y al estado de respaldo seleccionado automáticamente.

    Si se permite que una ejecución que comenzó desde una invalidación que no es de sesión use el respaldo, OpenClaw intenta primero el proveedor/modelo solicitado, luego los respaldos configurados y solo entonces el principal configurado. Eso evita que los ids de modelo simples duplicados salten directamente de vuelta al proveedor predeterminado.

    Vea [Models](/es/concepts/models) y [Model failover](/es/concepts/model-failover).

  </Accordion>

  <Accordion title="¿Puedo usar GPT 5.5 para tareas diarias y Codex 5.5 para programación?">
    Sí. Trate la elección del modelo y la elección del tiempo de ejecución por separado:

    - **Agente de programación Codex nativo:** configure `agents.defaults.model.primary` en `openai/gpt-5.5`. Inicie sesión con `openclaw models auth login --provider openai` cuando desee autenticación de suscripción ChatGPT/Codex.
    - **Tareas directas de la API de OpenAI fuera del bucle del agente:** configure `OPENAI_API_KEY` para imágenes, incrustaciones, voz, tiempo real y otras superficies de la API de OpenAI que no son de agente.
    - **Autenticación por clave de API del agente OpenAI:** use `/model openai/gpt-5.5` con un perfil de clave de API `openai` ordenado.
    - **Sub-agentes:** enrute las tareas de programación a un agente centrado en Codex con su propio modelo `openai/gpt-5.5`.

    Vea [Models](/es/concepts/models) y [Slash commands](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo configuro el modo rápido para GPT 5.5?">
    Use un interruptor de sesión o una configuración predeterminada:

    - **Por sesión:** envíe `/fast on` mientras la sesión esté usando `openai/gpt-5.5`.
    - **Predeterminado por modelo:** establezca `agents.defaults.models["openai/gpt-5.5"].params.fastMode` en `true`.

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

    Para OpenAI, el modo rápido se asigna a `service_tier = "priority"` en las solicitudes nativas de Responses compatibles. El `/fast` de la sesión anula los valores predeterminados de configuración de beat.

    Consulte [Pensamiento y modo rápido](/es/tools/thinking) y [Modo rápido de OpenAI](/es/providers/openai#fast-mode).

  </Accordion>

  <Accordion title='¿Por qué veo "Model ... is not allowed" y luego no hay respuesta?'>
    Si `agents.defaults.models` está configurado, se convierte en la **lista de permitidos** para `/model` y cualquier
    anulación de sesión. Elegir un modelo que no esté en esa lista devuelve:

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    Ese error se devuelve **en lugar de** una respuesta normal. Solución: agregue el modelo exacto a
    `agents.defaults.models`, agregue un comodín de proveedor como `"provider/*": {}` para catálogos de proveedores dinámicos, elimine la lista de permitidos o elija un modelo de `/model list`.
    Si el comando también incluía `--runtime codex`, actualice primero la lista de permitidos y luego reintente
    el mismo comando `/model provider/model --runtime codex`.

  </Accordion>

  <Accordion title='¿Por qué veo "Modelo desconocido: minimax/MiniMax-M3"?'>
    Esto significa que el **proveedor no está configurado** (no se encontró ninguna configuración de proveedor de MiniMax ni perfil de autenticación), por lo que el modelo no se puede resolver.

    Lista de verificación de solución:

    1. Actualice a una versión actual de OpenClaw (o ejecute desde el código fuente `main`) y luego reinicie el gateway.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista autenticación de MiniMax en los perfiles de entorno/autenticación para que se pueda inyectar el proveedor coincidente
       (`MINIMAX_API_KEY` para `minimax`, `MINIMAX_OAUTH_TOKEN` u OAuth de MiniMax almacenado para `minimax-portal`).
    3. Use el ID exacto del modelo (distingue mayúsculas y minúsculas) para su ruta de autenticación:
       `minimax/MiniMax-M3`, `minimax/MiniMax-M2.7` o
       `minimax/MiniMax-M2.7-highspeed` para la configuración con clave de API, o
       `minimax-portal/MiniMax-M3`, `minimax-portal/MiniMax-M2.7` o
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
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "minimax" },
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
    - Ruteo por agente o use `/agent` para cambiar

    Docs: [Models](/es/concepts/models), [Multi-Agent Routing](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

  </Accordion>

  <Accordion title="¿Son opus / sonnet / gpt accesos directos integrados?">
    Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

    - `opus` → `anthropic/claude-opus-4-8`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite`

    Si establece su propio alias con el mismo nombre, prevalece su valor.

  </Accordion>

  <Accordion title="¿Cómo defino/anulo los atajos de modelos (alias)?">
    Los alias provienen de `agents.defaults.models.<modelId>.alias`. Ejemplo:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
          },
        },
      },
    }
    ```

    Luego `/model sonnet` (o `/<alias>` cuando esté soportado) se resuelve a ese ID de modelo.

  </Accordion>

  <Accordion title="¿Cómo agrego modelos de otros proveedores como OpenRouter o Z.AI?">
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

    Si haces referencia a un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave de API para el proveedor después de agregar un nuevo agente**

    Esto generalmente significa que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y se almacena en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Opciones de solución:

    - Ejecuta `openclaw agents add <id>` y configura la autenticación durante el asistente.
    - O copia solo los perfiles estáticos portátiles `api_key` / `token` del almacén de autenticación del agente principal al almacén del nuevo agente.
    - Para los perfiles de OAuth, inicia sesión desde el nuevo agente cuando necesite su propia cuenta; de lo contrario, OpenClaw puede leer a través del agente predeterminado/principal sin clonar los tokens de actualización.

    **No** reutilices `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

  </Accordion>
</AccordionGroup>

## Conmutación por error de modelos y "Fallo de todos los modelos"

<AccordionGroup>
  <Accordion title="¿Cómo funciona el conmutación por error?">
    La conmutación por error ocurre en dos etapas:

    1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
    2. **Respaldo del modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican tiempos de espera a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene limitaciones de velocidad o falla temporalmente.

    El cubo de limitación de velocidad incluye más que simples respuestas `429`. OpenClaw
    también trata mensajes como `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted`, y límites
    periódicos de la ventana de uso (`weekly/monthly limit reached`) como límites
    de velocidad dignos de conmutación por error.

    Algunas respuestas que parecen de facturación no son `402`, y algunas respuestas HTTP `402`
    también permanecen en ese cubo transitorio. Si un proveedor devuelve
    texto de facturación explícito en `401` o `403`, OpenClaw aún puede mantenerlo en
    el carril de facturación, pero los comparadores de texto específicos del proveedor permanecen limitados al
    proveedor que los posee (por ejemplo, OpenRouter `Key limit exceeded`). Si un mensaje `402`
    parece más bien un límite de gasto reintentable de ventana de uso u
    organización/espacio de trabajo (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw lo trata como
    `rate_limit`, no como una desactivación larga por facturación.

    Los errores de desbordamiento de contexto son diferentes: firmas como
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model`, o `ollama error: context length
    exceeded` permanecen en la ruta de compactación/reintento en lugar de avanzar el
    respaldo del modelo.

    El texto genérico de error del servidor es intencionalmente más estrecho que "cualquier cosa con
    unknown/error en él". OpenClaw trata formas transitorias limitadas al proveedor
    tales como `An unknown error occurred` simple de Anthropic, `Provider returned error` simple de OpenRouter,
    errores de razón de parada como `Unhandled stop reason:
    error`, JSON `api_error` con texto de servidor transitorio
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` como
    señales de tiempo de espera/sobrecarga dignas de conmutación por error cuando el contexto del proveedor
    coincide.
    El texto de respaldo interno genérico como `LLM request failed with an unknown
    error.` se mantiene conservador y no activa el respaldo del modelo por sí mismo.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó utilizar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para el mismo en el almacén de autenticación esperado.

    **Lista de verificación de soluciones:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno es cargada por el Gateway**
      - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta el Gateway mediante systemd/launchd, es posible que no la herede. Colóquela en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones de múltiples agentes significan que puede haber varios archivos `auth-profiles.json`.
    - **Verificación de cordura del estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de soluciones para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway
    no puede encontrarlo en su almacén de autenticación.

    - **Usar Claude CLI**
      - Ejecute `openclaw models auth login --provider anthropic --method cli --set-default` en el host del gateway.
    - **Si desea utilizar una clave de API en su lugar**
      - Coloque `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host del gateway**.
      - Limpie cualquier orden fijado que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando comandos en el host del gateway**
      - En el modo remoto, los perfiles de autenticación residen en la máquina del gateway, no en su portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó usar Google Gemini y falló?">
    Si la configuración de su modelo incluye Google Gemini como respaldo (o cambió a un atajo de Gemini), OpenClaw lo intentará durante la conmutación por error del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

    Solución: proporcione la autenticación de Google o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que la conmutación por error no enrute hacia allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Google Antigravity)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo de una transmisión abortada/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Claude de Google Antigravity. Si todavía aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

  </Accordion>
</AccordionGroup>

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/es/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones multicuenta)

<AccordionGroup>
  <Accordion title="¿Qué es un perfil de autenticación?">
    Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles residen en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Para inspeccionar los perfiles guardados sin volviar secretos, ejecute `openclaw models auth list` (opcionalmente `--provider <id>` o `--json`). Consulte [CLI de modelos](/es/cli/models#auth-profiles) para obtener más detalles.

  </Accordion>

  <Accordion title="¿Cuáles son los ID de perfil típicos?">
    OpenClaw usa ID con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe una identidad de correo electrónico)
    - `anthropic:<email>` para identidades OAuth
    - ID personalizados que elija (p. ej., `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se intenta primero?">
    Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; asigna IDs a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un **periodo de enfriamiento** breve (límites de frecuencia/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

    Los periodos de enfriamiento por límites de frecuencia pueden estar limitados al modelo. Un perfil que se está enfriando para un modelo todavía puede ser utilizable para un modelo hermano en el mismo proveedor, mientras que las ventanas de facturación/deshabilitado aún bloquean todo el perfil.

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

    Si un perfil almacenado se omite del orden explícito, el sondeo informa `excluded_by_auth_order` para ese perfil en lugar de intentarlo silenciosamente.

  </Accordion>

  <Accordion title="OAuth vs. clave de API: ¿cuál es la diferencia?">
    OpenClaw admite ambos:

    - **OAuth / inicio de sesión CLI** a menudo aprovecha el acceso por suscripción donde el proveedor lo admite. Para Anthropic, el backend de Claude CLI de OpenClaw usa Claude Code `claude -p`; Anthropic actualmente trata eso como uso del SDK de Agentes/programático, con un crédito mensual separado del SDK de Agentes a partir del 15 de junio de 2026.
    - **Las claves de API** usan facturación por token.

    El asistente admite explícitamente Anthropic Claude CLI, OpenAI Codex OAuth y claves de API.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Preguntas frecuentes](/es/help/faq) — las preguntas frecuentes principales
- [Preguntas frecuentes — inicio rápido y configuración de primera ejecución](/es/help/faq-first-run)
- [Selección de modelo](/es/concepts/model-providers)
- [Conmutación por error de modelo](/es/concepts/model-failover)
