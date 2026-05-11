---
summary: "Por qué se bloquea una herramienta: tiempo de ejecución del sandbox, política de permiso/denegación de herramientas y puertas de ejecución elevadas"
title: Sandbox vs política de herramientas vs elevado
read_when: "Te encuentras con la 'cárcel del sandbox' o ves un rechazo de herramienta/elevada y deseas la clave de configuración exacta que cambiar."
status: active
---

OpenClaw tiene tres controles relacionados (pero diferentes):

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decide **dónde se ejecutan las herramientas** (backend de sandbox vs host).
2. **Política de herramientas** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decide **qué herramientas están disponibles/permitidas**.
3. **Elevado** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) es una **salida de emergencia solo de ejecución** para ejecutarse fuera del sandbox cuando estás en un sandbox (`gateway` por defecto, o `node` cuando el objetivo de ejecución está configurado para `node`).

## Depuración rápida

Usa el inspector para ver lo que OpenClaw está _realmente_ haciendo:

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

Imprime:

- modo/ámbito/acceso al área de trabajo del sandbox efectivo
- si la sesión está actualmente en un sandbox (principal vs no principal)
- permiso/denegación de herramientas de sandbox efectivo (y si proviene del agente/global/por defecto)
- puertas elevadas y rutas clave de reparación

## Sandbox: dónde se ejecutan las herramientas

El sandbox se controla mediante `agents.defaults.sandbox.mode`:

- `"off"`: todo se ejecuta en el host.
- `"non-main"`: solo las sesiones no principales están en sandbox (común "sorpresa" para grupos/canales).
- `"all"`: todo está en sandbox.

Consulta [Sandboxing](/es/gateway/sandboxing) para ver la matriz completa (ámbito, montajes del área de trabajo, imágenes).

### Montajes de enlace (verificación rápida de seguridad)

- `docker.binds` _atraviesa_ el sistema de archivos del sandbox: cualquier cosa que montes es visible dentro del contenedor con el modo que configures (`:ro` o `:rw`).
- El valor predeterminado es lectura-escritura si omites el modo; prefiere `:ro` para código fuente/secrets.
- `scope: "shared"` ignora los montajes por agente (solo se aplican los montajes globales).
- OpenClaw valida los orígenes de bind dos veces: primero en la ruta de origen normalizada y luego de nuevo después de resolver a través del ancestro existente más profundo. Los escapes de enlace simbólico principal no omiten las comprobaciones de ruta bloqueada o raíz permitida.
- Las rutas hoja no existentes todavía se comprueban de forma segura. Si `/workspace/alias-out/new-file` se resuelve a través de un padre con enlace simbólico a una ruta bloqueada o fuera de las raíces permitidas configuradas, se rechaza el bind.
- Vincular `/var/run/docker.sock` entrega efectivamente el control del host al sandbox; hágalo solo intencionalmente.
- El acceso al espacio de trabajo (`workspaceAccess: "ro"`/`"rw"`) es independiente de los modos de enlace.

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
- La política de herramientas es la parada definitiva: `/exec` no puede anular una herramienta `exec` denegada.
- `/exec` solo cambia los valores predeterminados de la sesión para remitentes autorizados; no concede acceso a herramientas.
  Las claves de herramienta del proveedor aceptan `provider` (por ejemplo, `google-antigravity`) o `provider/model` (por ejemplo, `openai/gpt-5.4`).

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
- `group:openclaw`: todas las herramientas integradas de OpenClaw (excluye los complementos de proveedores)

## Elevated: solo ejecución "ejecutar en host"

Elevated **no** otorga herramientas adicionales; solo afecta a `exec`.

- Si está en sandbox, `/elevated on` (o `exec` con `elevated: true`) se ejecuta fuera del sandbox (las aprobaciones aún pueden aplicarse).
- Use `/elevated full` para omitir las aprobaciones de ejecución para la sesión.
- Si ya se está ejecutando en modo directo, elevated es efectivamente una operación nula (aún con restricciones).
- Elevated **no** tiene ámbito de habilidad y **no** anula la permitir/denegar de herramientas.
- Elevated no otorga anulaciones arbitrarias entre hosts desde `host=auto`; sigue las reglas normales de destino de exec y solo preserva `node` cuando el destino configurado/de sesión ya es `node`.
- `/exec` es independiente de elevated. Solo ajusta los valores predeterminados de exec por sesión para remitentes autorizados.

Puertas de control (Gates):

- Habilitación: `tools.elevated.enabled` (y opcionalmente `agents.list[].tools.elevated.enabled`)
- Listas de permitidos de remitentes: `tools.elevated.allowFrom.<provider>` (y opcionalmente `agents.list[].tools.elevated.allowFrom.<provider>`)

Consulte [Elevated Mode](/es/tools/elevated).

## Correcciones comunes de "sandbox jail"

### "La herramienta X está bloqueada por la política de herramientas del sandbox"

Claves de solución (elija una):

- Desactivar sandbox: `agents.defaults.sandbox.mode=off` (o por agente `agents.list[].sandbox.mode=off`)
- Permitir la herramienta dentro del sandbox:
  - quitarla de `tools.sandbox.tools.deny` (o por agente `agents.list[].tools.sandbox.tools.deny`)
  - o añadirla a `tools.sandbox.tools.allow` (o allow por agente)

### "Pensé que esto era principal, ¿por qué está en sandbox?"

En el modo `"non-main"`, las claves de grupo/canal _no_ son principales. Utilice la clave de sesión principal (mostrada por `sandbox explain`) o cambie el modo a `"off"`.

## Relacionado

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa de sandbox (modos, alcances, backends, imágenes)
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) -- anulaciones y precedencia por agente
- [Elevated Mode](/es/tools/elevated)
