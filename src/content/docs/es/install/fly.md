---
title: Fly.io
summary: "Despliegue paso a paso de OpenClaw en Fly.io con almacenamiento persistente y HTTPS"
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

# Despliegue en Fly.io

**Objetivo:** OpenClaw Gateway ejecutándose en una máquina [Fly.io](https://fly.io) con almacenamiento persistente, HTTPS automático y acceso a Discord/canales.

## Lo que necesitas

- [CLI flyctl](https://fly.io/docs/hands-on/install-flyctl/) instalada
- Cuenta de Fly.io (la capa gratuita funciona)
- Autenticación del modelo: clave API para tu proveedor de modelos elegido
- Credenciales del canal: token del bot de Discord, token de Telegram, etc.

## Ruta rápida para principiantes

1. Clonar repositorio → personalizar `fly.toml`
2. Crear aplicación + volumen → establecer secretos
3. Desplegar con `fly deploy`
4. Entrar por SSH para crear la configuración o usar la UI de Control

<Steps>
  <Step title="Crear la app de Fly">
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

  </Step>

  <Step title="Configurar fly.toml">
    Edita `fly.toml` para que coincida con el nombre de tu aplicación y los requisitos.

    **Nota de seguridad:** La configuración predeterminada expone una URL pública. Para un despliegue reforzado sin IP pública, consulta [Despliegue Privado](#private-deployment-hardened) o usa `fly.private.toml`.

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

    **Configuraciones clave:**

    | Configuración                        | Por qué                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | Se vincula a `0.0.0.0` para que el proxy de Fly pueda alcanzar el gateway                     |
    | `--allow-unconfigured`         | Se inicia sin un archivo de configuración (crearás uno después)                      |
    | `internal_port = 3000`         | Debe coincidir con `--port 3000` (o `OPENCLAW_GATEWAY_PORT`) para los controles de salud de Fly |
    | `memory = "2048mb"`            | 512MB es muy poco; se recomiendan 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | Persiste el estado en el volumen                                                |

  </Step>

  <Step title="Establecer secretos">
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

    - Los enlaces que no son de bucle local (`--bind lan`) requieren `OPENCLAW_GATEWAY_TOKEN` por seguridad.
    - Trate estos tokens como contraseñas.
    - **Prefiera las variables de entorno al archivo de configuración** para todas las claves de API y tokens. Esto mantiene los secretos fuera de `openclaw.json` donde podrían exponerse o registrarse accidentalmente.

  </Step>

  <Step title="Desplegar">
    ```bash
    fly deploy
    ```

    El primer despliegue construye la imagen de Docker (~2-3 minutos). Los despliegues posteriores son más rápidos.

    Después del despliegue, verifique:

    ```bash
    fly status
    fly logs
    ```

    Debería ver:

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="Crear archivo de configuración">
    Acceda por SSH a la máquina para crear una configuración adecuada:

    ```bash
    fly ssh console
    ```

    Cree el directorio y el archivo de configuración:

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-4o"]
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
      "meta": {}
    }
    EOF
    ```

    **Nota:** Con `OPENCLAW_STATE_DIR=/data`, la ruta de configuración es `/data/openclaw.json`.

    **Nota:** El token de Discord puede provenir de:

    - Variable de entorno: `DISCORD_BOT_TOKEN` (recomendado para secretos)
    - Archivo de configuración: `channels.discord.token`

    Si usa una variable de entorno, no es necesario agregar el token a la configuración. El gateway lee `DISCORD_BOT_TOKEN` automáticamente.

    Reinicie para aplicar:

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="Acceder al Gateway">
    ### Interfaz de control

    Abrir en el navegador:

    ```bash
    fly open
    ```

    O visite `https://my-openclaw.fly.dev/`

    Pegue su token de gateway (el de `OPENCLAW_GATEWAY_TOKEN`) para autenticarse.

    ### Registros

    ```bash
    fly logs              # Live logs
    fly logs --no-tail    # Recent logs
    ```

    ### Consola SSH

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## Solución de problemas

### "La aplicación no está escuchando en la dirección esperada"

El gateway se está vinculando a `127.0.0.1` en lugar de `0.0.0.0`.

**Solución:** Agregue `--bind lan` a su comando de proceso en `fly.toml`.

### Fallos en las comprobaciones de salud / conexión rechazada

Fly no puede alcanzar el gateway en el puerto configurado.

**Solución:** Asegúrese de que `internal_port` coincida con el puerto de la pasarela (establezca `--port 3000` o `OPENCLAW_GATEWAY_PORT=3000`).

### Problemas de OOM / Memoria

El contenedor se sigue reiniciando o finalizándose. Signos: `SIGABRT`, `v8::internal::Runtime_AllocateInYoungGeneration` o reinicios silenciosos.

**Solución:** Aumente la memoria en `fly.toml`:

```toml
[[vm]]
  memory = "2048mb"
```

O actualice una máquina existente:

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**Nota:** 512MB es demasiado poco. 1GB puede funcionar pero puede provocar OOM bajo carga o con registros detallados. **Se recomiendan 2GB.**

### Problemas de bloqueo de la pasarela

La pasarela se niega a iniciarse con errores de "ya se está ejecutando".

Esto sucede cuando el contenedor se reinicia pero el archivo de bloqueo PID persiste en el volumen.

**Solución:** Elimine el archivo de bloqueo:

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

El archivo de bloqueo está en `/data/gateway.*.lock` (no en un subdirectorio).

### Configuración no se está leyendo

Si usa `--allow-unconfigured`, la pasarela crea una configuración mínima. Su configuración personalizada en `/data/openclaw.json` debería leerse al reiniciar.

Verifique que la configuración existe:

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### Escribir configuración a través de SSH

El comando `fly ssh console -C` no admite el redireccionamiento de shell. Para escribir un archivo de configuración:

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

### El estado no persiste

Si pierde credenciales o sesiones después de un reinicio, el directorio de estado se está escribiendo en el sistema de archivos del contenedor.

**Solución:** Asegúrese de que `OPENCLAW_STATE_DIR=/data` esté configurado en `fly.toml` y vuelva a implementar.

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

### Comando de actualización de máquina

Si necesita cambiar el comando de inicio sin una implementación completa:

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**Nota:** Después de `fly deploy`, el comando de la máquina puede restablecerse a lo que está en `fly.toml`. Si realizó cambios manuales, aplíquelos nuevamente después de la implementación.

## Implementación privada (Endurecida)

De forma predeterminada, Fly asigna direcciones IP públicas, lo que hace que su pasarela sea accesible en `https://your-app.fly.dev`. Esto es conveniente pero significa que su implementación puede ser descubierta por escáneres de Internet (Shodan, Censys, etc.).

Para una implementación endurecida con **sin exposición pública**, use la plantilla privada.

### Cuándo usar la implementación privada

- Solo realiza **salientes** llamadas/mensajes (sin webhooks entrantes)
- Usa túneles **ngrok o Tailscale** para cualquier devolución de llamada de webhook
- Accedes a la puerta de enlace a través de **SSH, proxy o WireGuard** en lugar del navegador
- Quieres que el despliegue esté **oculto para los escáneres de internet**

### Configuración

Usa `fly.private.toml` en lugar de la configuración estándar:

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

O convierte un despliegue existente:

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

Dado que no hay una URL pública, usa uno de estos métodos:

**Opción 1: Proxy local (el más sencillo)**

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

Si necesitas devoluciones de llamada de webhook (Twilio, Telnyx, etc.) sin exposición pública:

1. **Túnel ngrok** - Ejecuta ngrok dentro del contenedor o como sidecar
2. **Tailscale Funnel** - Expone rutas específicas a través de Tailscale
3. **Solo saliente** - Algunos proveedores (Twilio) funcionan bien para llamadas salientes sin webhooks

Ejemplo de configuración de llamada de voz con ngrok:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          tunnel: { provider: "ngrok" },
          webhookSecurity: {
            allowedHosts: ["example.ngrok.app"],
          },
        },
      },
    },
  },
}
```

El túnel ngrok se ejecuta dentro del contenedor y proporciona una URL de webhook pública sin exponer la aplicación de Fly en sí. Establece `webhookSecurity.allowedHosts` al nombre de host del túnel público para que se acepten los encabezados de host reenviados.

### Beneficios de seguridad

| Aspecto                         | Público    | Privado    |
| ------------------------------- | ---------- | ---------- |
| Escáneres de internet           | Detectable | Oculto     |
| Ataques directos                | Posibles   | Bloqueados |
| Acceso a la interfaz de control | Navegador  | Proxy/VPN  |
| Entrega de webhooks             | Directa    | Vía túnel  |

## Notas

- Fly.io utiliza la **arquitectura x86** (no ARM)
- El Dockerfile es compatible con ambas arquitecturas
- Para el registro en WhatsApp/Telegram, usa `fly ssh console`
- Los datos persistentes residen en el volumen en `/data`
- Signal requiere Java + signal-cli; usa una imagen personalizada y mantén la memoria en 2GB o más.

## Coste

Con la configuración recomendada (`shared-cpu-2x`, 2GB RAM):

- ~$10-15/mes dependiendo del uso
- El nivel gratuito incluye alguna asignación

Consulta los [precios de Fly.io](https://fly.io/docs/about/pricing/) para obtener detalles.

## Próximos pasos

- Configura canales de mensajería: [Canales](/en/channels)
- Configura la puerta de enlace: [Configuración de la puerta de enlace](/en/gateway/configuration)
- Mantén OpenClaw actualizado: [Actualización](/en/install/updating)
