---
summary: "CLI de modelos: lista, configuración, alias, respaldos, escaneo, estado"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modelos"
sidebarTitle: "CLI de modelos"
---

<CardGroup cols={2}>
  <Card title="Conmutación por error de modelo" href="/es/concepts/model-failover">
    Rotación de perfiles de autenticación, tiempos de espera y cómo interactúa con los respaldos.
  </Card>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers">
    Resumen rápido de proveedores y ejemplos.
  </Card>
  <Card title="Runtimes de agentes" href="/es/concepts/agent-runtimes">
    PI, Codex y otros runtimes de bucle de agentes.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults">
    Claves de configuración de modelos.
  </Card>
</CardGroup>

Las referencias de modelos eligen un proveedor y un modelo. Por lo general, no eligen el runtime de agentes de bajo nivel. Por ejemplo, `openai/gpt-5.5` puede ejecutarse a través de la ruta normal del proveedor OpenAI o a través del runtime del servidor de aplicaciones Codex, dependiendo de `agents.defaults.agentRuntime.id`. Consulte [Runtimes de agentes](/es/concepts/agent-runtimes).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

<Steps>
  <Step title="Modelo principal">`agents.defaults.model.primary` (o `agents.defaults.model`).</Step>
  <Step title="Respaldo">`agents.defaults.model.fallbacks` (en orden).</Step>
  <Step title="Conmutación por error de autenticación del proveedor">La conmutación por error de autenticación ocurre dentro de un proveedor antes de pasar al siguiente modelo.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Superficies de modelos relacionadas">
    - `agents.defaults.models` es la lista de permitidos/catálogo de modelos que OpenClaw puede usar (más alias). - `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes. - `agents.defaults.pdfModel` es usado por la herramienta `pdf`. Si se omite, la herramienta recurre a `agents.defaults.imageModel` y luego al modelo de sesión/predeterminado resuelto. -
    `agents.defaults.imageGenerationModel` es usado por la capacidad compartida de generación de imágenes. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual, luego los proveedores de generación de imágenes registrados restantes en orden de id de proveedor. Si configuras un proveedor/modelo
    específico, también configura la clave de autenticación/API de ese proveedor. - `agents.defaults.musicGenerationModel` es usado por la capacidad compartida de generación de música. Si se omite, `music_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual, luego los proveedores de generación de música registrados
    restantes en orden de id de proveedor. Si configuras un proveedor/modelo específico, también configura la clave de autenticación/API de ese proveedor. - `agents.defaults.videoGenerationModel` es usado por la capacidad compartida de generación de video. Si se omite, `video_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor
    predeterminado actual, luego los proveedores de generación de video registrados restantes en orden de id de proveedor. Si configuras un proveedor/modelo específico, también configura la clave de autenticación/API de ese proveedor. - Los valores predeterminados por agente pueden anular `agents.defaults.model` a través de `agents.list[].model` más enlaces (ver [Enrutamiento
    multiagente](/es/concepts/multi-agent)).
  </Accordion>
</AccordionGroup>

## Política rápida de modelos

- Establezca su principal en el modelo más fuerte de última generación disponible para usted.
- Use respaldos para tareas sensibles al costo/latencia y chat de menor riesgo.
- Para agentes con herramientas habilitadas o entradas que no son de confianza, evite
  capas de modelos más antiguas/débiles.

## Incorporación (recomendado)

Si no quieres editar la configuración manualmente, ejecuta la incorporación:

```bash
openclaw onboard
```

Puede configurar el modelo + la autenticación para proveedores comunes, incluyendo **suscripción de OpenAI Code (Codex)** (OAuth) y **Anthropic** (clave API o Claude CLI).

## Claves de configuración (descripción general)

- `agents.defaults.model.primary` y `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` y `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` y `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` y `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` y `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (lista de permitidos + alias + parámetros del proveedor)
- `models.providers` (proveedores personalizados escritos en `models.json`)

<Note>
Las referencias de modelos se normalizan a minúsculas. Los alias de proveedores como `z.ai/*` se normalizan a `zai/*`.

Los ejemplos de configuración de proveedores (incluyendo OpenCode) se encuentran en [OpenCode](/es/providers/opencode).

</Note>

### Ediciones seguras de la lista de permitidos

Use escrituras aditivas al actualizar `agents.defaults.models` manualmente:

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Reglas de protección contra sobrescritura">
    `openclaw config set` protege los mapas de modelo/proveedor de sobrescrituras accidentales. Una asignación de objeto simple a `agents.defaults.models`, `models.providers` o `models.providers.<id>.models` se rechaza cuando eliminaría las entradas existentes. Use `--merge` para cambios aditivos; use `--replace` solo cuando el valor proporcionado deba convertirse en el valor objetivo completo.

    La configuración interactiva del proveedor y `openclaw configure --section model` también fusionan las selecciones con ámbito de proveedor en la lista de permitidos existente, por lo que agregar Codex, Ollama u otro proveedor no elimina las entradas de modelos no relacionadas. Configure preserva un `agents.defaults.model.primary` existente cuando se vuelve a aplicar la autenticación del proveedor. Los comandos explícitos de configuración de valores predeterminados, como `openclaw models auth login --provider <id> --set-default` y `openclaw models set <model>`, aún reemplazan `agents.defaults.model.primary`.

  </Accordion>
</AccordionGroup>

## "Modelo no permitido" (y por qué se detienen las respuestas)

Si se establece `agents.defaults.models`, se convierte en la **lista de permitidos** para `/model` y para las anulaciones de sesión. Cuando un usuario selecciona un modelo que no está en esa lista de permitidos, OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

<Warning>
Esto ocurre **antes** de que se genere una respuesta normal, por lo que el mensaje puede parecer que "no respondió". La solución es:

- Añadir el modelo a `agents.defaults.models`, o
- Limpiar la lista de permitidos (eliminar `agents.defaults.models`), o
- Elegir un modelo de `/model list`.
  </Warning>

Ejemplo de configuración de lista de permitidos:

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-6" },
    models: {
      "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## Cambiar modelos en el chat (`/model`)

Puede cambiar los modelos para la sesión actual sin reiniciar:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="Comportamiento del selector">
    - `/model` (y `/model list`) es un selector numerado y compacto (familia de modelos + proveedores disponibles).
    - En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso de envío.
    - `/models add` está obsoleto y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat.
    - `/model <#>` selecciona de ese selector.
  </Accordion>
  <Accordion title="Persistencia y cambio en vivo">
    - `/model` guarda inmediatamente la nueva selección de sesión.
    - Si el agente está inactivo, la siguiente ejecución usa el nuevo modelo de inmediato.
    - Si una ejecución ya está activa, OpenClaw marca el cambio en vivo como pendiente y solo se reinicia en el nuevo modelo en un punto de reintento limpio.
    - Si la actividad de herramientas o la salida de respuesta ya ha comenzado, el cambio pendiente puede seguir en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
    - `/model status` es la vista detallada (candidatos de autenticación y, cuando está configurado, endpoint del proveedor `baseUrl` + modo `api`).
  </Accordion>
  <Accordion title="Análisis de referencias">
    - Las referencias de modelos se analizan dividiendo por el **primer** `/`. Usa `provider/model` cuando escribas `/model <ref>`.
    - Si el ID del modelo mismo contiene `/` (estilo OpenRouter), debes incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
    - Si omites el proveedor, OpenClaw resuelve la entrada en este orden:
      1. coincidencia de alias
      2. coincidencia única de proveedor configurado para ese ID de modelo sin prefijo exacto
      3. retorno obsoleto al proveedor predeterminado configurado; si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw en su lugar retorna al primer proveedor/modelo configurado para evitar mostrar un predeterminado de proveedor eliminado obsoleto.
  </Accordion>
</AccordionGroup>

Comportamiento/configuración completa de comandos: [Comandos de barra](/es/tools/slash-commands).

## Comandos de la CLI

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

Muestra los modelos configurados por defecto. Indicadores útiles:

<ParamField path="--all" type="boolean">
  Catálogo completo. Incluye filas de catálogo estático propiedad del proveedor integradas antes de que se configure la autenticación, para que las vistas solo de descubrimiento puedan mostrar modelos que no están disponibles hasta que agregues las credenciales del proveedor coincidentes.
</ParamField>
<ParamField path="--local" type="boolean">
  Solo proveedores locales.
</ParamField>
<ParamField path="--provider <id>" type="string">
  Filtrar por ID de proveedor, por ejemplo `moonshot`. Las etiquetas de visualización de los selectores interactivos no se aceptan.
</ParamField>
<ParamField path="--plain" type="boolean">
  Un modelo por línea.
</ParamField>
<ParamField path="--json" type="boolean">
  Salida legible por máquina.
</ParamField>

### `models status`

Muestra el modelo principal resuelto, respaldos, modelo de imágenes y una descripción general de autenticación de los proveedores configurados. También muestra el estado de expiración de OAuth para los perfiles encontrados en el almacén de autenticación (advierte dentro de las 24 h por defecto). `--plain` imprime solo el modelo principal resuelto.

<AccordionGroup>
  <Accordion title="Auth and probe behavior">
    - El estado de OAuth siempre se muestra (y se incluye en la salida de `--json`). Si un proveedor configurado no tiene credenciales, `models status` imprime una sección **Missing auth** (Falta de autenticación).
    - El JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers` (autenticación efectiva por proveedor, incluyendo credenciales respaldadas por variables de entorno). `auth.oauth` es solo el estado de salud del perfil del almacén de autenticación; los proveedores solo de variables de entorno no aparecen allí.
    - Use `--check` para automatización (salida `1` cuando falte o haya expirado, `2` cuando esté por expirar).
    - Use `--probe` para verificaciones de autenticación en vivo; las filas de sondeo pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
    - Si un `auth.order.<provider>` explícito omite un perfil almacenado, el sondeo informa `excluded_by_auth_order` en lugar de intentarlo. Si existe autenticación pero no se puede resolver ningún modelo sondeable para ese proveedor, el sondeo informa `status: no_model`.
  </Accordion>
</AccordionGroup>

<Note>La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser las más predecibles; también se admiten el reuso de Claude CLI y los perfiles de OAuth/token de Anthropic existentes.</Note>

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
  El catálogo `/models` de OpenRouter es público, por lo que los escaneos de solo metadatos pueden listar candidatos gratuitos sin una clave. La sondeo y la inferencia aún requieren una clave de API de OpenRouter (de perfiles de autenticación o `OPENROUTER_API_KEY`). Si no hay ninguna clave disponible, `openclaw models scan` recurre a la salida de solo metadatos y deja la configuración sin
  cambios. Use `--no-probe` para solicitar el modo de solo metadatos explícitamente.
</Note>

Los resultados del escaneo se clasifican por:

1. Soporte de imágenes
2. Latencia de herramientas
3. Tamaño del contexto
4. Recuento de parámetros

Entrada:

- Lista `/models` de OpenRouter (filtro `:free`)
- Las sondas en vivo requieren una clave de API de OpenRouter de perfiles de autenticación o `OPENROUTER_API_KEY` (consulte [Variables de entorno](/es/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de solicitud/sondeo: `--timeout`, `--concurrency`

Cuando las sondas en vivo se ejecutan en un TTY, puede seleccionar respaldos de forma interactiva. En el modo no interactivo, pase `--yes` para aceptar los valores predeterminados. Los resultados solo de metadatos son informativos; `--set-default` y `--set-image` requieren sondas en vivo, por lo que OpenClaw no configura un modelo de OpenRouter sin clave que no se pueda usar.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` bajo el directorio del agente (predeterminado `~/.openclaw/agents/<agentId>/agent/models.json`). Este archivo se fusiona de forma predeterminada a menos que `models.mode` se establezca en `replace`.

<AccordionGroup>
  <Accordion title="Precedencia del modo de fusión">
    Precedencia del modo de fusión para IDs de proveedores coincidentes:

    - Un `baseUrl` no vacío ya presente en el `models.json` del agente tiene prioridad.
    - Un `apiKey` no vacío en el `models.json` del agente tiene prioridad solo cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
    - Los valores `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/ejec) en lugar de persistir los secretos resueltos.
    - Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/ejec).
    - Un `apiKey`/`baseUrl` del agente vacío o ausente recurre al `models.providers` de configuración.
    - Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

  </Accordion>
</AccordionGroup>

<Note>La persistencia de marcadores es autorizada por la fuente: OpenClaw escribe marcadores a partir de la instantánea de configuración de fuente activa (antes de la resolución), no a partir de los valores secretos de tiempo de ejecución resueltos. Esto se aplica siempre que OpenClaw regenera `models.json`, incluidas las rutas impulsadas por comandos como `openclaw agent`.</Note>

## Relacionado

- [Runtimes de agente](/es/concepts/agent-runtimes) — PI, Codex y otros runtimes de bucle de agente
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) — claves de configuración del modelo
- [Generación de imágenes](/es/tools/image-generation) — configuración del modelo de imágenes
- [Conmutación por error del modelo](/es/concepts/model-failover) — cadenas de respaldo
- [Proveedores de modelos](/es/concepts/model-providers) — enrutamiento y autenticación de proveedores
- [Generación de música](/es/tools/music-generation) — configuración del modelo de música
- [Generación de video](/es/tools/video-generation) — configuración del modelo de video
