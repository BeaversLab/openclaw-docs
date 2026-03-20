---
summary: "Ejecuta OpenClaw Gateway 24/7 en una VM de GCP Compute Engine (Docker) con estado duradero"
read_when:
  - Quieres tener OpenClaw ejecutándose 24/7 en GCP
  - Quieres un Gateway de nivel de producción y siempre activo en tu propia VM
  - Quieres control total sobre la persistencia, los binarios y el comportamiento de reinicio
title: "GCP"
---

# OpenClaw en GCP Compute Engine (Docker, Guía de VPS de Producción)

## Objetivo

Ejecutar un Gateway persistente de OpenClaw en una VM de GCP Compute Engine usando Docker, con estado duradero, binarios integrados y un comportamiento de reinicio seguro.

Si deseas "OpenClaw 24/7 por ~$5-12/mes", esta es una configuración confiable en Google Cloud.
Los precios varían según el tipo de máquina y la región; elige la VM más pequeña que se ajuste a tu carga de trabajo y escala si experimentas errores de falta de memoria (OOMs).

## ¿Qué estamos haciendo (en términos simples)?

- Crear un proyecto de GCP y habilitar la facturación
- Crear una VM de Compute Engine
- Instalar Docker (entorno de ejecución de aplicación aislado)
- Iniciar el Gateway OpenClaw en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la Interfaz de Control (Control UI) desde tu portátil a través de un túnel SSH

Se puede acceder al Gateway a través de:

- Reenvío de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el firewall y los tokens tú mismo

Esta guía utiliza Debian en GCP Compute Engine.
Ubuntu también funciona; mapea los paquetes correspondientemente.
Para el flujo genérico de Docker, consulta [Docker](/es/install/docker).

---

## Camino rápido (operadores experimentados)

1. Crear proyecto de GCP + habilitar API de Compute Engine
2. Crear VM de Compute Engine (e2-small, Debian 12, 20GB)
3. Conectarse por SSH a la VM
4. Instalar Docker
5. Clonar el repositorio de OpenClaw
6. Crear directorios persistentes en el host
7. Configurar `.env` y `docker-compose.yml`
8. Incorporar los binarios necesarios, construir y lanzar

---

## Lo que necesitas

- Cuenta de GCP (nivel gratuito elegible para e2-micro)
- gcloud CLI instalado (o usar Cloud Console)
- Acceso SSH desde tu portátil
- Conocimientos básicos de SSH + copiar/pegar
- ~20-30 minutos
- Docker y Docker Compose
- Credenciales de autenticación del modelo
- Credenciales opcionales del proveedor
  - Código QR de WhatsApp
  - Token del bot de Telegram
  - OAuth de Gmail

---

## 1) Instalar gcloud CLI (o usar la Consola)

**Opción A: gcloud CLI** (recomendado para automatización)

Instalar desde [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

Inicializar y autenticar:

```bash
gcloud init
gcloud auth login
```

**Opción B: Cloud Console**

Todos los pasos se pueden realizar a través de la interfaz web en [https://console.cloud.google.com](https://console.cloud.google.com)

---

## 2) Crear un proyecto de GCP

**CLI:**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

Activa la facturación en [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) (necesario para Compute Engine).

Habilita la API de Compute Engine:

```bash
gcloud services enable compute.googleapis.com
```

**Consola:**

1. Ve a IAM y administración > Crear un proyecto
2. Nómbralo y créalo
3. Activa la facturación para el proyecto
4. Ve a API y servicios > Habilitar API > busca "Compute Engine API" > Habilitar

---

## 3) Crear la VM

**Tipos de máquina:**

| Tipo      | Especificaciones              | Coste                        | Notas                                                         |
| --------- | ----------------------------- | ---------------------------- | ------------------------------------------------------------- |
| e2-medium | 2 vCPU, 4GB RAM               | ~$25/mes                     | Lo más fiable para compilaciones locales de Docker            |
| e2-small  | 2 vCPU, 2GB RAM               | ~$12/mes                     | Mínimo recomendado para la compilación de Docker              |
| e2-micro  | 2 vCPU (compartidas), 1GB RAM | Elegible para nivel gratuito | A menudo falla con OOM en la compilación de Docker (exit 137) |

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

Nota: La propagación de la clave SSH puede tardar 1-2 minutos después de crear la VM. Si se rechaza la conexión, espera e inténtalo de nuevo.

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

A continuación, conéctate de nuevo por SSH:

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

Esta guía asume que crearás una imagen personalizada para garantizar la persistencia del binario.

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

Generar secretos seguros:

```bash
openssl rand -hex 32
```

**No commits este archivo.**

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

## 10) Pasos de tiempo de ejecución compartidos de VM con Docker

Utiliza la guía de tiempo de ejecución compartido para el flujo común del host Docker:

- [Incrustar los binarios necesarios en la imagen](/es/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [Compilar e iniciar](/es/install/docker-vm-runtime#build-and-launch)
- [Qué persiste dónde](/es/install/docker-vm-runtime#what-persists-where)
- [Actualizaciones](/es/install/docker-vm-runtime#updates)

---

## 11) Notas de inicio específicas de GCP

En GCP, si la compilación falla con `Killed` o `exit code 137` durante `pnpm install --frozen-lockfile`, la VM se ha quedado sin memoria. Use `e2-small` como mínimo, o `e2-medium` para unas primeras compilaciones más fiables.

Al vincular a la LAN (`OPENCLAW_GATEWAY_BIND=lan`), configure un origen de navegador de confianza antes de continuar:

```bash
docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
```

Si cambió el puerto del gateway, reemplace `18789` con su puerto configurado.

## 12) Acceso desde su portátil

Cree un túnel SSH para reenviar el puerto del Gateway:

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

Abra en su navegador:

`http://127.0.0.1:18789/`

Obtenga un enlace nuevo de panel tokenizado:

```bash
docker compose run --rm openclaw-cli dashboard --no-open
```

Pegue el token de esa URL.

Si la Interfaz de Control muestra `unauthorized` o `disconnected (1008): pairing required`, apruebe el dispositivo del navegador:

```bash
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

¿Necesita la referencia de persistencia compartida y actualización de nuevo?
Vea [Docker VM Runtime](/es/install/docker-vm-runtime#what-persists-where) y [Actualizaciones de Docker VM Runtime](/es/install/docker-vm-runtime#updates).

---

## Solución de problemas

**Conexión SSH rechazada**

La propagación de la clave SSH puede tardar 1-2 minutos después de la creación de la VM. Espere y vuelva a intentarlo.

**Problemas de inicio de sesión del sistema operativo (OS Login)**

Compruebe su perfil de OS Login:

```bash
gcloud compute os-login describe-profile
```

Asegúrese de que su cuenta tenga los permisos IAM necesarios (Compute OS Login o Compute OS Admin Login).

**Sin memoria (OOM)**

Si la compilación de Docker falla con `Killed` y `exit code 137`, la VM fue terminada por OOM. Actualice a e2-small (mínimo) o e2-medium (recomendado para compilaciones locales fiables):

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

Para uso personal, su cuenta de usuario predeterminada funciona bien.

Para automatización o canalizaciones de CI/CD, cree una cuenta de servicio dedicada con permisos mínimos:

1. Cree una cuenta de servicio:

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Otorgue el rol de administrador de instancia de Compute (o un rol personalizado más restringido):

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Evite usar el rol de Propietario (Owner) para la automatización. Use el principio de menor privilegio.

Consulte [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) para obtener detalles sobre los roles de IAM.

---

## Próximos pasos

- Configure canales de mensajería: [Canales](/es/channels)
- Vincule dispositivos locales como nodos: [Nodos](/es/nodes)
- Configure el Gateway: [Configuración del Gateway](/es/gateway/configuration)

import es from "/components/footer/es.mdx";

<es />
