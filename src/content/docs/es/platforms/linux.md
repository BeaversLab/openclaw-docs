---
summary: "Soporte de Linux + estado de la aplicación complementaria"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Aplicación Linux"
---

# Aplicación de Linux

El Gateway es totalmente compatible con Linux. **Node es el runtime recomendado**.
Bun no se recomienda para el Gateway (errores de WhatsApp/Telegram).

Las aplicaciones complementarias nativas de Linux están planeadas. Las contribuciones son bienvenidas si deseas ayudar a construir una.

## Ruta rápida para principiantes (VPS)

1. Instala Node 24 (recomendado; Node 22 LTS, actualmente `22.14+`, aún funciona por compatibilidad)
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. Desde tu portátil: `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Abre `http://127.0.0.1:18789/` y autentícate con el secreto compartido configurado (token por defecto; contraseña si estableces `gateway.auth.mode: "password"`)

Guía completa del servidor Linux: [Linux Server](/es/vps). Ejemplo paso a paso de VPS: [exe.dev](/es/install/exe-dev)

## Instalación

- [Getting Started](/es/start/getting-started)
- [Instalación y actualizaciones](/es/install/updating)
- Flujos opcionales: [Bun (experimental)](/es/install/bun), [Nix](/es/install/nix), [Docker](/es/install/docker)

## Gateway

- [Manual del Gateway](/es/gateway)
- [Configuración](/es/gateway/configuration)

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

OpenClaw instala un servicio de **usuario** de systemd por defecto. Usa un servicio de **sistema** para servidores compartidos o siempre activos. `openclaw gateway install` y
`openclaw onboard --install-daemon` ya renderizan la unidad canónica actual
para ti; escribe una manualmente solo cuando necesites una configuración personalizada de sistema/gestor de servicios.
La guía completa del servicio se encuentra en el [manual del Gateway](/es/gateway).

Configuración mínima:

Crea `~/.config/systemd/user/openclaw-gateway[-<profile>].service`:

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

## Presión de memoria y finalizaciones OOM

En Linux, el núcleo elige una víctima OOM cuando un host, máquina virtual o cgroup de contenedor
se queda sin memoria. El Gateway puede ser una mala víctima porque posee sesiones
y conexiones de canal de larga duración. OpenClaw, por lo tanto, sesga los procesos hijos transitorios
para que sean eliminados antes que el Gateway cuando sea posible.

Para los procesos hijos de Linux elegibles, OpenClaw inicia el hijo a través de un pequeño
wrapper `/bin/sh` que eleva el propio `oom_score_adj` del hijo a `1000` y luego
`exec` el comando real. Esta es una operación sin privilegios porque el hijo está
solo aumentando su propia probabilidad de muerte OOM.

Las superficies de procesos secundarios cubiertas incluyen:

- secundarios de comandos gestionados por supervisor,
- secundarios de shell PTY,
- secundarios de servidor stdio MCP,
- procesos de navegador/Chrome iniciados por OpenClaw.

El contenedor es solo para Linux y se omite cuando `/bin/sh` no está disponible. También se omite si el entorno del proceso secundario establece `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`, `false`,
`no` o `off`.

Para verificar un proceso secundario:

```bash
cat /proc/<child-pid>/oom_score_adj
```

El valor esperado para los secundarios cubiertos es `1000`. El proceso Gateway debe mantener
su puntuación normal, generalmente `0`.

Esto no reemplaza el ajuste normal de memoria. Si un VPS o contenedor elimina
repetidamente los secundarios, aumente el límite de memoria, reduzca la concurrencia o agregue controles
de recursos más sólidos, como systemd `MemoryMax=` o límites de memoria a nivel de contenedor.
