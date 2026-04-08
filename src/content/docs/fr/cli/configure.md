---
summary: "Référence de la CLI pour `openclaw configure` (prompts de configuration interactive)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

Invite interactive pour configurer les identifiants, les appareils et les valeurs par défaut de l'agent.

Remarque : La section **Modèle** comprend désormais une sélection multiple pour la liste d'autorisation `agents.defaults.models` (ce qui s'affiche dans `/model` et le sélecteur de modèle).

Lorsque configure démarre à partir d'un choix d'authentification de fournisseur, les sélecteurs de modèle par défaut et de liste d'autorisation privilégient automatiquement ce fournisseur. Pour les fournisseurs associés tels que Volcengine/BytePlus, la même préférence correspond également à leurs variantes de plan de codage (`volcengine-plan/*`, `byteplus-plan/*`). Si le filtre de fournisseur préféré devait produire une liste vide, configure revient au catalogue non filtré au lieu d'afficher un sélecteur vide.

Astuce : `openclaw config` sans sous-commande ouvre le même assistant. Utilisez `openclaw config get|set|unset` pour les modifications non interactives.

Pour la recherche web, `openclaw configure --section web` vous permet de choisir un fournisseur et de configurer ses identifiants. Certains fournisseurs affichent également des invites de suivi spécifiques au fournisseur :

- **Grok** peut proposer une configuration `x_search` facultative avec le même `XAI_API_KEY` et vous permettre de choisir un modèle `x_search`.
- **Kimi** peut demander la région de l'Moonshot API (`api.moonshot.ai` vs `api.moonshot.cn`) et le modèle de recherche web Kimi par défaut.

Connexes :

- Référence de configuration du Gateway : [Configuration](/en/gateway/configuration)
- CLI de configuration : [Config](/en/cli/config)

## Options

- `--section <section>` : filtre de section répétable

Sections disponibles :

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

Notes :

- Le choix de l'emplacement d'exécution du Gateway met toujours à jour `gateway.mode`. Vous pouvez sélectionner « Continue » sans les autres sections si c'est tout ce dont vous avez besoin.
- Les services orientés canal (Slack/Discord/Matrix/Microsoft Teams) demandent les listes d'autorisation de canal/salle lors de la configuration. Vous pouvez saisir des noms ou des ID ; l'assistant résout les noms en ID lorsque cela est possible.
- Si vous exécutez l'étape d'installation du démon, l'authentification par jeton nécessite un jeton, et `gateway.auth.token` est géré par SecretRef, configure valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service superviseur.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré est non résolu, configure bloque l'installation du démon avec des conseils de remédiation actionnables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, configure bloque l'installation du démon jusqu'à ce que le mode soit défini explicitement.

## Exemples

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```
