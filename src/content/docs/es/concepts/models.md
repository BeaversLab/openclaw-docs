---
summary: "CLI de modelos: list, set, aliases, fallbacks, scan, status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modelos"
---

# CLI de modelos

Consulte [/concepts/model-failover](/es/concepts/model-failover) para obtener información sobre la rotación de perfiles de autenticación, los tiempos de espera y cómo interactúan con los respaldos (fallbacks).
Resumen rápido de proveedores + ejemplos: [/concepts/model-providers](/es/concepts/model-providers).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

1. Modelo **principal** (`agents.defaults.model.primary` o `agents.defaults.model`).
2. **Respaldos** (fallbacks) en `agents.defaults.model.fallbacks` (en orden).
3. **Respaldo por fallo de autenticación del proveedor** ocurre dentro de un proveedor antes de pasar al
   siguiente modelo.

Relacionado:

- `agents.defaults.models` es la lista de permitidos (allowlist)/catálogo de modelos que OpenClaw puede utilizar (más alias).
- `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes.
- `agents.defaults.pdfModel` es usado por la herramienta `pdf`. Si se omite, la herramienta
  recurre a `agents.defaults.imageModel` y luego al modelo de sesión/predeterminado
  resuelto.
- `agents.defaults.imageGenerationModel` es usado por la capacidad compartida de generación de imágenes. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado con autenticación. Intenta primero el proveedor predeterminado actual, luego los proveedores de generación de imágenes restantes en orden de ID de proveedor. Si configura un proveedor/modelo específico, también configure la clave de API/auth de ese proveedor.
- `agents.defaults.musicGenerationModel` es usado por la capacidad compartida de generación de música. Si se omite, `music_generate` aún puede inferir un proveedor predeterminado con autenticación. Intenta primero el proveedor predeterminado actual, luego los proveedores de generación de música restantes en orden de ID de proveedor. Si configura un proveedor/modelo específico, también configure la clave de API/auth de ese proveedor.
- `agents.defaults.videoGenerationModel` es usado por la capacidad compartida de generación de video. Si se omite, `video_generate` aún puede inferir un proveedor predeterminado con autenticación. Intenta primero el proveedor predeterminado actual, luego los proveedores de generación de video restantes en orden de ID de proveedor. Si configura un proveedor/modelo específico, también configure la clave de API/auth de ese proveedor.
- Los valores predeterminados por agente pueden anular `agents.defaults.model` mediante `agents.list[].model` más enlaces (ver [/concepts/multi-agent](/es/concepts/multi-agent)).

## Política rápida de modelos

- Establezca su principal como el modelo más fuerte de última generación disponible para usted.
- Use los respaldos para tareas sensibles al costo/latencia y chats de menor importancia.
- Para agentes con herramientas habilitadas o entradas no confiables, evite las categorías de modelos más antiguas/débiles.

## Incorporación (recomendado)

Si no desea editar la configuración manualmente, ejecute la incorporación:

```bash
openclaw onboard
```

Puede configurar el modelo + la autenticación para proveedores comunes, incluida la **suscripción OpenAI Code (Codex)** (OAuth) y **Anthropic** (clave API o Claude CLI).

## Claves de configuración (resumen)

- `agents.defaults.model.primary` y `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` y `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` y `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` y `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` y `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (lista de permitidos + alias + parámetros del proveedor)
- `models.providers` (proveedores personalizados escritos en `models.json`)

Las referencias de modelos se normalizan a minúsculas. Los alias de proveedores como `z.ai/*` se normalizan
a `zai/*`.

Ejemplos de configuración de proveedores (incluido OpenCode) se encuentran en
[/providers/opencode](/es/providers/opencode).

### Ediciones seguras de la lista de permitidos

Use escrituras aditivas al actualizar `agents.defaults.models` manualmente:

```bash
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
```

`openclaw config set` protege los mapas de modelo/proveedor de sobrescrituras accidentales. Una
asignación de objeto simple a `agents.defaults.models`, `models.providers` o
`models.providers.<id>.models` se rechaza cuando eliminaría
entradas existentes. Use `--merge` para cambios aditivos; use `--replace` solo cuando el
valor proporcionado deba convertirse en el valor objetivo completo.

La configuración interactiva del proveedor y `openclaw configure --section model` también fusionan
las selecciones con ámbito de proveedor en la lista de permitidos existente, por lo que agregar Codex,
Ollama u otro proveedor no elimina entradas de modelo no relacionadas.

## "Modelo no permitido" (y por qué se detienen las respuestas)

Si `agents.defaults.models` está configurado, se convierte en la **lista de permitidos** para `/model` y para
las anulaciones de sesión. Cuando un usuario selecciona un modelo que no está en esa lista de permitidos,
OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Esto sucede **antes** de que se genere una respuesta normal, por lo que el mensaje puede parecer
que "no respondió". La solución es:

- Agregar el modelo a `agents.defaults.models`, o
- Borrar la lista de permitidos (eliminar `agents.defaults.models`), o
- Elige un modelo de `/model list`.

Ejemplo de configuración de lista blanca:

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

Puedes cambiar los modelos para la sesión actual sin reiniciar:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

Notas:

- `/model` (y `/model list`) es un selector numerado compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso de envío.
- `/models add` está disponible de forma predeterminada y se puede desactivar con `commands.modelsWrite=false`.
- Cuando está activado, `/models add <provider> <modelId>` es la ruta más rápida; `/models add` solo inicia un flujo guiado que prioriza al proveedor cuando es compatible.
- Después de `/models add`, el nuevo modelo está disponible en `/models` y `/model` sin reiniciar la puerta de enlace.
- `/model <#>` selecciona de ese selector.
- `/model` guarda la nueva selección de sesión inmediatamente.
- Si el agente está inactivo, la siguiente ejecución usa el nuevo modelo de inmediato.
- Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo reinicia en el nuevo modelo en un punto de reintento limpio.
- Si la actividad de la herramienta o la salida de respuesta ya ha comenzado, el cambio pendiente puede permanecer en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
- `/model status` es la vista detallada (candidatos de autenticación y, cuando se configura, el punto de conexión del proveedor `baseUrl` + modo `api`).
- Las referencias de modelo se analizan dividiendo en el **primer** `/`. Usa `provider/model` al escribir `/model <ref>`.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), debes incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
- Si omites el proveedor, OpenClaw resuelve la entrada en este orden:
  1. coincidencia de alias
  2. coincidencia única de proveedor configurado para ese ID de modelo sin prefijo exacto
  3. respaldo obsoleto al proveedor predeterminado configurado
     Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw
     en su lugar vuelve al primer proveedor/modelo configurado para evitar
     mostrar un valor predeterminado obsoleto de un proveedor eliminado.

Comportamiento/configuración completa del comando: [Comandos de barra](/es/tools/slash-commands).

Ejemplos:

```text
/models add
/models add ollama glm-5.1:cloud
/models add lmstudio qwen/qwen3.5-9b
```

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

Muestra los modelos configurados por defecto. Indicadores útiles:

- `--all`: catálogo completo
- `--local`: solo proveedores locales
- `--provider <id>`: filtrar por id de proveedor, por ejemplo `moonshot`; no se aceptan
  etiquetas de los selectores interactivos
- `--plain`: un modelo por línea
- `--json`: salida legible por máquina

`--all` incluye filas estáticas del catálogo propiedad del proveedor incluidas antes de que se configure la autenticación,
por lo que las vistas solo de descubrimiento pueden mostrar modelos que no están disponibles hasta
que añadas las credenciales del proveedor correspondientes.

### `models status`

Muestra el modelo principal resuelto, las alternativas, el modelo de imágenes y un resumen de autenticación
de los proveedores configurados. También muestra el estado de vencimiento de OAuth para los perfiles encontrados
en el almacenamiento de autenticación (advierte dentro de las 24h por defecto). `--plain` imprime solo el
modelo principal resuelto.
El estado de OAuth siempre se muestra (y se incluye en la salida de `--json`). Si un proveedor
configurado no tiene credenciales, `models status` imprime una sección **Missing auth**.
JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers`
(autenticación efectiva por proveedor, incluidas las credenciales respaldadas por env). `auth.oauth`
es solo el estado de salud del perfil del almacenamiento de autenticación; los proveedores solo de env no aparecen allí.
Use `--check` para automatización (salida `1` cuando falten/caduquen, `2` cuando estén por vencer).
Use `--probe` para verificaciones de autenticación en vivo; las filas de sondeo pueden provenir de perfiles de autenticación, credenciales
env o `models.json`.
Si `auth.order.<provider>` explícito omite un perfil almacenado, el sondeo informa
`excluded_by_auth_order` en lugar de intentarlo. Si la autenticación existe pero no se puede resolver
ningún modelo sondeable para ese proveedor, el sondeo informa `status: no_model`.

La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las
claves de API suelen ser las más predecibles; el reuso de Claude CLI y los perfiles existentes de OAuth/token de Anthropic
también son compatibles.

Ejemplo (Claude CLI):

```bash
claude auth login
openclaw models status
```

## Escaneo (modelos gratuitos de OpenRouter)

`openclaw models scan` inspecciona el **catálogo de modelos gratuitos** de OpenRouter y puede
opcionalmente sondear modelos para detectar soporte de herramientas e imágenes.

Opciones clave:

- `--no-probe`: omitir sondeos en vivo (solo metadatos)
- `--min-params <b>`: tamaño mínimo de parámetros (miles de millones)
- `--max-age-days <days>`: omitir modelos más antiguos
- `--provider <name>`: filtro de prefijo de proveedor
- `--max-candidates <n>`: tamaño de la lista de alternativas
- `--set-default`: establecer `agents.defaults.model.primary` a la primera selección
- `--set-image`: establecer `agents.defaults.imageModel.primary` a la primera selección de imagen

La sondeo requiere una clave de API de OpenRouter (de perfiles de autenticación o
`OPENROUTER_API_KEY`). Sin una clave, use `--no-probe` para listar solo los candidatos.

Los resultados del escaneo se clasifican por:

1. Soporte de imágenes
2. Latencia de herramientas
3. Tamaño del contexto
4. Recuento de parámetros

Entrada

- Lista de `/models` de OpenRouter (filtro `:free`)
- Requiere la clave de API de OpenRouter de los perfiles de autenticación o `OPENROUTER_API_KEY` (consulte [/environment](/es/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de sondeo: `--timeout`, `--concurrency`

Cuando se ejecuta en un TTY, puede seleccionar las reservas interactivamente. En modo no
interactivo, pase `--yes` para aceptar los valores predeterminados.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` bajo el
directorio del agente (predeterminado `~/.openclaw/agents/<agentId>/agent/models.json`). Este archivo
se combina de forma predeterminada a menos que `models.mode` esté establecido en `replace`.

Precedencia del modo de combinación para IDs de proveedores coincidentes:

- Un `baseUrl` no vacío ya presente en el `models.json` del agente gana.
- Un `apiKey` no vacío en el `models.json` del agente gana solo cuando ese proveedor no es gestionado por SecretRef en el contexto de configuración/perfil-de-autenticación actual.
- Los valores `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
- Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
- Un `apiKey`/`baseUrl` del agente vacío o faltante recurre a `models.providers` de la configuración.
- Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

La persistencia de los marcadores es autoritativa respecto a la fuente: OpenClaw escribe los marcadores desde la instantánea de la configuración fuente activa (pre-resolución), no desde los valores secretos resueltos en tiempo de ejecución.
Esto se aplica siempre que OpenClaw regenera `models.json`, incluidas las rutas impulsadas por comandos como `openclaw agent`.

## Relacionado

- [Proveedores de modelos](/es/concepts/model-providers) — enrutamiento y autenticación de proveedores
- [Conmutación por error de modelos (Model Failover)](/es/concepts/model-failover) — cadenas de conmutación por error
- [Generación de imágenes](/es/tools/image-generation) — configuración del modelo de imágenes
- [Generación de música](/es/tools/music-generation) — configuración del modelo de música
- [Generación de vídeo](/es/tools/video-generation) — configuración del modelo de vídeo
- [Referencia de configuración](/es/gateway/configuration-reference#agent-defaults) — claves de configuración del modelo
