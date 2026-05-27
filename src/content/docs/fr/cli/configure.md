---
summary: "Référence de la CLI pour `openclaw configure` (prompts de configuration interactive)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "Configurer"
---

# `openclaw configure`

Invite interactive pour des modifications ciblées d'une configuration existante : identifiants, appareils, valeurs par défaut de l'agent, passerelle, channels, plug-ins, compétences et vérifications de santé.

Utilisez `openclaw onboard` pour le processus complet guidé de première exécution, `openclaw setup` pour la configuration/espace de travail de base uniquement, et `openclaw channels add` lorsque vous avez uniquement besoin de la configuration du compte channel.

<Note>
La section **Modèle** comprend une multi-sélection pour la liste d'autorisation `agents.defaults.models` (ce qui s'affiche dans `/model` et le sélecteur de modèle). Les choix de configuration délimités par fournisseur fusionnent leurs modèles sélectionnés dans la liste d'autorisation existante au lieu de remplacer les fournisseurs non apparentés déjà présents dans la configuration.

La réexécution de l'authentification du fournisseur à partir de configure préserve un `agents.defaults.model.primary` existant, même lorsque l'étape d'authentification du fournisseur renvoie un correctif de configuration avec son propre modèle par défaut recommandé. Cela signifie que l'ajout ou la réauthentification de xAI, OpenRouter ou d'un autre fournisseur devrait rendre le nouveau modèle disponible sans prendre le pas sur votre modèle principal actuel. Utilisez `openclaw models auth login --provider <id> --set-default` ou `openclaw models set <model>` lorsque vous souhaitez intentionnellement modifier le modèle par défaut.

</Note>

Lorsque configure démarre à partir d'un choix d'authentification de fournisseur, les sélecteurs de modèle par défaut et de liste d'autorisation privilégient automatiquement ce fournisseur. Pour les fournisseurs associés tels que Volcengine et BytePlus, la même préférence correspond également à leurs variantes de plan de codage (`volcengine-plan/*`, `byteplus-plan/*`). Si le filtre de fournisseur préféré devait produire une liste vide, configure revient au catalogue non filtré au lieu d'afficher un sélecteur vide.

<Tip>`openclaw config` sans sous-commande ouvre le même assistant. Utilisez `openclaw config get|set|unset` pour les modifications non interactives.</Tip>

Pour la recherche web, `openclaw configure --section web` vous permet de choisir un fournisseur
et de configurer ses identifiants. Certains fournisseurs affichent également des invites de suivi spécifiques au fournisseur :

- **Grok** peut proposer une configuration facultative de `x_search`OAuthAPI avec le même profil OAuth xAI ou la même clé API et vous permettre de choisir un modèle `x_search`.
- **Kimi** peut demander la région de l'API Moonshot (MoonshotAPI`api.moonshot.ai` contre `api.moonshot.cn`) et le modèle de recherche web Kimi par défaut.

En relation :

- Référence de configuration du Gateway : [Configuration](Gateway/en/gateway/configuration)
- Config CLI : [Config](CLI/en/cli/config)

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

- L'assistant complet et les sections liées au Gateway demandent où le Gateway s'exécute et mettent à jour Gateway`gateway.mode`. Les filtres de section qui n'incluent pas `gateway`, `daemon` ou `health` vont directement à la configuration demandée.
- Après l'écriture de la configuration locale, configure installe les plugins téléchargeables sélectionnés lorsque le chemin d'installation choisi l'exige. La configuration du Gateway distant n'installe pas les packages de plugins locaux.
- Les services orientés channel (Slack/Discord/Matrix/Microsoft Teams) demandent les listes d'autorisation de channel/salle lors de la configuration. Vous pouvez entrer des noms ou des ID ; l'assistant résout les noms en ID lorsque cela est possible.
- Si vous exécutez l'étape d'installation du démon, l'authentification par jeton nécessite un jeton, et `gateway.auth.token` est géré par SecretRef, configure valide le SecretRef mais ne persiste pas les valeurs de jeton en clair résolues dans les métadonnées d'environnement du service de superviseur.
- Si l'authentification par token nécessite un token et que le SecretRef du token configuré est non résolu, configure bloque l'installation du démon avec des conseils de correction actionnables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et `gateway.auth.mode` est non défini, configure bloque l'installation du démon jusqu'à ce que le mode soit défini explicitement.

## Exemples

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## En relation

- [Référence CLI](CLI/en/cli)
- [Configuration](/fr/gateway/configuration)
