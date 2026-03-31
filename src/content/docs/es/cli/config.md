---
summary: "Referencia de la CLI para `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Auxiliares de configuración para ediciones no interactivas en `openclaw.json`: get/set/unset/file/schema/validate
valores por ruta e imprime el archivo de configuración activo. Ejecuta sin un subcomando para
abrir el asistente de configuración (igual que `openclaw configure`).

## Ejemplos

```bash
openclaw config file
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Imprime el esquema JSON generado para `openclaw.json` en stdout como texto plano.

```bash
openclaw config schema
```

Rediríjelo a un archivo cuando desee inspeccionarlo o validarlo con otras herramientas:

```bash
openclaw config schema > openclaw.schema.json
```

### Rutas

Las rutas usan notación de punto o de corchetes:

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

Use el índice de la lista de agentes para apuntar a un agente específico:

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Valores

Los valores se analizan como JSON5 cuando es posible; de lo contrario, se tratan como cadenas.
Use `--strict-json` para requerir el análisis JSON5. `--json` sigue siendo compatible como alias heredado.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## Modos `config set`

`openclaw config set` admite cuatro estilos de asignación:

1. Modo de valor: `openclaw config set <path> <value>`
2. Modo de constructor SecretRef:

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Modo de constructor de proveedor (solo ruta `secrets.providers.<alias>`):

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. Modo por lotes (`--batch-json` o `--batch-file`):

```bash
openclaw config set --batch-json '[
  {
    "path": "secrets.providers.default",
    "provider": { "source": "env" }
  },
  {
    "path": "channels.discord.token",
    "ref": { "source": "env", "provider": "default", "id": "DISCORD_BOT_TOKEN" }
  }
]'
```

```bash
openclaw config set --batch-file ./config-set.batch.json --dry-run
```

El análisis por lotes siempre utiliza la carga útil por lotes (`--batch-json`/`--batch-file`) como fuente de verdad.
`--strict-json` / `--json` no cambian el comportamiento del análisis por lotes.

El modo de ruta/valor JSON sigue siendo compatible tanto con SecretRefs como con proveedores:

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Marcas del constructor de proveedores

Los objetivos del constructor de proveedores deben usar `secrets.providers.<alias>` como ruta.

Marcas comunes:

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Proveedor de entorno (`--provider-source env`):

- `--provider-allowlist <ENV_VAR>` (repetible)

Proveedor de archivos (`--provider-source file`):

- `--provider-path <path>` (requerido)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Proveedor de ejecución (`--provider-source exec`):

- `--provider-command <path>` (requerido)
- `--provider-arg <arg>` (repetible)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (repetible)
- `--provider-pass-env <ENV_VAR>` (repetible)
- `--provider-trusted-dir <path>` (repetible)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

Ejemplo de proveedor de ejecución blindado:

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-json-only \
  --provider-pass-env VAULT_TOKEN \
  --provider-trusted-dir /usr/local/bin \
  --provider-timeout-ms 5000
```

## Ejecución en seco

Use `--dry-run` para validar cambios sin escribir `openclaw.json`.

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run

openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run \
  --json

openclaw config set channels.discord.token \
  --ref-provider vault \
  --ref-source exec \
  --ref-id discord/token \
  --dry-run \
  --allow-exec
```

Comportamiento de ejecución en seco:

- Modo de constructor: ejecuta comprobaciones de resolución de SecretRef para referencias/proveedores modificados.
- Modo JSON (`--strict-json`, `--json`, o modo por lotes): ejecuta validación de esquema además de comprobaciones de resolución de SecretRef.
- Las comprobaciones de Exec SecretRef se omiten de forma predeterminada durante la ejecución en seco para evitar efectos secundarios de los comandos.
- Use `--allow-exec` con `--dry-run` para optar por las comprobaciones de exec SecretRef (esto puede ejecutar comandos del proveedor).
- `--allow-exec` es solo de simulación (dry-run) y genera un error si se usa sin `--dry-run`.

`--dry-run --json` imprime un informe legible por máquina:

- `ok`: si la simulación (dry-run) fue exitosa
- `operations`: número de asignaciones evaluadas
- `checks`: si se ejecutaron las comprobaciones de esquema/resolvibilidad
- `checks.resolvabilityComplete`: si las comprobaciones de resolvibilidad se completaron (falso cuando se omiten las referencias de ejecución)
- `refsChecked`: número de referencias realmente resueltas durante la simulación
- `skippedExecRefs`: número de referencias de ejecución omitidas porque `--allow-exec` no estaba establecido
- `errors`: fallos estructurados de esquema/resolvibilidad cuando `ok=false`

### JSON Output Shape

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "schema" | "resolvability",
      message: string,
      ref?: string, // present for resolvability errors
    },
  ],
}
```

Success example:

```json
{
  "ok": true,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0
}
```

Failure example:

```json
{
  "ok": false,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0,
  "errors": [
    {
      "kind": "resolvability",
      "message": "Error: Environment variable \"MISSING_TEST_SECRET\" is not set.",
      "ref": "env:default:MISSING_TEST_SECRET"
    }
  ]
}
```

If dry-run fails:

- `config schema validation failed`: la forma de su configuración posterior al cambio no es válida; corrija la ruta/valor o la forma del objeto proveedor/referencia.
- `SecretRef assignment(s) could not be resolved`: el proveedor/referencia al que se hace referencia actualmente no se puede resolver (falta variable de entorno, puntero de archivo no válido, fallo del proveedor de ejecución o falta de coincidencia entre proveedor y fuente).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: la ejecución en seco omitió las referencias de ejecución; vuelva a ejecutar con `--allow-exec` si necesita la validación de la capacidad de resolución de la ejecución.
- Para el modo por lotes, corrija las entradas con errores y vuelva a ejecutar `--dry-run` antes de escribir.

## Subcomandos

- `config file`: Imprime la ruta del archivo de configuración activo (resuelta a partir de `OPENCLAW_CONFIG_PATH` o la ubicación predeterminada).

Reinicie la puerta de enlace después de las ediciones.

## Validar

Valide la configuración actual frente al esquema activo sin iniciar la
puerta de enlace.

```bash
openclaw config validate
openclaw config validate --json
```
