---
summary: "Preguntas frecuentes: modelos predeterminados, selección, alias, cambio, conmutación por error y perfiles de autenticación"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "Preguntas frecuentes: modelos y autenticación"
sidebarTitle: "Preguntas frecuentes sobre modelos"
---

Preguntas y respuestas sobre modelos y perfiles de autenticación. Para la configuración, sesiones, puerta de enlace, canales y solución de problemas, consulte las [preguntas frecuentes](/es/help/faq) principales.

## Modelos: predeterminados, selección, alias, cambio

<AccordionGroup>
  <Accordion title='¿Cuál es el "modelo predeterminado"?'>
    El modelo predeterminado de OpenClaw es aquel que configures como:

    ```
    agents.defaults.model.primary
    ```

    Los modelos se referencian como `provider/model` (ejemplo: `openai/gpt-5.5` o `anthropic/claude-sonnet-4-6`). Si omite el proveedor, OpenClaw primero intenta un alias, luego una coincidencia única de proveedor configurado para esa identificación de modelo exacta, y solo luego recurre al proveedor predeterminado configurado como una ruta de compatibilidad obsoleta. Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un valor predeterminado obsoleto de un proveedor eliminado. Aún debe establecer `provider/model` de manera **explícita**.

  </Accordion>

  <Accordion title="¿Qué modelo recomienda?">
    **Predeterminado recomendado:** utilice el modelo más potente de la última generación disponible en su pila de proveedores.
    **Para agentes con herramientas habilitadas o entradas que no son de confianza:** priorice la potencia del modelo sobre el costo.
    **Para chat de rutina/bajo riesgo:** utilice modelos alternativos más económicos y enrute por función de agente.

    MiniMax tiene su propia documentación: [MiniMax](/es/providers/minimax) y
    [Modelos locales](/es/gateway/local-models).

    Regla general: utilice el **mejor modelo que pueda permitirse** para trabajo de alto riesgo y un modelo
    más económico para chat de rutina o resúmenes. Puede enrutar modelos por agente y usar subagentes para
    paralelizar tareas largas (cada subagente consume tokens). Consulte [Modelos](/es/concepts/models) y
    [Subagentes](/es/tools/subagents).

    Advertencia fuerte: los modelos más débiles/sobre-cuantizados son más vulnerables a la inyección de
    indicaciones y comportamientos inseguros. Consulte [Seguridad](/es/gateway/security).

    Más contexto: [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelos sin borrar mi configuración?">
    Use **comandos de modelo** o edite solo los campos **model**. Evite reemplazar la configuración completa.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - edite `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evite `config.apply` con un objeto parcial a menos que tenga la intención de reemplazar toda la configuración.
    Para ediciones RPC, inspeccione con `config.schema.lookup` primero y prefiera `config.patch`. La carga útil de búsqueda le proporciona la ruta normalizada, documentos/restricciones del esquema superficial y resúmenes de hijos inmediatos.
    para actualizaciones parciales.
    Si sobrescribió la configuración, restáurela desde una copia de seguridad o vuelva a ejecutar `openclaw doctor` para repararla.

    Documentación: [Modelos](/es/concepts/models), [Configurar](/es/cli/configure), [Configuración](/es/cli/config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autoalojados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la ruta más fácil para modelos locales.

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

    Nota de seguridad: los modelos más pequeños o fuertemente cuantizados son más vulnerables a la inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas. Si aún quieres modelos pequeños, activa el sandbox y listas de permitidos estrictas para herramientas.

    Documentación: [Ollama](/es/providers/ollama), [Local models](/es/gateway/local-models),
    [Model providers](/es/concepts/model-providers), [Security](/es/gateway/security),
    [Sandboxing](/es/gateway/sandboxing).

  </Accordion>

  <Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
    - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor.
    - Verifica la configuración actual de ejecución en cada puerta de enlace con `openclaw models status`.
    - Para agentes sensibles a la seguridad/con herramientas habilitadas, usa el modelo más fuerte de la última generación disponible.

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
    Sí. Trate la elección del modelo y la elección del tiempo de ejecución por separado:

    - **Agente de programación nativo de Codex:** establezca `agents.defaults.model.primary` en `openai/gpt-5.5`. Inicie sesión con `openclaw models auth login --provider openai-codex` cuando desee la autenticación de suscripción ChatGPT/Codex.
    - **Tareas directas de la API de OpenAI fuera del bucle del agente:** configure `OPENAI_API_KEY` para imágenes, incrustaciones, voz, tiempo real y otras superficies de la API de OpenAI que no son de agentes.
    - **Autenticación con clave API de agente de OpenAI:** use `/model openai/gpt-5.5` con un perfil de clave API `openai-codex` ordenado.
    - **Subagentes:** envíe las tareas de programación a un agente centrado en Codex con su propio modelo `openai/gpt-5.5`.

    Consulte [Modelos](/es/concepts/models) y [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo configuro el modo rápido para GPT 5.5?">
    Use un interruptor de sesión o una configuración predeterminada:

    - **Por sesión:** envíe `/fast on` mientras la sesión esté usando `openai/gpt-5.5`.
    - **Por defecto del modelo:** establezca `agents.defaults.models["openai/gpt-5.5"].params.fastMode` en `true`.

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

    Para OpenAI, el modo rápido se asigna a `service_tier = "priority"` en las solicitudes nativas de Responses admitidas. El `/fast` de la sesión anula los valores predeterminados de la configuración de latido.

    Consulte [Pensamiento y modo rápido](/es/tools/thinking) y [Modo rápido de OpenAI](/es/providers/openai#fast-mode).

  </Accordion>

  <Accordion title='¿Por qué veo "Model ... is not allowed" y luego ninguna respuesta?'>
    Si `agents.defaults.models` está configurado, se convierte en la **lista de permitidos** para `/model` y cualquier
    override de sesión. Elegir un modelo que no esté en esa lista devuelve:

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    Ese error se devuelve **en lugar de** una respuesta normal. Solución: añada el modelo exacto a
    `agents.defaults.models`, añada un comodín de proveedor como `"provider/*": {}` para catálogos de proveedores dinámicos, elimine la lista de permitidos, o elija un modelo de `/model list`.
    Si el comando también incluía `--runtime codex`, actualice la lista de permitidos primero y luego reintente
    el mismo comando `/model provider/model --runtime codex`.

  </Accordion>

  <Accordion title='¿Por qué veo "Unknown model: minimax/MiniMax-M2.7"?'>
    Esto significa que el **proveedor no está configurado** (no se encontró ninguna configuración de proveedor de MiniMax ni perfil de autenticación), por lo que no se puede resolver el modelo.

    Lista de verificación para solucionar:

    1. Actualice a una versión actual de OpenClaw (o ejecute desde el código fuente `main`) y luego reinicie la puerta de enlace.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista autenticación de MiniMax
       en perfiles de env/autenticación para que se pueda inyectar el proveedor coincidente
       (`MINIMAX_API_KEY` para `minimax`, `MINIMAX_OAUTH_TOKEN` u OAuth de MiniMax almacenado
       para `minimax-portal`).
    3. Utilice el id exacto del modelo (distingue mayúsculas y minúsculas) para su ruta de autenticación:
       `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed` para configuración de
       clave de API, o `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` para configuración de OAuth.
    4. Ejecute:

       ```bash
       openclaw models list
       ```

       y elija de la lista (o `/model list` en el chat).

    Consulte [MiniMax](/es/providers/minimax) y [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?">
    Sí. Use **MiniMax como predeterminado** y cambie de modelos **por sesión** cuando sea necesario.
    Los respaldos son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

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
    - Enrutamiento por agente o use `/agent` para cambiar

    Documentación: [Modelos](/es/concepts/models), [Enrutamiento Multiagente](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

  </Accordion>

  <Accordion title="¿Son opus / sonnet / gpt atajos integrados?">
    Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.5`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    Si establece su propio alias con el mismo nombre, su valor prevalecerá.

  </Accordion>

  <Accordion title="¿Cómo defino/sobrescribo los atajos de modelos (alias)?">
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

    Entonces `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve en ese ID de modelo.

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

    Si haces referencia a un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave de API para el proveedor después de añadir un nuevo agente**

    Esto generalmente significa que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y se almacena en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Opciones de solución:

    - Ejecuta `openclaw agents add <id>` y configura la autenticación durante el asistente.
    - O copia solo perfiles estáticos portátiles `api_key` / `token` del almacén de autenticación del agente principal al almacén de autenticación del nuevo agente.
    - Para perfiles OAuth, inicia sesión desde el nuevo agente cuando necesite su propia cuenta; de lo contrario, OpenClaw puede leer a través del agente predeterminado/principal sin clonar los tokens de actualización.

    **No** reutilices `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

  </Accordion>
</AccordionGroup>

## Conmutación por error de modelo (failover) y "All models failed"

<AccordionGroup>
  <Accordion title="¿Cómo funciona el failover?">
    El failover ocurre en dos etapas:

    1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
    2. **Conmutación por error de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican períodos de enfriamiento a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene limitaciones de tasa o fallas temporales.

    El grupo de límites de tasa incluye más que simples respuestas `429`. OpenClaw
    también trata mensajes como `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted` y límites
    periódicos de ventana de uso (`weekly/monthly limit reached`) como límites
    de tasa dignos de conmutación por error.

    Algunas respuestas que parecen de facturación no son `402`, y algunas respuestas HTTP `402`
    también permanecen en ese grupo transitorio. Si un proveedor devuelve
    texto de facturación explícito en `401` o `403`, OpenClaw puede mantenerlo en
    el carril de facturación, pero los comparadores de texto específicos del proveedor permanecen limitados al
    proveedor que los posee (por ejemplo OpenRouter `Key limit exceeded`). Si un mensaje `402`
    en cambio parece un límite de ventana de uso reintentable o
    límite de gasto de organización/espacio de trabajo (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw lo trata como
    `rate_limit`, no como una desactivación de facturación prolongada.

    Los errores de desbordamiento de contexto son diferentes: firmas como
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model` o `ollama error: context length
    exceeded` permanecen en la ruta de compactación/reintento en lugar de avanzar la
    conmutación por error de modelo.

    El texto de error genérico del servidor es intencionalmente más estrecho que "cualquier cosa con
    desconocido/error en él". OpenClaw sí trata formas transitorias con alcance de proveedor
    como `An unknown error occurred` desnudo de Anthropic, `Provider returned error` desnudo
    de OpenRouter, errores de razón de detención como `Unhandled stop reason:
    error`, JSON `api_error` con texto de servidor transitorio
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` como
    señales de tiempo de espera/sobrecarga dignas de conmutación por error cuando el contexto del
    proveedor coincide.
    El texto de conmutación por error interno genérico como `LLM request failed with an unknown
    error.` se mantiene conservador y no activa por sí solo la conmutación por error de modelo.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó usar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

    **Lista de verificación de soluciones:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno es cargada por el Gateway**
      - Si establece `ANTHROPIC_API_KEY` en su terminal pero ejecuta el Gateway a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones de múltiples agentes significan que puede haber múltiples archivos `auth-profiles.json`.
    - **Verificación de estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de soluciones para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway
    no puede encontrarlo en su almacén de autenticación.

    - **Usar Claude CLI**
      - Ejecute `openclaw models auth login --provider anthropic --method cli --set-default` en el host del gateway.
    - **Si desea usar una clave API en su lugar**
      - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host del gateway**.
      - Limpie cualquier orden fijada que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando comandos en el host del gateway**
      - En modo remoto, los perfiles de autenticación residen en la máquina gateway, no en su portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó Google Gemini y falló?">
    Si la configuración de su modelo incluye Google Gemini como alternativa (o si cambió a un atajo de Gemini), OpenClaw lo intentará durante la conmutación por error del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

    Solución: proporcione la autenticación de Google o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que la conmutación por error no enrute hacia allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Antigravedad de Google)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo provenientes de
    un flujo abortado/parcial). Antigravedad de Google requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Claude de Antigravedad de Google. Si todavía aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

  </Accordion>
</AccordionGroup>

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/es/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones de multicuenta)

<AccordionGroup>
  <Accordion title="¿Qué es un perfil de autenticación?">
    Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles viven en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Para inspeccionar los perfiles guardados sin volviar secretos, ejecute `openclaw models auth list` (opcionalmente `--provider <id>` o `--json`). Consulte [CLI de modelos](/es/cli/models#auth-profiles) para obtener más detalles.

  </Accordion>

  <Accordion title="¿Cuáles son los ID de perfil típicos?">
    OpenClaw utiliza ID con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe una identidad de correo electrónico)
    - `anthropic:<email>` para identidades de OAuth
    - ID personalizados que elija (p. ej., `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se prueba primero?">
    Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; asigna ID a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un corto periodo de **enfriamiento** (límites de tasa/tiempo de espera/fallos de autenticación) o en un estado más largo de **deshabilitado** (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

    Los periodos de enfriamiento por límites de tasa pueden estar limitados al modelo. Un perfil que se está enfriando
    para un modelo todavía puede ser utilizable para un modelo hermano en el mismo proveedor,
    mientras que las ventanas de facturación/deshabilitado siguen bloqueando todo el perfil.

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

    Para verificar qué se probará realmente, use:

    ```bash
    openclaw models status --probe
    ```

    Si un perfil almacenado se omite del orden explícito, el informe de prueba
    indica `excluded_by_auth_order` para ese perfil en lugar de intentarlo silenciosamente.

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
