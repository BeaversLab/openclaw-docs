---
summary: "Referencia de CLI para `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Auxiliares de configuración para ediciones no interactivas en `openclaw.json`: get/set/unset/file/schema/validate
valores por ruta e imprimir el archivo de configuración activo. Ejecutar sin un subcomando para
abrir el asistente de configuración (igual que `openclaw configure`).

Opciones raíz:

- `--section <section>`: filtro de sección de configuración guiada repetible cuando ejecuta `openclaw config` sin un subcomando

Secciones guiadas admitidas:

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

## Ejemplos

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
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

Imprime el esquema JSON generado para `openclaw.json` en stdout como JSON.

Lo que incluye:

- El esquema de configuración raíz actual, además de un campo de cadena raíz `$schema` para las herramientas del editor
- Campo `title` y metadatos de documentos `description` utilizados por la Interfaz de usuario de Control
- Los nodos de objeto anidado, comodín (`*`) y elemento de matriz (`[]`) heredan los mismos metadatos `title` / `description` cuando existe documentación de campo coincidente
- Las ramas `anyOf` / `oneOf` / `allOf` también heredan los mismos metadatos de documentos cuando existe documentación de campo coincidente
- Metadatos de esquema de complemento y canal en vivo con el mejor esfuerzo cuando se pueden cargar los manifiestos de tiempo de ejecución
- Un esquema de reserva limpio incluso cuando la configuración actual no es válida

RPC de tiempo de ejecución relacionado:

- `config.schema.lookup` devuelve una ruta de configuración normalizada con un
  nodo de esquema superficial (`title`, `description`, `type`, `enum`, `const`, límites comunes),
  metadatos de sugerencia de interfaz de usuario coincidentes y resúmenes secundarios inmediatos. Úselo para
  análisis detallado con alcance de ruta en la Interfaz de usuario de Control o clientes personalizados.

```bash
openclaw config schema
```

Rediríjalo a un archivo cuando desee inspeccionarlo o validarlo con otras herramientas:

```bash
openclaw config schema > openclaw.schema.json
```

### Rutas

Las rutas utilizan notación de puntos o corchetes:

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

`config get <path> --json` imprime el valor sin formato como JSON en lugar de texto formateado para la terminal.

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

Nota sobre la política:

- Las asignaciones SecretRef se rechazan en superficies mutables en tiempo de ejecución no compatibles (por ejemplo, `hooks.token`, `commands.ownerDisplaySecret`, tokens de webhook de vinculación de hilos de Discord y credenciales JSON de WhatsApp). Consulte [Superficie de credenciales SecretRef](/en/reference/secretref-credential-surface).

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

## Marcas del constructor de proveedor

Los objetivos del constructor de proveedor deben usar `secrets.providers.<alias>` como la ruta.

Marcas comunes:

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Proveedor de entorno (`--provider-source env`):

- `--provider-allowlist <ENV_VAR>` (repetible)

Proveedor de archivos (`--provider-source file`):

- `--provider-path <path>` (requerido)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Proveedor Exec (`--provider-source exec`):

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

Ejemplo de proveedor de ejecución endurecido:

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

- Modo de constructor: ejecuta comprobaciones de resolubilidad de SecretRef para las referencias/proveedores modificados.
- Modo JSON (`--strict-json`, `--json`, o modo por lotes): ejecuta la validación del esquema además de las comprobaciones de resolubilidad de SecretRef.
- La validación de políticas también se ejecuta para superficies de destino SecretRef conocidas no admitidas.
- Las comprobaciones de políticas evalúan la configuración completa posterior al cambio, por lo que las escrituras de objetos principales (por ejemplo, establecer `hooks` como un objeto) no pueden omitir la validación de superficies no admitidas.
- Las comprobaciones de Exec SecretRef se omiten de forma predeterminada durante la ejecución en seco para evitar efectos secundarios de los comandos.
- Use `--allow-exec` con `--dry-run` para optar por las comprobaciones de Exec SecretRef (esto puede ejecutar comandos de proveedor).
- `--allow-exec` es solo de ejecución en seco y genera un error si se usa sin `--dry-run`.

`--dry-run --json` imprime un informe legible por máquina:

- `ok`: si la ejecución en seco fue exitosa
- `operations`: número de asignaciones evaluadas
- `checks`: si se ejecutaron las comprobaciones de esquema/resolubilidad
- `checks.resolvabilityComplete`: si las comprobaciones de resolubilidad se ejecutaron hasta completarse (falso cuando se omiten las referencias de ejecución)
- `refsChecked`: número de referencias realmente resueltas durante la ejecución en seco
- `skippedExecRefs`: número de referencias de ejecución omitidas porque `--allow-exec` no estaba configurado
- `errors`: fallos estructurados de esquema/resolubilidad cuando `ok=false`

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

- `config schema validation failed`: la forma de su configuración posterior al cambio no es válida; corrija la ruta/valor o la forma del objeto proveedor/referencia.
- `Config policy validation failed: unsupported SecretRef usage`: devuelva esa credencial a una entrada de texto plano/cadena y mantenga SecretRefs solo en superficies compatibles.
- `SecretRef assignment(s) could not be resolved`: el proveedor/ref referenciado actualmente no se puede resolver (falta una variable de entorno, puntero de archivo no válido, fallo del proveedor de ejecución o discordancia entre proveedor/fuente).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: la ejecución de prueba omitió las refs de ejecución; vuelva a ejecutar con `--allow-exec` si necesita validación de capacidad de resolución de ejecución.
- Para el modo por lotes, corrija las entradas fallidas y vuelva a ejecutar `--dry-run` antes de escribir.

## Subcomandos

- `config file`: Imprime la ruta del archivo de configuración activo (resuelto desde `OPENCLAW_CONFIG_PATH` o la ubicación predeterminada).

Reinicie la puerta de enlace después de las ediciones.

## Validar

Valide la configuración actual contra el esquema activo sin iniciar la
puerta de enlace.

```bash
openclaw config validate
openclaw config validate --json
```
