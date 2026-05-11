---
summary: "Référence de la CLI pour `openclaw configure` (prompts de configuration interactive)"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "Configurer"
---

# `openclaw configure`

Invite interactive pour configurer les identifiants, les appareils et les valeurs par défaut de l'agent.

<Note>
The **Model** section includes a multi-select for the `agents.defaults.models` allowlist (what shows up in `/model` and the model picker). Provider-scoped setup choices merge their selected models into the existing allowlist instead of replacing unrelated providers already in the config. Re-running provider auth from configure preserves an existing `agents.defaults.model.primary`. Use `openclaw models auth login --provider <id> --set-default` or `openclaw models set <model>` when you intentionally want to change the default model.
</Note>

Lorsque configure démarre depuis un choix d'authentification de fournisseur, les sélecteurs de modèle par défaut et de liste d'autorisation privilégient automatiquement ce fournisseur. Pour les fournisseurs couplés tels que Volcengine et BytePlus, la même préférence correspond également à leurs variantes de plan de codage (`volcengine-plan/*`, `byteplus-plan/*`). Si le filtre de fournisseur préféré devait produire une liste vide, configure revient au catalogue non filtré au lieu d'afficher un sélecteur vide.

<Tip>`openclaw config` sans sous-commande ouvre le même assistant. Utilisez `openclaw config get|set|unset` pour les modifications non interactives.</Tip>

Pour la recherche Web, `openclaw configure --section web` vous permet de choisir un fournisseur
et de configurer ses identifiants. Certains fournisseurs affichent également des
invite de suivi spécifiques au fournisseur :

- **Grok** peut proposer une configuration `x_search` facultative avec le même `XAI_API_KEY` et
  vous permettre de choisir un modèle `x_search`.
- **Kimi** peut demander la région de l'API Moonshot (`api.moonshot.ai` vs
  `api.moonshot.cn`) et le modèle de recherche Web Kimi par défaut.

Connexes :

- Référence de configuration Gateway : [Configuration](/fr/gateway/configuration)
- CLI Config : [Config](/fr/cli/config)

## Options

- `--section <section>` : filtre de section répétitif

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

- Le choix de l'emplacement d'exécution du Gateway met toujours à jour `gateway.mode`. Vous pouvez sélectionner « Continue » sans autres sections si c'est tout ce dont vous avez besoin.
- Les services orientés canal (Slack/Discord/Matrix/Microsoft Teams) demandent les listes d'autorisation de canal/salle lors de la configuration. Vous pouvez saisir des noms ou des ID ; l'assistant résout les noms en ID lorsque cela est possible.
- Si vous exécutez l'étape d'installation du démon, l'authentification par jeton nécessite un jeton, et si `gateway.auth.token` est géré par SecretRef, configure valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service de supervision.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré est non résolu, configure bloque l'installation du démon avec des conseils de remédiation actionnables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, configure bloque l'installation du démon jusqu'à ce que le mode soit défini explicitement.

## Exemples

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## Connexes

- [Référence CLI](/fr/cli)
- [Configuration](/fr/gateway/configuration)
