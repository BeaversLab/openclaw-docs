---
summary: "Referencia de CLI para `openclaw models` (estado/lista/establecimiento/escaneo, alias, reservas, autenticación)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "Modelos"
---

# `openclaw models`

Descubrimiento, escaneo y configuración de modelos (modelo predeterminado, respaldos, perfiles de autenticación).

Relacionado:

- Proveedores + modelos: [Modelos](/es/providers/models)
- Conceptos de selección de modelo + comando de barra `/models`: [Concepto de modelos](/es/concepts/models)
- Configuración de autenticación del proveedor: [Primeros pasos](/es/start/getting-started)

## Comandos comunes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` muestra los valores predeterminados/reservas alternativos resueltos más un resumen de autenticación.
Cuando están disponibles las instantáneas de uso del proveedor, la sección de estado de OAuth/API-key incluye
ventanas de uso del proveedor e instantáneas de cuota.
Proveedores de ventana de uso actuales: Anthropic, GitHub Copilot, Gemini CLI, OpenAI,
MiniMax, Xiaomi y z.ai. La autenticación de uso proviene de enlaces específicos del proveedor
cuando está disponible; de lo contrario, OpenClaw recurre a la coincidencia de credenciales OAuth/API-key
de perfiles de autenticación, variables de entorno o configuración.
En la salida de `--json`, `auth.providers` es el resumen del proveedor con conocimiento de entorno/configuración/almacenamiento,
mientras que `auth.oauth` es solo el estado de salud del perfil del almacén de autenticación.
Agregue `--probe` para ejecutar sondas de autenticación en vivo contra cada perfil de proveedor configurado.
Las sondas son solicitudes reales (pueden consumir tokens y activar límites de velocidad).
Use `--agent <id>` para inspeccionar el estado de modelo/autenticación de un agente configurado. Cuando se omite,
el comando usa `OPENCLAW_AGENT_DIR` si está configurado; de lo contrario, el
agente predeterminado configurado.
Las filas de sonda pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
Para la solución de problemas de OAuth de OpenAI ChatGPT/Codex, `openclaw models status`,
`openclaw models auth list --provider openai` y
`openclaw config get agents.defaults.model --json` son la forma más rápida de
confirmar si un agente tiene un perfil de OAuth `openai` utilizable para
`openai/*` a través del tiempo de ejecución nativo de Codex. Consulte [Configuración del proveedor OpenAI](/es/providers/openai#check-and-recover-codex-oauth-routing).

Notas:

- `models set <model-or-alias>` acepta `provider/model` o un alias.
- `models list` es de solo lectura: lee la configuración, los perfiles de autenticación, el estado existente del catálogo
  y las filas del catálogo propiedad del proveedor, pero no reescribe
  `models.json`.
- La columna `Auth` es de nivel de proveedor y de solo lectura. Se calcula a partir de metadatos locales de perfil de autenticación, marcadores de entorno, claves de proveedor configuradas, marcadores de proveedor local, marcadores de entorno/perfil de AWS Bedrock y metadatos de autenticación sintética de complementos; no carga el tiempo de ejecución del proveedor, ni lee secretos del llavero, ni llama a las API del proveedor, ni demuestra la preparación exacta de ejecución por modelo.
- `models list --all --provider <id>` puede incluir filas estáticas de catálogo propiedad del proveedor desde manifiestos de complementos o metadatos de catálogo de proveedor incluidos, incluso cuando aún no te has autenticado con ese proveedor. Esas filas todavía aparecen como no disponibles hasta que se configure la autenticación coincidente.
- `models list` mantiene el plano de control receptivo mientras el descubrimiento del catálogo del proveedor es lento. Las vistas predeterminadas y configuradas vuelven a filas de modelos configuradas o sintéticas después de una breve espera y permiten que el descubrimiento termine en segundo plano. Usa `--all` cuando necesites el catálogo completo descubierto exacto y estés dispuesto a esperar el descubrimiento del proveedor.
- El `models list --all` amplio combina filas de catálogo de manifiesto sobre filas de registro sin cargar enlaces de suplemento del tiempo de ejecución del proveedor. Las rutas rápidas de manifiesto filtradas por proveedor usan solo proveedores marcados como `static`; los proveedores marcados como `refreshable` permanecen respaldados por registro/caché y agregan filas de manifiesto como suplementos, mientras que los proveedores marcados como `runtime` permanecen en el descubrimiento de registro/tiempo de ejecución.
- `models list` mantiene los metadatos del modelo nativo y los límites del tiempo de ejecución distintos. En la salida de tabla, `Ctx` muestra `contextTokens/contextWindow` cuando un límite efectivo del tiempo de ejecución difiere de la ventana de contexto nativa; las filas JSON incluyen `contextTokens` cuando un proveedor expone ese límite.
- `models list --provider <id>` filtra por id de proveedor, como `moonshot` o
  `openai`. No acepta etiquetas de visualización de selectores
  interactivos de proveedores, como `Moonshot AI`.
- Las referencias de modelo se analizan dividiendo por el **primer** `/`. Si el ID del modelo incluye `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw resuelve la entrada primero como un alias, luego como una coincidencia única de proveedor configurado para ese ID de modelo exacto y solo luego recurre al proveedor predeterminado configurado con una advertencia de obsolescencia. Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un predeterminado obsoleto de un proveedor eliminado.
- `models status` puede mostrar `marker(<value>)` en la salida de autenticación para marcadores de posición no secretos (por ejemplo `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) en lugar de enmascararlos como secretos.

### Escaneo de modelos

`models scan` lee el catálogo público `:free` de OpenRouter y clasifica los candidatos para
su uso como respaldo. El catálogo en sí es público, por lo que los escaneos solo de metadatos no necesitan
una clave de OpenRouter.

De manera predeterminada, OpenClaw intenta sondear la compatibilidad de herramientas e imágenes con llamadas en vivo al modelo.
Si no se configura ninguna clave de OpenRouter, el comando recurre a una salida
solo de metadatos y explica que los modelos `:free` aún requieren `OPENROUTER_API_KEY` para
los sondeos y la inferencia.

Opciones:

- `--no-probe` (solo metadatos; sin búsqueda de configuración/secretos)
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>` (tiempo de espera de solicitud de catálogo y por cada sondeo)
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` y `--set-image` requieren sondeos en vivo; los resultados del escaneo
solo de metadatos son informativos y no se aplican a la configuración.

### Estado de modelos

Opciones:

- `--json`
- `--plain`
- `--check` (salida 1=expirado/faltante, 2=por expirar)
- `--probe` (sondeo en vivo de perfiles de autenticación configurados)
- `--probe-provider <name>` (sondear un proveedor)
- `--probe-profile <id>` (repetir o ids de perfil separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id de agente configurado; anula `OPENCLAW_AGENT_DIR`)

`--json` mantiene stdout reservado para el payload JSON. Los diagnósticos de perfil de autenticación, proveedor e inicio se envían a stderr para que los scripts puedan canalizar stdout directamente a herramientas como `jq`.

Cubos de estado del sondeo:

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

Casos de detalle/código de razón del sondeo que se pueden esperar:

- `excluded_by_auth_order`: existe un perfil almacenado, pero `auth.order.<provider>` explícito lo omitió, por lo que el sondeo informa la exclusión en lugar de intentarlo.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref`:
  el perfil está presente pero no es apto/resoluble.
- `no_model`: existe la autenticación del proveedor, pero OpenClaw no pudo resolver un candidato de modelo sondeable para ese proveedor.

## Alias y retrocesos

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Perfiles de autenticación

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` es el asistente de autenticación interactivo. Puede iniciar un flujo de autenticación de proveedor (OAuth/clave de API) o guiarlo para pegar el token manualmente, dependiendo del proveedor que elija.

`models auth list` lista los perfiles de autenticación guardados para el agente seleccionado sin
imprimir el token, la clave de API o el material secreto de OAuth. Use `--provider <id>` para
filtrar por un proveedor, como `openai`, y `--json` para secuencias de comandos.

`models auth login` ejecuta el flujo de autenticación (OAuth/clave de API) de un complemento de proveedor. Use `openclaw plugins list` para ver qué proveedores están instalados. Use `openclaw models auth --agent <id> <subcommand>` para escribir los resultados de autenticación en un almacén de agente configurado específico. La bandera principal `--agent` es respetada por `add`, `list`, `login`, `paste-api-key`, `setup-token`, `paste-token` y `login-github-copilot`.

Para los modelos de OpenAI, `--provider openai` por defecto es el inicio de sesión de la cuenta ChatGPT/Codex.
Use `--method api-key` solo cuando quiera agregar un perfil de clave de API de OpenAI,
generalmente como respaldo para los límites de suscripción de Codex. Ejecute `openclaw doctor --fix`
para migrar el estado de autenticación/perfil heredado anterior del prefijo OpenAI Codex a `openai`.

Ejemplos:

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai
openclaw models auth list --provider openai
```

Notas:

- `login` acepta `--profile-id <id>` para proveedores que admiten perfiles con nombre
  durante el inicio de sesión. Úselo para mantener múltiples inicios de sesión para el mismo
  proveedor separados.
- `paste-api-key` acepta claves de API generadas en otro lugar, solicita el valor
  de la clave y la escribe en el id de perfil predeterminado `<provider>:manual` a menos que
  pase `--profile-id`. En automatización, pase la clave a través de stdin, por ejemplo
  `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai`.
- `setup-token` y `paste-token` siguen siendo comandos de token genéricos para proveedores
  que exponen métodos de autenticación de token.
- `setup-token` requiere un TTY interactivo y ejecuta el método de autenticación
  de token del proveedor (de forma predeterminada, el método `setup-token` de ese proveedor cuando expone
  uno).
- `paste-token` acepta una cadena de token generada en otro lugar o desde la automatización.
- `paste-token` requiere `--provider`, solicita el valor del token de forma predeterminada,
  y lo escribe en el id de perfil predeterminado `<provider>:manual` a menos que pase
  `--profile-id`.
- En automatización, pase el token a través de stdin en lugar de pasarlo como argumento para que
  las credenciales del proveedor no aparezcan en el historial de shell ni en las listas de procesos.
- `paste-token --expires-in <duration>` almacena una caducidad absoluta del token a partir de
  una duración relativa como `365d` o `12h`.
- Para `openai`, las claves de API de OpenAI y el material de token de ChatGPT/OAuth son formas de autenticación diferentes. Use `paste-api-key` para claves de API de OpenAI `sk-...` y `paste-token` solo para material de autenticación de token.
- Nota de Anthropic: El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata el reuso de la CLI de Claude y el uso de `claude -p` como sancionados para esta integración, a menos que Anthropic publique una nueva política.
- Los `setup-token` / `paste-token` de Anthropic siguen disponibles como una ruta de token compatible con OpenClaw, pero OpenClaw ahora prefiere el reuso de la CLI de Claude y `claude -p` cuando están disponibles.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Selección de modelo](/es/concepts/model-providers)
- [Conmutación por error de modelo](/es/concepts/model-failover)
