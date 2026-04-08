---
summary: "Soporte de Windows: rutas de instalación nativas y WSL2, demonio y advertencias actuales"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

# Windows

OpenClaw admite tanto **Windows nativo** como **WSL2**. WSL2 es la ruta más estable y recomendada para la experiencia completa: la CLI, el Gateway y las herramientas se ejecutan dentro de Linux con total compatibilidad. Windows nativo funciona para el uso principal de la CLI y el Gateway, con algunas salvedades que se indican a continuación.

Las aplicaciones complementarias nativas de Windows están planificadas.

## WSL2 (recomendado)

- [Introducción](/en/start/getting-started) (usar dentro de WSL)
- [Instalación y actualizaciones](/en/install/updating)
- Guía oficial de WSL2 (Microsoft): [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Estado de Windows nativo

Los flujos de la CLI nativa de Windows están mejorando, pero WSL2 sigue siendo la ruta recomendada.

Lo que funciona bien en Windows nativo hoy:

- instalador del sitio web a través de `install.ps1`
- uso local de la CLI como `openclaw --version`, `openclaw doctor` y `openclaw plugins list --json`
- smoke del agente local/proveedor integrado, como:

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Advertencias actuales:

- `openclaw onboard --non-interactive` todavía espera un gateway local accesible a menos que pases `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` y `openclaw gateway install` intentan primero las Tareas Programadas de Windows
- si se deniega la creación de la Tarea Programada, OpenClaw recurre a un elemento de inicio de sesión de carpeta de Inicio por usuario e inicia el gateway inmediatamente
- si `schtasks` mismo se bloquea o deja de responder, OpenClaw ahora aborta esa ruta rápidamente y usa la alternativa en lugar de colgarse para siempre
- Aún se prefieren las Tareas Programadas cuando están disponibles porque proporcionan un mejor estado de supervisor

Si deseas solo la CLI nativa, sin instalación del servicio gateway, usa uno de estos:

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

Si deseas el inicio administrado en Windows nativo:

```powershell
openclaw gateway install
openclaw gateway status --json
```

Si la creación de la Tarea Programada está bloqueada, el modo de servicio alternativo aún se inicia automáticamente después del inicio de sesión a través de la carpeta de Inicio del usuario actual.

## Gateway

- [Manual del Gateway](/en/gateway)
- [Configuración](/en/gateway/configuration)

## Instalación del servicio Gateway (CLI)

Dentro de WSL2:

```
openclaw onboard --install-daemon
```

O:

```
openclaw gateway install
```

O:

```
openclaw configure
```

Seleccione **Gateway service** cuando se le solicite.

Reparar/migrar:

```
openclaw doctor
```

## Inicio automático de Gateway antes del inicio de sesión de Windows

Para configuraciones sin cabeza, asegúrese de que se ejecute la cadena de arranque completa incluso cuando nadie inicie sesión en
Windows.

### 1) Mantener los servicios de usuario en ejecución sin inicio de sesión

Dentro de WSL:

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Instalar el servicio de usuario de OpenClaw Gateway

Dentro de WSL:

```bash
openclaw gateway install
```

### 3) Iniciar WSL automáticamente al arrancar Windows

En PowerShell como Administrador:

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Reemplaza `Ubuntu` con el nombre de tu distribución de:

```powershell
wsl --list --verbose
```

### Verificar cadena de inicio

Después de reiniciar (antes de iniciar sesión en Windows), verifique desde WSL:

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## Avanzado: exponer servicios WSL a través de LAN (portproxy)

WSL tiene su propia red virtual. Si otra máquina necesita acceder a un servicio
que se ejecuta **dentro de WSL** (SSH, un servidor TTS local o el Gateway), debe
reenviar un puerto de Windows a la IP actual de WSL. La IP de WSL cambia después de los reinicios,
así que es posible que deba actualizar la regla de reenvío.

Ejemplo (PowerShell **como Administrador**):

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

Permitir el puerto a través del Firewall de Windows (una sola vez):

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

Actualizar el portproxy después de reiniciar WSL:

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

Notas:

- El SSH desde otra máquina apunta a la **IP del host de Windows** (ejemplo: `ssh user@windows-host -p 2222`).
- Los nodos remotos deben apuntar a una URL de Gateway **accesible** (no `127.0.0.1`); usa
  `openclaw status --all` para confirmarlo.
- Usa `listenaddress=0.0.0.0` para el acceso a la LAN; `127.0.0.1` lo mantiene solo localmente.
- Si desea que esto sea automático, registre una Tarea Programada para ejecutar el paso de actualización
  al iniciar sesión.

## Instalación paso a paso de WSL2

### 1) Instalar WSL2 + Ubuntu

Abra PowerShell (Admin):

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

Reinicie si Windows lo solicita.

### 2) Habilitar systemd (requerido para la instalación del gateway)

En su terminal WSL:

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

Luego desde PowerShell:

```powershell
wsl --shutdown
```

Vuelva a abrir Ubuntu y luego verifique:

```bash
systemctl --user status
```

### 3) Instalar OpenClaw (dentro de WSL)

Siga el flujo de Primeros pasos de Linux dentro de WSL:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

Guía completa: [Introducción](/en/start/getting-started)

## Aplicación complementaria de Windows

Aún no tenemos una aplicación complementaria de Windows. Las contribuciones son bienvenidas si desea
contribuciones para hacerla realidad.
