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
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) es una **puerta de escape solo de ejecución** para ejecutarse fuera del sandbox cuando está en sandbox (`gateway` por defecto, o `node` cuando el destino de ejecución está configurado para `node`).

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

El aislamiento (sandboxing) se controla mediante `agents.defaults.sandbox.mode`:

- `"off"`: todo se ejecuta en el host.
- `"non-main"`: solo las sesiones que no son principales están aisladas (común "sorpresa" para grupos/canales).
- `"all"`: todo está aislado.

Consulte [Sandboxing](/es/gateway/sandboxing) para ver la matriz completa (alcance, montajes del espacio de trabajo, imágenes).

### Montajes de enlace (verificación rápida de seguridad)

- `docker.binds` _perfora_ el sistema de archivos del sandbox: todo lo que monte será visible dentro del contenedor con el modo que establezca (`:ro` o `:rw`).
- El valor predeterminado es lectura-escritura si omite el modo; prefiera `:ro` para el código fuente/secretos.
- `scope: "shared"` ignora los enlaces por agente (solo se aplican los enlaces globales).
- OpenClaw valida los orígenes de enlace dos veces: primero en la ruta de origen normalizada y luego de nuevo después de resolver a través del antepasado existente más profundo. Los escapes de padre de enlace simbólico no evitan las verificaciones de ruta bloqueada o raíz permitida.
- Las rutas de hoja inexistentes aún se verifican de forma segura. Si `/workspace/alias-out/new-file` se resuelve a través de un padre vinculado simbólicamente a una ruta bloqueada o fuera de las raíces permitidas configuradas, el enlace se rechaza.
- Vincular `/var/run/docker.sock` entrega efectivamente el control del host al sandbox; hágalo solo intencionalmente.
- El acceso al espacio de trabajo (`workspaceAccess: "ro"`/`"rw"`) es independiente de los modos de enlace.

## Política de herramientas: qué herramientas existen/son invocables

Importan dos capas:

- **Perfil de herramienta**: `tools.profile` y `agents.list[].tools.profile` (lista de permitidos base)
- **Perfil de herramienta del proveedor**: `tools.byProvider[provider].profile` y `agents.list[].tools.byProvider[provider].profile`
- **Política de herramienta global/por agente**: `tools.allow`/`tools.deny` y `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Política de herramientas del proveedor**: `tools.byProvider[provider].allow/deny` y `agents.list[].tools.byProvider[provider].allow/deny`
- **Política de herramientas de sandbox** (solo se aplica cuando está en sandbox): `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` y `agents.list[].tools.sandbox.tools.*`

Reglas generales:

- `deny` siempre gana.
- Si `allow` no está vacío, todo lo demás se trata como bloqueado.
- La política de herramientas es el límite estricto: `/exec` no puede anular una herramienta `exec` denegada.
- `/exec` solo cambia los valores predeterminados de la sesión para los remitentes autorizados; no otorga acceso a herramientas.
  Las claves de herramienta del proveedor aceptan `provider` (p. ej. `google-antigravity`) o `provider/model` (p. ej. `openai/gpt-5.4`).

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

- `group:runtime`: `exec`, `process`, `code_execution` (`bash` se acepta como
  un alias para `exec`)
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`
- `group:media`: `image`, `image_generate`, `video_generate`, `tts`
- `group:openclaw`: todas las herramientas integradas de OpenClaw (excluye los complementos de proveedor)

## Elevated: solo ejecución "ejecutar en host"

Elevated **no** otorga herramientas adicionales; solo afecta `exec`.

- Si está en sandbox, `/elevated on` (o `exec` con `elevated: true`) se ejecuta fuera del sandbox (las aprobaciones aún pueden aplicarse).
- Use `/elevated full` para omitir las aprobaciones de ejecución para la sesión.
- Si ya se está ejecutando directamente, elevated es efectivamente una operación nula (aún con puerta).
- Elevated **no** está limitado al alcance de la habilidad y **no** anula la herramienta permitir/denegar.
- Elevated no otorga anulaciones arbitrarias entre hosts desde `host=auto`; sigue las reglas normales de destino de ejecución y solo preserva `node` cuando el destino configurado/de sesión ya es `node`.
- `/exec` es separado de elevated. Solo ajusta los valores predeterminados de ejecución por sesión para remitentes autorizados.

Puertas:

- Habilitación: `tools.elevated.enabled` (y opcionalmente `agents.list[].tools.elevated.enabled`)
- Listas de permitidos de remitentes: `tools.elevated.allowFrom.<provider>` (y opcionalmente `agents.list[].tools.elevated.allowFrom.<provider>`)

Consulte [Modo elevado](/es/tools/elevated).

## Soluciones comunes de "sandbox jail"

### "Herramienta X bloqueada por la política de herramientas de sandbox"

Claves de solución (elija una):

- Deshabilitar sandbox: `agents.defaults.sandbox.mode=off` (o por agente `agents.list[].sandbox.mode=off`)
- Permitir la herramienta dentro del sandbox:
  - quítela de `tools.sandbox.tools.deny` (o por agente `agents.list[].tools.sandbox.tools.deny`)
  - o agréguela a `tools.sandbox.tools.allow` (o permitir por agente)

### "Pensé que esto era principal, ¿por qué está en sandbox?"

En modo `"non-main"`, las claves de grupo/canal _no_ son principales. Utilice la clave de sesión principal (mostrada por `sandbox explain`) o cambie el modo a `"off"`.

## Véase también

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa de sandbox (modos, ámbitos, backends, imágenes)
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) -- anulaciones y precedencia por agente
- [Elevated Mode](/es/tools/elevated)
