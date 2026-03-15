---
title: Fly.io
description: Desplegar OpenClaw en Fly.io
summary: "Despliegue paso a paso de OpenClaw en Fly.io con almacenamiento persistente y HTTPS"
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

# Despliegue en Fly.io

**Objetivo:** OpenClaw Gateway ejecutándose en una máquina de [Fly.io](https://fly.io) con almacenamiento persistente, HTTPS automático y acceso a Discord/canales.

## Lo que necesitas

- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) instalado
- Cuenta de Fly.io (funciona el nivel gratuito)
- Autenticación del modelo: clave API de tu proveedor de modelos elegido
- Credenciales del canal: token del bot de Discord, token de Telegram, etc.

## Camino rápido para principiantes

1. Clonar repositorio → personalizar `fly.toml`
2. Crear app + volumen → establecer secretos
3. Desplegar con `fly deploy`
4. Entrar por SSH para crear la configuración o usar la interfaz de usuario de Control

## 1) Crear la app de Fly

```bash
# Clone the repo
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Create a new Fly app (pick your own name)
fly apps create my-openclaw

# Create a persistent volume (1GB is usually enough)
fly volumes create openclaw_data --size 1 --region iad
```

**Consejo:** Elige una región cercana a ti. Opciones comunes: `lhr` (Londres), `iad` (Virginia), `sjc` (San José).

## 2) Configurar fly.toml

Edita `fly.toml` para que coincida con el nombre de tu app y los requisitos.

**Nota de seguridad:** La configuración predeterminada expone una URL pública. Para un despliegue reforzado sin IP pública, consulta [Private Deployment](#private-deployment-hardened) o usa `fly.private.toml`.

```toml
app = "my-openclaw"  # Your app name
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  OPENCLAW_PREFER_PNPM = "1"
  OPENCLAW_STATE_DIR = "/data"
  NODE_OPTIONS = "--max-old-space-size=1536"

[processes]
  app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  size = "shared-cpu-2x"
  memory = "2048mb"

[mounts]
  source = "openclaw_data"
  destination = "/data"
```

**Configuración clave:**

| Configuración                  | Por qué                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `--bind lan`                   | Se vincula a `0.0.0.0` para que el proxy de Fly pueda alcanzar la puerta de enlace              |
| `--allow-unconfigured`         | Se inicia sin un archivo de configuración (crearás uno después)                                 |
| `internal_port = 3000`         | Debe coincidir con `--port 3000` (o `OPENCLAW_GATEWAY_PORT`) para los controles de salud de Fly |
| `memory = "2048mb"`            | 512MB es muy poco; se recomiendan 2GB                                                           |
| `OPENCLAW_STATE_DIR = "/data"` | Mantiene el estado en el volumen                                                                |

## 3) Establecer secretos

```bash
# Required: Gateway token (for non-loopback binding)
fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

# Model provider API keys
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Optional: Other providers
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set GOOGLE_API_KEY=...

# Channel tokens
fly secrets set DISCORD_BOT_TOKEN=MTQ...
```

**Notas:**

- Los enlaces no locales (`--bind lan`) requieren `OPENCLAW_GATEWAY_TOKEN` por seguridad.
- Trata estos tokens como contraseñas.
- **Prefiere variables de entorno sobre el archivo de configuración** para todas las claves API y tokens. Esto mantiene los secretos fuera de `openclaw.json` donde podrían exponerse o registrarse accidentalmente.

## 4) Desplegar

```bash
fly deploy
```

El primer despliegue construye la imagen Docker (~2-3 minutos). Los despliegues posteriores son más rápidos.

Después del despliegue, verifica:

```bash
fly status
fly logs
```

Deberías ver:

```
[gateway] listening on ws://0.0.0.0:3000 (PID xxx)
[discord] logged in to discord as xxx
```

## 5) Crear archivo de configuración

Conéctate por SSH a la máquina para crear una configuración adecuada:

```bash
fly ssh console
```

Crea el directorio y el archivo de configuración:

```bash
mkdir -p /data
cat > /data/openclaw.json << 'EOF'
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-6",
        "fallbacks": ["anthropic/claude-sonnet-4-5", "openai/gpt-4o"]
      },
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "main",
        "default": true
      }
    ]
  },
  "auth": {
    "profiles": {
      "anthropic:default": { "mode": "token", "provider": "anthropic" },
      "openai:default": { "mode": "token", "provider": "openai" }
    }
  },
  "bindings": [
    {
      "agentId": "main",
      "match": { "channel": "discord" }
    }
  ],
  "channels": {
    "discord": {
      "enabled": true,
      "groupPolicy": "allowlist",
      "guilds": {
        "YOUR_GUILD_ID": {
          "channels": { "general": { "allow": true } },
          "requireMention": false
        }
      }
    }
  },
  "gateway": {
    "mode": "local",
    "bind": "auto"
  },
  "meta": {
    "lastTouchedVersion": "2026.1.29"
  }
}
EOF
```

**Nota:** Con `OPENCLAW_STATE_DIR=/data`, la ruta de configuración es `/data/openclaw.json`.

**Nota:** El token de Discord puede provenir de:

- Variable de entorno: `DISCORD_BOT_TOKEN` (recomendado para secretos)
- Archivo de configuración: `channels.discord.token`

Si usas una variable de entorno, no hay necesidad de añadir el token a la configuración. El gateway lee `DISCORD_BOT_TOKEN` automáticamente.

Reinicia para aplicar:

```bash
exit
fly machine restart <machine-id>
```

## 6) Acceder al Gateway

### Interfaz de Control

Abrir en el navegador:

```bash
fly open
```

O visita `https://my-openclaw.fly.dev/`

Pega tu token del gateway (el de `OPENCLAW_GATEWAY_TOKEN`) para autenticarte.

### Registros

```bash
fly logs              # Live logs
fly logs --no-tail    # Recent logs
```

### Consola SSH

```bash
fly ssh console
```

## Solución de problemas

### "La aplicación no está escuchando en la dirección esperada"

El gateway se está vinculando a `127.0.0.1` en lugar de `0.0.0.0`.

**Solución:** Añade `--bind lan` a tu comando de proceso en `fly.toml`.

### Fallos en las comprobaciones de salud / conexión rechazada

Fly no puede alcanzar el gateway en el puerto configurado.

**Solución:** Asegúrate de que `internal_port` coincida con el puerto del gateway (establece `--port 3000` o `OPENCLAW_GATEWAY_PORT=3000`).

### Problemas de OOM / Memoria

El contenedor se mantiene reiniciando o siendo terminado. Signos: `SIGABRT`, `v8::internal::Runtime_AllocateInYoungGeneration`, o reinicios silenciosos.

**Solución:** Aumenta la memoria en `fly.toml`:

```toml
[[vm]]
  memory = "2048mb"
```

O actualiza una máquina existente:

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**Nota:** 512MB es demasiado poco. 1GB puede funcionar pero puede dar OOM bajo carga o con registro detallado. **Se recomiendan 2GB.**

### Problemas de Bloqueo del Gateway

El gateway se niega a iniciar con errores de "ya está en ejecución".

Esto sucede cuando el contenedor se reinicia pero el archivo de bloqueo de PID persiste en el volumen.

**Solución:** Elimina el archivo de bloqueo:

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

El archivo de bloqueo está en `/data/gateway.*.lock` (no en un subdirectorio).

### Configuración No Leída

Si usas `--allow-unconfigured`, el gateway crea una configuración mínima. Tu configuración personalizada en `/data/openclaw.json` debería leerse al reiniciar.

Verifica que la configuración existe:

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### Escribir Configuración vía SSH

El comando `fly ssh console -C` no soporta redirección de shell. Para escribir un archivo de configuración:

```bash
# Use echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# Or use sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**Nota:** `fly sftp` puede fallar si el archivo ya existe. Elimínelo primero:

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### Estado No Persistente

Si pierde credenciales o sesiones después de un reinicio, el directorio de estado se está escribiendo en el sistema de archivos del contenedor.

**Solución:** Asegúrese de que `OPENCLAW_STATE_DIR=/data` esté configurado en `fly.toml` y vuelva a desplegar.

## Actualizaciones

```bash
# Pull latest changes
git pull

# Redeploy
fly deploy

# Check health
fly status
fly logs
```

### Actualizar Comando de Máquina

Si necesita cambiar el comando de inicio sin un redespliegue completo:

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**Nota:** Después de `fly deploy`, el comando de la máquina puede restablecerse a lo que está en `fly.toml`. Si realizó cambios manuales, vuelva a aplicarlos después del despliegue.

## Despliegue Privado (Reforzado)

Por defecto, Fly asigna IPs públicas, haciendo que su puerta de enlace sea accesible en `https://your-app.fly.dev`. Esto es conveniente pero significa que su despliegue es descubrible por escáneres de internet (Shodan, Censys, etc.).

Para un despliegue reforzado con **sin exposición pública**, use la plantilla privada.

### Cuándo usar el despliegue privado

- Solo realiza llamadas/mensajes **salientes** (sin webhooks entrantes)
- Usa túneles **ngrok o Tailscale** para cualquier devolución de llamada de webhook
- Accede a la puerta de enlace a través de **SSH, proxy o WireGuard** en lugar del navegador
- Quiere que el despliegue esté **oculto para los escáneres de internet**

### Configuración

Use `fly.private.toml` en lugar de la configuración estándar:

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

O convierta un despliegue existente:

```bash
# List current IPs
fly ips list -a my-openclaw

# Release public IPs
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# Switch to private config so future deploys don't re-allocate public IPs
# (remove [http_service] or deploy with the private template)
fly deploy -c fly.private.toml

# Allocate private-only IPv6
fly ips allocate-v6 --private -a my-openclaw
```

Después de esto, `fly ips list` debería mostrar solo una IP de tipo `private`:

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### Acceder a un despliegue privado

Dado que no hay una URL pública, use uno de estos métodos:

**Opción 1: Proxy local (lo más simple)**

```bash
# Forward local port 3000 to the app
fly proxy 3000:3000 -a my-openclaw

# Then open http://localhost:3000 in browser
```

**Opción 2: VPN WireGuard**

```bash
# Create WireGuard config (one-time)
fly wireguard create

# Import to WireGuard client, then access via internal IPv6
# Example: http://[fdaa:x:x:x:x::x]:3000
```

**Opción 3: Solo SSH**

```bash
fly ssh console -a my-openclaw
```

### Webhooks con despliegue privado

Si necesita devoluciones de llamada de webhook (Twilio, Telnyx, etc.) sin exposición pública:

1. **Túnel ngrok** - Ejecute ngrok dentro del contenedor o como sidecar
2. **Tailscale Funnel** - Exponga rutas específicas a través de Tailscale
3. **Solo saliente** - Algunos proveedores (Twilio) funcionan bien para llamadas salientes sin webhooks

Ejemplo de configuración de llamada de voz con ngrok:

```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio",
          "tunnel": { "provider": "ngrok" },
          "webhookSecurity": {
            "allowedHosts": ["example.ngrok.app"]
          }
        }
      }
    }
  }
}
```

El túnel ngrok se ejecuta dentro del contenedor y proporciona una URL de webhook pública sin exponer la aplicación de Fly en sí. Establezca `webhookSecurity.allowedHosts` al nombre de host del túnel público para que se acepten los encabezados de host reenviados.

### Beneficios de seguridad

| Aspecto                                      | Público    | Privado    |
| -------------------------------------------- | ---------- | ---------- |
| Escáneres de internet                        | Detectable | Oculto     |
| Ataques directos                             | Posibles   | Bloqueados |
| Controlar el acceso a la interfaz de usuario | Navegador  | Proxy/VPN  |
| Entrega de webhooks                          | Directa    | Vía túnel  |

## Notas

- Fly.io utiliza la **arquitectura x86** (no ARM)
- El Dockerfile es compatible con ambas arquitecturas
- Para el registro de WhatsApp/Telegram, use `fly ssh console`
- Los datos persistentes residen en el volumen en `/data`
- Signal requiere Java + signal-cli; use una imagen personalizada y mantenga la memoria en 2GB o más.

## Coste

Con la configuración recomendada (`shared-cpu-2x`, 2GB RAM):

- ~$10-15/mes dependiendo del uso
- El nivel gratuito incluye cierta asignación

Consulte los [precios de Fly.io](https://fly.io/docs/about/pricing/) para obtener más detalles.

import es from "/components/footer/es.mdx";

<es />
