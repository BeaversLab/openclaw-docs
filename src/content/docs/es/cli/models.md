---
summary: "Referencia de CLI para `openclaw models` (estado/lista/establecimiento/escaneo, alias, reservas, autenticación)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "modelos"
---

# `openclaw models`

Descubrimiento, escaneo y configuración de modelos (modelo predeterminado, respaldos, perfiles de autenticación).

Relacionado:

- Proveedores + modelos: [Modelos](/es/providers/models)
- Conceptos de selección de modelos + comando de barra `/models`: [Concepto de modelos](/es/concepts/models)
- Configuración de autenticación del proveedor: [Comenzando](/es/start/getting-started)

## Comandos comunes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` muestra los valores predeterminados/reservas alternativas (fallbacks) más un resumen de autenticación.
Cuando están disponibles las instantáneas de uso del proveedor, la sección de estado de OAuth/API-key incluye
ventanas de uso del proveedor e instantáneas de cuota.
Proveedores de ventana de uso actuales: Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi y z.ai. La autenticación de uso proviene de enlaces específicos del proveedor
cuando están disponibles; de lo contrario, OpenClaw recurre a credenciales OAuth/API-key coincidentes
de perfiles de autenticación, variables de entorno o configuración.
En la salida de `--json`, `auth.providers` es el resumen del proveedor consciente de env/config/store,
mientras que `auth.oauth` es solo el estado de salud del perfil de almacenamiento de autenticación.
Agregue `--probe` para ejecutar sondas de autenticación en vivo contra cada perfil de proveedor configurado.
Las sondas son solicitudes reales (pueden consumir tokens y activar límites de velocidad).
Use `--agent <id>` para inspeccionar el estado de modelo/autenticación de un agente configurado. Cuando se omite,
el comando usa `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si está configurado, de lo contrario el
agente predeterminado configurado.
Las filas de sonda pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.

Notas:

- `models set <model-or-alias>` acepta `provider/model` o un alias.
- `models list --all` incluye filas de catálogo estático propiedad del proveedor empaquetadas incluso
  cuando no te has autenticado con ese proveedor todavía. Esas filas aún aparecen
  como no disponibles hasta que se configure la autenticación coincidente.
- `models list --provider <id>` filtra por ID de proveedor, como `moonshot` o
  `openai-codex`. No acepta etiquetas de visualización de selectores de proveedores interactivos,
  como `Moonshot AI`.
- Las referencias de modelos se analizan dividiendo por el **primer** `/`. Si el ID del modelo incluye `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw resuelve la entrada primero como un alias, luego
  como una coincidencia única de proveedor configurado para ese ID de modelo exacto, y solo entonces
  recurre al proveedor predeterminado configurado con una advertencia de obsolescencia.
  Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw
  recurre al primer proveedor/modelo configurado en lugar de mostrar un
  predeterminado obsoleto de proveedor eliminado.
- `models status` puede mostrar `marker(<value>)` en la salida de autenticación para marcadores de posición no secretos (por ejemplo `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) en lugar de enmascararlos como secretos.

### `models status`

Opciones:

- `--json`
- `--plain`
- `--check` (salida 1=caducado/faltante, 2=por caducar)
- `--probe` (sondeo en vivo de los perfiles de autenticación configurados)
- `--probe-provider <name>` (sondear un proveedor)
- `--probe-profile <id>` (repetir o ids de perfiles separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id de agente configurado; anula `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

Cubos de estado del sondeo:

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

Casos de detalle/código de razón del sondeo a esperar:

- `excluded_by_auth_order`: existe un perfil almacenado, pero `auth.order.<provider>` explícito
  lo omitió, por lo que el sondeo informa la exclusión en lugar de
  intentarlo.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref`:
  el perfil está presente pero no es elegible/resoluble.
- `no_model`: existe la autenticación del proveedor, pero OpenClaw no pudo resolver un
  modelo sondeable para ese proveedor.

## Alias + alternativas

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Perfiles de autenticación

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` es el asistente de autenticación interactivo. Puede iniciar un flujo de
autenticación del proveedor (OAuth/clave de API) o guiarlo para pegar manualmente el token, según el
proveedor que elija.

`models auth login` ejecuta el flujo de autenticación del complemento del proveedor (OAuth/clave de API).
Use `openclaw plugins list` para ver qué proveedores están instalados.

Ejemplos:

```bash
openclaw models auth login --provider openai-codex --set-default
```

Notas:

- `setup-token` y `paste-token` siguen siendo comandos de token genéricos para proveedores
  que exponen métodos de autenticación de token.
- `setup-token` requiere un TTY interactivo y ejecuta el método de autenticación de token
  del proveedor (por defecto, el método `setup-token` de ese proveedor cuando expone
  uno).
- `paste-token` acepta una cadena de token generada en otro lugar o desde la automatización.
- `paste-token` requiere `--provider`, solicita el valor del token y lo escribe
  en el id de perfil predeterminado `<provider>:manual` a menos que pase
  `--profile-id`.
- `paste-token --expires-in <duration>` almacena una caducidad absoluta del token a partir de
  una duración relativa como `365d` o `12h`.
- Nota de Anthropic: El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata la reutilización de la CLI de Claude y el uso de `claude -p` como autorizados para esta integración, a menos que Anthropic publique una nueva política.
- Anthropic `setup-token` / `paste-token` siguen disponibles como una ruta de token compatible con OpenClaw, pero OpenClaw ahora prefiere la reutilización de la CLI de Claude y `claude -p` cuando están disponibles.
