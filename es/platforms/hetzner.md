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

Si quieres "OpenClaw 24/7 por ~$5", esta es la configuración más sencilla y confiable.
Los precios de Hetzner cambian; elige el VPS más pequeño de Debian/Ubuntu y escala si experimentas errores de falta de memoria (OOMs).

## ¿Qué estamos haciendo (en términos simples)?

- Alquilar un servidor Linux pequeño (VPS de Hetzner)
- Instalar Docker (entorno de ejecución de aplicación aislado)
- Iniciar el OpenClaw Gateway en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la Interfaz de Control (UI) desde tu portátil a través de un túnel SSH

Se puede acceder al Gateway a través de:

- Redirección de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el cortafuegos y los tokens tú mismo

Esta guía asume Ubuntu o Debian en Hetzner.  
Si estás en otro VPS de Linux, mapea los paquetes correspondientemente.
Para el flujo genérico de Docker, consulta [Docker](/es/install/docker).

---

## Ruta rápida (operadores experimentados)

1. Aprovisionar VPS de Hetzner
2. Instalar Docker
3. Clonar el repositorio de OpenClaw
4. Crear directorios persistentes en el host
5. Configurar `.env` y `docker-compose.yml`
6. Integrar los binarios necesarios en la imagen
7. `docker compose up -d`
8. Verificar la persistencia y el acceso al Gateway

---

## Lo que necesitas

- VPS de Hetzner con acceso root
- Acceso SSH desde tu portátil
- Conocimiento básico de SSH + copiar/pegar
- ~20 minutos
- Docker y Docker Compose
- Credenciales de autenticación del modelo
- Credenciales opcionales del proveedor
  - Código QR de WhatsApp
  - Token del bot de Telegram
  - OAuth de Gmail

---

## 1) Aprovisionar el VPS

Crea un VPS de Ubuntu o Debian en Hetzner.

Conecta como root:

```bash
ssh root@YOUR_VPS_IP
```

Esta guía asume que el VPS tiene estado.
No lo trates como infraestructura desechable.

---

## 2) Instalar Docker (en el VPS)

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

---

## 3) Clonar el repositorio de OpenClaw

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

Esta guía asume que construirás una imagen personalizada para garantizar la persistencia de los binarios.

---

## 4) Crear directorios persistentes en el host

Los contenedores de Docker son efímeros.
Todo el estado de larga duración debe residir en el host.

```bash
mkdir -p /root/.openclaw
mkdir -p /root/.openclaw/workspace

# Set ownership to the container user (uid 1000):
chown -R 1000:1000 /root/.openclaw
chown -R 1000:1000 /root/.openclaw/workspace
```

---

## 5) Configurar las variables de entorno

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

Genere secretos seguros:

```bash
openssl rand -hex 32
```

**No confirme este archivo.**

---

## 6) Configuración de Docker Compose

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

      # Optional: only if you run iOS/Android nodes against this VPS and need Canvas host.
      # If you expose this publicly, read /gateway/security and firewall accordingly.
      # - "18793:18793"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT}",
      ]
```

---

## 7) Integrar los binarios necesarios en la imagen (crítico)

Instalar binarios dentro de un contenedor en ejecución es una trampa.
Cualquier cosa instalada en tiempo de ejecución se perderá al reiniciar.

Todos los binarios externos requeridos por las habilidades deben instalarse en el momento de la compilación de la imagen.

Los ejemplos a continuación muestran solo tres binarios comunes:

- `gog` para acceso a Gmail
- `goplaces` para Google Places
- `wacli` para WhatsApp

Estos son ejemplos, no una lista completa.
Puede instalar tantos binarios como sea necesario utilizando el mismo patrón.

Si agrega nuevas habilidades más tarde que dependen de binarios adicionales, debe:

1. Actualizar el Dockerfile
2. Reconstruir la imagen
3. Reiniciar los contenedores

**Dockerfile de ejemplo**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 8) Construir e iniciar

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Verificar binarios:

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

Salida esperada:

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 9) Verificar Gateway

```bash
docker compose logs -f openclaw-gateway
```

Éxito:

```
[gateway] listening on ws://0.0.0.0:18789
```

Desde su portátil:

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

Abrir:

`http://127.0.0.1:18789/`

Pegue su token de gateway.

---

## Qué persiste dónde (fuente de verdad)

OpenClaw se ejecuta en Docker, pero Docker no es la fuente de verdad.
Todo el estado de larga duración debe sobrevivir a reinicios, reconstrucciones y rearranques.

| Componente                           | Ubicación                          | Mecanismo de persistencia    | Notas                                           |
| ------------------------------------ | ---------------------------------- | ---------------------------- | ----------------------------------------------- |
| Configuración de Gateway             | `/home/node/.openclaw/`            | Montaje de volumen de host   | Incluye `openclaw.json`, tokens                 |
| Perfiles de autenticación de modelos | `/home/node/.openclaw/`            | Montaje de volumen de host   | Tokens OAuth, claves API                        |
| Configuraciones de habilidades       | `/home/node/.openclaw/skills/`     | Montaje de volumen de host   | Estado a nivel de habilidad                     |
| Espacio de trabajo del agente        | `/home/node/.openclaw/workspace/`  | Montaje de volumen de host   | Código y artefactos del agente                  |
| Sesión de WhatsApp                   | `/home/node/.openclaw/`            | Montaje de volumen de host   | Conserva el inicio de sesión QR                 |
| Llavero de Gmail                     | `/home/node/.openclaw/`            | Volumen de host + contraseña | Requiere `GOG_KEYRING_PASSWORD`                 |
| Binarios externos                    | `/usr/local/bin/`                  | Imagen Docker                | Debe integrarse en el momento de la compilación |
| Tiempo de ejecución de Node          | Sistema de archivos del contenedor | Imagen Docker                | Reconstruido en cada compilación de imagen      |
| Paquetes del sistema operativo       | Sistema de archivos del contenedor | Imagen Docker                | No instalar en tiempo de ejecución              |
| Contenedor Docker                    | Efímero                            | Reiniciable                  | Seguro de destruir                              |

import es from "/components/footer/es.mdx";

<es />
