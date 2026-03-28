---
summary: "Ejecuta OpenClaw Gateway 24/7 en un VPS barato de Hetzner (Docker) con estado duradero y binarios integrados"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw en Hetzner (Guía de VPS de producción con Docker)

## Objetivo

Ejecutar un OpenClaw Gateway persistente en un VPS de Hetzner usando Docker, con estado duradero, binarios integrados y un comportamiento de reinicio seguro.

Si quieres "OpenClaw 24/7 por ~$5", esta es la configuración más fiable y sencilla.
Los precios de Hetzner cambian; elige el VPS más pequeño de Debian/Ubuntu y escala si encuentras errores de falta de memoria (OOMs).

Recordatorio del modelo de seguridad:

- Los agentes compartidos por la empresa están bien cuando todos están dentro del mismo límite de confianza y el tiempo de ejecución es solo para negocios.
- Mantén una separación estricta: VPS/tiempo de ejecución dedicado + cuentas dedicadas; sin perfiles personales de Apple/Google/navegador/gestor de contraseñas en ese host.
- Si los usuarios son adversarios entre sí, sepáralos por gateway/host/usuario del SO.

Véase [Security](/es/gateway/security) y [VPS hosting](/es/vps).

## ¿Qué estamos haciendo (términos simples)?

- Alquilar un pequeño servidor Linux (VPS de Hetzner)
- Instalar Docker (tiempo de ejecución de aplicación aislado)
- Iniciar el OpenClaw Gateway en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la Interfaz de Control (Control UI) desde tu portátil a través de un túnel SSH

Se puede acceder al Gateway a través de:

- Redirección de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el firewall y los tokens tú mismo

Esta guía asume Ubuntu o Debian en Hetzner.  
Si está en otro VPS Linux, asigne los paquetes en consecuencia.
Para el flujo genérico de Docker, consulte [Docker](/es/install/docker).

---

## Camino rápido (operadores experimentados)

1. Aprovisionar VPS de Hetzner
2. Instalar Docker
3. Clonar el repositorio de OpenClaw
4. Crear directorios persistentes del host
5. Configure `.env` y `docker-compose.yml`
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
    Cree un VPS Ubuntu o Debian en Hetzner.

    Conéctese como root:

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    Esta guía asume que el VPS tiene estado.
    No lo trate como infraestructura desechable.

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

  <Step title="Clonar el repositorio de OpenClaw">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    Esta guía asume que construirá una imagen personalizada para garantizar la persistencia de los binarios.

  </Step>

  <Step title="Crear directorios persistentes en el host">
    Los contenedores Docker son efímeros.
    Todo el estado de larga duración debe residir en el host.

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="Configurar variables de entorno">
    Cree `.env` en la raíz del repositorio.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=change-me-now
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=change-me-now
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Genere secretos sólidos:

    ```bash
    openssl rand -hex 32
    ```

    **No confirme este archivo.**

  </Step>

  <Step title="Configuración de Docker Compose">
    Cree o actualice `docker-compose.yml`.

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

    `--allow-unconfigured` es solo por conveniencia de inicio, no es un reemplazo para una configuración de gateway adecuada. Aún así, configure la autenticación (`gateway.auth.token` o contraseña) y use configuraciones de enlace seguras para su implementación.

  </Step>

  <Step title="Pasos compartidos del tiempo de ejecución de VM Docker">
    Utilice la guía de tiempo de ejecución compartida para el flujo común de host Docker:

    - [Incluir los binarios necesarios en la imagen](/es/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construir e iniciar](/es/install/docker-vm-runtime#build-and-launch)
    - [Qué persiste dónde](/es/install/docker-vm-runtime#what-persists-where)
    - [Actualizaciones](/es/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Acceso específico de Hetzner">
    Después de los pasos compartidos de construcción e inicio, haga un túnel desde su portátil:

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    Abra:

    `http://127.0.0.1:18789/`

    Pegue su token de puerta de enlace.

  </Step>
</Steps>

El mapa de persistencia compartido se encuentra en [Docker VM Runtime](/es/install/docker-vm-runtime#what-persists-where).

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

> **Nota:** Mantenido por la comunidad. Para problemas o contribuciones, consulte los enlaces de los repositorios anteriores.

## Siguientes pasos

- Configure los canales de mensajería: [Canales](/es/channels)
- Configure la puerta de enlace: [Configuración de la puerta de enlace](/es/gateway/configuration)
- Mantenga OpenClaw actualizado: [Actualización](/es/install/updating)
