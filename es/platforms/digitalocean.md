---
summary: "OpenClaw en DigitalOcean (opción de VPS de pago sencilla)"
read_when:
  - Configurar OpenClaw en DigitalOcean
  - Buscar alojamiento VPS barato para OpenClaw
title: "DigitalOcean"
---

# OpenClaw en DigitalOcean

## Objetivo

Ejecutar un OpenClaw Gateway persistente en DigitalOcean por **$6/mes** (o $4/mes con precios reservados).

Si quieres una opción de $0/mes y no te importa ARM + una configuración específica del proveedor, consulta la [guía de Oracle Cloud](/es/platforms/oracle).

## Comparación de costes (2026)

| Proveedor     | Plan            | Especificaciones                  | Precio/mes    | Notas                                 |
| ------------ | --------------- | ---------------------- | ----------- | ------------------------------------- |
| Oracle Cloud | Always Free ARM | hasta 4 OCPU, 24GB RAM | $0          | ARM, capacidad limitada / peculiaridades de registro |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | €3.79 (~$4) | Opción de pago más barata                  |
| DigitalOcean | Básico           | 1 vCPU, 1GB RAM        | $6          | Interfaz fácil, buena documentación                    |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6          | Muchas ubicaciones                        |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5          | Ahora parte de Akamai                    |

**Elegir un proveedor:**

- DigitalOcean: UX más simple + configuración predecible (esta guía)
- Hetzner: buen precio/rendimiento (ver [guía de Hetzner](/es/install/hetzner))
- Oracle Cloud: puede ser $0/mes, pero es más delicado y solo para ARM (ver [guía de Oracle](/es/platforms/oracle))

---

## Requisitos previos

- Cuenta de DigitalOcean ([registrarse con $200 de crédito gratuito](https://m.do.co/c/signup))
- Par de claves SSH (o disposición a usar autenticación por contraseña)
- ~20 minutos

## 1) Crear un Droplet

<Warning>
Use una imagen base limpia (Ubuntu 24.04 LTS). Evite las imágenes de un solo clic de Marketplace de terceros a menos que haya revisado sus scripts de inicio y valores predeterminados del firewall.
</Warning>

1. Inicie sesión en [DigitalOcean](https://cloud.digitalocean.com/)
2. Haga clic en **Create → Droplets**
3. Elija:
   - **Región:** La más cercana a usted (o a sus usuarios)
   - **Imagen:** Ubuntu 24.04 LTS
   - **Tamaño:** Basic → Regular → **$6/mes** (1 vCPU, 1GB RAM, 25GB SSD)
   - **Autenticación:** Clave SSH (recomendado) o contraseña
4. Haga clic en **Create Droplet**
5. Anote la dirección IP

## 2) Conectarse vía SSH

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) Instalar OpenClaw

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify
openclaw --version
```

## 4) Ejecutar el Asistente de configuración

```bash
openclaw onboard --install-daemon
```

El asistente le guiará a través de:

- Autenticación de modelo (claves API u OAuth)
- Configuración de canales (Telegram, WhatsApp, Discord, etc.)
- Token de Gateway (generado automáticamente)
- Instalación del demonio (systemd)

## 5) Verificar el Gateway

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) Acceder al Panel de control

De forma predeterminada, el gateway se enlaza al loopback. Para acceder a la interfaz de Control:

**Opción A: Túnel SSH (recomendado)**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**Opción B: Tailscale Serve (HTTPS, solo loopback)**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

Abrir: `https://<magicdns>/`

Notas:

- Serve mantiene el Gateway solo en bucle local (loopback) y autentica el tráfico de la interfaz de control/WebSocket mediante encabezados de identidad de Tailscale (la autenticación sin token asume un host de gateway confiable; las API HTTP todavía requieren token/contraseña).
- Para requerir token/contraseña en su lugar, configure `gateway.auth.allowTailscale: false` o use `gateway.auth.mode: "password"`.

**Opción C: Enlace de Tailnet (sin Serve)**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

Abrir: `http://<tailscale-ip>:18789` (se requiere token).

## 7) Conecte sus canales

### Telegram

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```bash
openclaw channels login whatsapp
# Scan QR code
```

Consulte [Canales](/es/channels) para otros proveedores.

---

## Optimizaciones para 1GB de RAM

El droplet de $6 solo tiene 1GB de RAM. Para que todo funcione sin problemas:

### Añadir swap (recomendado)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Usar un modelo más ligero

Si tiene errores de falta de memoria (OOM), considere:

- Usar modelos basados en API (Claude, GPT) en lugar de modelos locales
- Configurar `agents.defaults.model.primary` en un modelo más pequeño

### Monitorear la memoria

```bash
free -h
htop
```

---

## Persistencia

Todo el estado reside en:

- `~/.openclaw/` — configuración, credenciales, datos de sesión
- `~/.openclaw/workspace/` — espacio de trabajo (SOUL.md, memoria, etc.)

Estos sobreviven a los reinicios. Haz copias de seguridad periódicamente:

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Alternativa gratuita de Oracle Cloud

Oracle Cloud ofrece instancias ARM **Always Free** que son significativamente más potentes que cualquier opción de pago aquí — por $0/mes.

| Lo que obtienes      | Especificaciones                  |
| ----------------- | ---------------------- |
| **4 OCPUs**       | ARM Ampere A1          |
| **24GB RAM**      | Más que suficiente       |
| **200GB de almacenamiento** | Volumen en bloque           |
| **Gratis para siempre**  | Sin cargos a la tarjeta de crédito |

**Advertencias:**

- El registro puede ser complicado (reintenta si falla)
- Arquitectura ARM — la mayoría de las cosas funcionan, pero algunos binarios necesitan compilaciones para ARM

Para la guía completa de configuración, consulte [Oracle Cloud](/es/platforms/oracle). Para consejos de registro y solución de problemas del proceso de inscripción, consulte esta [guía de la comunidad](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd).

---

## Solución de problemas

### El Gateway no se inicia

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### Puerto ya en uso

```bash
lsof -i :18789
kill <PID>
```

### Sin memoria

```bash
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)
```

---

## Véase también

- [Guía de Hetzner](/es/install/hetzner) — más barato, más potente
- [Instalación con Docker](/es/install/docker) — configuración en contenedores
- [Tailscale](/es/gateway/tailscale) — acceso remoto seguro
- [Configuración](/es/gateway/configuration) — referencia completa de configuración

import en from "/components/footer/en.mdx";

<en />
