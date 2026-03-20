---
summary: "Soporte para Windows (WSL2) + estado de la aplicación complementaria"
read_when:
  - Instalar OpenClaw en Windows
  - Buscando el estado de la aplicación complementaria de Windows
title: "Windows (WSL2)"
---

# Windows (WSL2)

Se recomienda OpenClaw en Windows **a través de WSL2** (se recomienda Ubuntu). La
CLI + Gateway se ejecutan dentro de Linux, lo que mantiene el tiempo de ejecución consistente y hace
que las herramientas sean mucho más compatibles (Node/Bun/pnpm, binarios de Linux, habilidades). Windows
nativo podría ser más complicado. WSL2 te brinda la experiencia completa de Linux: un solo comando
para instalar: `wsl --install`.

Las aplicaciones complementarias nativas de Windows están planificadas.

## Instalación (WSL2)

- [Primeros pasos](/es/start/getting-started) (usar dentro de WSL)
- [Instalación y actualizaciones](/es/install/updating)
- Guía oficial de WSL2 (Microsoft): [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Estado de Windows nativo

Los flujos de la CLI nativa de Windows están mejorando, pero WSL2 sigue siendo la ruta recomendada.

Lo que funciona bien en Windows nativo hoy:

- instalador del sitio web a través de `install.ps1`
- uso de la CLI local, como `openclaw --version`, `openclaw doctor` y `openclaw plugins list --json`
- pruebas de humo del agente local/proveedor integradas, tales como:

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Advertencias actuales:

- `openclaw onboard --non-interactive` todavía espera un gateway local accesible a menos que pases `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` y `openclaw gateway install` intentan primero las Tareas Programadas de Windows
- si se deniega la creación de Tareas Programadas, OpenClaw recurre a un elemento de inicio de sesión de carpeta de Inicio por usuario e inicia el gateway inmediatamente
- si `schtasks` se bloquea o deja de responder, OpenClaw ahora aborta esa ruta rápidamente y recurre en lugar de colgarse para siempre
- Las Tareas Programadas siguen siendo las preferidas cuando están disponibles porque proporcionan un mejor estado de supervisor

Si solo deseas la CLI nativa, sin instalación del servicio gateway, usa uno de estos:

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

Si sí deseas un inicio administrado en Windows nativo:

```powershell
openclaw gateway install
openclaw gateway status --json
```

Si la creación de Tareas Programadas está bloqueada, el modo de servicio de alternativa todavía se inicia automáticamente después del inicio de sesión a través de la carpeta de Inicio del usuario actual.

## Gateway

- [Manual del Gateway](/es/gateway)
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

## Inicio automático de la puerta de enlace antes del inicio de sesión de Windows

Para configuraciones sin pantalla, asegúrese de que se ejecute la cadena de inicio completa incluso cuando nadie inicie sesión en Windows.

### 1) Mantener los servicios de usuario en ejecución sin inicio de sesión

Dentro de WSL:

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Instalar el servicio de usuario de la puerta de enlace OpenClaw

Dentro de WSL:

```bash
openclaw gateway install
```

### 3) Iniciar WSL automáticamente al arrancar Windows

En PowerShell como Administrador:

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Reemplace `Ubuntu` con el nombre de su distribución de:

```powershell
wsl --list --verbose
```

### Verificar cadena de inicio

Después de reiniciar (antes del inicio de sesión de Windows), verifique desde WSL:

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## Avanzado: exponer servicios WSL a través de LAN (portproxy)

WSL tiene su propia red virtual. Si otra máquina necesita acceder a un servicio que se ejecuta **dentro de WSL** (SSH, un servidor TTS local o la puerta de enlace), debe reenviar un puerto de Windows a la IP actual de WSL. La IP de WSL cambia después de los reinicios, por lo que es posible que deba actualizar la regla de reenvío.

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

Permitir el puerto a través del Firewall de Windows (una vez):

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

- SSH desde otra máquina apunta a la **IP del host de Windows** (ejemplo: `ssh user@windows-host -p 2222`).
- Los nodos remotos deben apuntar a una URL de puerta de enlace **accesible** (no `127.0.0.1`); use `openclaw status --all` para confirmar.
- Use `listenaddress=0.0.0.0` para el acceso a LAN; `127.0.0.1` lo mantiene solo local.
- Si desea que esto sea automático, registre una Tarea Programada para ejecutar el paso de actualización al iniciar sesión.

## Instalación paso a paso de WSL2

### 1) Instalar WSL2 + Ubuntu

Abrir PowerShell (Admin):

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

Reinicie si Windows lo solicita.

### 2) Habilitar systemd (necesario para la instalación de la puerta de enlace)

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

Siga el flujo de Introducción a Linux dentro de WSL:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

Guía completa: [Introducción](/es/start/getting-started)

## Aplicación complementaria de Windows

Aún no tenemos una aplicación complementaria de Windows. Las contribuciones son bienvenidas si desea contribuir para hacerla realidad.

import es from "/components/footer/es.mdx";

<es />
