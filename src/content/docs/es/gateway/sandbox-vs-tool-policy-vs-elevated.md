---
title: Sandbox vs Tool Policy vs Elevated
summary: "Por qué se bloquea una herramienta: tiempo de ejecución del sandbox, política de permiso/denegación de herramientas y puertas de ejecución elevada"
read_when: "Te encuentras con la 'cárcel del sandbox' o ves un rechazo de herramienta/elevada y deseas la clave de configuración exacta que cambiar."
status: active
---

# Sandbox vs Tool Policy vs Elevated

OpenClaw tiene tres controles relacionados (pero diferentes):

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decide **dónde se ejecutan las herramientas** (Docker vs host).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decide **qué herramientas están disponibles/permitidas**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) es un **escape hatch de solo ejecución** para ejecutar en el host cuando estás en un sandbox.

## Quick debug

Use el inspector para ver lo que OpenClaw está _realmente_ haciendo:

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

Imprime:

- modo/ámbito/acceso al espacio de trabajo efectivo del sandbox
- si la sesión está actualmente en sandbox (principal vs no principal)
- permiso/denegación de herramienta de sandbox efectivo (y si proviene del agente/global/predeterminado)
- puertas elevadas y rutas de clave de solución

## Sandbox: dónde se ejecutan las herramientas

El sandboxing está controlado por `agents.defaults.sandbox.mode`:

- `"off"`: todo se ejecuta en el host.
- `"non-main"`: solo las sesiones no principales están en sandbox (común “sorpresa” para grupos/canales).
- `"all"`: todo está en sandbox.

Consulte [Sandboxing](/es/gateway/sandboxing) para ver la matriz completa (alcance, montajes del espacio de trabajo, imágenes).

### Montajes de enlace (verificación rápida de seguridad)

- `docker.binds` _atraviesa_ el sistema de archivos del sandbox: cualquier cosa que montes es visible dentro del contenedor con el modo que configures (`:ro` o `:rw`).
- El valor predeterminado es lectura-escritura si omites el modo; prefiere `:ro` para el código fuente/secretos.
- `scope: "shared"` ignora los enlaces por agente (solo se aplican los enlaces globales).
- Vincular `/var/run/docker.sock` entrega efectivamente el control del host al sandbox; haz esto solo intencionalmente.
- El acceso al espacio de trabajo (`workspaceAccess: "ro"`/`"rw"`) es independiente de los modos de vinculación.

## Política de herramientas: qué herramientas existen/son invocables

Importan dos capas:

- **Perfil de herramienta**: `tools.profile` y `agents.list[].tools.profile` (lista blanca base)
- **Perfil de herramienta del proveedor**: `tools.byProvider[provider].profile` y `agents.list[].tools.byProvider[provider].profile`
- **Política de herramientas global/por agente**: `tools.allow`/`tools.deny` y `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Política de herramientas del proveedor**: `tools.byProvider[provider].allow/deny` y `agents.list[].tools.byProvider[provider].allow/deny`
- **Política de herramientas de sandbox** (solo se aplica cuando está en sandbox): `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` y `agents.list[].tools.sandbox.tools.*`

Reglas generales:

- `deny` siempre gana.
- Si `allow` no está vacío, todo lo demás se trata como bloqueado.
- La política de herramientas es el límite absoluto: `/exec` no puede anular una herramienta `exec` denegada.
- `/exec` solo cambia los valores predeterminados de la sesión para los remitentes autorizados; no concede acceso a herramientas.
  Las claves de herramientas del proveedor aceptan `provider` (p. ej. `google-antigravity`) o `provider/model` (p. ej. `openai/gpt-5.2`).

### Grupos de herramientas (abreviaturas)

Las políticas de herramientas (global, agente, sandbox) admiten entradas `group:*` que se expanden a varias herramientas:

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

Grupos disponibles:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: todas las herramientas integradas de OpenClaw (excluye los complementos de proveedores)

## Elevated: solo ejecución "ejecutar en el host"

Elevado **no** otorga herramientas adicionales; solo afecta a `exec`.

- Si está en sandbox, `/elevated on` (o `exec` con `elevated: true`) se ejecuta en el host (las aprobaciones aún pueden aplicarse).
- Use `/elevated full` para omitir las aprobaciones de ejecución para la sesión.
- Si ya está ejecutándose directamente, elevated es efectivamente una operación nula (aún con restricciones).
- Elevated **no** tiene ámbito de habilidad y **no** anula la autorización/denegación de herramientas.
- `/exec` es independiente de elevated. Solo ajusta los valores predeterminados de ejecución por sesión para remitentes autorizados.

Puertas de enlace (Gates):

- Habilitación: `tools.elevated.enabled` (y opcionalmente `agents.list[].tools.elevated.enabled`)
- Listas de permitidos de remitentes: `tools.elevated.allowFrom.<provider>` (y opcionalmente `agents.list[].tools.elevated.allowFrom.<provider>`)

Consulte [Elevated Mode](/es/tools/elevated).

## Soluciones comunes de "sandbox jail"

### "Herramienta X bloqueada por la política de herramientas de sandbox"

Claves de solución (elija una):

- Desactivar el sandbox: `agents.defaults.sandbox.mode=off` (o por agente `agents.list[].sandbox.mode=off`)
- Permitir la herramienta dentro del sandbox:
  - eliminarla de `tools.sandbox.tools.deny` (o por agente `agents.list[].tools.sandbox.tools.deny`)
  - o añadirla a `tools.sandbox.tools.allow` (o allow por agente)

### "Pensé que esto era main, ¿por qué está en un sandbox?"

En el modo `"non-main"`, las claves de grupo/canal _no_ son principales. Utilice la clave de sesión principal (mostrada por `sandbox explain`) o cambie el modo a `"off"`.

## Véase también

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa de sandbox (modos, ámbitos, backends, imágenes)
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) -- anulaciones y precedencia por agente
- [Elevated Mode](/es/tools/elevated)
