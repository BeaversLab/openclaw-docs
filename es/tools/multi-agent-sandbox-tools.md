---
summary: "Sandbox por agente + restricciones de herramientas, precedencia y ejemplos"
title: Sandbox y herramientas de múltiples agentes
read_when: "Deseas tener un sandbox por agente o políticas de permitir/denegar herramientas por agente en una puerta de enlace de múltiples agentes."
status: active
---

# Configuración de Sandbox y herramientas de múltiples agentes

## Resumen

Cada agente en una configuración de múltiples agentes ahora puede tener su propio:

- **Configuración de sandbox** (`agents.list[].sandbox` anula `agents.defaults.sandbox`)
- **Restricciones de herramientas** (`tools.allow` / `tools.deny`, más `agents.list[].tools`)

Esto te permite ejecutar múltiples agentes con diferentes perfiles de seguridad:

- Asistente personal con acceso completo
- Agentes de familia/trabajo con herramientas restringidas
- Agentes de cara al público en sandboxes

`setupCommand` pertenece a `sandbox.docker` (global o por agente) y se ejecuta una
vez cuando se crea el contenedor.

La autenticación es por agente: cada agente lee desde su propio almacén de autenticación `agentDir` en:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Las credenciales **no** se comparten entre agentes. Nunca reutilices `agentDir` entre agentes.
Si deseas compartir credenciales, copia `auth-profiles.json` en el `agentDir` del otro agente.

Para conocer cómo se comporta el sandboxing en tiempo de ejecución, consulta [Sandboxing](/es/gateway/sandboxing).
Para depurar "¿por qué está bloqueado esto?", consulta [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) y `openclaw sandbox explain`.

---

## Ejemplos de configuración

### Ejemplo 1: Agente personal + Agente familiar restringido

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

- agente `main`: Se ejecuta en el host, acceso completo a herramientas
- agente `family`: Se ejecuta en Docker (un contenedor por agente), solo herramienta `read`

---

### Ejemplo 2: Agente de trabajo con Sandbox compartido

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

### Ejemplo 3: Diferentes modos de Sandbox por agente

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

Cuando existen tanto las configuraciones globales (`agents.defaults.*`) como las específicas del agente (`agents.list[].*`):

### Configuración de Sandbox

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

- `agents.list[].sandbox.{docker,browser,prune}.*` anula `agents.defaults.sandbox.{docker,browser,prune}.*` para ese agente (se ignora cuando el ámbito del sandbox se resuelve como `"shared"`).

### Restricciones de herramientas

El orden de filtrado es:

1. **Perfil de herramienta** (`tools.profile` o `agents.list[].tools.profile`)
2. **Perfil de herramienta del proveedor** (`tools.byProvider[provider].profile` o `agents.list[].tools.byProvider[provider].profile`)
3. **Política global de herramientas** (`tools.allow` / `tools.deny`)
4. **Política de herramientas del proveedor** (`tools.byProvider[provider].allow/deny`)
5. **Política de herramientas específica del agente** (`agents.list[].tools.allow/deny`)
6. **Política de proveedor del agente** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **Política de herramientas del sandbox** (`tools.sandbox.tools` o `agents.list[].tools.sandbox.tools`)
8. **Política de herramientas del subagente** (`tools.subagents.tools`, si corresponde)

Cada nivel puede restringir aún más las herramientas, pero no puede otorgar el acceso a herramientas denegadas en niveles anteriores.
Si se establece `agents.list[].tools.sandbox.tools`, reemplaza a `tools.sandbox.tools` para ese agente.
Si se establece `agents.list[].tools.profile`, anula a `tools.profile` para ese agente.
Las claves de herramientas del proveedor aceptan `provider` (p. ej. `google-antigravity`) o `provider/model` (p. ej. `openai/gpt-5.2`).

### Grupos de herramientas (abreviaturas)

Las políticas de herramientas (globales, de agente, de sandbox) admiten entradas `group:*` que se expanden a múltiples herramientas concretas:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: todas las herramientas integradas de OpenClaw (excluye los complementos del proveedor)

### Modo Elevado

`tools.elevated` es la línea base global (lista de permitidos basada en el remitente). `agents.list[].tools.elevated` puede restringir aún más el modo elevado para agentes específicos (ambos deben permitir).

Patrones de mitigación:

- Denegar `exec` para agentes no confiables (`agents.list[].tools.deny: ["exec"]`)
- Evite poner remitentes en la lista de permitidos que enrutan hacia agentes restringidos
- Desactivar el modo elevado globalmente (`tools.elevated.enabled: false`) si solo desea ejecución en sandbox
- Desactivar el modo elevado por agente (`agents.list[].tools.elevated.enabled: false`) para perfiles sensibles

---

## Migración desde un solo agente

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

Las configuraciones heredadas de `agent.*` se migran mediante `openclaw doctor`; de ahora en adelante, prefiera `agents.defaults` + `agents.list`.

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

### Agente de solo comunicación

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

`agents.defaults.sandbox.mode: "non-main"` se basa en `session.mainKey` (por defecto `"main"`),
no en el id del agente. Las sesiones de grupo/canal siempre obtienen sus propias claves, por lo que
se tratan como no principales y se ejecutarán en el sandbox. Si desea que un agente nunca
ejecute en el sandbox, establezca `agents.list[].sandbox.mode: "off"`.

---

## Pruebas

Después de configurar el sandbox multiagente y las herramientas:

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

4. **Monitorear los registros:**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## Solución de problemas

### El agente no está en el sandbox a pesar de `mode: "all"`

- Compruebe si hay un `agents.defaults.sandbox.mode` global que lo anule
- La configuración específica del agente tiene prioridad, así que establezca `agents.list[].sandbox.mode: "all"`

### Las herramientas siguen disponibles a pesar de la lista de denegación

- Verifique el orden de filtrado de herramientas: global → agente → sandbox → subagente
- Cada nivel solo puede restringir aún más, no volver a conceder
- Verificar con los registros: `[tools] filtering tools for agent:${agentId}`

### Contenedor no aislado por agente

- Establecer `scope: "agent"` en la configuración de sandbox específica del agente
- El valor predeterminado es `"session"` que crea un contenedor por sesión

---

## Vea también

- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Configuración de sandbox](/es/gateway/configuration#agentsdefaults-sandbox)
- [Gestión de sesiones](/es/concepts/session)

import es from "/components/footer/es.mdx";

<es />
