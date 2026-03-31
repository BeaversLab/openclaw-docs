---
summary: "Instalación automatizada y endurecida de OpenClaw con Ansible, Tailscale VPN y aislamiento de firewall"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Instalación de Ansible

Implemente OpenClaw en servidores de producción con **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** -- un instalador automatizado con arquitectura de seguridad primero.

<Info>El repositorio [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) es la fuente de verdad para el despliegue de Ansible. Esta página es un resumen rápido.</Info>

## Requisitos previos

| Requisito   | Detalles                                                         |
| ----------- | ---------------------------------------------------------------- |
| **SO**      | Debian 11+ o Ubuntu 20.04+                                       |
| **Acceso**  | Privilegios de root o sudo                                       |
| **Red**     | Conexión a Internet para la instalación de paquetes              |
| **Ansible** | 2.14+ (instalado automáticamente por el script de inicio rápido) |

## Lo que obtiene

- **Seguridad con prioridad en el firewall** -- UFW + aislamiento de Docker (solo accesible SSH + Tailscale)
- **Tailscale VPN** -- acceso remoto seguro sin exponer servicios públicamente
- **Docker** -- contenedores de arena aislados, enlaces solo localhost
- **Defensa en profundidad** -- arquitectura de seguridad de 4 capas
- **Integración con Systemd** -- inicio automático al arrancar con endurecimiento
- **Configuración en un solo comando** -- despliegue completo en minutos

## Inicio rápido

Instalación en un solo comando:

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## Qué se instala

El playbook de Ansible instala y configura:

1. **Tailscale** -- VPN de malla para acceso remoto seguro
2. **Firewall UFW** -- solo puertos SSH + Tailscale
3. **Docker CE + Compose V2** -- para entornos de prueba (sandboxes) de agentes
4. **Node.js 24 + pnpm** -- dependencias de tiempo de ejecución (Node 22 LTS, actualmente `22.14+`, sigue siendo compatible)
5. **OpenClaw** -- basado en el host, no en contenedores
6. **Servicio Systemd** -- inicio automático con endurecimiento de seguridad

<Note>La puerta de enlace se ejecuta directamente en el host (no en Docker), pero los entornos limitados del agente utilizan Docker para el aislamiento. Consulte [Sandboxing](/en/gateway/sandboxing) para obtener más detalles.</Note>

## Configuración posterior a la instalación

<Steps>
  <Step title="Switch to the openclaw user">```bash sudo -i -u openclaw ```</Step>
  <Step title="Ejecute el asistente de incorporación">El script posterior a la instalación le guiará a través de la configuración de los ajustes de OpenClaw.</Step>
  <Step title="Conectar proveedores de mensajería">Inicie sesión en WhatsApp, Telegram, Discord o Signal: ```bash openclaw channels login ```</Step>
  <Step title="Verificar la instalación">```bash sudo systemctl status openclaw sudo journalctl -u openclaw -f ```</Step>
  <Step title="Conectar a Tailscale">Únase a su malla VPN para acceso remoto seguro.</Step>
</Steps>

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

El despliegue utiliza un modelo de defensa de 4 capas:

1. **Firewall (UFW)** -- solo SSH (22) + Tailscale (41641/udp) expuestos públicamente
2. **VPN (Tailscale)** -- puerta de enlace accesible solo a través de la malla VPN
3. **Aislamiento de Docker** -- la cadena iptables DOCKER-USER previene la exposición de puertos externos
4. **Endurecimiento de Systemd** -- NoNewPrivileges, PrivateTmp, usuario sin privilegios

Para verificar su superficie de ataque externa:

```bash
nmap -p- YOUR_SERVER_IP
```

Solo el puerto 22 (SSH) debe estar abierto. Todos los demás servicios (puerta de enlace, Docker) están bloqueados.

Docker se instala para entornos de prueba de agentes (ejecución de herramientas aisladas), no para ejecutar la puerta de enlace en sí. Consulte [Multi-Agent Sandbox and Tools](/en/tools/multi-agent-sandbox-tools) para la configuración del entorno de prueba.

## Instalación manual

Si prefiere el control manual sobre la automatización:

<Steps>
  <Step title="Install prerequisites">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step title="Clone the repository">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step title="Install Ansible collections">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="Ejecutar el playbook">
    ```bash
    ./run-playbook.sh
    ```

    Alternativamente, ejecútelo directamente y luego ejecute manualmente el script de configuración después:
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # Then run: /tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## Actualizando

El instalador de Ansible configura OpenClaw para actualizaciones manuales. Consulte [Updating](/en/install/updating) para el flujo de actualización estándar.

Para volver a ejecutar el playbook de Ansible (por ejemplo, para cambios de configuración):

```bash
cd openclaw-ansible
./run-playbook.sh
```

Esto es idempotente y es seguro ejecutarlo varias veces.

## Solución de problemas

<AccordionGroup>
  <Accordion title="El firewall bloquea mi conexión">
    - Asegúrese de que puede acceder a través de la VPN Tailscale primero
    - El acceso SSH (puerto 22) siempre está permitido
    - La puerta de enlace es accesible solo a través de Tailscale por diseño
  </Accordion>
  <Accordion title="El servicio no se inicia">
    ```bash
    # Check logs
    sudo journalctl -u openclaw -n 100

    # Verify permissions
    sudo ls -la /opt/openclaw

    # Test manual start
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion title="Docker sandbox issues">
    ```bash
    # Verify Docker is running
    sudo systemctl status docker

    # Check sandbox image
    sudo docker images | grep openclaw-sandbox

    # Build sandbox image if missing
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    ```

  </Accordion>
  <Accordion title="El inicio de sesión del proveedor falla">
    Asegúrese de que se está ejecutando como el usuario `openclaw`:
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## Configuración avanzada

Para obtener información detallada sobre la arquitectura de seguridad y solución de problemas, consulte el repositorio openclaw-ansible:

- [Arquitectura de Seguridad](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Detalles Técnicos](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Guía de Solución de Problemas](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## Relacionado

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- guía completa de implementación
- [Docker](/en/install/docker) -- configuración de pasarela contenedorizada
- [Sandboxing](/en/gateway/sandboxing) -- configuración del espacio aislado (sandbox) del agente
- [Espacio aislado (Sandbox) y herramientas multiagente](/en/tools/multi-agent-sandbox-tools) -- aislamiento por agente
