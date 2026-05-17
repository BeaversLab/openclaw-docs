---
summary: "Utilice OpenShell como un backend de sandbox administrado para agentes de OpenClaw"
title: OpenShell
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

OpenShell es un backend de sandbox administrado para OpenClaw. En lugar de ejecutar contenedores Docker localmente, OpenClaw delega el ciclo de vida del sandbox a la CLI de `openshell`, la cual aprovisiona entornos remotos con ejecución de comandos basada en SSH.

El complemento OpenShell reutiliza el mismo transporte SSH central y puente de sistema de archivos remoto que el [backend SSH genérico](/es/gateway/sandboxing#ssh-backend). Añade un ciclo de vida específico de OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`)
y un modo de espacio de trabajo `mirror` opcional.

## Requisitos previos

- Complemento OpenShell instalado (`openclaw plugins install @openclaw/openshell-sandbox`)
- La CLI de `openshell` instalada y en `PATH` (o establezca una ruta personalizada a través de
  `plugins.entries.openshell.config.command`)
- Una cuenta de OpenShell con acceso a sandbox
- OpenClaw Gateway ejecutándose en el host

## Inicio rápido

1. Instale y habilite el complemento, luego configure el backend del sandbox:

```bash
openclaw plugins install @openclaw/openshell-sandbox
```

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

2. Reinicie el Gateway. En el siguiente turno del agente, OpenClaw crea un sandbox de OpenShell y enruta la ejecución de herramientas a través de él.

3. Verificar:

```bash
openclaw sandbox list
openclaw sandbox explain
```

## Modos de espacio de trabajo

Esta es la decisión más importante al usar OpenShell.

### `mirror`

Use `plugins.entries.openshell.config.mode: "mirror"` cuando desee que el **espacio de trabajo local se mantenga canónico**.

Comportamiento:

- Antes de `exec`, OpenClaw sincroniza el espacio de trabajo local dentro del sandbox de OpenShell.
- Después de `exec`, OpenClaw sincroniza el espacio de trabajo remoto de vuelta al espacio de trabajo local.
- Las herramientas de archivos aún operan a través del puente del sandbox, pero el espacio de trabajo local sigue siendo la fuente de verdad entre turnos.

Mejor para:

- Edita archivos localmente fuera de OpenClaw y desea que esos cambios sean visibles en el sandbox automáticamente.
- Quiere que el sandbox de OpenShell se comporte lo más posible como el backend de Docker.
- Quiere que el espacio de trabajo del host refleje las escrituras del sandbox después de cada turno de ejecución.

Compromiso: costo de sincronización adicional antes y después de cada ejecución.

### `remote`

Use `plugins.entries.openshell.config.mode: "remote"` cuando desee que el
**espacio de trabajo de OpenShell se vuelva canónico**.

Comportamiento:

- Cuando se crea el sandbox por primera vez, OpenClaw inicializa el espacio de trabajo remoto
  desde el espacio de local una vez.
- Después de eso, `exec`, `read`, `write`, `edit` y `apply_patch` operan
  directamente contra el espacio de trabajo remoto de OpenShell.
- OpenClaw **no** sincroniza los cambios remotos de vuelta al espacio de trabajo local.
- Las lecturas de medios en el momento del prompt aún funcionan porque las herramientas de archivos y medios leen a través
  del puente del sandbox.

Mejor para:

- El sandbox debe vivir principalmente en el lado remoto.
- Deseas una sobrecarga de sincronización por turno menor.
- No quieres que las ediciones locales en el host sobrescriban silenciosamente el estado del sandbox remoto.

<Warning>Si editas archivos en el host fuera de OpenClaw después de la inicialización inicial, el sandbox remoto **no** verá esos cambios. Usa `openclaw sandbox recreate` para reinicializar.</Warning>

### Elegir un modo

|                                  | `mirror`                        | `remote`                             |
| -------------------------------- | ------------------------------- | ------------------------------------ |
| **Espacio de trabajo canónico**  | Host local                      | OpenShell remoto                     |
| **Dirección de sincronización**  | Bidireccional (cada ejecución)  | Inicialización única                 |
| **Sobrecarga por turno**         | Mayor (subida + descarga)       | Menor (operaciones remotas directas) |
| **¿Ediciones locales visibles?** | Sí, en la siguiente ejecución   | No, hasta recrear                    |
| **Mejor para**                   | Flujos de trabajo de desarrollo | Agentes de larga ejecución, CI       |

## Referencia de configuración

Toda la configuración de OpenShell vive bajo `plugins.entries.openshell.config`:

| Clave                     | Tipo                    | Predeterminado | Descripción                                                                     |
| ------------------------- | ----------------------- | -------------- | ------------------------------------------------------------------------------- |
| `mode`                    | `"mirror"` o `"remote"` | `"mirror"`     | Modo de sincronización del espacio de trabajo                                   |
| `command`                 | `string`                | `"openshell"`  | Ruta o nombre de la CLI de `openshell`                                          |
| `from`                    | `string`                | `"openclaw"`   | Fuente del sandbox para creación por primera vez                                |
| `gateway`                 | `string`                | —              | Nombre del gateway de OpenShell (`--gateway`)                                   |
| `gatewayEndpoint`         | `string`                | —              | URL del endpoint del gateway de OpenShell (`--gateway-endpoint`)                |
| `policy`                  | `string`                | —              | ID de política de OpenShell para la creación del entorno aislado                |
| `providers`               | `string[]`              | `[]`           | Nombres de proveedores para adjuntar cuando se crea el entorno aislado          |
| `gpu`                     | `boolean`               | `false`        | Solicitar recursos de GPU                                                       |
| `autoProviders`           | `boolean`               | `true`         | Pasar `--auto-providers` durante la creación del entorno aislado                |
| `remoteWorkspaceDir`      | `string`                | `"/sandbox"`   | Espacio de trabajo escribible principal dentro del entorno aislado              |
| `remoteAgentWorkspaceDir` | `string`                | `"/agent"`     | Ruta de montaje del espacio de trabajo del agente (para acceso de solo lectura) |
| `timeoutSeconds`          | `number`                | `120`          | Tiempo de espera para las operaciones de la CLI de `openshell`                  |

La configuración a nivel de entorno aislado (`mode`, `scope`, `workspaceAccess`) se configura en
`agents.defaults.sandbox` como con cualquier backend. Consulte
[Sandboxing](/es/gateway/sandboxing) para ver la matriz completa.

## Ejemplos

### Configuración remota mínima

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

### Modo espejo con GPU

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "agent",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "mirror",
          gpu: true,
          providers: ["openai"],
          timeoutSeconds: 180,
        },
      },
    },
  },
}
```

### OpenShell por agente con puerta de enlace personalizada

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    list: [
      {
        id: "researcher",
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    ],
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
          gateway: "lab",
          gatewayEndpoint: "https://lab.example",
          policy: "strict",
        },
      },
    },
  },
}
```

## Gestión del ciclo de vida

Los entornos aislados de OpenShell se gestionan a través de la CLI de sandbox normal:

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

Para el modo `remote`, **recrear es especialmente importante**: elimina el espacio de trabajo remoto canónico
para ese ámbito. El siguiente uso inicializa un espacio de trabajo remoto nuevo desde
el espacio de trabajo local.

Para el modo `mirror`, recrear restablece principalmente el entorno de ejecución remoto porque
el espacio de trabajo local sigue siendo canónico.

### Cuándo recrear

Recrear después de cambiar cualquiera de estos:

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## Endurecimiento de seguridad

OpenShell fija el fd raíz del espacio de trabajo y vuelve a verificar la identidad del entorno aislado antes de cada
lectura, por lo que los intercambios de enlaces simbólicos o un espacio de trabajo remontado no pueden redirigir las lecturas fuera
del espacio de trabajo remoto previsto.

## Limitaciones actuales

- El navegador de sandbox no es compatible con el backend OpenShell.
- `sandbox.docker.binds` no se aplica a OpenShell.
- Los controles de tiempo de ejecución específicos de Docker bajo `sandbox.docker.*` se aplican solo al backend de Docker.

## Cómo funciona

1. OpenClaw llama a `openshell sandbox create` (con las opciones `--from`, `--gateway`,
   `--policy`, `--providers`, `--gpu` según lo configurado).
2. OpenClaw llama a `openshell sandbox ssh-config <name>` para obtener los detalles de la conexión
   SSH para el sandbox.
3. Core escribe la configuración de SSH en un archivo temporal y abre una sesión SSH utilizando el
   mismo puente de sistema de archivos remoto que el backend SSH genérico.
4. En modo `mirror`: sincronizar de local a remoto antes de la ejecución, ejecutar, sincronizar de vuelta después de la ejecución.
5. En modo `remote`: inicializar una vez al crear, luego operar directamente en el espacio de trabajo
   remoto.

## Relacionado

- [Sandboxing](/es/gateway/sandboxing) -- modos, alcances y comparación de backends
- [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) -- depuración de herramientas bloqueadas
- [Multi-Agent Sandbox and Tools](/es/tools/multi-agent-sandbox-tools) -- anulaciones por agente
- [Sandbox CLI](/es/cli/sandbox) -- comandos de `openclaw sandbox`
