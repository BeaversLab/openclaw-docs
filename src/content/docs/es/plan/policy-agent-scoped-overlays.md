---
summary: "Superposiciones del complemento de política por agente superpuestas a las reglas de política global."
read_when:
  - You are designing per-agent policy requirements
  - You need to distinguish tool posture policy from workspace policy
  - You are configuring stricter policy for one named agent
title: "Superposiciones de políticas con ámbito de agente"
---

# Superposiciones de políticas con ámbito de agente

La política de OpenClaw admite requisitos globales y requisitos más estrictos para
los IDs de los agentes en tiempo de ejecución explícitos. Algunas implementaciones necesitan que un agente utilice una configuración de área de trabajo y de herramienta más estricta que otros agentes, pero las reglas de toda la implementación no deben obligar a cada agente a utilizar la misma configuración.

Esta página describe el modelo de superposición con ámbito de agente. La referencia de campos sigue siendo
[`openclaw policy`](/es/cli/policy).

## Objetivos de diseño

- Mantener la política global como línea base de la implementación.
- Permitir que un agente con nombre añada requisitos más estrictos sin debilitar las reglas globales.
- Reutilizar las formas de sección de política existentes donde la evidencia se pueda atribuir a
  un agente.
- Evitar que `agents.workspace` se convierta en un segundo sistema de permisos de herramientas.
- Mantener las comprobaciones solo globales como globales hasta que su evidencia se pueda asignar a un
  agente.

## Forma

Use `scopes.<scopeName>` para ámbitos de política de agente con nombre específico. Cada
ámbito enumera los IDs de `agentIds` en tiempo de ejecución a los que se aplica, y luego reutiliza la gramática
de sección de política normal de nivel superior donde la evidencia de la sección se pueda atribuir a
esos agentes. Las secciones con ámbito enviadas inicialmente son `tools` y
`agents.workspace`; sandbox y ingress se mantienen fuera de esta PR y pueden unirse al
mismo contenedor una vez que esas PR de política se integren y su evidencia incluya la identidad del
agente. El inventario de campos con ámbito está respaldado por metadatos de reglas de política que
registran la semántica de rigor de cada campo para la conformidad posterior del archivo de política.

```jsonc
{
  "tools": {
    "denyTools": ["process"],
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
    },
  },
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
      "tools": {
        "profiles": { "allow": ["minimal", "messaging"] },
        "fs": { "requireWorkspaceOnly": true },
        "exec": {
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
          "allowHosts": ["sandbox"],
        },
        "elevated": { "allow": false },
        "alsoAllow": { "expected": ["message", "read"] },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

`agents.workspace` sigue siendo la línea base del espacio de trabajo para todos los agentes existente.
`scopes.<scopeName>` es una superposición con ámbito, no un reemplazo de la política
global. El nombre del ámbito es solo descriptivo; la coincidencia utiliza `agentIds`, no
nombres para mostrar. Contiene deliberadamente nombres de sección normales en lugar de
una mini-gramática personalizada por agente.
Todos los ámbitos presentes en `policy.jsonc` deben ser válidos y exigibles. En este
PR, el único selector admitido es `agentIds`, y solo admite `tools.*`
y `agents.workspace.*`.

## Semántica de capas

La evaluación de políticas es aditiva:

1. La política de nivel superior se aplica a todas las evidencias coincidentes.
2. El `agents.workspace` existente se aplica a los valores predeterminados y a cada agente enumerado.
3. `scopes.<scopeName>` se aplica a la evidencia de cada id de
   tiempo de ejecución normalizado en `agentIds`.
4. Varios bloques de ámbito pueden apuntar al mismo agente cuando rigen
   diferentes campos, o cuando un valor posterior para el mismo campo es igual o
   más restrictivo según los metadatos de la política.
5. Una superposición de agente con nombre puede ajustar la política, pero no puede hacer que una
   violación global sea aceptable.

Si tanto las reglas globales como las con ámbito de agente fallan, los hallazgos deben apuntar a la regla
que se violó:

```text
oc://policy.jsonc/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/agents/workspace/allowedAccess
```

Eso mantiene la postura de herramientas amplia, la postura de herramientas de agente con nombre y la postura del espacio de trabajo
auditable como requisitos separados, incluso cuando observan los mismos campos de
configuración.

Las reclamaciones de lista exacta, como `tools.alsoAllow.expected`, comparan la lista configurada
con la lista esperada e informan tanto las entradas esperadas faltantes como las
entradas adicionales inesperadas. Esto está destinado a la postura aditiva, como `alsoAllow`, donde
una entrada adicional puede ampliar un agente más allá de su rol revisado.

## Capas de políticas y configuración

El modelo de superposición separa dónde se redacta la política de dónde se observa la configuración de OpenClaw:

| Ámbito de la política                   | Configuración observada                                                         | Se aplica a                                          | Resultado de ejemplo                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tools.*` de nivel superior             | `tools.*` global y postura de herramientas de agente heredada                   | Todos los agentes que usan la postura coincidente    | Denegar el host de ejecución `gateway` para cada agente a menos que la política global lo permita.                       |
| `tools.*` de nivel superior             | `agents.list[].tools.*` anulaciones                                             | Cualquier agente con una anulación                   | Marcar un agente que anula `tools.exec.host` a un valor no aprobado.                                                     |
| `scopes.<scopeName>.tools.*`            | Entrada `agents.list[]` coincidente y postura heredada                          | Solo ese agente con nombre                           | Permitir que la mayoría de los agentes usen el host de ejecución `node` mientras que un agente debe usar solo `sandbox`. |
| `agents.workspace`                      | Valores predeterminados y postura del espacio de trabajo de cada agente listado | Valores predeterminados y todos los agentes listados | Requerir que el acceso al espacio de trabajo de cada agente sea `none` o `ro`.                                           |
| `scopes.<scopeName>.agents.workspace.*` | Postura del espacio de trabajo `agents.list[]` coincidente                      | Solo ese agente con nombre                           | Requerir que un agente sea de solo lectura sin exigir lo mismo para `main`.                                              |

Las superposiciones por agente son aditivas. Una regla de agente con nombre puede ser más estricta que la
regla de nivel superior, pero no puede hacer que una violación global sea aceptable. Para las reglas de lista de permitidos
(allow-list), el conjunto permitido efectivo es la intersección de la regla global y la
superposición del agente con nombre cuando ambas están presentes.

Por ejemplo, si el `tools.exec.allowHosts` de nivel superior permite `["sandbox", "node"]`
y `scopes.release-agent-lockdown.tools.exec.allowHosts` permite solo
`["sandbox"]`, `release-agent` falla cuando su host de ejecución efectivo es `node`;
otro agente aún puede pasar
con `node`.

## Postura de la herramienta frente a postura del espacio de trabajo

La postura de la herramienta pertenece a `tools` porque describe qué comportamiento de la herramienta una
configuración puede exponer. La política `tools.*` existente observa tanto la configuración `tools.*` global como las anulaciones `agents.list[].tools.*` por agente.

La postura del espacio de trabajo pertenece a `workspace` porque describe el modo de sandbox
y el acceso al espacio de trabajo. La sección del espacio de trabajo no debe convertirse en un espacio de nombres de política de herramienta general.
Si un agente necesita restricciones de herramienta más estrictas para que su
postura del espacio de trabajo sea significativa, coloque esas restricciones en la misma superposición del agente
bajo `scopes.<scopeName>.tools`.

Para un agente de lanzamiento restringido, la división prevista es:

```jsonc
{
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": { "allowedAccess": ["none", "ro"] },
      },
      "tools": {
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

## Elegibilidad de la sección

Una sección con ámbito de agente debe agregarse solo cuando la evidencia de política lleva un id de agente o puede atribuirse a uno sin adivinar.

| Sección     | Estado inicial con ámbito de agente | Razón                                                                                                                  |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `workspace` | Incluir                             | La evidencia del sandbox/espacio de trabajo del agente ya tiene la identidad del agente.                               |
| `tools`     | Incluir                             | La evidencia de postura de la herramienta incluye la configuración de herramientas global y por agente.                |
| `sandbox`   | Seguimiento de la canalización      | Excluir hasta que se integre la PR de postura del sandbox y la evidencia pueda tener ámbito.                           |
| `ingress`   | Seguimiento de la canalización      | Excluir hasta que se integre la postura de ingreso/canal con la atribución del agente.                                 |
| `models`    | Incluir cuando se asigne            | Las referencias de modelo seleccionadas pueden ser específicas del agente.                                             |
| `mcp`       | Incluir cuando se asigne            | Usar solo cuando la evidencia del servidor MCP sea atribuible a un agente.                                             |
| `auth`      | Posponer                            | Los metadatos del perfil de autenticación son un catálogo de configuración a menos que el enlace del agente sea claro. |
| `channels`  | Posponer                            | La postura del proveedor del canal es de nivel de implementación hasta que el enrutamiento tenga ámbito.               |
| `gateway`   | Mantener global                     | La postura de exposición/autenticación/http de la puerta de enlace es de nivel de proceso.                             |
| `network`   | Mantener global                     | La postura de SSRF de red privada es de nivel de tiempo de ejecución.                                                  |
| `secrets`   | Mantener global primero             | La postura del proveedor de secretos es compartida a menos que las referencias se atribuyan al agente.                 |

## Compatibilidad

La implementación es aditiva:

- mantener todos los campos de política de nivel superior existentes válidos;
- mantener la semántica de `agents.workspace` sin cambios;
- validar `scopes` antes de evaluar las reglas con ámbito;
- rechazar claramente las secciones con ámbito no compatibles hasta que su evidencia y contratos de política se implementen;
- no reinterpretar el `tools.requireMetadata` de nivel superior como con ámbito de agente, porque los metadatos de la herramienta describen el catálogo de herramientas del espacio de trabajo declarado;
- incluir evidencia con ámbito de agente en el hash de atestación cuando haya alguna regla con ámbito presente.

Esto permite que la postura amplia de la herramienta siga siendo un contrato de política de nivel superior mientras los agentes con nombre agregan declaraciones observables más estrictas sin debilitar la línea base global.
