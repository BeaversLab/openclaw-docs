---
summary: "Ejecutar OpenClaw Gateway 24/7 en una VM de GCP Compute Engine (Docker) con estado duradero"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw en GCP Compute Engine (Docker, Guía de VPS de Producción)

## Objetivo

Ejecutar un OpenClaw Gateway persistente en una VM de GCP Compute Engine usando Docker, con estado duradero, binarios integrados y un comportamiento de reinicio seguro.

Si quieres "OpenClaw 24/7 por ~$5-12/mes", esta es una configuración confiable en Google Cloud.
Los precios varían según el tipo de máquina y la región; elige la VM más pequeña que se ajuste a tu carga de trabajo y escala si encuentras errores de falta de memoria (OOMs).

## ¿Qué estamos haciendo (términos simples)?

- Crear un proyecto de GCP y habilitar la facturación
- Crear una VM de Compute Engine
- Instalar Docker (entorno de ejecución de aplicaciones aislado)
- Iniciar el OpenClaw Gateway en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la interfaz de control (Control UI) desde tu portátil mediante un túnel SSH

Se puede acceder al Gateway a través de:

- Redirección de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el firewall y los tokens por tu cuenta

Esta guía utiliza Debian en GCP Compute Engine.
Ubuntu también funciona; mapea los paquetes en consecuencia.
Para el flujo genérico de Docker, consulta [Docker](/en/install/docker).

---

## Camino rápido (operadores experimentados)

1. Crear proyecto de GCP + habilitar API de Compute Engine
2. Crear VM de Compute Engine (e2-small, Debian 12, 20GB)
3. Entrar por SSH en la VM
4. Instalar Docker
5. Clonar el repositorio de OpenClaw
6. Crear directorios persistentes en el host
7. Configurar `.env` y `docker-compose.yml`
8. Integrar los binarios necesarios, construir e iniciar

---

## Lo que necesitas

- Cuenta de GCP (nivel gratuito elegible para e2-micro)
- gcloud CLI instalado (o usar Cloud Console)
- Acceso SSH desde tu portátil
- Conocimientos básicos de SSH + copiar/pegar
- ~20-30 minutos
- Docker y Docker Compose
- Credenciales de autenticación del modelo
- Credenciales de proveedor opcionales
  - Código QR de WhatsApp
  - Token de bot de Telegram
  - Gmail OAuth

---

<Steps>
  <Step title="Instalar gcloud CLI (o usar la consola)">
    **Opción A: gcloud CLI** (recomendado para automatización)

    Instalar desde [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

    Inicializar y autenticar:

    ```bash
    gcloud init
    gcloud auth login
    ```

    **Opción B: Cloud Console**

    Todos los pasos se pueden hacer a través de la interfaz web en [https://console.cloud.google.com](https://console.cloud.google.com)

  </Step>

  <Step title="Crear un proyecto de GCP">
    **CLI:**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    Activa la facturación en [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) (obligatorio para Compute Engine).

    Habilita la API de Compute Engine:

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **Consola:**

    1. Ve a IAM y administración > Crear proyecto
    2. Nómbralo y créalo
    3. Activa la facturación para el proyecto
    4. Navega a API y servicios > Habilitar API > busca "Compute Engine API" > Habilitar

  </Step>

  <Step title="Crear la VM">
    **Tipos de máquina:**

    | Tipo      | Especificaciones                    | Costo               | Notas                                        |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4GB RAM          | ~$25/mes            | Más fiable para compilaciones locales de Docker        |
    | e2-small  | 2 vCPU, 2GB RAM          | ~$12/mes            | Mínimo recomendado para la compilación de Docker         |
    | e2-micro  | 2 vCPU (compartido), 1GB RAM | Elegible para capa gratuita | A menudo falla con compilación Docker OOM (salida 137) |

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

  </Step>

  <Step title="SSH a la VM">
    **CLI:**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **Consola:**

    Haz clic en el botón "SSH" junto a tu VM en el panel de Compute Engine.

    Nota: La propagación de la clave SSH puede tardar 1-2 minutos después de la creación de la VM. Si se rechaza la conexión, espera y vuelve a intentar.

  </Step>

  <Step title="Instalar Docker (en la VM)">
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

    Luego vuelve a entrar por SSH:

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
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

    Esta guía asume que construirás una imagen personalizada para garantizar la persistencia de los binarios.

  </Step>

  <Step title="Crear directorios persistentes del host">
    Los contenedores Docker son efímeros.
    Todo el estado de larga duración debe residir en el host.

    ```bash
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="Configurar variables de entorno">
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

    Genera secretos seguros:

    ```bash
    openssl rand -hex 32
    ```

    **No confirmes este archivo.**

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
            "--allow-unconfigured",
          ]
    ```

    `--allow-unconfigured` es solo por conveniencia de inicio, no es un reemplazo para una configuración adecuada de la puerta de enlace. Aún así, establece la autenticación (`gateway.auth.token` o contraseña) y usa configuraciones de enlace seguras para tu implementación.

  </Step>

  <Step title="Pasos de tiempo de ejecución compartidos de VM Docker">
    Usa la guía de tiempo de ejecución compartido para el flujo común de host Docker:

    - [Incrustar los binarios requeridos en la imagen](/en/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construir e iniciar](/en/install/docker-vm-runtime#build-and-launch)
    - [Qué persiste dónde](/en/install/docker-vm-runtime#what-persists-where)
    - [Actualizaciones](/en/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Notas de inicio específicas de GCP">
    En GCP, si la compilación falla con `Killed` o `exit code 137` durante `pnpm install --frozen-lockfile`, la VM se ha quedado sin memoria. Use `e2-small` como mínimo, o `e2-medium` para compilaciones iniciales más confiables.

    Al vincularse a la LAN (`OPENCLAW_GATEWAY_BIND=lan`), configure un origen de navegador confiable antes de continuar:

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    Si cambió el puerto de la puerta de enlace, reemplace `18789` con su puerto configurado.

  </Step>

  <Step title="Acceso desde su portátil">
    Cree un túnel SSH para reenviar el puerto de la puerta de enlace:

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

    Si la interfaz de usuario de control muestra `unauthorized` o `disconnected (1008): pairing required`, apruebe el dispositivo del navegador:

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    ¿Necesita nuevamente la referencia de persistencia compartida y actualización?
    Vea [Tiempo de ejecución de VM Docker](/en/install/docker-vm-runtime#what-persists-where) y [Actualizaciones del tiempo de ejecución de VM Docker](/en/install/docker-vm-runtime#updates).

  </Step>
</Steps>

---

## Solución de problemas

**Conexión SSH rechazada**

La propagación de la clave SSH puede tardar 1-2 minutos después de la creación de la VM. Espere y vuelva a intentarlo.

**Problemas de inicio de sesión del SO**

Verifique su perfil de inicio de sesión del SO:

```bash
gcloud compute os-login describe-profile
```

Asegúrese de que su cuenta tenga los permisos IAM necesarios (Compute OS Login o Compute OS Admin Login).

**Sin memoria (OOM)**

Si la compilación de Docker falla con `Killed` y `exit code 137`, la VM fue terminada por falta de memoria. Actualice a e2-small (mínimo) o e2-medium (recomendado para compilaciones locales confiables):

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

1. Crear una cuenta de servicio:

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Otorgue el rol de administrador de instancia de Compute (o un rol personalizado más limitado):

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Evite usar el rol de propietario para la automatización. Utilice el principio de menor privilegio.

Consulte [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) para obtener detalles sobre los roles de IAM.

---

## Siguientes pasos

- Configurar canales de mensajería: [Canales](/en/channels)
- Emparejar dispositivos locales como nodos: [Nodos](/en/nodes)
- Configurar el Gateway: [Configuración del Gateway](/en/gateway/configuration)
