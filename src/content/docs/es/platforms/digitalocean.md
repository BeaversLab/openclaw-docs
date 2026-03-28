---
summary: "OpenClaw en DigitalOcean (opción de VPS pago simple)"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean (Plataforma)"
---

# OpenClaw en DigitalOcean

## Objetivo

Ejecutar un Gateway OpenClaw persistente en DigitalOcean por **$6/mes** (o $4/mes con precio reservado).

Si desea una opción de $0/mes y no le importa ARM + una configuración específica del proveedor, consulte la [guía de Oracle Cloud](/es/platforms/oracle).

## Comparación de costos (2026)

| Proveedor    | Plan            | Especificaciones       | Precio/mes  | Notas                                                |
| ------------ | --------------- | ---------------------- | ----------- | ---------------------------------------------------- |
| Oracle Cloud | Always Free ARM | hasta 4 OCPU, 24GB RAM | $0          | ARM, capacidad limitada / peculiaridades de registro |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | €3.79 (~$4) | Opción de pago más barata                            |
| DigitalOcean | Básico          | 1 vCPU, 1GB RAM        | $6          | Interfaz de usuario fácil, buena documentación       |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6          | Muchas ubicaciones                                   |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5          | Ahora parte de Akamai                                |

**Elegir un proveedor:**

- DigitalOcean: la experiencia de usuario más simple + configuración predecible (esta guía)
- Hetzner: buen precio/rendimiento (consulte la [guía de Hetzner](/es/install/hetzner))
- Oracle Cloud: puede ser $0/mes, pero es más complicado y solo para ARM (consulte la [guía de Oracle](/es/platforms/oracle))

---

## Requisitos previos

- Cuenta de DigitalOcean ([regístrese con $200 de crédito gratuito](https://m.do.co/c/signup))
- Par de claves SSH (o disposición a usar autenticación por contraseña)
- ~20 minutos

## 1) Crear un Droplet

<Warning>Utilice una imagen base limpia (Ubuntu 24.04 LTS). Evite las imágenes de un clic del Marketplace de terceros a menos que haya revisado sus scripts de inicio y configuraciones predeterminadas del firewall.</Warning>

1. Inicie sesión en [DigitalOcean](https://cloud.digitalocean.com/)
2. Haga clic en **Create → Droplets**
3. Elija:
   - **Región:** La más cercana a usted (o a sus usuarios)
   - **Imagen:** Ubuntu 24.04 LTS
   - **Tamaño:** Básico → Regular → **$6/mes** (1 vCPU, 1GB RAM, 25GB SSD)
   - **Autenticación:** Clave SSH (recomendado) o contraseña
4. Haga clic en **Create Droplet**
5. Tome nota de la dirección IP

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

## 4) Ejecutar la incorporación

```bash
openclaw onboard --install-daemon
```

El asistente le guiará a través de:

- Autenticación del modelo (claves API u OAuth)
- Configuración del canal (Telegram, WhatsApp, Discord, etc.)
- Token del Gateway (generado automáticamente)
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

## 6) Acceder al Dashboard

De forma predeterminada, el gateway se enlaza al loopback. Para acceder a la Interfaz de Control:

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

- Serve mantiene el Gateway solo en loopback y autentica el tráfico de la Interfaz de Control/WebSocket a través de encabezados de identidad de Tailscale (la autenticación sin token asume un host de gateway confiable; las API HTTP aún requieren token/contraseña).
- Para requerir token/contraseña en su lugar, configure `gateway.auth.allowTailscale: false` o use `gateway.auth.mode: "password"`.

**Opción C: Tailnet bind (sin Serve)**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

Abrir: `http://<tailscale-ip>:18789` (se requiere token).

## 7) Conecte sus Canales

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

El droplet de $6 solo tiene 1GB de RAM. Para mantener todo funcionando sin problemas:

### Añadir swap (recomendado)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Usar un modelo más ligero

Si está experimentando errores de falta de memoria (OOMs), considere:

- Usar modelos basados en API (Claude, GPT) en lugar de modelos locales
- Configurar `agents.defaults.model.primary` con un modelo más pequeño

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

Estos sobreviven a los reinicios. Hágales una copia de seguridad periódicamente:

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Alternativa Gratuita en Oracle Cloud

Oracle Cloud ofrece instancias ARM **Always Free** que son significativamente más potentes que cualquier opción de pago aquí — por $0/mes.

| Lo que obtiene              | Especificaciones                   |
| --------------------------- | ---------------------------------- |
| **4 OCPUs**                 | ARM Ampere A1                      |
| **24GB RAM**                | Más que suficiente                 |
| **200GB de almacenamiento** | Volumen de bloque                  |
| **Gratis para siempre**     | Sin cargos a la tarjeta de crédito |

**Advertencias:**

- El registro puede ser complicado (intente de nuevo si falla)
- Arquitectura ARM — la mayoría de las cosas funcionan, pero algunos binarios necesitan compilaciones para ARM

Para la guía completa de configuración, consulte [Oracle Cloud](/es/platforms/oracle). Para consejos de registro y solución de problemas del proceso de inscripción, consulte esta [guía de la comunidad](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd).

---

## Solución de Problemas

### La puerta de enlace no se iniciará

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

## Véase También

- [Guía de Hetzner](/es/install/hetzner) — más barato, más potente
- [Instalación con Docker](/es/install/docker) — configuración en contenedores
- [Tailscale](/es/gateway/tailscale) — acceso remoto seguro
- [Configuración](/es/gateway/configuration) — referencia completa de configuración
