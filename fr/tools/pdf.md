---
title: "Outil PDF"
summary: "Analysez un ou plusieurs documents PDF avec la prise en charge native du fournisseur et le repli sur l'extraction"
read_when:
  - Vous souhaitez analyser des PDF à partir d'agents
  - Vous avez besoin des paramètres et des limites exacts de l'outil pdf
  - Vous déboguez le mode PDF natif par rapport au repli sur l'extraction
---

# Outil PDF

`pdf` analyse un ou plusieurs documents PDF et renvoie le texte.

Comportement rapide :

- Mode fournisseur natif pour les fournisseurs de modèles Anthropic et Google.
- Mode de repli sur l'extraction pour les autres fournisseurs (extraction du texte d'abord, puis des images de pages si nécessaire).
- Prend en charge une entrée unique (`pdf`) ou multiple (`pdfs`), maximum 10 PDF par appel.

## Disponibilité

L'outil n'est enregistré que lorsque OpenClaw peut résoudre une configuration de modèle compatible PDF pour l'agent :

1. `agents.defaults.pdfModel`
2. repli sur `agents.defaults.imageModel`
3. repli sur les meilleures valeurs par défaut du fournisseur en fonction de l'authentification disponible

Si aucun modèle utilisable ne peut être résolu, l'outil `pdf` n'est pas exposé.

## Référence d'entrée

- `pdf` (`string`) : un chemin ou une URL PDF
- `pdfs` (`string[]`) : plusieurs chemins ou URL PDF, jusqu'à 10 au total
- `prompt` (`string`) : invite d'analyse, défaut `Analyze this PDF document.`
- `pages` (`string`) : filtre de page comme `1-5` ou `1,3,7-9`
- `model` (`string`) : substitution facultative de modèle (`provider/model`)
- `maxBytesMb` (`number`) : limite de taille par PDF en Mo

Notes d'entrée :

- `pdf` et `pdfs` sont fusionnés et dédupliqués avant le chargement.
- Si aucune entrée PDF n'est fournie, l'outil génère une erreur.
- `pages` est analysé comme des numéros de page commençant à 1, dédupliqués, triés et limités au nombre maximal de pages configuré.
- `maxBytesMb` par défaut est `agents.defaults.pdfMaxBytesMb` ou `10`.

## Références PDF prises en charge

- chemin de fichier local (y compris l'expansion `~`)
- `file://` URL
- `http://` et `https://` URL

Notes de référence :

- Les autres schémas d'URI (par exemple `ftp://`) sont rejetés avec `unsupported_pdf_reference`.
- En mode bac à sable, les URL `http(s)` distantes sont rejetées.
- Lorsque la stratégie de fichiers d'espace de travail uniquement est activée, les chemins de fichiers locaux situés en dehors des racines autorisées sont rejetés.

## Modes d'exécution

### Mode provider natif

Le mode natif est utilisé pour les providers `anthropic` et `google`.
L'outil envoie les octets PDF bruts directement aux API des providers.

Limites du mode natif :

- `pages` n'est pas pris en charge. S'il est défini, l'outil renvoie une erreur.

### Mode de repli par extraction

Le mode de repli est utilisé pour les providers non natifs.

Flux :

1. Extraire le texte des pages sélectionnées (jusqu'à `agents.defaults.pdfMaxPages`, `20` par défaut).
2. Si la longueur du texte extrait est inférieure à `200` caractères, restituez les pages sélectionnées sous forme d'images PNG et incluez-les.
3. Envoyer le contenu extrait ainsi que l'invite au modèle sélectionné.

Détails du repli :

- L'extraction d'images de page utilise un budget de pixels de `4,000,000`.
- Si le modèle cible ne prend pas en charge l'entrée d'image et qu'il n'y a pas de texte extractible, l'outil génère une erreur.
- Le repli par extraction nécessite `pdfjs-dist` (et `@napi-rs/canvas` pour le rendu d'image).

## Config

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

Voir [Référence de configuration](/fr/gateway/configuration-reference) pour plus de détails sur les champs.

## Détails de la sortie

L'outil renvoie le texte dans `content[0].text` et les métadonnées structurées dans `details`.

Champs `details` courants :

- `model` : référence de modèle résolue (`provider/model`)
- `native` : `true` pour le mode provider natif, `false` pour le repli
- `attempts` : tentatives de repli ayant échoué avant le succès

Champs de chemin :

- entrée PDF unique : `details.pdf`
- entrées PDF multiples : `details.pdfs[]` avec `pdf` entrées
- sandbox path rewrite metadata (le cas échéant) : `rewrittenFrom`

## Comportement en cas d'erreur

- Entrée PDF manquante : renvoie `pdf required: provide a path or URL to a PDF document`
- Trop de PDF : renvoie une erreur structurée dans `details.error = "too_many_pdfs"`
- Schéma de référence non pris en charge : renvoie `details.error = "unsupported_pdf_reference"`
- Mode natif avec `pages` : renvoie une erreur claire `pages is not supported with native PDF providers`

## Exemples

PDF unique :

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

PDF multiples :

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

Modèle de repli avec filtrage par page :

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

import en from "/components/footer/en.mdx";

<en />
