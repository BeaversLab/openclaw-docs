---
summary: "Administrar los tiempos de ejecución del espacio aislado e inspeccionar la política efectiva del espacio aislado"
title: CLI de Sandbox
read_when: "Estás administrando los tiempos de ejecución del sandbox o depurando el comportamiento del sandbox/herramientas de política."
status: active
---

Administra los tiempos de ejecución del espacio aislado para la ejecución aislada de agentes.

## Resumen

OpenClaw puede ejecutar agentes en tiempos de ejecución de espacios aislados (sandbox) aislados por seguridad. Los comandos `sandbox` le ayudan a inspeccionar y recrear esos tiempos de ejecución después de actualizaciones o cambios de configuración.

Hoy eso generalmente significa:

- Contenedores de espacio aislado de Docker
- Tiempos de ejecución de espacio aislado SSH cuando `agents.defaults.sandbox.backend = "ssh"`
- Tiempos de ejecución de espacio aislado OpenShell cuando `agents.defaults.sandbox.backend = "openshell"`

Para `ssh` y OpenShell `remote`, recrear es más importante que con Docker:

- el espacio de trabajo remoto es canónico después de la inicialización inicial
- `openclaw sandbox recreate` elimina ese espacio de trabajo remoto canónico para el alcance seleccionado
- el siguiente uso lo inicializa de nuevo desde el espacio de trabajo local actual

## Comandos

### `openclaw sandbox explain`

Inspecciona el modo/alcance/acceso al espacio de trabajo del espacio aislado **efectivo**, la política de herramientas del espacio aislado y las puertas elevadas (con rutas de clave de configuración de solución).

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

Enumera todos los tiempos de ejecución del espacio aislado con su estado y configuración.

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**La salida incluye:**

- Nombre y estado del tiempo de ejecución
- Backend (`docker`, `openshell`, etc.)
- Etiqueta de configuración y si coincide con la configuración actual
- Antigüedad (tiempo desde la creación)
- Tiempo de inactividad (tiempo desde el último uso)
- Sesión/agente asociado

### `openclaw sandbox recreate`

Elimina los tiempos de ejecución del espacio aislado para forzar su recreación con la configuración actualizada.

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**Opciones:**

- `--all`: Recrear todos los contenedores del espacio aislado
- `--session <key>`: Recrear contenedor para una sesión específica
- `--agent <id>`: Recrear contenedores para un agente específico
- `--browser`: Solo recrear contenedores del navegador
- `--force`: Omitir el mensaje de confirmación

<Note>Los tiempos de ejecución se recrean automáticamente cuando el agente se usa la próxima vez.</Note>

## Casos de uso

### Después de actualizar una imagen de Docker

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### Después de cambiar la configuración del espacio aislado

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### Después de cambiar el destino SSH o el material de autenticación SSH

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

Para el backend `ssh` principal, recreate elimina la raíz del espacio de trabajo remoto por ámbito
en el destino SSH. La siguiente ejecución lo vuelve a inicializar desde el espacio de trabajo local.

### Después de cambiar el origen, la política o el modo de OpenShell

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

Para el modo `remote` de OpenShell, recreate elimina el espacio de trabajo remoto canónico
para ese ámbito. La siguiente ejecución lo vuelve a inicializar desde el espacio de trabajo local.

### Después de cambiar setupCommand

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### Solo para un agente específico

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## Por qué es necesario

Cuando actualiza la configuración del sandbox:

- Los entornos de ejecución existentes continúan ejecutándose con la configuración antigua.
- Los entornos de ejecución solo se eliminan después de 24 horas de inactividad.
- Los agentes utilizados regularmente mantienen los entornos de ejecución antiguos indefinidamente.

Use `openclaw sandbox recreate` para forzar la eliminación de los entornos de ejecución antiguos. Se recrean automáticamente con la configuración actual cuando se necesiten nuevamente.

<Tip>Prefiera `openclaw sandbox recreate` sobre la limpieza manual específica del backend. Utiliza el registro de tiempo de ejecución de Gateway y evita discrepancias cuando cambian las claves de ámbito o sesión.</Tip>

## Configuración

La configuración del sandbox reside en `~/.openclaw/openclaw.json` bajo `agents.defaults.sandbox` (las anulaciones por agente van en `agents.list[].sandbox`):

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, ssh, openshell
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Aislamiento (Sandboxing)](/es/gateway/sandboxing)
- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Doctor](/es/gateway/doctor): verifica la configuración del sandbox.
