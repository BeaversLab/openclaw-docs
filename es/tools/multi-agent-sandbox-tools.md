---
summary: “Restricciones de sandbox + herramientas por agente, precedencia y ejemplos”
title: Sandbox y herramientas de multiagente
read_when: “Deseas realizar un sandbox por agente o políticas de permiso/denegación de herramientas por agente en una puerta de enlace multiagente.”
status: active
---

# Configuración de Sandbox y Herramientas de Multiagente

Cada agente en una configuración multiagente puede anular la política global de
sandbox y herramientas. Esta página cubre la configuración por agente, las reglas
de precedencia y ejemplos.

- **Backends y modos de sandbox**: consulta [Sandboxing](/es/gateway/sandboxing).
- **Depuración de herramientas bloqueadas**: consulta [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) y `openclaw sandbox explain`.
- **Exec elevado**: consulta [Elevated Mode](/es/tools/elevated).

La autenticación es por agente: cada agente lee desde su propio almacén de
autenticación `agentDir` en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`.
Las credenciales **no** se comparten entre agentes. Nunca reutilices `agentDir`
entre agentes.
Si deseas compartir credenciales, copia `auth-profiles.json` en el `agentDir`
del otro agente.

---

## Ejemplos de configuración

### Ejemplo 1: Agente personal + agente familiar restringido

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Personal Assistant",
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "family",
        "name": "Family Bot",
        "workspace": "~/.openclaw/workspace-family",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "family",
      "match": {
        "provider": "whatsapp",
        "accountId": "*",
        "peer": {
          "kind": "group",
          "id": "120363424282127706@g.us"
        }
      }
    }
  ]
}
```

**Resultado:**

- agente `main`: se ejecuta en el host, acceso completo a herramientas
- agente `family`: se ejecuta en Docker (un contenedor por agente), solo herramienta `read`

---

### Ejemplo 2: Agente de trabajo con sandbox compartido

```json
{
  "agents": {
    "list": [
      {
        "id": "personal",
        "workspace": "~/.openclaw/workspace-personal",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "work",
        "workspace": "~/.openclaw/workspace-work",
        "sandbox": {
          "mode": "all",
          "scope": "shared",
          "workspaceRoot": "/tmp/work-sandboxes"
        },
        "tools": {
          "allow": ["read", "write", "apply_patch", "exec"],
          "deny": ["browser", "gateway", "discord"]
        }
      }
    ]
  }
}
```

---

### Ejemplo 2b: Perfil de codificación global + agente solo de mensajería

```json
{
  "tools": { "profile": "coding" },
  "agents": {
    "list": [
      {
        "id": "support",
        "tools": { "profile": "messaging", "allow": ["slack"] }
      }
    ]
  }
}
```

**Resultado:**

- los agentes predeterminados obtienen herramientas de codificación
- el agente `support` es solo de mensajería (+ herramienta Slack)

---

### Ejemplo 3: Diferentes modos de sandbox por agente

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main", // Global default
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/.openclaw/workspace",
        "sandbox": {
          "mode": "off" // Override: main never sandboxed
        }
      },
      {
        "id": "public",
        "workspace": "~/.openclaw/workspace-public",
        "sandbox": {
          "mode": "all", // Override: public always sandboxed
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

---

## Precedencia de configuración

Cuando existen configuraciones globales (`agents.defaults.*`) y específicas del agente (`agents.list[].*`):

### Configuración del Sandbox

La configuración específica del agente anula la global:

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**Notas:**

- `agents.list[].sandbox.{docker,browser,prune}.*` anula `agents.defaults.sandbox.{docker,browser,prune}.*` para ese agente (se ignora cuando el alcance del sandbox se resuelve en `"shared"`).

### Restricciones de herramientas

El orden de filtrado es:

1. **Perfil de herramientas** (`tools.profile` o `agents.list[].tools.profile`)
2. **Perfil de herramientas del proveedor** (`tools.byProvider[provider].profile` o `agents.list[].tools.byProvider[provider].profile`)
3. **Política global de herramientas** (`tools.allow` / `tools.deny`)
4. **Política de herramientas del proveedor** (`tools.byProvider[provider].allow/deny`)
5. **Política de herramientas específica del agente** (`agents.list[].tools.allow/deny`)
6. **Política de proveedor del agente** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **Política de herramientas del sandbox** (`tools.sandbox.tools` o `agents.list[].tools.sandbox.tools`)
8. **Política de herramientas del subagente** (`tools.subagents.tools`, si corresponde)

Cada nivel puede restringir aún más las herramientas, pero no puede restaurar las herramientas denegadas de niveles anteriores.
Si se establece `agents.list[].tools.sandbox.tools`, reemplaza a `tools.sandbox.tools` para ese agente.
Si se establece `agents.list[].tools.profile`, anula a `tools.profile` para ese agente.
Las claves de herramientas del proveedor aceptan `provider` (p. ej., `google-antigravity`) o `provider/model` (p. ej., `openai/gpt-5.2`).

Las políticas de herramientas admiten atajos `group:*` que se expanden a múltiples herramientas. Consulte [Grupos de herramientas](/es/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) para ver la lista completa.

Las anulaciones elevadas por agente (`agents.list[].tools.elevated`) pueden restringir aún más la exec elevada para agentes específicos. Consulte [Modo elevado](/es/tools/elevated) para obtener más detalles.

---

## Migración desde agente único

**Antes (agente único):**

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "tools": {
    "sandbox": {
      "tools": {
        "allow": ["read", "write", "apply_patch", "exec"],
        "deny": []
      }
    }
  }
}
```

**Después (multiagente con diferentes perfiles):**

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      }
    ]
  }
}
```

Las configuraciones `agent.*` heredadas se migran mediante `openclaw doctor`; se prefiere `agents.defaults` + `agents.list` en adelante.

---

## Ejemplos de restricción de herramientas

### Agente de solo lectura

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### Agente de ejecución segura (sin modificaciones de archivos)

```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### Agente solo de comunicación

```json
{
  "tools": {
    "sessions": { "visibility": "tree" },
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## Error común: "non-main"

`agents.defaults.sandbox.mode: "non-main"` se basa en `session.mainKey` (predeterminado `"main"`),
no en el id del agente. Las sesiones de grupo/canal siempre obtienen sus propias claves, por lo que
se tratan como no principales y se limitarán. Si desea que un agente nunca
se limite, establezca `agents.list[].sandbox.mode: "off"`.

---

## Pruebas

Después de configurar el sandbox y las herramientas multiagente:

1. **Verificar la resolución del agente:**

   ```exec
   openclaw agents list --bindings
   ```

2. **Verificar los contenedores del sandbox:**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **Probar las restricciones de herramientas:**
   - Enviar un mensaje que requiera herramientas restringidas
   - Verificar que el agente no pueda usar las herramientas denegadas

4. **Monitorear registros:**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## Solución de problemas

### Agente no aislado a pesar de `mode: "all"`

- Compruebe si hay un `agents.defaults.sandbox.mode` global que lo anule
- La configuración específica del agente tiene prioridad, así que establezca `agents.list[].sandbox.mode: "all"`

### Herramientas aún disponibles a pesar de la lista de denegación

- Compruebe el orden de filtrado de herramientas: global → agente → sandbox → subagente
- Cada nivel solo puede restringir más, no restaurar permisos
- Verifique con los registros: `[tools] filtering tools for agent:${agentId}`

### Contenedor no aislado por agente

- Establezca `scope: "agent"` en la configuración de sandbox específica del agente
- El valor predeterminado es `"session"` que crea un contenedor por sesión

---

## Véase también

- [Aislamiento (Sandboxing)](/es/gateway/sandboxing) -- referencia completa del sandbox (modos, ámbitos, backends, imágenes)
- [Sandbox vs Política de herramientas vs Elevado (Elevated)](/es/gateway/sandbox-vs-tool-policy-vs-elevated) -- depuración de "¿por qué está bloqueado esto?"
- [Modo Elevado (Elevated Mode)](/es/tools/elevated)
- [Enrutamiento Multiagente (Multi-Agent Routing)](/es/concepts/multi-agent)
- [Configuración del Sandbox (Sandbox Configuration)](/es/gateway/configuration-reference#agents-defaults-sandbox)
- [Gestión de Sesiones (Session Management)](/es/concepts/session)

import es from "/components/footer/es.mdx";

<es />
