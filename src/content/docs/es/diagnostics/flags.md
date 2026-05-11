---
summary: "Marcas de diagnóstico para registros de depuración específicos"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Banderas de diagnóstico"
---

Las banderas de diagnóstico le permiten habilitar registros de depuración específicos sin activar el registro detallado en todas partes. Las banderas son opcionales y no tienen ningún efecto a menos que un subsistema las verifique.

## Cómo funciona

- Las banderas son cadenas (no distinguen entre mayúsculas y minúsculas).
- Puede habilitar banderas en la configuración o mediante una anulación de variable de entorno.
- Se admiten comodines:
  - `telegram.*` coincide con `telegram.http`
  - `*` habilita todas las banderas

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
    "flags": ["telegram.http", "gateway.*"]
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

## Dónde van los registros

Las banderas emiten registros en el archivo de registro de diagnóstico estándar. De forma predeterminada:

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Si establece `logging.file`, use esa ruta en su lugar. Los registros son JSONL (un objeto JSON por línea). La redacción todavía se aplica según `logging.redactSensitive`.

## Extraer registros

Seleccione el archivo de registro más reciente:

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrar por diagnósticos HTTP de Telegram:

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

O hacer un seguimiento mientras se reproduce:

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Para puertas de enlace remotas, también puede usar `openclaw logs --follow` (consulte [/cli/logs](/es/cli/logs)).

## Notas

- Si `logging.level` se establece más alto que `warn`, estos registros pueden suprimirse. El valor predeterminado `info` está bien.
- Es seguro dejar las banderas habilitadas; solo afectan el volumen de registros para el subsistema específico.
- Use [/logging](/es/logging) para cambiar los destinos de registro, los niveles y la redacción.

## Relacionado

- [Diagnósticos de puerta de enlace](/es/gateway/diagnostics)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)
