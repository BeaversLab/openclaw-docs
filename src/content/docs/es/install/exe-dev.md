---
summary: "Ejecuta OpenClaw Gateway en exe.dev (VM + proxy HTTPS) para acceso remoto"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

Objetivo: OpenClaw Gateway ejecutándose en una VM de exe.dev, accesible desde tu portátil a través de: `https://<vm-name>.exe.xyz`

Esta página asume la imagen **exeuntu** predeterminada de exe.dev. Si elegiste una distribución diferente, asigna los paquetes correspondientemente.

## Ruta rápida para principiantes

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. Rellena tu clave/token de autenticación según sea necesario
3. Haz clic en "Agent" junto a tu VM y espera a que Shelley termine de aprovisionar
4. Abre `https://<vm-name>.exe.xyz/` y autentícate con el secreto compartido configurado (esta guía utiliza autenticación por token por defecto, pero la autenticación por contraseña también funciona si cambias `gateway.auth.mode`)
5. Aprueba cualquier solicitud de emparejamiento de dispositivo pendiente con `openclaw devices approve <requestId>`

## Lo que necesitas

- cuenta de exe.dev
- Acceso `ssh exe.dev` a las máquinas virtuales de [exe.dev](https://exe.dev) (opcional)

## Instalación automática con Shelley

Shelley, el agente de [exe.dev](https://exe.dev), puede instalar OpenClaw al instante con nuestro
aviso. El aviso utilizado es el siguiente:

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## Instalación manual

## 1) Crear la VM

Desde tu dispositivo:

```bash
ssh exe.dev new
```

Luego conéctate:

```bash
ssh <vm-name>.exe.xyz
```

<Tip>Mantén esta VM con **estado**. OpenClaw almacena `openclaw.json`, `auth-profiles.json` por agente, sesiones y el estado del canal/proveedor bajo `~/.openclaw/`, además del espacio de trabajo bajo `~/.openclaw/workspace/`.</Tip>

## 2) Instalar los requisitos previos (en la VM)

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) Instalar OpenClaw

Ejecuta el script de instalación de OpenClaw:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) Configurar nginx para proxyar OpenClaw al puerto 8000

Edita `/etc/nginx/sites-enabled/default` con

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Sobrescribe las cabeceras de reenvío en lugar de preservar las cadenas suministradas por el cliente.
OpenClaw confía en los metadatos de IP reenviada solo de los proxys configurados explícitamente,
y las cadenas `X-Forwarded-For` de estilo de anexión se tratan como un riesgo de endurecimiento.

## 5) Acceder a OpenClaw y otorgar privilegios

Acceda a `https://<vm-name>.exe.xyz/` (vea la salida de la Interfaz de Usuario de Control desde el onboarding). Si solicita autenticación, pegue el
secreto compartido configurado desde la VM. Esta guía usa autenticación por token, así que recupere `gateway.auth.token`
con `openclaw config get gateway.auth.token` (o genere uno con `openclaw doctor --generate-gateway-token`).
Si cambió el gateway a autenticación por contraseña, use `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` en su lugar.
Aprobe los dispositivos con `openclaw devices list` y `openclaw devices approve <requestId>`. En caso de duda, ¡use Shelley desde su navegador!

## Configuración del canal remoto

Para hosts remotos, prefiera una sola llamada `config patch` antes que muchas llamadas SSH a `config set`. Mantenga los tokens reales en el entorno de la VM o `~/.openclaw/.env`, y ponga solo SecretRefs en `openclaw.json`.

En la VM, asegúrese de que el entorno del servicio contenga los secretos que necesita:

```bash
cat >> ~/.openclaw/.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=sk-...
EOF
```

Desde su máquina local, cree un archivo de parche y envíelo a la VM:

```json5
// openclaw.remote.patch.json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --dry-run' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw gateway restart && openclaw health'
```

Use `--replace-path` cuando una lista de permitidos anidada debe convertirse exactamente en el valor del parche, por ejemplo, al reemplazar una lista de permitidos de canales de Discord:

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

## Acceso remoto

El acceso remoto es gestionado por la autenticación de [exe.dev](https://exe.dev). Por
defecto, el tráfico HTTP del puerto 8000 se reenvía a `https://<vm-name>.exe.xyz`
con autenticación por correo electrónico.

## Actualizando

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

Guía: [Actualizando](/es/install/updating)

## Relacionado

- [Gateway remoto](/es/gateway/remote)
- [Resumen de instalación](/es/install)
