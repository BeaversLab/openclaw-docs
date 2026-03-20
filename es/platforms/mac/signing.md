---
summary: "Pasos de firma para las compilaciones de depuración de macOS generadas por los scripts de empaquetado"
read_when:
  - Compilar o firmar compilaciones de depuración de mac
title: "Firma de macOS"
---

# firma de mac (compilaciones de depuración)

Esta aplicación generalmente se compila desde [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh), que ahora:

- establece un identificador de paquete de depuración estable: `ai.openclaw.mac.debug`
- escribe el Info.plist con ese id de paquete (anular mediante `BUNDLE_ID=...`)
- llama a [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) para firmar el binario principal y el paquete de la aplicación, de modo que macOS trate cada recompilación como el mismo paquete firmado y mantenga los permisos TCC (notificaciones, accesibilidad, grabación de pantalla, micrófono, voz). Para permisos estables, use una identidad de firma real; la firma ad-hoc es opcional y frágil (consulte [permisos de macOS](/es/platforms/mac/permissions)).
- usa `CODESIGN_TIMESTAMP=auto` de forma predeterminada; habilita marcas de tiempo de confianza para las firmas de ID de desarrollador. Configure `CODESIGN_TIMESTAMP=off` para omitir la marca de tiempo (compilaciones de depuración sin conexión).
- inyecta metadatos de compilación en Info.plist: `OpenClawBuildTimestamp` (UTC) y `OpenClawGitCommit` (hash corto) para que el panel Acerca de pueda mostrar la compilación, git y el canal de depuración/release.
- **El empaquetado por defecto usa Node 24**: el script ejecuta las compilaciones de TS y la compilación de la Interfaz de usuario de control. Node 22 LTS, actualmente `22.16+`, sigue siendo compatible.
- lee `SIGN_IDENTITY` del entorno. Agregue `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"` (o su certificado de ID de desarrollador de aplicación) a su rc de shell para siempre firmar con su certificado. La firma ad-hoc requiere participación explícita a través de `ALLOW_ADHOC_SIGNING=1` o `SIGN_IDENTITY="-"` (no recomendado para pruebas de permisos).
- ejecuta una auditoría de ID de equipo después de la firma y falla si algún Mach-O dentro del paquete de la aplicación está firmado por un ID de equipo diferente. Configure `SKIP_TEAM_ID_CHECK=1` para omitir.

## Uso

```bash
# from repo root
scripts/package-mac-app.sh               # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # dev-only Sparkle Team ID mismatch workaround
```

### Nota sobre la firma ad-hoc

Al firmar con `SIGN_IDENTITY="-"` (ad-hoc), el script deshabilita automáticamente el **Hardened Runtime** (`--options runtime`). Esto es necesario para evitar bloqueos cuando la aplicación intenta cargar frameworks integrados (como Sparkle) que no comparten el mismo Team ID. Las firmas ad-hoc también interrumpen la persistencia de los permisos TCC; consulte [macOS permissions](/es/platforms/mac/permissions) para conocer los pasos de recuperación.

## Metadatos de compilación para About

`package-mac-app.sh` estampa el paquete con:

- `OpenClawBuildTimestamp`: ISO8601 UTC en el momento del empaquetado
- `OpenClawGitCommit`: hash corto de git (o `unknown` si no está disponible)

La pestaña About lee estas claves para mostrar la versión, la fecha de compilación, el commit de git y si es una compilación de depuración (a través de `#if DEBUG`). Ejecute el empaquetador para actualizar estos valores después de los cambios en el código.

## Por qué

Los permisos TCC están vinculados al identificador del paquete _y_ a la firma del código. Las compilaciones de depuración sin firmar con UUID cambiantes hacían que macOS olvidara los permisos después de cada recompilación. La firma de los binarios (ad-hoc de forma predeterminada) y el mantenimiento de una identificación/ruta de paquete fija (`dist/OpenClaw.app`) conservan los permisos entre compilaciones, coincidiendo con el enfoque de VibeTunnel.

import es from "/components/footer/es.mdx";

<es />
