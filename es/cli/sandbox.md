---
title: CLI de Sandbox
summary: "Gestionar contenedores de sandbox e inspeccionar la política de sandbox efectiva"
read_when: "Estás gestionando contenedores de sandbox o depurando el comportamiento de la política de sandbox/herramientas."
status: active
---

# CLI de Sandbox

Gestiona contenedores de sandbox basados en Docker para la ejecución aislada de agentes.

## Resumen

OpenClaw puede ejecutar agentes en contenedores Docker aislados por seguridad. Los comandos `sandbox` te ayudan a gestionar estos contenedores, especialmente después de actualizaciones o cambios de configuración.

## Comandos

### `openclaw sandbox explain`

Inspecciona el modo/ámbito/acceso al espacio de trabajo del sandbox **efectivo**, la política de herramientas del sandbox y las puertas elevadas (con rutas de clave de configuración de corrección).

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

Enumera todos los contenedores de sandbox con su estado y configuración.

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**La salida incluye:**

- Nombre y estado del contenedor (en ejecución/detenido)
- Imagen de Docker y si coincide con la configuración
- Antigüedad (tiempo desde la creación)
- Tiempo de inactividad (tiempo desde el último uso)
- Sesión/agente asociado

### `openclaw sandbox recreate`

Elimina los contenedores de sandbox para forzar su recreación con imágenes/configuraciones actualizadas.

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**Opciones:**

- `--all`: Recrear todos los contenedores de sandbox
- `--session <key>`: Recrear contenedor para una sesión específica
- `--agent <id>`: Recrear contenedores para un agente específico
- `--browser`: Solo recrear contenedores del navegador
- `--force`: Omitir el mensaje de confirmación

**Importante:** Los contenedores se recrean automáticamente cuando se utiliza el agente nuevamente.

## Casos de uso

### Después de actualizar las imágenes de Docker

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

**Problema:** Cuando actualizas las imágenes de Docker o la configuración del sandbox:

- Los contenedores existentes continúan ejecutándose con la configuración antigua
- Los contenedores solo se eliminan después de 24 horas de inactividad
- Los agentes utilizados regularmente mantienen los contenedores antiguos en ejecución indefinidamente

**Solución:** Usa `openclaw sandbox recreate` para forzar la eliminación de los contenedores antiguos. Se recrearán automáticamente con la configuración actual cuando sean necesarios nuevamente.

Consejo: prefiera `openclaw sandbox recreate` en lugar de `docker rm` manual. Utiliza la nomenclatura de contenedores del Gateway y evita discordancias cuando cambian las claves de ámbito/sesión.

## Configuración

La configuración del entorno aislado (sandbox) se encuentra en `~/.openclaw/openclaw.json` bajo `agents.defaults.sandbox` (las anulaciones por agente van en `agents.list[].sandbox`):

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
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

- [Documentación del entorno aislado (Sandbox)](/es/gateway/sandboxing)
- [Configuración del agente](/es/concepts/agent-workspace)
- [Comando Doctor](/es/gateway/doctor) - Verificar la configuración del entorno aislado (sandbox)

import es from "/components/footer/es.mdx";

<es />
