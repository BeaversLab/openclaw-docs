---
summary: "Ejecute OpenClaw Gateway en EasyRunner con Podman y Caddy"
read_when:
  - Deploying OpenClaw on EasyRunner
  - Running the Gateway behind EasyRunner's Caddy proxy
  - Choosing persistent volumes and auth for a hosted Gateway
title: "EasyRunner"
---

EasyRunner puede alojar el OpenClaw Gateway como una pequeña aplicación contenedorizada detrás de su
proxy Caddy. Esta guía asume un host EasyRunner que ejecuta aplicaciones Compose
compatibles con Podman y expone HTTPS a través de Caddy.

## Antes de comenzar

- Un servidor EasyRunner con un dominio enrutado hacia él.
- Una imagen contenedorizada de OpenClaw compilada o publicada.
- Un volumen de configuración persistente para `/home/node/.openclaw`.
- Un volumen de espacio de trabajo persistente para `/workspace`.
- Un token o contraseña fuerte de Gateway.

Mantenga la autenticación de dispositivos habilitada cuando sea posible. Si su implementación de proxy inverso no puede
transportar la identidad del dispositivo correctamente, corrija primero la configuración de proxy confiable; use
omisiones peligrosas de autenticación solo para una red totalmente privada y controlada por el operador.

## Aplicación Compose

Cree una aplicación EasyRunner con un archivo Compose con una estructura como esta:

```yaml
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    restart: unless-stopped
    environment:
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      OPENCLAW_HOME: /home/node
      OPENCLAW_STATE_DIR: /home/node/.openclaw
      OPENCLAW_CONFIG_PATH: /home/node/.openclaw/openclaw.json
      OPENCLAW_WORKSPACE_DIR: /workspace
    volumes:
      - openclaw-config:/home/node/.openclaw
      - openclaw-workspace:/workspace
    labels:
      caddy: openclaw.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["openclaw", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  openclaw-config:
  openclaw-workspace:
```

Reemplace `openclaw.example.com` con el nombre de host de su Gateway. Almacene
`OPENCLAW_GATEWAY_TOKEN` en el administrador de secretos/entorno de EasyRunner en lugar de
confirmarlo en la definición de la aplicación.

## Configurar OpenClaw

Dentro del volumen de configuración persistente, mantenga el Gateway accesible solo a través
del proxy y exija autenticación:

```json5
{
  gateway: {
    bind: "lan",
    port: 1455,
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
}
```

Si Caddy termina TLS para el Gateway, configure la configuración de proxy confiable para
la ruta exacta del proxy en lugar de deshabilitar globalmente las verificaciones de autenticación. Vea
[Autenticación de proxy confiable](/es/gateway/trusted-proxy-auth).

## Verificar

Desde su estación de trabajo:

```bash
openclaw gateway probe --url https://openclaw.example.com --token <token>
openclaw gateway status --url https://openclaw.example.com --token <token>
```

Desde el host EasyRunner, verifique los registros de la aplicación para ver si hay un Gateway a la escucha y sin
fallos de autenticación de SecretRef, complemento o canal al inicio.

## Actualizaciones y copias de seguridad

- Extraiga o compile la nueva imagen de OpenClaw y luego vuelva a implementar la aplicación EasyRunner.
- Haga una copia de seguridad del volumen `openclaw-config` antes de las actualizaciones.
- Haga una copia de seguridad de `openclaw-workspace` si los agentes escriben datos duraderos del proyecto allí.
- Ejecute `openclaw doctor` después de actualizaciones importantes para detectar migraciones de configuración y
  advertencias de servicio.

## Solución de problemas

- `gateway probe` no puede conectarse: confirme que el nombre de host de Caddy apunte a la aplicación
  y que el contenedor escuche en `0.0.0.0:1455`.
- Fallo de autenticación: rote el token en los secretos de EasyRunner y el comando del cliente local
  juntos.
- Los archivos son propiedad de root después de la restauración: repare los volúmenes montados para que el usuario del contenedor pueda escribir `/home/node/.openclaw` y `/workspace`.
- Fallo de los complementos del navegador o del canal: compruebe si los binarios externos necesarios, la salida de red y las credenciales montadas están disponibles dentro del contenedor.
