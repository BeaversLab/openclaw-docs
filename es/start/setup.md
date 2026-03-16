---
summary: "Configuración avanzada y flujos de trabajo de desarrollo para OpenClaw"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "Configuración"
---

# Configuración

<Note>
  Si está configurando por primera vez, comience con [Introducción](/es/start/getting-started). Para
  obtener detalles sobre el asistente, consulte [Asistente de incorporación](/es/start/wizard).
</Note>

Última actualización: 2026-01-01

## TL;DR

- **La personalización vive fuera del repositorio:** `~/.openclaw/workspace` (espacio de trabajo) + `~/.openclaw/openclaw.json` (configuración).
- **Flujo de trabajo estable:** instale la aplicación de macOS; déjela ejecutar el Gateway incluido.
- **Flujo de trabajo de vanguardia (bleeding edge):** ejecute el Gateway usted mismo a través de `pnpm gateway:watch`, luego permita que la aplicación de macOS se adjunte en modo Local.

## Requisitos previos (desde el código fuente)

- Node `>=22`
- `pnpm`
- Docker (opcional; solo para configuración/e2e en contenedores — consulte [Docker](/es/install/docker))

## Estrategia de personalización (para que las actualizaciones no dañen)

Si quiere "100% adaptado a mí" _y_ actualizaciones fáciles, mantenga su personalización en:

- **Configuración:** `~/.openclaw/openclaw.json` (tipo JSON/JSON5)
- **Espacio de trabajo:** `~/.openclaw/workspace` (habilidades, indicaciones, recuerdos; hágalo un repositorio git privado)

Inicialice una vez:

```bash
openclaw setup
```

Desde dentro de este repositorio, use la entrada de CLI local:

```bash
openclaw setup
```

Si aún no tiene una instalación global, ejecútela a través de `pnpm openclaw setup`.

## Ejecutar el Gateway desde este repositorio

Después de `pnpm build`, puede ejecutar la CLI empaquetada directamente:

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Flujo de trabajo estable (primero la aplicación macOS)

1. Instale e inicie **OpenClaw.app** (barra de menús).
2. Complete la lista de verificación de incorporación/permisos (indicaciones TCC).
3. Asegúrese de que el Gateway esté **Local** y en ejecución (la aplicación lo gestiona).
4. Vincule superficies (ejemplo: WhatsApp):

```bash
openclaw channels login
```

5. Verificación de cordura:

```bash
openclaw health
```

Si la incorporación no está disponible en su compilación:

- Ejecute `openclaw setup`, luego `openclaw channels login`, luego inicie el Gateway manualmente (`openclaw gateway`).

## Flujo de trabajo de vanguardia (Gateway en una terminal)

Objetivo: trabajar en el Gateway de TypeScript, obtener recarga en caliente (hot reload), mantener la interfaz de usuario de la aplicación macOS adjunta.

### 0) (Opcional) Ejecutar la aplicación macOS también desde el código fuente

Si también desea la aplicación macOS en la vanguardia:

```bash
./scripts/restart-mac.sh
```

### 1) Iniciar el Gateway de desarrollo

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` ejecuta la puerta de enlace en modo de observación y se recarga ante cambios relevantes en el código fuente,
la configuración y los metadatos de los plugins empaquetados.

### 2) Apunte la app de macOS a su Gateway en ejecución

En **OpenClaw.app**:

- Modo de conexión: **Local**
  La app se conectará al gateway en ejecución en el puerto configurado.

### 3) Verificar

- El estado del Gateway en la app debería indicar **“Usando gateway existente …”**
- O vía CLI:

```bash
openclaw health
```

### Errores comunes

- **Puerto incorrecto:** El WS del Gateway por defecto es `ws://127.0.0.1:18789`; mantenga la app y la CLI en el mismo puerto.
- **Dónde reside el estado:**
  - Credenciales: `~/.openclaw/credentials/`
  - Sesiones: `~/.openclaw/agents/<agentId>/sessions/`
  - Registros: `/tmp/openclaw/`

## Mapa de almacenamiento de credenciales

Use esto al depurar autenticación o decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token de bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo regular; se rechazan enlaces simbólicos)
- **Token de bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permitidos para emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelos**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Carga útil de secretos respaldada en archivo (opcional)**: `~/.openclaw/secrets.json`
- **Importación de OAuth heredada**: `~/.openclaw/credentials/oauth.json`
  Más detalles: [Seguridad](/es/gateway/security#credential-storage-map).

## Actualización (sin arruinar su configuración)

- Mantenga `~/.openclaw/workspace` y `~/.openclaw/` como “sus cosas”; no ponga avisos/configuraciones personales en el repositorio `openclaw`.
- Actualizar fuente: `git pull` + `pnpm install` (cuando cambió el lockfile) + seguir usando `pnpm gateway:watch`.

## Linux (servicio de usuario systemd)

Las instalaciones en Linux usan un servicio de usuario systemd. De forma predeterminada, systemd detiene los servicios de usuario al cerrar sesión o estar inactivo, lo que mata al Gateway. El onboarding intenta habilitar el lingering por usted (puede pedir contraseña sudo). Si aún está desactivado, ejecute:

```bash
sudo loginctl enable-linger $USER
```

Para servidores siempre activos o multiusuario, considere un servicio de **sistema** en lugar de un servicio de usuario (no se necesita lingering). Consulte [Manual de operaciones del Gateway](/es/gateway) para las notas sobre systemd.

## Documentación relacionada

- [Manual del Gateway](/es/gateway) (indicadores, supervisión, puertos)
- [Configuración del Gateway](/es/gateway/configuration) (esquema de configuración + ejemplos)
- [Discord](/es/channels/discord) y [Telegram](/es/channels/telegram) (etiquetas de respuesta + configuraciones replyToMode)
- [Configuración del asistente OpenClaw](/es/start/openclaw)
- [Aplicación macOS](/es/platforms/macos) (ciclo de vida del gateway)

import es from "/components/footer/es.mdx";

<es />
