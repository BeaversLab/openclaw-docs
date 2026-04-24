---
title: "Fireworks"
summary: "Configuration de Fireworks (auth + sélection de modèle)"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) expose des modèles à poids ouverts et acheminés via une API compatible OpenAI. API inclut un plugin de fournisseur Fireworks intégré.

| Propriété         | Valeur                                                 |
| ----------------- | ------------------------------------------------------ |
| Provider          | `fireworks`                                            |
| Auth              | `FIREWORKS_API_KEY`                                    |
| API               | Chat/complétions compatibles avec OpenAI               |
| URL de base       | `https://api.fireworks.ai/inference/v1`                |
| Modèle par défaut | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## Getting started

<Steps>
  <Step title="Configurer l'auth Fireworks via l'intégration">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    Cela stocke votre clé Fireworks dans la configuration d'OpenClaw et définit le modèle de démarrage Fire Pass par défaut.

  </Step>
  <Step title="Vérifiez que le modèle est disponible">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## Exemple non interactif

Pour les configurations scriptées ou CI, passez toutes les valeurs en ligne de commande :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catalogue intégré

| Réf modèle                                             | Nom                         | Entrée      | Contexte | Sortie max | Notes                                                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------- | ----------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | texte,image | 262 144  | 262 144    | Dernier modèle Kimi sur Fireworks. La réflexion est désactivée pour les requêtes Fireworks K2.6 ; acheminez directement via Moonshot si vous avez besoin de la sortie de réflexion Kimi. |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | text,image  | 256 000  | 256 000    | Modèle de démarrage par défaut fourni avec Fireworks                                                                                                                                     |

<Tip>Si Fireworks publie un modèle plus récent tel qu'une nouvelle version de Qwen ou Gemma, vous pouvez directement basculer vers celui-ci en utilisant son identifiant de modèle Fireworks sans attendre de mise à jour du catalogue intégré.</Tip>

## Identifiants de modèle Fireworks personnalisés

OpenClaw accepte également les identifiants de modèle Fireworks dynamiques. Utilisez l'identifiant exact du modèle ou du routeur affiché par Fireworks et préfixez-le avec `fireworks/`.

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Fonctionnement du préfixage des identifiants de modèle">
    Chaque référence de modèle Fireworks dans OpenClaw commence par `fireworks/` suivi de l'identifiant exact ou du chemin du routeur de la plateforme Fireworks. Par exemple :

    - Modèle routeur : `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Modèle direct : `fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw supprime le préfixe `fireworks/` lors de la construction de la requête API et envoie le chemin restant au point de terminaison Fireworks.

  </Accordion>

  <Accordion title="Note sur l'environnement">
    Si la Gateway s'exécute en dehors de votre shell interactif, assurez-vous que `FIREWORKS_API_KEY` est également disponible pour ce processus.

    <Warning>
    Une clé présente uniquement dans `~/.profile` ne sera pas utile pour un démon launchd/systemd, sauf si cet environnement est également importé. Définissez la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour garantir que le processus de la passerelle puisse la lire.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
