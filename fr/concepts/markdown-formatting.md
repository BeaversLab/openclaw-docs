---
summary: "Pipeline de formatage Markdown pour les canaux sortants"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Formatage Markdown"
---

# Formatage Markdown

OpenClaw formate le Markdown sortant en le convertissant en une représentation intermédiaire partagée (IR) avant de générer la sortie spécifique au canal. L'IR conserve le texte source intact tout en transportant les portées de style/lien, ce qui permet au découpage (chunking) et au rendu de rester cohérents entre les canaux.

## Objectifs

- **Cohérence :** une étape d'analyse, plusieurs moteurs de rendu.
- **Découpage sécurisé :** diviser le texte avant le rendu pour que le formatage en ligne ne soit jamais brisé entre les morceaux.
- **Adaptation au canal :** mapper la même IR au mrkdwn Slack, au HTML Telegram et aux plages de style Signal sans réanalyser le Markdown.

## Pipeline

1. **Analyser Markdown -> IR**
   - L'IR est du texte brut plus des portées de style (gras/italique/barré/code/spoiler) et des portées de lien.
   - Les décalages sont en unités de code UTF-16 afin que les plages de style Signal correspondent à son API.
   - Les tableaux sont analysés uniquement lorsqu'un canal active la conversion de tableaux.
2. **Découper l'IR (format-d'abord)**
   - Le découpage se produit sur le texte IR avant le rendu.
   - Le formatage en ligne n'est pas divisé entre les morceaux ; les portées sont découpées par morceau.
3. **Rendu par canal**
   - **Slack :** jetons mrkdwn (gras/italique/barré/code), liens sous la forme `<url|label>`.
   - **Telegram :** balises HTML (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`).
   - **Signal :** texte brut + plages `text-style` ; les liens deviennent `label (url)` lorsque l'étiquette diffère.

## Exemple d'IR

Markdown d'entrée :

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
- D'autres canaux (WhatsApp, iMessage, MS Teams, Discord) utilisent toujours du texte brut ou leurs propres règles de formatage, avec la conversion de tableaux Markdown appliquée avant le découpage si activée.

## Gestion des tableaux

Les tableaux Markdown ne sont pas pris en charge de manière cohérente sur les clients de chat. Utilisez `markdown.tables` pour contrôler la conversion par canal (et par compte).

- `code` : affiche les tableaux sous forme de blocs de code (par défaut pour la plupart des canaux).
- `bullets` : convertit chaque ligne en puces (par défaut pour Signal et WhatsApp).
- `off` : désactive l'analyse et la conversion des tableaux ; le texte brut du tableau est transmis tel quel.

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

- Les limites de découpage proviennent des adaptateurs/configurations de canal et sont appliquées au texte IR.
- Les blocs de code sont conservés sous forme d'un seul bloc avec une nouvelle ligne de fin pour que les canaux les affichent correctement.
- Les préfixes de liste et les préfixes de bloc de citation font partie du texte IR, le découpage ne les divise donc pas en plein milieu d'un préfixe.
- Les styles en ligne (gras/italique/barré/code en ligne/spoiler) ne sont jamais divisés entre les fragments ; le répéteur rouvre les styles dans chaque fragment.

Si vous avez besoin de plus d'informations sur le comportement du découpage entre les canaux, consultez [Streaming + chunking](/fr/concepts/streaming).

## Politique de liens

- **Slack :** `[label](url)` -> `<url|label>` ; les URL nues restent nues. La liaison automatique est désactivée lors de l'analyse pour éviter les doubles liens.
- **Telegram :** `[label](url)` -> `<a href="url">label</a>` (mode d'analyse HTML).
- **Signal :** `[label](url)` -> `label (url)` sauf si l'étiquette correspond à l'URL.

## Divulgachis

Les marqueurs de divulgachis (`||spoiler||`) sont analysés uniquement pour Signal, où ils correspondent aux plages de style SPOILER. Les autres canaux les traitent comme du texte brut.

## Comment ajouter ou mettre à jour un formateur de canal

1. **Analyser une seule fois :** utilisez l'assistant partagé `markdownToIR(...)` avec les options appropriées au canal (liaison automatique, style d'en-tête, préfixe de bloc de citation).
2. **Rendu :** implémentez un répéteur avec `renderMarkdownWithMarkers(...)` et une carte de marqueurs de style (ou les plages de style Signal).
3. **Découper :** appelez `chunkMarkdownIR(...)` avant le rendu ; affichez chaque fragment.
4. **Wire adapter :** mettez à jour l'adaptateur de sortie du canal pour utiliser le nouveau chunker
   et le nouveau moteur de rendu.
5. **Test :** ajoutez ou mettez à jour les tests de formatage et un test de livraison sortante si le
   canal utilise le chunking.

## Pièges courants

- Les jetons entre crochets de Slack (`<@U123>`, `<#C123>`, `<https://...>`) doivent être
  conservés ; échappez le HTML brut en toute sécurité.
- Le HTML Telegram nécessite d'échapper le texte en dehors des balises pour éviter un balisage cassé.
- Les plages de style Signal dépendent des décalages UTF-16 ; n'utilisez pas les décalages de point de code.
- Conservez les sauts de ligne de fin pour les blocs de code clôturés afin que les marqueurs de fermeture se trouvent sur
  leur propre ligne.

import fr from '/components/footer/fr.mdx';

<fr />
