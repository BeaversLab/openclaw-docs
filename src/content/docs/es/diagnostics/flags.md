---
summary: "Marcadores de diagnóstico para registros de depuración específicos"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Marcadores de diagnóstico"
---

Las banderas de diagnóstico le permiten habilitar registros de depuración específicos sin activar el registro detallado en todas partes. Las banderas son opcionales y no tienen ningún efecto a menos que un subsistema las verifique.

## Cómo funciona

- Las banderas son cadenas (no distinguen entre mayúsculas y minúsculas).
- Puede habilitar banderas en la configuración o mediante una anulación de variable de entorno.
- Se admiten comodines:
  - `telegram.*` coincide con `telegram.http`
  - `*` habilita todos los marcadores

## Habilitar mediante configuración

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Múltiples banderas:

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

Reinicie la puerta de enlace después de cambiar las banderas.

## Anulación de variable de entorno (única)

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Deshabilitar todas las banderas:

```bash
OPENCLAW_DIAGNOSTICS=0
```

`OPENCLAW_DIAGNOSTICS=0` es una anulación de desactivación a nivel de proceso: deshabilita
los marcadores tanto del entorno como de la configuración para ese proceso.

## Marcadores de generación de perfiles

Los marcadores del generador de perfiles habilitan intervalos de tiempo específicos sin elevar
los niveles globales de registro. Están deshabilitados de forma predeterminada.

Habilitar todos los intervalos controlados por el generador de perfiles para una ejecución de la puerta de enlace:

```bash
OPENCLAW_DIAGNOSTICS=profiler openclaw gateway run
```

Habilitar solo los intervalos del generador de perfiles de despacho de respuestas:

```bash
OPENCLAW_DIAGNOSTICS=reply.profiler openclaw gateway run
```

Habilitar solo los intervalos del generador de perfiles de inicio/herramienta/subproceso del servidor de aplicaciones de Codex:

```bash
OPENCLAW_DIAGNOSTICS=codex.profiler openclaw gateway run
```

Habilitar marcadores del generador de perfiles desde la configuración:

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

Reinicie la puerta de enlace después de cambiar los marcadores de configuración. Para deshabilitar un marcador del generador de perfiles,
elimínelo de `diagnostics.flags` y reinicie. Para deshabilitar temporalmente todos
los marcadores de diagnóstico incluso cuando la configuración habilita los marcadores del generador de perfiles, inicie el proceso con:

```bash
OPENCLAW_DIAGNOSTICS=0 openclaw gateway run
```

## Artefactos de la línea de tiempo

El marcador `timeline` escribe eventos de tiempo estructurados de inicio y en tiempo de ejecución para
arneses de control de calidad externos:

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

También puede habilitarlo en la configuración:

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

La ruta del archivo de línea de tiempo aún proviene de
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`. Cuando `timeline` se habilita solo desde
la configuración, los intervalos de carga de configuración más tempranos no se emiten porque OpenClaw aún
no ha leído la configuración; los intervalos de inicio posteriores usan el marcador de configuración.

`OPENCLAW_DIAGNOSTICS=1`, `OPENCLAW_DIAGNOSTICS=all` y
`OPENCLAW_DIAGNOSTICS=*` también habilitan la línea de tiempo porque habilitan todos
los marcadores de diagnóstico. Se prefiere `timeline` cuando solo desea el artefacto de tiempo
JSONL.

Los registros de la línea de tiempo usan el sobre `openclaw.diagnostics.v1`. Los eventos pueden incluir
identificadores de proceso, nombres de fase, nombres de intervalo, duraciones, identificadores de complementos, recuentos de dependencias,
muestras de retraso del bucle de eventos, nombres de operaciones del proveedor, estado de salida del proceso secundario
y nombres/mensajes de error de inicio. Trate los archivos de línea de tiempo como artefactos de diagnóstico
locales; revíselos antes de compartirlos fuera de su máquina.

## Dónde van los registros

Los marcadores emiten registros en el archivo de registro de diagnóstico estándar. De forma predeterminada:

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si establece `logging.file`, use esa ruta en su lugar. Los registros son JSONL (un objeto JSON por línea). La redacción aún se aplica basándose en `logging.redactSensitive`.

## Extraer registros

Elija el archivo de registro más reciente:

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrar para diagnósticos HTTP de Telegram:

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

Filtrar para diagnósticos HTTP de Brave Search:

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

O hacer un seguimiento (tail) mientras reproduce:

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Para gateways remotos, también puede usar `openclaw logs --follow` (consulte [/cli/logs](/es/cli/logs)).

## Notas

- Si `logging.level` se establece más alto que `warn`, estos registros pueden suprimirse. El valor predeterminado `info` está bien.
- `brave.http` registra las URL/parámetros de consulta de solicitud de Brave Search, el estado/cronometraje de respuesta y los eventos de acierto/fallo/escritura en caché. No registra las claves de API ni los cuerpos de respuesta, pero las consultas de búsqueda pueden ser confidenciales.
- Es seguro dejar las marcas (flags) habilitadas; solo afectan el volumen de registro para el subsistema específico.
- Use [/logging](/es/logging) para cambiar los destinos de registro, niveles y redacción.

## Relacionado

- [Gateway diagnostics](/es/gateway/diagnostics)
- [Gateway troubleshooting](/es/gateway/troubleshooting)
