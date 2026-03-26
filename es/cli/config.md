---
summary: "Referencia de CLI para `openclaw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Auxiliares de configuración para ediciones no interactivas en `openclaw.json`: get/set/unset/validate
valores por ruta e imprimir el archivo de configuración activo. Ejecutar sin un subcomando para
abrir el asistente de configuración (igual que `openclaw configure`).

## Ejemplos

```bash
openclaw config file
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

## Rutas

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

Los valores se analizan como JSON5 cuando sea posible; de lo contrario, se tratan como cadenas.
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

El modo de ruta/valor JSON sigue siendo compatible tanto para SecretRefs como para proveedores:

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Opciones del constructor de proveedor

Los objetivos del constructor de proveedor deben usar `secrets.providers.<alias>` como la ruta.

Opciones comunes:

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Proveedor Env (`--provider-source env`):

- `--provider-allowlist <ENV_VAR>` (repetible)

Proveedor de archivos (`--provider-source file`):

- `--provider-path <path>` (obligatorio)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Proveedor Exec (`--provider-source exec`):

- `--provider-command <path>` (obligatorio)
- `--provider-arg <arg>` (repetible)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (repetible)
- `--provider-pass-env <ENV_VAR>` (repetible)
- `--provider-trusted-dir <path>` (repetible)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

Ejemplo de proveedor de ejecución reforzado:

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

Use `--dry-run` para validar los cambios sin escribir `openclaw.json`.

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

- Modo de constructor (Builder mode): ejecuta comprobaciones de resolubilidad de SecretRef para las referencias/proveedores modificados.
- Modo JSON (`--strict-json`, `--json` o modo por lotes): ejecuta la validación del esquema más las comprobaciones de resolubilidad de SecretRef.
- Las comprobaciones de SecretRef de ejecución (Exec) se omiten de forma predeterminada durante la ejecución en seco para evitar efectos secundarios en los comandos.
- Use `--allow-exec` con `--dry-run` para optar por las comprobaciones de SecretRef de ejecución (esto puede ejecutar comandos de proveedor).
- `--allow-exec` es solo para ejecución en seco y genera errores si se usa sin `--dry-run`.

`--dry-run --json` imprime un informe legible por máquina:

- `ok`: si la ejecución en seco fue exitosa
- `operations`: número de asignaciones evaluadas
- `checks`: si se ejecutaron las comprobaciones de esquema/resolubilidad
- `checks.resolvabilityComplete`: si las comprobaciones de resolubilidad se completaron (falso cuando se omiten las referencias de ejecución)
- `refsChecked`: número de referencias resueltas realmente durante la ejecución en seco
- `skippedExecRefs`: número de referencias de ejecución omitidas porque `--allow-exec` no estaba establecido
- `errors`: fallos de esquema/resolubilidad estructurados cuando `ok=false`

### Forma de salida JSON

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

Ejemplo de éxito:

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

Ejemplo de fallo:

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

Si la ejecución en seco falla:

- `config schema validation failed`: la forma de su configuración posterior al cambio no es válida; corrija la ruta/valor o la forma del objeto del proveedor/referencia.
- `SecretRef assignment(s) could not be resolved`: el proveedor/referencia al que se hace referencia actualmente no se puede resolver (falta la variable de entorno, puntero de archivo no válido, fallo del proveedor de ejecución o falta de coincidencia entre el proveedor y la fuente).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: la ejecución en seco omitió las referencias de ejecución; vuelva a ejecutar con `--allow-exec` si necesita validación de resolubilidad de ejecución.
- Para el modo por lotes, corrija las entradas con errores y vuelva a ejecutar `--dry-run` antes de escribir.

## Subcomandos

- `config file`: Imprime la ruta del archivo de configuración activo (resuelta desde `OPENCLAW_CONFIG_PATH` o la ubicación predeterminada).

Reinicia la puerta de enlace después de las ediciones.

## Validar

Valida la configuración actual contra el esquema activo sin iniciar la
puerta de enlace.

```bash
openclaw config validate
openclaw config validate --json
```

import es from "/components/footer/es.mdx";

<es />
