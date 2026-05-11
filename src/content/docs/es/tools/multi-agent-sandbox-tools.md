---
summary: "Restricciones de sandbox y herramientas por agente, precedencia y ejemplos"
title: "Sandbox y herramientas multiagente"
sidebarTitle: "Sandbox y herramientas multiagente"
read_when: "Deseas tener sandbox por agente o políticas de permiso/denegación de herramientas por agente en una puerta de enlace multiagente."
status: activo
---

Cada agente en una configuración multiagente puede anular la política global de sandbox y herramientas. Esta página cubre la configuración por agente, las reglas de precedencia y los ejemplos.

<CardGroup cols={3}>
  <Card title="Sandboxing" href="/es/gateway/sandboxing">
    Backends y modos: referencia completa de sandbox.
  </Card>
  <Card title="Sandbox vs política de herramientas vs elevado" href="/es/gateway/sandbox-vs-tool-policy-vs-elevated">
    Depurar "¿por qué está bloqueado esto?"
  </Card>
  <Card title="Modo elevado" href="/es/tools/elevated">
    Exec elevado para remitentes de confianza.
  </Card>
</CardGroup>

<Warning>
La autenticación es por agente: cada agente lee de su propia tienda de autenticación `agentDir` en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`. Las credenciales **no** se comparten entre agentes. Nunca reutilices `agentDir` entre agentes. Si deseas compartir credenciales, copia `auth-profiles.json` en el `agentDir` del otro agente.
</Warning>

---

## Ejemplos de configuración

<AccordionGroup>
  <Accordion title="Ejemplo 1: Agente personal + agente familiar restringido">
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

    - Agente `main`: se ejecuta en el host, acceso completo a herramientas.
    - Agente `family`: se ejecuta en Docker (un contenedor por agente), solo herramienta `read`.

  </Accordion>
  <Accordion title="Ejemplo 2: Agente de trabajo con sandbox compartido">
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
  </Accordion>
  <Accordion title="Ejemplo 2b: Perfil de codificación global + agente solo de mensajería">
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

    - los agentes predeterminados obtienen herramientas de codificación.
    - el agente `support` es solo de mensajería (+ herramienta Slack).

  </Accordion>
  <Accordion title="Ejemplo 3: Diferentes modos de sandbox por agente">
    ```json
    {
      "agents": {
        "defaults": {
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "list": [
          {
            "id": "main",
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          {
            "id": "public",
            "workspace": "~/.openclaw/workspace-public",
            "sandbox": {
              "mode": "all",
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
  </Accordion>
</AccordionGroup>

---

## Precedencia de configuración

Cuando existen tanto configuraciones globales (`agents.defaults.*`) como específicas del agente (`agents.list[].*`):

### Configuración de sandbox

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

<Note>
`agents.list[].sandbox.{docker,browser,prune}.*` anula `agents.defaults.sandbox.{docker,browser,prune}.*` para ese agente (se ignora cuando el ámbito del sandbox se resuelve a `"shared"`).
</Note>

### Restricciones de herramientas

El orden de filtrado es:

<Steps>
  <Step title="Perfil de herramientas">`tools.profile` o `agents.list[].tools.profile`.</Step>
  <Step title="Perfil de herramientas del proveedor">`tools.byProvider[provider].profile` o `agents.list[].tools.byProvider[provider].profile`.</Step>
  <Step title="Política global de herramientas">`tools.allow` / `tools.deny`.</Step>
  <Step title="Política de herramientas del proveedor">`tools.byProvider[provider].allow/deny`.</Step>
  <Step title="Política de herramientas específica del agente">`agents.list[].tools.allow/deny`.</Step>
  <Step title="Política del proveedor del agente">`agents.list[].tools.byProvider[provider].allow/deny`.</Step>
  <Step title="Política de herramientas de sandbox">`tools.sandbox.tools` o `agents.list[].tools.sandbox.tools`.</Step>
  <Step title="Política de herramientas del subagente">`tools.subagents.tools`, si corresponde.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Reglas de precedencia">
    - Cada nivel puede restringir aún más las herramientas, pero no puede restaurar las herramientas denegadas de niveles anteriores. - Si se establece `agents.list[].tools.sandbox.tools`, reemplaza a `tools.sandbox.tools` para ese agente. - Si se establece `agents.list[].tools.profile`, anula a `tools.profile` para ese agente. - Las claves de herramientas del proveedor aceptan `provider` (por
    ejemplo, `google-antigravity`) o `provider/model` (por ejemplo, `openai/gpt-5.4`).
  </Accordion>
  <Accordion title="Comportamiento de lista de permitidos vacía">
    Si alguna lista de permitidos explícita en esa cadena deja la ejecución sin herramientas invocables, OpenClaw se detiene antes de enviar el mensaje al modelo. Esto es intencional: un agente configurado con una herramienta faltante como `agents.list[].tools.allow: ["query_db"]` debería fallar claramente hasta que se habilite el complemento que registra `query_db`, no continuar como un agente de
    solo texto.
  </Accordion>
</AccordionGroup>

Las políticas de herramientas admiten abreviaturas `group:*` que se expanden a múltiples herramientas. Consulte [Grupos de herramientas](/es/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) para ver la lista completa.

Las anulaciones elevadas por agente (`agents.list[].tools.elevated`) pueden restringir aún más la ejecución elevada para agentes específicos. Consulte [Modo elevado](/es/tools/elevated) para obtener más detalles.

---

## Migración desde un solo agente

<Tabs>
  <Tab title="Antes (agente único)">
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
  </Tab>
  <Tab title="Después (multiagente)">
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
  </Tab>
</Tabs>

<Note>Las configuraciones heredadas de `agent.*` son migradas por `openclaw doctor`; se prefiere `agents.defaults` + `agents.list` en adelante.</Note>

---

## Ejemplos de restricción de herramientas

<Tabs>
  <Tab title="Agente de solo lectura">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="Ejecución segura (sin modificaciones de archivos)">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```
  </Tab>
  <Tab title="Solo comunicación">
    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" },
        "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
        "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
      }
    }
    ```

    `sessions_history` en este perfil todavía devuelve una vista de memoria acotada y saneada en lugar de un volcado bruto de la transcripción. La memoria del asistente elimina las etiquetas de pensamiento, el andamiaje `<relevant-memories>`, las cargas XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), andamiaje de llamadas a herramientas degradado, tokens de control de modelo ASCII/ ancho completo filtrados y XML de llamadas a herramientas de MiniMax malformados antes de la redacción/truncamiento.

  </Tab>
</Tabs>

---

## Error común: "non-main"

<Warning>`agents.defaults.sandbox.mode: "non-main"` se basa en `session.mainKey` (por defecto `"main"`), no en el id del agente. Las sesiones de grupo/canal siempre obtienen sus propias claves, por lo que se tratan como no principales y se ejecutarán en sandbox. Si desea que un agente nunca se ejecute en sandbox, configure `agents.list[].sandbox.mode: "off"`.</Warning>

---

## Pruebas

Después de configurar el sandbox y las herramientas de múltiples agentes:

<Steps>
  <Step title="Verificar la resolución del agente">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="Verificar los contenedores del sandbox">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="Probar las restricciones de herramientas">
    - Envíe un mensaje que requiera herramientas restringidas.
    - Verifique que el agente no pueda usar las herramientas denegadas.
  </Step>
  <Step title="Monitorear los registros">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## Solución de problemas

<AccordionGroup>
  <Accordion title="El agente no está en sandbox a pesar de `mode: 'all'`">- Compruebe si hay un `agents.defaults.sandbox.mode` global que lo anule. - La configuración específica del agente tiene prioridad, así que establezca `agents.list[].sandbox.mode: "all"`.</Accordion>
  <Accordion title="Herramientas aún disponibles a pesar de la lista de denegación">- Verifique el orden de filtrado de herramientas: global → agente → sandbox → subagente. - Cada nivel solo puede restringir aún más, no volver a otorgar. - Verifique con los registros: `[tools] filtering tools for agent:${agentId}`.</Accordion>
  <Accordion title="Contenedor no aislado por agente">- Establezca `scope: "agent"` en la configuración de sandbox específica del agente. - El valor predeterminado es `"session"`, el cual crea un contenedor por sesión.</Accordion>
</AccordionGroup>

---

## Relacionado

- [Modo elevado](/es/tools/elevated)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Configuración de sandbox](/es/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs política de herramientas vs elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated) — depuración de "¿por qué está bloqueado esto?"
- [Sandboxing](/es/gateway/sandboxing) — referencia completa de sandbox (modos, alcances, backends, imágenes)
- [Gestión de sesiones](/es/concepts/session)
