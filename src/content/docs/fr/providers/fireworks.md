---
summary: "Configuration de Fireworks (auth + sélection du modèle)"
title: "Fireworks"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
  - You are debugging Kimi thinking-off behavior on Fireworks
---

[Fireworks](https://fireworks.ai) expose des modèles à poids ouverts et routés via une API compatible OpenAIAPI. OpenClaw inclut un plugin provider Fireworks intégré qui est livré avec deux modèles Kimi précatalogués et accepte n'importe quel modèle Fireworks ou identifiant de routeur au moment de l'exécution.

| Propriété                | Valeur                                                 |
| ------------------------ | ------------------------------------------------------ |
| ID du provider           | `fireworks` (alias : `fireworks-ai`)                   |
| Plugin                   | intégré, `enabledByDefault: true`                      |
| Variable d'env d'auth    | `FIREWORKS_API_KEY`                                    |
| Indicateur d'intégration | `--auth-choice fireworks-api-key`                      |
| Indicateur direct de CLI | `--fireworks-api-key <key>`                            |
| API                      | Compatible OpenAI (`openai-completions`)               |
| URL de base              | `https://api.fireworks.ai/inference/v1`                |
| Modèle par défaut        | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |
| Alias par défaut         | `Kimi K2.5 Turbo`                                      |

## Getting started

<Steps>
  <Step title="Définir la clé d'API Fireworks">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice fireworks-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY"
```

```bash Env only
export FIREWORKS_API_KEY=fw-...
```

    </CodeGroup>

    L'intégration stocke la clé pour le provider `fireworks` dans vos profils d'authentification et définit le routeur Kimi K2.5 Turbo **Fire Pass** comme modèle par défaut.

  </Step>
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider fireworks
    ```

    La liste doit inclure `Kimi K2.6` et `Kimi K2.5 Turbo (Fire Pass)`. Si `FIREWORKS_API_KEY` n'est pas résolu, `openclaw models status --json` signale l'identifiant manquant sous `auth.unusableProfiles`.

  </Step>
</Steps>

## Configuration non interactive

Pour les installations scriptées ou CI, passez tout sur la ligne de commande :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catalogue intégré

| Réf modèle                                             | Nom                         | Entrée        | Contexte | Sortie max | Réflexion                    |
| ------------------------------------------------------ | --------------------------- | ------------- | -------- | ---------- | ---------------------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | texte + image | 262,144  | 262,144    | Forcé désactivé              |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texte + image | 256,000  | 256,000    | Forcé désactivé (par défaut) |

<Note>OpenClaw fixe tous les modèles Kimi Fireworks sur OpenClaw`thinking: off`Moonshot car Fireworks rejette les paramètres de réflexion Kimi en production. Le routage du même modèle via [Moonshot](/fr/providers/moonshot) préserve directement la sortie de raisonnement Kimi. Voir [modes de réflexion](/fr/tools/thinking) pour changer de fournisseur.</Note>

## Identifiants de modèles Fireworks personnalisés

OpenClaw accepte n'importe quel modèle Fireworks ou identifiant de routeur au moment de l'exécution. Utilisez l'identifiant exact affiché par Fireworks et préfixez-le avec OpenClaw`fireworks/`OpenAIAPI. La résolution dynamique clone le modèle Fire Pass (entrée texte + image, API compatible OpenAI, coût zéro par défaut) et désactive automatiquement la réflexion lorsque l'identifiant correspond au modèle Kimi.

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/models/<your-model-id>",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Fonctionnement du préfixage des identifiants de modèle"OpenClaw>
    Chaque référence de modèle Fireworks dans OpenClaw commence par `fireworks/` suivi de l'identifiant exact ou du chemin du routeur de la plateforme Fireworks. Par exemple :

    - Modèle de routeur : `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Modèle direct : `fireworks/accounts/fireworks/models/<model-name>`OpenClaw

    OpenClaw supprime le préfixe `fireworks/`APIOpenAI lors de la construction de la requête API et envoie le chemin restant au point de terminaison Fireworks en tant que champ `model` compatible OpenAI.

  </Accordion>

  <Accordion title="Pourquoi la réflexion est forcée à désactivée pour Kimi">
    Fireworks K2.6 renvoie une erreur 400 si la requête contient des paramètres `reasoning_*` alors que Kimi prend en charge la réflexion via l'Moonshot propre de API. La stratégie groupée (`extensions/fireworks/thinking-policy.ts`) n'annonce que le niveau de réflexion `off` pour les identifiants de model Kimi, de sorte que les commutateurs manuels `/think` et les surfaces de stratégie du provider restent alignés avec le contrat d'exécution.

    Pour utiliser le raisonnement Kimi de bout en bout, configurez le provider [Moonshot](/fr/providers/moonshot) et acheminez le même model via celui-ci.

  </Accordion>

  <Accordion title="Disponibilité de l'environnement pour le démon">
    Si le Gateway s'exécute en tant que service géré (launchd, systemd, Docker), la clé Fireworks doit être visible pour ce processus — et pas seulement pour votre shell interactif.

    <Warning>
      Une clé présente uniquement dans `~/.profile` n'aidera pas un démon launchd ou systemd à moins que cet environnement ne soit également importé là-bas. Définissez la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour la rendre lisible depuis le processus du passerelle.
    </Warning>

    Sur macOS, `openclaw gateway install` relie déjà `~/.openclaw/.env` au fichier d'environnement du LaunchAgent. Réexécutez l'installation (ou `openclaw doctor --fix`) après avoir fait tourner la clé.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Providers de models" href="/fr/concepts/model-providers" icon="layers">
    Choisir les providers, les références de models et le comportement de basculement.
  </Card>
  <Card title="Modes de réflexion" href="/fr/tools/thinking" icon="brain">
    Niveaux `/think`, stratégies de provider et acheminement des models capables de raisonnement.
  </Card>
  <Card title="MoonshotMoonshot" href="/fr/providers/moonshot" icon="moon">
    Exécuter Kimi avec une sortie de réflexion native via l'API propre de MoonshotAPI.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    FAQ et dépannage général.
  </Card>
</CardGroup>
