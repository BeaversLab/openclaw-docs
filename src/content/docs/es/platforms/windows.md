---
summary: "Soporte de Windows: rutas de instalación nativas y WSL2, demonio y advertencias actuales"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

OpenClaw admite tanto **Windows nativo** como **WSL2**. WSL2 es la opción más estable y recomendada para la experiencia completa, ya que la CLI, el Gateway y las herramientas se ejecutan dentro de Linux con total compatibilidad. Windows nativo funciona para el uso básico de la CLI y el Gateway, con algunas salvedades que se indican a continuación.

Las aplicaciones complementarias nativas de Windows están planificadas.

## WSL2 (recomendado)

- [Primeros pasos](/es/start/getting-started) (usar dentro de WSL)
- [Instalación y actualizaciones](/es/install/updating)
- Guía oficial de WSL2 (Microsoft): [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Estado de Windows nativo

Los flujos de la CLI nativa de Windows están mejorando, pero WSL2 sigue siendo la ruta recomendada.

Lo que funciona bien en Windows nativo hoy:

- instalador del sitio web mediante `install.ps1`
- uso local de la CLI como `openclaw --version`, `openclaw doctor` y `openclaw plugins list --json`
- pruebas de humo del agente local/proveedor integradas, tales como:

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Salvedades actuales:

- `openclaw onboard --non-interactive` todavía espera una puerta de enlace local accesible a menos que pases `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` y `openclaw gateway install` intentan primero las Tareas Programadas de Windows
- si se niega la creación de la Tarea Programada, OpenClaw recurre a un elemento de inicio de sesión de carpeta de Inicio por usuario e inicia el gateway inmediatamente
- si `schtasks` mismo se bloquea o deja de responder, OpenClaw ahora aborta esa ruta rápidamente y recurre en lugar de colgarse para siempre
- Las Tareas Programadas siguen siendo preferidas cuando están disponibles porque proporcionan un mejor estado de supervisión

Si solo quieres la CLI nativa, sin instalación del servicio gateway, usa uno de estos:

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

Si sí quieres el inicio administrado en Windows nativo:

```powershell
openclaw gateway install
openclaw gateway status --json
```

Si la creación de Tareas Programadas está bloqueada, el modo de servicio de respaldo aún se inicia automáticamente después del inicio de sesión a través de la carpeta de Inicio del usuario actual.

## Gateway

- [Manual de procedimientos de Gateway](/es/gateway)
- [Configuración](/es/gateway/configuration)

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

Selecciona **Servicio Gateway** cuando se te solicite.

Reparar/migrar:

```
openclaw doctor
```

## Inicio automático del Gateway antes del inicio de sesión de Windows

Para configuraciones sin cabeza (headless), asegúrate de que se ejecute toda la cadena de arranque incluso cuando nadie inicie sesión en Windows.

### 1) Mantener los servicios de usuario en ejecución sin inicio de sesión

Dentro de WSL:

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Instalar el servicio de usuario del Gateway de OpenClaw

Dentro de WSL:

```bash
openclaw gateway install
```

### 3) Iniciar WSL automáticamente al arrancar Windows

En PowerShell como Administrador:

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Reemplace `Ubuntu` con el nombre de su distribución desde:

```powershell
wsl --list --verbose
```

### Verificar la cadena de inicio

Después de reiniciar (antes de iniciar sesión en Windows), verifica desde WSL:

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## Avanzado: exponer servicios WSL a través de la LAN (portproxy)

WSL tiene su propia red virtual. Si otra máquina necesita acceder a un servicio
que se ejecuta **dentro de WSL** (SSH, un servidor TTS local, o el Gateway), debes
reenviar un puerto de Windows a la IP actual de WSL. La IP de WSL cambia después de los reinicios,
así que es posible que necesites actualizar la regla de reenvío.

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
- Los nodos remotos deben apuntar a una URL de Gateway **accesible** (no `127.0.0.1`); use
  `openclaw status --all` para confirmarlo.
- Use `listenaddress=0.0.0.0` para el acceso a LAN; `127.0.0.1` lo mantiene solo localmente.
- Si quieres que esto sea automático, registra una Tarea Programada para ejecutar el paso
  de actualización al iniciar sesión.

## Instalación paso a paso de WSL2

### 1) Instalar WSL2 + Ubuntu

Abre PowerShell (Administrador):

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

Reinicia si Windows lo solicita.

### 2) Habilitar systemd (necesario para la instalación del gateway)

En tu terminal de WSL:

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

Vuelve a abrir Ubuntu, luego verifica:

```bash
systemctl --user status
```

### 3) Instalar OpenClaw (dentro de WSL)

Para una configuración normal por primera vez dentro de WSL, sigue el flujo de Introducción de Linux:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
pnpm openclaw onboard --install-daemon
```

Si está desarrollando desde el código fuente en lugar de realizar la incorporación por primera vez, use el
ciclo de desarrollo de fuentes desde [Configuración](/es/start/setup):

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

Guía completa: [Introducción](/es/start/getting-started)

## Aplicación complementaria de Windows

Todavía no tenemos una aplicación de acompañamiento para Windows. Las contribuciones son bienvenidas si quieres ayudar a que esto suceda.

## Conectividad con Git y GitHub (colaboradores)

Algunas redes bloquean o limitan el tráfico HTTPS hacia GitHub. Si `git clone` falla con tiempos de espera
o reestablecimientos de conexión, prueba con otra red, una VPN o un proxy HTTP/HTTPS que tu
organización proporcione.

Si `gh auth login` falla durante el flujo de dispositivos del navegador (por ejemplo, un tiempo de espera
al alcanzar `github.com:443`), autentícate con un token de acceso personal en su lugar:

1. Cree un token con al menos el alcance `repo` (PAT clásico) o el equivalente
   acceso de granularidad fina.
2. En PowerShell para la sesión actual:

```powershell
$env:GH_TOKEN="<your-token>"
gh auth status
gh auth setup-git
```

3. Si `gh auth status` advierte sobre falta de `read:org`, genere un token que incluya
   ese alcance y reasigne la variable:

```powershell
$env:GH_TOKEN="<your-token-with-repo-and-read:org>"
gh auth status
```

`gh auth refresh -s read:org` solo se aplica cuando se autenticó mediante `gh auth login`
y tiene credenciales almacenadas para actualizar (no cuando usa `GH_TOKEN`).

Nunca confirme tokens ni los pegue en problemas o solicitudes de extracción.

## Relacionado

- [Descripción general de la instalación](/es/install)
- [Plataformas](/es/platforms)
