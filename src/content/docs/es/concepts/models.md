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
  <Card title="Entornos de ejecución del agente" href="/es/concepts/agent-runtimes">
    OpenClaw, Codex y otros entornos de ejecución de bucle de agente.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults">
    Claves de configuración de modelos.
  </Card>
</CardGroup>

Las referencias de modelos eligen un proveedor y un modelo. Por lo general, no eligen el entorno de ejecución del agente de bajo nivel. Las referencias de agente de OpenAI son la excepción principal: `openai/gpt-5.5` se ejecuta a través del entorno de ejecución del servidor de aplicaciones de Codex de forma predeterminada en el proveedor oficial de OpenAI. Las referencias de Copilot de suscripción (`github-copilot/*`) adicionalmente pueden optar por el entorno de ejecución del agente de GitHub Copilot incluido; esa ruta permanece explícita (sin alternancia `auto`). Las anulaciones explícitas del entorno de ejecución pertenecen a la política del proveedor/modelo, no a todo el agente o sesión. En el modo de entorno de ejecución de Codex, la referencia `openai/gpt-*` no implica facturación con clave de API; la autenticación puede provenir de una cuenta de Codex o de un perfil de autenticación `openai-codex`. Consulte [Entornos de ejecución del agente](/es/concepts/agent-runtimes) y [Entorno de ejecución del agente de GitHub Copilot](/es/plugins/copilot).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

<Steps>
  <Step title="Modelo principal">`agents.defaults.model.primary` (o `agents.defaults.model`).</Step>
  <Step title="Alternativas">`agents.defaults.model.fallbacks` (en orden).</Step>
  <Step title="Conmutación por error de autenticación del proveedor">La conmutación por error de autenticación ocurre dentro de un proveedor antes de pasar al siguiente modelo.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Superficies de modelos relacionadas">
    - `agents.defaults.models` es la lista de permitidos/catálogo de modelos que OpenClaw puede usar (más alias). Usa las entradas `provider/*` para limitar los proveedores visibles mientras mantienes el descubrimiento de proveedores dinámico.
    - `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes.
    - `agents.defaults.pdfModel` es usado por la herramienta `pdf`. Si se omite, la herramienta vuelve a `agents.defaults.imageModel` y luego al modelo de sesión/predeterminado resuelto.
    - `agents.defaults.imageGenerationModel` es usado por la capacidad compartida de generación de imágenes. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Intenta primero el proveedor predeterminado actual y luego los proveedores de generación de imágenes registrados restantes en orden de ID de proveedor. Si configuras un proveedor/modelo específico, también configura la clave de autenticación/API de ese proveedor.
    - `agents.defaults.musicGenerationModel` es usado por la capacidad compartida de generación de música. Si se omite, `music_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Intenta primero el proveedor predeterminado actual y luego los proveedores de generación de música registrados restantes en orden de ID de proveedor. Si configuras un proveedor/modelo específico, también configura la clave de autenticación/API de ese proveedor.
    - `agents.defaults.videoGenerationModel` es usado por la capacidad compartida de generación de video. Si se omite, `video_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Intenta primero el proveedor predeterminado actual y luego los proveedores de generación de video registrados restantes en orden de ID de proveedor. Si configuras un proveedor/modelo específico, también configura la clave de autenticación/API de ese proveedor.
    - Los valores predeterminados por agente pueden anular `agents.defaults.model` mediante `agents.list[].model` más enlaces (ver [Enrutamiento multiagente](/es/concepts/multi-agent)).

  </Accordion>
</AccordionGroup>

## Fuente de selección y comportamiento de respaldo

El mismo `provider/model` puede significar cosas diferentes dependiendo de dónde provenga:

- Los valores predeterminados configurados (`agents.defaults.model.primary` y principales específicos del agente) son el punto de partida normal y usan `agents.defaults.model.fallbacks`.
- Las selecciones de conmutación por error automática son un estado de recuperación temporal. Se almacenan con `modelOverrideSource: "auto"` para que los turnos posteriores puedan seguir usando la cadena de respaldo sin sondear un primario defectuoso conocido cada vez; OpenClaw sondea periódicamente el primario original nuevamente, borra la selección automática cuando se recupera y anuncia las transiciones de conmutación por error/recuperación una vez por cada cambio de estado.
- Las selecciones de sesión de usuario son exactas. `/model`, el selector de modelo, `session_status(model=...)` y `sessions.patch` almacenan `modelOverrideSource: "user"`; si ese proveedor/modelo seleccionado es inalcanzable, OpenClaw falla visiblemente en lugar de pasar a otro modelo configurado.
- Cambiar `agents.defaults.model.primary` no reescribe las selecciones de sesión existentes. Si el estado indica `This session is pinned to X; config primary Y will apply to new/unpinned sessions.`, cambie la sesión actual con `/model Y` o borre el estado obsoleto de la sesión con `/reset`.
- Cron `--model` / payload `model` es un primario por trabajo. Todavía usa las conmutaciones por error configuradas a menos que el trabajo proporcione un `fallbacks` de carga útil explícito (use `fallbacks: []` para una ejecución cron estricta).
- Los selectores de modelo predeterminado y lista de permitidos de la CLI respetan `models.mode: "replace"` al listar `models.providers.*.models` explícitos en lugar de cargar el catálogo integrado completo.
- El selector de modelo de la interfaz de usuario de control le pide a la Gateway su vista de modelo configurada: `agents.defaults.models` cuando está presente, incluidas las entradas `provider/*` de todo el proveedor; de lo contrario, `models.providers.*.models` explícitos más proveedores con autenticación utilizable. El catálogo integrado completo se reserva para vistas de exploración explícitas como `models.list` con `view: "all"` o `openclaw models list --all`.

## Política rápida de modelos

- Establezca su modelo principal en el modelo de última generación más fuerte disponible para usted.
- Use respaldos para tareas sensibles al costo/latencia y chat de menor riesgo.
- Para agentes con herramientas activadas o entradas que no son de confianza, evite los niveles de modelos más antiguos/débiles.

## Incorporación (recomendado)

Si no desea editar la configuración manualmente, ejecute la incorporación:

```bash
openclaw onboard
```

Puede configurar el modelo + autenticación para proveedores comunes, incluida la **suscripción de OpenAI Code (Codex)** (OAuth) y **Anthropic** (clave API o Claude CLI).

## Claves de configuración (descripción general)

- `agents.defaults.model.primary` y `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` y `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` y `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` y `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` y `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (lista blanca + alias + parámetros del proveedor + `provider/*` entradas dinámicas de proveedor)
- `models.providers` (proveedores personalizados escritos en `models.json`)

<Note>
Las referencias de modelos se normalizan a minúsculas. Los IDs de proveedor son, por lo demás, exactos; utilice el
ID de proveedor anunciado por el complemento.

Los ejemplos de configuración de proveedores (incluido OpenCode) se encuentran en [OpenCode](/es/providers/opencode).

</Note>

### Ediciones seguras de lista blanca

Use escrituras aditivas al actualizar `agents.defaults.models` manualmente:

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Reglas de protección contra sobrescritura">
    `openclaw config set` protege los mapas de modelo/proveedor de sobrescrituras accidentales. Una asignación de objeto simple a `agents.defaults.models`, `models.providers` o `models.providers.<id>.models` se rechaza cuando elimine entradas existentes. Use `--merge` para cambios aditivos; use `--replace` solo cuando el valor proporcionado deba convertirse en el valor objetivo completo.

    La configuración interactiva del proveedor y `openclaw configure --section model` también fusionan las selecciones con alcance de proveedor en la lista blanca existente, por lo que agregar Codex, Ollama u otro proveedor no elimina las entradas de modelos no relacionadas. Configure preserva un `agents.defaults.model.primary` existente cuando se vuelve a aplicar la autenticación del proveedor. Los comandos explícitos de configuración predeterminada, como `openclaw models auth login --provider <id> --set-default` y `openclaw models set <model>` , aún reemplazan `agents.defaults.model.primary`.

  </Accordion>
</AccordionGroup>

## "El modelo no está permitido" (y por qué se detienen las respuestas)

Si `agents.defaults.models` está configurado, se convierte en la **lista blanca** para `/model` y para las anulaciones de sesión. Cuando un usuario selecciona un modelo que no está en esa lista blanca, OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
Esto sucede **antes** de que se genere una respuesta normal, por lo que el mensaje puede parecer que "no respondió". La solución es:

- Agregar el modelo a `agents.defaults.models`, o
- Borrar la lista blanca (eliminar `agents.defaults.models`), o
- Elegir un modelo de `/model list`.

</Warning>

Cuando el comando rechazado incluía una anulación de tiempo de ejecución como `/model openai/gpt-5.5 --runtime codex`, corrija primero la lista de permitidos y luego reintente el mismo comando `/model ... --runtime ...`. Para la ejecución nativa de Codex, el modelo seleccionado sigue siendo `openai/gpt-5.5`; el tiempo de ejecución `codex` selecciona el arnés y utiliza la autenticación de Codex por separado.

Para modelos locales/GGUF, guarde la referencia completa con prefijo de proveedor en la lista de permitidos,
por ejemplo `ollama/gemma4:26b`, `lmstudio/Gemma4-26b-a4-it-gguf`, o el
proveedor/modelo exacto que se muestra en `openclaw models list --provider <provider>`.
Los nombres de archivo locales simples o los nombres para mostrar no son suficientes cuando la lista de permitidos está
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

Con esa política, `/model`, `/models` y los selectores de modelo muestran el catálogo
descubierto solo para esos proveedores. Los nuevos modelos de los proveedores seleccionados pueden
aparecer sin editar la lista de permitidos. Las entradas exactas `provider/model` se pueden mezclar
con entradas `provider/*` cuando necesita un modelo específico de otro proveedor.

Configuración de ejemplo de lista de permitidos:

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

## Cambiar de modelo en el chat (`/model`)

Puede cambiar de modelo para la sesión actual sin reiniciar:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="Comportamiento del selector">
    - `/model` (y `/model list`) es un selector numérico compacto (familia de modelo + proveedores disponibles).
    - En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo más un paso de envío.
    - En Telegram, las selecciones del selector `/models` tienen ámbito de sesión; no cambian el valor predeterminado persistente del agente en `openclaw.json`.
    - `/models add` está obsoleto y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat.
    - `/model <#>` selecciona desde ese selector.

  </Accordion>
  <Accordion title="Persistencia y cambio en vivo">
    - `/model` guarda inmediatamente la nueva selección de la sesión.
    - Si el agente está inactivo, la siguiente ejecución usa el nuevo modelo de inmediato.
    - Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintento limpio.
    - Si la actividad de herramientas o la salida de la respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
    - Una referencia `/model` seleccionada por el usuario es estricta para esa sesión: si el proveedor/modelo seleccionado es inalcanzable, la respuesta falla visiblemente en lugar de responder silenciosamente desde `agents.defaults.model.fallbacks`. Esto es diferente de los valores predeterminados configurados y los principales de trabajos cron, que aún pueden usar cadenas de respaldo.
    - `/model status` es la vista detallada (candidatos de autenticación y, cuando está configurado, endpoint del proveedor `baseUrl` + modo `api`).

  </Accordion>
  <Accordion title="Análisis de referencias">
    - Las referencias de modelos se analizan dividiendo en el **primer** `/`. Use `provider/model` al escribir `/model <ref>`.
    - Si el ID del modelo en sí contiene `/` (estilo OpenRouter), debe incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
    - Si omite el proveedor, OpenClaw resuelve la entrada en este orden:
      1. coincidencia de alias
      2. coincidencia única de proveedor configurado para ese id de modelo sin prefijo exacto
      3. respaldo obsoleto al proveedor predeterminado configurado; si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw en su lugar vuelve al primer proveedor/modelo configurado para evitar mostrar un valor predeterminado obsoleto de proveedor eliminado.
  </Accordion>
</AccordionGroup>

Comportamiento/configuración completa de comandos: [Slash commands](/es/tools/slash-commands).

## Comandos de CLI

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

`openclaw models` (sin subcomando) es un acceso directo para `models status`.

### `models list`

Muestra los modelos configurados/disponibles para autenticación de forma predeterminada. Marcadores útiles:

<ParamField path="--all" type="boolean">
  Catálogo completo. Incluye filas estáticas del catálogo de los proveedores incluidos antes de que se configure la autenticación, por lo que las vistas de solo descubrimiento pueden mostrar modelos que no están disponibles hasta que añadas las credenciales del proveedor coincidentes.
</ParamField>
<ParamField path="--local" type="boolean">
  Solo proveedores locales.
</ParamField>
<ParamField path="--provider <id>" type="string">
  Filtrar por id de proveedor, por ejemplo `moonshot`. No se aceptan las etiquetas de visualización de los selectores interactivos.
</ParamField>
<ParamField path="--plain" type="boolean">
  Un modelo por línea.
</ParamField>
<ParamField path="--json" type="boolean">
  Salida legible por máquina.
</ParamField>

### `models status`

Muestra el modelo principal resuelto, los modelos alternativos, el modelo de imágenes y un resumen de autenticación de los proveedores configurados. También muestra el estado de expiración de OAuth para los perfiles encontrados en el almacén de autenticación (avisa por defecto dentro de las 24 h). `--plain` imprime solo el modelo principal resuelto.

<AccordionGroup>
  <Accordion title="Auth and probe behavior">
    - El estado de OAuth siempre se muestra (y se incluye en la salida de `--json`). Si un proveedor configurado no tiene credenciales, `models status` imprime una sección **Missing auth** (Autenticación faltante).
    - El JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers` (autenticación efectiva por proveedor, incluidas las credenciales respaldadas por variables de entorno). `auth.oauth` es solo el estado de salud del perfil del almacén de autenticación; los proveedores solo de entorno no aparecen allí.
    - Use `--check` para automatización (salida `1` cuando falte o haya caducado, `2` cuando esté por caducar).
    - Use `--probe` para comprobaciones de autenticación en vivo; las filas de sondeo pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
    - Si un `auth.order.<provider>` explícito omite un perfil almacenado, el sondeo informa `excluded_by_auth_order` en lugar de intentarlo. Si existe autenticación pero no se puede resolver ningún modelo sondeable para ese proveedor, el sondeo informa `status: no_model`.

  </Accordion>
</AccordionGroup>

<Note>La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las claves API suelen ser las más predecibles; también se admiten la reutilización de Claude CLI y los perfiles de OAuth/token existentes de Anthropic.</Note>

Ejemplo (Claude CLI):

```bash
claude auth login
openclaw models status
```

## Escaneo (modelos gratuitos de OpenRouter)

`openclaw models scan` inspecciona el **catálogo de modelos gratuitos** de OpenRouter y, opcionalmente, puede sondear modelos para comprobar la compatibilidad con herramientas e imágenes.

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
  Filtro de prefijo de proveedor.
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
  El catálogo `/models` de OpenRouter es público, por lo que los escaneos de solo metadatos pueden listar candidatos gratuitos sin una clave. El sondeo y la inferencia aún requieren una clave de API de OpenRouter (de perfiles de autenticación o `OPENROUTER_API_KEY`). Si no hay una clave disponible, `openclaw models scan` recurre a una salida de solo metadatos y deja la configuración sin cambios.
  Use `--no-probe` para solicitar explícitamente el modo de solo metadatos.
</Note>

Los resultados del escaneo se clasifican por:

1. Soporte de imágenes
2. Latencia de herramientas
3. Tamaño del contexto
4. Recuento de parámetros

Entrada:

- OpenRouter `/models` lista (filtro `:free`)
- Los sondeos en vivo requieren la clave API de OpenRouter de los perfiles de autenticación o `OPENROUTER_API_KEY` (consulte [Environment variables](/es/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de solicitud/sondeo: `--timeout`, `--concurrency`

Cuando las sondas en vivo se ejecutan en un TTY, puedes seleccionar los respaldos de forma interactiva. En modo no interactivo, pasa `--yes` para aceptar los valores predeterminados. Los resultados solo de metadatos son informativos; `--set-default` y `--set-image` requieren sondas en vivo, por lo que OpenClaw no configura un modelo OpenRouter sin clave que no se pueda usar.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` en el directorio del agente (por defecto `~/.openclaw/agents/<agentId>/agent/models.json`). Los catálogos de complementos de proveedores se almacenan como fragmentos de catálogo generados y propiedad del complemento bajo el estado del complemento del agente y se cargan automáticamente. Este archivo se fusiona por defecto a menos que `models.mode` se establezca en `replace`.

<AccordionGroup>
  <Accordion title="Precedencia del modo de fusión">
    Precedencia del modo de fusión para IDs de proveedor coincidentes:

    - Un `baseUrl` no vacío ya presente en el `models.json` del agente tiene prioridad.
    - Un `apiKey` no vacío en el `models.json` del agente tiene prioridad solo cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
    - Los valores `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
    - Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
    - Los `apiKey`/`baseUrl` del agente vacíos o faltantes recurren a la configuración `models.providers`.
    - Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

  </Accordion>
</AccordionGroup>

<Note>La persistencia de marcadores tiene autoridad de origen: OpenClaw escribe marcadores desde la instantánea de la configuración de origen activa (antes de la resolución), no desde los valores secretos de tiempo de ejecución resueltos. Esto se aplica siempre que OpenClaw regenera `models.json`, incluidas las rutas impulsadas por comandos como `openclaw agent`.</Note>

## Relacionado

- [Agent runtimes](/es/concepts/agent-runtimes) — OpenClaw, Codex y otros tiempos de ejecución de bucle de agente
- [Configuration reference](/es/gateway/config-agents#agent-defaults) — claves de configuración del modelo
- [Image generation](/es/tools/image-generation) — configuración del modelo de imagen
- [Model failover](/es/concepts/model-failover) — cadenas de conmutación por error
- [Model providers](/es/concepts/model-providers) — enrutamiento y autenticación del proveedor
- [Music generation](/es/tools/music-generation) — configuración del modelo de música
- [Video generation](/es/tools/video-generation) — configuración del modelo de video
