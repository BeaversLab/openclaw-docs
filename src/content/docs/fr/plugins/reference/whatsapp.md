---
summary: "WhatsAppOpenClawAjoute la surface de channel WhatsApp pour l'envoi et la réception de messages OpenClaw."
read_when:
  - You are installing, configuring, or auditing the whatsapp plugin
title: "WhatsAppPlugin WhatsApp"
---

# Plugin WhatsApp

Ajoute la surface de channel WhatsApp pour l'envoi et la réception de messages OpenClaw.

## Distribution

- Package : `@openclaw/whatsapp`
- Install route : npm ; ClawHub

## Surface

channels : whatsapp

## Note d'installation Windows

Sur Windows, le plugin WhatsApp nécessite Git sur WindowsWhatsApp`PATH`npmBaileysWindows durant l'installation npm car l'une de ses dépendances Baileys/libsignal est récupérée depuis une URL git. Installez Git pour Windows, puis redémarrez le shell et relancez l'installation :

```powershell
winget install --id Git.Git -e
```

Portable Git fonctionne également si son répertoire `bin` est sur `PATH`.

## Docs connexes

- [whatsapp](/fr/channels/whatsapp)
