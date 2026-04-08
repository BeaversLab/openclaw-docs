---
summary: "Ejecutar OpenClaw Gateway en exe.dev (VM + proxy HTTPS) para acceso remoto"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

# exe.dev

Objetivo: OpenClaw Gateway ejecutándose en una VM de exe.dev, accesible desde tu portátil a través de: `https://<vm-name>.exe.xyz`

Esta página asume la imagen **exeuntu** predeterminada de exe.dev. Si elegiste una distribución diferente, mapea los paquetes en consecuencia.

## Ruta rápida para principiantes

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. Rellena tu clave/token de autenticación según sea necesario
3. Haz clic en "Agent" junto a tu VM y espera a que Shelley termine el aprovisionamiento
4. Abra `https://<vm-name>.exe.xyz/` y autentíquese con el secreto compartido configurado (esta guía utiliza autenticación por token por defecto, pero la autenticación por contraseña también funciona si cambia `gateway.auth.mode`)
5. Aprobar cualquier solicitud de emparejamiento de dispositivo pendiente con `openclaw devices approve <requestId>`

## Lo que necesitas

- cuenta de exe.dev
- Acceso `ssh exe.dev` a las máquinas virtuales de [exe.dev](https://exe.dev) (opcional)

## Instalación automática con Shelley

Shelley, el agente de [exe.dev](https://exe.dev), puede instalar OpenClaw instantáneamente con nuestro
prompt. El prompt utilizado es el siguiente:

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## Instalación manual

## 1) Crear la VM

Desde tu dispositivo:

```bash
ssh exe.dev new
```

Luego conecta:

```bash
ssh <vm-name>.exe.xyz
```

Consejo: mantenga esta VM con **estado**. OpenClaw almacena `openclaw.json`, por agente
`auth-profiles.json`, sesiones, y el estado del canal/proveedor bajo
`~/.openclaw/`, además del espacio de trabajo bajo `~/.openclaw/workspace/`.

## 2) Instalar requisitos previos (en la VM)

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) Instalar OpenClaw

Ejecuta el script de instalación de OpenClaw:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) Configurar nginx para hacer de proxy de OpenClaw en el puerto 8000

Edite `/etc/nginx/sites-enabled/default` con

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

Sobrescribir las cabeceras de reenvío en lugar de preservar las cadenas suministradas por el cliente.
OpenClaw confía en los metadatos de IP reenviados solo de proxies configurados explícitamente,
y las cadenas de estilo anexar `X-Forwarded-For` se tratan como un riesgo de endurecimiento.

## 5) Acceda a OpenClaw y conceda privilegios

Acceda a `https://<vm-name>.exe.xyz/` (vea la salida de la Interfaz de Usuario de Control del onboarding). Si solicita autenticación, pegue el
secreto compartido configurado de la VM. Esta guía usa autenticación por token, así que recupere `gateway.auth.token`
con `openclaw config get gateway.auth.token` (o genere uno con `openclaw doctor --generate-gateway-token`).
Si cambió el gateway a autenticación por contraseña, use `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` en su lugar.
Apruebe los dispositivos con `openclaw devices list` y `openclaw devices approve <requestId>`. Si tiene dudas, ¡use Shelley desde su navegador!

## Acceso Remoto

El acceso remoto es manejado por la autenticación de [exe.dev](https://exe.dev). Por
defecto, el tráfico HTTP del puerto 8000 se reenvía a `https://<vm-name>.exe.xyz`
con autenticación por correo electrónico.

## Actualizando

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

Guía: [Actualizando](/en/install/updating)
