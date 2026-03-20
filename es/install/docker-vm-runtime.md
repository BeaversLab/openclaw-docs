---
summary: "Pasos de tiempo de ejecución compartidos de Docker VM para hosts OpenClaw Gateway de larga duración"
read_when:
  - Estás desplegando OpenClaw en una VM en la nube con Docker
  - Necesitas el flujo de compilación (bake), persistencia y actualización de binarios compartidos
title: "Docker VM Runtime"
---

# Docker VM Runtime

Pasos de tiempo de ejecución compartidos para instalaciones de Docker basadas en VM como GCP, Hetzner y proveedores de VPS similares.

## Bake required binaries into the image

Instalar binarios dentro de un contenedor en ejecución es una trampa.
Cualquier cosa instalada en tiempo de ejecución se perderá al reiniciar.

Todos los binarios externos requeridos por las habilidades (skills) deben instalarse en el momento de la compilación de la imagen.

Los ejemplos a continuación muestran solo tres binarios comunes:

- `gog` para el acceso a Gmail
- `goplaces` para Google Places
- `wacli` para WhatsApp

Estos son ejemplos, no una lista completa.
Puedes instalar tantos binarios como sea necesario utilizando el mismo patrón.

Si agregas nuevas habilidades (skills) más adelante que dependen de binarios adicionales, debes:

1. Actualizar el Dockerfile
2. Reconstruir la imagen
3. Reiniciar los contenedores

**Dockerfile de ejemplo**

```dockerfile
FROM node:24-bookworm

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

## Construir y lanzar

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Si la compilación falla con `Killed` o `exit code 137` durante `pnpm install --frozen-lockfile`, la VM se quedó sin memoria.
Utiliza una clase de máquina más grande antes de reintentar.

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

Verificar Gateway:

```bash
docker compose logs -f openclaw-gateway
```

Salida esperada:

```
[gateway] listening on ws://0.0.0.0:18789
```

## Qué persiste dónde

OpenClaw se ejecuta en Docker, pero Docker no es la fuente de verdad.
Todo el estado de larga duración debe sobrevivir a reinicios, reconstrucciones y rearranques.

| Componente           | Ubicación                          | Mecanismo de persistencia  | Notas                            |
| ------------------- | --------------------------------- | ---------------------- | -------------------------------- |
| Configuración del Gateway      | `/home/node/.openclaw/`           | Montaje de volumen del host      | Incluye `openclaw.json`, tokens |
| Perfiles de autenticación de modelos | `/home/node/.openclaw/`           | Montaje de volumen del host      | Tokens de OAuth, claves de API           |
| Configuraciones de habilidades (skills)       | `/home/node/.openclaw/skills/`    | Montaje de volumen del host      | Estado a nivel de habilidad (skill)                |
| Espacio de trabajo del agente     | `/home/node/.openclaw/workspace/` | Montaje de volumen del host      | Código y artefactos del agente         |
| Sesión de WhatsApp    | `/home/node/.openclaw/`           | Montaje de volumen del host      | Conserva el inicio de sesión QR               |
| Llavero de Gmail       | `/home/node/.openclaw/`           | Volumen del host + contraseña | Requiere `GOG_KEYRING_PASSWORD`  |
| Binarios externos   | `/usr/local/bin/`                 | Imagen de Docker           | Debe estar incluido (baked) en el momento de la compilación      |
| Tiempo de ejecución de Node        | Sistema de archivos del contenedor              | Imagen de Docker           | Reconstruido en cada compilación de imagen        |
| Paquetes del sistema operativo         | Sistema de archivos del contenedor              | Imagen de Docker           | No instalar en tiempo de ejecución        |
| Contenedor de Docker    | Efímero                         | Reiniciable            | Seguro de destruir                  |

## Actualizaciones

Para actualizar OpenClaw en la VM:

```bash
git pull
docker compose build
docker compose up -d
```

import en from "/components/footer/en.mdx";

<en />
