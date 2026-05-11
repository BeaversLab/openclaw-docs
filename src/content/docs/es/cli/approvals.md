---
summary: "Referencia de la CLI para `openclaw approvals` y `openclaw exec-policy`"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "Aprobaciones"
---

# `openclaw approvals`

Administra las aprobaciones de ejecución para el **host local**, el **host de puerta de enlace** o un **host de nodo**.
De forma predeterminada, los comandos se dirigen al archivo de aprobaciones local en el disco. Use `--gateway` para dirigirse a la puerta de enlace o `--node` para dirigirse a un nodo específico.

Alias: `openclaw exec-approvals`

Relacionado:

- Aprobaciones de ejecución: [Exec approvals](/es/tools/exec-approvals)
- Nodos: [Nodes](/es/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` es el comando de conveniencia local para mantener la configuración solicitada de `tools.exec.*` y el archivo de aprobaciones del host local alineados en un solo paso.

Úselo cuando desee:

- inspeccionar la política solicitada local, el archivo de aprobaciones del host y la fusión efectiva
- aplicar un ajuste preestablecido local como YOLO o deny-all
- sincronizar `tools.exec.*` local y `~/.openclaw/exec-approvals.json` local

Ejemplos:

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

Modos de salida:

- sin `--json`: imprime la vista de tabla legible por humanos
- `--json`: imprime una salida estructurada legible por máquina

Ámbito actual:

- `exec-policy` es **solo local**
- actualiza el archivo de configuración local y el archivo de aprobaciones local juntos
- **no** envía la política al host de la puerta de enlace ni a un host de nodo
- `--host node` se rechaza en este comando porque las aprobaciones de ejecución del nodo se obtienen del nodo en tiempo de ejecución y deben administrarse a través de comandos de aprobaciones dirigidos al nodo en su lugar
- `openclaw exec-policy show` marca los ámbitos `host=node` como administrados por el nodo en tiempo de ejecución en lugar de derivar una política efectiva del archivo de aprobaciones local

Si necesita editar las aprobaciones del host remoto directamente, siga usando `openclaw approvals set --gateway`
o `openclaw approvals set --node <id|name|ip>`.

## Comandos comunes

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` ahora muestra la política de ejecución efectiva para objetivos locales, de puerta de enlace y de nodo:

- política `tools.exec` solicitada
- política del archivo de aprobaciones del host
- resultado efectivo después de aplicar las reglas de precedencia

La precedencia es intencional:

- el archivo de aprobaciones del host es la fuente de verdad aplicable
- la política de `tools.exec` solicitada puede estrechar o ampliar la intención, pero el resultado efectivo aún se deriva de las reglas del host
- `--node` combina el archivo de aprobaciones del host del nodo con la política de `tools.exec` de la puerta de enlace, porque ambos aún se aplican en tiempo de ejecución
- si la configuración de la puerta de enlace no está disponible, la CLI vuelve a la instantánea de aprobaciones del nodo y nota que no se pudo calcular la política de tiempo de ejecución final

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

## "Nunca preguntar" / ejemplo YOLO

Para un host que nunca debe detenerse en aprobaciones de ejecución, configure los valores predeterminados de aprobaciones del host en `full` + `off`:

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

Esto cambia solo el **archivo de aprobaciones del host**. Para mantener la política OpenClaw solicitada alineada, también configure:

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

Por qué `tools.exec.host=gateway` en este ejemplo:

- `host=auto` todavía significa "sandbox cuando esté disponible, de lo contrario puerta de enlace".
- YOLO trata sobre aprobaciones, no sobre enrutamiento.
- Si desea ejecución en el host incluso cuando se configura un sandbox, haga explícita la elección del host con `gateway` o `/exec host=gateway`.

Esto coincide con el comportamiento YOLO predeterminado del host actual. Ajústelo si desea aprobaciones.

Acceso directo local:

```bash
openclaw exec-policy preset yolo
```

Ese acceso directo local actualiza tanto la configuración `tools.exec.*` local solicitada como los
valores predeterminados de aprobaciones locales juntos. Es equivalente en intención a la configuración
manual de dos pasos anterior, pero solo para la máquina local.

## Asistentes de lista de permitidos

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
- opciones compartidas de RPC de nodo: `--url`, `--token`, `--timeout`, `--json`

Notas de destino:

- sin indicadores de destino significa el archivo de aprobaciones local en disco
- `--gateway` apunta al archivo de aprobaciones del host de puerta de enlace
- `--node` apunta a un host de nodo después de resolver el id, nombre, IP o prefijo de id

`allowlist add|remove` también admite:

- `--agent <id>` (por defecto es `*`)

## Notas

- `--node` usa el mismo resolutor que `openclaw nodes` (id, nombre, ip o prefijo de id).
- `--agent` por defecto es `"*"`, lo que se aplica a todos los agentes.
- El host de nodo debe anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz gráfica).
- Los archivos de aprobaciones se almacenan por host en `~/.openclaw/exec-approvals.json`.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Aprobaciones de ejecución](/es/tools/exec-approvals)
