---
summary: "Ayudantes de shell de ClawDock para instalaciones de OpenClaw basadas en Docker"
read_when:
  - You run OpenClaw with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

ClawDock es una pequeña capa auxiliar de shell para instalaciones de OpenClaw basadas en Docker.

Proporciona comandos cortos como `clawdock-start`, `clawdock-dashboard` y `clawdock-fix-token` en lugar de invocaciones más largas de `docker compose ...`.

Si aún no has configurado Docker, comienza con [Docker](/es/install/docker).

## Instalar

Usa la ruta auxiliar canónica:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si anteriormente instalaste ClawDock desde `scripts/shell-helpers/clawdock-helpers.sh`, reinstálalo desde la nueva ruta `scripts/clawdock/clawdock-helpers.sh`. La ruta antigua de GitHub sin procesar se eliminó.

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
| `clawdock-cli <command>`  | Ejecutar comandos de la CLI de OpenClaw en Docker           |
| `clawdock-exec <command>` | Ejecutar un comando arbitrario en el contenedor             |

### Interfaz de usuario web y emparejamiento

| Comando                 | Descripción                                           |
| ----------------------- | ----------------------------------------------------- |
| `clawdock-dashboard`    | Abrir la URL de la interfaz de usuario de control     |
| `clawdock-devices`      | Listar los emparejamientos de dispositivos pendientes |
| `clawdock-approve <id>` | Aprobar una solicitud de emparejamiento               |

### Configuración y mantenimiento

| Comando              | Descripción                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `clawdock-fix-token` | Configurar el token de la puerta de enlace dentro del contenedor |
| `clawdock-update`    | Extraer, reconstruir y reiniciar                                 |
| `clawdock-rebuild`   | Volver a construir solo la imagen de Docker                      |
| `clawdock-clean`     | Eliminar contenedores y volúmenes                                |

### Utilidades

| Comando                | Descripción                                                |
| ---------------------- | ---------------------------------------------------------- |
| `clawdock-health`      | Ejecutar una comprobación de estado de la puerta de enlace |
| `clawdock-token`       | Imprimir el token de la puerta de enlace                   |
| `clawdock-cd`          | Ir al directorio del proyecto OpenClaw                     |
| `clawdock-config`      | Abrir `~/.openclaw`                                        |
| `clawdock-show-config` | Imprimir archivos de configuración con valores redactados  |
| `clawdock-workspace`   | Abrir el directorio del espacio de trabajo                 |

## Flujo de primera vez

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

Si el navegador indica que se requiere emparejamiento:

```bash
clawdock-devices
clawdock-approve <request-id>
```

## Configuración y secretos

ClawDock funciona con la misma división de configuración de Docker descrita en [Docker](/es/install/docker):

- `<project>/.env` para valores específicos de Docker como el nombre de la imagen, los puertos y el token de la puerta de enlace
- `~/.openclaw/.env` para claves de proveedor y tokens de bot respaldados por variables de entorno
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` para la autenticación OAuth/de clave de API del proveedor almacenada
- `~/.openclaw/openclaw.json` para la configuración del comportamiento

Use `clawdock-show-config` cuando quiera inspeccionar rápidamente los archivos `.env` y `openclaw.json`. Redacta los valores de `.env` en su salida impresa.

## Páginas relacionadas

- [Docker](/es/install/docker)
- [Docker VM Runtime](/es/install/docker-vm-runtime)
- [Actualización](/es/install/updating)
