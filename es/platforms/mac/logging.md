---
summary: "Registro de OpenClaw: registro de archivo de diagnóstico rotativo + indicadores de privacidad de registro unificado"
read_when:
  - Capturing macOS logs or investigating private data logging
  - Debugging voice wake/session lifecycle issues
title: "Registro de macOS"
---

# Registro (macOS)

## Registro de archivo de diagnóstico rotativo (panel Depuración)

OpenClaw enruta los registros de la aplicación de macOS a través de swift-log (registro unificado de forma predeterminada) y puede escribir un registro de archivo local y rotativo en el disco cuando necesite una captura duradera.

- Verbosidad: **Panel Depuración → Registros → Registro de aplicaciones → Verbosidad**
- Habilitar: **Panel Depuración → Registros → Registro de aplicaciones → “Escribir registro de diagnóstico rotativo (JSONL)”**
- Ubicación: `~/Library/Logs/OpenClaw/diagnostics.jsonl` (rota automáticamente; los archivos antiguos tienen el sufijo `.1`, `.2`, …)
- Borrar: **Panel Depuración → Registros → Registro de aplicaciones → “Borrar”**

Notas:

- Esto está **desactivado de forma predeterminada**. Habilítelo solo mientras depura activamente.
- Trate el archivo como confidencial; no lo comparta sin revisión.

## Datos privados de registro unificado en macOS

El registro unificado redacta la mayoría de las cargas útiles a menos que un subsistema opte por `privacy -off`. Según el artículo de Peter sobre las [travesuras de privacidad del registro](https://steipete.me/posts/2025/logging-privacy-shenanigans) de macOS (2025), esto se controla mediante un plist en `/Library/Preferences/Logging/Subsystems/` con clave por el nombre del subsistema. Solo las nuevas entradas de registro adoptan el indicador, así que habilítelo antes de reproducir un problema.

## Habilitar para OpenClaw (`ai.openclaw`)

- Escriba primero el plist en un archivo temporal y luego instálelo de forma atómica como root:

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
- Vea la salida más enriquecida con el asistente existente, p. ej. `./scripts/clawlog.sh --category WebChat --last 5m`.

## Deshabilitar después de la depuración

- Elimine la anulación: `sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`.
- Opcionalmente, ejecute `sudo log config --reload` para forzar a logd a eliminar la anulación de inmediato.
- Recuerde que esta superficie puede incluir números de teléfono y cuerpos de mensajes; mantenga el plist en su lugar solo mientras necesite activamente el detalle adicional.

import es from "/components/footer/es.mdx";

<es />
