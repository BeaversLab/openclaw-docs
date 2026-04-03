---
summary: "Référence de la CLI pour `openclaw configure` (prompts de configuration interactive)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

Invite interactive pour configurer les identifiants, les appareils et les valeurs par défaut de l'agent.

Remarque : La section **Modèle** comprend désormais une sélection multiple pour la liste d'autorisation `agents.defaults.models` (ce qui s'affiche dans `/model` et le sélecteur de modèle).

Astuce : `openclaw config` sans sous-commande ouvre le même assistant. Utilisez `openclaw config get|set|unset` pour les modifications non interactives.

Pour la recherche web, `openclaw configure --section web` vous permet de choisir un fournisseur
et de configurer ses identifiants. Si vous choisissez **Grok**, configure peut également afficher
une étape de suivi distincte pour activer `x_search` avec les mêmes `XAI_API_KEY` et
sélectionner un `x_search` model. Les autres fournisseurs de recherche web n'affichent pas cette étape.

Connexes :

- Référence de configuration du Gateway : [Configuration](/en/gateway/configuration)
- CLI de configuration : [Config](/en/cli/config)

Notes :

- Le choix de l'emplacement d'exécution du Gateway met toujours à jour `gateway.mode`. Vous pouvez sélectionner « Continuer » sans les autres sections si c'est tout ce dont vous avez besoin.
- Les services orientés canal (Slack/Discord/Matrix/Microsoft Teams) demandent les listes d'autorisation de canaux/salles lors de la configuration. Vous pouvez saisir des noms ou des ID ; l'assistant résout les noms en ID lorsque cela est possible.
- Si vous exécutez l'étape d'installation du daemon, l'authentification par jeton nécessite un jeton, et si `gateway.auth.token` est géré par SecretRef, configure valide le SecretRef mais ne conserve pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service de supervision.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, configure bloque l'installation du daemon avec des conseils de correction exploitables.
- Si à la fois `gateway.auth.token` et `gateway.auth.password` sont configurés et que `gateway.auth.mode` n'est pas défini, configure bloque l'installation du daemon jusqu'à ce que le mode soit défini explicitement.

## Exemples

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
```
