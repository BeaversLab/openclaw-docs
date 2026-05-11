---
summary: "Configuration de Tencent Cloud TokenHub pour la préversion Hy3"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

# Tencent Cloud TokenHub

Tencent Cloud est fourni en tant que **plugin de fournisseur groupé** dans OpenClaw. Il donne accès à la préversion Tencent Hy3 via le point de terminaison TokenHub (`tencent-tokenhub`).

Le provider utilise une OpenAI compatible API.

| Propriété         | Valeur                                      |
| ----------------- | ------------------------------------------- |
| Fournisseur       | `tencent-tokenhub`                          |
| Modèle par défaut | `tencent-tokenhub/hy3-preview`              |
| Auth              | `TOKENHUB_API_KEY`                          |
| API               | Complétions de chat compatibles avec OpenAI |
| URL de base       | `https://tokenhub.tencentmaas.com/v1`       |
| URL globale       | `https://tokenhub-intl.tencentmaas.com/v1`  |

## Démarrage rapide

<Steps>
  <Step title="Créer une clé d'API TokenHub">Créez une clé d'API dans Tencent Cloud TokenHub. Si vous choisissez une étendue d'accès limitée pour la clé, incluez **Hy3 preview** dans les modèles autorisés.</Step>
  <Step title="Exécuter l'intégration (onboarding)">```bash openclaw onboard --auth-choice tokenhub-api-key ```</Step>
  <Step title="Vérifier le modèle">```bash openclaw models list --provider tencent-tokenhub ```</Step>
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

| Réf. de modèle                 | Nom                    | Entrée | Contexte | Sortie max. | Remarques                      |
| ------------------------------ | ---------------------- | ------ | -------- | ----------- | ------------------------------ |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub) | text   | 256 000  | 64 000      | Par défaut ; avec raisonnement |

Hy3 preview est le grand modèle de langage MoE de Tencent Hunyuan pour le raisonnement, le suivi d'instructions à long contexte, le code et les flux de travail d'agents. Les exemples compatibles avec OpenAI de Tencent utilisent `hy3-preview` comme identifiant de modèle et prennent en charge l'appel d'outil standard pour les complétions de chat ainsi que `reasoning_effort`.

<Tip>L'identifiant de modèle est `hy3-preview`. Ne le confondez pas avec les modèles `HY-3D-*` de Tencent, qui sont des API de génération 3D et ne constituent pas le modèle de chat OpenClaw configuré par ce fournisseur.</Tip>

## Remplacement du point de terminaison

Par défaut, OpenClaw utilise le point de terminaison `https://tokenhub.tencentmaas.com/v1` de Tencent Cloud. Tencent documente également un point de terminaison TokenHub international :

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

Ne remplacez le point de terminaison que lorsque votre compte ou votre région TokenHub l'exige.

## Notes

- Les références de modèles TokenHub utilisent `tencent-tokenhub/<modelId>`.
- Le catalogue groupé inclut actuellement `hy3-preview`.
- Le plugin marque la préversion Hy3 comme compatible avec le raisonnement et l'utilisation en continu (streaming).
- Le plugin est fourni avec des métadonnées de tarification hiérarchique pour Hy3, de sorte que les estimations de coût sont renseignées sans avoir à remplacer manuellement la tarification.
- Remplacez la tarification, le contexte ou les métadonnées du point de terminaison dans `models.providers` uniquement si nécessaire.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `TOKENHUB_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Documentation connexe

- [Configuration d'OpenClaw](/fr/gateway/configuration)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [Page produit Tencent TokenHub](https://cloud.tencent.com/product/tokenhub)
- [Génération de texte Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130079)
- [Configuration Cline de Tencent TokenHub pour la préversion Hy3](https://cloud.tencent.com/document/product/1823/130932)
- [Fiche du modèle de préversion Tencent Hy3](https://huggingface.co/tencent/Hy3-preview)
