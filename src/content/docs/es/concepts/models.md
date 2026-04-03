---
summary: "CLI de modelos: lista, configuración, alias, respaldos, escaneo, estado"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modelos"
---

# CLI de modelos

Consulte [/concepts/model-failover](/en/concepts/model-failover) para obtener información sobre la rotación de perfiles de autenticación, tiempos de espera y cómo interactúa con los respaldos.
Resumen rápido de proveedores + ejemplos: [/concepts/model-providers](/en/concepts/model-providers).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

1. Modelo **principal** (`agents.defaults.model.primary` o `agents.defaults.model`).
2. **Respaldos** en `agents.defaults.model.fallbacks` (en orden).
3. **Respaldo por fallo de autenticación del proveedor** ocurre dentro de un proveedor antes de pasar al
   siguiente modelo.

Relacionado:

- `agents.defaults.models` es la lista de permitidos/catálogo de modelos que OpenClaw puede usar (más alias).
- `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes.
- `agents.defaults.imageGenerationModel` lo utiliza la funcionalidad de generación de imágenes compartida. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado a partir de complementos de generación de imágenes compatibles con autenticación. Si configura un proveedor/modelo específico, también configure la clave de API/autenticación de ese proveedor.
- Los valores predeterminados por agente pueden anular `agents.defaults.model` a través de `agents.list[].model` más enlaces (consulte [/concepts/multi-agent](/en/concepts/multi-agent)).

## Política rápida de modelos

- Establezca su principal en el modelo más fuerte de última generación disponible para usted.
- Use respaldos para tareas sensibles al costo/latencia y chat de menor riesgo.
- Para agentes con herramientas habilitadas o entradas que no son de confianza, evite
  capas de modelos más antiguas/débiles.

## Incorporación (recomendado)

Si no desea editar la configuración manualmente, ejecute la incorporación:

```bash
openclaw onboard
```

Puede configurar el modelo + la autenticación para proveedores comunes, incluida la
**suscripción de OpenAI Code (Codex)** (OAuth) y **Anthropic** (clave API o
`claude setup-token`).

## Claves de configuración (descripción general)

- `agents.defaults.model.primary` y `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` y `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` y `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (lista de permitidos + alias + parámetros del proveedor)
- `models.providers` (proveedores personalizados escritos en `models.json`)

Las referencias de modelos se normalizan a minúsculas. Los alias de proveedores como
`z.ai/*` se normalizan a `zai/*`.

Los ejemplos de configuración de proveedores (incluido OpenCode) se encuentran en
[/providers/opencode](/en/providers/opencode).

## "Modelo no permitido" (y por qué se detienen las respuestas)

Si se establece `agents.defaults.models`, se convierte en la **lista de permitidos** para
`/model` y para las anulaciones de sesión. Cuando un usuario selecciona
un modelo que no está en esa lista de permitidos, OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Esto sucede **antes** de que se genere una respuesta normal, por lo que el mensaje
puede parecer que "no respondió". La solución es:

- Agregar el modelo a `agents.defaults.models`, o
- Borrar la lista de permitidos (remove `agents.defaults.models`), o
- Elegir un modelo de `/model list`.

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

## Cambiar de modelos en el chat (`/model`)

Puedes cambiar de modelos para la sesión actual sin reiniciar:

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

Notas:

- `/model` (y `/model list`) es un selector numerado compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo más un paso de envío.
- `/model <#>` selecciona de ese selector.
- `/model` actualiza la selección de la sesión inmediatamente. Si el agente está inactivo, la siguiente ejecución usa el modelo nuevo de inmediato. Si el agente está ocupado, la ejecución en curso termina primero y el trabajo en cola/futuro usa el modelo nuevo después.
- `/model status` es la vista detallada (candidatos de autenticación y, cuando está configurado, endpoint del proveedor `baseUrl` + modo `api`).
- Las referencias de modelo se analizan dividiendo por el **primer** `/`. Use `provider/model` al escribir `/model <ref>`.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), debe incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw trata la entrada como un alias o un modelo para el **proveedor predeterminado** (solo funciona cuando no hay `/` en el ID del modelo).

Comportamiento/configuración completa del comando: [Slash commands](/en/tools/slash-commands).

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

Muestra los modelos configurados de forma predeterminada. Marcas útiles:

- `--all`: catálogo completo
- `--local`: solo proveedores locales
- `--provider <name>`: filtrar por proveedor
- `--plain`: un modelo por línea
- `--json`: salida legible por máquina

### `models status`

Muestra el modelo principal resuelto, los modelos de respaldo, el modelo de imágenes y un resumen de autenticación de los proveedores configurados. También muestra el estado de expiración de OAuth para los perfiles encontrados en el almacén de autenticación (avisa por defecto dentro de las 24 horas). `--plain` imprime solo el modelo principal resuelto.
El estado de OAuth siempre se muestra (y se incluye en la salida de `--json`). Si un proveedor configurado no tiene credenciales, `models status` imprime una sección **Falta autenticación**.
El JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers`
(autenticación efectiva por proveedor).
Use `--check` para automatización (sale con `1` cuando falta o ha caducado, `2` cuando está por caducar).

La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser las más predecibles; también se admiten flujos de tokens de suscripción.

Ejemplo (token de configuración de Anthropic):

```bash
claude setup-token
openclaw models status
```

## Escaneo (modelos gratuitos de OpenRouter)

`openclaw models scan` inspecciona el **catálogo de modelos gratuitos** de OpenRouter y, opcionalmente, puede sondear modelos para verificar la compatibilidad con herramientas e imágenes.

Indicadores clave:

- `--no-probe`: omitir sondeos en vivo (solo metadatos)
- `--min-params <b>`: tamaño mínimo de parámetros (miles de millones)
- `--max-age-days <days>`: omitir modelos antiguos
- `--provider <name>`: filtro de prefijo de proveedor
- `--max-candidates <n>`: tamaño de la lista de respaldo
- `--set-default`: establecer `agents.defaults.model.primary` a la primera selección
- `--set-image`: establecer `agents.defaults.imageModel.primary` a la primera selección de imagen

El sondeo requiere una clave de API de OpenRouter (de los perfiles de autenticación o de
`OPENROUTER_API_KEY`). Sin una clave, use `--no-probe` para listar solo los candidatos.

Los resultados del escaneo se clasifican por:

1. Compatibilidad con imágenes
2. Latencia de herramientas
3. Tamaño del contexto
4. Recuento de parámetros

Entrada

- OpenRouter `/models` lista (filtro `:free`)
- Requiere la clave de API de OpenRouter de los perfiles de autenticación o `OPENROUTER_API_KEY` (consulte [/environment](/en/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de sonda: `--timeout`, `--concurrency`

Cuando se ejecuta en un TTY, puede seleccionar las alternativas (fallbacks) de forma interactiva. En modo no interactivo, pase `--yes` para aceptar los valores predeterminados.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` bajo el
directorio del agente (predeterminado `~/.openclaw/agents/<agentId>/agent/models.json`). Este archivo
se combina de forma predeterminada a menos que `models.mode` esté establecido en `replace`.

Precedencia del modo de combinación para IDs de proveedores coincidentes:

- Un `baseUrl` no vacío ya presente en el `models.json` del agente tiene prioridad.
- Un `apiKey` no vacío en el `models.json` del agente tiene prioridad solo cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
- Los valores `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
- Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
- Un `apiKey`/`baseUrl` de agente vacío o faltante recurre a la `models.providers` de configuración.
- Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

La persistencia de marcadores es autorizada por la fuente: OpenClaw escribe marcadores desde la instantánea de configuración de fuente activa (antes de la resolución), no desde los valores de secreto en tiempo de ejecución resueltos.
Esto se aplica siempre que OpenClaw regenera `models.json`, incluyendo rutas impulsadas por comandos como `openclaw agent`.

## Relacionado

- [Proveedores de modelos](/en/concepts/model-providers) — enrutamiento y autenticación de proveedores
- [Conmutación por error de modelos](/en/concepts/model-failover) — cadenas de alternativas (fallback)
- [Generación de imágenes](/en/tools/image-generation) — configuración del modelo de imagen
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — claves de configuración del modelo
