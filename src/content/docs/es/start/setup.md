---
summary: "Configuración avanzada y flujos de trabajo de desarrollo para OpenClaw"
read_when:
  - Setting up a new machine
  - You want "latest + greatest" without breaking your personal setup
title: "Configuración"
---

<Note>Si está configurando por primera vez, comience con [Getting Started](/es/start/getting-started). Para obtener detalles sobre la incorporación, consulte [Onboarding (CLI)](/es/start/wizard).</Note>

## TL;DR

Elige un flujo de trabajo de configuración según la frecuencia con la que quieras recibir actualizaciones y si deseas ejecutar el Gateway por tu cuenta:

- **Tailoring lives outside the repo:** mantenga su configuración y espacio de trabajo en `~/.openclaw/openclaw.json` y `~/.openclaw/workspace/` para que las actualizaciones del repositorio no las afecten.
- **Stable workflow (recommended for most):** instala la aplicación de macOS y déjala ejecutar el Gateway incluido.
- **Bleeding edge workflow (dev):** ejecute el Gateway usted mismo a través de `pnpm gateway:watch` y luego permita que la aplicación de macOS se adjunte en modo Local.

## Requisitos previos (desde el código fuente)

- Se recomienda Node 24 (Node 22 LTS, actualmente `22.19+`, todavía compatible)
- `pnpm` requerido para las descargas de origen. OpenClaw carga los complementos empaquetados desde los
  paquetes del espacio de trabajo pnpm `extensions/*` en modo de desarrollo, por lo que la raíz `npm install` no
  prepara el árbol de origen completo.
- Docker (opcional; solo para configuración/e2e en contenedores - consulte [Docker](/es/install/docker))

## Estrategia de personalización (para que las actualizaciones no dañen)

Si quiere "100% adaptado a mí" _y_ actualizaciones sencillas, mantenga su personalización en:

- **Config:** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Workspace:** `~/.openclaw/workspace` (habilidades, indicaciones, memorias; conviértalo en un repositorio git privado)

Inicializar una vez:

```bash
openclaw setup
```

Desde dentro de este repositorio, usa la entrada de CLI local:

```bash
openclaw setup
```

Si aún no tiene una instalación global, ejecútela a través de `pnpm openclaw setup`.

## Ejecutar el Gateway desde este repositorio

Después de `pnpm build`, puedes ejecutar el CLI empaquetado directamente:

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Flujo de trabajo estable (primero la aplicación macOS)

1. Instala + inicia **OpenClaw.app** (barra de menús).
2. Completa la lista de verificación de incorporación/permisos (indicaciones TCC).
3. Asegúrate de que Gateway esté en modo **Local** y ejecutándose (la aplicación lo gestiona).
4. Vincular superficies (ejemplo: WhatsApp):

```bash
openclaw channels login
```

5. Verificación de cordura:

```bash
openclaw health
```

Si la incorporación no está disponible en tu compilación:

- Ejecuta `openclaw setup`, luego `openclaw channels login`, y después inicia el Gateway manualmente (`openclaw gateway`).

## Flujo de trabajo de última hora (Gateway en una terminal)

Objetivo: trabajar en el Gateway de TypeScript, obtener recarga en caliente, mantener la interfaz de usuario de la aplicación macOS adjunta.

### 0) (Opcional) Ejecutar la aplicación macOS desde el código fuente también

Si también quieres la aplicación macOS en la última hora:

```bash
./scripts/restart-mac.sh
```

### 1) Iniciar el Gateway de desarrollo

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` inicia o reinicia el proceso de vigilancia (watch) del Gateway en una sesión tmux con nombre y se adjunta automáticamente desde terminales interactivos. Las shells no interactivas permanecen separadas e imprimen `tmux attach -t openclaw-gateway-watch-main`; use `OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch` para mantener una ejecución interactiva separada, o `pnpm gateway:watch:raw` para el modo de vigilancia en primer plano. El observador se recarga ante cambios relevantes en la fuente, la configuración y los metadatos de los complementos empaquetados. Si el Gateway observado sale durante el inicio, `gateway:watch` ejecuta `openclaw doctor --fix --non-interactive` una vez y reintentará; configure `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` para desactivar ese paso de reparación exclusivo para desarrolladores. `pnpm openclaw setup` es el paso de inicialización única de la configuración/espacio de trabajo local para una nueva extracción. `pnpm gateway:watch` no reconstruye `dist/control-ui`, por lo que vuelva a ejecutar `pnpm ui:build` después de cambios `ui/` o use `pnpm ui:dev` mientras desarrolla la interfaz de usuario de Control.

### 2) Apuntar la aplicación macOS a tu Gateway en ejecución

En **OpenClaw.app**:

- Modo de conexión: **Local**
  La aplicación se adjuntará al gateway en ejecución en el puerto configurado.

### 3) Verificar

- El estado del Gateway en la aplicación debería mostrar **"Using existing gateway …"**
- O a través de CLI:

```bash
openclaw health
```

### Errores comunes

- **Puerto incorrecto:** Gateway WS usa por defecto `ws://127.0.0.1:18789`; mantenga la aplicación y la CLI en el mismo puerto.
- **Dónde reside el estado:**
  - Estado del canal/proveedor: `~/.openclaw/credentials/`
  - Perfiles de autenticación de modelos: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Sesiones: `~/.openclaw/agents/<agentId>/sessions/`
  - Registros: `/tmp/openclaw/`

## Mapa de almacenamiento de credenciales

Úselo al depurar la autenticación o decidir qué respaldar:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Token de bot de Telegram**: config/env o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos)
- **Token de bot de Discord**: config/env o SecretRef (proveedores env/file/exec)
- **Tokens de Slack**: config/env (`channels.slack.*`)
- **Listas de permisos de emparejamiento**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (cuenta predeterminada)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (cuentas no predeterminadas)
- **Perfiles de autenticación de modelos**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Carga útil de secretos respaldados en archivo (opcional)**: `~/.openclaw/secrets.json`
- **Importación heredada de OAuth**: `~/.openclaw/credentials/oauth.json`
  Más detalles: [Seguridad](/es/gateway/security#credential-storage-map).

## Actualización (sin arruinar su configuración)

- Mantén `~/.openclaw/workspace` y `~/.openclaw/` como "tus cosas"; no pongas mensajes de usuario (prompts)/configuración personal en el repositorio `openclaw`.
- Actualizar fuente: `git pull` + `pnpm install` + seguir usando `pnpm gateway:watch`.

## Linux (servicio de usuario systemd)

Las instalaciones de Linux utilizan un servicio de **usuario** systemd. Por defecto, systemd detiene los servicios de usuario al cerrar la sesión o al estar inactivo, lo que mata el Gateway. El proceso de incorporación (onboarding) intenta habilitar el modo persistente (lingering) por ti (puede solicitar sudo). Si todavía está desactivado, ejecuta:

```bash
sudo loginctl enable-linger $USER
```

Para servidores siempre activos o multiusuario, considera un servicio del **sistema** en lugar de un servicio de usuario (no se necesita modo persistente). Consulta el [manual del Gateway](/es/gateway) para las notas sobre systemd.

## Documentación relacionada

- [Manual del Gateway](/es/gateway) (indicadores, supervisión, puertos)
- [Configuración del Gateway](/es/gateway/configuration) (esquema de configuración + ejemplos)
- [Discord](/es/channels/discord) y [Telegram](/es/channels/telegram) (etiquetas de respuesta + configuraciones de replyToMode)
- [Configuración del asistente OpenClaw](/es/start/openclaw)
- [Aplicación macOS](/es/platforms/macos) (ciclo de vida del gateway)
