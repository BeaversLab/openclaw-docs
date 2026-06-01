---
summary: "Modèle d'espace de travail pour HEARTBEAT.md"
title: "Modèle HEARTBEAT.md"
read_when:
  - Bootstrapping a workspace manually
---

# Modèle HEARTBEAT.md

`HEARTBEAT.md`OpenClaw réside dans l'espace de travail de l'agent. Gardez le fichier vide, ou avec seulement des commentaires et des titres Markdown, lorsque vous voulez qu'OpenClaw ignore les appels au model de heartbeat.

Le modèle d'exécution par défaut est :

```markdown
# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
```

Ajoutez des tâches courtes sous les commentaires uniquement lorsque vous voulez que l'agent vérifie quelque chose périodiquement. Gardez les instructions de heartbeat brèves car elles sont lues lors des réveils récurrents.

## Connexes

- [Configuration du heartbeat](/fr/gateway/config-agents)
