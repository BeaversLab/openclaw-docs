---
summary: "Instalación automatizada y blindada de OpenClaw con Ansible, VPN Tailscale y aislamiento de firewall"
read_when:
  - Quieres un despliegue automatizado de servidores con endurecimiento de seguridad
  - Necesitas una configuración aislada por firewall con acceso VPN
  - Estás desplegando en servidores remotos Debian/Ubuntu
title: "Ansible"
---

# Instalación de Ansible

La forma recomendada de desplegar OpenClaw en servidores de producción es a través de **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** — un instalador automatizado con arquitectura de seguridad primero.

## Inicio Rápido

Instalación con un solo comando:

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 Guía completa: [github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> El repositorio openclaw-ansible es la fuente de verdad para el despliegue con Ansible. Esta página es un resumen rápido.

## Lo que obtienes

- 🔒 **Seguridad basada en firewall**: UFW + aislamiento de Docker (solo SSH + Tailscale accesible)
- 🔐 **VPN Tailscale**: Acceso remoto seguro sin exponer servicios públicamente
- 🐳 **Docker**: Contenedores de sandbox aislados, enlaces solo a localhost
- 🛡️ **Defensa en profundidad**: Arquitectura de seguridad de 4 capas
- 🚀 **Configuración con un comando**: Despliegue completo en minutos
- 🔧 **Integración con Systemd**: Inicio automático al arrancar con endurecimiento

## Requisitos

- **Sistema operativo**: Debian 11+ o Ubuntu 20.04+
- **Acceso**: Privilegios de root o sudo
- **Red**: Conexión a Internet para la instalación de paquetes
- **Ansible**: 2.14+ (instalado automáticamente por el script de inicio rápido)

## Qué se instala

El playbook de Ansible instala y configura:

1. **Tailscale** (VPN mesh para acceso remoto seguro)
2. **Firewall UFW** (solo puertos SSH + Tailscale)
3. **Docker CE + Compose V2** (para sandboxes de agentes)
4. **Node.js 24 + pnpm** (dependencias de ejecución; Node 22 LTS, actualmente `22.16+`, sigue siendo compatible por estabilidad)
5. **OpenClaw** (basado en el host, no en contenedores)
6. **Servicio Systemd** (inicio automático con endurecimiento de seguridad)

Nota: La pasarela se ejecuta **directamente en el host** (no en Docker), pero los sandboxes de agentes usan Docker para el aislamiento. Consulta [Sandboxing](/es/gateway/sandboxing) para más detalles.

## Configuración posterior a la instalación

Una vez completada la instalación, cambia al usuario openclaw:

```bash
sudo -i -u openclaw
```

El script post-instalación te guiará a través de:

1. **Asistente de incorporación**: Configura los ajustes de OpenClaw
2. **Inicio de sesión del proveedor**: Conectar WhatsApp/Telegram/Discord/Signal
3. **Prueba de la puerta de enlace**: Verificar la instalación
4. **Configuración de Tailscale**: Conectar a su malla VPN

### Comandos rápidos

```bash
# Check service status
sudo systemctl status openclaw

# View live logs
sudo journalctl -u openclaw -f

# Restart gateway
sudo systemctl restart openclaw

# Provider login (run as openclaw user)
sudo -i -u openclaw
openclaw channels login
```

## Arquitectura de seguridad

### Defensa de 4 capas

1. **Cortafuegos (UFW)**: Solo SSH (22) + Tailscale (41641/udp) expuestos públicamente
2. **VPN (Tailscale)**: Puerta de enlace accesible solo a través de la malla VPN
3. **Aislamiento de Docker**: La cadena iptables DOCKER-USER evita la exposición de puertos externos
4. **Endurecimiento de Systemd**: NoNewPrivileges, PrivateTmp, usuario sin privilegios

### Verificación

Probar la superficie de ataque externa:

```bash
nmap -p- YOUR_SERVER_IP
```

Debería mostrar **solo el puerto 22** (SSH) abierto. Todos los demás servicios (puerta de enlace, Docker) están bloqueados.

### Disponibilidad de Docker

Docker está instalado para **entornos de prueba de agentes** (ejecución aislada de herramientas), no para ejecutar la puerta de enlace en sí. La puerta de enlace se enlaza solo a localhost y es accesible a través de Tailscale VPN.

Consulte [Entorno de pruebas y herramientas de múltiples agentes](/es/tools/multi-agent-sandbox-tools) para la configuración del entorno de pruebas.

## Instalación manual

Si prefiere el control manual sobre la automatización:

```bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y ansible git

# 2. Clone repository
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible

# 3. Install Ansible collections
ansible-galaxy collection install -r requirements.yml

# 4. Run playbook
./run-playbook.sh

# Or run directly (then manually execute /tmp/openclaw-setup.sh after)
# ansible-playbook playbook.yml --ask-become-pass
```

## Actualización de OpenClaw

El instalador de Ansible configura OpenClaw para actualizaciones manuales. Consulte [Actualización](/es/install/updating) para el flujo de actualización estándar.

Para volver a ejecutar el playbook de Ansible (por ejemplo, para cambios de configuración):

```bash
cd openclaw-ansible
./run-playbook.sh
```

Nota: Esto es idempotente y es seguro ejecutarlo varias veces.

## Solución de problemas

### El cortafuegos bloquea mi conexión

Si se le ha bloqueado el acceso:

- Asegúrese de poder acceder a través de la VPN Tailscale primero
- El acceso SSH (puerto 22) siempre está permitido
- La puerta de enlace es **solo** accesible a través de Tailscale por diseño

### El servicio no se inicia

```bash
# Check logs
sudo journalctl -u openclaw -n 100

# Verify permissions
sudo ls -la /opt/openclaw

# Test manual start
sudo -i -u openclaw
cd ~/openclaw
pnpm start
```

### Problemas con el entorno de pruebas de Docker

```bash
# Verify Docker is running
sudo systemctl status docker

# Check sandbox image
sudo docker images | grep openclaw-sandbox

# Build sandbox image if missing
cd /opt/openclaw/openclaw
sudo -u openclaw ./scripts/sandbox-setup.sh
```

### Error en el inicio de sesión del proveedor

Asegúrese de estar ejecutando como el usuario `openclaw`:

```bash
sudo -i -u openclaw
openclaw channels login
```

## Configuración avanzada

Para obtener una arquitectura de seguridad detallada y solución de problemas:

- [Arquitectura de seguridad](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Detalles técnicos](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Guía de solución de problemas](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## Relacionado

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — guía completa de implementación
- [Docker](/es/install/docker) — configuración de puerta de enlace en contenedor
- [Aislamiento](/es/gateway/sandboxing) — configuración del entorno de prueba del agente
- [Entorno de pruebas y herramientas de múltiples agentes](/es/tools/multi-agent-sandbox-tools) — aislamiento por agente

import en from "/components/footer/en.mdx";

<en />
