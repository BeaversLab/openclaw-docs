---
summary: "Manual del operador para QA de escritorio de Mantis Slack: despacho de GitHub, CLI local, arrendamientos VNC activos, modos de hidratación, interpretación de tiempos, artefactos y manejo de fallos."
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
- Estado de arrendamiento activo: propiedad de la sesión del operador actual. Puede contener un
  perfil de navegador con sesión iniciada, `/var/cache/crabbox/pnpm` y una preparación del código fuente
  mientras el arrendamiento está activo.
- Artefactos de Mantis: propiedad de la ejecución de OpenClaw. Residen en
  `.artifacts/qa-e2e/mantis/...`, luego GitHub Actions los sube y la
  aplicación de GitHub de Mantis comenta evidencia en línea en el PR.

Nunca ponga secretos, cookies del navegador, estado de inicio de sesión de Slack, checkouts de repositorio,
`node_modules` o `dist/` en una imagen de proveedor pre preparada.

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

Los valores permitidos de `candidate_ref` son intencionalmente limitados porque el flujo de trabajo
utiliza credenciales en vivo: ascendencia actual de `main`, etiquetas de lanzamiento o un cabezal de PR abierto
desde `openclaw/openclaw`.

El flujo de trabajo escribe:

- artefacto subido: `mantis-slack-desktop-smoke-<run-id>-<attempt>`;
- comentario en línea en el PR de la aplicación de GitHub de Mantis;
- `slack-desktop-smoke.png`;
- `slack-desktop-smoke.mp4`;
- `slack-desktop-smoke-preview.gif`;
- `slack-desktop-smoke-change.mp4`;
- `mantis-slack-desktop-smoke-summary.json`;
- `mantis-slack-desktop-smoke-report.md`;
- registros remotos como `slack-desktop-command.log`, `openclaw-gateway.log`,
  `chrome.log` y `ffmpeg.log`.

El comentario del PR se actualiza en su lugar mediante el marcador oculto
`<!-- mantis-slack-desktop-smoke -->`.

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

Use `--hydrate-mode prehydrated` solo cuando el espacio de trabajo remoto reutilizado ya
tenga `node_modules` y un `dist/` compilado. Mantis falla de forma cerrada si faltan
esos elementos.

## Modos de hidratación

| Modo          | Usar cuando                                      | Comportamiento remoto                                                                    | Compensación                                                                |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `source`      | Prueba normal de PR, máquinas en frío, CI        | Ejecuta `pnpm install --frozen-lockfile --prefer-offline` y `pnpm build` dentro de la VM | El más lento, la prueba más fuerte de checkout de fuente                    |
| `prehydrated` | Preparó intencionalmente un contrato reutilizado | Requiere `node_modules` y `dist/` existentes; omite instalación/compilación              | Rápido, pero válido solo para contratos cálidos controlados por el operador |

GitHub Actions siempre prepara el checkout candidato antes de la ejecución de la VM. Su
almacén pnpm se almacena en caché por sistema operativo, versión de Node y archivo de bloqueo. La ejecución de la fuente de la VM también
usa `/var/cache/crabbox/pnpm` cuando está presente.

## Interpretación de temporización

`mantis-slack-desktop-smoke-report.md` incluye temporizaciones de fase:

- `crabbox.warmup`: arranque del proveedor de la nube, disponibilidad de escritorio/navegador y SSH.
- `crabbox.inspect`: búsqueda de metadatos del contrato.
- `credentials.prepare`: adquisición de contrato de credenciales Convex.
- `crabbox.remote_run`: sincronización, lanzamiento del navegador, instalación/compilación de OpenClaw o
  validación de hidratación, inicio de la puerta de enlace, captura de pantalla y captura de video.
- `artifacts.copy`: rsync desde la VM.

`crabbox.remote_run` puede marcarse como `accepted` cuando Crabbox devuelve un estado remoto distinto de cero
después de que Mantis haya copiado metadatos que demuestran que la puerta de enlace de OpenClaw
está activa y la configuración se ha completado. Trate `accepted` como aprobado con explicación,
no como un escenario fallido.

Si la ejecución es lenta:

- el calentamiento domina: precocine o promocione una mejor imagen de proveedor de Crabbox;
- remote_run domina en `source`: use un contrato cálido, mejore la reutilización del almacén pnpm,
  o mueva los requisitos previos de la máquina a la imagen del proveedor;
- remote_run domina en `prehydrated`: el espacio de trabajo remoto no estaba realmente listo, o la configuración de gateway/navegador/Slack es lenta;
- la copia de artefactos domina: inspeccione el tamaño del video y el contenido del directorio de artefactos.

## Lista de verificación de evidencia

Un buen comentario de PR debe mostrar:

- id del escenario y SHA del candidato;
- URL de ejecución de GitHub Actions;
- URL del artefacto;
- captura de pantalla en línea;
- vista previa animada en línea cuando esté disponible;
- enlaces MP4 completos y MP4 recortados;
- estado de aprobado/error;
- resumen de tiempo en el informe adjunto.

No confirme capturas de pantalla ni videos en el repositorio. Manténgalos en los artefactos de GitHub Actions o en el comentario del PR.

## Manejo de fallos

Si el flujo de trabajo falla antes de la ejecución de la VM, inspeccione primero el trabajo de Actions. Las causas típicas son `candidate_ref` no confiables, secretos de entorno faltantes o falla de instalación/compilación del candidato.

Si la ejecución de la VM falló pero se copiaron las capturas de pantalla, inspeccione:

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

- [Descripción general de QA](/es/concepts/qa-e2e-automation)
- [Canal de Slack](/es/channels/slack)
- [Pruebas](/es/help/testing)
