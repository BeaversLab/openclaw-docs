---
summary: "Crear paquetes de diagnósticos del Gateway compartibles para informes de errores"
title: "Exportación de diagnósticos"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw puede crear un archivo zip de diagnóstico local para informes de errores. Combina el estado, el estado de salud, los registros, la forma de la configuración y los eventos recientes de estabilidad sin carga útil del Gateway saneados.

Trate los paquetes de diagnóstico como secretos hasta que los haya revisado. Están diseñados para omitir o redactar las cargas útiles y las credenciales, pero aún resumen los registros locales del Gateway y el estado de ejecución a nivel de host.

## Inicio rápido

```bash
openclaw gateway diagnostics export
```

El comando imprime la ruta del zip escrito. Para elegir una ruta:

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

Para automatización:

```bash
openclaw gateway diagnostics export --json
```

## Comando de chat

Los propietarios pueden usar `/diagnostics [note]` en el chat para solicitar una exportación local de Gateway.
Use esto cuando el error ocurrió en una conversación real y desea un informe copiable y pegable para soporte:

1. Envíe `/diagnostics` en la conversación donde notó el problema. Agregue una
   breve nota si ayuda, por ejemplo `/diagnostics bad tool choice`.
2. OpenClaw envía el preámbulo de diagnóstico y solicita una aprobación de ejecución
   explícita. La aprobación ejecuta `openclaw gateway diagnostics export --json`.
   No apruebe el diagnóstico a través de una regla de permitir todo.
3. Después de la aprobación, OpenClaw responde con un informe pegable que contiene la ruta
   del paquete local, el resumen del manifiesto, las notas de privacidad y los identificadores de sesión relevantes.

En chats grupales, un propietario aún puede ejecutar `/diagnostics`, pero OpenClaw no
publica los detalles de diagnóstico nuevamente en el chat compartido. Envía el preámbulo,
indicaciones de aprobación, el resultado de exportación de Gateway y el desglose de sesión/hilo de Codex
al propietario a través de la ruta de aprobación privada. El grupo solo recibe un breve aviso
de que el flujo de diagnóstico se envió de forma privada. Si OpenClaw no puede encontrar una ruta
privada de propietario, el comando falla cerrado y pide al propietario que lo ejecute desde un MD.

Cuando la sesión activa de OpenClaw está utilizando el arnés nativo de OpenAI Codex, la misma aprobación de exec también cubre una carga de comentarios de OpenAI para los hilos de tiempo de ejecución de Codex que OpenClaw conoce. Esa carga es separada del zip local de Gateway y aparece solo para las sesiones del arnés de Codex. Antes de la aprobación, el mensaje explica que aprobar los diagnósticos también enviará comentarios de Codex, pero no enumera los ids de sesión o de hilo de Codex. Después de la aprobación, la respuesta del chat enumera los canales, los ids de sesión de OpenClaw, los ids de hilo de Codex y los comandos locales de reanudación para los hilos que se enviaron a los servidores de OpenAI. Si deniega o ignora la aprobación, OpenClaw no ejecuta la exportación, no envía comentarios de Codex y no imprime los ids de Codex.

Esto hace que el bucle común de depuración de Codex sea corto: note el mal comportamiento en Telegram, Discord u otro canal, ejecute `/diagnostics`, apruebe una vez, comparta el informe con soporte y luego ejecute el comando `codex resume <thread-id>` impreso localmente si desea inspeccionar el hilo nativo de Codex usted mismo. Consulte [Codex harness](/es/plugins/codex-harness#inspect-codex-threads-locally) para ese flujo de trabajo de inspección.

## Qué contiene la exportación

El zip incluye:

- `summary.md`: descripción general legible por humanos para soporte.
- `diagnostics.json`: resumen legible por máquina de configuración, registros, estado, salud y datos de estabilidad.
- `manifest.json`: metadatos de exportación y lista de archivos.
- Forma de configuración saneada y detalles de configuración no secretos.
- Resúmenes de registros saneados y líneas de registro recientes redactadas.
- Instantáneas de estado y salud de Gateway con el mejor esfuerzo posible.
- `stability/latest.json`: paquete de estabilidad persistido más reciente, cuando está disponible.

La exportación es útil incluso cuando el Gateway no está sano. Si el Gateway no puede responder a solicitudes de estado o salud, los registros locales, la forma de configuración y el paquete de estabilidad más reciente aún se recopilan cuando están disponibles.

## Modelo de privacidad

Los diagnósticos están diseñados para poder compartirse. La exportación mantiene datos operativos que ayudan a la depuración, tales como:

- nombres de subsistemas, ids de complementos, ids de proveedores, ids de canales y modos configurados
- códigos de estado, duraciones, recuentos de bytes, estado de cola y lecturas de memoria
- metadatos de registros saneados y mensajes operativos redactados
- forma de configuración y configuraciones de funciones no secretas

La exportación omite o redacta:

- texto de chat, avisos, instrucciones, cuerpos de webhooks y salidas de herramientas
- credenciales, claves de API, tokens, cookies y valores secretos
- cuerpos de solicitudes o respuestas sin procesar
- ids de cuenta, ids de mensaje, ids de sesión sin procesar, nombres de host y nombres de usuario locales

Cuando un mensaje de registro parece texto de carga útil de usuario, chat, aviso o herramienta,
la exportación mantiene solo que se omitió un mensaje y el recuento de bytes.

## Grabador de estabilidad

De forma predeterminada, Gateway registra un flujo de estabilidad limitado y sin carga útil cuando
los diagnósticos están habilitados. Es para datos operativos, no para contenido.

El mismo latido de diagnóstico registra muestras de actividad cuando Gateway sigue
funcionando pero el bucle de eventos de Node.js o la CPU parecen saturados. Estos eventos
`diagnostic.liveness.warning` incluyen el retraso del bucle de eventos, la utilización
del bucle de eventos, la relación de núcleos de CPU, los recuentos de sesiones activas/en espera/en cola, la fase
de inicio/ejecución actual cuando se conoce, los intervalos de fase recientes y etiquetas de trabajo
activas/en cola limitadas. Las muestras inactivas permanecen en telemetría en el nivel `info`. Las muestras de actividad
solo se convierten en advertencias de Gateway cuando el trabajo está en espera o en cola, o cuando el trabajo activo
se superpone con un retraso sostenido del bucle de eventos. Los picos transitorios de retraso máximo durante
trabajo en segundo plano por lo demás saludable permanecen en los registros de depuración. No reinician el
Gateway por sí mismos.

Las fases de inicio también emiten eventos `diagnostic.phase.completed` con temporización de reloj de pared
y CPU. Los diagnósticos de ejecución integrada bloqueados marcan `terminalProgressStale=true`
cuando el último progreso del puente parecía terminal, como un elemento de respuesta sin procesar
o un evento de finalización de respuesta, pero Gateway aún considera la ejecución integrada
activa.

Inspeccionar el grabador en vivo:

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

Inspeccionar el paquete de estabilidad persistido más reciente después de una salida fatal, tiempo de espera
de apagado o error de inicio al reiniciar:

```bash
openclaw gateway stability --bundle latest
```

Crear un zip de diagnóstico desde el paquete persistido más reciente:

```bash
openclaw gateway stability --bundle latest --export
```

Los paquetes persistidos viven bajo `~/.openclaw/logs/stability/` cuando existen eventos.

## Opciones útiles

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>`: escribir en una ruta zip específica.
- `--log-lines <count>`: máximo de líneas de registro saneadas para incluir.
- `--log-bytes <bytes>`: máximo de bytes de registro para inspeccionar.
- `--url <url>`: URL de WebSocket de Gateway para instantáneas de estado y salud.
- `--token <token>`: token de Gateway para instantáneas de estado y salud.
- `--password <password>`: contraseña de Gateway para instantáneas de estado y salud.
- `--timeout <ms>`: tiempo de espera de la instantánea de estado y salud.
- `--no-stability-bundle`: omitir la búsqueda del paquete de estabilidad persistido.
- `--json`: imprimir metadatos de exportación legibles por máquina.

## Deshabilitar diagnósticos

Los diagnósticos están habilitados de forma predeterminada. Para deshabilitar el grabador de estabilidad y la recolección de eventos de diagnóstico:

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

Deshabilitar los diagnósticos reduce el detalle del informe de errores. No afecta el registro normal del Gateway.

## Relacionado

- [Verificaciones de salud](/es/gateway/health)
- [CLI de Gateway](/es/cli/gateway#gateway-diagnostics-export)
- [Protocolo de Gateway](/es/gateway/protocol#system-and-identity)
- [Registro](/es/logging)
- [Exportación de OpenTelemetry](/es/gateway/opentelemetry) — flujo separado para transmitir diagnósticos a un recopilador
