---
summary: "Instalación automatizada y endurecida de OpenClaw con Ansible, VPN Tailscale y aislamiento de firewall"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Instalación de Ansible

La forma recomendada de desplegar OpenClaw en servidores de producción es a través de **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**: un instalador automatizado con arquitectura priorizada para la seguridad.

## Inicio rápido

Instalación con un solo comando:

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 Guía completa: [github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> El repositorio openclaw-ansible es la fuente de verdad para el despliegue con Ansible. Esta página es un resumen rápido.

## Lo que obtiene

- 🔒 **Seguridad primero el firewall**: UFW + aislamiento de Docker (solo accesible SSH + Tailscale)
- 🔐 **VPN Tailscale**: Acceso remoto seguro sin exponer servicios públicamente
- 🐳 **Docker**: Contenedores de espacio aislado (sandbox), enlaces solo a localhost
- 🛡️ **Defensa en profundidad**: Arquitectura de seguridad de 4 capas
- 🚀 **Configuración con un comando**: Despliegue completo en minutos
- 🔧 **Integración con Systemd**: Inicio automático al arrancar con endurecimiento

## Requisitos

- **Sistema operativo**: Debian 11+ o Ubuntu 20.04+
- **Acceso**: Privilegios de root o sudo
- **Red**: Conexión a Internet para la instalación de paquetes
- **Ansible**: 2.14+ (se instala automáticamente mediante el script de inicio rápido)

## Qué se instala

El playbook de Ansible instala y configura:

1. **Tailscale** (VPN malla para acceso remoto seguro)
2. **Firewall UFW** (solo puertos SSH + Tailscale)
3. **Docker CE + Compose V2** (para espacios aislados de agentes)
4. **Node.js 24 + pnpm** (dependencias de tiempo de ejecución; Node 22 LTS, actualmente `22.16+`, sigue siendo compatible)
5. **OpenClaw** (basado en el host, no en contenedores)
6. **Servicio Systemd** (inicio automático con endurecimiento de seguridad)

Nota: La puerta de enlace se ejecuta **directamente en el host** (no en Docker), pero los espacios aislados de los agentes usan Docker para el aislamiento. Consulte [Sandboxing](/es/gateway/sandboxing) para más detalles.

## Configuración posterior a la instalación

Una vez completada la instalación, cambie al usuario openclaw:

```bash
sudo -i -u openclaw
```

El script posterior a la instalación le guiará a través de:

1. **Asistente de incorporación**: Configure los ajustes de OpenClaw
2. **Inicio de sesión del proveedor**: Conecte WhatsApp/Telegram/Discord/Signal
3. **Prueba de la puerta de enlace**: Verifique la instalación
4. **Configuración de Tailscale**: Conecta a tu malla VPN

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

1. **Firewall (UFW)**: Solo se exponen públicamente SSH (22) + Tailscale (41641/udp)
2. **VPN (Tailscale)**: Gateway accesible solo a través de la malla VPN
3. **Aislamiento de Docker**: La cadena iptables DOCKER-USER evita la exposición de puertos externos
4. **Endurecimiento de Systemd**: NoNewPrivileges, PrivateTmp, usuario sin privilegios

### Verificación

Probar la superficie de ataque externa:

```bash
nmap -p- YOUR_SERVER_IP
```

Debería mostrar **solo el puerto 22** (SSH) abierto. Todos los demás servicios (gateway, Docker) están bloqueados.

### Disponibilidad de Docker

Docker está instalado para **entornos de prueba del agente** (ejecución de herramientas aisladas), no para ejecutar el gateway en sí. El gateway se vincula solo a localhost y es accesible a través de la VPN Tailscale.

Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para la configuración del entorno de prueba.

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

### El firewall bloquea mi conexión

Si se le ha bloqueado el acceso:

- Asegúrese de poder acceder a través de la VPN Tailscale primero
- El acceso SSH (puerto 22) siempre está permitido
- El gateway es accesible **solo** a través de Tailscale por diseño

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

### Problemas del entorno de prueba de Docker

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

Para obtener detalles sobre la arquitectura de seguridad y la solución de problemas:

- [Arquitectura de seguridad](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Detalles técnicos](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Guía de solución de problemas](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## Relacionado

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — guía completa de implementación
- [Docker](/es/install/docker) — configuración del gateway en contenedor
- [Aislamiento](/es/gateway/sandboxing) — configuración del entorno de prueba del agente
- [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) — aislamiento por agente

import es from "/components/footer/es.mdx";

<es />
