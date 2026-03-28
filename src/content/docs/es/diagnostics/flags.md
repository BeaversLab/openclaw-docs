---
summary: "Marcas de diagnóstico para registros de depuración específicos"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Marcas de Diagnóstico"
---

# Marcas de Diagnóstico

Las marcas de diagnóstico le permiten habilitar registros de depuración específicos sin activar el registro detallado en todas partes. Las marcas son optativas y no tienen ningún efecto a menos que un subsistema las verifique.

## Cómo funciona

- Las marcas son cadenas (no distinguen entre mayúsculas y minúsculas).
- Puede habilitar marcas en la configuración o mediante una anulación de variable de entorno.
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

Múltiples marcas:

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

Reinicie la puerta de enlace después de cambiar las marcas.

## Anulación de variable de entorno (única)

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Deshabilitar todas las marcas:

```bash
OPENCLAW_DIAGNOSTICS=0
```

## Dónde van los registros

Las marcas emiten registros en el archivo de registro de diagnóstico estándar. De forma predeterminada:

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si establece `logging.file`, use esa ruta en su lugar. Los registros están en formato JSONL (un objeto JSON por línea). La redacción todavía se aplica basándose en `logging.redactSensitive`.

## Extraer registros

Seleccione el archivo de registro más reciente:

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrar diagnósticos HTTP de Telegram:

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

O haga un seguimiento mientras reproduce:

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Para puertas de enlace remotas, también puede usar `openclaw logs --follow` (consulte [/cli/logs](/es/cli/logs)).

## Notas

- Si `logging.level` se establece más alto que `warn`, estos registros pueden suprimirse. El valor predeterminado `info` está bien.
- Es seguro dejar las marcas habilitadas; solo afectan el volumen de registros para el subsistema específico.
- Use [/logging](/es/logging) para cambiar destinos de registros, niveles y redacción.
