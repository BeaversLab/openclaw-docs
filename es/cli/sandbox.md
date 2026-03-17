---
title: CLI de Sandbox
summary: "Administra los tiempos de ejecución del sandbox e inspecciona la política efectiva del sandbox"
read_when: "Estás administrando los tiempos de ejecución del sandbox o depurando el comportamiento del sandbox/herramientas de política."
status: active
---

# CLI de Sandbox

Administra los tiempos de ejecución del sandbox para la ejecución aislada del agente.

## Resumen

OpenClaw puede ejecutar agentes en tiempos de ejecución de sandbox aislados por seguridad. Los comandos `sandbox` le ayudan a inspeccionar y recrear esos tiempos de ejecución después de actualizaciones o cambios de configuración.

Hoy en día, eso generalmente significa:

- Contenedores de sandbox de Docker
- Tiempos de ejecución de sandbox SSH cuando `agents.defaults.sandbox.backend = "ssh"`
- Tiempos de ejecución de sandbox OpenShell cuando `agents.defaults.sandbox.backend = "openshell"`

Para `ssh` y OpenShell `remote`, recrear es más importante que con Docker:

- el espacio de trabajo remoto es canónico después de la semilla inicial
- `openclaw sandbox recreate` elimina ese espacio de trabajo remoto canónico para el ámbito seleccionado
- el siguiente uso lo siembra nuevamente desde el espacio de trabajo local actual

## Comandos

### `openclaw sandbox explain`

Inspeccione el **modo/ámbito/acceso al espacio de trabajo** efectivo del sandbox, la política de herramientas del sandbox y las puertas elevadas (con rutas de clave de configuración de solución).

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

Enumere todos los tiempos de ejecución del sandbox con su estado y configuración.

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**La salida incluye:**

- Nombre y estado del tiempo de ejecución
- Backend (`docker`, `openshell`, etc.)
- Etiqueta de configuración y si coincide con la configuración actual
- Antigüedad (tiempo transcurrido desde su creación)
- Tiempo de inactividad (tiempo desde el último uso)
- Sesión/agente asociado

### `openclaw sandbox recreate`

Elimine los tiempos de ejecución del sandbox para forzar la recreación con la configuración actualizada.

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**Opciones:**

- `--all`: Recrear todos los contenedores del sandbox
- `--session <key>`: Recrear contenedor para una sesión específica
- `--agent <id>`: Recrear contenedores para un agente específico
- `--browser`: Solo recrear contenedores del navegador
- `--force`: Omitir el mensaje de confirmación

**Importante:** Los tiempos de ejecución se recrean automáticamente cuando se usa el agente la próxima vez.

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

### Después de cambiar la configuración del sandbox

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
en el destino SSH. La siguiente ejecución la vuelve a inicializar desde el espacio de trabajo local.

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

## ¿Por qué es necesario?

**Problema:** Cuando actualizas la configuración del entorno de ejecución:

- Los entornos de ejecución existentes siguen ejecutándose con la configuración anterior
- Los entornos de ejecución solo se eliminan después de 24 h de inactividad
- Los agentes utilizados regularmente mantienen los entornos de ejecución antiguos indefinidamente

**Solución:** Usa `openclaw sandbox recreate` para forzar la eliminación de los entornos de ejecución antiguos. Se volverán a crear automáticamente con la configuración actual cuando sean necesarios la próxima vez.

Consejo: prefiere `openclaw sandbox recreate` sobre la limpieza manual específica del backend.
Utiliza el registro de entornos de ejecución del Gateway y evita discordancias cuando cambian las claves de ámbito/sesión.

## Configuración

La configuración del entorno de ejecución reside en `~/.openclaw/openclaw.json` bajo `agents.defaults.sandbox` (las anulaciones por agente van en `agents.list[].sandbox`):

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

## Véase también

- [Documentación del entorno de ejecución](/es/gateway/sandboxing)
- [Configuración del agente](/es/concepts/agent-workspace)
- [Comando Doctor](/es/gateway/doctor) - Comprobar la configuración del entorno de ejecución

import es from "/components/footer/es.mdx";

<es />
