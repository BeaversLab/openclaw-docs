---
summary: "Ejecutar OpenClaw en un servidor Linux o VPS en la nube — selector de proveedor, arquitectura y ajustes"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Servidor Linux"
sidebarTitle: "Servidor Linux"
---

# Servidor Linux

Ejecute el OpenClaw Gateway en cualquier servidor Linux o VPS en la nube. Esta página le ayuda a elegir un proveedor, explica cómo funcionan las implementaciones en la nube y cubre el ajuste genérico de Linux que se aplica en todas partes.

## Elegir un proveedor

<CardGroup cols={2}>
  <Card title="Railway" href="/en/install/railway">
    Configuración con un clic desde el navegador
  </Card>
  <Card title="Northflank" href="/en/install/northflank">
    Configuración con un clic desde el navegador
  </Card>
  <Card title="DigitalOcean" href="/en/install/digitalocean">
    VPS pago sencillo
  </Card>
  <Card title="Oracle Cloud" href="/en/install/oracle">
    Nivel ARM siempre gratuito
  </Card>
  <Card title="Fly.io" href="/en/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/en/install/hetzner">
    Docker en VPS de Hetzner
  </Card>
  <Card title="GCP" href="/en/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/en/install/azure">
    Máquina virtual Linux
  </Card>
  <Card title="exe.dev" href="/en/install/exe-dev">
    VM con proxy HTTPS
  </Card>
  <Card title="Raspberry Pi" href="/en/install/raspberry-pi">
    Autoalojado ARM
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / nivel gratuito)** también funciona bien.
Un video tutorial de la comunidad está disponible en
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(recurso de la comunidad -- podría dejar de estar disponible).

## Cómo funcionan las configuraciones en la nube

- El **Gateway se ejecuta en el VPS** y es propietario del estado + del espacio de trabajo.
- Te conectas desde tu portátil o teléfono mediante la **Interfaz de control (Control UI)** o **Tailscale/SSH**.
- Trata el VPS como la fuente de verdad y haz **copias de seguridad** del estado + del espacio de trabajo regularmente.
- Predeterminado seguro: mantén el Gateway en loopback y accede a él mediante túnel SSH o Tailscale Serve.
  Si te enlazas a `lan` o `tailnet`, requiere `gateway.auth.token` o `gateway.auth.password`.

Páginas relacionadas: [acceso remoto a Gateway](/en/gateway/remote), [centro de plataformas](/en/platforms).

## Agente empresarial compartido en un VPS

Ejecutar un solo agente para un equipo es una configuración válida cuando cada usuario está dentro del mismo límite de confianza y el agente es exclusivamente para el negocio.

- Manténlo en un tiempo de ejecución dedicado (VPS/VM/contenedor + usuario de sistema/cuentas dedicado).
- No inicies sesión en ese tiempo de ejecución con cuentas personales de Apple/Google ni perfiles personales de navegador/gestor de contraseñas.
- Si los usuarios son adversarios entre sí, sepáralos por gateway/host/usuario del SO.

Detalles del modelo de seguridad: [Seguridad](/en/gateway/security).

## Uso de nodos con un VPS

Puede mantener el Gateway en la nube y emparejar **nodos** en sus dispositivos locales
(Mac/iOS/Android/headless). Los nodos proporcionan capacidades de pantalla/cámara/lienzo y `system.run`
locales mientras el Gateway permanece en la nube.

Documentación: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes).

## Ajustes de inicio para máquinas virtuales pequeñas y hosts ARM

Si los comandos de la CLI parecen lentos en máquinas virtuales de baja potencia (o hosts ARM), habilite el caché de compilación de módulos de Node:

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
- La primera ejecución del comando calienta el caché; las ejecuciones posteriores son más rápidas.
- Para detalles específicos de Raspberry Pi, consulte [Raspberry Pi](/en/install/raspberry-pi).

### lista de verificación de ajustes de systemd (opcional)

Para hosts de VM que usan `systemd`, considere:

- Añadir variable de entorno al servicio para una ruta de inicio estable:
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Mantener el comportamiento de reinicio explícito:
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Se prefieren discos con respaldo SSD para rutas de estado/caché a fin de reducir las penalizaciones de arranque en frío por E/S aleatoria.

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
