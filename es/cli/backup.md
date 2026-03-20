---
summary: "Referencia de la CLI para `openclaw backup` (crear archivos de respaldo locales)"
read_when:
  - Deseas un archivo de respaldo de primera clase para el estado local de OpenClaw
  - Deseas previsualizar qué rutas se incluirían antes de restablecer o desinstalar
title: "backup"
---

# `openclaw backup`

Crea un archivo de respaldo local para el estado, la configuración, las credenciales, las sesiones y, opcionalmente, los espacios de trabajo de OpenClaw.

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
- Si el directorio de trabajo actual está dentro de un árbol de origen respaldado, OpenClaw recurre a tu directorio de inicio para la ubicación predeterminada del archivo.
- Los archivos de archivo existentes nunca se sobrescriben.
- Las rutas de salida dentro de los árboles de estado/espacio de trabajo de origen se rechazan para evitar la autoinclusión.
- `openclaw backup verify <archive>` valida que el archivo contenga exactamente un manifiesto raíz, rechaza las rutas de archivo de estilo de cruce y verifica que cada carga declarada en el manifiesto exista en el tarball.
- `openclaw backup create --verify` ejecuta esa validación inmediatamente después de escribir el archivo.
- `openclaw backup create --only-config` respalda solo el archivo de configuración JSON activo.

## Qué se respalda

`openclaw backup create` planea las fuentes de respaldo desde tu instalación local de OpenClaw:

- El directorio de estado devuelto por el solucionador de estado local de OpenClaw, generalmente `~/.openclaw`
- La ruta del archivo de configuración activo
- El directorio de OAuth / credenciales
- Directorios de espacio de trabajo descubiertos desde la configuración actual, a menos que pases `--no-include-workspace`

Si usas `--only-config`, OpenClaw omite el estado, las credenciales y el descubrimiento de espacios de trabajo y archiva solo la ruta del archivo de configuración activo.

OpenClaw canónica las rutas antes de construir el archivo. Si la configuración, las credenciales o un espacio de trabajo ya residen dentro del directorio de estado, no se duplican como fuentes de respaldo de nivel superior. Las rutas faltantes se omiten.

La carga útil del archivo almacena el contenido de los archivos de esos árboles de origen, y el `manifest.json` incrustado registra las rutas de origen absolutas resueltas más el diseño del archivo utilizado para cada activo.

## Comportamiento de configuración no válida

`openclaw backup` omite intencionalmente la verificación previa normal de la configuración para que aún pueda ayudar durante la recuperación. Dado que el descubrimiento del espacio de trabajo depende de una configuración válida, `openclaw backup create` ahora falla rápidamente cuando el archivo de configuración existe pero no es válido y la copia de seguridad del espacio de trabajo aún está habilitada.

Si aún deseas una copia de seguridad parcial en esa situación, vuelve a ejecutar:

```bash
openclaw backup create --no-include-workspace
```

Eso mantiene el estado, la configuración y las credenciales dentro del alcance, omitiendo completamente el descubrimiento del espacio de trabajo.

Si solo necesitas una copia del archivo de configuración en sí, `--only-config` también funciona cuando la configuración está malformada porque no depende del análisis de la configuración para el descubrimiento del espacio de trabajo.

## Tamaño y rendimiento

OpenClaw no impone un tamaño máximo de copia de seguridad integrado ni un límite de tamaño por archivo.

Los límites prácticos provienen de la máquina local y el sistema de archivos de destino:

- Espacio disponible para la escritura del archivo temporal más el archivo final
- Tiempo para recorrer árboles grandes de espacios de trabajo y comprimirlos en un `.tar.gz`
- Tiempo para volver a escanear el archivo si usas `openclaw backup create --verify` o ejecutas `openclaw backup verify`
- Comportamiento del sistema de archivos en la ruta de destino. OpenClaw prefiere un paso de publicación con enlaces duros sin sobrescritura y recurre a una copia exclusiva cuando los enlaces duros no son compatibles

Los espacios de trabajo grandes suelen ser el factor principal del tamaño del archivo. Si deseas una copia de seguridad más pequeña o más rápida, usa `--no-include-workspace`.

Para el archivo más pequeño, usa `--only-config`.

import en from "/components/footer/en.mdx";

<en />
