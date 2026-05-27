---
summary: "Referencia de la CLI para `openclaw config` (get/set/patch/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "Configuración"
sidebarTitle: "Configuración"
---

Auxiliares de configuración para ediciones no interactivas en `openclaw.json`: obtención/establecimiento/actualización/eliminación/archivo/esquema/validación de valores por ruta e impresión del archivo de configuración activo. Ejecutar sin un subcomando para abrir el asistente de configuración (igual que `openclaw configure`).

<Note>
Cuando `OPENCLAW_NIX_MODE=1`, OpenClaw trata `openclaw.json` como inmutable. Los comandos de solo lectura como `config get`, `config file`, `config schema` y `config validate` siguen funcionando, pero los escritores de configuración se niegan. Los agentes deben editar la fuente de Nix para la instalación en su lugar; para la distribución de primera parte nix-openclaw, use [nix-openclaw Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) y establezca valores en `programs.openclaw.config` o `instances.<name>.config`.
</Note>

## Opciones raíz

<ParamField path="--section <section>" type="string">
  Filtro de sección de configuración guiada repetible cuando ejecuta `openclaw config` sin un subcomando.
</ParamField>

Secciones guiadas compatibles: `workspace`, `model`, `web`, `gateway`, `daemon`, `channels`, `plugins`, `skills`, `health`.

## Ejemplos

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Imprime el esquema JSON generado para `openclaw.json` en stdout como JSON.

<AccordionGroup>
  <Accordion title="Lo que incluye">
    - El esquema de configuración raíz actual, más un campo de cadena `$schema` raíz para las herramientas del editor.
    - Metadatos de documentos `title` y `description` de campo utilizados por la interfaz de usuario de Control.
    - Los nodos de objeto anidado, comodín (`*`) y elemento de matriz (`[]`) heredan los mismos metadatos `title` / `description` cuando existe documentación de campo coincidente.
    - Las ramas `anyOf` / `oneOf` / `allOf` también heredan los mismos metadatos de documentos cuando existe documentación de campo coincidente.
    - Metadatos de esquema de complemento y canal en vivo con el mejor esfuerzo cuando se pueden cargar los manifiestos de tiempo de ejecución.
    - Un esquema de reserva limpio incluso cuando la configuración actual no es válida.

  </Accordion>
  <Accordion title="RPC de tiempo de ejecución relacionado">
    `config.schema.lookup` devuelve una ruta de configuración normalizada con un nodo de esquema superficial (`title`, `description`, `type`, `enum`, `const`, límites comunes), metadatos de sugerencias de interfaz de usuario coincidentes e resúmenes secundarios inmediatos. Úselo para la exploración con ámbito de ruta en la interfaz de usuario de Control o clientes personalizados.
  </Accordion>
</AccordionGroup>

```bash
openclaw config schema
```

Rediríjalo a un archivo cuando desee inspeccionarlo o validarlo con otras herramientas:

```bash
openclaw config schema > openclaw.schema.json
```

### Rutas

Las rutas usan notación de puntos o corchetes. Cite las rutas con notación de corchetes en los ejemplos de shell para que shells como zsh no expandan `[0]` como un glob antes de que OpenClaw reciba la ruta:

```bash
openclaw config get agents.defaults.workspace
openclaw config get 'agents.list[0].id'
```

Utilice el índice de la lista de agentes para apuntar a un agente específico:

```bash
openclaw config get agents.list
openclaw config set 'agents.list[1].tools.exec.node' "node-id-or-name"
```

## Valores

Los valores se analizan como JSON5 cuando es posible; de lo contrario, se tratan como cadenas. Use `--strict-json` para requerir el análisis JSON5. `--json` sigue siendo compatible como un alias heredado.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` imprime el valor sin formato como JSON en lugar de texto con formato de terminal.

<Note>
La asignación de objetos reemplaza la ruta de destino de forma predeterminada. Las rutas de mapa/lista protegidas que comúnmente contienen entradas agregadas por el usuario, como `agents.defaults.models`, `models.providers`, `models.providers.<id>.models`, `plugins.entries` y `auth.profiles`, rechazan los reemplazos que eliminarían las entradas existentes a menos que pase `--replace`.
</Note>

Use `--merge` al agregar entradas a esos mapas:

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

Use `--replace` solo cuando intencionalmente desee que el valor proporcionado se convierta en el valor objetivo completo.

## modos `config set`

`openclaw config set` admite cuatro estilos de asignación:

<Tabs>
  <Tab title="Modo de valor">
    ```bash
    openclaw config set <path> <value>
    ```
  </Tab>
  <Tab title="Modo de constructor SecretRef">
    ```bash
    openclaw config set channels.discord.token \
      --ref-provider default \
      --ref-source env \
      --ref-id DISCORD_BOT_TOKEN
    ```
  </Tab>
  <Tab title="Modo de generador de proveedor">
    El modo de generador de proveedor apunta solo a rutas `secrets.providers.<alias>`:

    ```bash
    openclaw config set secrets.providers.vault \
      --provider-source exec \
      --provider-command /usr/local/bin/openclaw-vault \
      --provider-arg read \
      --provider-arg openai/api-key \
      --provider-timeout-ms 5000
    ```

  </Tab>
  <Tab title="Modo por lotes">
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

  </Tab>
</Tabs>

<Warning>Las asignaciones de SecretRef se rechazan en superficies mutables en tiempo de ejecución no compatibles (por ejemplo `hooks.token`, `commands.ownerDisplaySecret`, tokens de webhook de enlace de subprocesos de Discord y credenciales JSON de WhatsApp). Consulte [SecretRef Credential Surface](/es/reference/secretref-credential-surface).</Warning>

El análisis por lotes siempre utiliza la carga útil del lote (`--batch-json`/`--batch-file`) como fuente de verdad. `--strict-json` / `--json` no cambian el comportamiento del análisis por lotes.

## `config patch`

Use `config patch` cuando desee pegar o canalizar un parche con forma de configuración en lugar de ejecutar muchos comandos `config set` basados en rutas. La entrada es un objeto JSON5. Los objetos se fusionan recursivamente, las matrices y los valores escalares reemplazan el valor de destino, y `null` elimina la ruta de destino.

```bash
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config patch --file ./openclaw.patch.json5
```

También puedes enviar un parche a través de stdin, lo cual es útil para scripts de configuración remota:

```bash
ssh openclaw-host 'openclaw config patch --stdin --dry-run' < ./openclaw.patch.json5
ssh openclaw-host 'openclaw config patch --stdin' < ./openclaw.patch.json5
```

Parche de ejemplo:

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

Use `--replace-path <path>` cuando un objeto o matriz debe convertirse exactamente en el valor proporcionado en lugar de ser parcheado recursivamente:

```bash
openclaw config patch --file ./discord.patch.json5 --replace-path 'channels.discord.guilds["123"].channels'
```

`--dry-run` ejecuta verificaciones de esquema y resolución de SecretRef sin escribir. Los SecretRefs respaldados por Exec se omiten de manera predeterminada durante la ejecución en seco; agregue `--allow-exec` cuando intencionalmente desee que la ejecución en seco ejecute comandos de proveedor.

El modo de ruta/valor de JSON sigue siendo compatible tanto con SecretRefs como con proveedores:

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Opciones del constructor de proveedores

Los objetivos del constructor de proveedores deben usar `secrets.providers.<alias>` como la ruta.

<AccordionGroup>
  <Accordion title="Common flags">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)

  </Accordion>
  <Accordion title="Env provider (--provider-source env)">
    - `--provider-allowlist <ENV_VAR>` (repetible)

  </Accordion>
  <Accordion title="File provider (--provider-source file)">
    - `--provider-path <path>` (obligatorio)
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`

  </Accordion>
  <Accordion title="Exec provider (--provider-source exec)">
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

  </Accordion>
</AccordionGroup>

Ejemplo de proveedor Exec endurecido:

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

<AccordionGroup>
  <Accordion title="Comportamiento de la ejecución en seco">
    - Modo de constructor: ejecuta comprobaciones de resolubilidad de SecretRef para las referencias/proveedores modificados.
    - Modo JSON (`--strict-json`, `--json`, o modo por lotes): ejecuta la validación del esquema además de las comprobaciones de resolubilidad de SecretRef.
    - La validación de políticas también se ejecuta para superficies de destino SecretRef conocidas no admitidas.
    - Las comprobaciones de políticas evalúan la configuración completa posterior al cambio, por lo que las escrituras de objetos principales (por ejemplo, establecer `hooks` como un objeto) no pueden eludir la validación de superficie no admitida.
    - Las comprobaciones de Exec SecretRef se omiten de forma predeterminada durante la ejecución en seco para evitar efectos secundarios de los comandos.
    - Use `--allow-exec` con `--dry-run` para participar en las comprobaciones de Exec SecretRef (esto puede ejecutar comandos de proveedor).
    - `--allow-exec` es solo para ejecución en seco y genera errores si se usa sin `--dry-run`.

  </Accordion>
  <Accordion title="--dry-run -- fields">
    `--dry-run --json` imprime un reporte legible por máquina:

    - `ok`: si la ejecución en seco (dry-run) fue exitosa
    - `operations`: número de asignaciones evaluadas
    - `checks`: si se ejecutaron las comprobaciones de esquema/resolvibilidad
    - `checks.resolvabilityComplete`: si las comprobaciones de resolvibilidad se completaron (falso cuando se omiten las referencias de ejecución)
    - `refsChecked`: número de referencias resueltas realmente durante la ejecución en seco
    - `skippedExecRefs`: número de referencias de ejecución omitidas porque `--allow-exec` no se estableció
    - `errors`: fallos estructurados de ruta faltante, esquema o resolvibilidad cuando `ok=false`

  </Accordion>
</AccordionGroup>

### Forma de salida JSON

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder" | "unset", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "missing-path" | "schema" | "resolvability",
      message: string,
      ref?: string, // present for resolvability errors
    },
  ],
}
```

<Tabs>
  <Tab title="Ejemplo de éxito">
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
  </Tab>
  <Tab title="Ejemplo de error">
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
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Si falla la ejecución en seco">
    - `config schema validation failed`: la forma de su configuración posterior al cambio no es válida; corrija la ruta/valor o la forma del objeto de proveedor/referencia.
    - `Config policy validation failed: unsupported SecretRef usage`: devuelva esa credencial a la entrada de texto plano/cadena y mantenga SecretRefs solo en las superficies compatibles.
    - `SecretRef assignment(s) could not be resolved`: el proveedor/referencia al que se hace referencia actualmente no se puede resolver (variable de entorno faltante, puntero de archivo no válido, falla del proveedor de ejecución o discrepancia de proveedor/fuente).
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: la ejecución en seco omitió las referencias de ejecución; vuelva a ejecutar con `--allow-exec` si necesita validación de resolvibilidad de ejecución.
    - Para el modo por lotes, corrija las entradas fallidas y vuelva a ejecutar `--dry-run` antes de escribir.

  </Accordion>
</AccordionGroup>

## Seguridad de escritura

`openclaw config set` y otros escritores de configuración propiedad de OpenClaw validan la configuración completa posterior al cambio antes de confirmarla en el disco. Si la nueva carga útil falla la validación del esquema o parece una sobrescritura destructiva, la configuración activa se deja intacta y la carga útil rechazada se guarda junto a ella como `openclaw.json.rejected.*`.

<Warning>La ruta de configuración activa debe ser un archivo regular. Las disposiciones `openclaw.json` enlazadas simbólicamente no son compatibles con la escritura; use `OPENCLAW_CONFIG_PATH` para apuntar directamente al archivo real.</Warning>

Prefiera las escrituras desde la CLI para pequeñas ediciones:

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

Si se rechaza una escritura, inspeccione la carga útil guardada y corrija la forma completa de la configuración:

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

Las escrituras directas del editor aún están permitidas, pero el Gateway en ejecución las trata como no confiables hasta que se validen. Las ediciones directas inválidas fallan el inicio o son omitidas por la recarga en caliente; el Gateway no reescribe `openclaw.json`. Ejecute `openclaw doctor --fix` para reparar la configuración prefijada o sobrescrita, o para restaurar la última copia conocida como buena. Consulte [Solución de problemas de Gateway](/es/gateway/troubleshooting#gateway-rejected-invalid-config).

La recuperación de todo el archivo está reservada para la reparación del doctor. Los cambios de esquema del complemento o el sesgo de `minHostVersion` permanecen activos en lugar de revertir la configuración del usuario no relacionada, como modelos, proveedores, perfiles de autenticación, canales, exposición de gateway, herramientas, memoria, navegador o configuración de cron.

## Subcomandos

- `config file`: Imprime la ruta del archivo de configuración activo (resuelta desde `OPENCLAW_CONFIG_PATH` o la ubicación predeterminada). La ruta debe nombrar un archivo regular, no un enlace simbólico.

Reinicie la puerta de enlace después de realizar las ediciones.

## Validar

Valide la configuración actual contra el esquema activo sin iniciar la puerta de enlace.

```bash
openclaw config validate
openclaw config validate --json
```

Una vez que `openclaw config validate` esté pasando, puede usar la TUI local para que un agente integrado compare la configuración activa con la documentación mientras valida cada cambio desde la misma terminal:

<Note>Si la validación ya está fallando, comience con `openclaw configure` o `openclaw doctor --fix`. `openclaw chat` no omite la protección de configuración inválida.</Note>

```bash
openclaw chat
```

Luego, dentro de la TUI:

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

Ciclo de reparación típico:

<Steps>
  <Step title="Comparar con la documentación">Pida al agente que compare su configuración actual con la página de documentación relevante y sugiera la solución más pequeña.</Step>
  <Step title="Aplicar ediciones específicas">Aplique ediciones específicas con `openclaw config set` o `openclaw configure`.</Step>
  <Step title="Revalidar">Vuelva a ejecutar `openclaw config validate` después de cada cambio.</Step>
  <Step title="Doctor para problemas de tiempo de ejecución">Si la validación pasa pero el tiempo de ejecución aún no está sano, ejecute `openclaw doctor` o `openclaw doctor --fix` para obtener ayuda de migración y reparación.</Step>
</Steps>

## Relacionado

- [Referencia de CLI](/es/cli)
- [Configuración](/es/gateway/configuration)
