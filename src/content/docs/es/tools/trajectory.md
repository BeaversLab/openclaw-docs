---
summary: "Exportar paquetes de trayectoria redactados para depurar una sesión de agente de OpenClaw"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "Paquetes de trayectoria"
---

La captura de trayectoria es la grabadora de vuelo por sesión de OpenClaw. Graba una línea de tiempo estructurada para cada ejecución del agente y luego `/export-trajectory` empaqueta la sesión actual en un paquete de soporte redactado.

Úselo cuando necesite responder preguntas como:

- ¿Qué prompt, del sistema y herramientas se enviaron al modelo?
- ¿Qué mensajes de la transcripción y llamadas a herramientas llevaron a esta respuesta?
- ¿La ejecución agotó el tiempo de espera, se abortó, se compactó o encontró un error del proveedor?
- ¿Qué modelo, complementos, habilidades y configuraciones de tiempo de ejecución estaban activos?
- ¿Qué metadatos de uso y caché de prompts devolvió el proveedor?

Si estás enviando un informe de soporte general para un problema en vivo de Gateway, comienza con [`/diagnostics`](/es/gateway/diagnostics#chat-command). Diagnostics recopila el paquete de Gateway saneado y, para las sesiones del arnés de OpenAI Codex, también puede enviar comentarios de Codex a los servidores de OpenAI después de la aprobación. Usa `/export-trajectory` cuando necesites específicamente la línea de tiempo detallada por sesión del prompt, las herramientas y la transcripción.

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

La ruta personalizada se resuelve dentro de `.openclaw/trajectory-exports/`. Se rechazan las rutas absolutas y las rutas `~`.

Los paquetes de trayectoria pueden contener avisos, mensajes del modelo, esquemas de herramientas, resultados de herramientas, eventos de tiempo de ejecución y rutas locales. Por lo tanto, el comando de chat de barra diagonal se ejecuta a través de la aprobación de ejecución cada vez. Aprobe la exportación una vez cuando tenga la intención de crear el paquete; no usar permitir-todo. En chats grupales, OpenClaw envía el aviso de aprobación y el resultado de la exportación al propietario de forma privada en lugar de publicar los detalles de la trayectoria nuevamente en la sala compartida.

Para inspección local o flujos de trabajo de soporte, también puede ejecutar la ruta del comando aprobado directamente:

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
```

## Acceso

La exportación de trayectoria es un comando de propietario. El remitente debe pasar las verificaciones normales de autorización de comandos y las verificaciones de propietario para el canal.

## Qué se graba

La captura de trayectoria está activada de forma predeterminada para las ejecuciones de agentes de OpenClaw.

Los eventos de tiempo de ejecución incluyen:

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.fallback_step`, incluyendo el modelo de origen, el siguiente modelo, motivo/detalle del fallo, posición en la cadena y si el respaldo avanzó, tuvo éxito o agotó la cadena
- `model.completed`
- `trace.artifacts`
- `session.ended`

Los eventos de transcripción también se reconstruyen a partir de la rama de sesión activa:

- mensajes de usuario
- mensajes del asistente
- llamadas a herramientas
- resultados de herramientas
- compacciones
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

| Archivo               | Contenido                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`       | Esquema del paquete, archivos fuente, recuento de eventos y lista de archivos generados                                                            |
| `events.jsonl`        | Cronología ordenada del tiempo de ejecución y la transcripción                                                                                     |
| `session-branch.json` | Rama de transcripción activa redactada y encabezado de sesión                                                                                      |
| `metadata.json`       | Versión de OpenClaw, sistema operativo/tiempo de ejecución, modelo, instantánea de configuración, complementos, habilidades y metadatos del prompt |
| `artifacts.json`      | Estado final, errores, uso, caché de prompt, recuento de compactación, texto del asistente y metadatos de herramientas                             |
| `prompts.json`        | Prompts enviados y detalles seleccionados de construcción del prompt                                                                               |
| `system-prompt.txt`   | Último prompt del sistema compilado, cuando se captura                                                                                             |
| `tools.json`          | Definiciones de herramientas enviadas al modelo, cuando se capturan                                                                                |

`manifest.json` enumera los archivos presentes en ese paquete. Algunos archivos se omiten cuando la sesión no capturó los datos de tiempo de ejecución correspondientes.

## Ubicación de captura

De forma predeterminada, los eventos de trayectoria en tiempo de ejecución se escriben junto al archivo de sesión:

```text
<session>.trajectory.jsonl
```

OpenClaw también escribe un archivo de puntero de mejor esfuerzo junto a la sesión:

```text
<session>.trajectory-path.json
```

Establezca `OPENCLAW_TRAJECTORY_DIR` para almacenar los sidecars de trayectoria de tiempo de ejecución en un directorio dedicado:

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

Cuando se establece esta variable, OpenClaw escribe un archivo JSONL por id. de sesión en ese
directorio.

El mantenimiento de la sesión elimina los sidecars de trayectoria cuando su entrada de sesión propietaria
se poda, limita o desaloja por el presupuesto de disco de las sesiones. Los archivos de tiempo de ejecución fuera
del directorio de sesiones solo se eliminan cuando el destino del puntero todavía prueba que pertenece a esa sesión.

## Deshabilitar captura

Establezca `OPENCLAW_TRAJECTORY=0` antes de iniciar OpenClaw:

```bash
export OPENCLAW_TRAJECTORY=0
```

Esto deshabilita la captura de trayectoria de tiempo de ejecución. `/export-trajectory` aún puede exportar la rama de la transcripción, pero pueden faltar archivos solo de tiempo de ejecución, como el contexto compilado, los artefactos del proveedor y los metadatos del prompt.

## Ajustar el tiempo de espera de vaciado

OpenClaw vacía los sidecars de trayectoria en tiempo de ejecución durante la limpieza del agente. El tiempo de espera de limpieza predeterminado es de 10.000 ms. En discos lentos o almacenes grandes, configure `OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS` antes de iniciar OpenClaw:

```bash
export OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS=30000
```

Esto controla cuándo OpenClaw registra un `openclaw-trajectory-flush` tiempo de espera y continúa.
No cambia los límites de tamaño de la trayectoria. Para ajustar todos los pasos de limpieza del agente
que no pasan un tiempo de espera explícito, configure `OPENCLAW_AGENT_CLEANUP_TIMEOUT_MS`.

## Privacidad y límites

Los paquetes de trayectoria están diseñados para soporte y depuración, no para publicación pública. OpenClaw redacta valores confidenciales antes de escribir los archivos de exportación:

- credenciales y campos de carga conocidos como secretos
- datos de imagen
- rutas de estado local
- rutas del espacio de trabajo, reemplazadas por `$WORKSPACE_DIR`
- rutas del directorio de inicio, cuando se detectan

El exportador también limita el tamaño de entrada:

- archivos sidecar de tiempo de ejecución: la captura en vivo se detiene a los 10 MiB y registra un evento de truncamiento cuando queda espacio; la exportación acepta sidecars de tiempo de ejecución existentes de hasta 50 MiB
- archivos de sesión: 50 MiB
- eventos de tiempo de ejecución: 200.000
- total de eventos exportados: 250.000
- las líneas individuales de eventos de tiempo de ejecución se truncan por encima de 256 KiB

Revise los paquetes antes de compartirlos fuera de su equipo. La redacción se hace con el mejor esfuerzo posible y no puede conocer todos los secretos específicos de la aplicación.

## Solución de problemas

Si la exportación no tiene eventos de tiempo de ejecución:

- confirme que OpenClaw se inició sin `OPENCLAW_TRAJECTORY=0`
- verifique si `OPENCLAW_TRAJECTORY_DIR` apunta a un directorio escribible
- ejecute otro mensaje en la sesión y luego exporte de nuevo
- inspeccione `manifest.json` para buscar `runtimeEventCount`

Si el comando rechaza la ruta de salida:

- use un nombre relativo como `bug-1234`
- no pase `/tmp/...` o `~/...`
- mantenga la exportación dentro de `.openclaw/trajectory-exports/`

Si la exportación falla con un error de tamaño, la sesión o el sidecar superaron los límites de seguridad de exportación. Inicie una nueva sesión o exporte una reproducción más pequeña.

## Relacionado

- [Diferencias](/es/tools/diffs)
- [Gestión de sesiones](/es/concepts/session)
- [Herramienta Exec](/es/tools/exec)
