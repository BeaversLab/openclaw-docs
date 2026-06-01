---
summary: "Referencia de CLI para verificaciones de conformidad de `openclaw policy`"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "Política"
---

# `openclaw policy`

`openclaw policy` es proporcionado por el complemento Policy incluido. Policy es una
capa de conformidad empresarial sobre la configuración existente de OpenClaw. No añade un
segundo sistema de configuración. `policy.jsonc` define los requisitos creados,
OpenClaw observa el área de trabajo activa como evidencia y las comprobaciones de estado de la política
informan sobre las desviaciones a través de `doctor --lint`. La señal final de conformidad es una ejecución
limpia de `doctor --lint`; la política aporta hallazgos a esa superficie compartida de lint
en lugar de crear una puerta de salud separada.

Actualmente, Policy gestiona los canales configurados, servidores MCP, proveedores de modelos,
postura de SSRF de red, postura de acceso de ingreso/canal, postura de exposición de Gateway, postura del área de trabajo del agente,
postura del proveedor de secretos/perfil de autenticación de la configuración de OpenClaw y declaraciones de herramientas
gobernadas. Por ejemplo, el departamento de TI o un operador del área de trabajo puede registrar que Telegram
no es un proveedor de canales aprobado, restringir los servidores MCP y las referencias de modelos a
entradas aprobadas, requerir que el acceso de red privada/navegador permanezca
deshabilitado, requerir que el aislamiento de sesión de mensaje directo y la postura de ingreso del canal
se mantengan dentro de los límites revisados, requerir que la vinculación/autenticación/exposición HTTP de Gateway se mantenga dentro de los límites
revisados, requerir que el acceso al área de trabajo del agente y las denegaciones de herramientas se mantengan en una postura
revisada, requerir que los SecretRefs de la configuración de OpenClaw usen proveedores administrados, requerir
que los perfiles de autenticación de la configuración lleven metadatos de proveedor/modo, requerir que las herramientas gobernadas lleven
metadatos de riesgo y sensibilidad, y luego usar `doctor --lint` como la puerta compartida
de conformidad.

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
complementos arbitrarios. El complemento permanece habilitado si falta `policy.jsonc`, por lo que
doctor puede informar sobre el artefacto faltante.

Policy se redacta, no se genera a partir de la configuración actual del usuario. Una política mínima para canales, servidores MCP, proveedores de modelos, postura de red, acceso de entrada/canal (ingress/channel), exposición de Gateway, postura del espacio de trabajo del agente, postura del tiempo de ejecución de sandbox configurado, postura del proveedor de secretos/perfil de autenticación de la configuración de OpenClaw y metadatos de herramientas se ve así:

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
  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
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

Las reglas son la autoridad. Un bloque de categoría es solo un espacio de nombres; las comprobaciones se ejecutan cuando existe una regla concreta. OpenClaw lee la configuración actual de `channels.*`
`mcp.servers.*`, `models.providers.*`, referencias del modelo de agente seleccionado, configuraciones de red SSRF,
alcance de la sesión de mensaje directo, política de MD de canal, política de grupo de canal,
puertas de mención de canal/grupo, postura de enlace/autenticación/interfaz de usuario de control/Tailscale/remoto/HTTP de Gateway,
acceso al espacio de trabajo del sandbox del agente de configuración de OpenClaw y postura de denegación de herramientas,
proveedor de secretos de configuración y procedencia de SecretRef, metadatos del perfil de autenticación de configuración,
postura de herramienta global/por agente configurada y declaraciones `TOOLS.md` como evidencia, y luego
informa del estado observado que no cumple. Si una política deniega enlaces de Gateway que no son de loopback,
omita `gateway.bind` solo cuando esté dispuesto a revisar el valor predeterminado en tiempo de ejecución; establezca `gateway.bind=loopback` para
una conformidad de configuración estricta. Para una postura de agente de solo lectura, configure el modo sandbox
en los valores predeterminados o agentes aplicables y establezca `workspaceAccess` en `none` o
`ro`; el modo sandbox omitido o `off` no satisface una política de solo lectura/sin escritura.
`agents.workspace.denyTools` admite `exec`, `process`, `write`,
`edit` y `apply_patch`; la configuración de OpenClaw `group:fs` cubre herramientas de mutación de archivos
y `group:runtime` cubre herramientas de shell/proceso. La política de postura de herramientas observa
`tools.profile`, `tools.allow`, `tools.alsoAllow`, `tools.deny`,
`tools.fs.workspaceOnly`, `tools.exec.security`, `tools.exec.ask`,
`tools.exec.host`, `tools.elevated.enabled` y las mismas anulaciones
`agents.list[].tools.*` por agente. No lee el estado de aprobación en tiempo de ejecución/del operador
tal como exec-approvals., ni aplica las llamadas a herramientas en
tiempo de ejecución. La evidencia de secretos registra
la postura del proveedor/fuente y los metadatos de SecretRef, nunca valores de secretos sin procesar. La política
no lee ni certifica almacenes de credenciales por agente tales como `auth-profiles.json`;
esos almacenes siguen siendo propiedad de los flujos de autenticación y credenciales existentes.

### Referencia de reglas de política

Cada campo de política a continuación es opcional. Una verificación se ejecuta solo cuando la regla coincidente está
presente en `policy.jsonc`. El estado observado es la configuración existente de OpenClaw o los
metadatos del área de trabajo; la política informa de las desviaciones pero no reescribe el comportamiento en tiempo de ejecución
a menos que una ruta de reparación esté explícitamente disponible y habilitada.

Las superposiciones de política mantienen las reglas generales de nivel superior como globales y luego permiten que los bloques de ámbito con nombre
añadan secciones de política normales más estrictas para selectores explícitos. Un nombre de ámbito es solo
un cubo descriptivo; la coincidencia utiliza los valores del selector dentro del ámbito.
La superposición es aditiva: las afirmaciones globales aún se ejecutan, y una afirmación con ámbito puede emitir
su propio hallazgo contra la misma configuración observada.

#### Superposiciones con ámbito

Use `scopes.<scopeName>` cuando un conjunto de agentes o canales necesita una política más estricta
que la línea de base de nivel superior. Las secciones con ámbito de agente usan `agentIds`, que
soporta `tools.*`, `agents.workspace.*` y `sandbox.*`. El ingreso con ámbito de canal
usa `channelIds`, que soporta `ingress.channels.*`. Las secciones no soportadas
se rechazan en lugar de ser ignoradas. Si una entrada `agentIds` no está
presente en `agents.list[]`, OpenClaw evalúa la regla con ámbito contra la postura
global/predeterminada heredada para ese id de agente en tiempo de ejecución.

```jsonc
{
  "tools": {
    "exec": {
      "allowHosts": ["sandbox", "node"],
    },
  },
  "sandbox": {
    "requireMode": ["all", "non-main"],
  },
  "scopes": {
    "release-workspace": {
      "agentIds": ["release-agent", "review-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
    },
    "release-lockdown": {
      "agentIds": ["release-agent"],
      "tools": {
        "exec": {
          "allowHosts": ["sandbox"],
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
        },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
      "sandbox": {
        "requireMode": ["all"],
        "allowBackends": ["docker"],
      },
    },
    "shell-sandbox": {
      "agentIds": ["shell-agent"],
      "sandbox": {
        "allowBackends": ["openshell"],
        "containers": {
          "requireReadOnlyMounts": false,
        },
      },
    },
    "telegram-ingress": {
      "channelIds": ["telegram"],
      "ingress": {
        "channels": {
          "allowDmPolicies": ["pairing"],
          "denyOpenGroups": true,
          "requireMentionInGroups": true,
        },
      },
    },
  },
}
```

El mismo agente puede aparecer en múltiples ámbitos cuando cada ámbito gobierna diferentes
campos, como se muestra arriba. Un campo con ámbito repetido para el mismo agente debe ser
igualmente o más restrictivo según los metadatos de la política; las afirmaciones duplicadas más
débiles son rechazadas. Los metadatos de estrictitud tratan las listas de permitidos como subconjuntos,
las listas de bloqueados como superconjuntos y los booleanos requeridos como requisitos fijos.

La política de postura de contenedor se evalúa solo contra la evidencia que OpenClaw puede
observar para el agente coincidente. Si una regla `sandbox.containers.*` habilitada se aplica
a un agente cuyo backend de sandbox no puede exponer ese campo, la política informa
`policy/sandbox-container-posture-unobservable` en lugar de tratar la afirmación como
aprobada. Use ámbitos `agentIds` separados para grupos de agentes que usan diferentes
backends de sandbox, y deje las reglas de contenedor no soportadas sin establecer o en falso para los
grupos donde esos campos no pueden ser observados.

El `ingress.session.requireDmScope` de nivel superior sigue siendo global porque
`session.dmScope` no es una evidencia atribuible al canal.

| Selector     | Secciones compatibles                   | Usar cuando                                                              |
| ------------ | --------------------------------------- | ------------------------------------------------------------------------ |
| `agentIds`   | `tools`, `agents.workspace` y `sandbox` | Uno o más agentes de tiempo de ejecución necesitan reglas más estrictas. |
| `channelIds` | `ingress.channels`                      | Uno o más canales necesitan reglas de entrada más estrictas.             |

Cada ámbito presente en `policy.jsonc` debe ser válido y exigible.

#### Canales

| Campo de política                    | Estado observado                                            | Usar cuando                                                       |
| ------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `channels.denyRules[].when.provider` | Proveedor y estado habilitado de `channels.*`               | Denegar los canales configurados de un proveedor como `telegram`. |
| `channels.denyRules[].reason`        | Contexto del mensaje de hallazgo y sugerencia de reparación | Explique por qué se deniega el proveedor.                         |

#### Servidores MCP

| Campo de política   | Estado observado       | Usar cuando                                                                 |
| ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `mcp.servers.allow` | Ids de `mcp.servers.*` | Requerir que cada servidor MCP configurado esté en una lista de permitidos. |
| `mcp.servers.deny`  | Ids de `mcp.servers.*` | Denegar ids específicos de servidores MCP configurados.                     |

#### Proveedores de modelos

| Campo de política        | Estado observado                                                   | Usar cuando                                                                                                          |
| ------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `models.providers.allow` | Ids de `models.providers.*` y referencias de modelos seleccionados | Requerir que los proveedores configurados y las referencias de modelos seleccionados utilicen proveedores aprobados. |
| `models.providers.deny`  | Ids de `models.providers.*` y referencias de modelos seleccionados | Denegar proveedores configurados y referencias de modelos seleccionados por id de proveedor.                         |

#### Red

| Campo de política              | Estado observado               | Usar cuando                                                                                    |
| ------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `network.privateNetwork.allow` | Escapes de SSRF de red privada | Establézcalo en `false` para requerir que el acceso a la red privada permanezca deshabilitado. |

#### Acceso de entrada y de canal

| Campo de política                         | Estado observado                                                                | Usar cuando                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ingress.session.requireDmScope`          | `session.dmScope`                                                               | Requerir un ámbito de aislamiento de mensajes directos revisado.                                   |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` y campos de política de DM de canal heredados             | Permitir solo políticas de canal de mensajes directos revisadas.                                   |
| `ingress.channels.denyOpenGroups`         | Política de entrada de canal, cuenta y grupo                                    | Denegar la entrada de grupos abiertos para los canales y cuentas configurados.                     |
| `ingress.channels.requireMentionInGroups` | Configuración de compuerta de mención de canal, cuenta, grupo, gremio y anidada | Requerir compuertas de mención cuando la entrada del grupo está abierta o restringida por mención. |

#### Gateway

| Campo de política                       | Estado observado                                                                                               | Usar cuando                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                                                                                 | Establézcalo en `false` para requerir el enlace de loopback del Gateway.                                             |
| `gateway.exposure.allowTailscaleFunnel` | Postura del Gateway de servicio/embudo de Tailscale                                                            | Establézcalo en `false` para denegar la exposición de Tailscale Funnel.                                              |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                                                                                            | Establézcalo en `true` para rechazar la autenticación deshabilitada del Gateway.                                     |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                                                                                       | Establézcalo en `true` para requerir una configuración explícita de límite de velocidad de autenticación.            |
| `gateway.controlUi.allowInsecure`       | Controlar los interruptores de autenticación/dispositivo/origen inseguros de la interfaz de usuario de control | Establézcalo en `false` para denegar los interruptores de exposición inseguros de la interfaz de usuario de control. |
| `gateway.remote.allow`                  | Modo/Configuración del Gateway remoto                                                                          | Establézcalo en `false` para denegar el modo de Gateway remoto.                                                      |
| `gateway.http.denyEndpoints`            | Puntos finales de la API HTTP del Gateway                                                                      | Denegar identificadores de punto final como `chatCompletions` o `responses`.                                         |
| `gateway.http.requireUrlAllowlists`     | Entradas de obtención de URL HTTP del Gateway                                                                  | Establézcalo en `true` para requerir listas de permitidos de URL en las entradas de obtención de URL.                |

#### Espacio de trabajo del agente

| Campo de política                | Estado observado                                                                    | Usar cuando                                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` y `agents.list[].sandbox.workspaceAccess` | Permitir solo valores de acceso al espacio de trabajo del espacio aislado como `none` o `ro`.                                                               |
| `agents.workspace.denyTools`     | Configuración de denegación de herramientas global y por agente                     | Requerir que las herramientas de mutación de espacio de trabajo/tiempo de ejecución como `exec`, `process`, `write`, `edit` o `apply_patch` sean denegadas. |

#### Postura del espacio aislado

| Campo de política                                     | Estado observado                                                             | Usar cuando                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` y el modo por agente                          | Permitir solo modos de espacio aislado revisados, como `all` o `non-main`. |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` y el backend por agente                    | Permitir solo backends de espacio aislado revisados, como `docker`.        |
| `sandbox.containers.denyHostNetwork`                  | Modo de red del espacio aislado/navegador respaldado por contenedor          | Denegar el modo de red del host.                                           |
| `sandbox.containers.denyContainerNamespaceJoin`       | Modo de red del espacio aislado/navegador respaldado por contenedor          | Denegar la unión a otro espacio de nombres de red de contenedor.           |
| `sandbox.containers.requireReadOnlyMounts`            | Modo de montaje del espacio aislado/navegador respaldado por contenedor      | Requerir que los montajes sean de solo lectura.                            |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | Objetivos de montaje del espacio aislado/navegador respaldado por contenedor | Denegar montajes de socket de tiempo de ejecución de contenedor.           |
| `sandbox.containers.denyUnconfinedProfiles`           | Postura del perfil de seguridad del contenedor                               | Denegar perfiles de seguridad de contenedor sin restricciones.             |
| `sandbox.browser.requireCdpSourceRange`               | Rango de origen CDP del navegador de espacio aislado                         | Requerir que la exposición CDP del navegador declare un rango de origen.   |

La política trata `sandbox.mode` faltante como el valor predeterminado implícito `off`, por lo que
`sandbox.requireMode` informa un espacio aislado nuevo o no configurado como fuera de una
lista de permitidos como `["all"]`.

#### Secretos

| Campo de política                 | Estado observado                                                      | Usar cuando                                                                             |
| --------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | Declaraciones de SecretRefs de configuración y `secrets.providers.*`  | Establecer en `true` para requerir que los SecretRefs apunten a proveedores declarados. |
| `secrets.denySources`             | Fuentes de proveedores de secretos y fuentes de SecretRef             | Denegar fuentes como `exec`, `file` u otro nombre de fuente configurado.                |
| `secrets.allowInsecureProviders`  | Marcadores de posición de postura de proveedor de secretos no seguros | Establecer en `false` para rechazar proveedores que opten por una postura no segura.    |

#### Perfiles de autenticación

| Campo de política               | Estado observado                                    | Usar cuando                                                                                              |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | Metadatos del proveedor y el modo `auth.profiles.*` | Requerir claves de metadatos como `provider` y `mode` en los perfiles de autenticación de configuración. |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                              | Permitir solo modos de perfil de autenticación admitidos, como `api_key`, `aws-sdk`, `oauth` o `token`.  |

#### Metadatos de la herramienta

| Campo de política       | Estado observado                    | Usar cuando                                                                                                 |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `tools.requireMetadata` | Declaraciones `TOOLS.md` gobernadas | Requerir que las herramientas gobernadas declaren claves de metadatos como `risk`, `sensitivity` o `owner`. |

#### Postura de la herramienta

| Campo de política               | Estado observado                                                 | Usar cuando                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` y `agents.list[].tools.profile`                  | Permitir solo ids de perfil de herramienta tales como `minimal`, `messaging` o `coding`.                                                              |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` y anulaciones `tools.fs` por agente     | Establecer en `true` para requerir una postura de herramienta de sistema de archivos solo para el área de trabajo.                                    |
| `tools.exec.allowSecurity`      | `tools.exec.security` y seguridad de ejecución por agente        | Permitir solo modos de seguridad de ejecución tales como `deny` o `allowlist`.                                                                        |
| `tools.exec.requireAsk`         | `tools.exec.ask` y modo de solicitud de ejecución por agente     | Requerir una postura de aprobación tal como `always`.                                                                                                 |
| `tools.exec.allowHosts`         | `tools.exec.host` y enrutamiento de host de ejecución por agente | Permitir solo modos de enrutamiento de host de ejecución tales como `sandbox`.                                                                        |
| `tools.elevated.allow`          | `tools.elevated.enabled` y postura elevada por agente            | Establecer en `false` para requerir que el modo de herramienta elevada permanezca deshabilitado.                                                      |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` y `tools.alsoAllow` por agente                 | Requerir entradas `alsoAllow` exactas e informar sobre otorgamientos de herramientas aditivos faltantes o inesperados.                                |
| `tools.denyTools`               | `tools.deny` y `agents.list[].tools.deny`                        | Exigir que las listas de denegación de herramientas configuradas incluyan identificadores de herramientas o grupos como `group:runtime` y `group:fs`. |

Ejecutar comprobaciones solo de políticas durante la autoría:

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` ejecuta solo el conjunto de comprobaciones de políticas y emite evidencias, hallazgos y hashes de atestación. Los mismos hallazgos también aparecen en `openclaw doctor --lint` cuando el complemento Policy está habilitado.

Comparar un archivo de políticas de operador con un archivo de políticas de base línea autorizado:

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` compara la sintaxis del archivo de políticas con la sintaxis del archivo de políticas. No inspecciona el estado de tiempo de ejecución de OpenClaw, evidencias, credenciales ni secretos. El comando utiliza los mismos metadatos de reglas de políticas que rigen las superposiciones con ámbito: las listas de permitidos deben mantenerse iguales o más estrechas, las listas de denegados deben mantenerse iguales o más amplias, los valores booleanos requeridos deben mantener su valor requerido, las cadenas ordenadas deben moverse solo hacia el extremo más restrictivo del orden configurado y las listas exactas deben coincidir.

El archivo de base línea puede ser una política autorizada por la organización. La política verificada puede utilizar valores más estrictos o agregar reglas de políticas adicionales. Una regla verificada de nivel superior también puede satisfacer una regla de base línea con ámbito cuando es igual o más restrictiva porque la política de nivel superior se aplica ampliamente. Los nombres de ámbito no necesitan coincidir; la comparación con ámbito se clavea por el valor del selector como `agentIds` o `channelIds` y por el campo de política que se está verificando.

Ejemplo de salida JSON limpia de comparación: informa solo el estado de comparación del archivo de políticas:

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

Ejemplo de salida limpia `policy check --json` incluye hashes estables que pueden ser registrados por un operador o supervisor:

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

La configuración de la política se encuentra bajo `plugins.entries.policy.config`.

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

| Configuración             | Propósito                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `enabled`                 | Habilitar comprobaciones de políticas incluso antes de que exista `policy.jsonc`.                     |
| `workspaceRepairs`        | Permitir que `doctor --fix` edite la configuración del espacio de trabajo administrada por políticas. |
| `expectedHash`            | Bloqueo de hash opcional para el artefacto de política aprobado.                                      |
| `expectedAttestationHash` | Bloqueo de hash opcional para la última comprobación de política limpia aceptada.                     |
| `path`                    | Ubicación relativa al espacio de trabajo del artefacto de política.                                   |

Establezca `plugins.entries.policy.config.enabled` en `false` para desactivar las comprobaciones de políticas
para un espacio de trabajo mientras se deja el complemento instalado.

Los requisitos de metadatos de las herramientas se redactan en `policy.jsonc` con
`tools.requireMetadata`, por ejemplo `["risk", "sensitivity", "owner"]`.

## Aceptar el estado de la política

Salida JSON de ejemplo:

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

El hash de política identifica el artefacto de regla redactado. El bloque de evidencia
registra el estado observado de OpenClaw utilizado por las comprobaciones de política. El
valor de `workspace.hash` identifica esa carga de evidencia para el ámbito comprobado.
El hash de hallazgos identifica el conjunto exacto de hallazgos devuelto por la comprobación.
`checkedAt` registra cuándo se ejecutó la evaluación. El hash de atestación identifica
la afirmación estable: hash de política, hash de evidencia, hash de hallazgos y si el
resultado fue limpio. Intencionalmente no incluye `checkedAt`, por lo que el mismo
estado de política produce la misma atestación en comprobaciones repetidas. Juntas,
estas forman la tupla de auditoría para esta comprobación de política.

Si una puerta de enlace o supervisor posterior utiliza la política para bloquear, aprobar o anotar una
acción de tiempo de ejecución, debe registrar el hash de atestación de la última comprobación de política
limpia. `checkedAt` permanece en la salida JSON para los registros de auditoría, pero no forma parte del
hash de atestación estable.

Use este ciclo de vida al aceptar el estado de la política:

1. Redacte o revise `policy.jsonc`.
2. Ejecute `openclaw policy check --json`.
3. Si el resultado está limpio, registre `attestation.policy.hash` como `expectedHash`.
4. Registre `attestation.attestationHash` como `expectedAttestationHash`.
5. Vuelva a ejecutar `openclaw doctor --lint` en CI o puertas de lanzamiento.

Si las reglas de política cambian intencionalmente, actualice ambos hashes aceptados desde una
comprobación limpia. Si la configuración del espacio de trabajo cambia intencionalmente pero la política permanece igual,
solo `expectedAttestationHash` suele cambiar.

Habilitar o actualizar las reglas `agents.workspace` añade evidencia de `agentWorkspace` al
hash del espacio de trabajo y al hash de atestación. Los operadores deben revisar la nueva
evidencia y actualizar los hashes de atestación aceptados después de habilitar estas reglas.
Habilitar o actualizar las reglas de postura de herramientas añade evidencia de `toolPosture` de la
misma manera.

`openclaw policy watch` ejecuta la misma verificación repetidamente e informa cuando la
evidencia actual ya no coincide con `expectedAttestationHash`:

```bash
openclaw policy watch --json
```

Use `--once` en CI o scripts que solo necesitan una evaluación de deriva. Sin
`--once`, el comando sondea cada dos segundos por defecto; use `--interval-ms` para
elegir un intervalo diferente.

## Hallazgos

La política verifica actualmente:

| ID de verificación                                | Hallazgo                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                     | La política está habilitada pero falta `policy.jsonc`.                                                                       |
| `policy/policy-jsonc-invalid`                     | No se puede analizar la política o contiene entradas de reglas malformadas.                                                  |
| `policy/policy-hash-mismatch`                     | La política no coincide con `expectedHash` configurado.                                                                      |
| `policy/attestation-hash-mismatch`                | La evidencia de la política actual ya no coincide con la atestación aceptada.                                                |
| `policy/policy-conformance-invalid`               | Un archivo de política de referencia o verificado tiene una sintaxis de comparación no válida.                               |
| `policy/policy-conformance-missing`               | Falta una regla requerida por el archivo de política de referencia en el archivo de política verificado.                     |
| `policy/policy-conformance-weaker`                | Un archivo de política verificado tiene un valor más débil que el archivo de política de referencia.                         |
| `policy/channels-denied-provider`                 | Un canal habilitado coincide con una regla de denegación de canal.                                                           |
| `policy/mcp-denied-server`                        | Un servidor MCP configurado está denegado por la política.                                                                   |
| `policy/mcp-unapproved-server`                    | Un servidor MCP configurado está fuera de la lista de permitidos.                                                            |
| `policy/models-denied-provider`                   | Un proveedor de modelos o referencia de modelo configurado usa un proveedor denegado.                                        |
| `policy/models-unapproved-provider`               | Un proveedor de modelos o referencia de modelo configurado está fuera de la lista de permitidos.                             |
| `policy/network-private-access-enabled`           | Una puerta de escape SSRF de red privada está habilitada cuando la política lo deniega.                                      |
| `policy/ingress-dm-policy-unapproved`             | Una política de DM de canal está fuera de la lista de permitidos de la política.                                             |
| `policy/ingress-dm-scope-unapproved`              | `session.dmScope` no coincide con el ámbito de aislamiento de DM requerido por la política.                                  |
| `policy/ingress-open-groups-denied`               | Una política de grupo de canales es `open` mientras que la política deniega el ingreso de grupos abiertos.                   |
| `policy/ingress-group-mention-required`           | Una entrada de canal o grupo desactiva los controles de mención mientras que la política los requiere.                       |
| `policy/gateway-non-loopback-bind`                | La postura de enlace de Gateway permite la exposición que no sea de bucle local cuando la política lo deniega.               |
| `policy/gateway-auth-disabled`                    | La autenticación de Gateway está desactivada cuando la política requiere autenticación.                                      |
| `policy/gateway-rate-limit-missing`               | La postura de límite de tasa de autenticación de Gateway no es explícita cuando la política lo requiere.                     |
| `policy/gateway-control-ui-insecure`              | Los interruptores de exposición insegura de la interfaz de usuario de control de Gateway están activados.                    |
| `policy/gateway-tailscale-funnel`                 | La exposición de Tailscale Funnel de Gateway está activada cuando la política la deniega.                                    |
| `policy/gateway-remote-enabled`                   | El modo remoto de Gateway está activo cuando la política lo deniega.                                                         |
| `policy/gateway-http-endpoint-enabled`            | Un punto final de la API HTTP de Gateway está activo mientras la política lo deniega.                                        |
| `policy/gateway-http-url-fetch-unrestricted`      | La entrada de obtención de URL HTTP de Gateway carece de una lista de permitidos de URL requerida.                           |
| `policy/agents-workspace-access-denied`           | El modo de espacio aislado del agente o el acceso al espacio de trabajo está fuera de la lista de permitidos de la política. |
| `policy/agents-tool-not-denied`                   | Un agente o configuración predeterminada no deniega una herramienta requerida por la política.                               |
| `policy/tools-profile-unapproved`                 | Un perfil de herramienta global o por agente configurado está fuera de la lista de permitidos.                               |
| `policy/tools-fs-workspace-only-required`         | Las herramientas del sistema de archivos no están configuradas con una postura de ruta solo para el espacio de trabajo.      |
| `policy/tools-exec-security-unapproved`           | El modo de seguridad de Exec está fuera de la lista de permitidos de la política.                                            |
| `policy/tools-exec-ask-unapproved`                | El modo de pregunta de Exec está fuera de la lista de permitidos de la política.                                             |
| `policy/tools-exec-host-unapproved`               | El enrutamiento de host de Exec está fuera de la lista de permitidos de la política.                                         |
| `policy/tools-elevated-enabled`                   | El modo de herramienta elevada está activado cuando la política lo deniega.                                                  |
| `policy/tools-also-allow-missing`                 | Falta una entrada requerida por la política en una lista configurada de `alsoAllow`.                                         |
| `policy/tools-also-allow-unexpected`              | Una lista configurada de `alsoAllow` incluye una entrada no esperada por la política.                                        |
| `policy/tools-required-deny-missing`              | Una lista de denegación de herramientas global o por agente no incluye una herramienta denegada requerida.                   |
| `policy/sandbox-mode-unapproved`                  | El modo de espacio aislado está fuera de la lista de permitidos de la política.                                              |
| `policy/sandbox-backend-unapproved`               | El backend de espacio aislado está fuera de la lista de permitidos de la política.                                           |
| `policy/sandbox-container-posture-unobservable`   | Una regla de postura de contenedor está habilitada para un backend que no puede observarla.                                  |
| `policy/sandbox-container-host-network-denied`    | Un espacio aislado o navegador respaldado por contenedor utiliza el modo de red del host.                                    |
| `policy/sandbox-container-namespace-join-denied`  | Un espacio aislado o navegador respaldado por contenedor se une a otro espacio de nombres de contenedor.                     |
| `policy/sandbox-container-mount-mode-required`    | Un montaje de espacio aislado o navegador respaldado por contenedor no es de solo lectura.                                   |
| `policy/sandbox-container-runtime-socket-mount`   | Un montaje de espacio aislado o navegador respaldado por contenedor expone el socket de tiempo de ejecución del contenedor.  |
| `policy/sandbox-container-unconfined-profile`     | El perfil de espacio aislado del contenedor no está confinado cuando la política lo deniega.                                 |
| `policy/sandbox-browser-cdp-source-range-missing` | Falta el rango de origen CDP del navegador de espacio aislado cuando la política requiere uno.                               |
| `policy/secrets-unmanaged-provider`               | Un SecretRef de configuración hace referencia a un proveedor no declarado en `secrets.providers`.                            |
| `policy/secrets-denied-provider-source`           | Un proveedor de secretos de configuración o SecretRef utiliza un origen denegado por la política.                            |
| `policy/secrets-insecure-provider`                | Un proveedor de secretos opta por una postura insegura cuando la política lo deniega.                                        |
| `policy/auth-profile-invalid-metadata`            | Faltan metadatos válidos de proveedor o modo en un perfil de autenticación de configuración.                                 |
| `policy/auth-profile-unapproved-mode`             | Un modo de perfil de autenticación de configuración está fuera de la lista de permitidos de la política.                     |
| `policy/tools-missing-risk-level`                 | Faltan metadatos de riesgo en una declaración de herramienta gobernada.                                                      |
| `policy/tools-unknown-risk-level`                 | Una declaración de herramienta gobernada utiliza un valor de riesgo desconocido.                                             |
| `policy/tools-missing-sensitivity-token`          | Faltan metadatos de sensibilidad en una declaración de herramienta gobernada.                                                |
| `policy/tools-missing-owner`                      | Faltan metadatos de propietario en una declaración de herramienta gobernada.                                                 |
| `policy/tools-unknown-sensitivity-token`          | Una declaración de herramienta gobernada utiliza un valor de sensibilidad desconocido.                                       |

Los hallazgos de la política pueden incluir tanto `target` como `requirement`. `target` es el
elemento del espacio de trabajo observado que no se ajusta. `requirement` es la regla
de política creada que lo convirtió en un hallazgo. Ambos valores son direcciones hoy, por lo general
rutas `oc://`, pero los nombres de los campos describen su función en la política más que el
formato de la dirección.

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

Ejemplo de hallazgo de proveedor de modelos:

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

Ejemplo de hallazgo del espacio de trabajo del agente:

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

`doctor --fix` solo edita la configuración del espacio de trabajo gestionada por la política cuando
`workspaceRepairs` está explícitamente habilitado. Sin esa opción, las comprobaciones de política
informan sobre lo que repararían y dejan la configuración sin cambios.

En esta versión, la reparación puede deshabilitar los canales que están habilitados en la configuración de OpenClaw
pero denegados por `channels.denyRules`. Habilite `workspaceRepairs` solo después de que
el archivo de política haya sido revisado, ya que una regla de denegación válida puede desactivar un
canal configurado:

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

| Comando          | `0`                                                                 | `1`                                                                                        | `2`                                          |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `policy check`   | No hay hallazgos en el umbral.                                      | Se cumplió uno o más hallazgos en el umbral.                                               | Fallo de argumento o de tiempo de ejecución. |
| `policy compare` | El archivo de política es al menos tan estricto como la línea base. | El archivo de política no es válido, falta o es más débil que las reglas de la línea base. | Fallo de argumento o de tiempo de ejecución. |
| `policy watch`   | Sin hallazgos y el hash aceptado está actualizado.                  | Existen hallazgos o la atestación aceptada está obsoleta.                                  | Fallo de argumento o de tiempo de ejecución. |

## Relacionado

- [Modo Doctor lint](/es/cli/doctor#lint-mode)
- [CLI de Path](/es/cli/path)
