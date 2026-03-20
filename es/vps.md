---
summary: "Centro de alojamiento VPS para OpenClaw (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - Quieres ejecutar el Gateway en la nube
  - Necesitas un mapa rápido de guías de VPS/hosting
title: "Alojamiento VPS"
---

# Alojamiento VPS

Este centro enlaza con las guías de VPS/hosting compatibles y explica cómo
funcionan los despliegues en la nube a alto nivel.

## Elegir un proveedor

- **Railway** (un clic + configuración en el navegador): [Railway](/es/install/railway)
- **Northflank** (un clic + configuración en el navegador): [Northflank](/es/install/northflank)
- **Oracle Cloud (Always Free)**: [Oracle](/es/platforms/oracle) — $0/mes (Always Free, ARM; la capacidad/registro puede ser delicado)
- **Fly.io**: [Fly.io](/es/install/fly)
- **Hetzner (Docker)**: [Hetzner](/es/install/hetzner)
- **GCP (Compute Engine)**: [GCP](/es/install/gcp)
- **exe.dev** (VM + proxy HTTPS): [exe.dev](/es/install/exe-dev)
- **AWS (EC2/Lightsail/tier gratuito)**: también funciona bien. Guía en vídeo:
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## Cómo funcionan las configuraciones en la nube

- El **Gateway se ejecuta en el VPS** y posee el estado + el espacio de trabajo.
- Te conectas desde tu portátil/teléfono a través de la **Interfaz de control (Control UI)** o **Tailscale/SSH**.
- Trata el VPS como la fuente de verdad y haz una **copia de seguridad** del estado + espacio de trabajo.
- Valor predeterminado seguro: mantén el Gateway en loopback y accede a través de túnel SSH o Tailscale Serve.
  Si enlazas a `lan`/`tailnet`, exige `gateway.auth.token` o `gateway.auth.password`.

Acceso remoto: [Gateway remote](/es/gateway/remote)  
Centro de plataformas: [Platforms](/es/platforms)

## Agente compartido de la empresa en un VPS

Esta es una configuración válida cuando los usuarios están dentro de un mismo límite de confianza (por ejemplo, un equipo de una empresa) y el agente es solo para uso empresarial.

- Mantenlo en un tiempo de ejecución dedicado (VPS/VM/contenedor + usuario/cuentas de sistema dedicadas).
- No inicies sesión en ese tiempo de ejecución con cuentas personales de Apple/Google ni con perfiles personales de navegador/gestor de contraseñas.
- Si los usuarios son adversarios entre sí, sepáralos por gateway/host/usuario del sistema operativo.

Detalles del modelo de seguridad: [Security](/es/gateway/security)

## Usar nodos con un VPS

Puedes mantener la puerta de enlace (Gateway) en la nube y emparejar **nodos** en tus dispositivos locales (Mac/iOS/Android/sin interfaz gráfica). Los nodos proporcionan capacidades de pantalla/cámara/canvas locales y `system.run` mientras la puerta de enlace permanece en la nube.

Documentos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes)

## Ajustes de inicio para máquinas virtuales pequeñas y hosts ARM

Si los comandos de la CLI parecen lentos en máquinas virtuales de baja potencia (o hosts ARM), habilita la caché de compilación de módulos de Node:

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` mejora los tiempos de inicio de comandos repetidos.
- `OPENCLAW_NO_RESPAWN=1` evita la sobrecarga de inicio adicional de una ruta de auto-reinicio.
- La primera ejecución del comando calienta la caché; las ejecuciones posteriores son más rápidas.
- Para detalles específicos de Raspberry Pi, consulta [Raspberry Pi](/es/platforms/raspberry-pi).

### Lista de verificación de ajustes de systemd (opcional)

Para hosts de máquinas virtuales que usan `systemd`, considera:

- Añade variables de entorno de servicio para una ruta de inicio estable:
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Mantén el comportamiento de reinicio explícito:
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Prefiere discos con respaldo SSD para las rutas de estado/caché para reducir las penalizaciones de inicio en frío por E/S aleatoria.

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

import en from "/components/footer/en.mdx";

<en />
