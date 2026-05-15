---
summary: "Marcas de diagnóstico para registros de depuración específicos"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Marcas de diagnóstico"
---

Las banderas de diagnóstico le permiten habilitar registros de depuración específicos sin activar el registro detallado en todas partes. Las banderas son opcionales y no tienen ningún efecto a menos que un subsistema las verifique.

## Cómo funciona

- Las banderas son cadenas (no distinguen entre mayúsculas y minúsculas).
- Puede habilitar banderas en la configuración o mediante una anulación de variable de entorno.
- Se admiten comodines:
  - `telegram.*` coincide con `telegram.http`
  - `*` habilita todas las marcas

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

## Artefactos de la línea de tiempo

La marca `timeline` escribe eventos de temporización estructurados de inicio y en tiempo de ejecución para
arneses de control de calidad externos:

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

También puedes habilitarla en la configuración:

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

La ruta del archivo de línea de tiempo todavía proviene de
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`. Cuando `timeline` está habilitado solo desde
la configuración, los intervalos de carga de configuración más tempranos no se emiten porque OpenClaw
aún no ha leído la configuración; los intervalos de inicio posteriores usan la marca de configuración.

`OPENCLAW_DIAGNOSTICS=1`, `OPENCLAW_DIAGNOSTICS=all` y
`OPENCLAW_DIAGNOSTICS=*` también habilitan la línea de tiempo porque habilitan todas las
marcas de diagnóstico. Se prefiere `timeline` cuando solo deseas el artefacto de
temporización JSONL.

Los registros de la línea de tiempo usan el sobre `openclaw.diagnostics.v1`. Los eventos pueden incluir
ids de proceso, nombres de fase, nombres de intervalo, duraciones, ids de complementos, recuentos de dependencias,
muestras de retraso del bucle de eventos, nombres de operaciones del proveedor, estado de salida del proceso hijo,
y nombres/mensajes de error de inicio. Trata los archivos de línea de tiempo como artefactos de
diagnóstico locales; revísalos antes de compartirlos fuera de tu máquina.

## Dónde van los registros

Las marcas emiten registros en el archivo de registro de diagnóstico estándar. Por defecto:

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si configuras `logging.file`, usa esa ruta en su lugar. Los registros son JSONL (un objeto JSON por línea). La redacción todavía se aplica basándose en `logging.redactSensitive`.

## Extraer registros

Elige el archivo de registro más reciente:

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

O rastrear mientras se reproduce:

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Para puertas de enlace remotas, también puedes usar `openclaw logs --follow` (consulta [/cli/logs](/es/cli/logs)).

## Notas

- Si `logging.level` está configurado más alto que `warn`, estos registros pueden suprimirse. El valor predeterminado `info` está bien.
- `brave.http` registra las URL de las solicitudes de Brave Search, los parámetros de consulta, el estado de la respuesta/cronometraje y los eventos de acierto/fallo/escritura en caché. No registra las claves de API ni los cuerpos de las respuestas, pero las consultas de búsqueda pueden ser confidenciales.
- Es seguro dejar las banderas habilitadas; solo afectan el volumen de registro del subsistema específico.
- Use [/logging](/es/logging) para cambiar los destinos de registro, los niveles y la redacción.

## Relacionado

- [Gateway diagnostics](/es/gateway/diagnostics)
- [Gateway troubleshooting](/es/gateway/troubleshooting)
