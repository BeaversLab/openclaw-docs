---
summary: "Referencia de la CLI para las comprobaciones de conformidad de `openclaw policy`"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "Política"
---

# `openclaw policy`

`openclaw policy` lo proporciona el complemento Policy incluido. Policy es una
capa de conformidad empresarial sobre la configuración existente de OpenClaw. No añade
un segundo sistema de configuración. `policy.jsonc` define los requisitos autorizados,
OpenClaw observa el espacio de trabajo activo como evidencia y las comprobaciones de salud de la política
informan de las desviaciones a través de `doctor --lint`. La señal final de conformidad es una ejecución
limpia de `doctor --lint`; la política aporta sus resultados a esa superficie compartida de lint
en lugar de crear una puerta de salud separada.

Actualmente, Policy gestiona los canales configurados, los servidores MCP, los proveedores de modelos,
la postura de SSRF de red, la postura de exposición de Gateway, la postura del espacio de trabajo del agente,
la postura del proveedor de secretos/perfil de autenticación de la configuración de OpenClaw y las declaraciones de herramientas
gobernadas. Por ejemplo, TI o un operador del espacio de trabajo pueden registrar que Telegram
no es un proveedor de canales aprobado, restringir los servidores MCP y las referencias de modelos a
entradas aprobadas, requerir que el acceso de recuperación/navegador de red privada permanezca
deshabilitado, requerir que la exposición bind/auth/HTTP de Gateway se mantenga dentro de los límites
revisados, requerir que el acceso al espacio de trabajo del agente y las denegaciones de herramientas se mantengan en una postura
revisada, requerir que los SecretRefs de la configuración de OpenClaw utilicen proveedores administrados, requerir
que los perfiles de autenticación de la configuración lleven metadatos de proveedor/modo, requerir que las herramientas gobernadas
lleven metadatos de riesgo y sensibilidad, y luego usar `doctor --lint` como la puerta de conformidad
compartida.

Use la política cuando un espacio de trabajo necesite una declaración duradera, como "estos canales
no deben estar habilitados" o "las herramientas gobernadas deben declarar metadatos de aprobación", y una forma
repetible de probar que OpenClaw todavía se ajusta a esa declaración. Use
la configuración regular y la documentación del espacio de trabajo por sí solas cuando solo necesite comportamiento local y
no necesite resultados de política ni resultados de atestación.

## Inicio rápido

Habilite el complemento Policy incluido antes del primer uso:

```bash
openclaw plugins enable policy
```

Cuando la política está habilitada, doctor puede cargar las comprobaciones de estado de la política sin activar
complementos arbitrarios. El complemento permanece habilitado si `policy.jsonc` falta, por lo que
doctor puede informar sobre el artefacto faltante.

La política se crea manualmente, no se genera a partir de la configuración actual del usuario. Una política mínima
para canales, servidores MCP, proveedores de modelos, postura de red, exposición de Gateway,
postura del espacio de trabajo del agente, postura del proveedor de secretos/perfil de autenticación de la configuración de OpenClaw
y metadatos de herramientas se ve así:

```jsonc
{
  "channels": {
    "denyRules": [
      {
        "id": "no-telegram",
        "when": { "provider": "telegram" },
        "reason": "Telegram is not approved for this workspace.",
      },
    ],
  },
  "mcp": {
    "servers": {
      "allow": ["docs"],
      "deny": ["untrusted"],
    },
  },
  "models": {
    "providers": {
      "allow": ["openai", "anthropic"],
      "deny": ["openrouter"],
    },
  },
  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },
  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },
  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec"],
    "allowInsecureProviders": false,
  },
  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "token"],
    },
  },
  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["messaging", "minimal"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },
}
```

Las reglas son la autoridad. Un bloque de categoría es solo un espacio de nombres; las comprobaciones se ejecutan cuando hay una regla concreta presente. OpenClaw lee la configuración actual `channels.*`
`mcp.servers.*`, `models.providers.*`, referencias de modelos de agente seleccionadas, configuraciones de red SSRF, postura de vinculación/autenticación/interfaz de usuario de control/Tailscale/remota/HTTP de Gateway, acceso al espacio de trabajo del sandbox del agente de configuración de OpenClaw y postura de denegación de herramientas, proveedor de secretos de configuración y procedencia de SecretRef, metadatos de perfil de autenticación de configuración, postura de herramientas global/por agente configurada, y declaraciones `TOOLS.md` como evidencia, y luego informa sobre el estado observado que no cumple. Si una política deniega enlaces de Gateway que no son de bucle local, omita `gateway.bind` solo cuando esté dispuesto a revisar el valor predeterminado en tiempo de ejecución; establezca `gateway.bind=loopback` para una conformidad de configuración estricta. Para una postura de agente de solo lectura, configure el modo sandbox en los valores predeterminados aplicables o en el agente y establezca `workspaceAccess` en `none` o
`ro`; el modo sandbox omitido o `off` no satisface una política de solo lectura/sin escritura. `agents.workspace.denyTools` admite `exec`, `process`, `write`,
`edit` y `apply_patch`; la configuración `group:fs` de OpenClaw cubre herramientas de mutación de archivos
y `group:runtime` cubre herramientas de shell/proceso. La política de postura de herramientas observa
`tools.profile`, `tools.allow`, `tools.alsoAllow`, `tools.deny`,
`tools.fs.workspaceOnly`, `tools.exec.security`, `tools.exec.ask`,
`tools.exec.host`, `tools.elevated.enabled` y las mismas anulaciones `agents.list[].tools.*` por agente. No lee el estado de aprobación en tiempo de ejecución/operador, como exec-approvals., y no impone llamadas a herramientas en tiempo de ejecución. Los registros de evidencia de secretos registran la postura del proveedor/fuente y los metadatos de SecretRef, nunca los valores brutos de los secretos. La política no lee ni certifica almacenes de credenciales por agente, como `auth-profiles.json`; esos almacenes siguen siendo propiedad de los flujos de autenticación y credenciales existentes.

### Referencia de reglas de política

Cada campo de política a continuación es opcional. Una verificación se ejecuta solo cuando la regla coincidente está presente en `policy.jsonc`. El estado observado es la configuración existente de OpenClaw o los metadatos del espacio de trabajo; la política informa de las desviaciones pero no reescribe el comportamiento del tiempo de ejecución a menos que una ruta de reparación esté explícitamente disponible y habilitada.

#### Canales

| Campo de política                    | Estado observado                                               | Usar cuando                                                       |
| ------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `channels.denyRules[].when.provider` | proveedor `channels.*` y estado habilitado                     | Denegar los canales configurados de un proveedor como `telegram`. |
| `channels.denyRules[].reason`        | Contexto del mensaje de hallazgo y la sugerencia de reparación | Explicar por qué se deniega el proveedor.                         |

#### Servidores MCP

| Campo de política   | Estado observado    | Usar cuando                                                                 |
| ------------------- | ------------------- | --------------------------------------------------------------------------- |
| `mcp.servers.allow` | ids `mcp.servers.*` | Requerir que cada servidor MCP configurado esté en una lista de permitidos. |
| `mcp.servers.deny`  | ids `mcp.servers.*` | Denegar ids de servidores MCP configurados específicos.                     |

#### Proveedores de modelos

| Campo de política        | Estado observado                                                | Usar cuando                                                                                                      |
| ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `models.providers.allow` | ids `models.providers.*` y referencias de modelos seleccionados | Requerir que los proveedores configurados y las referencias de modelos seleccionados usen proveedores aprobados. |
| `models.providers.deny`  | ids `models.providers.*` y referencias de modelos seleccionados | Denegar proveedores configurados y referencias de modelos seleccionados por id de proveedor.                     |

#### Red

| Campo de política              | Estado observado               | Usar cuando                                                                                  |
| ------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `network.privateNetwork.allow` | Escapes de SSRF de red privada | Establecer en `false` para requerir que el acceso a la red privada permanezca deshabilitado. |

#### Gateway

| Campo de política                       | Estado observado                                                                                     | Usar cuando                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                                                                       | Establecer en `false` para requerir el enlace de bucle local (loopback) de Gateway.                                   |
| `gateway.exposure.allowTailscaleFunnel` | Postura de Gateway de Tailscale serve/funnel                                                         | Establecer en `false` para denegar la exposición a través de Tailscale Funnel.                                        |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                                                                                  | Establecer en `true` para rechazar la autenticación deshabilitada de Gateway.                                         |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                                                                             | Establecer en `true` para requerir una configuración explícita de límite de tasa de autenticación.                    |
| `gateway.controlUi.allowInsecure`       | Controlar los interruptores de autenticación/dispositivo/origen no seguros de la interfaz de usuario | Establézcalo en `false` para denegar los interruptores de exposición no seguros de la interfaz de usuario de Control. |
| `gateway.remote.allow`                  | Modo/Configuración de Gateway remoto                                                                 | Establézcalo en `false` para denegar el modo de Gateway remoto.                                                       |
| `gateway.http.denyEndpoints`            | Endpoints de la API HTTP de Gateway                                                                  | Denegar identificadores de endpoint como `chatCompletions` o `responses`.                                             |
| `gateway.http.requireUrlAllowlists`     | Entradas de obtención de URL HTTP de Gateway                                                         | Establézcalo en `true` para requerir listas de permitidos de URL en las entradas de obtención de URL.                 |

#### Espacio de trabajo del agente

| Campo de política                | Estado observado                                                                    | Usar cuando                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` y `agents.list[].sandbox.workspaceAccess` | Permitir solo valores de acceso al espacio de trabajo de sandbox como `none` o `ro`.                                                                  |
| `agents.workspace.denyTools`     | Configuración de denegación de herramientas global y por agente                     | Requerir que se denieguen herramientas de mutación de espacio de trabajo/tiempo de ejecución como `exec`, `process`, `write`, `edit` o `apply_patch`. |

#### Secretos

| Campo de política                 | Estado observado                                                  | Usar cuando                                                                               |
| --------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | Configuración de SecretRefs y declaraciones `secrets.providers.*` | Establézcalo en `true` para requerir que las SecretRefs apunten a proveedores declarados. |
| `secrets.denySources`             | Fuentes de proveedores de secretos y fuentes de SecretRef         | Denegar fuentes como `exec`, `file` u otro nombre de fuente configurado.                  |
| `secrets.allowInsecureProviders`  | Marcas de postura no segura del proveedor de secretos             | Establézcalo en `false` para rechazar proveedores que opten por una postura no segura.    |

#### Perfiles de autenticación

| Campo de política               | Estado observado                                 | Usar cuando                                                                                              |
| ------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | Metadatos del proveedor y modo `auth.profiles.*` | Requerir claves de metadatos como `provider` y `mode` en los perfiles de autenticación de configuración. |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                           | Permitir solo modos de perfil de autenticación admitidos como `api_key`, `aws-sdk`, `oauth` o `token`.   |

#### Metadatos de la herramienta

| Campo de política       | Estado observado                    | Usar cuando                                                                                                 |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `tools.requireMetadata` | Declaraciones `TOOLS.md` gobernadas | Requerir que las herramientas gobernadas declaren claves de metadatos como `risk`, `sensitivity` o `owner`. |

#### Postura de la herramienta

| Campo de política               | Estado observado                                                 | Usar cuando                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` y `agents.list[].tools.profile`                  | Permitir solo ids de perfil de herramienta como `minimal`, `messaging` o `coding`.                                                          |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` y anulaciones `tools.fs` por agente     | Establecer en `true` para requerir una postura de herramienta de sistema de archivos solo del espacio de trabajo.                           |
| `tools.exec.allowSecurity`      | `tools.exec.security` y seguridad de ejecución por agente        | Permitir solo modos de seguridad de ejecución como `deny` o `allowlist`.                                                                    |
| `tools.exec.requireAsk`         | `tools.exec.ask` y modo de solicitud de ejecución por agente     | Requerir postura de aprobación como `always`.                                                                                               |
| `tools.exec.allowHosts`         | `tools.exec.host` y enrutamiento de host de ejecución por agente | Permitir solo modos de enrutamiento de host de ejecución como `sandbox`.                                                                    |
| `tools.elevated.allow`          | `tools.elevated.enabled` y postura elevada por agente            | Establecer en `false` para requerir que el modo de herramienta elevada permanezca deshabilitado.                                            |
| `tools.denyTools`               | `tools.deny` y `agents.list[].tools.deny`                        | Requerir que las listas de denegación de herramientas configuradas incluyan ids o grupos de herramientas como `group:runtime` y `group:fs`. |

Ejecutar comprobaciones solo de políticas durante la creación:

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` ejecuta solo el conjunto de verificaciones de política y emite evidencias, hallazgos y
hashes de atestación. Los mismos hallazgos también aparecen en `openclaw doctor --lint`
cuando el complemento Policy está habilitado.

Un ejemplo de salida JSON limpia incluye hashes estables que pueden ser registrados por un
operador o supervisor:

```json
{
  "ok": true,
  "attestation": {
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": []
}
```

## Configurar política

La configuración de la política reside en `plugins.entries.policy.config`.

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "enabled": true,
        "config": {
          "enabled": true,
          "path": "policy.jsonc",
          "workspaceRepairs": false,
          "expectedHash": "sha256:...",
          "expectedAttestationHash": "sha256:...",
        },
      },
    },
  },
}
```

| Configuración             | Propósito                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `enabled`                 | Habilitar comprobaciones de política incluso antes de que `policy.jsonc` exista.                        |
| `workspaceRepairs`        | Permitir que `doctor --fix` edite la configuración del espacio de trabajo administrada por la política. |
| `expectedHash`            | Bloqueo de hash opcional para el artefacto de política aprobado.                                        |
| `expectedAttestationHash` | Bloqueo de hash opcional para la última comprobación de política limpia aceptada.                       |
| `path`                    | Ubicación relativa al espacio de trabajo del artefacto de política.                                     |

Establezca `plugins.entries.policy.config.enabled` en `false` para desactivar las comprobaciones de política
para un espacio de trabajo mientras deja el complemento instalado.

Los requisitos de metadatos de las herramientas se redactan en `policy.jsonc` con
`tools.requireMetadata`, por ejemplo `["risk", "sensitivity", "owner"]`.

## Aceptar estado de la política

Ejemplo de salida JSON:

```json
{
  "ok": true,
  "attestation": {
    "checkedAt": "2026-05-10T20:00:00.000Z",
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "evidence": {
    "channels": [
      {
        "id": "telegram",
        "provider": "telegram",
        "source": "oc://openclaw.config/channels/telegram",
        "enabled": false
      }
    ],
    "mcpServers": [
      {
        "id": "docs",
        "transport": "stdio",
        "source": "oc://openclaw.config/mcp/servers/docs",
        "command": "npx"
      }
    ],
    "modelProviders": [
      {
        "id": "openai",
        "source": "oc://openclaw.config/models/providers/openai"
      }
    ],
    "modelRefs": [
      {
        "ref": "openai/gpt-5.5",
        "provider": "openai",
        "model": "gpt-5.5",
        "source": "oc://openclaw.config/agents/defaults/model"
      }
    ],
    "network": [
      {
        "id": "browser-private-network",
        "source": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
        "value": false
      }
    ],
    "gatewayExposure": [
      {
        "id": "gateway-bind",
        "kind": "bind",
        "source": "oc://openclaw.config/gateway/bind",
        "value": "loopback",
        "nonLoopback": false,
        "explicit": true
      }
    ],
    "agentWorkspace": [
      {
        "id": "agents-defaults-workspace-access",
        "kind": "workspaceAccess",
        "source": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
        "scope": "defaults",
        "value": "ro",
        "sandboxMode": "all",
        "sandboxModeSource": "oc://openclaw.config/agents/defaults/sandbox/mode",
        "sandboxEnabled": true,
        "explicit": true
      },
      {
        "id": "agents-defaults-tool-exec",
        "kind": "toolDeny",
        "source": "oc://openclaw.config/tools/deny",
        "scope": "defaults",
        "tool": "exec",
        "denied": true,
        "explicit": true
      }
    ],
    "secrets": [
      {
        "id": "vault",
        "kind": "provider",
        "source": "oc://openclaw.config/secrets/providers/vault",
        "providerSource": "env"
      },
      {
        "id": "oc://openclaw.config/models/providers/openai/apiKey",
        "kind": "input",
        "source": "oc://openclaw.config/models/providers/openai/apiKey",
        "provenance": "secretRef",
        "refSource": "env",
        "refProvider": "vault"
      }
    ],
    "authProfiles": [
      {
        "id": "github",
        "source": "oc://openclaw.config/auth/profiles/github",
        "validMetadata": true,
        "provider": "github",
        "mode": "token"
      }
    ],
    "tools": [
      {
        "id": "deploy",
        "source": "oc://TOOLS.md/tools/deploy",
        "line": 12,
        "risk": "critical",
        "sensitivity": "restricted",
        "capabilities": ["IRREVERSIBLE_EXTERNAL"]
      }
    ]
  },
  "checksRun": 30,
  "checksSkipped": 0,
  "findings": []
}
```

El hash de política identifica el artefacto de reglas redactado. El bloque de evidencia
registra el estado observado de OpenClaw utilizado por las comprobaciones de política. El
valor `workspace.hash` identifica esa carga útil de evidencia para el ámbito verificado.
El hash de hallazgos identifica el conjunto exacto de hallazgos devuelto por la comprobación.
`checkedAt` registra cuándo se ejecutó la evaluación. El hash de atestación identifica
la afirmación estable: hash de política, hash de evidencia, hash de hallazgos y si el
resultado fue limpio. Intencionalmente no incluye `checkedAt`, por lo que el mismo
estado de política produce la misma atestación en comprobaciones repetidas. Juntos,
estos forman la tupla de auditoría para esta comprobación de política.

Si una pasarela o supervisor posterior utiliza la política para bloquear, aprobar o anotar una
acción de tiempo de ejecución, debe registrar el hash de atestación de la última comprobación de política
limpia. `checkedAt` se mantiene en la salida JSON para los registros de auditoría, pero no es parte del
hash de atestación estable.

Use este ciclo de vida al aceptar el estado de la política:

1. Author or review `policy.jsonc`.
2. Run `openclaw policy check --json`.
3. If the result is clean, record `attestation.policy.hash` as `expectedHash`.
4. Record `attestation.attestationHash` as `expectedAttestationHash`.
5. Re-run `openclaw doctor --lint` in CI or release gates.

If policy rules change intentionally, update both accepted hashes from a clean
check. If workspace settings change intentionally but policy stays the same,
only `expectedAttestationHash` usually changes.

Enabling or upgrading `agents.workspace` rules adds `agentWorkspace` evidence to
the workspace hash and attestation hash. Operators should review the new
evidence and refresh accepted attestation hashes after enabling these rules.
Enabling or upgrading tool posture rules adds `toolPosture` evidence in the
same way.

`openclaw policy watch` runs the same check repeatedly and reports when the
current evidence no longer matches `expectedAttestationHash`:

```bash
openclaw policy watch --json
```

Use `--once` in CI or scripts that only need one drift evaluation. Without
`--once`, the command polls every two seconds by default; use `--interval-ms` to
choose a different interval.

## Hallazgos

La política verifica actualmente:

| ID de verificación                           | Hallazgo                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                | Policy is enabled but `policy.jsonc` is missing.                                                                                       |
| `policy/policy-jsonc-invalid`                | La política no se puede analizar o contiene entradas de reglas malformadas.                                                            |
| `policy/policy-hash-mismatch`                | Policy does not match configured `expectedHash`.                                                                                       |
| `policy/attestation-hash-mismatch`           | Current policy evidence no longer matches the accepted attestation.                                                                    |
| `policy/channels-denied-provider`            | An enabled channel matches a channel deny rule.                                                                                        |
| `policy/mcp-denied-server`                   | A configured MCP server is denied by policy.                                                                                           |
| `policy/mcp-unapproved-server`               | A configured MCP server is outside the allowlist.                                                                                      |
| `policy/models-denied-provider`              | A configured model provider or model ref uses a denied provider.                                                                       |
| `policy/models-unapproved-provider`          | Un proveedor de modelo configurado o una referencia de modelo (model ref) está fuera de la lista de permitidos.                        |
| `policy/network-private-access-enabled`      | Una compuerta de escape (escape hatch) de SSRF de red privada está habilitada cuando la política lo deniega.                           |
| `policy/gateway-non-loopback-bind`           | La postura de enlace de Gateway permite la exposición que no es de bucle local (non-loopback) cuando la política lo deniega.           |
| `policy/gateway-auth-disabled`               | La autenticación de Gateway está deshabilitada cuando la política requiere autenticación.                                              |
| `policy/gateway-rate-limit-missing`          | La postura de límite de tasa de autenticación de Gateway no es explícita cuando la política lo requiere.                               |
| `policy/gateway-control-ui-insecure`         | Los interruptores de exposición insegura de la interfaz de usuario de control de Gateway están habilitados.                            |
| `policy/gateway-tailscale-funnel`            | La exposición a través de Tailscale Funnel de Gateway está habilitada cuando la política lo deniega.                                   |
| `policy/gateway-remote-enabled`              | El modo remoto de Gateway está activo cuando la política lo deniega.                                                                   |
| `policy/gateway-http-endpoint-enabled`       | Un endpoint de la API HTTP de Gateway está habilitado mientras es denegado por la política.                                            |
| `policy/gateway-http-url-fetch-unrestricted` | La entrada de obtención de URL HTTP de Gateway carece de una lista de permitidos de URL requerida.                                     |
| `policy/agents-workspace-access-denied`      | El modo de espacio aislado (sandbox) del agente o el acceso al espacio de trabajo está fuera de la lista de permitidos de la política. |
| `policy/agents-tool-not-denied`              | Un agente o una configuración predeterminada no deniega una herramienta requerida por la política.                                     |
| `policy/tools-profile-unapproved`            | Un perfil de herramienta global o por agente configurado está fuera de la lista de permitidos.                                         |
| `policy/tools-fs-workspace-only-required`    | Las herramientas del sistema de archivos no están configuradas con una postura de ruta solo para el espacio de trabajo.                |
| `policy/tools-exec-security-unapproved`      | El modo de seguridad de ejecución (Exec security mode) está fuera de la lista de permitidos de la política.                            |
| `policy/tools-exec-ask-unapproved`           | El modo de solicitud de ejecución (Exec ask mode) está fuera de la lista de permitidos de la política.                                 |
| `policy/tools-exec-host-unapproved`          | El enrutamiento de host de ejecución (Exec host routing) está fuera de la lista de permitidos de la política.                          |
| `policy/tools-elevated-enabled`              | El modo de herramienta elevada está habilitado cuando la política lo deniega.                                                          |
| `policy/tools-required-deny-missing`         | Una lista de denegación de herramientas global o por agente no incluye una herramienta denegada requerida.                             |
| `policy/secrets-unmanaged-provider`          | Un SecretRef de configuración hace referencia a un proveedor no declarado en `secrets.providers`.                                      |
| `policy/secrets-denied-provider-source`      | Un proveedor de secretos de configuración o un SecretRef utiliza un origen denegado por la política.                                   |
| `policy/secrets-insecure-provider`           | Un proveedor de secretos opta por una postura insegura cuando la política lo deniega.                                                  |
| `policy/auth-profile-invalid-metadata`       | Faltan metadatos válidos de proveedor o modo en un perfil de autenticación de configuración.                                           |
| `policy/auth-profile-unapproved-mode`        | Un modo de perfil de autenticación de configuración está fuera de la lista de permitidos de la política.                               |
| `policy/tools-missing-risk-level`            | Faltan metadatos de riesgo en una declaración de herramienta gobernada.                                                                |
| `policy/tools-unknown-risk-level`            | Una declaración de herramienta gobernada utiliza un valor de riesgo desconocido.                                                       |
| `policy/tools-missing-sensitivity-token`     | Faltan metadatos de sensibilidad en una declaración de herramienta gobernada.                                                          |
| `policy/tools-missing-owner`                 | Faltan metadatos de propietario en una declaración de herramienta gobernada.                                                           |
| `policy/tools-unknown-sensitivity-token`     | Una declaración de herramienta gobernada utiliza un valor de sensibilidad desconocido.                                                 |

Los hallazgos de política pueden incluir tanto `target` como `requirement`. `target` es el elemento del espacio de trabajo observado que no cumple. `requirement` es la regla de política escrita que lo convirtió en un hallazgo. Ambos valores son direcciones hoy, generalmente rutas `oc://`, pero los nombres de los campos describen su función en la política más que el formato de la dirección.

Ejemplo de hallazgo JSON:

```json
{
  "checkId": "policy/channels-denied-provider",
  "severity": "error",
  "message": "Channel 'telegram' uses denied provider 'telegram'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/channels/telegram",
  "target": "oc://openclaw.config/channels/telegram",
  "requirement": "oc://policy.jsonc/channels/denyRules/#0",
  "fixHint": "Telegram is not approved for this workspace."
}
```

Ejemplo de hallazgo de herramienta:

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "TOOLS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "TOOLS.md",
  "line": 12,
  "ocPath": "oc://TOOLS.md/tools/deploy",
  "target": "oc://TOOLS.md/tools/deploy",
  "requirement": "oc://policy.jsonc/tools/requireMetadata"
}
```

Ejemplo de hallazgo MCP:

```json
{
  "checkId": "policy/mcp-unapproved-server",
  "severity": "error",
  "message": "MCP server 'remote' is not in the policy allowlist.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/mcp/servers/remote",
  "target": "oc://openclaw.config/mcp/servers/remote",
  "requirement": "oc://policy.jsonc/mcp/servers/allow"
}
```

Ejemplo de hallazgo de proveedor de modelo:

```json
{
  "checkId": "policy/models-unapproved-provider",
  "severity": "error",
  "message": "Model ref 'anthropic/claude-sonnet-4.7' uses unapproved provider 'anthropic'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "target": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "requirement": "oc://policy.jsonc/models/providers/allow"
}
```

Ejemplo de hallazgo de red:

```json
{
  "checkId": "policy/network-private-access-enabled",
  "severity": "error",
  "message": "Network setting 'browser-private-network' allows private-network access.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "target": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "requirement": "oc://policy.jsonc/network/privateNetwork/allow"
}
```

Ejemplo de hallazgo de exposición de Gateway:

```json
{
  "checkId": "policy/gateway-non-loopback-bind",
  "severity": "error",
  "message": "Gateway bind setting 'gateway-bind' permits non-loopback exposure.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/bind",
  "target": "oc://openclaw.config/gateway/bind",
  "requirement": "oc://policy.jsonc/gateway/exposure/allowNonLoopbackBind"
}
```

Ejemplo de hallazgo de espacio de trabajo del agente:

```json
{
  "checkId": "policy/agents-workspace-access-denied",
  "severity": "error",
  "message": "agents.defaults sandbox workspaceAccess 'rw' is not allowed by policy.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "target": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "requirement": "oc://policy.jsonc/agents/workspace/allowedAccess"
}
```

## Reparación

`doctor --lint` y `policy check` son de solo lectura.

`doctor --fix` solo edita la configuración del espacio de trabajo administrada por la política cuando `workspaceRepairs` está explícitamente habilitado. Sin esa opción, las comprobaciones de política informan lo que repararían y dejan la configuración sin cambios.

En esta versión, la reparación puede deshabilitar canales que están habilitados en la configuración de OpenClaw pero denegados por `channels.denyRules`. Habilite `workspaceRepairs` solo después de que se haya revisado el archivo de política, porque una regla de denegación válida puede desactivar un canal configurado:

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "config": {
          "workspaceRepairs": true,
        },
      },
    },
  },
}
```

## Códigos de salida

| Comando        | `0`                                                   | `1`                                                       | `2`                                          |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| `policy check` | No hay hallazgos en el umbral.                        | Se cumplió uno o más hallazgos en el umbral.              | Fallo de argumento o en tiempo de ejecución. |
| `policy watch` | No hay hallazgos y el hash aceptado está actualizado. | Existen hallazgos o la atestación aceptada está obsoleta. | Fallo de argumento o de tiempo de ejecución. |

## Relacionado

- [Modo Doctor lint](/es/cli/doctor#lint-mode)
- [CLI de ruta](/es/cli/path)
