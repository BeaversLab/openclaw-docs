---
summary: "Configuration de Tencent Cloud TokenHub pour la préversion Hy3"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

Tencent Cloud est fourni en tant que plugin de fournisseur groupé dans OpenClaw. Il donne accès à la préversion Tencent Hy3 via le point de terminaison TokenHub (`tencent-tokenhub`) à l'aide d'une OpenAI compatible API.

| Propriété                                   | Valeur                                                 |
| ------------------------------------------- | ------------------------------------------------------ |
| ID du fournisseur                           | `tencent-tokenhub`                                     |
| Plugin                                      | groupé, `enabledByDefault: true`                       |
| Variable d'environnement d'authentification | `TOKENHUB_API_KEY`                                     |
| Indicateur d'intégration                    | `--auth-choice tokenhub-api-key`                       |
| Indicateur direct CLI                       | `--tokenhub-api-key <key>`                             |
| API                                         | Compatible OpenAI (`openai-completions`)               |
| URL de base par défaut                      | `https://tokenhub.tencentmaas.com/v1`                  |
| URL de base globale                         | `https://tokenhub-intl.tencentmaas.com/v1` (remplacer) |
| Modèle par défaut                           | `tencent-tokenhub/hy3-preview`                         |

## Quick start

<Steps>
  <Step title="Créer une clé API TokenHub">
    Créez une clé API dans Tencent Cloud TokenHub. Si vous choisissez une étendue d'accès limitée pour la clé, incluez **Hy3 preview** dans les modèles autorisés.
  </Step>
  <Step title="Exécuter l'intégration">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="Verify the model">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
</Steps>

## Configuration non interactive

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catalogue intégré

| Référence du modèle            | Nom                       | Entrée | Contexte | Sortie max | Notes                                 |
| ------------------------------ | ------------------------- | ------ | -------- | ---------- | ------------------------------------- |
| `tencent-tokenhub/hy3-preview` | Préversion Hy3 (TokenHub) | texte  | 256,000  | 64,000     | Par défaut ; avec raisonnement activé |

Hy3 preview est le grand modèle de langage MoE de Tencent Hunyuan pour le raisonnement, le suivi d'instructions à long contexte, le code et les flux de travail d'agents. Les exemples compatibles OpenAI de Tencent utilisent `hy3-preview` comme ID de modèle et prennent en charge l'appel d'outil standard de complétions de chat ainsi que `reasoning_effort`.

<Tip>L'ID du modèle est `hy3-preview`. Ne le confondez pas avec les modèles `HY-3D-*` de Tencent, qui sont des API de génération 3D et ne constituent pas le modèle de chat OpenClaw configuré par ce fournisseur.</Tip>

## Tarification échelonnée

Le catalogue inclus fournit des métadonnées de coûts échelonnés qui évoluent en fonction de la longueur de la fenêtre d'entrée, de sorte que les estimations de coûts sont remplies sans ajustement manuel.

| Plage de tokens d'entrée | Taux d'entrée | Taux de sortie | Lecture du cache |
| ------------------------ | ------------- | -------------- | ---------------- |
| 0 - 16 000               | 0,176         | 0,587          | 0,059            |
| 16 000 - 32 000          | 0,235         | 0,939          | 0,088            |
| 32 000+                  | 0,293         | 1,173          | 0,117            |

Les tarifs sont par million de tokens en USD, tels qu'annoncés par Tencent. Remplacez la tarification sous `models.providers.tencent-tokenhub` uniquement lorsque vous avez besoin d'une autre surface.

## Configuration avancée

<AccordionGroup>
  <Accordion title="Remplacement du point de terminaison">
    OpenClaw utilise par défaut le point de terminaison `https://tokenhub.tencentmaas.com/v1` de Tencent Cloud. Tencent documente également un point de terminaison TokenHub international :

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    Ne remplacez le point de terminaison que si votre compte ou votre région TokenHub l'exige.

  </Accordion>

  <Accordion title="Disponibilité de l'environnement pour le démon">
    Si le Gateway s'exécute en tant que service géré (launchd, systemd, Docker), `TOKENHUB_API_KEY` doit être visible pour ce processus. Définissez-le dans `~/.openclaw/.env` ou via `env.shellEnv` afin que les environnements d'exécution launchd, systemd ou Docker puissent le lire.

    <Warning>
      Les clés définies uniquement dans `~/.profile` ne sont pas visibles pour les processus de passerelle gérés. Utilisez le fichier d'environnement ou la couture de configuration (config seam) pour une disponibilité persistante.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration" icon="gear">
    Schéma de configuration complet incluant les paramètres du fournisseur.
  </Card>
  <Card title="Tencent TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    Page du produit TokenHub de Tencent Cloud.
  </Card>
  <Card title="Carte de modèle de prévisualisation Hy3" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    Détails et benchmarks de la prévisualisation Tencent Hunyuan Hy3.
  </Card>
</CardGroup>
