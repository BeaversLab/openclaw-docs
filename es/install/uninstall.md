---
summary: "Desinstalar OpenClaw completamente (CLI, servicio, estado, espacio de trabajo)"
read_when:
  - Deseas eliminar OpenClaw de una máquina
  - El servicio de puerta de enlace sigue ejecutándose después de la desinstalación
title: "Desinstalar"
---

# Desinstalar

Dos opciones:

- **Ruta fácil** si `openclaw` todavía está instalado.
- **Eliminación manual del servicio** si la CLI ha desaparecido pero el servicio sigue ejecutándose.

## Ruta fácil (CLI todavía instalado)

Recomendado: usar el desinstalador integrado:

```bash
openclaw uninstall
```

No interactivo (automatización / npx):

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

Pasos manuales (mismo resultado):

1. Detener el servicio de puerta de enlace:

```bash
openclaw gateway stop
```

2. Desinstalar el servicio de puerta de enlace (launchd/systemd/schtasks):

```bash
openclaw gateway uninstall
```

3. Eliminar estado + configuración:

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

Si configuraste `OPENCLAW_CONFIG_PATH` en una ubicación personalizada fuera del directorio de estado, elimina también ese archivo.

4. Elimina tu espacio de trabajo (opcional, elimina los archivos del agente):

```bash
rm -rf ~/.openclaw/workspace
```

5. Elimina la instalación de la CLI (elige la que usaste):

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. Si instalaste la aplicación de macOS:

```bash
rm -rf /Applications/OpenClaw.app
```

Notas:

- Si usaste perfiles (`--profile` / `OPENCLAW_PROFILE`), repite el paso 3 para cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
- En modo remoto, el directorio de estado se encuentra en el **host de la puerta de enlace**, así que ejecuta los pasos 1-4 allí también.

## Eliminación manual del servicio (CLI no instalado)

Usa esto si el servicio de puerta de enlace sigue ejecutándose pero `openclaw` no está.

### macOS (launchd)

La etiqueta predeterminada es `ai.openclaw.gateway` (o `ai.openclaw.<profile>`; la etiqueta heredada `com.openclaw.*` todavía puede existir):

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

Si usaste un perfil, reemplaza la etiqueta y el nombre del plist con `ai.openclaw.<profile>`. Elimina cualquier plist heredado `com.openclaw.*` si está presente.

### Linux (unidad de usuario systemd)

El nombre de unidad predeterminado es `openclaw-gateway.service` (o `openclaw-gateway-<profile>.service`):

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows (Tarea programada)

El nombre de tarea predeterminado es `OpenClaw Gateway` (o `OpenClaw Gateway (<profile>)`).
El script de tarea se encuentra en tu directorio de estado.

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

Si usaste un perfil, elimina el nombre de tarea coincidente y `~\.openclaw-<profile>\gateway.cmd`.

## Instalación normal vs descarga de código fuente

### Instalación normal (install.sh / npm / pnpm / bun)

Si usó `https://openclaw.ai/install.sh` o `install.ps1`, la CLI se instaló con `npm install -g openclaw@latest`.
Elimínela con `npm rm -g openclaw` (o `pnpm remove -g` / `bun remove -g` si la instaló de esa manera).

### Repositorio de código fuente (git clone)

Si ejecuta desde una revisión del repositorio (`git clone` + `openclaw ...` / `bun run openclaw ...`):

1. Desinstale el servicio de puerta de enlace **antes** de eliminar el repositorio (use la ruta fácil anterior o la eliminación manual del servicio).
2. Elimine el directorio del repositorio.
3. Elimine el estado y el espacio de trabajo como se muestra arriba.

import es from "/components/footer/es.mdx";

<es />
