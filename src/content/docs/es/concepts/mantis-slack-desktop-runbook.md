---
summary: "Manual del operador para QA de escritorio de Mantis Slack: despacho de GitHub, CLI local, arrendamientos VNC calientes, modos de hidratación, interpretación de tiempos, artefactos y manejo de fallos."
read_when:
  - Running Mantis Slack desktop QA from GitHub or locally
  - Debugging slow Mantis Slack desktop runs
  - Choosing source, prehydrated, or warm-lease mode
  - Posting screenshot and video evidence to a PR
title: "Manual de escritorio de Mantis Slack"
---

El QA de escritorio de Mantis Slack es el carril de interfaz de usuario real para errores de clase Slack que necesitan
un escritorio Linux, rescate VNC, Slack Web, una puerta de enlace OpenClaw real, capturas de pantalla,
videos y un comentario de evidencia en el PR.

Úselo cuando las pruebas unitarias o el carril en vivo sin cabeza de Slack no puedan demostrar el error.

## Modelo de almacenamiento

Mantis utiliza tres capas de almacenamiento diferentes:

- Imagen del proveedor: propiedad de Crabbox y almacenada en la cuenta del proveedor de la nube.
  Contiene capacidades de máquina como Chrome/Chromium, ffmpeg, scrot,
  Node/corepack/pnpm, herramientas de compilación nativas y directorios de caché vacíos.
- Estado de arrendamiento caliente: propiedad de la sesión del operador actual. Puede contener un perfil de navegador con sesión iniciada, `/var/cache/crabbox/pnpm`, y una preparación del código fuente mientras el arrendamiento está activo.
- Artefactos de Mantis: propiedad de la ejecución de OpenClaw. Residen bajo `.artifacts/qa-e2e/mantis/...`, luego GitHub Actions los carga y la aplicación de GitHub de Mantis comenta pruebas en línea en el PR.

Nunca ponga secretos, cookies del navegador, estado de inicio de sesión de Slack, checkouts de repositorio, `node_modules`, o `dist/` en una imagen de proveedor prehorneada.

## Despacho de GitHub

Ejecute el flujo de trabajo desde `main`:

```bash
gh workflow run mantis-slack-desktop-smoke.yml \
  --ref main \
  -f candidate_ref=<trusted-ref-or-sha> \
  -f pr_number=<pr-number> \
  -f scenario_id=slack-canary \
  -f crabbox_provider=aws \
  -f keep_vm=false \
  -f hydrate_mode=source
```

Los valores de `candidate_ref` permitidos son intencionalmente limitados porque el flujo de trabajo utiliza credenciales en vivo: ascendencia actual de `main`, etiquetas de lanzamiento, o un head de PR abierto de `openclaw/openclaw`.

El flujo de trabajo escribe:

- artefacto cargado: `mantis-slack-desktop-smoke-<run-id>-<attempt>`;
- comentario en línea en el PR de la aplicación de GitHub de Mantis;
- `slack-desktop-smoke.png`;
- `slack-desktop-smoke.mp4`;
- `slack-desktop-smoke-preview.gif`;
- `slack-desktop-smoke-change.mp4`;
- `mantis-slack-desktop-smoke-summary.json`;
- `mantis-slack-desktop-smoke-report.md`;
- registros remotos como `slack-desktop-command.log`, `openclaw-gateway.log`, `chrome.log`, y `ffmpeg.log`.

El comentario del PR se actualiza en el lugar mediante el marcador oculto `<!-- mantis-slack-desktop-smoke -->`.

## CLI local

Prueba de fuente en frío:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --credential-source convex \
  --credential-role maintainer \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --scenario slack-canary \
  --hydrate-mode source
```

Mantener la VM para el rescate VNC:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Abrir VNC:

```bash
crabbox vnc --provider aws --id <cbx_id> --open
```

Reutilizar un contrato cálido (warm lease):

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --lease-id <cbx_id-or-slug> \
  --gateway-setup \
  --scenario slack-canary \
  --hydrate-mode source
```

Use `--hydrate-mode prehydrated` solo cuando el espacio de trabajo remoto reutilizado ya tenga `node_modules` y un `dist/` construido. Mantis falla de forma cerrada si faltan esos elementos.

Demostrar la IU de aprobación nativa de Slack:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer \
  --hydrate-mode source
```

El modo de punto de control de aprobación es mutuamente excluyente con `--gateway-setup`. Ejecuta los escenarios de participación opcional `slack-approval-exec-native` y `slack-approval-plugin-native` a menos que pases indicadores explícitos de punto de control de aprobación `--scenario`; otros escenarios de Slack se rechazan antes de que se inicie la VM. El ejecutor de QA de Slack escribe cada archivo JSON de punto de control desde el mensaje real de la API de Slack que observó, luego el observador remoto representa esa instantánea del mensaje en `approval-checkpoints/<scenario>-pending.png` y `approval-checkpoints/<scenario>-resolved.png`. La ejecución falla si falta o está vacío algún JSON de punto de control, evidencia de mensaje, JSON de ack o captura de pantalla representada.

Las concesiones frías de GitHub Actions no tienen cookies de Slack Web, por lo que su captura del navegador puede aterrizar en el inicio de sesión de Slack. Para la prueba del punto de control de aprobación, confíe en las imágenes de puntos de control representadas y los artefactos de QA de Slack en lugar de `slack-desktop-smoke.png`. Use una concesión cálida mantenida con un perfil de Slack Web iniciado manualmente solo cuando la captura de pantalla del navegador deba mostrar Slack Web.

## Modos de hidratación

| Modo          | Usar cuando                                           | Comportamiento remoto                                                                    | Compensación                                                                  |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `source`      | Prueba normal de PR, máquinas frías, CI               | Ejecuta `pnpm install --frozen-lockfile --prefer-offline` y `pnpm build` dentro de la VM | El más lento, la prueba más sólida de checkout desde la fuente                |
| `prehydrated` | Preparaste intencionalmente una concesión reutilizada | Requiere `node_modules` y `dist/` existentes; omite instalación/compilación              | Rápido, pero válido solo para concesiones cálidas controladas por el operador |

GitHub Actions siempre prepara el checkout del candidato antes de la ejecución de la VM. Su tienda pnpm se almacena en caché por sistema operativo, versión de Node y archivo de bloqueo. La ejecución de la fuente de la VM también usa `/var/cache/crabbox/pnpm` cuando está presente.

## Interpretación del tiempo

`mantis-slack-desktop-smoke-report.md` incluye tiempos de fase:

- `crabbox.warmup`: arranque del proveedor de la nube, disponibilidad del escritorio/navegador y SSH.
- `crabbox.inspect`: búsqueda de metadatos de concesión.
- `credentials.prepare`: adquisición de concesión de credenciales de Convex.
- `crabbox.remote_run`: sincronización, inicio del navegador, instalación/compilación de OpenClaw o validación de hidratación, inicio de la puerta de enlace, captura de pantalla y captura de video.
- `artifacts.copy`: rsync de vuelta desde la VM.

`crabbox.remote_run` se puede marcar como `accepted` cuando Crabbox devuelve un estado remoto distinto de cero después de que Mantis haya copiado metadatos que demuestran que se completó la configuración de la puerta de enlace OpenClaw o que el comando de Slack QA en sí finalizó correctamente.
Trate `accepted` como aprobado con explicación, no como un escenario fallido.

Si la ejecución es lenta:

- el calentamiento domina: prebake o promueva una mejor imagen de proveedor de Crabbox;
- remote_run domina en `source`: use un arrendamiento cálido, mejore la reutilización de la tienda pnpm,
  o mueva los requisitos previos de la máquina a la imagen del proveedor;
- remote_run domina en `prehydrated`: el espacio de trabajo remoto en realidad no
  estaba listo, o la configuración de la puerta de enlace/navegador/Slack es lenta;
- la copia de artefactos domina: inspeccione el tamaño del video y el contenido del directorio de artefactos.

## Lista de verificación de evidencias

Un buen comentario de PR debe mostrar:

- id del escenario y SHA del candidato;
- URL de ejecución de GitHub Actions;
- URL del artefacto;
- captura de pantalla del punto de control de aprobación en línea, o una captura de pantalla de Slack Web de un
  arrendamiento cálido con sesión iniciada;
- vista previa animada en línea cuando esté disponible;
- enlaces MP4 completos y recortados;
- estado de aprobado/fallido;
- resumen de tiempos en el informe adjunto.

No confirme capturas de pantalla o videos en el repositorio. Manténgalos en artefactos de GitHub
Actions o en el comentario del PR.

## Manejo de fallos

Si el flujo de trabajo falla antes de la ejecución de la VM, inspeccione primero el trabajo de Actions. Las causas
típicas son `candidate_ref` no confiables, secretos de entorno faltantes o fallos de instalación/compilación del candidato.

Si la ejecución de la VM falla pero se copiaron las capturas de pantalla, inspeccione:

```bash
cat mantis-slack-desktop-smoke-report.md
cat mantis-slack-desktop-smoke-summary.json
cat slack-desktop-command.log
cat openclaw-gateway.log
cat chrome.log
cat ffmpeg.log
```

Si la ejecución mantuvo el arrendamiento, abra VNC con el comando `crabbox vnc ...` del informe.
Detenga el arrendamiento cuando haya terminado:

```bash
crabbox stop --provider aws <cbx_id-or-slug>
```

Si la sesión de Slack expiró, repárela en VNC en un arrendamiento mantenido y vuelva a ejecutar con
`--lease-id`. No incorpore ese perfil de navegador en una imagen de proveedor.

## Relacionado

- [Resumen de QA](/es/concepts/qa-e2e-automation)
- [Canal de Slack](/es/channels/slack)
- [Pruebas](/es/help/testing)
