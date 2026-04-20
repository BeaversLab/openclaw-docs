---
summary: "Connectez-vous à GitHub Copilot depuis OpenClaw à l'aide du flux d'appareil"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

GitHub Copilot est l'assistant de codage IA de GitHub. Il fournit l'accès aux modèles Copilot pour votre compte et votre plan GitHub. OpenClaw peut utiliser Copilot comme fournisseur de modèles de deux manières différentes.

## Deux façons d'utiliser Copilot dans OpenClaw

<Tabs>
  <Tab title="Fournisseur intégré (github-copilot)">
    Utilisez le flux de connexion natif par appareil pour obtenir un jeton GitHub, puis échangez-le contre des jetons de l'API Copilot lors de l'exécution d'OpenClaw. Il s'agit du chemin **par défaut** et le plus simple car il ne nécessite pas VS Code.

    <Steps>
      <Step title="Exécuter la commande de connexion">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Il vous sera demandé de visiter une URL et d'entrer un code à usage unique. Gardez le terminal ouvert jusqu'à ce que l'opération soit terminée.
      </Step>
      <Step title="Définir un modèle par défaut">
        ```bash
        openclaw models set github-copilot/gpt-4o
        ```

        Ou dans la configuration :

        ```json5
        {
          agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Plugin Copilot Proxy (copilot-proxy)">
    Utilisez l'extension VS Code **Copilot Proxy** comme pont local. OpenClaw communique avec le point de terminaison `/v1` du proxy et utilise la liste de modèles que vous y configurez.

    <Note>
    Choisissez cette option lorsque vous exécutez déjà Copilot Proxy dans VS Code ou si vous devez acheminer le trafic via celui-ci. Vous devez activer le plugin et laisser l'extension VS Code en cours d'exécution.
    </Note>

  </Tab>
</Tabs>

## Indicateurs optionnels

| Indicateur      | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `--yes`         | Ignorer l'invite de confirmation                                       |
| `--set-default` | Appliquer également le modèle par défaut recommandé par le fournisseur |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

<AccordionGroup>
  <Accordion title="TTY interactif requis">
    Le flux de connexion par appareil nécessite un TTY interactif. Exécutez-le directement dans un terminal, et non dans un script non interactif ou un pipeline CI.
  </Accordion>

<Accordion title="La disponibilité des modèles dépend de votre plan">La disponibilité des modèles Copilot dépend de votre plan GitHub. Si un modèle est rejeté, essayez un autre ID (par exemple `github-copilot/gpt-4.1`).</Accordion>

<Accordion title="Sélection du transport">Les ID de modèle Claude utilisent automatiquement le transport Messages Anthropic. Les modèles GPT, o-series et Gemini conservent le transport Réponses OpenAI. OpenClaw sélectionne le transport correct en fonction de la référence du modèle.</Accordion>

  <Accordion title="Ordre de résolution des variables d'environnement">
    OpenClaw résout l'authentification Copilot à partir des variables d'environnement dans l'ordre de priorité
    suivant :

    | Priorité | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Priorité la plus élevée, spécifique à Copilot |
    | 2        | `GH_TOKEN`            | Jeton GitHub CLI (alternative)      |
    | 3        | `GITHUB_TOKEN`        | Jeton GitHub standard (le plus bas)   |

    Lorsque plusieurs variables sont définies, OpenClaw utilise celle ayant la priorité la plus élevée.
    Le flux de connexion par appareil (`openclaw models auth login-github-copilot`) stocke
    son jeton dans le magasin de profils d'authentification et prend la priorité sur toutes les variables d'environnement.

  </Accordion>

  <Accordion title="Stockage du jeton">
    La connexion stocke un jeton GitHub dans le magasin de profils d'authentification et l'échange
    contre un jeton API Copilot lorsqu'OpenClaw s'exécute. Vous n'avez pas besoin de gérer le
    jeton manuellement.
  </Accordion>
</AccordionGroup>

<Warning>Nécessite un TTY interactif. Exécutez la commande de connexion directement dans un terminal, et non à l'intérieur d'un script sans tête ou d'un travail CI.</Warning>

## Intégrations pour la recherche mémoire

GitHub Copilot peut également servir de fournisseur d'intégrations pour
la [recherche mémoire](/en/concepts/memory-search). Si vous avez un abonnement Copilot et
que vous êtes connecté, OpenClaw peut l'utiliser pour les intégrations sans clé API séparée.

### Détection automatique

Lorsque `memorySearch.provider` est `"auto"` (par défaut), GitHub Copilot est essayé
avec la priorité 15 -- après les intégrations locales mais avant OpenAI et les autres fournisseurs
payants. Si un jeton GitHub est disponible, OpenClaw découvre les modèles
d'intégration disponibles à partir de l'API Copilot et choisit automatiquement le meilleur.

### Configuration explicite

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "github-copilot",
        // Optional: override the auto-discovered model
        model: "text-embedding-3-small",
      },
    },
  },
}
```

### Fonctionnement

1. OpenClaw résout votre jeton GitHub (à partir des variables d'environnement ou du profil d'authentification).
2. L'échange contre un jeton API Copilot de courte durée.
3. Interroge le point de terminaison `/models` de Copilot pour découvrir les modèles d'intégration disponibles.
4. Choisit le meilleur modèle (préfère `text-embedding-3-small`).
5. Envoie les demandes d'intégration au point de terminaison `/embeddings` de Copilot.

La disponibilité des modèles dépend de votre plan GitHub. Si aucun modèle d'intégration n'est disponible, OpenClaw ignore Copilot et essaie le fournisseur suivant.

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="OAuth et auth" href="/en/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
