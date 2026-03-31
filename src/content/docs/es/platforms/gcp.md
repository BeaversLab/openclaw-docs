---
summary: "Ejecuta OpenClaw Gateway 24/7 en una VM de GCP Compute Engine (Docker) con estado duradero"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw en GCP Compute Engine (Docker, Guía de VPS de Producción)

## Objetivo

Ejecuta un OpenClaw Gateway persistente en una VM de GCP Compute Engine usando Docker, con estado duradero, binarios integrados y un comportamiento de reinicio seguro.

Si deseas "OpenClaw 24/7 por ~$5-12/mes", esta es una configuración confiable en Google Cloud.
Los precios varían según el tipo de máquina y la región; elige la VM más pequeña que se ajuste a tu carga de trabajo y escala si te quedas sin memoria (OOMs).

## ¿Qué estamos haciendo (términos simples)?

- Crear un proyecto de GCP y habilitar la facturación
- Crear una VM de Compute Engine
- Instalar Docker (entorno de ejecución de aplicación aislado)
- Iniciar el OpenClaw Gateway en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la Interfaz de Control desde tu portátil a través de un túnel SSH

Se puede acceder al Gateway a través de:

- Reenvío de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el firewall y los tokens tú mismo

Esta guía utiliza Debian en GCP Compute Engine.
Ubuntu también funciona; mapea los paquetes correspondientemente.
Para el flujo genérico de Docker, consulta [Docker](/en/install/docker).

---

## Ruta rápida (operadores experimentados)

1. Crear proyecto de GCP + habilitar API de Compute Engine
2. Crear VM de Compute Engine (e2-small, Debian 12, 20GB)
3. Acceder por SSH a la VM
4. Instalar Docker
5. Clonar el repositorio de OpenClaw
6. Crear directorios persistentes del host
7. Configurar `.env` y `docker-compose.yml`
8. Incorporar binarios requeridos, construir e iniciar

---

## Lo que necesitas

- Cuenta de GCP (capa gratuita elegible para e2-micro)
- CLI de gcloud instalada (o usar Cloud Console)
- Acceso SSH desde tu portátil
- Conocimientos básicos de SSH + copiar/pegar
- ~20-30 minutos
- Docker y Docker Compose
- Credenciales de autenticación del modelo
- Credenciales de proveedor opcionales
  - Código QR de WhatsApp
  - Token del bot de Telegram
  - OAuth de Gmail

---

## 1) Instalar la CLI de gcloud (o usar Consola)

**Opción A: CLI de gcloud** (recomendado para automatización)

Instalar desde https://cloud.google.com/sdk/docs/install

Inicializar y autenticarse:

```bash
gcloud init
gcloud auth login
```

**Opción B: Cloud Console**

Todos los pasos se pueden realizar a través de la interfaz web en https://console.cloud.google.com

---

## 2) Crear un proyecto de GCP

**CLI:**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

Activa la facturación en https://console.cloud.google.com/billing (necesario para Compute Engine).

Habilita la API de Compute Engine:

```bash
gcloud services enable compute.googleapis.com
```

**Consola:**

1. Ve a IAM y administración > Crear proyecto
2. Nómbralo y créalo
3. Activa la facturación para el proyecto
4. Ve a API y servicios > Habilitar API > busca "Compute Engine API" > Habilitar

---

## 3) Crear la VM

**Tipos de máquina:**

| Tipo     | Especificaciones              | Coste                        | Notas                                              |
| -------- | ----------------------------- | ---------------------------- | -------------------------------------------------- |
| e2-small | 2 vCPU, 2GB RAM               | ~$12/mes                     | Recomendado                                        |
| e2-micro | 2 vCPU (compartidas), 1GB RAM | Elegible para nivel gratuito | Puede fallar por falta de memoria (OOM) bajo carga |

**CLI:**

```bash
gcloud compute instances create openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**Consola:**

1. Ve a Compute Engine > Instancias de VM > Crear instancia
2. Nombre: `openclaw-gateway`
3. Región: `us-central1`, Zona: `us-central1-a`
4. Tipo de máquina: `e2-small`
5. Disco de arranque: Debian 12, 20GB
6. Crear

---

## 4) Conectarse por SSH a la VM

**CLI:**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**Consola:**

Haz clic en el botón "SSH" junto a tu VM en el panel de Compute Engine.

Nota: La propagación de la clave SSH puede tardar de 1 a 2 minutos tras la creación de la VM. Si se rechaza la conexión, espera y vuelve a intentarlo.

---

## 5) Instalar Docker (en la VM)

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Cierra sesión y vuelve a entrar para que el cambio de grupo surta efecto:

```bash
exit
```

Luego conéctate de nuevo por SSH:

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

Verificar:

```bash
docker --version
docker compose version
```

---

## 6) Clonar el repositorio de OpenClaw

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

Esta guía asume que compilarás una imagen personalizada para garantizar la persistencia de los binarios.

---

## 7) Crear directorios persistentes en el host

Los contenedores de Docker son efímeros.
Todo el estado de larga duración debe residir en el host.

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) Configurar variables de entorno

Crea `.env` en la raíz del repositorio.

```bash
OPENCLAW_IMAGE=openclaw:latest
OPENCLAW_GATEWAY_TOKEN=change-me-now
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789

OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.openclaw
```

Genera secretos fuertes:

```bash
openssl rand -hex 32
```

**No envíes este archivo al repositorio.**

---

## 9) Configuración de Docker Compose

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
      # Recommended: keep the Gateway loopback-only on the VM; access via SSH tunnel.
      # To expose it publicly, remove the `127.0.0.1:` prefix and firewall accordingly.
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"

      # Optional: only if you run iOS/Android nodes against this VM and need Canvas host.
      # If you expose this publicly, read /gateway/security and firewall accordingly.
      # - "18793:18793"
    command: ["node", "dist/index.js", "gateway", "--bind", "${OPENCLAW_GATEWAY_BIND}", "--port", "${OPENCLAW_GATEWAY_PORT}"]
```

---

## 10) Integrar los binarios necesarios en la imagen (crítico)

Instalar binarios dentro de un contenedor en ejecución es una trampa.
Todo lo instalado en tiempo de ejecución se perderá al reiniciar.

Todos los binarios externos requeridos por las habilidades (skills) deben instalarse en el momento de la construcción de la imagen.

Los ejemplos a continuación muestran solo tres binarios comunes:

- `gog` para el acceso a Gmail
- `goplaces` para Google Places
- `wacli` para WhatsApp

Estos son ejemplos, no una lista completa.
Puedes instalar tantos binarios como sea necesario utilizando el mismo patrón.

Si añades nuevas habilidades más tarde que dependan de binarios adicionales, debes:

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

## 11) Compilar e iniciar

```bash
docker compose build
docker compose up -d openclaw-gateway
```

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

---

## 12) Verificar el Gateway

```bash
docker compose logs -f openclaw-gateway
```

Éxito:

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) Acceder desde tu portátil

Crear un túnel SSH para reenviar el puerto del Gateway:

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

Abrir en tu navegador:

`http://127.0.0.1:18789/`

Pega tu token del gateway.

---

## Qué persiste dónde (fuente de verdad)

OpenClaw se ejecuta en Docker, pero Docker no es la fuente de verdad.
Todo el estado de larga duración debe sobrevivir a reinicios, reconstrucciones y rearranques.

| Componente                           | Ubicación                          | Mecanismo de persistencia     | Notas                                               |
| ------------------------------------ | ---------------------------------- | ----------------------------- | --------------------------------------------------- |
| Configuración del Gateway            | `/home/node/.openclaw/`            | Montaje de volumen del host   | Incluye `openclaw.json`, tokens                     |
| Perfiles de autenticación de modelos | `/home/node/.openclaw/`            | Montaje de volumen del host   | Tokens de OAuth, claves de API                      |
| Configuraciones de habilidades       | `/home/node/.openclaw/skills/`     | Montaje de volumen del host   | Estado a nivel de habilidad                         |
| Espacio de trabajo del agente        | `/home/node/.openclaw/workspace/`  | Montaje de volumen del host   | Código y artefactos del agente                      |
| Sesión de WhatsApp                   | `/home/node/.openclaw/`            | Montaje de volumen del host   | Conserva el inicio de sesión QR                     |
| Llavero de Gmail                     | `/home/node/.openclaw/`            | Volumen del host + contraseña | Requiere `GOG_KEYRING_PASSWORD`                     |
| Binarios externos                    | `/usr/local/bin/`                  | Imagen de Docker              | Debe estar incluido en el momento de la compilación |
| Tiempo de ejecución de Node          | Sistema de archivos del contenedor | Imagen de Docker              | Reconstruido en cada compilación de imagen          |
| Paquetes del sistema operativo       | Sistema de archivos del contenedor | Imagen de Docker              | No instalar en tiempo de ejecución                  |
| Contenedor de Docker                 | Efímero                            | Reiniciable                   | Seguro de destruir                                  |

---

## Actualizaciones

Para actualizar OpenClaw en la VM:

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

---

## Solución de problemas

**Conexión SSH rechazada**

La propagación de la clave SSH puede tardar 1-2 minutos después de crear la VM. Espera y vuelve a intentarlo.

**Problemas de inicio de sesión del sistema operativo**

Verifica tu perfil de inicio de sesión del sistema operativo:

```bash
gcloud compute os-login describe-profile
```

Asegúrate de que tu cuenta tenga los permisos IAM necesarios (Compute OS Login o Compute OS Admin Login).

**Sin memoria (OOM)**

Si usas e2-micro y experimentas OOM, actualiza a e2-small o e2-medium:

```bash
# Stop the VM first
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# Change machine type
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# Start the VM
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## Cuentas de servicio (mejor práctica de seguridad)

Para uso personal, tu cuenta de usuario predeterminada funciona bien.

Para automatización o canalizaciones de CI/CD, crea una cuenta de servicio dedicada con permisos mínimos:

1. Crear una cuenta de servicio:

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Otorgar el rol de administrador de instancia de Compute (o un rol personalizado más limitado):
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Evita usar el rol de Propietario para la automatización. Usa el principio de menor privilegio.

Consulta https://cloud.google.com/iam/docs/understanding-roles para obtener detalles sobre los roles de IAM.

---

## Próximos pasos

- Configura los canales de mensajería: [Canales](/en/channels)
- Empareja los dispositivos locales como nodos: [Nodos](/en/nodes)
- Configura el Gateway: [Configuración del Gateway](/en/gateway/configuration)
