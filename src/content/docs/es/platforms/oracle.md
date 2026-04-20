---
summary: "OpenClaw en Oracle Cloud (Always Free ARM)"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for low-cost VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud (Plataforma)"
---

# OpenClaw en Oracle Cloud (OCI)

## Objetivo

Ejecutar un Gateway persistente de OpenClaw en el nivel **Always Free** ARM de Oracle Cloud.

El nivel gratuito de Oracle puede ser una gran opción para OpenClaw (especialmente si ya tienes una cuenta de OCI), pero tiene sus desventajas:

- Arquitectura ARM (la mayoría de las cosas funcionan, pero algunos binarios pueden ser solo x86)
- La capacidad y el registro pueden ser complicados

## Comparación de costos (2026)

| Proveedor    | Plan            | Especificaciones       | Precio/mes | Notas                               |
| ------------ | --------------- | ---------------------- | ---------- | ----------------------------------- |
| Oracle Cloud | Always Free ARM | hasta 4 OCPU, 24GB RAM | $0         | ARM, capacidad limitada             |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | ~ $4       | Opción de pago más barata           |
| DigitalOcean | Basic           | 1 vCPU, 1GB RAM        | $6         | Interfaz fácil, buena documentación |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6         | Muchas ubicaciones                  |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5         | Ahora parte de Akamai               |

---

## Requisitos previos

- Cuenta de Oracle Cloud ([registro](https://www.oracle.com/cloud/free/)) — consulte la [guía de registro de la comunidad](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) si encuentra problemas
- Cuenta de Tailscale (gratis en [tailscale.com](https://tailscale.com))
- ~30 minutos

## 1) Crear una instancia de OCI

1. Inicie sesión en [Oracle Cloud Console](https://cloud.oracle.com/)
2. Navega a **Compute → Instances → Create Instance**
3. Configura:
   - **Nombre:** `openclaw`
   - **Imagen:** Ubuntu 24.04 (aarch64)
   - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
   - **OCPUs:** 2 (o hasta 4)
   - **Memoria:** 12 GB (o hasta 24 GB)
   - **Volumen de arranque:** 50 GB (hasta 200 GB gratis)
   - **Clave SSH:** Añade tu clave pública
4. Haz clic en **Create**
5. Anota la dirección IP pública

**Consejo:** Si la creación de la instancia falla con "Out of capacity", prueba con un dominio de disponibilidad diferente o inténtalo más tarde. La capacidad del nivel gratuito es limitada.

## 2) Conectar y actualizar

```bash
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**Nota:** `build-essential` es necesario para la compilación ARM de algunas dependencias.

## 3) Configurar usuario y nombre de host

```bash
# Set hostname
sudo hostnamectl set-hostname openclaw

# Set password for ubuntu user
sudo passwd ubuntu

# Enable lingering (keeps user services running after logout)
sudo loginctl enable-linger ubuntu
```

## 4) Instalar Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

Esto habilita Tailscale SSH, por lo que puedes conectarte mediante `ssh openclaw` desde cualquier dispositivo en tu tailnet; no se necesita IP pública.

Verificar:

```bash
tailscale status
```

**De ahora en adelante, conéctate a través de Tailscale:** `ssh ubuntu@openclaw` (o usa la IP de Tailscale).

## 5) Instalar OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

Cuando se le pregunte "¿Cómo quieres incubar tu bot?", seleccione **"Hacer esto más tarde"**.

> Nota: Si encuentras problemas de compilación nativos de ARM, comienza con los paquetes del sistema (p. ej. `sudo apt install -y build-essential`) antes de recurrir a Homebrew.

## 6) Configure el Gateway (loopback + autenticación por token) y habilite Tailscale Serve

Utilice la autenticación por token como predeterminada. Es predecible y evita la necesidad de cualquier indicador de "autenticación insegura" en la interfaz de usuario de Control.

```bash
# Keep the Gateway private on the VM
openclaw config set gateway.bind loopback

# Require auth for the Gateway + Control UI
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# Expose over Tailscale Serve (HTTPS + tailnet access)
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway.service
```

`gateway.trustedProxies=["127.0.0.1"]` aquí es solo para el manejo de IP reenviada/cliente local del proxy Tailscale Serve local. **No** es `gateway.auth.mode: "trusted-proxy"`. Las rutas del visor Diff mantienen un comportamiento de cierre ante fallos en esta configuración: las solicitudes del visor `127.0.0.1` sin encabezados de proxy reenviados pueden devolver `Diff not found`. Use `mode=file` / `mode=both` para los adjuntos, o habilite intencionalmente los visores remotos y configure `plugins.entries.diffs.config.viewerBaseUrl` (o pase un proxy `baseUrl`) si necesita enlaces de visor compartibles.

## 7) Verificar

```bash
# Check version
openclaw --version

# Check daemon status
systemctl --user status openclaw-gateway.service

# Check Tailscale Serve
tailscale serve status

# Test local response
curl http://localhost:18789
```

## 8) Bloquear la seguridad de VCN

Ahora que todo funciona, bloquee la VCN para bloquear todo el tráfico excepto Tailscale. La Virtual Cloud Network de OCI actúa como un firewall en el borde de la red: el tráfico se bloquea antes de llegar a su instancia.

1. Vaya a **Networking → Virtual Cloud Networks** en la consola de OCI
2. Haga clic en su VCN → **Security Lists** → Default Security List
3. **Elimine** todas las reglas de entrada, excepto:
   - `0.0.0.0/0 UDP 41641` (Tailscale)
4. Mantenga las reglas de salida predeterminadas (permitir todo el tráfico saliente)

Esto bloquea SSH en el puerto 22, HTTP, HTTPS y todo lo demás en el borde de la red. A partir de ahora, solo puede conectarse a través de Tailscale.

---

## Acceder a la interfaz de usuario de control

Desde cualquier dispositivo en su red Tailscale:

```
https://openclaw.<tailnet-name>.ts.net/
```

Reemplace `<tailnet-name>` con su nombre de tailnet (visible en `tailscale status`).

No se necesita túnel SSH. Tailscale proporciona:

- Cifrado HTTPS (certificados automáticos)
- Autenticación a través de la identidad de Tailscale
- Acceso desde cualquier dispositivo en su tailnet (portátil, teléfono, etc.)

---

## Seguridad: VCN + Tailscale (línea base recomendada)

Con la VCN bloqueada (solo abierto el puerto UDP 41641) y el Gateway vinculado al loopback, obtiene una fuerte defensa en profundidad: el tráfico público se bloquea en el borde de la red y el acceso de administrador se realiza a través de su tailnet.

Esta configuración a menudo elimina la _necesidad_ de reglas de firewall basadas en host adicionales puramente para detener la fuerza bruta SSH en toda Internet, pero aun así debes mantener el sistema operativo actualizado, ejecutar `openclaw security audit` y verificar que no estás escuchando accidentalmente en interfaces públicas.

### Ya protegido

| Paso tradicional                 | ¿Necesario?   | Por qué                                                                                     |
| -------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| Firewall UFW                     | No            | La VCN bloquea antes de que el tráfico llegue a la instancia                                |
| fail2ban                         | No            | Sin fuerza bruta si el puerto 22 está bloqueado en la VCN                                   |
| Endurecimiento de sshd           | No            | SSH de Tailscale no usa sshd                                                                |
| Deshabilitar acceso de root      | No            | Tailscale usa la identidad de Tailscale, no usuarios del sistema                            |
| Autenticación solo por clave SSH | No            | Tailscale se autentica a través de tu tailnet                                               |
| Endurecimiento de IPv6           | Usualmente no | Depende de la configuración de tu VCN/subred; verifica qué está realmente asignado/expuesto |

### Aún recomendado

- **Permisos de credenciales:** `chmod 700 ~/.openclaw`
- **Auditoría de seguridad:** `openclaw security audit`
- **Actualizaciones del sistema:** `sudo apt update && sudo apt upgrade` regularmente
- **Monitorear Tailscale:** Revisa los dispositivos en la [consola de administración de Tailscale](https://login.tailscale.com/admin)

### Verificar la postura de seguridad

```bash
# Confirm no public ports listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh
```

---

## Alternativa: Túnel SSH

Si Tailscale Serve no funciona, usa un túnel SSH:

```bash
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Luego abre `http://localhost:18789`.

---

## Solución de problemas

### Error en la creación de la instancia ("Sin capacidad")

Las instancias ARM de nivel gratuito son populares. Intenta:

- Un dominio de disponibilidad diferente
- Reintentar en horas fuera de punta (temprano en la mañana)
- Usa el filtro "Always Free" al seleccionar la forma (shape)

### Tailscale no se conectará

```bash
# Check status
sudo tailscale status

# Re-authenticate
sudo tailscale up --ssh --hostname=openclaw --reset
```

### El Gateway no se iniciará

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway.service -n 50
```

### No se puede acceder a la Interfaz de Control

```bash
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway.service
```

### Problemas con binarios ARM

Algunas herramientas pueden no tener compilaciones para ARM. Verifica:

```bash
uname -m  # Should show aarch64
```

La mayoría de los paquetes npm funcionan bien. Para binarios, busca lanzamientos `linux-arm64` o `aarch64`.

---

## Persistencia

Todo el estado vive en:

- `~/.openclaw/` — `openclaw.json`, estado `auth-profiles.json` por agente, estado de canal/proveedor y datos de sesión
- `~/.openclaw/workspace/` — espacio de trabajo (SOUL.md, memoria, artefactos)

Realiza copias de seguridad periódicamente:

```bash
openclaw backup create
```

---

## Véase también

- [Acceso remoto a Gateway](/es/gateway/remote) — otros patrones de acceso remoto
- [Integración con Tailscale](/es/gateway/tailscale) — documentación completa de Tailscale
- [Configuración de Gateway](/es/gateway/configuration) — todas las opciones de configuración
- [guía de DigitalOcean](/es/platforms/digitalocean) — si quieres de pago + registro más sencillo
- [guía de Hetzner](/es/install/hetzner) — alternativa basada en Docker
