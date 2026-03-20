---
title: Sandbox vs Tool Policy vs Elevated
summary: "Por qué se bloquea una herramienta: tiempo de ejecución de sandbox, política de permitir/denegar herramientas y puertas de ejecución elevada"
read_when: "Te encuentras con la 'sandbox jail' o ves un rechazo de herramienta/elevada y deseas la clave de configuración exacta que cambiar."
status: active
---

# Sandbox vs Tool Policy vs Elevated

OpenClaw tiene tres controles relacionados (pero diferentes):

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decide **dónde se ejecutan las herramientas** (Docker vs host).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decide **qué herramientas están disponibles/permitidas**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) es una **salida de seguridad solo de ejecución** para ejecutarse en el host cuando estás en un sandbox.

## Depuración rápida

Usa el inspector para ver lo que OpenClaw está _realmente_ haciendo:

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

Imprime:

- modo de sandbox efectivo/ámbito/acceso al espacio de trabajo
- si la sesión está actualmente en sandbox (principal vs no principal)
- permiso/denegación de herramientas de sandbox efectivo (y si provino del agente/global/predeterminado)
- puertas elevadas y rutas de claves de solución

## Sandbox: dónde se ejecutan las herramientas

El sandboxing está controlado por `agents.defaults.sandbox.mode`:

- `"off"`: todo se ejecuta en el host.
- `"non-main"`: solo las sesiones que no son principales están en sandbox (una "sorpresa" común para grupos/canales).
- `"all"`: todo está en sandbox.

Consulta [Sandboxing](/es/gateway/sandboxing) para ver la matriz completa (ámbito, montajes de espacio de trabajo, imágenes).

### Bind mounts (verificación rápida de seguridad)

- `docker.binds` _perfora_ el sistema de archivos del sandbox: todo lo que montes es visible dentro del contenedor con el modo que establezcas (`:ro` o `:rw`).
- El valor predeterminado es lectura-escritura si omites el modo; prefiere `:ro` para código fuente/secrets.
- `scope: "shared"` ignora los montajes por agente (solo se aplican los montajes globales).
- Vincular `/var/run/docker.sock` entrega efectivamente el control del host al sandbox; haz esto solo intencionalmente.
- El acceso al espacio de trabajo (`workspaceAccess: "ro"`/`"rw"`) es independiente de los modos de vinculación.

## Política de herramientas: qué herramientas existen/son invocables

Dos capas son importantes:

- **Perfil de herramienta**: `tools.profile` y `agents.list[].tools.profile` (lista blanca base)
- **Perfil de herramienta del proveedor**: `tools.byProvider[provider].profile` y `agents.list[].tools.byProvider[provider].profile`
- **Política de herramienta global/por agente**: `tools.allow`/`tools.deny` y `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Política de herramienta del proveedor**: `tools.byProvider[provider].allow/deny` y `agents.list[].tools.byProvider[provider].allow/deny`
- **Política de herramientas de sandbox** (solo se aplica cuando está en sandbox): `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` y `agents.list[].tools.sandbox.tools.*`

Reglas generales:

- `deny` siempre gana.
- Si `allow` no está vacío, todo lo demás se trata como bloqueado.
- La política de herramientas es el límite absoluto: `/exec` no puede anular una herramienta `exec` denegada.
- `/exec` solo cambia los valores predeterminados de la sesión para remitentes autorizados; no otorga acceso a herramientas.
  Las claves de herramientas del proveedor aceptan `provider` (p. ej., `google-antigravity`) o `provider/model` (p. ej., `openai/gpt-5.2`).

### Grupos de herramientas (abreviaturas)

Las políticas de herramientas (global, agente, sandbox) admiten entradas `group:*` que se expanden a múltiples herramientas:

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

## Elevado: solo ejecución "ejecutar en el host"

Elevado **no** otorga herramientas adicionales; solo afecta a `exec`.

- Si está en modo sandbox, `/elevated on` (o `exec` con `elevated: true`) se ejecuta en el host (aún pueden aplicarse aprobaciones).
- Use `/elevated full` para omitir las aprobaciones de ejecución para la sesión.
- Si ya se está ejecutando de forma directa, elevado es efectivamente una operación nula (aún está limitada).
- Elevado **no** está limitado al alcance de la habilidad y **no** anula la política de permitir/denegar herramientas.
- `/exec` es independiente de elevado. Solo ajusta los valores predeterminados de ejecución por sesión para remitentes autorizados.

Puertas de enlace (Gates):

- Habilitación: `tools.elevated.enabled` (y opcionalmente `agents.list[].tools.elevated.enabled`)
- Listas de permitidos de remitentes: `tools.elevated.allowFrom.<provider>` (y opcionalmente `agents.list[].tools.elevated.allowFrom.<provider>`)

Consulte [Modo elevado](/es/tools/elevated).

## Correcciones comunes de "sandbox jail"

### "La herramienta X está bloqueada por la política de herramientas de sandbox"

Claves de solución (elija una):

- Deshabilitar sandbox: `agents.defaults.sandbox.mode=off` (o `agents.list[].sandbox.mode=off` por agente)
- Permitir la herramienta dentro del sandbox:
  - quítela de `tools.sandbox.tools.deny` (o `agents.list[].tools.sandbox.tools.deny` por agente)
  - o agréguela a `tools.sandbox.tools.allow` (o permitir por agente)

### "Pensé que esto era main, ¿por qué está en sandbox?"

En el modo `"non-main"`, las claves de grupo/canal _no_ son main. Use la clave de sesión main (mostrada por `sandbox explain`) o cambie el modo a `"off"`.

import en from "/components/footer/en.mdx";

<en />
