---
summary: "Desinstalar OpenClaw completamente (CLI, servicio, estado, espacio de trabajo)"
read_when:
  - You want to remove OpenClaw from a machine
  - The gateway service is still running after uninstall
title: "Desinstalar"
---

Dos caminos:

- **Camino fácil** si `openclaw` aún está instalado.
- **Eliminación manual del servicio** si la CLI ha desaparecido pero el servicio sigue ejecutándose.

## Camino fácil (CLI todavía instalada)

Recomendado: use el desinstalador integrado:

```bash
openclaw uninstall
```

No interactivo (automatización / npx):

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

Pasos manuales (mismo resultado):

1. Detenga el servicio de puerta de enlace:

```bash
openclaw gateway stop
```

2. Desinstale el servicio de puerta de enlace (launchd/systemd/schtasks):

```bash
openclaw gateway uninstall
```

3. Elimine el estado + la configuración:

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

Si configuró `OPENCLAW_CONFIG_PATH` en una ubicación personalizada fuera del directorio de estado, elimine también ese archivo.

4. Elimine su espacio de trabajo (opcional, elimina los archivos del agente):

```bash
rm -rf ~/.openclaw/workspace
```

5. Elimine la instalación de la CLI (elija la que usó):

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. Si instaló la aplicación de macOS:

```bash
rm -rf /Applications/OpenClaw.app
```

Notas:

- Si usó perfiles (`--profile` / `OPENCLAW_PROFILE`), repita el paso 3 para cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
- En modo remoto, el directorio de estado reside en el **host de la puerta de enlace**, por lo que también debe ejecutar los pasos 1-4 allí.

## Eliminación manual del servicio (CLI no instalada)

Use esto si el servicio de puerta de enlace sigue ejecutándose pero falta `openclaw`.

### macOS (launchd)

La etiqueta predeterminada es `ai.openclaw.gateway` (o `ai.openclaw.<profile>`; la heredada `com.openclaw.*` aún puede existir):

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

Si usó un perfil, reemplace la etiqueta y el nombre del plist con `ai.openclaw.<profile>`. Elimine cualquier plist heredado `com.openclaw.*` si está presente.

### Linux (unidad de usuario systemd)

El nombre de unidad predeterminado es `openclaw-gateway.service` (o `openclaw-gateway-<profile>.service`):

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows (Tarea programada)

El nombre de tarea predeterminado es `OpenClaw Gateway` (o `OpenClaw Gateway (<profile>)`).
El script de la tarea reside en su directorio de estado.

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

Si usó un perfil, elimine el nombre de tarea coincidente y `~\.openclaw-<profile>\gateway.cmd`.

## Instalación normal vs. fuente obtenida

### Instalación normal (install.sh / npm / pnpm / bun)

Si usó `https://openclaw.ai/install.sh` o `install.ps1`, la CLI se instaló con `npm install -g openclaw@latest`.
Elimínela con `npm rm -g openclaw` (o `pnpm remove -g` / `bun remove -g` si la instaló de esa manera).

### Fuente obtenida (git clone)

Si ejecutas desde una clonación del repositorio (`git clone` + `openclaw ...` / `bun run openclaw ...`):

1. Desinstala el servicio de puerta de enlace **antes** de eliminar el repositorio (usa la ruta fácil anterior o la eliminación manual del servicio).
2. Elimina el directorio del repositorio.
3. Elimina el estado y el espacio de trabajo como se muestra arriba.

## Relacionado

- [Resumen de instalación](/es/install)
- [Guía de migración](/es/install/migrating)
