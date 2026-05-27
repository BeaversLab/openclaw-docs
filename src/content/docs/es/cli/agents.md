---
summary: "Referencia de la CLI para `openclaw agents` (listar/añadir/eliminar/vínculos/vincular/desvincular/establecer identidad)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "Agentes"
---

# `openclaw agents`

Administrar agentes aislados (espacios de trabajo + autenticación + enrutamiento).

Relacionado:

- [Enrutamiento multi-agente](/es/concepts/multi-agent)
- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Configuración de habilidades](/es/tools/skills-config): configuración de visibilidad de habilidades.

## Ejemplos

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:*
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

Si también deseas diferentes habilidades visibles por agente, configura `agents.defaults.skills` y `agents.list[].skills` en `openclaw.json`. Consulta [Configuración de habilidades](/es/tools/skills-config) y [Referencia de configuración](/es/gateway/config-agents#agents-defaults-skills).

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

También puedes añadir vínculos al crear un agente:

```bash
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:* --bind discord:*
```

Si omites `accountId` (`--bind <channel>`), OpenClaw lo resuelve a partir de los ganchos de configuración del complemento, vinculación de cuenta forzada o el recuento de cuentas configurado del canal.

Si omites `--agent` para `bind` o `unbind`, OpenClaw apunta al agente predeterminado actual.

### formato `--bind`

| Formato                      | Significado                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bind <channel>:*`         | Coincide con todas las cuentas del canal.                                                                                                     |
| `--bind <channel>:<account>` | Coincide con una cuenta.                                                                                                                      |
| `--bind <channel>`           | Coincide solo con la cuenta predeterminada, a menos que la CLI pueda resolver de forma segura un ámbito de cuenta específico del complemento. |

### Comportamiento del ámbito de vinculación

- Un vínculo almacenado sin `accountId` coincide solo con la cuenta predeterminada del canal.
- `accountId: "*"` es la alternativa de todo el canal (todas las cuentas) y es menos específico que un vínculo de cuenta explícito.
- Si el mismo agente ya tiene un vínculo de canal coincidente sin `accountId`, y posteriormente vinculas con un `accountId` explícito o resuelto, OpenClaw actualiza ese vínculo existente en su lugar en lugar de añadir un duplicado.

Ejemplos:

```bash
# match all accounts on the channel
openclaw agents bind --agent work --bind telegram:*

# match a specific account
openclaw agents bind --agent work --bind telegram:ops

# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:alerts
```

Después de la actualización, el enrutamiento de ese vínculo está limitado a `telegram:alerts`. Si también deseas un enrutamiento a la cuenta predeterminada, añádelo explícitamente (por ejemplo `--bind telegram:default`).

Eliminar vínculos:

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
- `--bindings`: incluir reglas de enrutamiento completas, no solo resúmenes/recuentos por agente

### `agents add [name]`

Opciones:

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (repetible)
- `--non-interactive`
- `--json`

Notas:

- Pasar cualquier marca de adición explícita cambia el comando a la ruta no interactiva.
- El modo no interactivo requiere tanto un nombre de agente como `--workspace`.
- `main` está reservado y no se puede usar como el nuevo id de agente.
- En modo interactivo, la inicialización de autenticación copia solo perfiles estáticos portátiles
  (`api_key` y estático `token` por defecto). Los perfiles de token de actualización de OAuth permanecen
  disponibles solo por herencia de lectura a través del almacén real de agentes `main`.
  Si el agente predeterminado configurado no es `main`, inicie sesión por separado para los perfiles de OAuth
  en el nuevo agente.

### `agents bindings`

Opciones:

- `--agent <id>`
- `--json`

### `agents bind`

Opciones:

- `--agent <id>` (el valor predeterminado es el agente predeterminado actual)
- `--bind <channel[:accountId]>` (repetible)
- `--json`

### `agents unbind`

Opciones:

- `--agent <id>` (el valor predeterminado es el agente predeterminado actual)
- `--bind <channel[:accountId]>` (repetible)
- `--all`
- `--json`

### `agents delete <id>`

Opciones:

- `--force`
- `--json`

Notas:

- No se puede eliminar `main`.
- Sin `--force`, se requiere confirmación interactiva.
- Los directorios del espacio de trabajo, el estado del agente y las transcripciones de sesión se mueven a la Papelera, no se eliminan permanentemente.
- Cuando el Gateway es accesible, la eliminación se envía a través del Gateway para que la limpieza de configuración y el almacén de sesiones compartan el mismo escritor que el tráfico de ejecución. Si no se puede alcanzar el Gateway, la CLI recurre a la ruta local sin conexión.
- Si el espacio de trabajo de otro agente es la misma ruta, está dentro de este espacio de trabajo o contiene este espacio de trabajo,
  el espacio de trabajo se conserva y `--json` informa `workspaceRetained`,
  `workspaceRetainedReason` y `workspaceSharedWith`.

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

- Se puede usar `--agent` o `--workspace` para seleccionar el agente de destino.
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

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
