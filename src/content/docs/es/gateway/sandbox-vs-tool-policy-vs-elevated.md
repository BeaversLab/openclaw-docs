---
summary: "Por qué se bloquea una herramienta: tiempo de ejecución del sandbox, política de permiso/denegación de herramientas y puertas de ejecución elevadas"
title: Sandbox vs política de herramientas vs elevado
read_when: "Te encuentras con la 'cárcel del sandbox' o ves un rechazo de herramienta/elevada y deseas la clave de configuración exacta que cambiar."
status: active
---

OpenClaw tiene tres controles relacionados (pero diferentes):

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decide **dónde se ejecutan las herramientas** (backend de sandbox vs host).
2. **Política de herramientas** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decide **qué herramientas están disponibles/permitidas**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) es un **escape hatch solo de ejecución** para ejecutarse fuera del sandbox cuando estás en sandbox (`gateway` de forma predeterminada, o `node` cuando el destino de ejecución está configurado en `node`).

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
- `"non-main"`: solo las sesiones que no son principales están en sandbox ("sorpresa" común para grupos/canales).
- `"all"`: todo está en sandbox.

Consulte [Sandboxing](/es/gateway/sandboxing) para obtener la matriz completa (alcance, montajes de espacio de trabajo, imágenes).

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
- La política de herramientas filtra la disponibilidad de herramientas por nombre; no inspecciona los efectos secundarios dentro de `exec`. Si se permite `exec`, denegar `write`, `edit` o `apply_patch` no hace que los comandos de shell sean de solo lectura.
- `/exec` solo cambia los valores predeterminados de la sesión para los remitentes autorizados; no concede acceso a herramientas.
  Las claves de herramienta del proveedor aceptan `provider` (por ejemplo, `google-antigravity`) o `provider/model` (por ejemplo, `openai/gpt-5.4`).
- Los registros de Gateway incluyen entradas de auditoría `agents/tool-policy` cuando un paso de política de herramientas elimina herramientas o una política de herramientas de sandbox bloquea una llamada. Use `openclaw logs` para ver la etiqueta de la regla, la clave de configuración y los nombres de las herramientas afectadas.

### Grupos de herramientas (abreviaturas)

Las políticas de herramientas (globales, agente, sandbox) admiten entradas `group:*` que se expanden a múltiples herramientas:

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
  Para agentes de solo lectura, deniegue `group:runtime` así como las herramientas de sistema de archivos de mutación, a menos que la política de sistema de archivos del sandbox o un límite de host separado haga cumplir la restricción de solo lectura.
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `heartbeat_respond`, `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`, `update_plan`
- `group:media`: `image`, `image_generate`, `music_generate`, `video_generate`, `tts`
- `group:openclaw`: todas las herramientas integradas de OpenClaw (excluye los complementos del proveedor)
- `group:plugins`: todas las herramientas propiedad de complementos cargados, incluidos los servidores MCP configurados expuestos a través de `bundle-mcp`

Para los servidores MCP en sandbox, la política de herramientas de sandbox es una segunda puerta de permiso. Si `mcp.servers` está configurado pero los turnos en sandbox solo muestran herramientas integradas, añada `bundle-mcp`, `group:plugins`, o un nombre/patrón global de herramienta MCP con prefijo de servidor como `outlook__send_mail` o `outlook__*` a `tools.sandbox.tools.alsoAllow`, luego reinicie/recargue la pasarela y recapture la lista de herramientas. Los patrones globales de servidor utilizan el prefijo de servidor MCP seguro para el proveedor: los caracteres que no son `[A-Za-z0-9_-]` se convierten en `-`, los nombres que no comienzan con una letra obtienen un prefijo `mcp-`, y los prefijos largos o duplicados pueden truncarse o tener un sufijo.

`openclaw doctor` actualmente verifica esta forma para los servidores gestionados por OpenClaw en `mcp.servers`. Los servidores MCP cargados desde manifiestos de complementos empaquetados o `.mcp.json` de Claude utilizan la misma puerta de sandbox, pero este diagnóstico aún no enumera esas fuentes; use las mismas entradas de lista de permitidos si sus herramientas desaparecen en turnos en sandbox.

## Elevado: solo ejecución "ejecutar en el host"

Elevado **no** otorga herramientas adicionales; solo afecta a `exec`.

- Si está en sandbox, `/elevated on` (o `exec` con `elevated: true`) se ejecuta fuera del sandbox (las aprobaciones aún pueden aplicarse).
- Use `/elevated full` para omitir las aprobaciones de ejecución para la sesión.
- Si ya se está ejecutando directamente, elevado es efectivamente una operación nula (aún con restricciones).
- Elevado **no** tiene ámbito de habilidad y **no** anula el permitir/denegar de herramientas.
- Elevated no otorga anulaciones arbitrarias entre hosts desde `host=auto`; sigue las reglas normales de destino de ejecución y solo conserva `node` cuando el destino configurado/de sesión ya es `node`.
- `/exec` es independiente del modo elevado. Solo ajusta los valores predeterminados de ejecución por sesión para remitentes autorizados.

Condicionantes:

- Activación: `tools.elevated.enabled` (y opcionalmente `agents.list[].tools.elevated.enabled`)
- Listas de permitidos de remitentes: `tools.elevated.allowFrom.<provider>` (y opcionalmente `agents.list[].tools.elevated.allowFrom.<provider>`)

Consulte [Modo elevado](/es/tools/elevated).

## Soluciones comunes de la "sandbox jail"

### "Herramienta X bloqueada por la política de herramientas de sandbox"

Claves de solución (elija una):

- Deshabilitar sandbox: `agents.defaults.sandbox.mode=off` (o por agente `agents.list[].sandbox.mode=off`)
- Permitir la herramienta dentro de la sandbox:
  - quítela de `tools.sandbox.tools.deny` (o por agente `agents.list[].tools.sandbox.tools.deny`)
  - o añádala a `tools.sandbox.tools.allow` (o permiso por agente)
- Verifique `openclaw logs` para buscar la entrada `agents/tool-policy`. Registra el modo de sandbox y si la regla de permitir o denegar bloqueó la herramienta.

### "Creía que esto era principal, ¿por qué está en sandbox?"

En el modo `"non-main"`, las claves de grupo/canal _no_ son principales. Utilice la clave de sesión principal (mostrada por `sandbox explain`) o cambie el modo a `"off"`.

## Relacionado

- [Aislamiento en sandbox](/es/gateway/sandboxing) -- referencia completa de sandbox (modos, alcances, backends, imágenes)
- [Sandbox y herramientas multiagente](/es/tools/multi-agent-sandbox-tools) -- anulaciones y precedencia por agente
- [Modo elevado](/es/tools/elevated)
