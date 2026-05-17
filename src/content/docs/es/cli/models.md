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
- Configuración de autenticación del proveedor: [Cómo comenzar](/es/start/getting-started)

## Comandos comunes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` muestra los valores predeterminados/reservas de respaldo (fallbacks) resueltos más un resumen de autenticación.
Cuando están disponibles las instantáneas de uso del proveedor, la sección de estado de OAuth/API-key incluye
ventanas de uso del proveedor e instantáneas de cuota.
Proveedores de ventana de uso actuales: Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi y z.ai. La autenticación de uso proviene de enlaces específicos del proveedor
cuando están disponibles; de lo contrario, OpenClaw recurre a coincidir con las credenciales
OAuth/API-key de perfiles de autenticación, variables de entorno o configuración.
En la salida de `--json`, `auth.providers` es el resumen del proveedor consciente del entorno/configuración/almacenamiento,
mientras que `auth.oauth` es solo el estado de salud del perfil de almacenamiento de autenticación.
Añada `--probe` para ejecutar sondas de autenticación en vivo contra cada perfil de proveedor configurado.
Las sondas son solicitudes reales (pueden consumir tokens y activar límites de velocidad).
Use `--agent <id>` para inspeccionar el estado de modelo/autenticación de un agente configurado. Cuando se omite,
el comando usa `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si está configurado, de lo contrario el
agente predeterminado configurado.
Las filas de sonda pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
Para la solución de problemas de OAuth de Codex, `openclaw models status`,
`openclaw models auth list --provider openai-codex` y
`openclaw config get agents.defaults.model --json` son la forma más rápida de
confirmar si un agente tiene un perfil de autenticación `openai-codex` utilizable para
`openai/*` a través del tiempo de ejecución nativo de Codex. Consulte [Configuración del proveedor OpenAI](/es/providers/openai#check-and-recover-codex-oauth-routing).

Notas:

- `models set <model-or-alias>` acepta `provider/model` o un alias.
- `models list` es de solo lectura: lee la configuración, los perfiles de autenticación, el estado existente del catálogo
  y las filas del catálogo propiedad del proveedor, pero no reescribe
  `models.json`.
- La columna `Auth` es a nivel de proveedor y de solo lectura. Se calcula a partir de metadatos locales de perfiles de autenticación, marcadores de entorno, claves de proveedor configuradas, marcadores de proveedores locales, marcadores de entorno/perfil de AWS Bedrock y metadatos de autenticación sintética de complementos; no carga el tiempo de ejecución del proveedor, lee secretos del llavero, llama a las API del proveedor ni demuestra la disponibilidad exacta de ejecución para cada modelo.
- `models list --all --provider <id>` puede incluir filas de catálogo estático propiedad del proveedor de los manifiestos de complementos o metadatos de catálogo de proveedor empaquetados, incluso cuando aún no te has autenticado con ese proveedor. Esas filas siguen mostrándose como no disponibles hasta que se configura la autenticación coincidente.
- `models list` mantiene el plano de control con capacidad de respuesta mientras el descubrimiento del catálogo del proveedor es lento. Las vistas predeterminadas y configuradas vuelven a las filas de modelos configuradas o sintéticas después de una breve espera y permiten que el descubrimiento termine en segundo plano. Usa `--all` cuando necesites el catálogo descubierto completo exacto y estés dispuesto a esperar el descubrimiento del proveedor.
- El `models list --all` amplio combina filas de catálogo de manifiesto sobre filas de registro sin cargar los enlaces de complemento del tiempo de ejecución del proveedor. Las rutas rápidas de manifiesto filtradas por proveedor usan solo proveedores marcados como `static`; los proveedores marcados como `refreshable` se mantienen con respaldo en el registro/caché y añaden filas de manifiesto como complementos, mientras que los proveedores marcados como `runtime` se mantienen en el descubrimiento de registro/tiempo de ejecución.
- `models list` mantiene los metadatos del modelo nativo y los límites del tiempo de ejecución distintos. En la salida de tabla, `Ctx` muestra `contextTokens/contextWindow` cuando un límite efectivo del tiempo de ejecución difiere de la ventana de contexto nativa; las filas JSON incluyen `contextTokens` cuando un proveedor expone ese límite.
- `models list --provider <id>` filtra por id. de proveedor, como `moonshot` o `openai-codex`. No acepta etiquetas de visualización de selectores interactivos de proveedores, como `Moonshot AI`.
- Las referencias de modelo se analizan dividiendo por el **primer** `/`. Si el ID del modelo incluye `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw resuelve la entrada primero como un alias, luego como una coincidencia única de proveedor configurado para ese ID de modelo exacto y solo luego recurre al proveedor predeterminado configurado con una advertencia de obsolescencia. Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un predeterminado obsoleto de un proveedor eliminado.
- `models status` puede mostrar `marker(<value>)` en la salida de autenticación para marcadores de posición no secretos (por ejemplo `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) en lugar de enmascararlos como secretos.

### Escaneo de modelos

`models scan` lee el catálogo público `:free` de OpenRouter y clasifica los candidatos para su uso alternativo. El catálogo en sí es público, por lo que los escaneos solo de metadatos no necesitan una clave de OpenRouter.

De forma predeterminada, OpenClaw intenta sondear la compatibilidad de herramientas e imágenes con llamadas en vivo al modelo. Si no se configura ninguna clave de OpenRouter, el comando recurre a una salida de solo metadatos y explica que los modelos `:free` aún requieren `OPENROUTER_API_KEY` para sondeos e inferencia.

Opciones:

- `--no-probe` (solo metadatos; sin búsqueda de configuración/secrets)
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

`--set-default` y `--set-image` requieren sondeos en vivo; los resultados de escaneo de solo metadatos son informativos y no se aplican a la configuración.

### Estado de modelos

Opciones:

- `--json`
- `--plain`
- `--check` (salida 1=caducado/faltante, 2=por caducar)
- `--probe` (sondeo en vivo de los perfiles de autenticación configurados)
- `--probe-provider <name>` (sondear un proveedor)
- `--probe-profile <id>` (repetir o ids de perfil separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id de agente configurado; anula `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

`--json` mantiene stdout reservado para la carga útil JSON. Los diagnósticos de perfil de autenticación, proveedor e inicio se redirigen a stderr para que los scripts puedan canalizar stdout directamente a herramientas como `jq`.

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

- `excluded_by_auth_order`: existe un perfil almacenado, pero `auth.order.<provider>` explícito
  lo omitió, por lo que el sondeo informa de la exclusión en lugar de intentarlo.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref`:
  el perfil está presente pero no es elegible/resoluble.
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
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` es el asistente de autenticación interactivo. Puede iniciar un flujo de autenticación del proveedor (OAuth/clave de API) o guiarlo para que pegue el token manualmente, dependiendo del proveedor que elija.

`models auth list` enumera los perfiles de autenticación guardados para el agente seleccionado sin imprimir el token, la clave de API ni los materiales secretos de OAuth. Use `--provider <id>` para filtrar a un proveedor, como `openai-codex`, y `--json` para secuencias de comandos.

`models auth login` ejecuta el flujo de autenticación (OAuth/API key) del complemento del proveedor. Use
`openclaw plugins list` para ver qué proveedores están instalados.
Use `openclaw models auth --agent <id> <subcommand>` para escribir los resultados de autenticación en un
agente configurado específico. La bandera principal `--agent` es respetada por
`add`, `list`, `login`, `setup-token`, `paste-token` y
`login-github-copilot`.

Para modelos de OpenAI, `--provider openai` usa por defecto el inicio de sesión de cuenta ChatGPT/Codex.
Use `--method api-key` solo cuando desee agregar un perfil de clave API de OpenAI,
generalmente como respaldo para los límites de suscripción de Codex. La ortografía
heredada `--provider openai-codex` todavía funciona para scripts existentes.

Ejemplos:

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth list --provider openai
```

Notas:

- `setup-token` y `paste-token` siguen siendo comandos genéricos de token para proveedores
  que exponen métodos de autenticación de token.
- `setup-token` requiere un TTY interactivo y ejecuta el método de autenticación
  de token del proveedor (predeterminado al método `setup-token` de ese proveedor cuando expone
  uno).
- `paste-token` acepta una cadena de token generada en otro lugar o desde la automatización.
- `paste-token` requiere `--provider`, solicita el valor del token y lo escribe
  en el id de perfil predeterminado `<provider>:manual` a menos que pases
  `--profile-id`.
- `paste-token --expires-in <duration>` almacena una expiración absoluta del token a partir de
  una duración relativa como `365d` o `12h`.
- Nota de Anthropic: El personal de Anthropic nos indicó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata la reutilización de la CLI de Claude y el uso de `claude -p` como sancionados para esta integración a menos que Anthropic publique una nueva política.
- `setup-token` / `paste-token` de Anthropic siguen disponibles como una ruta de token de OpenClaw admitida, pero OpenClaw ahora prefiere la reutilización de la CLI de Claude y `claude -p` cuando están disponibles.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Selección de modelo](/es/concepts/model-providers)
- [Conmutación por error de modelo](/es/concepts/model-failover)
