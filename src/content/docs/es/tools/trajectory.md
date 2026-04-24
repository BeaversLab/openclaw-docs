---
summary: "Exportar paquetes de trayectoria redactados para depurar una sesión de agente de OpenClaw"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "Paquetes de trayectoria"
---

# Paquetes de trayectoria

La captura de trayectoria es la grabadora de vuelo por sesión de OpenClaw. Registra una
cronología estructurada para cada ejecución de agente y luego `/export-trajectory` empaqueta la
sesión actual en un paquete de soporte redactado.

Úselo cuando necesite responder preguntas como:

- ¿Qué mensaje, mensaje del sistema y herramientas se enviaron al modelo?
- ¿Qué mensajes de la transcripción y llamadas a herramientas llevaron a esta respuesta?
- ¿La ejecución expiró, se abortó, se compactó o produjo un error del proveedor?
- ¿Qué modelo, complementos, habilidades y configuraciones de tiempo de ejecución estaban activos?
- ¿Qué metadatos de uso y caché de mensajes devolvió el proveedor?

## Inicio rápido

Envíe esto en la sesión activa:

```text
/export-trajectory
```

Alias:

```text
/trajectory
```

OpenClaw escribe el paquete en el espacio de trabajo:

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

Puede elegir un nombre de directorio de salida relativo:

```text
/export-trajectory bug-1234
```

La ruta personalizada se resuelve dentro de `.openclaw/trajectory-exports/`. Se rechazan
las rutas absolutas y las rutas `~`.

## Acceso

La exportación de trayectoria es un comando de propietario. El remitente debe pasar las comprobaciones
normales de autorización de comandos y las comprobaciones de propietario para el canal.

## Qué se graba

La captura de trayectoria está activada por defecto para las ejecuciones de agentes de OpenClaw.

Los eventos de tiempo de ejecución incluyen:

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.completed`
- `trace.artifacts`
- `session.ended`

Los eventos de la transcripción también se reconstruyen a partir de la rama de sesión activa:

- mensajes de usuario
- mensajes del asistente
- llamadas a herramientas
- resultados de herramientas
- compactaciones
- cambios de modelo
- etiquetas y entradas de sesión personalizadas

Los eventos se escriben como líneas JSON con este marcador de esquema:

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## Archivos del paquete

Un paquete exportado puede contener:

| Archivo               | Contenido                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`       | Esquema del paquete, archivos de origen, recuentos de eventos y lista de archivos generados                                         |
| `events.jsonl`        | Cronología ordenada de tiempo de ejecución y transcripción                                                                          |
| `session-branch.json` | Rama de transcripción activa redactada y encabezado de sesión                                                                       |
| `metadata.json`       | Versión de OpenClaw, SO/tiempo de ejecución, modelo, instantánea de configuración, complementos, habilidades y metadatos de prompts |
| `artifacts.json`      | Estado final, errores, uso, caché de prompts, recuento de compactación, texto del asistente y metadatos de herramientas             |
| `prompts.json`        | Prompts enviados y detalles seleccionados de construcción de prompts                                                                |
| `system-prompt.txt`   | Último prompt del sistema compilado, cuando se captura                                                                              |
| `tools.json`          | Definiciones de herramientas enviadas al modelo, cuando se capturan                                                                 |

`manifest.json` enumera los archivos presentes en ese paquete. Algunos archivos se omiten
cuando la sesión no capturó los datos de tiempo de ejecución correspondientes.

## Ubicación de captura

De forma predeterminada, los eventos de trayectoria en tiempo de ejecución se escriben junto al archivo de sesión:

```text
<session>.trajectory.jsonl
```

OpenClaw también escribe un archivo de puntero de mejor esfuerzo junto a la sesión:

```text
<session>.trajectory-path.json
```

Establezca `OPENCLAW_TRAJECTORY_DIR` para almacenar los sidecars de trayectoria en tiempo de ejecución en un
directorio dedicado:

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

Cuando se establece esta variable, OpenClaw escribe un archivo JSONL por id de sesión en ese
directorio.

## Deshabilitar captura

Establezca `OPENCLAW_TRAJECTORY=0` antes de iniciar OpenClaw:

```bash
export OPENCLAW_TRAJECTORY=0
```

Esto deshabilita la captura de trayectoria en tiempo de ejecución. `/export-trajectory` todavía puede exportar
la rama de la transcripción, pero pueden faltar archivos exclusivos del tiempo de ejecución, como el contexto compilado,
los artefactos del proveedor y los metadatos de los prompts.

## Privacidad y límites

Los paquetes de trayectoria están diseñados para soporte y depuración, no para publicación pública.
OpenClaw redacta valores sensibles antes de escribir archivos de exportación:

- credenciales y campos de carga conocidos como secretos
- datos de imagen
- rutas de estado local
- rutas del espacio de trabajo, reemplazadas con `$WORKSPACE_DIR`
- rutas del directorio principal, donde se detectan

El exportador también limita el tamaño de entrada:

- archivos sidecar de tiempo de ejecución: 50 MiB
- archivos de sesión: 50 MiB
- eventos de tiempo de ejecución: 200,000
- total de eventos exportados: 250,000
- las líneas individuales de eventos de tiempo de ejecución se truncan por encima de 256 KiB

Revise los paquetes antes de compartirlos fuera de su equipo. La redacción es de mejor esfuerzo
y no puede conocer todos los secretos específicos de la aplicación.

## Solución de problemas

Si la exportación no tiene eventos de tiempo de ejecución:

- confirme que OpenClaw se inició sin `OPENCLAW_TRAJECTORY=0`
- verifique si `OPENCLAW_TRAJECTORY_DIR` apunta a un directorio escribible
- ejecute otro mensaje en la sesión y luego exporte nuevamente
- inspeccionar `manifest.json` para `runtimeEventCount`

Si el comando rechaza la ruta de salida:

- use un nombre relativo como `bug-1234`
- no pase `/tmp/...` o `~/...`
- mantenga la exportación dentro de `.openclaw/trajectory-exports/`

Si la exportación falla con un error de tamaño, la sesión o el sidecar excedieron
los límites de seguridad de exportación. Inicie una nueva sesión o exporte una
reproducción más pequeña.
