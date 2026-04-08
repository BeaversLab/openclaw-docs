---
summary: "Referencia de CLI para `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `openclaw agents`

Administrar agentes aislados (espacios de trabajo + autenticación + enrutamiento).

Relacionado:

- Enrutamiento multiagente: [Multi-Agent Routing](/en/concepts/multi-agent)
- Espacio de trabajo del agente: [Agent workspace](/en/concepts/agent-workspace)
- Configuración de visibilidad de habilidades: [Skills config](/en/tools/skills-config)

## Ejemplos

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## Enlaces de enrutamiento

Utilice los enlaces de enrutamiento para fijar el tráfico del canal entrante a un agente específico.

Si también desea diferentes habilidades visibles por agente, configure
`agents.defaults.skills` y `agents.list[].skills` en `openclaw.json`. Consulte
[Skills config](/en/tools/skills-config) y
[Configuration Reference](/en/gateway/configuration-reference#agentsdefaultsskills).

Listar enlaces:

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

Agregar enlaces:

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

Si omite `accountId` (`--bind <channel>`), OpenClaw lo resuelve desde los valores predeterminados del canal y los enlaces de configuración del complemento cuando están disponibles.

Si omite `--agent` para `bind` o `unbind`, OpenClaw apunta al agente predeterminado actual.

### Comportamiento del ámbito del enlace

- Un enlace sin `accountId` coincide solo con la cuenta predeterminada del canal.
- `accountId: "*"` es la alternativa para todo el canal (todas las cuentas) y es menos específico que un enlace de cuenta explícito.
- Si el mismo agente ya tiene un enlace de canal coincidente sin `accountId`, y luego lo vincula con un `accountId` explícito o resuelto, OpenClaw actualiza ese enlace existente en su lugar en lugar de agregar un duplicado.

Ejemplo:

```bash
# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:ops
```

Después de la actualización, el enrutamiento para ese enlace se limita a `telegram:ops`. Si también desea el enrutamiento de cuenta predeterminado, agréguelo explícitamente (por ejemplo, `--bind telegram:default`).

Eliminar enlaces:

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` acepta `--all` o uno o más valores `--bind`, pero no ambos.

## Superficie de comandos

### `agents`

Ejecutar `openclaw agents` sin un subcomando es equivalente a `openclaw agents list`.

### `agents list`

Opciones:

- `--json`
- `--bindings`: incluir reglas de enrutamiento completas, no solo recuentos/resúmenes por agente

### `agents add [name]`

Opciones:

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (repetible)
- `--non-interactive`
- `--json`

Notas:

- Pasar cualquier flag de ad explícita cambia el comando a la ruta no interactiva.
- El modo no interactivo requiere tanto un nombre de agente como `--workspace`.
- `main` está reservado y no se puede utilizar como el nuevo id de agente.

### `agents bindings`

Opciones:

- `--agent <id>`
- `--json`

### `agents bind`

Opciones:

- `--agent <id>` (por defecto al agente predeterminado actual)
- `--bind <channel[:accountId]>` (repetible)
- `--json`

### `agents unbind`

Opciones:

- `--agent <id>` (por defecto al agente predeterminado actual)
- `--bind <channel[:accountId]>` (repetible)
- `--all`
- `--json`

### `agents delete <id>`

Opciones:

- `--force`
- `--json`

Notas:

- `main` no se puede eliminar.
- Sin `--force`, se requiere confirmación interactiva.
- Los directorios del espacio de trabajo, el estado del agente y las transcripciones de sesión se mueven a la Papelera, no se eliminan permanentemente.

## Archivos de identidad

Cada espacio de trabajo del agente puede incluir un `IDENTITY.md` en la raíz del espacio de trabajo:

- Ruta de ejemplo: `~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` lee desde la raíz del espacio de trabajo (o un `--identity-file` explícito)

Las rutas de los avatares se resuelven en relación con la raíz del espacio de trabajo.

## Establecer identidad

`set-identity` escribe campos en `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (ruta relativa al espacio de trabajo, URL http(s) o URI de datos)

Opciones:

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

Notas:

- `--agent` o `--workspace` se pueden usar para seleccionar el agente objetivo.
- Si confía en `--workspace` y varios agentes comparten ese espacio de trabajo, el comando falla y le pide que pase `--agent`.
- Cuando no se proporcionan campos de identidad explícitos, el comando lee los datos de identidad de `IDENTITY.md`.

Cargar desde `IDENTITY.md`:

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

Sobrescribir campos explícitamente:

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

Ejemplo de configuración:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
}
```
