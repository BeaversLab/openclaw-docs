---
summary: "Referencia de CLI para `openclaw approvals` (aprobaciones de exec para hosts de gateway o nodos)"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "aprobaciones"
---

# `openclaw approvals`

Administre las aprobaciones de exec para el **host local**, el **host de gateway** o un **host de nodo**.
De forma predeterminada, los comandos tienen como objetivo el archivo de aprobaciones local en el disco. Use `--gateway` para apuntar al gateway o `--node` para apuntar a un nodo específico.

Alias: `openclaw exec-approvals`

Relacionado:

- Aprobaciones de exec: [Aprobaciones de exec](/en/tools/exec-approvals)
- Nodos: [Nodos](/en/nodes)

## Comandos comunes

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` ahora muestra la política de exec efectiva para objetivos locales, de gateway y de nodo:

- política `tools.exec` solicitada
- host archivo-de-aprobaciones política
- resultado efectivo después de aplicar las reglas de precedencia

La precedencia es intencional:

- el archivo de aprobaciones del host es la fuente de verdad exigible
- la política `tools.exec` solicitada puede restringir o ampliar la intención, pero el resultado efectivo aún se deriva de las reglas del host
- `--node` combina el archivo de aprobaciones del host del nodo con la política `tools.exec` del gateway, porque ambos todavía se aplican en tiempo de ejecución
- si la configuración del gateway no está disponible, la CLI recurre a la instantánea de aprobaciones del nodo y señala que no se pudo calcular la política de tiempo de ejecución final

## Reemplazar aprobaciones desde un archivo

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` acepta JSON5, no solo JSON estricto. Use `--file` o `--stdin`, no ambos.

## "Nunca preguntar" / ejemplo de YOLO

Para un host que nunca debe detenerse en aprobaciones de exec, configure los valores predeterminados de aprobaciones del host en `full` + `off`:

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Variante de nodo:

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Esto cambia solo el **archivo de aprobaciones del host**. Para mantener la política solicitada de OpenClaw alineada, también configure:

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

Por qué `tools.exec.host=gateway` en este ejemplo:

- `host=auto` todavía significa "sandbox cuando esté disponible, de lo contrario gateway".
- YOLO se trata de aprobaciones, no de enrutamiento.
- Si deseas ejecución en el host incluso cuando se configura un sandbox, haz que la elección del host sea explícita con `gateway` o `/exec host=gateway`.

Esto coincide con el comportamiento YOLO predeterminado del host actual. Ajustarlo si deseas aprobaciones.

## Auxiliares de lista de permitidos

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## Opciones comunes

`get`, `set` y `allowlist add|remove` todos admiten:

- `--node <id|name|ip>`
- `--gateway`
- opciones RPC de nodo compartidas: `--url`, `--token`, `--timeout`, `--json`

Notas de orientación:

- sin indicadores de destino significa el archivo de aprobaciones local en el disco
- `--gateway` apunta al archivo de aprobaciones del host de la puerta de enlace
- `--node` apunta a un host de nodo después de resolver id, nombre, IP o prefijo de id

`allowlist add|remove` también admite:

- `--agent <id>` (por defecto `*`)

## Notas

- `--node` usa el mismo solucionador que `openclaw nodes` (id, nombre, ip o prefijo de id).
- `--agent` por defecto es `"*"`, que se aplica a todos los agentes.
- El host del nodo debe anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz gráfica).
- Los archivos de aprobaciones se almacenan por host en `~/.openclaw/exec-approvals.json`.
