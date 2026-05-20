---
summary: "Ejecutar OpenClaw en un servidor Linux o VPS en la nube — selector de proveedor, arquitectura y ajustes"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Servidor Linux"
sidebarTitle: "Servidor Linux"
---

Ejecute OpenClaw Gateway en cualquier servidor Linux o VPS en la nube. Esta página le ayuda
a elegir un proveedor, explica cómo funcionan las implementaciones en la nube y cubre la optimización genérica de Linux
que se aplica en todas partes.

## Elija un proveedor

<CardGroup cols={2}>
  <Card title="Railway" href="/es/install/railway">
    Configuración en el navegador con un clic
  </Card>
  <Card title="Northflank" href="/es/install/northflank">
    Configuración en el navegador con un clic
  </Card>
  <Card title="DigitalOcean" href="/es/install/digitalocean">
    VPS pago simple
  </Card>
  <Card title="Oracle Cloud" href="/es/install/oracle">
    Nivel ARM siempre gratuito
  </Card>
  <Card title="Fly.io" href="/es/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/es/install/hetzner">
    Docker en VPS de Hetzner
  </Card>
  <Card title="Hostinger" href="/es/install/hostinger">
    VPS con configuración con un clic
  </Card>
  <Card title="GCP" href="/es/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/es/install/azure">
    Máquina virtual Linux
  </Card>
  <Card title="exe.dev" href="/es/install/exe-dev">
    VM con proxy HTTPS
  </Card>
  <Card title="Raspberry Pi" href="/es/install/raspberry-pi">
    Autogestionado en ARM
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / nivel gratuito)** también funciona bien.
Hay un recorrido en video comunitario disponible en
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(recurso de la comunidad -- puede dejar de estar disponible).

## Cómo funcionan las configuraciones en la nube

- El **Gateway se ejecuta en el VPS** y es propietario del estado + del espacio de trabajo.
- Te conectas desde tu portátil o teléfono mediante la **Interfaz de control (Control UI)** o **Tailscale/SSH**.
- Trata el VPS como la fuente de verdad y haz **copias de seguridad** del estado + del espacio de trabajo regularmente.
- Predeterminado seguro: mantenga el Gateway en loopback y acceda a él mediante túnel SSH o Tailscale Serve.
  Si se vincula a `lan` o `tailnet`, requiera `gateway.auth.token` o `gateway.auth.password`.

Páginas relacionadas: [Acceso remoto a Gateway](/es/gateway/remote), [Centro de plataformas](/es/platforms).

## Endurezca el acceso de administrador primero

Antes de instalar OpenClaw en un VPS público, decida cómo desea administrar
el servidor en sí.

- Si desea acceso de administrador solo a través de Tailnet, instale Tailscale primero, una el VPS
  a su tailnet, verifique una segunda sesión SSH a través de la IP de Tailscale o
  el nombre de MagicDNS, y luego restringa el SSH público.
- Si no está utilizando Tailscale, aplique el endurecimiento equivalente para su ruta
  de SSH antes de exponer más servicios.
- Esto es independiente del acceso a Gateway. Aún puede mantener OpenClaw vinculado
  al loopback y usar un túnel SSH o Tailscale Serve para el panel de control.

Las opciones de Gateway específicas de Tailscale se encuentran en [Tailscale](/es/gateway/tailscale).

## Agente compartido de la empresa en un VPS

Ejecutar un solo agente para un equipo es una configuración válida cuando cada usuario está en el mismo límite de confianza y el agente es exclusivamente para negocios.

- Manténgalo en un tiempo de ejecución dedicado (VPS/VM/contenedor + usuario de SO/cuentas dedicado).
- No inicie sesión en ese tiempo de ejecución con cuentas personales de Apple/Google o perfiles personales de navegador/gestor de contraseñas.
- Si los usuarios son adversarios entre sí, sepárelos por gateway/host/usuario de SO.

Detalles del modelo de seguridad: [Seguridad](/es/gateway/security).

## Uso de nodos con un VPS

Puede mantener el Gateway en la nube y emparejar **nodos** en sus dispositivos locales
(Mac/iOS/Android/headless). Los nodos proporcionan pantalla/cámara/lienzo local y `system.run`
capacidades mientras el Gateway permanece en la nube.

Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

## Ajuste de inicio para pequeñas VMs y hosts ARM

Si los comandos de la CLI se sienten lentos en VMs de baja potencia (o hosts ARM), habilite la caché de compilación de módulos de Node:

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` mejora los tiempos de inicio de comandos repetidos.
- `OPENCLAW_NO_RESPAWN=1` mantiene los reinicios rutinarios del Gateway en proceso, lo que evita transferencias de procesos adicionales y mantiene el seguimiento de PIDs simple en hosts pequeños.
- La primera ejecución del comando calienta la caché; las ejecuciones posteriores son más rápidas.
- Para detalles específicos de Raspberry Pi, consulte [Raspberry Pi](/es/install/raspberry-pi).

### Lista de verificación de ajuste de systemd (opcional)

Para hosts de VM que usan `systemd`, considere:

- Añada env de servicio para una ruta de inicio estable:
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Mantenga el comportamiento de reinicio explícito:
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Prefiera discos con soporte SSD para las rutas de estado/caché para reducir las penalizaciones de inicio en frío por E/S aleatoria.

Para la ruta estándar `openclaw onboard --install-daemon`, edite la unidad de usuario:

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Si instaló deliberadamente una unidad del sistema en su lugar, edite
`openclaw-gateway.service` mediante `sudo systemctl edit openclaw-gateway.service`.

Cómo las políticas de `Restart=` ayudan a la recuperación automatizada:
[systemd puede automatizar la recuperación del servicio](https://www.redhat.com/en/blog/systemd-automate-recovery).

Para el comportamiento OOM de Linux, la selección de víctimas de procesos secundarios y los diagnósticos de `exit 137`,
consulte [Presión de memoria de Linux y eliminaciones OOM](/es/platforms/linux#memory-pressure-and-oom-kills).

## Relacionado

- [Resumen de instalación](/es/install)
- [DigitalOcean](/es/install/digitalocean)
- [Fly.io](/es/install/fly)
- [Hetzner](/es/install/hetzner)
