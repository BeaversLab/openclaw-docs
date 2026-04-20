---
title: "Fireworks"
summary: "Configuration de Fireworks (auth + sélection de modèle)"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) expose des modèles à poids ouverts et routés via une OpenAI compatible. API inclut un plugin provider Fireworks intégré.

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
  <Step title="Vérifier que le modèle est disponible">
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

| Réf modèle                                             | Nom                         | Entrée      | Contexte | Sortie max | Notes                                                |
| ------------------------------------------------------ | --------------------------- | ----------- | -------- | ---------- | ---------------------------------------------------- |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texte,image | 256,000  | 256,000    | Modèle de démarrage intégré par défaut sur Fireworks |

<Tip>Si Fireworks publie un modèle plus récent tel qu'une nouvelle version de Qwen ou Gemma, vous pouvez basculer directement vers celui-ci en utilisant son identifiant de modèle Fireworks sans attendre de mise à jour du catalogue intégré.</Tip>

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
    Si le Gateway s'exécute en dehors de votre shell interactif, assurez-vous que `FIREWORKS_API_KEY` est également disponible pour ce processus.

    <Warning>
    Une clé résidant uniquement dans `~/.profile` n'aidera pas un démon launchd/systemd à moins que cet environnement ne soit également importé. Définissez la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour vous assurer que le processus de la passerelle peut la lire.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/en/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Dépannage" href="/en/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
