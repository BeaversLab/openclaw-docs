---
summary: "Ejecuta OpenClaw Gateway 24/7 en un VPS barato de Hetzner (Docker) con estado duradero y binarios integrados"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

## Objetivo

Ejecuta un OpenClaw Gateway persistente en un VPS de Hetzner usando Docker, con estado duradero, binarios integrados y un comportamiento de reinicio seguro.

Si quieres "OpenClaw 24/7 por ~$5", esta es la configuración más sencilla y confiable.
Los precios de Hetzner cambian; elige el VPS más pequeño de Debian/Ubuntu y escala si experimentas errores de falta de memoria (OOMs).

Recordatorio del modelo de seguridad:

- Los agentes compartidos por la empresa están bien cuando todos están en el mismo límite de confianza y el tiempo de ejecución es solo para negocios.
- Mantén una separación estricta: VPS/tiempo de ejecución dedicado + cuentas dedicadas; sin perfiles personales de Apple/Google/navegador/gestor de contraseñas en ese host.
- Si los usuarios son adversarios entre sí, sepáralos por puerta de enlace/host/usuario del sistema operativo.

Consulta [Seguridad](/es/gateway/security) y [Alojamiento VPS](/es/vps).

## ¿Qué estamos haciendo (en términos sencillos)?

- Alquilar un servidor Linux pequeño (VPS de Hetzner)
- Instalar Docker (entorno de ejecución de aplicación aislado)
- Iniciar el OpenClaw Gateway en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la Interfaz de Control desde tu portátil a través de un túnel SSH

Ese estado `~/.openclaw` montado incluye `openclaw.json`, por agente
`agents/<agentId>/agent/auth-profiles.json`, y `.env`.

Se puede acceder al Gateway a través de:

- Redirección de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el firewall y los tokens tú mismo

Esta guía asume Ubuntu o Debian en Hetzner.  
Si estás en otro VPS de Linux, asigna los paquetes correspondientemente.
Para el flujo genérico de Docker, consulta [Docker](/es/install/docker).

---

## Camino rápido (operadores experimentados)

1. Aprovisionar VPS de Hetzner
2. Instalar Docker
3. Clonar el repositorio de OpenClaw
4. Crear directorios persistentes del host
5. Configurar `.env` y `docker-compose.yml`
6. Integrar los binarios necesarios en la imagen
7. `docker compose up -d`
8. Verificar la persistencia y el acceso al Gateway

---

## Lo que necesitas

- VPS de Hetzner con acceso root
- Acceso SSH desde tu portátil
- Conocimientos básicos de SSH + copiar/pegar
- ~20 minutos
- Docker y Docker Compose
- Credenciales de autenticación del modelo
- Credenciales opcionales del proveedor
  - Código QR de WhatsApp
  - Token del bot de Telegram
  - OAuth de Gmail

---

<Steps>
  <Step title="Aprovisionar el VPS">
    Crea un VPS de Ubuntu o Debian en Hetzner.

    Conecta como root:

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    Esta guía asume que el VPS tiene estado.
    No lo trates como infraestructura desechable.

  </Step>

  <Step title="Instalar Docker (en el VPS)">
    ```bash
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    ```

    Verificar:

    ```bash
    docker --version
    docker compose version
    ```

  </Step>

  <Step title="Clona el repositorio de OpenClaw">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    Esta guía asume que construirás una imagen personalizada para garantizar la persistencia de los binarios.

  </Step>

  <Step title="Crear directorios persistentes del host">
    Los contenedores de Docker son efímeros.
    Todo el estado de larga duración debe residir en el host.

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="Configurar variables de entorno">
    Crea `.env` en la raíz del repositorio.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Establece `OPENCLAW_GATEWAY_TOKEN` cuando quieras gestionar el token estable de la puerta de enlace
    a través de `.env`; de lo contrario, configura `gateway.auth.token` antes
    de confiar en los clientes a través de reinicios. Si ninguna fuente existe, OpenClaw usa
    un token solo de tiempo de ejecución para ese inicio. Genera una contraseña del llavero y pégala
    en `GOG_KEYRING_PASSWORD`:

    ```bash
    openssl rand -hex 32
    ```

    **No confirmes (commitees) este archivo.**

    Este archivo `.env` es para el entorno del contenedor/tiempo de ejecución, como `OPENCLAW_GATEWAY_TOKEN`.
    La autenticación almacenada de OAuth/API-key del proveedor reside en el
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` montado.

  </Step>

  <Step title="Configuración de Docker Compose">
    Crea o actualiza `docker-compose.yml`.

    ```yaml
    services:
      openclaw-gateway:
        image: ${OPENCLAW_IMAGE}
        build: .
        restart: unless-stopped
        env_file:
          - .env
        environment:
          - HOME=/home/node
          - NODE_ENV=production
          - TERM=xterm-256color
          - OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND}
          - OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT}
          - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
          - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
          - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
          - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
        volumes:
          - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
          - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
        ports:
          # Recommended: keep the Gateway loopback-only on the VPS; access via SSH tunnel.
          # To expose it publicly, remove the `127.0.0.1:` prefix and firewall accordingly.
          - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"
        command:
          [
            "node",
            "dist/index.js",
            "gateway",
            "--bind",
            "${OPENCLAW_GATEWAY_BIND}",
            "--port",
            "${OPENCLAW_GATEWAY_PORT}",
            "--allow-unconfigured",
          ]
    ```

    `--allow-unconfigured` es solo por conveniencia para el arranque, no es un reemplazo para una configuración adecuada de la puerta de enlace. Aún así, establece la autenticación (`gateway.auth.token` o contraseña) y usa configuraciones de enlace (bind) seguras para tu implementación.

  </Step>

  <Step title="Pasos de tiempo de ejecución compartidos de Docker VM">
    Usa la guía de tiempo de ejecución compartido para el flujo común de host Docker:

    - [Hornear los binarios necesarios en la imagen](/es/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construir y lanzar](/es/install/docker-vm-runtime#build-and-launch)
    - [Qué persiste dónde](/es/install/docker-vm-runtime#what-persists-where)
    - [Actualizaciones](/es/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Acceso específico para Hetzner">
    Después de los pasos de construcción e inicio compartidos, complete la siguiente configuración para abrir el túnel:

    **Requisito previo:** Asegúrese de que la configuración sshd de su VPS permita el reenvío TCP. Si
    ha endurecido su configuración SSH, verifique `/etc/ssh/sshd_config` y establezca:

    ```
    AllowTcpForwarding local
    ```

    `local` permite `ssh -L` reenvíos locales desde su portátil mientras bloquea
    los reenvíos remotos desde el servidor. Establecerlo en `no` hará fallar el túnel
    con:
    `channel 3: open failed: administratively prohibited: open failed`

    Después de confirmar que el reenvío TCP está habilitado, reinicie el servicio SSH
    (`systemctl restart ssh`) y ejecute el túnel desde su portátil:

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    Abra:

    `http://127.0.0.1:18789/`

    Pegue el secreto compartido configurado. Esta guía utiliza el token de puerta de enlace por
    defecto; si cambió a la autenticación por contraseña, use esa contraseña en su lugar.

  </Step>
</Steps>

El mapa de persistencia compartido reside en [Docker VM Runtime](/es/install/docker-vm-runtime#what-persists-where).

## Infraestructura como código (Terraform)

Para equipos que prefieren flujos de trabajo de infraestructura como código, una configuración de Terraform mantenida por la comunidad proporciona:

- Configuración modular de Terraform con gestión de estado remoto
- Aprovisionamiento automatizado mediante cloud-init
- Scripts de implementación (inicio, despliegue, copia de seguridad/restauración)
- Endurecimiento de seguridad (cortafuegos, UFW, acceso solo SSH)
- Configuración de túnel SSH para el acceso a la puerta de enlace

**Repositorios:**

- Infraestructura: [openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Configuración de Docker: [openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

Este enfoque complementa la configuración de Docker anterior con implementaciones reproducibles, infraestructura controlada por versiones y recuperación ante desastres automatizada.

<Note>Mantenido por la comunidad. Para problemas o contribuciones, consulte los enlaces de los repositorios anteriores.</Note>

## Siguientes pasos

- Configurar canales de mensajería: [Canales](/es/channels)
- Configurar la puerta de enlace: [Configuración de la puerta de enlace](/es/gateway/configuration)
- Mantener OpenClaw actualizado: [Actualización](/es/install/updating)

## Relacionado

- [Resumen de instalación](/es/install)
- [Fly.io](/es/install/fly)
- [Docker](/es/install/docker)
- [Alojamiento VPS](/es/vps)
