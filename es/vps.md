---
summary: "Centro de alojamiento VPS para OpenClaw (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - You want to run the Gateway in the cloud
  - You need a quick map of VPS/hosting guides
title: "Alojamiento VPS"
---

# Alojamiento VPS

Este centro enlaza con las guías de VPS/alojamiento compatibles y explica cómo funcionan las implementaciones en la nube a alto nivel.

## Elija un proveedor

- **Railway** (un clic + configuración en el navegador): [Railway](/es/install/railway)
- **Northflank** (un clic + configuración en el navegador): [Northflank](/es/install/northflank)
- **Oracle Cloud (Always Free)**: [Oracle](/es/platforms/oracle) — $0/mes (Always Free, ARM; la capacidad/registro puede ser delicado)
- **Fly.io**: [Fly.io](/es/install/fly)
- **Hetzner (Docker)**: [Hetzner](/es/install/hetzner)
- **GCP (Compute Engine)**: [GCP](/es/install/gcp)
- **exe.dev** (VM + proxy HTTPS): [exe.dev](/es/install/exe-dev)
- **AWS (EC2/Lightsail/nivel gratuito)**: también funciona bien. Guía en video:
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## Cómo funcionan las configuraciones en la nube

- El **Gateway se ejecuta en el VPS** y posee el estado + el espacio de trabajo.
- Se conecta desde su portátil/teléfono mediante la **Interfaz de usuario de control (Control UI)** o **Tailscale/SSH**.
- Trate el VPS como la fuente de verdad y **haga una copia de seguridad** del estado + el espacio de trabajo.
- Valor predeterminado seguro: mantenga el Gateway en loopback y acceda a él mediante túnel SSH o Tailscale Serve.
  Si se vincula a `lan`/`tailnet`, requiera `gateway.auth.token` o `gateway.auth.password`.

Acceso remoto: [Gateway remoto](/es/gateway/remote)  
Centro de plataformas: [Plataformas](/es/platforms)

## Agente compartido de la empresa en un VPS

Esta es una configuración válida cuando los usuarios están en un límite de confianza (por ejemplo, un equipo de empresa) y el agente es solo para negocios.

- Manténgalo en un tiempo de ejecución dedicado (VPS/VM/contenedor + cuentas de usuario de SO dedicadas).
- No inicie sesión en ese tiempo de ejecución con cuentas personales de Apple/Google o perfiles personales de navegador/gestor de contraseñas.
- Si los usuarios son adversarios entre sí, sepárelos por gateway/host/usuario del SO.

Detalles del modelo de seguridad: [Seguridad](/es/gateway/security)

## Uso de nodos con un VPS

Puede mantener la Gateway en la nube y vincular **nodos** en sus dispositivos locales
(Mac/iOS/Android/headless). Los nodos proporcionan capacidades de pantalla/cámara/canvas locales y `system.run`
mientras la Gateway permanece en la nube.

Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes)

## Ajustes de inicio para pequeñas máquinas virtuales y hosts ARM

Si los comandos de la CLI se sienten lentos en máquinas virtuales de baja potencia (o hosts ARM), habilite la caché de compilación de módulos de Node:

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` mejora los tiempos de inicio repetidos de los comandos.
- `OPENCLAW_NO_RESPAWN=1` evita la sobrecarga de inicio adicional de una ruta de autoreinicio.
- La primera ejecución del comando calienta la caché; las ejecuciones posteriores son más rápidas.
- Para detalles específicos de Raspberry Pi, consulte [Raspberry Pi](/es/platforms/raspberry-pi).

### lista de verificación de ajustes de systemd (opcional)

Para hosts de máquinas virtuales que utilizan `systemd`, considere:

- Añadir env de servicio para una ruta de inicio estable:
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Mantenga el comportamiento de reinicio explícito:
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Prefiera discos respaldados por SSD para rutas de estado/caché para reducir las penalizaciones de arranque en frío de E/S aleatoria.

Ejemplo:

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Cómo las políticas de `Restart=` ayudan a la recuperación automatizada:
[systemd puede automatizar la recuperación del servicio](https://www.redhat.com/en/blog/systemd-automate-recovery).

import es from "/components/footer/es.mdx";

<es />
