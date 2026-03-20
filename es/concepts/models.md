---
summary: "CLI de modelos: list, set, aliases, fallbacks, scan, status"
read_when:
  - Agregar o modificar la CLI de modelos (models list/set/scan/aliases/fallbacks)
  - Cambiar el comportamiento de fallback del modelo o la UX de selección
  - Actualizar sondas de escaneo de modelos (herramientas/imágenes)
title: "CLI de modelos"
---

# CLI de modelos

Consulte [/concepts/model-failover](/es/concepts/model-failover) para la rotación de
perfiles de autenticación, tiempos de enfriamiento y cómo eso interactúa con los fallbacks.
Resumen rápido del proveedor + ejemplos: [/concepts/model-providers](/es/concepts/model-providers).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

1. Modelo **principal** (`agents.defaults.model.primary` o `agents.defaults.model`).
2. **Fallbacks** en `agents.defaults.model.fallbacks` (en orden).
3. El **fallback de autenticación del proveedor** ocurre dentro de un proveedor antes de pasar al
   siguiente modelo.

Relacionado:

- `agents.defaults.models` es la lista de permitidos/catálogo de modelos que OpenClaw puede usar (más alias).
- `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes.
- `agents.defaults.imageGenerationModel` es utilizado por la capacidad compartida de generación de imágenes. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado a partir de complementos de generación de imágenes compatibles con autenticación.
- Los valores predeterminados por agente pueden anular `agents.defaults.model` a través de `agents.list[].model` más enlaces (consulte [/concepts/multi-agent](/es/concepts/multi-agent)).

## Política rápida de modelos

- Establezca su principal en el modelo más fuerte de última generación disponible para usted.
- Use fallbacks para tareas sensibles al costo/latencia y chats de menor riesgo.
- Para agentes con herramientas habilitadas o entradas que no son de confianza, evite los niveles de modelos más antiguos/débiles.

## Incorporación (recomendado)

Si no desea editar la configuración manualmente, ejecute la incorporación:

```bash
openclaw onboard
```

Puede configurar el modelo + la autenticación para proveedores comunes, incluida la **suscripción a OpenAI Code (Codex)
** (OAuth) y **Anthropic** (clave API o `claude setup-token`).

## Claves de configuración (resumen)

- `agents.defaults.model.primary` y `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` y `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` y `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (lista de permitidos + alias + parámetros del proveedor)
- `models.providers` (proveedores personalizados escritos en `models.json`)

Las referencias de modelos se normalizan a minúsculas. Los alias de proveedores como `z.ai/*` se normalizan
a `zai/*`.

Los ejemplos de configuración de proveedores (incluido OpenCode) se encuentran en
[/gateway/configuration](/es/gateway/configuration#opencode).

## "Model is not allowed" (y por qué se detienen las respuestas)

Si `agents.defaults.models` está configurado, se convierte en la **lista blanca** para `/model` y para
las anulaciones de sesión. Cuando un usuario selecciona un modelo que no está en esa lista blanca,
OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Esto ocurre **antes** de que se genere una respuesta normal, por lo que el mensaje puede parecer
que "no respondió". La solución es:

- Añadir el modelo a `agents.defaults.models`, o
- Borrar la lista blanca (eliminar `agents.defaults.models`), o
- Elegir un modelo de `/model list`.

Ejemplo de configuración de lista blanca:

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
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
/model openai/gpt-5.2
/model status
```

Notas:

- `/model` (y `/model list`) es un selector numerado compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo más un paso de envío.
- `/model <#>` selecciona de ese selector.
- `/model status` es la vista detallada (candidatos de autenticación y, cuando se configura, el endpoint del proveedor `baseUrl` + modo `api`).
- Las referencias de modelo se analizan dividiendo por el **primer** `/`. Use `provider/model` al escribir `/model <ref>`.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), debe incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw trata la entrada como un alias o un modelo para el **proveedor predeterminado** (solo funciona cuando no hay `/` en el ID del modelo).

Comportamiento/configuración completa del comando: [Slash commands](/es/tools/slash-commands).

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

Muestra los modelos configurados por defecto. Opciones útiles:

- `--all`: catálogo completo
- `--local`: solo proveedores locales
- `--provider <name>`: filtrar por proveedor
- `--plain`: un modelo por línea
- `--json`: salida legible por máquina

### `models status`

Muestra el modelo principal resuelto, los modelos alternativos, el modelo de imágenes y un resumen de autenticación
de los proveedores configurados. También muestra el estado de expiración de OAuth para los perfiles encontrados
en el almacén de autenticación (advierte dentro de las 24h por defecto). `--plain` imprime solo el
modelo principal resuelto.
El estado de OAuth siempre se muestra (y se incluye en la salida `--json`). Si un proveedor
configurado no tiene credenciales, `models status` imprime una sección **Falta autenticación**.
JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers`
(autenticación efectiva por proveedor).
Use `--check` para automatización (salida `1` cuando falte/caducque, `2` cuando esté por caducar).

La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser las más predecibles; también se admiten flujos de tokens de suscripción.

Ejemplo (token de configuración de Anthropic):

```bash
claude setup-token
openclaw models status
```

## Escaneo (modelos gratuitos de OpenRouter)

`openclaw models scan` inspecciona el **catálogo de modelos gratuitos** de OpenRouter y puede
opcionalmente sondear modelos para detectar compatibilidad con herramientas e imágenes.

Opciones clave:

- `--no-probe`: omitir sondeos en vivo (solo metadatos)
- `--min-params <b>`: tamaño mínimo de parámetros (miles de millones)
- `--max-age-days <days>`: omitir modelos antiguos
- `--provider <name>`: filtro de prefijo de proveedor
- `--max-candidates <n>`: tamaño de la lista de respaldo
- `--set-default`: establecer `agents.defaults.model.primary` a la primera selección
- `--set-image`: establecer `agents.defaults.imageModel.primary` a la primera selección de imagen

El sondeo requiere una clave API de OpenRouter (de perfiles de autenticación o
`OPENROUTER_API_KEY`). Sin clave, use `--no-probe` para listar solo los candidatos.

Los resultados del escaneo se clasifican por:

1. Soporte de imágenes
2. Latencia de herramienta
3. Tamaño del contexto
4. Recuento de parámetros

Entrada

- Lista `/models` de OpenRouter (filtro `:free`)
- Requiere la clave API de OpenRouter de perfiles de autenticación o `OPENROUTER_API_KEY` (consulte [/environment](/es/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de sondeo: `--timeout`, `--concurrency`

Cuando se ejecuta en un TTY, puede seleccionar los respaldos de forma interactiva. En modo no interactivo,
pase `--yes` para aceptar los valores predeterminados.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` en el
directorio del agente (predeterminado `~/.openclaw/agents/<agentId>/agent/models.json`). Este archivo
se fusiona de forma predeterminada a menos que `models.mode` se establezca en `replace`.

Precedencia del modo de fusión para IDs de proveedores coincidentes:

- El `baseUrl` no vacío ya presente en el agente `models.json` tiene prioridad.
- El `apiKey` no vacío en el agente `models.json` solo tiene prioridad cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
- Los valores del proveedor gestionados por SecretRef `apiKey` se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
- Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
- El `apiKey`/`baseUrl` del agente vacío o ausente se remite a la configuración `models.providers`.
- Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

La persistencia de marcadores es autorizada por la fuente: OpenClaw escribe marcadores a partir de la instantánea activa de configuración de origen (pre-resolución), no a partir de valores secretos de tiempo de ejecución resueltos.
Esto se aplica siempre que OpenClaw regenera `models.json`, incluidas las rutas impulsadas por comandos como `openclaw agent`.

import en from "/components/footer/en.mdx";

<en />
