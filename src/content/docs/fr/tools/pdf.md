---
summary: "Analyser un ou plusieurs documents PDF avec la prise en charge native du fournisseur et le repli sur l'extraction"
title: "outil PDF"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

`pdf` analyse un ou plusieurs documents PDF et renvoie le texte.

Comportement rapide :

- Mode de provider natif pour les providers de modèle Anthropic et Google.
- Mode de repli sur l'extraction pour les autres providers (extraire d'abord le texte, puis les images de pages si nécessaire).
- Prend en charge une entrée unique (`pdf`) ou multiple (`pdfs`), 10 PDF maximum par appel.

## Disponibilité

L'outil n'est enregistré que lorsque OpenClaw peut résoudre une configuration de modèle compatible PDF pour l'agent :

1. `agents.defaults.pdfModel`
2. repli sur `agents.defaults.imageModel`
3. replier sur le modèle de session/défaut résolu de l'agent
4. si les providers natifs-PDF sont pris en charge par l'authentification, les privilégier par rapport aux candidats de repli d'images génériques

Si aucun modèle utilisable ne peut être résolu, l'outil `pdf` n'est pas exposé.

Notes de disponibilité :

- La chaîne de repli est consciente de l'authentification. Un `provider/model` configuré ne compte que si
  OpenClaw peut réellement authentifier ce fournisseur pour l'agent.
- Les providers PDF natifs sont actuellement **Anthropic** et **Google**.
- Si le provider de session/défaut résolu possède déjà un modèle de vision/PDF
  configuré, l'outil PDF réutilise celui-ci avant de se replier sur d'autres providers
  pris en charge par l'authentification.

## Référence d'entrée

<ParamField path="pdf" type="string">
  Un chemin ou une URL de PDF.
</ParamField>

<ParamField path="pdfs" type="string[]">
  Plusieurs chemins ou URL de PDF, jusqu'à 10 au total.
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
  Invite d'analyse.
</ParamField>

<ParamField path="pages" type="string">
  Filtre de page comme `1-5` ou `1,3,7-9`.
</ParamField>

<ParamField path="password" type="string">
  Mot de passe pour les PDF chiffrés en mode de repli sur l'extraction.
</ParamField>

<ParamField path="model" type="string">
  Remplacement facultatif du modèle sous forme `provider/model`.
</ParamField>

<ParamField path="maxBytesMb" type="number">
  Limite de taille par PDF en Mo. La valeur par défaut est `agents.defaults.pdfMaxBytesMb` ou `10`.
</ParamField>

Notes d'entrée :

- `pdf` et `pdfs` sont fusionnés et dédupliqués avant le chargement.
- Si aucune entrée PDF n'est fournie, l'outil renvoie une erreur.
- `pages` est analysé comme des numéros de page commençant à 1, dédupliqués, triés et limités au nombre maximum de pages configuré.
- `password` s'applique à chaque PDF de la requête et n'est utilisé que par le mode de repli sur l'extraction.
- `maxBytesMb` est défini par défaut sur `agents.defaults.pdfMaxBytesMb` ou `10`.

## Références PDF prises en charge

- chemin de fichier local (y compris l'expansion `~`)
- URL `file://`
- URL `http://` et `https://`
- références entrantes gérées par OpenClaw telles que `media://inbound/<id>`

Notes sur les références :

- D'autres schémas d'URI (par exemple `ftp://`) sont rejetés avec `unsupported_pdf_reference`.
- En mode bac à sable, les URL distantes `http(s)` sont rejetées.
- Lorsque la stratégie de fichiers « espace de travail uniquement » est activée, les chemins de fichiers locaux situés en dehors des racines autorisées sont rejetés.
- Les références entrantes gérées et les chemins relus sous le stockage de média entrant de OpenClaw sont autorisés avec la stratégie de fichiers « espace de travail uniquement ».

## Modes d'exécution

### Mode fournisseur natif

Le mode natif est utilisé pour les fournisseurs `anthropic` et `google`.
L'outil envoie les octets PDF bruts directement aux API des fournisseurs.

Limites du mode natif :

- `pages` n'est pas pris en charge. S'il est défini, l'outil renvoie une erreur.
- `password` n'est pas pris en charge. Utilisez un modèle non natif pour analyser les PDF chiffrés.
- L'entrée PDF multiple est prise en charge ; chaque PDF est envoyé en tant que bloc de document natif /
  partie PDF en ligne avant l'invite.

### Mode de repli par extraction

Le mode de repli est utilisé pour les fournisseurs non natifs.

Flux :

1. Extraire le texte des pages sélectionnées (jusqu'à `agents.defaults.pdfMaxPages`, défaut `20`).
2. Si la longueur du texte extrait est inférieure à `200` caractères, générer des images PNG des pages sélectionnées et les inclure.
3. Envoyer le contenu extrait ainsi que l'invite au modèle sélectionné.

Détails du repli :

- L'extraction d'image de page utilise un budget de pixels de `4,000,000`.
- Les PDF chiffrés peuvent être ouverts avec le paramètre de niveau supérieur `password`.
- Si le modèle cible ne prend pas en charge l'entrée d'image et qu'il n'y a pas de texte extractible, l'outil génère une erreur.
- Si l'extraction de texte réussit mais que l'extraction d'image nécessiterait la vision sur un
  modèle texte uniquement, OpenClaw supprime les images rendues et continue avec le
  texte extrait.
- Le mode de repli d'extraction utilise le plugin intégré `document-extract`. Le plugin possède
  `clawpdf`, qui fournit l'extraction de texte et le rendu d'images via PDFium
  WebAssembly.

## Config

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

Voir [Configuration Reference](/fr/gateway/configuration-reference) pour plus de détails sur les champs.

## Détails de la sortie

L'outil renvoie le texte dans `content[0].text` et des métadonnées structurées dans `details`.

Champs `details` courants :

- `model` : référence de modèle résolue (`provider/model`)
- `native` : `true` pour le mode de fournisseur natif, `false` pour le repli
- `attempts` : tentatives de repli ayant échoué avant le succès

Champs de chemin :

- entrée PDF unique : `details.pdf`
- entrées PDF multiples : `details.pdfs[]` avec `pdf` entrées
- métadonnées de réécriture de chemin bac à sable (si applicable) : `rewrittenFrom`

## Comportement en cas d'erreur

- Entrée PDF manquante : génère `pdf required: provide a path or URL to a PDF document`
- Trop de PDF : renvoie une erreur structurée dans `details.error = "too_many_pdfs"`
- Schéma de référence non pris en charge : renvoie `details.error = "unsupported_pdf_reference"`
- Mode natif avec `pages` : génère une erreur `pages is not supported with native PDF providers` claire

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

Modèle de repli filtré par page :

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

PDF chiffré avec repli d'extraction :

```json
{
  "pdf": "/tmp/locked.pdf",
  "password": "example-password",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Summarize this contract"
}
```

## Connexes

- [Tools Overview](/fr/tools) - tous les outils d'agent disponibles
- [Configuration Reference](/fr/gateway/config-agents#agent-defaults) - config pdfMaxBytesMb et pdfMaxPages
