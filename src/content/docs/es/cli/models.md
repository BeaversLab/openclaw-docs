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

- Proveedores + modelos: [Modelos](/en/providers/models)
- Configuración de autenticación del proveedor: [Introducción](/en/start/getting-started)

## Comandos comunes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` muestra las reservas/predeterminadas resueltas más un resumen de autenticación.
Cuando están disponibles las instantáneas de uso del proveedor, la sección de estado de OAuth/token incluye
encabezados de uso del proveedor.
Agregue `--probe` para ejecutar sondas de autenticación en vivo contra cada perfil de proveedor configurado.
Las sondas son solicitudes reales (pueden consumir tokens y activar límites de velocidad).
Use `--agent <id>` para inspeccionar el estado de modelo/autenticación de un agente configurado. Cuando se omite,
el comando usa `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si está configurado, de lo contrario el
agente predeterminado configurado.

Notas:

- `models set <model-or-alias>` acepta `provider/model` o un alias.
- Las referencias de modelo se analizan dividiéndolas en el **primer** `/`. Si el ID del modelo incluye `/` (estilo OpenRouter), incluya el prefijo del proveedor (ejemplo: `openrouter/moonshotai/kimi-k2`).
- Si omite el proveedor, OpenClaw trata la entrada como un alias o un modelo para el **proveedor predeterminado** (solo funciona cuando no hay ningún `/` en el ID del modelo).
- `models status` puede mostrar `marker(<value>)` en la salida de autenticación para marcadores de posición no secretos (por ejemplo `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) en lugar de enmascararlos como secretos.

### `models status`

Opciones:

- `--json`
- `--plain`
- `--check` (salida 1=caducado/faltante, 2=por caducar)
- `--probe` (sonda en vivo de perfiles de autenticación configurados)
- `--probe-provider <name>` (sonda de un proveedor)
- `--probe-profile <id>` (repita o IDs de perfiles separados por comas)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id de agente configurado; anula `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

## Alias + respaldos

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Perfiles de autenticación

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` ejecuta el flujo de autenticación de un complemento de proveedor (OAuth/clave de API). Use
`openclaw plugins list` para ver qué proveedores están instalados.

Ejemplos:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw models auth login --provider openai-codex --set-default
```

Notas:

- `login --provider anthropic --method cli --set-default` reutiliza un inicio de sesión
  local de Claude CLI y reescribe la ruta del modelo predeterminado principal de Anthropic a `claude-cli/...`.
- `setup-token` solicita un valor de token de configuración (genérelo con `claude setup-token` en cualquier máquina).
- `paste-token` acepta una cadena de token generada en otro lugar o desde automatización.
- Nota sobre la política de Anthropic: la compatibilidad con tokens de configuración es una compatibilidad técnica. Anthropic ha bloqueado algunos usos de suscripciones fuera de Claude Code en el pasado, por lo que debe verificar los términos actuales antes de usarlo ampliamente.
