---
summary: "Referencia de CLI para `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "Configuración"
sidebarTitle: "Configuración"
---

Ayudas de configuración para ediciones no interactivas en `openclaw.json`: obtención/definición/eliminación/archivo/esquema/validación de valores por ruta e impresión del archivo de configuración activo. Ejecutar sin un subcomando para abrir el asistente de configuración (igual que `openclaw configure`).

## Opciones raíz

<ParamField path="--section <section>" type="string">
  Filtro de sección de configuración guiada repetible cuando ejecutas `openclaw config` sin un subcomando.
</ParamField>

Secciones guiadas admitidas: `workspace`, `model`, `web`, `gateway`, `daemon`, `channels`, `plugins`, `skills`, `health`.

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
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Imprime el esquema JSON generado para `openclaw.json` en stdout como JSON.

<AccordionGroup>
  <Accordion title="Lo que incluye">
    - El esquema de configuración raíz actual, más un campo de cadena raíz `$schema` para herramientas de edición. - Campo `title` y metadatos de documentación `description` utilizados por la interfaz de usuario de Control. - Los nodos de objeto anidado, comodín (`*`) y elemento de matriz (`[]`) heredan los mismos metadatos `title` / `description` cuando existe documentación de campo coincidente.
    - Las ramas `anyOf` / `oneOf` / `allOf` también heredan los mismos metadatos de documentación cuando existe documentación de campo coincidente. - Metadatos de esquema de complemento y canal en vivo mejor esfuerzo cuando se pueden cargar manifiestos de tiempo de ejecución. - Un esquema de reserva limpio incluso cuando la configuración actual no es válida.
  </Accordion>
  <Accordion title="RPC de tiempo de ejecución relacionado">
    `config.schema.lookup` devuelve una ruta de configuración normalizada con un nodo de esquema superficial (`title`, `description`, `type`, `enum`, `const`, límites comunes), metadatos de sugerencia de interfaz de usuario coincidentes y resúmenes de hijos inmediatos. Úselo para la exploración con ámbito de ruta en la interfaz de usuario de Control o en clientes personalizados.
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

Las rutas utilizan notación de puntos o corchetes:

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

Utilice el índice de la lista de agentes para apuntar a un agente específico:

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Valores

Los valores se analizan como JSON5 cuando es posible; de lo contrario, se tratan como cadenas. Use `--strict-json` para requerir el análisis JSON5. `--json` sigue siendo compatible como alias heredado.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` imprime el valor sin formato como JSON en lugar de texto formateado para terminal.

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
  <Tab title="Modo de constructor de proveedor">
    El modo de constructor de proveedor apunta solo a rutas `secrets.providers.<alias>`:

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

<Warning>Las asignaciones SecretRef se rechazan en superficies mutables en tiempo de ejecución no compatibles (por ejemplo `hooks.token`, `commands.ownerDisplaySecret`, tokens de webhook de enlace de hilos de Discord y credenciales JSON de WhatsApp). Consulte [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface).</Warning>

El análisis por lotes siempre utiliza la carga útil por lotes (`--batch-json`/`--batch-file`) como fuente de verdad. `--strict-json` / `--json` no modifican el comportamiento del análisis por lotes.

El modo de ruta/valor JSON sigue siendo compatible tanto con SecretRefs como con proveedores:

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Opciones del constructor de proveedores

Los objetivos del constructor de proveedores deben utilizar `secrets.providers.<alias>` como ruta.

<AccordionGroup>
  <Accordion title="Opciones comunes">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)
  </Accordion>
  <Accordion title="Proveedor Env (--provider-source env)">
    - `--provider-allowlist <ENV_VAR>` (repetible)
  </Accordion>
  <Accordion title="Proveedor File (--provider-source file)">
    - `--provider-path <path>` (requerido)
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`
  </Accordion>
  <Accordion title="Proveedor Exec (--provider-source exec)">
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

Use `--dry-run` to validate changes without writing `openclaw.json`.

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
  <Accordion title="Comportamiento de dry-run">
    - Modo de constructor (Builder mode): ejecuta comprobaciones de resolubilidad de SecretRef para las referencias/proveedores modificados.
    - Modo JSON (`--strict-json`, `--json`, o modo por lotes): ejecuta la validación del esquema además de las comprobaciones de resolubilidad de SecretRef.
    - La validación de políticas también se ejecuta para superficies de destino de SecretRef conocidas como no compatibles.
    - Las comprobaciones de políticas evalúan la configuración completa posterior al cambio, por lo que las escrituras de objetos principales (por ejemplo, establecer `hooks` como un objeto) no pueden eludir la validación de superficie no compatible.
    - Las comprobaciones de Exec SecretRef se omiten de forma predeterminada durante la ejecución de prueba (dry-run) para evitar efectos secundarios en los comandos.
    - Use `--allow-exec` con `--dry-run` para optar por las comprobaciones de Exec SecretRef (esto puede ejecutar comandos del proveedor).
    - `--allow-exec` es solo para ejecución de prueba (dry-run) y genera un error si se usa sin `--dry-run`.
  </Accordion>
  <Accordion title="campos --dry-run --">
    `--dry-run --json` imprime un informe legible por máquina:

    - `ok`: si la ejecución de prueba (dry-run) fue exitosa.
    - `operations`: número de asignaciones evaluadas.
    - `checks`: si se ejecutaron las comprobaciones de esquema/resolubilidad.
    - `checks.resolvabilityComplete`: si las comprobaciones de resolubilidad se ejecutaron hasta completarse (falso cuando se omiten las referencias de ejecución).
    - `refsChecked`: número de referencias realmente resueltas durante la ejecución de prueba.
    - `skippedExecRefs`: número de referencias de ejecución omitidas porque `--allow-exec` no estaba establecido.
    - `errors`: fallos estructurados de esquema/resolubilidad cuando `ok=false`

  </Accordion>
</AccordionGroup>

### Forma de la salida JSON

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
  <Tab title="Ejemplo de fallo">
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
    - `config schema validation failed`: la forma de su configuración posterior al cambio no es válida; corrija la ruta/valor o la forma del objeto proveedor/referencia.
    - `Config policy validation failed: unsupported SecretRef usage`: mueva esa credencial de vuelta a una entrada de texto plano/cadena y mantenga SecretRefs solo en las superficies admitidas.
    - `SecretRef assignment(s) could not be resolved`: el proveedor/referencia al que se hace referencia actualmente no se puede resolver (variable de entorno faltante, puntero de archivo no válido, falla del proveedor de ejecución o desajuste entre proveedor/fuente).
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: la ejecución en seco omitió las referencias de ejecución; vuelva a ejecutar con `--allow-exec` si necesita validación de capacidad de resolución de ejecución.
    - Para el modo por lotes, corrija las entradas fallidas y vuelva a ejecutar `--dry-run` antes de escribir.
  </Accordion>
</AccordionGroup>

## Seguridad de escritura

`openclaw config set` y otros escritores de configuración propiedad de OpenClaw validan la configuración completa posterior al cambio antes de confirmarla en el disco. Si la nueva carga útil falla la validación del esquema o parece una sobrescritura destructiva, la configuración activa se deja intacta y la carga útil rechazada se guarda junto a ella como `openclaw.json.rejected.*`.

<Warning>La ruta de configuración activa debe ser un archivo normal. Los diseños `openclaw.json` enlazados simbólicamente no son compatibles con las escrituras; use `OPENCLAW_CONFIG_PATH` para apuntar directamente al archivo real en su lugar.</Warning>

Prefiera las escrituras desde la CLI para ediciones pequeñas:

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

Las escrituras directas del editor todavía están permitidas, pero el Gateway en ejecución las trata como no confiables hasta que se validen. Las ediciones directas no válidas se pueden restaurar desde la copia de seguridad conocida más reciente durante el inicio o la recarga en caliente. Consulte [Solución de problemas del Gateway](/es/gateway/troubleshooting#gateway-restored-last-known-good-config).

La recuperación de todo el archivo está reservada para configuraciones globalmente rotas, como errores de análisis, fallos de esquema a nivel raíz, fallos de migración heredados o fallos mixtos de complementos y raíz. Si la validación falla solo bajo `plugins.entries.<id>...`, OpenClaw mantiene el `openclaw.json` activo en su lugar e informa el problema local del complemento en lugar de restaurar `.last-good`. Esto evita que los cambios de esquema del complemento o el desfase de `minHostVersion` reviertan configuraciones de usuario no relacionadas, como modelos, proveedores, perfiles de autenticación, canales, exposición de la puerta de enlace, herramientas, memoria, navegador o configuración de cron.

## Subcomandos

- `config file`: Imprime la ruta del archivo de configuración activo (resuelta desde `OPENCLAW_CONFIG_PATH` o la ubicación predeterminada). La ruta debe nombrar un archivo regular, no un enlace simbólico.

Reinicia la puerta de enlace después de las ediciones.

## Validar

Valide la configuración actual contra el esquema activo sin iniciar la puerta de enlace.

```bash
openclaw config validate
openclaw config validate --json
```

Una vez que `openclaw config validate` sea exitoso, puede usar la TUI local para que un agente integrado compare la configuración activa con la documentación mientras valida cada cambio desde la misma terminal:

<Note>Si la validación ya está fallando, comience con `openclaw configure` o `openclaw doctor --fix`. `openclaw chat` no omite el protector de configuración no válida.</Note>

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

Bucle de reparación típico:

<Steps>
  <Step title="Comparar con la documentación">Pida al agente que compare su configuración actual con la página de documentación relevante y sugiera la solución más pequeña.</Step>
  <Step title="Aplicar ediciones específicas">Aplique ediciones específicas con `openclaw config set` o `openclaw configure`.</Step>
  <Step title="Volver a validar">Vuelva a ejecutar `openclaw config validate` después de cada cambio.</Step>
  <Step title="Doctor para problemas de tiempo de ejecución">Si la validación pasa pero el tiempo de ejecución aún no es saludable, ejecute `openclaw doctor` o `openclaw doctor --fix` para obtener ayuda de migración y reparación.</Step>
</Steps>

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Configuración](/es/gateway/configuration)
