---
summary: "OpenClawSuperviser les sessions du serveur d'application Codex depuis OpenClaw."
read_when:
  - You are installing, configuring, or auditing the codex-supervisor plugin
title: "Plugin Codex Supervisor"
---

# Plugin Codex Supervisor

Superviser les sessions du serveur d'application Codex depuis OpenClaw.

## Distribution

- Package : `@openclaw/codex-supervisor`
- Route d'installation : incluse dans OpenClaw

## Surface

contrats : outils

{/* openclaw-plugin-reference:manual-start */}

## Liste des sessions

`codex_sessions_list` inclut par défaut uniquement les sessions Codex chargées. Définissez `include_stored` pour inclure l'historique stocké ; le plugin utilise le chemin de listing state-DB-only du serveur d'applications Codex et plafonne les résultats stockés à 200 par défaut. Passez `max_stored_sessions` pour abaisser ou augmenter cette limite, jusqu'à 1000.

{/* openclaw-plugin-reference:manual-end */}
