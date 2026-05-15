---
summary: "Añade la superficie del canal de WhatsApp para enviar y recibir mensajes de OpenClaw."
read_when:
  - You are installing, configuring, or auditing the whatsapp plugin
title: "Complemento de WhatsApp"
---

# Complemento de WhatsApp

Añade la superficie del canal de WhatsApp para enviar y recibir mensajes de OpenClaw.

## Distribución

- Paquete: `@openclaw/whatsapp`
- Ruta de instalación: npm; ClawHub

## Superficie

canales: whatsapp

## Nota de instalación en Windows

En Windows, el complemento de WhatsApp necesita Git en `PATH` durante npm install porque una de sus dependencias Baileys/libsignal se obtiene de una URL de git. Instale Git para Windows, luego reinicie el shell y vuelva a ejecutar la instalación:

```powershell
winget install --id Git.Git -e
```

Git Portable también funciona si su directorio `bin` está en `PATH`.

## Documentos relacionados

- [whatsapp](/es/channels/whatsapp)
