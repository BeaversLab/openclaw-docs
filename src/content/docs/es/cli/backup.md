---
summary: "Referencia de CLI para `openclaw backup` (crear archivos de copia de seguridad locales)"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "Copia de seguridad"
---

# `openclaw backup`

Cree un archivo de copia de seguridad local para el estado, la configuración, los perfiles de autenticación, las credenciales de canal/proveedor, las sesiones y, opcionalmente, los espacios de trabajo de OpenClaw.

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## Notas

- El archivo incluye un archivo `manifest.json` con las rutas de origen resueltas y el diseño del archivo.
- La salida predeterminada es un archivo `.tar.gz` con marca de tiempo en el directorio de trabajo actual.
- Si el directorio de trabajo actual está dentro de un árbol de origen respaldado, OpenClaw recurre a su directorio de inicio para la ubicación predeterminada del archivo.
- Los archivos de archivo existentes nunca se sobrescriben.
- Las rutas de salida dentro de los árboles de estado/espacio de trabajo de origen se rechazan para evitar la autoinclusión.
- `openclaw backup verify <archive>` valida que el archivo contenga exactamente un manifiesto raíz, rechaza las rutas de archivo de estilo transversal y verifica que cada carga declarada en el manifiesto exista en el archivo tar.
- `openclaw backup create --verify` ejecuta esa validación inmediatamente después de escribir el archivo.
- `openclaw backup create --only-config` realiza una copia de seguridad solo del archivo de configuración JSON activo.

## Qué se respalda

`openclaw backup create` planifica los orígenes de la copia de seguridad desde su instalación local de OpenClaw:

- El directorio de estado devuelto por el solucionador de estado local de OpenClaw, generalmente `~/.openclaw`
- La ruta del archivo de configuración activo
- El directorio `credentials/` resuelto cuando existe fuera del directorio de estado
- Directorios de espacio de trabajo descubiertos a partir de la configuración actual, a menos que pase `--no-include-workspace`

Los perfiles de autenticación de modelos ya son parte del directorio de estado en
`agents/<agentId>/agent/auth-profiles.json`, por lo que normalmente están cubiertos por la
entrada de copia de seguridad del estado.

Si usa `--only-config`, OpenClaw omite el estado, el directorio de credenciales y el descubrimiento de espacios de trabajo y archiva solo la ruta del archivo de configuración activo.

OpenClaw canónica las rutas antes de construir el archivo. Si la configuración, el
directorio de credenciales o un espacio de trabajo ya están dentro del directorio de estado,
no se duplican como fuentes de copia de seguridad de nivel superior separadas. Las rutas faltantes se
omiten.

La carga útil del archivo almacena el contenido de los archivos de esos árboles de origen, y el `manifest.json` incrustado registra las rutas de origen absolutas resueltas más el diseño del archivo utilizado para cada activo.

Durante la creación del archivo, OpenClaw omite los archivos conocidos de mutación en vivo que no tienen valor de restauración, incluidas las transcripciones de sesiones de agente activas, registros de ejecución de cron, registros rotativos, colas de entrega, archivos de socket/pid/temp en el directorio de estado y archivos temporales de colas duraderas relacionadas. El resultado JSON incluye `skippedVolatileCount` para que la automatización pueda ver cuántos archivos se omitieron intencionalmente.

Se incluyen los archivos de origen y manifiesto del complemento instalado en el árbol `extensions/` del directorio de estado, pero se omiten sus árboles de dependencia `node_modules/` anidados. Esas dependencias son artefactos de instalación reconstruibles; después de restaurar un archivo, use `openclaw plugins update <id>` o reinstale el complemento con `openclaw plugins install <spec> --force` cuando un complemento restaurado informe dependencias faltantes.

## Comportamiento de configuración no válida

`openclaw backup` omite intencionalmente la verificación previa normal de configuración para que aún pueda ayudar durante la recuperación. Dado que el descubrimiento del espacio de trabajo depende de una configuración válida, `openclaw backup create` ahora falla rápidamente cuando el archivo de configuración existe pero no es válido y la copia de seguridad del espacio de trabajo todavía está habilitada.

Si aún desea una copia de seguridad parcial en esa situación, vuelva a ejecutar:

```bash
openclaw backup create --no-include-workspace
```

Eso mantiene el estado, la configuración y el directorio de credenciales externas dentro del alcance mientras se omite por completo el descubrimiento del espacio de trabajo.

Si solo necesita una copia del archivo de configuración en sí, `--only-config` también funciona cuando la configuración está malformada porque no depende del análisis de la configuración para el descubrimiento del espacio de trabajo.

## Tamaño y rendimiento

OpenClaw no impone un tamaño máximo de copia de seguridad integrado ni un límite de tamaño por archivo.

Los límites prácticos provienen de la máquina local y el sistema de archivos de destino:

- Espacio disponible para la escritura temporal del archivo más el archivo final
- Tiempo para recorrer grandes árboles de espacios de trabajo y comprimirlos en un `.tar.gz`
- Tiempo para volver a escanear el archivo si usa `openclaw backup create --verify` o ejecuta `openclaw backup verify`
- Comportamiento del sistema de archivos en la ruta de destino. OpenClaw prefiere un paso de publicación de enlace duro sin sobrescritura y recurre a una copia exclusiva cuando los enlaces duros no son compatibles

Los espacios de trabajo grandes suelen ser el principal factor del tamaño del archivo. Si desea una copia de seguridad más pequeña o más rápida, use `--no-include-workspace`.

Para obtener el archivo más pequeño, use `--only-config`.

## Relacionado

- [Referencia de la CLI](/es/cli)
