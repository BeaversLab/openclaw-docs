---
summary: "CLI de modelos: lista, configuración, alias, respaldos, escaneo, estado"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI de modelos"
---

# CLI de modelos

Consulte [/concepts/model-failover](/en/concepts/model-failover) para obtener información sobre la rotación de perfiles de autenticación, los tiempos de espera y cómo interactúa con los respaldos.
Resumen rápido del proveedor + ejemplos: [/concepts/model-providers](/en/concepts/model-providers).

## Cómo funciona la selección de modelos

OpenClaw selecciona los modelos en este orden:

1. Modelo **principal** (`agents.defaults.model.primary` o `agents.defaults.model`).
2. **Respaldos** en `agents.defaults.model.fallbacks` (en orden).
3. **Respaldo por fallo de autenticación del proveedor** ocurre dentro de un proveedor antes de pasar al
   siguiente modelo.

Relacionado:

- `agents.defaults.models` es la lista de permitidos/catálogo de modelos que OpenClaw puede usar (más alias).
- `agents.defaults.imageModel` se usa **solo cuando** el modelo principal no puede aceptar imágenes.
- `agents.defaults.pdfModel` es utilizado por la herramienta `pdf`. Si se omite, la herramienta
  recurre a `agents.defaults.imageModel` y luego al modelo predeterminado/de sesión resuelto.
- `agents.defaults.imageGenerationModel` es utilizado por la capacidad compartida de generación de imágenes. Si se omite, `image_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de imágenes registrados restantes en orden de ID de proveedor. Si establece un proveedor/modelo específico, también configure la clave de autenticación/API de ese proveedor.
- `agents.defaults.musicGenerationModel` es utilizado por la capacidad compartida de generación de música. Si se omite, `music_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de música registrados restantes en orden de ID de proveedor. Si establece un proveedor/modelo específico, también configure la clave de autenticación/API de ese proveedor.
- `agents.defaults.videoGenerationModel` es utilizado por la capacidad compartida de generación de videos. Si se omite, `video_generate` aún puede inferir un proveedor predeterminado respaldado por autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de video registrados restantes en orden de ID de proveedor. Si establece un proveedor/modelo específico, también configure la clave de autenticación/API de ese proveedor.
- Los valores predeterminados por agente pueden anular `agents.defaults.model` mediante `agents.list[].model` más enlaces (consulte [/concepts/multi-agent](/en/concepts/multi-agent)).

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

Los ejemplos de configuración de proveedores (incluyendo OpenCode) se encuentran en
[/providers/opencode](/en/providers/opencode).

## "Modelo no permitido" (y por qué se detienen las respuestas)

Si se establece `agents.defaults.models`, se convierte en la **lista de permitidos** para `/model` y para
las anulaciones de sesión. Cuando un usuario selecciona un modelo que no está en esa lista de permitidos,
OpenClaw devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Esto sucede **antes** de que se genere una respuesta normal, por lo que el mensaje puede parecer
que "no respondió". La solución es:

- Añadir el modelo a `agents.defaults.models`, o
- Limpiar la lista de permitidos (eliminar `agents.defaults.models`), o
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

## Cambiar de modelo en el chat (`/model`)

Puedes cambiar de modelo para la sesión actual sin reiniciar:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

Notas:

- `/model` (y `/model list`) es un selector numérico compacto (familia de modelo + proveedores disponibles).
- En Discord, `/model` y `/models` abren un selector interactivo con menús desplegables de proveedor y modelo, además de un paso Enviar.
- `/model <#>` selecciona de ese selector.
- `/model` guarda inmediatamente la nueva selección de sesión.
- Si el agente está inactivo, la siguiente ejecución usa el nuevo modelo de inmediato.
- Si una ejecución ya está activa, OpenClaw marca un cambio en vivo como pendiente y solo se reinicia con el nuevo modelo en un punto de reintento limpio.
- Si la actividad de la herramienta o la salida de la respuesta ya ha comenzado, el cambio pendiente puede mantenerse en cola hasta una oportunidad de reintento posterior o el siguiente turno del usuario.
- `/model status` es la vista detallada (candidatos de autenticación y, cuando está configurado, extremo del proveedor `baseUrl` + modo `api`).
- Las referencias de modelos se analizan dividiendo por el **primer** `/`. Use `provider/model` al escribir `/model <ref>`.
- Si el ID del modelo mismo contiene `/` (estilo OpenRouter), debe incluir el prefijo del proveedor (ejemplo: `/model openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw resuelve la entrada en este orden:
  1. coincidencia de alias
  2. coincidencia única de proveedor configurado para ese ID de modelo sin prefijo exacto
  3. respaldo obsoleto al proveedor predeterminado configurado
     Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw
     en su lugar recurre al primer proveedor/modelo configurado para evitar
     mostrar un predeterminado de proveedor eliminado obsoleto.

Comportamiento/configuración completa del comando: [Slash commands](/en/tools/slash-commands).

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

Muestra los modelos configurados de forma predeterminada. Marcas útiles:

- `--all`: catálogo completo
- `--local`: solo proveedores locales
- `--provider <name>`: filtrar por proveedor
- `--plain`: un modelo por línea
- `--json`: salida legible por máquina

### `models status`

Muestra el modelo principal resuelto, los modelos de respaldo, el modelo de imágenes y un resumen de autenticación de los proveedores configurados. También muestra el estado de vencimiento de OAuth para los perfiles encontrados en el almacén de autenticación (avisa dentro de las 24 horas por defecto). `--plain` imprime solo el modelo principal resuelto.
El estado de OAuth siempre se muestra (y se incluye en la salida de `--json`). Si un proveedor configurado no tiene credenciales, `models status` imprime una sección **Missing auth**.
El JSON incluye `auth.oauth` (ventana de advertencia + perfiles) y `auth.providers`
(autenticación efectiva por proveedor, incluidas las credenciales respaldadas por variables de entorno). `auth.oauth`
es solo el estado de salud del perfil del almacén de autenticación; los proveedores solo de entorno no aparecen allí.
Use `--check` para automatización (exit `1` cuando falte o haya caducado, `2` cuando esté por caducar).
Use `--probe` para comprobaciones de autenticación en vivo; las filas de sondeo pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
Si `auth.order.<provider>` explícito omite un perfil almacenado, el sondeo reporta
`excluded_by_auth_order` en lugar de intentarlo. Si existe autenticación pero no se puede resolver ningún modelo sondeable para ese proveedor, el sondeo reporta `status: no_model`.

La elección de autenticación depende del proveedor/cuenta. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser las más predecibles; el reuso de Claude CLI y los perfiles existentes de OAuth/token de Anthropic también son compatibles.

Ejemplo (Claude CLI):

```bash
claude auth login
openclaw models status
```

## Escaneo (modelos gratuitos de OpenRouter)

`openclaw models scan` inspecciona el **catálogo de modelos gratuitos** de OpenRouter y puede sondear opcionalmente los modelos para verificar la compatibilidad con herramientas e imágenes.

Opciones principales:

- `--no-probe`: omitir sondas en vivo (solo metadatos)
- `--min-params <b>`: tamaño mínimo de parámetros (miles de millones)
- `--max-age-days <days>`: omitir modelos antiguos
- `--provider <name>`: filtro de prefijo de proveedor
- `--max-candidates <n>`: tamaño de la lista de respaldo
- `--set-default`: establecer `agents.defaults.model.primary` en la primera selección
- `--set-image`: establecer `agents.defaults.imageModel.primary` en la primera selección de imagen

El sondeo requiere una clave API de OpenRouter (de perfiles de autenticación o
`OPENROUTER_API_KEY`). Sin una clave, use `--no-probe` para listar solo los candidatos.

Los resultados del escaneo se clasifican por:

1. Soporte de imágenes
2. Latencia de herramientas
3. Tamaño del contexto
4. Recuento de parámetros

Entrada

- Lista `/models` de OpenRouter (filtro `:free`)
- Requiere clave API de OpenRouter de perfiles de autenticación o `OPENROUTER_API_KEY` (ver [/environment](/en/help/environment))
- Filtros opcionales: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de sondeo: `--timeout`, `--concurrency`

Cuando se ejecuta en un TTY, puede seleccionar respaldos interactivamente. En modo no
interactivo, pase `--yes` para aceptar los valores predeterminados.

## Registro de modelos (`models.json`)

Los proveedores personalizados en `models.providers` se escriben en `models.json` bajo el
directorio del agente (por defecto `~/.openclaw/agents/<agentId>/agent/models.json`). Este archivo
se fusiona de forma predeterminada a menos que `models.mode` esté configurado en `replace`.

Precedencia del modo de fusión para ID de proveedor coincidentes:

- Un `baseUrl` no vacío ya presente en el agente `models.json` tiene prioridad.
- Un `apiKey` no vacío en el agente `models.json` tiene prioridad solo cuando ese proveedor no es gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
- Los valores `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
- Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
- Un `apiKey`/`baseUrl` de agente vacío o ausente recurre a la configuración `models.providers`.
- Otros campos del proveedor se actualizan desde la configuración y los datos normalizados del catálogo.

La persistencia de los marcadores está autorizada por la fuente: OpenClaw escribe los marcadores a partir de la instantánea activa de la configuración de origen (antes de la resolución), no a partir de los valores secretos resueltos en tiempo de ejecución.
Esto se aplica siempre que OpenClaw regenera `models.json`, incluidas las rutas impulsadas por comandos como `openclaw agent`.

## Relacionado

- [Proveedores de modelos](/en/concepts/model-providers) — enrutamiento y autenticación de proveedores
- [Conmutación por error de modelos](/en/concepts/model-failover) — cadenas de reserva
- [Generación de imágenes](/en/tools/image-generation) — configuración del modelo de imágenes
- [Generación de música](/en/tools/music-generation) — configuración del modelo de música
- [Generación de vídeo](/en/tools/video-generation) — configuración del modelo de vídeo
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — claves de configuración del modelo
