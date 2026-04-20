---
summary: "Soporte de Linux + estado de la aplicación complementaria"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Aplicación de Linux"
---

# Aplicación de Linux

El Gateway es totalmente compatible con Linux. **Node es el runtime recomendado**.
Bun no se recomienda para el Gateway (errores de WhatsApp/Telegram).

Las aplicaciones complementarias nativas de Linux están planeadas. Las contribuciones son bienvenidas si deseas ayudar a construir una.

## Ruta rápida para principiantes (VPS)

1. Instalar Node 24 (recomendado; Node 22 LTS, actualmente `22.14+`, todavía funciona por compatibilidad)
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. Desde tu portátil: `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Abra `http://127.0.0.1:18789/` y autentíquese con el secreto compartido configurado (token por defecto; contraseña si estableció `gateway.auth.mode: "password"`)

Guía completa del servidor Linux: [Linux Server](/es/vps). Ejemplo paso a paso de VPS: [exe.dev](/es/install/exe-dev)

## Instalación

- [Getting Started](/es/start/getting-started)
- [Install & updates](/es/install/updating)
- Flujos opcionales: [Bun (experimental)](/es/install/bun), [Nix](/es/install/nix), [Docker](/es/install/docker)

## Gateway

- [Gateway runbook](/es/gateway)
- [Configuration](/es/gateway/configuration)

## Instalación del servicio Gateway (CLI)

Usa uno de estos:

```
openclaw onboard --install-daemon
```

O:

```
openclaw gateway install
```

O:

```
openclaw configure
```

Selecciona **Servicio Gateway** cuando se te solicite.

Reparar/migrar:

```
openclaw doctor
```

## Control del sistema (unidad de usuario systemd)

OpenClaw instala un servicio de **usuario** de systemd por defecto. Use un servicio de **sistema** para servidores compartidos o siempre activos. `openclaw gateway install` y `openclaw onboard --install-daemon` ya representan la unidad canónica actual para usted; escriba una manualmente solo cuando necesite una configuración personalizada del sistema/gestor de servicios. La guía completa del servicio se encuentra en el [Gateway runbook](/es/gateway).

Configuración mínima:

Cree `~/.config/systemd/user/openclaw-gateway[-<profile>].service`:

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

Actívalo:

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
