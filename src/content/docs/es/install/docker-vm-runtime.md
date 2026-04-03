---
summary: "Pasos de tiempo de ejecución compartidos de Docker VM para hosts OpenClaw Gateway de larga duración"
read_when:
  - You are deploying OpenClaw on a cloud VM with Docker
  - You need the shared binary bake, persistence, and update flow
title: "Tiempo de ejecución de Docker VM"
---

# Tiempo de ejecución de Docker VM

Pasos de tiempo de ejecución compartidos para instalaciones de Docker basadas en VM, como GCP, Hetzner y proveedores de VPS similares.

## Incluir los binarios necesarios en la imagen

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

**Ejemplo de Dockerfile**

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

<Note>Las URL de descarga anteriores son para x86_64 (amd64). Para máquinas virtuales basadas en ARM (p. ej., Hetzner ARM, GCP Tau T2A), reemplace las URL de descarga con las variantes ARM64 correspondientes de la página de lanzamiento de cada herramienta.</Note>

## Compilar e iniciar

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Si la compilación falla con `Killed` o `exit code 137` durante `pnpm install --frozen-lockfile`, la máquina virtual se quedó sin memoria.
Use una clase de máquina más grande antes de reintentar.

Verificar los binarios:

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

Verificar el Gateway:

```bash
docker compose logs -f openclaw-gateway
```

Salida esperada:

```
[gateway] listening on ws://0.0.0.0:18789
```

## Qué persiste y dónde

OpenClaw se ejecuta en Docker, pero Docker no es la fuente de verdad.
Todo el estado de larga duración debe sobrevivir a reinicios, recompilaciones y rearranques.

| Componente                           | Ubicación                          | Mecanismo de persistencia     | Notas                                                |
| ------------------------------------ | ---------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Configuración del Gateway            | `/home/node/.openclaw/`            | Montaje de volumen del host   | Incluye `openclaw.json`, tokens                      |
| Perfiles de autenticación de modelos | `/home/node/.openclaw/`            | Montaje de volumen del host   | Tokens de OAuth, claves API                          |
| Configuraciones de habilidades       | `/home/node/.openclaw/skills/`     | Montaje de volumen del host   | Estado a nivel de habilidad                          |
| Espacio de trabajo del agente        | `/home/node/.openclaw/workspace/`  | Montaje de volumen del host   | Código y artefactos del agente                       |
| Sesión de WhatsApp                   | `/home/node/.openclaw/`            | Montaje de volumen del host   | Conserva el inicio de sesión QR                      |
| Llavero de Gmail                     | `/home/node/.openclaw/`            | Volumen del host + contraseña | Requiere `GOG_KEYRING_PASSWORD`                      |
| Binarios externos                    | `/usr/local/bin/`                  | Imagen de Docker              | Debe estar integrado en el momento de la compilación |
| Tiempo de ejecución de Node          | Sistema de archivos del contenedor | Imagen de Docker              | Reconstruido en cada compilación de imagen           |
| Paquetes del sistema operativo       | Sistema de archivos del contenedor | Imagen de Docker              | No instalar en tiempo de ejecución                   |
| Contenedor de Docker                 | Efímero                            | Reiniciable                   | Seguro de destruir                                   |

## Actualizaciones

Para actualizar OpenClaw en la máquina virtual:

```bash
git pull
docker compose build
docker compose up -d
```
