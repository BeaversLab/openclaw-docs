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
    VPS de pago sencillo
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
  <Card title="Hostinger" href="/en/install/hostinger">
    VPS con configuración con un clic
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
    Autohospedaje ARM
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / nivel gratuito)** también funciona bien.
Un recorrido en video de la comunidad está disponible en
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(recurso de la comunidad -- puede dejar de estar disponible).

## Cómo funcionan las configuraciones en la nube

- El **Gateway se ejecuta en el VPS** y posee el estado + el espacio de trabajo.
- Se conecta desde su portátil o teléfono mediante la **Interfaz de usuario de control** o **Tailscale/SSH**.
- Trate el VPS como la fuente de verdad y **realice copias de seguridad** del estado + el espacio de trabajo con regularidad.
- Valor predeterminado seguro: mantenga el Gateway en loopback y acceda a él mediante túnel SSH o Tailscale Serve.
  Si se vincula a `lan` o `tailnet`, exija `gateway.auth.token` o `gateway.auth.password`.

Páginas relacionadas: [Acceso remoto a Gateway](/en/gateway/remote), [Centro de plataformas](/en/platforms).

## Agente compartido de la empresa en un VPS

Ejecutar un solo agente para un equipo es una configuración válida cuando cada usuario está dentro del mismo límite de confianza y el agente es exclusivamente para negocios.

- Manténgalo en un tiempo de ejecución dedicado (VPS/VM/contenedor + usuario/cuentas de sistema operativo dedicados).
- No inicie sesión en ese tiempo de ejecución con cuentas personales de Apple/Google ni perfiles personales de navegador/gestor de contraseñas.
- Si los usuarios son adversarios entre sí, sepárelos por gateway/host/usuario del sistema operativo.

Detalles del modelo de seguridad: [Seguridad](/en/gateway/security).

## Uso de nodos con un VPS

Puede mantener el Gateway en la nube y emparejar **nodos** en sus dispositivos locales
(Mac/iOS/Android/headless). Los nodos proporcionan pantalla/cámara/lienzo local y `system.run`
capacidades mientras el Gateway permanece en la nube.

Documentación: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes).

## Ajustes de inicio para máquinas virtuales pequeñas y hosts ARM

Si los comandos de la CLI parecen lentos en máquinas virtuales de baja potencia (o hosts ARM), activa la caché de compilación de módulos de Node:

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
- Para detalles específicos de Raspberry Pi, consulta [Raspberry Pi](/en/install/raspberry-pi).

### Lista de verificación de ajustes de systemd (opcional)

Para hosts de VM que usen `systemd`, considera:

- Añade una variable de entorno de servicio para una ruta de inicio estable:
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Mantén el comportamiento de reinicio explícito:
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Prefiere discos con respaldo SSD para las rutas de estado/caché para reducir las penalizaciones de inicio en frío por E/S aleatoria.

Para la ruta estándar `openclaw onboard --install-daemon`, edita la unidad de usuario:

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

Si instalaste deliberadamente una unidad del sistema en su lugar, edita
`openclaw-gateway.service` a través de `sudo systemctl edit openclaw-gateway.service`.

Cómo las políticas de `Restart=` ayudan a la recuperación automatizada:
[systemd puede automatizar la recuperación del servicio](https://www.redhat.com/en/blog/systemd-automate-recovery).
