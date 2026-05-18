---
summary: "CLI de modelos: list, set, aliases, fallbacks, scan, status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modelos"
sidebarTitle: "CLI de modelos"
---

<CardGroup cols={2}>
  <Card title="Conmutación por error de modelo" href="/es/concepts/model-failover">
    Rotación de perfiles de autenticación, periodos de enfriamiento y su interacción con las alternativas de reserva.
  </Card>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers">
    Descripción general rápida de proveedores y ejemplos.
  </Card>
  <Card title="Runtimes de agentes" href="/es/concepts/agent-runtimes">
    PI, Codex y otros runtimes de bucle de agente.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults">
    Claves de configuración de modelos.
  </Card>
</CardGroup>

Las referencias de modelos (model refs) eligen un proveedor y un modelo. Por lo general, no eligen el runtime de bajo nivel del agente. Las referencias de agente de OpenAI son la excepción principal: `openai/gpt-5.5` se ejecuta a través del runtime del servidor de aplicaciones de Codex por defecto en el proveedor oficial de OpenAI. Las anulaciones explícitas de runtime pertenecen a la política del proveedor/modelo, no a todo el agente o sesión. En el modo de runtime de Codex, la referencia `openai/gpt-*` no implica facturación con clave de API; la autenticación puede provenir de una cuenta de Codex o de un perfil de autenticación `openai-codex`. Consulte [Runtimes de agentes](/es/concepts/agent-runtimes).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

<Steps>
  <Step title="Modelo principal">`agents.defaults.model.primary` (o `agents.defaults.model`).</Step>
  <Step title="Alternativas (Fallbacks)">`agents.defaults.model.fallbacks` (en orden).</Step>
  <Step title="Conmutación por error de autenticación del proveedor">La conmutación por error de autenticación ocurre dentro de un proveedor antes de pasar al siguiente modelo.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Superficies de modelos relacionadas">
    - `agents.defaults.models` es la lista de permitidos/catálogo de modelos que OpenClaw puede usar (más alias). Use las entradas `provider/*` para limitar los proveedores visibles manteniendo el descubrimiento de proveedores dinámico.
    - `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes.
    - `agents.defaults.pdfModel` es usado por la herramienta `pdf`. Si se omite, la herramienta vuelve a `agents.defaults.imageModel` y luego al modelo predeterminado/resuelto de la sesión.
    - `agents.defaults.imageGenerationModel` es usado por la capacidad de generación de imágenes compartida. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual, luego los proveedores de generación de imágenes registrados restantes en orden de ID de proveedor. Si establece un proveedor/modelo específico, también configure la clave de autenticación/API de ese proveedor.
    - `agents.defaults.musicGenerationModel` es usado por la capacidad de generación de música compartida. Si se omite, `music_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual, luego los proveedores de generación de música registrados restantes en orden de ID de proveedor. Si establece un proveedor/modelo específico, también configure la clave de autenticación/API de ese proveedor.
    - `agents.defaults.videoGenerationModel` es usado por la capacidad de generación de videos compartida. Si se omite, `video_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual, luego los proveedores de generación de videos registrados restantes en orden de ID de proveedor. Si establece un proveedor/modelo específico, también configure la clave de autenticación/API de ese proveedor.
    - Los valores predeterminados por agente pueden anular `agents.defaults.model` a través de `agents.list[].model` más enlaces (ver [Enrutamiento multiagente](/es/concepts/multi-agent)).

  </Accordion>
</AccordionGroup>

## Fuente de selección y comportamiento de respaldo

El mismo `provider/model` puede significar diferentes cosas dependiendo de dónde provenga:

- Los valores predeterminados configurados (`agents.defaults.model.primary` y los principales específicos del agente) son el punto de partida normal y usan `agents.defaults.model.fallbacks`.
- Las selecciones de conmutación por error automática son estados de recuperación temporales. Se almacenan con `modelOverrideSource: "auto"` para que los turnos posteriores puedan seguir utilizando la cadena de reserva sin sondear un principal defectuoso conocido cada vez; OpenClaw sondea periódicamente el principal original nuevamente, borra la selección automática cuando se recupera y anuncia las transiciones de conmutación por error/recuperación una vez por cambio de estado.
- Las selecciones de sesión de usuario son exactas. `/model`, el selector de modelos, `session_status(model=...)` y `sessions.patch` almacenan `modelOverrideSource: "user"`; si ese proveedor/modelo seleccionado es inalcanzable, OpenClaw falla visiblemente en lugar de pasar a otro modelo configurado.
- Cron `--model` / payload `model` es un primario por trabajo. Todavía usa las conmutaciones por error configuradas a menos que el trabajo proporcione un payload `fallbacks` explícito (use `fallbacks: []` para una ejecución cron estricta).
- Los selectores de modelo predeterminado y lista de permitidos de la CLI respetan `models.mode: "replace"` al listar `models.providers.*.models` explícitos en lugar de cargar el catálogo integrado completo.
- El selector de modelos de la Interfaz de Control solicita a la Gateway su vista de modelo configurada: `agents.defaults.models` cuando está presente, incluyendo entradas `provider/*` de todo el proveedor; de lo contrario, `models.providers.*.models` explícitos más proveedores con autenticación utilizable. El catálogo integrado completo se reserva para vistas de navegación explícitas como `models.list` con `view: "all"` o `openclaw models list --all`.

## Política rápida de modelos

- Establezca su primario en el modelo más potente de última generación disponible para usted.
- Use las conmutaciones por error para tareas sensibles al costo/latencia y chats de menor riesgo.
- Para agentes con herramientas habilitadas o entradas no confiables, evite los niveles de modelos más antiguos/débiles.

## Incorporación (recomendado)

Si no desea editar la configuración manualmente, ejecute la incorporación:

```bash
openclaw onboard
```

Puede configurar el modelo y la autenticación para proveedores comunes, incluida la **suscripción OpenAI Code (Codex)** (OAuth) y **Anthropic** (clave API o Claude CLI).

## Claves de configuración (resumen)

- `agents.defaults.model.primary` y `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` y `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` y `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` y `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` y `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (lista blanca + alias + parámetros del proveedor + `provider/*` entradas dinámicas de proveedor)
- `models.providers` (proveedores personalizados escritos en `models.json`)

<Note>
Las referencias de modelo se normalizan a minúsculas. Los alias de proveedor como `z.ai/*` se normalizan a `zai/*`.

Los ejemplos de configuración de proveedores (incluido OpenCode) se encuentran en [OpenCode](/es/providers/opencode).

</Note>

### Ediciones seguras de la lista blanca

Use escrituras aditivas al actualizar `agents.defaults.models` manualmente:

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Reglas de protección contra sobrescritura">
    `openclaw config set` protege los mapas de modelo/proveedor de sobrescrituras accidentales. Se rechaza una asignación de objeto simple a `agents.defaults.models`, `models.providers` o `models.providers.<id>.models` cuando esto eliminaría las entradas existentes. Use `--merge` para cambios aditivos; use `--replace` solo cuando el valor proporcionado deba convertirse en el valor objetivo completo.

    La configuración interactiva del proveedor y `openclaw configure --section model` también fusionan las selecciones con ámbito de proveedor en la lista blanca existente, por lo que agregar Codex, Ollama u otro proveedor no elimina las entradas de modelo no relacionadas. Configure preserva un `agents.defaults.model.primary` existente cuando se vuelve a aplicar la autenticación del proveedor. Los comandos explícitos de configuración de valores predeterminados, como `openclaw models auth login --provider <id> --set-default` y `openclaw models set <model>`, aún reemplazan `agents.defaults.model.primary`.

  </Accordion>
</AccordionGroup>

## "Modelo no permitido" (y por qué se detienen las respuestas)

Si `agents.defaults.models` está configurado, se convierte en la **lista blanca** para `/model` y para las anulaciones de sesión. Cuando un usuario selecciona un modelo que no está en esa lista blanca, OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
Esto sucede **antes** de que se genere una respuesta normal, por lo que el mensaje puede parecer que "no respondió". La solución es:

- Añadir el modelo a `agents.defaults.models`, o
- Limpiar la lista blanca (eliminar `agents.defaults.models`), o
- Elegir un modelo de `/model list`.

</Warning>

Cuando el comando rechazado incluía una anulación en tiempo de ejecución como `/model openai/gpt-5.5 --runtime codex`, corrija primero la lista blanca y luego reintente el mismo comando `/model ... --runtime ...`. Para la ejecución nativa de Codex, el modelo seleccionado sigue siendo `openai/gpt-5.5`; el tiempo de ejecución `codex` selecciona el arnés y usa la autenticación de Codex por separado.

Para modelos locales/GGUF, guarde la referencia completa con el prefijo del proveedor en la lista blanca,
por ejemplo `ollama/gemma4:26b`, `lmstudio/Gemma4-26b-a4-it-gguf`, o el
proveedor/modelo exacto que se muestra en `openclaw models list --provider <provider>`.
Los nombres de archivo locales simples o los nombres para mostrar no son suficientes cuando la lista blanca está
activa.

Si desea limitar los proveedores sin enumerar manualmente cada modelo, añada
entradas `provider/*` a `agents.defaults.models`:

```json5
{
  agents: {
    defaults: {
      models: {
        "openai-codex/*": {},
        "vllm/*": {},
      },
    },
  },
}
```

Con esa política, `/model`, `/models` y los selectores de modelos muestran el catálogo
descubierto solo para esos proveedores. Los modelos nuevos de los proveedores seleccionados pueden
aparecer sin editar la lista blanca. Las entradas exactas de `provider/model` se pueden mezclar
con entradas `provider/*` cuando necesita un modelo específico de otro proveedor.

Ejemplo de configuración de lista blanca:

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4-6" },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
}
```

## Cambiar de modelos en el chat (`/model`)

Puede cambiar de modelos para la sesión actual sin reiniciar:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="Comportamiento del selector">
    - `/model` (y `/model list`) es un selector numérico compacto (familia de modelos + proveedores disponibles).
    - En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso de envío.
    - En Telegram, las selecciones del selector `/models` están limitadas a la sesión; no cambian el valor predeterminado persistente del agente en `openclaw.json`.
    - `/models add` está obsoleto y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat.
    - `/model <#>` selecciona de ese selector.

  </Accordion>
  <Accordion title="Persistencia y cambio en vivo">
    - `/model` guarda la nueva selección de sesión inmediatamente.
    - Si el agente está inactivo, la siguiente ejecución usa el nuevo modelo de inmediato.
    - Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo reinicia en el nuevo modelo en un punto de reintento limpio.
    - Si la actividad de herramientas o la salida de respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
    - Una referencia `/model` seleccionada por el usuario es estricta para esa sesión: si el proveedor/modelo seleccionado es inalcanzable, la respuesta falla visiblemente en lugar de responder silenciosamente desde `agents.defaults.model.fallbacks`. Esto es diferente de los valores predeterminados configurados y los principales de trabajos programados, que aún pueden usar cadenas de respaldo.
    - `/model status` es la vista detallada (candidatos de autenticación y, cuando está configurado, punto de conexión del proveedor `baseUrl` + modo `api`).

  </Accordion>
  <Accordion title="Análisis de referencias">
    - Las referencias de modelos se analizan dividiendo por el **primer** `/`. Use `provider/model` al escribir `/model <ref>`.
    - Si el ID del modelo en sí contiene `/` (estilo OpenRouter), debe incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
    - Si omite el proveedor, OpenClaw resuelve la entrada en este orden:
      1. coincidencia de alias
      2. coincidencia única de proveedor configurado para esa ID de modelo sin prefijo exacta
      3. alternativa obsoleta al proveedor predeterminado configurado — si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre en su lugar al primer proveedor/modelo configurado para evitar mostrar un predeterminado obsoleto de un proveedor eliminado.
  </Accordion>
</AccordionGroup>

Comportamiento/configuración completa de comandos: [Comandos de barra](/es/tools/slash-commands).

## Comandos CLI

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models` (sin subcomando) es un atajo para `models status`.

### `models list`

Muestra los modelos configurados/disponibles para autenticación de manera predeterminada. Indicadores útiles:

<ParamField path="--all" type="boolean">
  Catálogo completo. Incluye filas estáticas del catálogo propiedad del proveedor incluidas antes de que se configure la autenticación, para que las vistas de solo descubrimiento puedan mostrar modelos que no están disponibles hasta que agregue las credenciales del proveedor coincidentes.
</ParamField>
<ParamField path="--local" type="boolean">
  Solo proveedores locales.
</ParamField>
<ParamField path="--provider <id>" type="string">
  Filtrar por ID de proveedor, por ejemplo `moonshot`. No se aceptan las etiquetas de visualización de los selectores interactivos.
</ParamField>
<ParamField path="--plain" type="boolean">
  Un modelo por línea.
</ParamField>
<ParamField path="--json" type="boolean">
  Salida legible por máquina.
</ParamField>

### `models status`

Muestra el modelo principal resuelto, los modelos alternativos, el modelo de imagen y un resumen de autenticación de los proveedores configurados. También muestra el estado de expiración de OAuth para los perfiles encontrados en el almacén de autenticación (avisa por defecto dentro de las 24 horas). `--plain` imprime solo el modelo principal resuelto.

<AccordionGroup>
  <Accordion title="Comportamiento de autenticación y sondeo">
    - El estado de OAuth siempre se muestra (y se incluye en la salida de `--json`). Si un proveedor configurado no tiene credenciales, `models status` imprime una sección **Missing auth** (Falta autenticación).
    - El JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers` (autenticación efectiva por proveedor, incluyendo credenciales respaldadas por variables de entorno). `auth.oauth` es solo el estado de salud del perfil del almacén de autenticación; los proveedores solo de variables de entorno no aparecen allí.
    - Use `--check` para automatización (salida `1` cuando falta o ha expirado, `2` cuando está por expirar).
    - Use `--probe` para verificaciones de autenticación en vivo; las filas de sondeo pueden provenir de perfiles de autenticación, credenciales de variables de entorno o `models.json`.
    - Si un `auth.order.<provider>` explícito omite un perfil almacenado, el sondeo informa `excluded_by_auth_order` en lugar de intentarlo. Si existe autenticación pero no se puede resolver ningún modelo sondeable para ese proveedor, el sondeo informa `status: no_model`.

  </Accordion>
</AccordionGroup>

<Note>La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser las más predecibles; también se admiten la reutilización de Claude CLI y los perfiles existentes de OAuth/token de Anthropic.</Note>

Ejemplo (Claude CLI):

```bash
claude auth login
openclaw models status
```

## Escaneo (modelos gratuitos de OpenRouter)

`openclaw models scan` inspecciona el **catálogo de modelos gratuitos** de OpenRouter y opcionalmente puede sondear modelos para verificar compatibilidad con herramientas e imágenes.

<ParamField path="--no-probe" type="boolean">
  Omitir sondas en vivo (solo metadatos).
</ParamField>
<ParamField path="--min-params <b>" type="number">
  Tamaño mínimo de parámetros (miles de millones).
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  Omitir modelos antiguos.
</ParamField>
<ParamField path="--provider <name>" type="string">
  Filtro de prefijo del proveedor.
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  Tamaño de la lista de respaldo.
</ParamField>
<ParamField path="--set-default" type="boolean">
  Establecer `agents.defaults.model.primary` a la primera selección.
</ParamField>
<ParamField path="--set-image" type="boolean">
  Establecer `agents.defaults.imageModel.primary` a la primera selección de imagen.
</ParamField>

<Note>
  El catálogo de `/models` de OpenRouter es público, por lo que los escaneos de solo metadatos pueden listar candidatos gratuitos sin una clave. Las sondas y la inferencia aún requieren una clave de API de OpenRouter (desde perfiles de autenticación o `OPENROUTER_API_KEY`). Si no hay una clave disponible, `openclaw models scan` recurre a una salida de solo metadatos y deja la configuración sin
  cambios. Use `--no-probe` para solicitar el modo de solo metadatos explícitamente.
</Note>

Los resultados del escaneo se clasifican por:

1. Soporte de imágenes
2. Latencia de herramientas
3. Tamaño del contexto
4. Recuento de parámetros

Entrada:

- Lista de `/models` de OpenRouter (filtro `:free`)
- Las sondas en vivo requieren una clave de API de OpenRouter de perfiles de autenticación o `OPENROUTER_API_KEY` (consulte [Variables de entorno](/es/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de solicitud/sonda: `--timeout`, `--concurrency`

Cuando las sondas en vivo se ejecutan en un TTY, puede seleccionar respaldos de forma interactiva. En modo no interactivo, pase `--yes` para aceptar los valores predeterminados. Los resultados solo de metadatos son informativos; `--set-default` y `--set-image` requieren sondas en vivo, por lo que OpenClaw no configura un modelo OpenRouter sin clave que no se pueda utilizar.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` bajo el directorio del agente (predeterminado `~/.openclaw/agents/<agentId>/agent/models.json`). Este archivo se fusiona de forma predeterminada a menos que `models.mode` se establezca en `replace`.

<AccordionGroup>
  <Accordion title="Precedencia del modo de fusión">
    Precedencia del modo de fusión para IDs de proveedores coincidentes:

    - Un `baseUrl` no vacío ya presente en el `models.json` del agente tiene prioridad.
    - Un `apiKey` no vacío en el `models.json` del agente tiene prioridad solo cuando ese proveedor no es administrado por SecretRef en el contexto de configuración/perfil de autenticación actual.
    - Los valores `apiKey` del proveedor administrados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
    - Los valores de encabezado del proveedor administrados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
    - Un `apiKey`/`baseUrl` de agente vacío o que falta recurre a la configuración `models.providers`.
    - Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

  </Accordion>
</AccordionGroup>

<Note>La persistencia de marcadores tiene autoridad de origen: OpenClaw escribe marcadores desde la instantánea de configuración de origen activa (antes de la resolución), no desde los valores secretos de tiempo de ejecución resueltos. Esto se aplica siempre que OpenClaw regenera `models.json`, incluidas las rutas impulsadas por comandos como `openclaw agent`.</Note>

## Relacionado

- [Runtimes de agente](/es/concepts/agent-runtimes) — PI, Codex y otros runtimes de bucle de agente
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) — claves de configuración del modelo
- [Generación de imágenes](/es/tools/image-generation) — configuración del modelo de imagen
- [Conmutación por error de modelo](/es/concepts/model-failover) — cadenas de respaldo
- [Proveedores de modelos](/es/concepts/model-providers) — enrutamiento y autenticación del proveedor
- [Generación de música](/es/tools/music-generation) — configuración del modelo de música
- [Generación de video](/es/tools/video-generation) — configuración del modelo de video
