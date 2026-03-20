---
summary: "Marcas de diagnóstico para registros de depuración específicos"
read_when:
  - Necesitas registros de depuración específicos sin elevar los niveles de registro globales
  - Necesitas capturar registros específicos del subsistema para soporte
title: "Diagnostics Flags"
---

# Marcas de diagnóstico

Las marcas de diagnóstico te permiten habilitar registros de depuración específicos sin activar el registro detallado en todas partes. Las marcas son opcionales y no tienen ningún efecto a menos que un subsistema las verifique.

## Cómo funciona

- Las marcas son cadenas (no distinguen entre mayúsculas y minúsculas).
- Puedes habilitar las marcas en la configuración o mediante una invalidación de variable de entorno.
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

Reinicia la puerta de enlace después de cambiar las marcas.

## Invalidación de variable de entorno (única)

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

Si configuras `logging.file`, usa esa ruta en su lugar. Los registros están en formato JSONL (un objeto JSON por línea). La redacción todavía se aplica según `logging.redactSensitive`.

## Extraer registros

Elige el archivo de registro más reciente:

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

Filtrar para diagnósticos HTTP de Telegram:

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

O usar tail mientras se reproduce:

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

Para puertas de enlace remotas, también puedes usar `openclaw logs --follow` (consulta [/cli/logs](/es/cli/logs)).

## Notas

- Si `logging.level` está configurado más alto que `warn`, estos registros pueden suprimirse. El valor predeterminado `info` está bien.
- Es seguro dejar las marcas habilitadas; solo afectan el volumen de registros para el subsistema específico.
- Usa [/logging](/es/logging) para cambiar los destinos de los registros, los niveles y la redacción.

import es from "/components/footer/es.mdx";

<es />
