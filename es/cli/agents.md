---
summary: "Referencia de CLI para `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `openclaw agents`

Administrar agentes aislados (espacios de trabajo + autenticación + enrutamiento).

Relacionado:

- Enrutamiento multiagente: [Multi-Agent Routing](/es/concepts/multi-agent)
- Espacio de trabajo del agente: [Agent workspace](/es/concepts/agent-workspace)

## Ejemplos

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## Bindings de enrutamiento

Use bindings de enrutamiento para fijar el tráfico del canal entrante a un agente específico.

Listar bindings:

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

Añadir bindings:

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

Si omite `accountId` (`--bind <channel>`), OpenClaw lo resuelve desde los valores predeterminados del canal y los enlaces de configuración de complementos cuando están disponibles.

### Comportamiento del ámbito del binding

- Un binding sin `accountId` coincide solo con la cuenta predeterminada del canal.
- `accountId: "*"` es la alternativa de todo el canal (todas las cuentas) y es menos específica que un binding de cuenta explícito.
- Si el mismo agente ya tiene un binding de canal coincidente sin `accountId`, y luego lo vincula con un `accountId` explícito o resuelto, OpenClaw actualiza ese binding existente en su lugar en lugar de agregar un duplicado.

Ejemplo:

```bash
# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:ops
```

Después de la actualización, el enrutamiento de ese binding tiene como ámbito `telegram:ops`. Si también desea un enrutamiento a la cuenta predeterminada, agréguelo explícitamente (por ejemplo `--bind telegram:default`).

Eliminar bindings:

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

## Archivos de identidad

Cada espacio de trabajo del agente puede incluir un `IDENTITY.md` en la raíz del espacio de trabajo:

- Ruta de ejemplo: `~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` lee desde la raíz del espacio de trabajo (o un `--identity-file` explícito)

Las rutas de avatar se resuelven en relación con la raíz del espacio de trabajo.

## Establecer identidad

`set-identity` escribe campos en `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (ruta relativa al espacio de trabajo, URL http(s) o URI de datos)

Cargar desde `IDENTITY.md`:

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

Anular campos explícitamente:

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

Muestra de configuración:

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

import es from "/components/footer/es.mdx";

<es />
