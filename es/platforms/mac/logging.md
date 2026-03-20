---
summary: "Registro de OpenClaw: archivo de registro de diagnósticos rotativo + marcas de privacidad de registro unificado"
read_when:
  - Capturar registros de macOS o investigar el registro de datos privados
  - Depurar problemas de ciclo de vida de activación por voz/sesión
title: "Registro de macOS"
---

# Registro (macOS)

## Archivo de registro de diagnósticos rotativos (Panel de depuración)

OpenClaw enruta los registros de la aplicación de macOS a través de swift-log (registro unificado de forma predeterminada) y puede escribir un archivo de registro local y rotativo en el disco cuando necesites una captura duradera.

- Nivel de detalle: **Panel de depuración → Registros → Registro de aplicación → Nivel de detalle**
- Activar: **Panel de depuración → Registros → Registro de aplicación → “Escribir registro de diagnósticos rotativos (JSONL)”**
- Ubicación: `~/Library/Logs/OpenClaw/diagnostics.jsonl` (rota automáticamente; los archivos antiguos tienen el sufijo `.1`, `.2`, …)
- Borrar: **Panel de depuración → Registros → Registro de aplicación → “Borrar”**

Notas:

- Esto está **desactivado de forma predeterminada**. Actívelo solo mientras depura activamente.
- Trate el archivo como confidencial; no lo comparta sin revisión.

## Datos privados de registro unificado en macOS

El registro unificado redacta la mayoría de las cargas útiles a menos que un subsistema acepte `privacy -off`. Según la publicación de Peter sobre [travesuras de privacidad de registro en macOS](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025), esto se controla mediante un plist en `/Library/Preferences/Logging/Subsystems/` con clave por el nombre del subsistema. Solo las nuevas entradas de registro adoptan la marca, así que actívela antes de reproducir un problema.

## Activar para OpenClaw (`ai.openclaw`)

- Escriba primero el plist en un archivo temporal y luego instálelo atómicamente como root:

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- No es necesario reiniciar; logd nota el archivo rápidamente, pero solo las nuevas líneas de registro incluirán cargas útiles privadas.
- Vea la salida más rica con el asistente existente, p. ej., `./scripts/clawlog.sh --category WebChat --last 5m`.

## Desactivar después de la depuración

- Elimine la invalidación: `sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`.
- Opcionalmente, ejecute `sudo log config --reload` para forzar a logd a eliminar la invalidación inmediatamente.
- Recuerde que esta superficie puede incluir números de teléfono y cuerpos de mensajes; mantenga el plist en su lugar solo mientras necesita activamente el detalle adicional.

import en from "/components/footer/en.mdx";

<en />
