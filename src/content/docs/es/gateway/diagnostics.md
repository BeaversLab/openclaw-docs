---
summary: "Crear paquetes de diagnósticos del Gateway compartibles para informes de errores"
title: "Exportación de diagnósticos"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw puede crear un archivo zip de diagnósticos local que es seguro adjuntar a los informes de errores. Combina el estado, el estado de salud, los registros, la forma de la configuración y los eventos recientes de estabilidad sin carga útil del Gateway, todo saneado.

## Inicio rápido

```bash
openclaw gateway diagnostics export
```

El comando imprime la ruta del archivo zip escrito. Para elegir una ruta:

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

Para automatización:

```bash
openclaw gateway diagnostics export --json
```

## Qué contiene la exportación

El archivo zip incluye:

- `summary.md`: descripción general legible por humanos para soporte.
- `diagnostics.json`: resumen legible por máquina de la configuración, registros, estado, salud
  y datos de estabilidad.
- `manifest.json`: metadatos de exportación y lista de archivos.
- Forma de la configuración saneada y detalles de configuración no secretos.
- Resúmenes de registros saneados y líneas de registro recientes redactadas.
- Instantáneas del mejor esfuerzo posible del estado y la salud del Gateway.
- `stability/latest.json`: el paquete de estabilidad persistido más reciente, cuando esté disponible.

La exportación es útil incluso cuando el Gateway no está saludable. Si el Gateway no puede
responder a solicitudes de estado o salud, los registros locales, la forma de la configuración y el paquete de estabilidad
más reciente todavía se recopilan cuando están disponibles.

## Modelo de privacidad

Los diagnósticos están diseñados para ser compartibles. La exportación mantiene los datos operativos
que ayudan a la depuración, tales como:

- nombres de subsistemas, ids de complementos, ids de proveedores, ids de canales y modos configurados
- códigos de estado, duraciones, recuentos de bytes, estado de la cola y lecturas de memoria
- metadatos de registros saneados y mensajes operativos redactados
- forma de la configuración y configuraciones de funciones no secretas

La exportación omite o redacta:

- texto de chat, avisos, instrucciones, cuerpos de webhooks y salidas de herramientas
- credenciales, claves de API, tokens, cookies y valores secretos
- cuerpos de solicitudes o respuestas sin procesar
- ids de cuenta, ids de mensaje, ids de sesión sin procesar, nombres de host y nombres de usuario locales

Cuando un mensaje de registro parece ser texto de carga útil de usuario, chat, aviso o herramienta, la
exportación mantiene solo que se omitió un mensaje y el recuento de bytes.

## Grabadora de estabilidad

De forma predeterminada, el Gateway graba un flujo de estabilidad limitado y sin carga útil cuando
los diagnósticos están habilitados. Es para hechos operativos, no para contenido.

Inspeccionar la grabadora en vivo:

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

Inspeccione el paquete de estabilidad persistido más reciente después de una salida fatal, tiempo de espera de apagado o fallo de inicio al reiniciar:

```bash
openclaw gateway stability --bundle latest
```

Cree un zip de diagnóstico desde el paquete persistido más reciente:

```bash
openclaw gateway stability --bundle latest --export
```

Los paquetes persistidos residen bajo `~/.openclaw/logs/stability/` cuando existen eventos.

## Opciones útiles

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>`: escribe en una ruta de zip específica.
- `--log-lines <count>`: máximo de líneas de registro saneadas a incluir.
- `--log-bytes <bytes>`: máximo de bytes de registro a inspeccionar.
- `--url <url>`: URL de WebSocket de Gateway para instantáneas de estado y salud.
- `--token <token>`: token de Gateway para instantáneas de estado y salud.
- `--password <password>`: contraseña de Gateway para instantáneas de estado y salud.
- `--timeout <ms>`: tiempo de espera de la instantánea de estado y salud.
- `--no-stability-bundle`: omitir la búsqueda del paquete de estabilidad persistido.
- `--json`: imprimir metadatos de exportación legibles por máquina.

## Deshabilitar diagnósticos

Los diagnósticos están habilitados de forma predeterminada. Para deshabilitar el grabador de estabilidad y la recopilación de eventos de diagnóstico:

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

Deshabilitar los diagnósticos reduce el detalle del informe de errores. No afecta el registro normal de Gateway.

## Relacionado

- [Verificaciones de salud](/es/gateway/health)
- [CLI de Gateway](/es/cli/gateway#gateway-diagnostics-export)
- [Protocolo de Gateway](/es/gateway/protocol#system-and-identity)
- [Registro](/es/logging)
- [Exportación de OpenTelemetry](/es/gateway/opentelemetry) — flujo separado para transmitir diagnósticos a un recolector
