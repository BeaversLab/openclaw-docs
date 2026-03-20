---
summary: "Pipeline de formatage Markdown pour les channels sortants"
read_when:
  - Vous modifiez le formatage ou le découpage (chunking) Markdown pour les channels sortants
  - Vous ajoutez un nouveau formateur de channel ou un mappage de style
  - Vous déboguez des régressions de formatage sur les channels
title: "Formatage Markdown"
---

# Formatage Markdown

OpenClaw formate le Markdown sortant en le convertissant en une représentation intermédiaire partagée (IR) avant de générer la sortie spécifique au channel. L'IR garde le texte source intact tout en transportant les étendues de style/lien, afin que le découpage et le rendu puissent rester cohérents d'un channel à l'autre.

## Objectifs

- **Cohérence :** une seule étape d'analyse, plusieurs moteurs de rendu.
- **Découpage sécurisé :** diviser le texte avant le rendu pour que le formatage en ligne ne soit jamais rompu entre les morceaux.
- **Adaptation au channel :** mapper le même IR au mrkdwn Slack, au HTML Telegram et aux plages de style Signal sans réanalyser le Markdown.

## Pipeline

1. **Analyser Markdown -> IR**
   - L'IR est du texte brut plus des étendues de style (gras/italique/barré/code/spoiler) et des étendues de lien.
   - Les décalages sont en unités de code UTF-16 afin que les plages de style Signal s'alignent avec son API.
   - Les tableaux sont analysés uniquement lorsqu'un channel active la conversion des tableaux.
2. **Découper l'IR (format-first)**
   - Le découpage se produit sur le texte IR avant le rendu.
   - Le formatage en ligne ne se divise pas entre les morceaux ; les étendues sont découpées par morceau.
3. **Rendu par channel**
   - **Slack :** jetons mrkdwn (gras/italique/barré/code), liens sous forme de `<url|label>`.
   - **Telegram :** balises HTML (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`).
   - **Signal :** texte brut + plages `text-style` ; les liens deviennent `label (url)` lorsque l'étiquette diffère.

## Exemple IR

Entrée Markdown :

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR (schématique) :

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## Où il est utilisé

- Les adaptateurs sortants Slack, Telegram et Signal effectuent le rendu à partir de l'IR.
- D'autres channels (WhatsApp, iMessage, MS Teams, Discord) utilisent toujours du texte brut ou leurs propres règles de formatage, avec une conversion de tableaux Markdown appliquée avant le découpage lorsque activée.

## Gestion des tableaux

Les tableaux Markdown ne sont pas pris en charge de manière cohérente sur tous les clients de chat. Utilisez `markdown.tables` pour contrôler la conversion par channel (et par compte).

- `code` : afficher les tableaux sous forme de blocs de code (par défaut pour la plupart des canaux).
- `bullets` : convertir chaque ligne en puces (par défaut pour Signal + WhatsApp).
- `off` : désactiver l'analyse et la conversion des tableaux ; le texte brut du tableau passe à travers.

Clés de configuration :

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## Règles de découpage

- Les limites de découpage proviennent des adaptateurs/configurations de canaux et sont appliquées au texte IR.
- Les clôtures de code sont préservées comme un seul bloc avec une nouvelle ligne de fin afin que les canaux les affichent correctement.
- Les préfixes de liste et de citation en bloc font partie du texte IR, le découpage ne divise donc pas en plein milieu d'un préfixe.
- Les styles en ligne (gras/italique/barré/code en ligne/spoiler) ne sont jamais divisés entre les fragments ; le rédacteur rouvre les styles dans chaque fragment.

Si vous avez besoin de plus d'informations sur le comportement du découpage sur les canaux, consultez [Streaming + chunking](/fr/concepts/streaming).

## Politique de lien

- **Slack :** `[label](url)` -> `<url|label>` ; les URL nues restent nues. La liaison automatique est désactivée lors de l'analyse pour éviter les doubles liens.
- **Telegram :** `[label](url)` -> `<a href="url">label</a>` (mode d'analyse HTML).
- **Signal :** `[label](url)` -> `label (url)` sauf si l'étiquette correspond à l'URL.

## Divulgachés

Les marqueurs de divulgachés (`||spoiler||`) sont analysés uniquement pour Signal, où ils correspondent à des plages de style SPOILER. Les autres canaux les traitent comme du texte brut.

## Comment ajouter ou mettre à jour un formateur de canal

1. **Analyser une fois :** utilisez l'assistant partagé `markdownToIR(...)` avec les options appropriées pour le canal (liaison automatique, style d'en-tête, préfixe de bloc de citation).
2. **Rendu :** implémentez un rédacteur avec `renderMarkdownWithMarkers(...)` et une carte de marqueurs de style (ou plages de style Signal).
3. **Découper :** appelez `chunkMarkdownIR(...)` avant le rendu ; effectuez le rendu de chaque fragment.
4. **Adaptateur de connexion :** mettez à jour l'adaptateur sortant du canal pour utiliser le nouveau découpeur et le nouveau rédacteur.
5. **Test :** ajoutez ou mettez à jour les tests de format et un test de livraison sortante si le canal utilise le découpage.

## Pièges courants

- Les jetons d'accolades angulaires Slack (`<@U123>`, `<#C123>`, `<https://...>`) doivent être préservés ; échappez le HTML brut en toute sécurité.
- Le HTML de Telegram nécessite d'échapper le texte en dehors des balises pour éviter un balisage cassé.
- Les plages de style de Signal dépendent des décalages UTF-16 ; n'utilisez pas les décalages de points de code.
- Conservez les sauts de ligne de fin pour les blocs de code clôturés afin que les marqueurs de fermeture se trouvent sur
  leur propre ligne.

import en from "/components/footer/en.mdx";

<en />
