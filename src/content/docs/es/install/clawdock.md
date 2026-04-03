---
summary: "Ayudantes de shell de ClawDock para instalaciones de OpenClaw basadas en Docker"
read_when:
  - You run OpenClaw with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

# ClawDock

ClawDock es una pequeña capa auxiliar de shell para instalaciones de OpenClaw basadas en Docker.

Te proporciona comandos cortos como `clawdock-start`, `clawdock-dashboard` y `clawdock-fix-token` en lugar de invocaciones más largas de `docker compose ...`.

Si aún no has configurado Docker, comienza con [Docker](/en/install/docker).

## Instalación

Usa la ruta auxiliar canónica:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si previamente instalaste ClawDock desde `scripts/shell-helpers/clawdock-helpers.sh`, reinstálala desde la nueva ruta `scripts/clawdock/clawdock-helpers.sh`. La ruta antigua de raw GitHub se eliminó.

## Lo que obtienes

### Operaciones básicas

| Comando            | Descripción                                 |
| ------------------ | ------------------------------------------- |
| `clawdock-start`   | Iniciar la puerta de enlace                 |
| `clawdock-stop`    | Detener la puerta de enlace                 |
| `clawdock-restart` | Reiniciar la puerta de enlace               |
| `clawdock-status`  | Verificar el estado del contenedor          |
| `clawdock-logs`    | Seguir los registros de la puerta de enlace |

### Acceso al contenedor

| Comando                   | Descripción                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `clawdock-shell`          | Abrir un shell dentro del contenedor de la puerta de enlace |
| `clawdock-cli <command>`  | Ejecutar comandos de CLI de OpenClaw en Docker              |
| `clawdock-exec <command>` | Ejecutar un comando arbitrario en el contenedor             |

### Interfaz de usuario web y emparejamiento

| Comando                 | Descripción                                           |
| ----------------------- | ----------------------------------------------------- |
| `clawdock-dashboard`    | Abrir la URL de la interfaz de control                |
| `clawdock-devices`      | Listar los emparejamientos de dispositivos pendientes |
| `clawdock-approve <id>` | Aprobar una solicitud de emparejamiento               |

### Configuración y mantenimiento

| Comando              | Descripción                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `clawdock-fix-token` | Configurar el token de la puerta de enlace dentro del contenedor |
| `clawdock-update`    | Extraer, reconstruir y reiniciar                                 |
| `clawdock-rebuild`   | Reconstruir solo la imagen de Docker                             |
| `clawdock-clean`     | Eliminar contenedores y volúmenes                                |

### Utilidades

| Comando                | Descripción                                               |
| ---------------------- | --------------------------------------------------------- |
| `clawdock-health`      | Ejecutar un chequeo de salud de la puerta de enlace       |
| `clawdock-token`       | Imprimir el token de la puerta de enlace                  |
| `clawdock-cd`          | Saltar al directorio del proyecto OpenClaw                |
| `clawdock-config`      | Abrir `~/.openclaw`                                       |
| `clawdock-show-config` | Imprimir archivos de configuración con valores redactados |
| `clawdock-workspace`   | Abrir el directorio del espacio de trabajo                |

## Flujo de primera vez

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

Si el navegador indica que se requiere el emparejamiento:

```bash
clawdock-devices
clawdock-approve <request-id>
```

## Configuración y secretos

ClawDock funciona con la misma división de configuración de Docker descrita en [Docker](/en/install/docker):

- `<project>/.env` para valores específicos de Docker como el nombre de la imagen, los puertos y el token de la puerta de enlace
- `~/.openclaw/.env` para claves de proveedor y tokens de bot
- `~/.openclaw/openclaw.json` para la configuración de comportamiento

Use `clawdock-show-config` cuando desee inspeccionar esos archivos rápidamente. Redacta los valores de `.env` en su salida impresa.

## Páginas relacionadas

- [Docker](/en/install/docker)
- [Docker VM Runtime](/en/install/docker-vm-runtime)
- [Actualización](/en/install/updating)
