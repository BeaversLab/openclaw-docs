---
summary: "Référence de CLI pour `openclaw dashboard` (ouvrir l'interface de contrôle)"
lire_quand :
  - Vous souhaitez ouvrir l'interface de contrôle avec votre jeton actuel
  - Vous souhaitez afficher l'URL sans lancer de navigateur
title : "dashboard"
---

# `openclaw dashboard`

Ouvrez l'interface de contrôle en utilisant votre authentification actuelle.

```bash
openclaw dashboard
openclaw dashboard --no-open
```

Notes :

- `dashboard` résout les SecretRefs `gateway.auth.token` configurés lorsque cela est possible.
- Pour les jetons gérés par SecretRef (résolus ou non résolus), `dashboard` affiche/copie/ouvre une URL non tokenisée pour éviter d'exposer des secrets externes dans la sortie du terminal, l'historique du presse-papiers ou les arguments de lancement du navigateur.
- Si `gateway.auth.token` est géré par SecretRef mais non résolu dans ce chemin de commande, la commande affiche une URL non tokenisée et des instructions de remédiation explicites au lieu d'intégrer un espace réservé de jeton non valide.

import en from "/components/footer/en.mdx";

<en />
