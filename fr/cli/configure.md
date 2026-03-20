---
summary: "Référence de la CLI pour `openclaw configure` (prompts de configuration interactive)"
read_when:
  - Vous souhaitez ajuster les informations d'identification, les appareils ou les valeurs par défaut de l'agent de manière interactive
title: "configure"
---

# `openclaw configure`

Invite interactive pour configurer les identifiants, les appareils et les valeurs par défaut de l'agent.

Remarque : La section **Model** inclut désormais une sélection multiple pour la liste blanche `agents.defaults.models` (ce qui s'affiche dans `/model` et le sélecteur de modèle).

Conseil : `openclaw config` sans sous-commande ouvre le même assistant. Utilisez
`openclaw config get|set|unset` pour les modifications non interactives.

En relation :

- Référence de configuration de la Gateway : [Configuration](/fr/gateway/configuration)
- CLI de configuration : [Configuration](/fr/cli/config)

Notes :

- Le choix de l'emplacement d'exécution de la Gateway met toujours à jour `gateway.mode`. Vous pouvez sélectionner "Continue" sans les autres sections si c'est tout ce dont vous avez besoin.
- Les services orientés canal (Slack/Discord/Matrix/Microsoft Teams) demandent les listes d'autorisation de canal/salle lors de la configuration. Vous pouvez saisir des noms ou des ID ; l'assistant résout les noms en ID lorsque cela est possible.
- Si vous exécutez l'étape d'installation du démon, l'authentification par jeton nécessite un jeton, et `gateway.auth.token` est géré par SecretRef, configure valide le SecretRef mais ne conserve pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service superviseur.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré n'est pas résolu, configure bloque l'installation du démon avec des conseils de correctif exploitables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, configure bloque l'installation du démon jusqu'à ce que le mode soit défini explicitement.

## Exemples

```bash
openclaw configure
openclaw configure --section model --section channels
```

import en from "/components/footer/en.mdx";

<en />
