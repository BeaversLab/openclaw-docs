---
summary: "Configuración avanzada y flujos de trabajo de desarrollo para OpenClaw"
read_when:
  - Configuración de una nueva máquina
  - Quieres lo “último y más grande” sin romper tu configuración personal
title: "Setup"
---

# Setup

<Note>
  Si estás configurando por primera vez, empieza con [Getting Started](/es/start/getting-started).
  Para ver los detalles de incorporación, consulta [Onboarding (CLI)](/es/start/wizard).
</Note>

Última actualización: 2026-01-01

## TL;DR

- **Tailoring lives outside the repo:** `~/.openclaw/workspace` (workspace) + `~/.openclaw/openclaw.json` (config).
- **Stable workflow:** instala la aplicación de macOS; deja que ejecute el Gateway incluido.
- **Bleeding edge workflow:** ejecuta el Gateway tú mismo mediante `pnpm gateway:watch`, luego deja que la aplicación de macOS se adjunte en modo Local.

## Prereqs (from source)

- Node `>=22`
- `pnpm`
- Docker (opcional; solo para configuración/e2e en contenedores — ver [Docker](/es/install/docker))

## Tailoring strategy (so updates do not hurt)

Si quieres “100% personalizado para mí” _y_ actualizaciones fáciles, mantén tu personalización en:

- **Config:** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Workspace:** `~/.openclaw/workspace` (habilidades, prompts, recuerdos; hazlo un repositorio git privado)

Bootstrap once:

```bash
openclaw setup
```

Desde dentro de este repositorio, usa la entrada CLI local:

```bash
openclaw setup
```

Si aún no tienes una instalación global, ejecútalo mediante `pnpm openclaw setup`.

## Run the Gateway from this repo

Después de `pnpm build`, puedes ejecutar el CLI empaquetado directamente:

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Stable workflow (macOS app first)

1. Instala + inicia **OpenClaw.app** (barra de menús).
2. Completa la lista de verificación de incorporación/permisos (prompts TCC).
3. Asegúrate de que Gateway esté en modo **Local** y ejecutándose (la aplicación lo gestiona).
4. Link surfaces (ejemplo: WhatsApp):

```bash
openclaw channels login
```

5. Sanity check:

```bash
openclaw health
```

Si la incorporación no está disponible en tu compilación:

- Ejecuta `openclaw setup`, luego `openclaw channels login`, y luego inicia el Gateway manualmente (`openclaw gateway`).

## Bleeding edge workflow (Gateway in a terminal)

Objetivo: trabajar en el Gateway de TypeScript, obtener recarga en caliente, mantener la interfaz de usuario de la aplicación de macOS adjunta.

### 0) (Optional) Run the macOS app from source too

Si también quieres la aplicación de macOS en la última versión:

```bash
./scripts/restart-mac.sh
```

### 1) Start the dev Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` ejecuta la puerta de enlace en modo de observación y se recarga ante cambios relevantes en el código fuente, configuración y metadatos de los complementos empaquetados.

### 2) Apunte la aplicación de macOS a su Gateway en ejecución

En **OpenClaw.app**:

- Modo de conexión: **Local**
  La aplicación se conectará a la puerta de enlace en ejecución en el puerto configurado.

### 3) Verificar

- El estado del Gateway en la aplicación debería indicar **“Using existing gateway …”**
- O a través de CLI:

```bash
openclaw health
```

### Errores comunes

- **Puerto incorrecto:** El WS del Gateway por defecto es `ws://127.0.0.1:18789`; mantenga la aplicación y la CLI en el mismo puerto.
- **Dónde reside el estado:**
  - Credenciales: `~/.openclaw/credentials/`
  - Sesiones: `~/.openclaw/agents/<agentId>/sessions/`
  - Registros: `/tmp/openclaw/`

## Mapa de almacenamiento de credenciales

Use esto al depurar la autenticación o al decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token de bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos)
- **Token de bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permitidos para emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelos**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Carga útil de secretos respaldados en archivo (opcional)**: `~/.openclaw/secrets.json`
- **Importación de OAuth heredada**: `~/.openclaw/credentials/oauth.json`
  Más detalles: [Seguridad](/es/gateway/security#credential-storage-map).

## Actualización (sin arruinar su configuración)

- Mantenga `~/.openclaw/workspace` y `~/.openclaw/` como “sus cosas”; no ponga instrucciones/configuraciones personales en el repositorio `openclaw`.
- Actualización del código fuente: `git pull` + `pnpm install` (cuando cambie el archivo de bloqueo) + siga usando `pnpm gateway:watch`.

## Linux (servicio de usuario systemd)

Las instalaciones en Linux utilizan un servicio de usuario systemd. De forma predeterminada, systemd detiene los servicios de usuario al cerrar sesión o estar inactivo, lo que finaliza el Gateway. El proceso de incorporación intenta habilitar la persistencia por usted (puede solicitar sudo). Si aún está desactivado, ejecute:

```bash
sudo loginctl enable-linger $USER
```

Para servidores siempre activos o multiusuario, considera un servicio **system** en lugar de un servicio de usuario (no se necesita lingering). Consulta [Gateway runbook](/es/gateway) para las notas de systemd.

## Documentos relacionados

- [Gateway runbook](/es/gateway) (flags, supervisión, puertos)
- [Configuración de Gateway](/es/gateway/configuration) (esquema de configuración + ejemplos)
- [Discord](/es/channels/discord) y [Telegram](/es/channels/telegram) (etiquetas de respuesta + configuración replyToMode)
- [Configuración del asistente OpenClaw](/es/start/openclaw)
- [Aplicación macOS](/es/platforms/macos) (ciclo de vida del gateway)

import es from "/components/footer/es.mdx";

<es />
