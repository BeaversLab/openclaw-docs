---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige el estado/configuración obsoletos, verifica el estado y proporciona pasos de reparación procesables.

## Inicio rápido

```bash
openclaw doctor
```

### Sin interfaz gráfica / automatización

```bash
openclaw doctor --yes
```

Acepta los valores predeterminados sin preguntar (incluyendo pasos de reparación de reinicio/servicio/sandbox cuando sea aplicable).

```bash
openclaw doctor --repair
```

Aplica las reparaciones recomendadas sin preguntar (reparaciones + reinicios donde sea seguro).

```bash
openclaw doctor --repair --force
```

Aplica también reparaciones agresivas (sobrescribe las configuraciones personalizadas del supervisor).

```bash
openclaw doctor --non-interactive
```

Ejecuta sin preguntar y aplica solo migraciones seguras (normalización de configuración + movimientos de estado en disco). Omite acciones de reinicio/servicio/sandbox que requieren confirmación humana.
Las migraciones de estado heredadas se ejecutan automáticamente cuando se detectan.

```bash
openclaw doctor --deep
```

Escanea los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace (launchd/systemd/schtasks).

Si desea revisar los cambios antes de escribirlos, abra primero el archivo de configuración:

```bash
cat ~/.openclaw/openclaw.json
```

## Lo que hace (resumen)

- Actualización previa opcional para instalaciones de git (solo interactivo).
- Verificación de frescura del protocolo de la interfaz de usuario (reconstruye la interfaz de usuario de Control cuando el esquema del protocolo es más reciente).
- Verificación de estado + solicitud de reinicio.
- Resumen del estado de las habilidades (aptas/faltantes/bloqueadas).
- Normalización de configuración para valores heredados.
- Advertencias de anulación del proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Migración de estado en disco heredado (sesiones/directorio del agente/autenticación de WhatsApp).
- Migración de almacenamiento cron heredado (`jobId`, `schedule.cron`, campos de entrega/carga útil de nivel superior, carga útil `provider`, trabajos de reserva de webhook simples `notify: true`).
- Verificaciones de integridad y permisos del estado (sesiones, transcripciones, directorio de estado).
- Verificaciones de permisos del archivo de configuración (chmod 600) cuando se ejecuta localmente.
- Estado de autenticación del modelo: verifica la caducidad de OAuth, puede actualizar los tokens que caducan e informa de los estados de enfriamiento/deshabilitado del perfil de autenticación.
- Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
- Reparación de la imagen de sandbox cuando el sandboxing está habilitado.
- Migración de servicio heredado y detección de puerta de enlace adicional.
- Verificaciones de tiempo de ejecución de la puerta de enlace (servicio instalado pero no en ejecución; etiqueta launchd en caché).
- Advertencias del estado del canal (sondeadas desde la puerta de enlace en ejecución).
- Auditoría de la configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
- Verificaciones de mejores prácticas de tiempo de ejecución de la puerta de enlace (Node vs Bun, rutas del gestor de versiones).
- Diagnósticos de colisión de puertos de la puerta de enlace (puerto `18789` predeterminado).
- Advertencias de seguridad para políticas de DM abiertas.
- Verificaciones de autenticación de la puerta de enlace para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones SecretRef de token).
- Verificación de persistencia de systemd en Linux.
- Verificaciones de instalación desde código fuente (discordancia en el espacio de trabajo de pnpm, activos de UI faltantes, binario tsx faltante).
- Escribe la configuración actualizada y los metadatos del asistente.

## Comportamiento detallado y fundamentos

### 0) Actualización opcional (instalaciones git)

Si se trata de una descarga de git y doctor se está ejecutando de forma interactiva, se ofrece
actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de la configuración

Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction`
sin una invalidación específica del canal), doctor las normaliza al esquema
actual.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y te piden
que ejecutes `openclaw doctor`.

Doctor hará lo siguiente:

- Explicará qué claves heredadas se encontraron.
- Mostrará la migración que aplicó.
- Reescribirá `~/.openclaw/openclaw.json` con el esquema actualizado.

La puerta de enlace también ejecuta automáticamente las migraciones de doctor al iniciarse cuando detecta un
formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual.

Migraciones actuales:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de nivel superior
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Para canales con `accounts` con nombre pero sin `accounts.default`, mueva los valores de canal de nivel superior de una sola cuenta con alcance de cuenta a `channels.<channel>.accounts.default` cuando estén presentes
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

Las advertencias de Doctor también incluyen orientación predeterminada de la cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, Doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` se establece en un ID de cuenta desconocido, Doctor advierte y enumera los IDs de cuenta configurados.

### 2b) Anulaciones de proveedor de OpenCode

Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`.
Eso puede forzar modelos a la API incorrecta o anular los costes. Doctor advierte para que
pueda eliminar la anulación y restaurar el enrutamiento de API por modelo + costes.

### 3) Migraciones de estado heredadas (diseño de disco)

Doctor puede migrar diseques de disco antiguos a la estructura actual:

- Almacén de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - del estado heredado `~/.openclaw/credentials/*.json` (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminada: `default`)

Estas migraciones son de mejor esfuerzo e idempotentes; doctor emitirá advertencias cuando
deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente
las sesiones heredadas + el directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la
ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo
a través de `openclaw doctor`.

### 3b) Migraciones del almacén de cron heredado

Doctor también verifica el almacén de trabajos cron (`~/.openclaw/cron/jobs.json` por defecto,
o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el programador aún
acepta por compatibilidad.

Las limpiezas de cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega `provider` de carga útil → `delivery.channel` explícito
- trabajos de reserva de webhook heredados simples `notify: true` → `delivery.mode="webhook"` explícito con `delivery.to=cron.webhook`

Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin
cambiar el comportamiento. Si un trabajo combina la reserva de notificación heredada con un modo de
entrega existente que no sea webhook, doctor advierte y deja ese trabajo para su revisión manual.

### 4) Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)

El directorio de estado es el tronco encefálico operativo. Si desaparece, pierde
sesiones, credenciales, registros y configuración (a menos que tenga copias de seguridad en otro lugar).

Doctor verifica:

- **Directorio de estado faltante**: advierte sobre una pérdida catastrófica de estado, solicita recrear
  el directorio y le recuerda que no puede recuperar los datos faltantes.
- **Permisos del directorio de estado**: verifica la escritura; ofrece reparar los permisos
  (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **macOS cloud-synced state dir**: advierte cuando el estado se resuelve bajo iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o
  `~/Library/CloudStorage/...` porque las rutas con sincronización pueden provocar E/S más lenta
  y condiciones de carrera de bloqueo/sincronización.
- **Linux SD or eMMC state dir**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`,
  porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse
  más rápido bajo las escrituras de sesión y credenciales.
- **Session dirs missing**: `sessions/` y el directorio de almacenamiento de sesión son
  necesarios para persistir el historial y evitar fallos `ENOENT`.
- **Transcript mismatch**: advierte cuando las entradas de sesión recientes tienen archivos
  de transcripción faltantes.
- **Main session “1-line JSONL”**: marca cuando la transcripción principal tiene solo una
  línea (el historial no se está acumulando).
- **Multiple state dirs**: advierte cuando existen múltiples carpetas `~/.openclaw` en
  directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede
  dividirse entre instalaciones).
- **Remote mode reminder**: si `gateway.mode=remote`, doctor te recuerda que lo ejecute
  en el host remoto (el estado reside allí).
- **Config file permissions**: advierte si `~/.openclaw/openclaw.json` es
  legible por grupo/mundo y ofrece restringirlo a `600`.

### 5) Model auth health (OAuth expiry)

Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están
por vencer/vencidos y puede actualizarlos cuando es seguro. Si el perfil de Anthropic Claude Code
está obsoleto, sugiere ejecutar `claude setup-token` (o pegar un token de configuración).
Los avisos de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive`
omite los intentos de actualización.

Doctor también informa sobre los perfiles de autenticación que son temporalmente inutilizables debido a:

- enfriamientos breves (límites de velocidad/tiempos de espera/fallos de autenticación)
- inhabilitaciones más largas (fallos de facturación/crédito)

### 6) Hooks model validation

Si `hooks.gmail.model` está establecido, doctor valida la referencia del modelo contra el
catálogo y la lista de permitidos y advierte cuando no se resuelve o está prohibido.

### 7) Sandbox image repair

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o
cambiar a nombres heredados si falta la imagen actual.

### 8) Migraciones de servicios de puerta de enlace y sugerencias de limpieza

Doctor detecta servicios de puerta de enlace heredados (launchd/systemd/schtasks) y
ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace
actual. También puede buscar servicios adicionales similares a una puerta de enlace e imprimir sugerencias de limpieza.
Los servicios de puerta de enlace de OpenClaw con nombre de perfil se consideran de primera clase y no se
marcan como "extra".

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a mensajes directos sin una lista de permitidos, o
cuando una política está configurada de manera peligrosa.

### 10) systemd linger (Linux)

Si se ejecuta como un servicio de usuario de systemd, doctor asegura que linger esté habilitado para que la
puerta de enlace se mantenga activa después de cerrar la sesión.

### 11) Estado de las habilidades (Skills)

Doctor imprime un resumen rápido de las habilidades elegibles/faltantes/bloqueadas para el espacio de trabajo
currente.

### 12) Verificaciones de autenticación de puerta de enlace (token local)

Doctor verifica la preparación de la autenticación del token de puerta de enlace local.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

### 12b) Reparaciones con reconocimiento de SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de falla rápida en tiempo de ejecución.

- `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estados para reparaciones de configuración específicas.
- Ejemplo: la reparación de Telegram `allowFrom` / `groupAllowFrom` `@username` intenta utilizar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta de comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de bloquearse o informar erróneamente que falta el token.

### 13) Verificación de salud de la puerta de enlace + reinicio

Doctor ejecuta una verificación de salud y ofrece reiniciar la puerta de enlace cuando parece
no saludable.

### 14) Advertencias del estado del canal

Si la puerta de enlace está saludable, doctor ejecuta una sonda de estado del canal e informa
advertencias con correcciones sugeridas.

### 15) Auditoría y reparación de la configuración del Supervisor

Doctor verifica la configuración del supervisor instalado (launchd/systemd/schtasks) para
buscar valores predeterminados faltantes o desactualizados (por ejemplo, dependencias de red en línea
de systemd y retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede
reescribir el archivo de servicio/tarea con los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
- `openclaw doctor --repair` aplica las reparaciones recomendadas sin solicitar confirmación.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token de texto sin formato resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación práctica.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades systemd de usuario de Linux, las verificaciones de deriva del token de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

### 16) Diagnósticos del tiempo de ejecución y puerto de la pasarela

Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el
servicio está instalado pero no se está ejecutando realmente. También verifica si hay colisiones de puertos
en el puerto de la pasarela (predeterminado `18789`) e informa las causas probables (pasarela ya
en ejecución, túnel SSH).

### 17) Mejores prácticas del tiempo de ejecución de la pasarela

Doctor advierte cuando el servicio de la pasarela se ejecuta en Bun o en una ruta de Node gestionada por versión
(`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp + Telegram requieren Node,
y las rutas del gestor de versiones pueden romperse después de las actualizaciones porque el servicio no
carga la inicialización de su shell. Doctor ofrece migrar a una instalación del sistema Node cuando
esté disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

Doctor persiste cualquier cambio de configuración y sella los metadatos del asistente para registrar la ejecución del doctor.

### 19) Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)

Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/es/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad de git (se recomienda GitHub o GitLab privados).

import es from "/components/footer/es.mdx";

<es />
