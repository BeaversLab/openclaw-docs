---
summary: "Compacta los resultados de herramientas exec y bash ruidosos con un complemento incluido opcional"
title: "Tokenjuice"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

`tokenjuice` es un complemento incluido opcional que compacta los resultados de herramientas `exec` y `bash` ruidosos después de que el comando ya se ha ejecutado.

Cambia el `tool_result` devuelto, no el comando en sí. Tokenjuice no reescribe la entrada del shell, no vuelve a ejecutar comandos ni cambia los códigos de salida.

Hoy esto se aplica a las ejecuciones integradas de OpenClaw y las herramientas dinámicas de OpenClaw en el arnés del servidor de aplicaciones Codex. Tokenjuice se engancha al middleware de resultados de herramientas de OpenClaw y recorta la salida antes de que regrese a la sesión activa del arnés.

## Habilitar el complemento

Ruta rápida:

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

Equivalente:

```bash
openclaw plugins enable tokenjuice
```

OpenClaw ya incluye el complemento. No hay un paso separado de `plugins install` o `tokenjuice install openclaw`.

Si prefieres editar la configuración directamente:

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## Lo que cambia tokenjuice

- Compacta los resultados ruidosos de `exec` y `bash` antes de que se vuelvan a introducir en la sesión.
- Mantiene la ejecución del comando original sin tocar.
- Conserva las lecturas exactas del contenido de los archivos y otros comandos que tokenjuice debe dejar sin procesar.
- Mantiene la opción de participación: deshabilita el complemento si deseas una salida literal en todas partes.

## Verificar que está funcionando

1. Habilita el complemento.
2. Inicia una sesión que pueda llamar a `exec`.
3. Ejecuta un comando ruidoso como `git status`.
4. Verifica que el resultado de la herramienta devuelto sea más corto y más estructurado que la salida sin procesar del shell.

## Deshabilitar el complemento

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

O:

```bash
openclaw plugins disable tokenjuice
```

## Relacionado

- [Herramienta Exec](/es/tools/exec)
- [Niveles de pensamiento](/es/tools/thinking)
- [Motor de contexto](/es/concepts/context-engine)
