---
summary: "Ejecutar OpenClaw Gateway 24/7 en una VM de GCP Compute Engine (Docker) con estado duradero"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

Ejecute un OpenClaw Gateway persistente en una VM de GCP Compute Engine usando Docker, con estado duradero, binarios integrados y un comportamiento de reinicio seguro.

Si desea "OpenClaw 24/7 por ~$5-12/mes", esta es una configuración confiable en Google Cloud.
Los precios varían según el tipo de máquina y la región; elija la VM más pequeña que se ajuste a su carga de trabajo y escale si se queda sin memoria (OOMs).

## ¿Qué estamos haciendo (términos simples)?

- Crear un proyecto de GCP y habilitar la facturación
- Crear una VM de Compute Engine
- Instalar Docker (entorno de ejecución de aplicación aislado)
- Iniciar el OpenClaw Gateway en Docker
- Persistir `~/.openclaw` + `~/.openclaw/workspace` en el host (sobrevive a reinicios/reconstrucciones)
- Acceder a la Interfaz de Control desde su portátil a través de un túnel SSH

Ese estado montado `~/.openclaw` incluye `openclaw.json`, por agente
`agents/<agentId>/agent/auth-profiles.json`, y `.env`.

Se puede acceder al Gateway a través de:

- Reenvío de puertos SSH desde tu portátil
- Exposición directa de puertos si gestionas el firewall y los tokens tú mismo

Esta guía utiliza Debian en GCP Compute Engine.
Ubuntu también funciona; asigna los paquetes correspondientemente.
Para el flujo genérico de Docker, consulta [Docker](/es/install/docker).

---

## Ruta rápida (operadores experimentados)

1. Crear proyecto de GCP + habilitar Compute Engine API
2. Crear VM de Compute Engine (e2-small, Debian 12, 20GB)
3. Conectarse por SSH a la VM
4. Instalar Docker
5. Clonar el repositorio de OpenClaw
6. Crear directorios persistentes del host
7. Configurar `.env` y `docker-compose.yml`
8. Incluir los binarios necesarios, compilar y lanzar

---

## Lo que necesitas

- Cuenta de GCP (nivel gratuito elegible para e2-micro)
- CLI de gcloud instalada (o usar Cloud Console)
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

<Steps>
  <Step title="Instalar la CLI de gcloud (o usar la Consola)">
    **Opción A: CLI de gcloud** (recomendado para automatización)

    Instalar desde [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

    Inicializar y autenticar:

    ```bash
    gcloud init
    gcloud auth login
    ```

    **Opción B: Consola en la nube**

    Todos los pasos se pueden realizar a través de la interfaz de usuario web en [https://console.cloud.google.com](https://console.cloud.google.com)

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
    2. Ponle nombre y créalo
    3. Activa la facturación para el proyecto
    4. Navega a API y servicios > Habilitar API > busca "Compute Engine API" > Habilitar

  </Step>

  <Step title="Crear la VM">
    **Tipos de máquinas:**

    | Tipo      | Especificaciones                    | Costo               | Notas                                        |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4GB RAM          | ~$25/mo            | Más fiable para compilaciones locales de Docker        |
    | e2-small  | 2 vCPU, 2GB RAM          | ~$12/mo            | Mínimo recomendado para compilación de Docker         |
    | e2-micro  | 2 vCPU (compartidos), 1GB RAM | Elegible para capa gratuita | A menudo falla con OOM en compilación Docker (exit 137) |

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

  <Step title="Conéctese por SSH a la VM">
    **CLI:**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **Consola:**

    Haga clic en el botón "SSH" junto a su VM en el panel de Compute Engine.

    Nota: La propagación de la clave SSH puede tardar de 1 a 2 minutos después de la creación de la VM. Si se rechaza la conexión, espere y vuelva a intentarlo.

  </Step>

  <Step title="Instalar Docker (en la VM)">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    Cierre la sesión y vuelva a entrar para que el cambio de grupo surta efecto:

    ```bash
    exit
    ```

    Luego vuelva a entrar por SSH:

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    Verifique:

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

  <Step title="Crear directorios persistentes en el host">
    Los contenedores de Docker son efímeros.
    Todo el estado de larga duración debe residir en el host.

    ```bash
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="Configurar variables de entorno">
    Cree `.env` en la raíz del repositorio.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
    OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Establezca `OPENCLAW_GATEWAY_TOKEN` cuando desee administrar el token de
    puerta de enlace estable a través de `.env`; de lo contrario, configure `gateway.auth.token` antes
    de depender de los clientes en los reinicios. Si ninguna de las dos fuentes existe, OpenClaw utiliza
    un token solo en tiempo de ejecución para ese inicio. Genere una contraseña de llavero y péguela
    en `GOG_KEYRING_PASSWORD`:

    ```bash
    openssl rand -hex 32
    ```

    **No confirme este archivo.**

    Este archivo `.env` es para el entorno de contenedor/tiempo de ejecución, como `OPENCLAW_GATEWAY_TOKEN`.
    La autenticación almacenada de OAuth/clave de API del proveedor reside en la
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` montada.

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

    `--allow-unconfigured` es solo por conveniencia de inicio, no es un reemplazo para una configuración adecuada de gateway. Aún configura la autenticación (`gateway.auth.token` o contraseña) y usa configuraciones de enlace seguras para tu implementación.

  </Step>

  <Step title="Pasos compartidos del tiempo de ejecución de la VM con Docker">
    Utilice la guía de tiempo de ejecución compartida para el flujo común del host Docker:

    - [Incorporar los binarios necesarios en la imagen](/es/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Compilar y lanzar](/es/install/docker-vm-runtime#build-and-launch)
    - [Qué persiste y dónde](/es/install/docker-vm-runtime#what-persists-where)
    - [Actualizaciones](/es/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Notas de inicio específicas de GCP">
    En GCP, si la compilación falla con `Killed` o `exit code 137` durante `pnpm install --frozen-lockfile`, la VM se quedó sin memoria. Use `e2-small` como mínimo, o `e2-medium` para compilaciones iniciales más confiables.

    Al vincular a la LAN (`OPENCLAW_GATEWAY_BIND=lan`), configure un origen de navegador de confianza antes de continuar:

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    Si cambió el puerto del gateway, reemplace `18789` con su puerto configurado.

  </Step>

  <Step title="Acceso desde su portátil">
    Cree un túnel SSH para reenviar el puerto del Gateway:

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    Abra en su navegador:

    `http://127.0.0.1:18789/`

    Vuelva a imprimir un enlace limpio del panel:

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    Si la IU solicita autenticación de secreto compartido, pegue el token o
    contraseña configurada en la configuración de la IU de Control. Este flujo de Docker escribe un token de
    manera predeterminada; si cambia la configuración del contenedor a autenticación por contraseña, use esa
    contraseña en su lugar.

    Si la IU de Control muestra `unauthorized` o `disconnected (1008): pairing required`, apruebe el dispositivo del navegador:

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    ¿Necesita nuevamente la referencia de persistencia compartida y actualización?
    Consulte [Docker VM Runtime](/es/install/docker-vm-runtime#what-persists-where) y [Docker VM Runtime updates](/es/install/docker-vm-runtime#updates).

  </Step>
</Steps>

---

## Solución de problemas

**Conexión SSH rechazada**

La propagación de la clave SSH puede tardar de 1 a 2 minutos después de la creación de la VM. Espere y vuelva a intentarlo.

**Problemas de inicio de sesión del sistema operativo (OS Login)**

Compruebe su perfil de OS Login:

```bash
gcloud compute os-login describe-profile
```

Asegúrese de que su cuenta tenga los permisos de IAM necesarios (Compute OS Login o Compute OS Admin Login).

**Sin memoria (OOM)**

Si la compilación de Docker falla con `Killed` y `exit code 137`, la VM fue terminada por OOM. Actualice a e2-small (mínimo) o e2-medium (recomendado para compilaciones locales confiables):

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

2. Otorgue el rol de administrador de instancia de Compute (o un rol personalizado más limitado):

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Evite usar el rol de Propietario para la automatización. Utilice el principio de menor privilegio.

Consulte [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) para obtener detalles sobre los roles de IAM.

---

## Siguientes pasos

- Configure los canales de mensajería: [Canales](/es/channels)
- Empareje dispositivos locales como nodos: [Nodos](/es/nodes)
- Configure la puerta de enlace: [Configuración de la puerta de enlace](/es/gateway/configuration)

## Relacionado

- [Descripción general de la instalación](/es/install)
- [Azure](/es/install/azure)
- [Alojamiento VPS](/es/vps)
