---
title: "Outil PDF"
summary: "Analyser un ou plusieurs documents PDF avec la prise en charge native du fournisseur et le repli sur l'extraction"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

# Outil PDF

`pdf` analyse un ou plusieurs documents PDF et renvoie le texte.

Comportement rapide :

- Mode de fournisseur natif pour les fournisseurs de modèles Anthropic et Google.
- Mode de repli sur l'extraction pour les autres fournisseurs (extrait le texte d'abord, puis les images de page si nécessaire).
- Prend en charge les entrées uniques (`pdf`) ou multiples (`pdfs`), maximum 10 PDF par appel.

## Disponibilité

L'outil n'est enregistré que lorsque OpenClaw peut résoudre une configuration de modèle capable de gérer le PDF pour l'agent :

1. `agents.defaults.pdfModel`
2. repli vers `agents.defaults.imageModel`
3. retour au modèle de session/défaut résolu de l'agent
4. si les fournisseurs de PDF natifs sont authentifiés, privilégiez-les par rapport aux candidats de repli d'image générique

Si aucun modèle utilisable ne peut être résolu, l'outil `pdf` n'est pas exposé.

Notes de disponibilité :

- La chaîne de repli est consciente de l'authentification. Un `provider/model` configuré ne compte que si
  OpenClaw peut réellement authentifier ce fournisseur pour l'agent.
- Les fournisseurs de PDF natifs sont actuellement **Anthropic** et **Google**.
- Si le fournisseur de session/défaut résolu possède déjà un modèle de vision/PDF
  configuré, l'outil PDF réutilise celui-ci avant de revenir à d'autres fournisseurs
  authentifiés.

## Référence d'entrée

- `pdf` (`string`) : un chemin ou une URL de PDF
- `pdfs` (`string[]`) : plusieurs chemins ou URL de PDF, jusqu'à 10 au total
- `prompt` (`string`) : invite d'analyse, défaut `Analyze this PDF document.`
- `pages` (`string`) : filtre de page comme `1-5` ou `1,3,7-9`
- `model` (`string`) : substitution de modèle facultative (`provider/model`)
- `maxBytesMb` (`number`) : limite de taille par PDF en Mo

Notes d'entrée :

- `pdf` et `pdfs` sont fusionnés et dédoublonnés avant le chargement.
- Si aucune entrée PDF n'est fournie, l'outil renvoie une erreur.
- `pages` est analysé comme des numéros de page commençant à 1, dédoublonnés, triés et limités au nombre maximal de pages configuré.
- `maxBytesMb` par défaut est `agents.defaults.pdfMaxBytesMb` ou `10`.

## Références PDF prises en charge

- chemin de fichier local (y compris l'expansion `~`)
- URL `file://`
- URL `http://` et `https://`

Notes de référence :

- D'autres schémas d'URI (par exemple `ftp://`) sont rejetés avec `unsupported_pdf_reference`.
- En mode bac à sable, les URL `http(s)` distantes sont rejetées.
- Avec la stratégie de fichiers d'espace de travail uniquement activée, les chemins de fichiers locaux situés en dehors des racines autorisées sont rejetés.

## Modes d'exécution

### Mode de fournisseur natif

Le mode natif est utilisé pour le fournisseur `anthropic` et `google`.
L'outil envoie les octets bruts du PDF directement aux API du fournisseur.

Limites du mode natif :

- `pages` n'est pas pris en charge. S'il est défini, l'outil renvoie une erreur.
- L'entrée PDF multiple est prise en charge ; chaque PDF est envoyé sous forme de bloc de document natif /
  partie PDF en ligne avant l'invite.

### Mode de repli par extraction

Le mode de repli est utilisé pour les fournisseurs non natifs.

Flux :

1. Extraire le texte des pages sélectionnées (jusqu'à `agents.defaults.pdfMaxPages`, par défaut `20`).
2. Si la longueur du texte extrait est inférieure à `200` caractères, générer des images PNG des pages sélectionnées et les inclure.
3. Envoyer le contenu extrait plus l'invite au modèle sélectionné.

Détails du repli :

- L'extraction d'image de page utilise un budget de pixels de `4,000,000`.
- Si le modèle cible ne prend pas en charge l'entrée d'image et qu'il n'y a pas de texte extractible, l'outil génère une erreur.
- Si l'extraction de texte réussit mais que l'extraction d'image nécessiterait la vision sur un
  modèle texte uniquement, OpenClaw supprime les images rendues et continue avec le
  texte extrait.
- Le repli par extraction nécessite `pdfjs-dist` (et `@napi-rs/canvas` pour le rendu d'image).

## Configuration

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

Voir [Référence de configuration](/en/gateway/configuration-reference) pour plus de détails sur les champs.

## Détails de la sortie

L'outil renvoie le texte dans `content[0].text` et les métadonnées structurées dans `details`.

Champs `details` courants :

- `model` : référence de modèle résolue (`provider/model`)
- `native` : `true` pour le mode de fournisseur natif, `false` pour le repli
- `attempts` : tentatives de repli ayant échoué avant le succès

Champs de chemin :

- entrée PDF unique : `details.pdf`
- entrées PDF multiples : `details.pdfs[]` avec des entrées `pdf`
- métadonnées de réécriture de chemin de bac à sable (si applicable) : `rewrittenFrom`

## Comportement en cas d'erreur

- Entrée PDF manquante : lance `pdf required: provide a path or URL to a PDF document`
- Trop de PDF : renvoie une erreur structurée dans `details.error = "too_many_pdfs"`
- Schéma de référence non pris en charge : renvoie `details.error = "unsupported_pdf_reference"`
- Mode natif avec `pages` : lance une erreur `pages is not supported with native PDF providers` claire

## Exemples

PDF unique :

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

Plusieurs PDF :

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

Modèle de secours avec filtrage par page :

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## Connexes

- [Vue d'ensemble des outils](/en/tools) — tous les outils d'agent disponibles
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) — configuration pdfMaxBytesMb et pdfMaxPages
