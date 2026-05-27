---
summary: "Alojar OpenClaw en Upstash Box con keep-alive y acceso a través de túnel SSH"
read_when:
  - Deploying OpenClaw to Upstash Box
  - You want a managed Linux environment for OpenClaw with SSH-tunneled dashboard access
title: "Upstash Box"
---

Ejecuta un OpenClaw Gateway persistente en Upstash Box, un entorno Linux administrado
con soporte de ciclo de vida de keep-alive.

Utiliza un túnel SSH para el acceso al panel de control. No expongas el puerto del Gateway
directamente a la internet pública.

## Requisitos previos

- Cuenta de Upstash
- Upstash Box con keep-alive
- Cliente SSH en tu máquina local

## Crear un Box

Crea un Box con keep-alive en la consola de Upstash. Anota el ID del Box, como
`right-flamingo-14486`, y tu clave de API del Box.

Upstash mantiene su guía actual de OpenClaw Box en
[OpenClaw Setup](https://upstash.com/docs/box/guides/openclaw-setup).

## Conectarse con un túnel SSH

Reenvía el puerto del panel de control de OpenClaw a tu máquina local. Usa tu clave de API del Box
como contraseña SSH cuando se te solicite:

```bash
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

Las opciones de keepalive reducen las desconexiones del túnel inactivo durante la incorporación.

## Instalar OpenClaw

Dentro del Box:

```bash
sudo npm install -g openclaw
```

## Ejecutar incorporación

```bash
openclaw onboard --install-daemon
```

Sigue las instrucciones. Copia la URL del panel de control y el token cuando finalice la incorporación.

## Iniciar el Gateway

Configura el Gateway para la red del Box e inícialo en segundo plano:

```bash
openclaw config set gateway.bind lan
nohup openclaw gateway > gateway.log 2>&1 &
```

Con el túnel SSH activo, abre la URL del panel de control localmente:

```text
http://127.0.0.1:18789/#token=<your-token>
```

## Reinicio automático

Establece este comando como script de inicio del Box para que el Gateway se reinicie cuando el Box
se inicie:

```bash
nohup openclaw gateway > gateway.log 2>&1 &
```

## Solución de problemas

Si SSH se congela durante la incorporación, vuelve a conectarte con una configuración SSH limpia y
keepalives:

```bash
ssh -F /dev/null -o ControlMaster=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

Esto evita la configuración local obsoleta de `~/.ssh/config` y mantiene el túnel activo
a través de períodos de red inactivos.

## Relacionado

- [Acceso remoto](/es/gateway/remote)
- [Seguridad del Gateway](/es/gateway/security)
- [Actualizar OpenClaw](/es/install/updating)
