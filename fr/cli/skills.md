---
summary: "Référence CLI pour `openclaw skills` (list/info/check) et l'éligibilité des compétences"
read_when:
  - Vous voulez voir quelles compétences sont disponibles et prêtes à être exécutées
  - Vous voulez déboguer les binaires/env/config manquants pour les compétences
title: "skills"
---

# `openclaw skills`

Inspecter les compétences (intégrées + espace de travail + remplacements gérés) et voir ce qui est éligible par rapport aux exigences manquantes.

Connexes :

- Système de compétences : [Skills](/fr/tools/skills)
- Configuration des compétences : [Skills config](/fr/tools/skills-config)
- Installations ClawHub : [ClawHub](/fr/tools/clawhub)

## Commandes

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

import fr from "/components/footer/fr.mdx";

<fr />
