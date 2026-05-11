---
summary: "Pipeline de formatage Markdown pour les canaux sortants"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Formatage Markdown"
---

OpenClaw formate le Markdown sortant en le convertissant en une représentation intermédiaire partagée (IR) avant de générer une sortie spécifique au channel. L'IR conserve le texte source intact tout en transportant les portées de style/lien, afin que le découpage (chunking) et le rendu puissent rester cohérents d'un channel à l'autre.

## Objectifs

- **Cohérence :** une seule étape d'analyse, plusieurs moteurs de rendu.
- **Découpage sécurisé :** diviser le texte avant le rendu afin que le formatage en ligne ne soit jamais interrompu entre les segments.
- **Adaptation au channel :** mapper la même IR au mrkdwn de Slack, au HTML de Telegram et aux plages de style de Signal sans réanalyser le Markdown.

## Pipeline

1. **Analyse de Markdown -> IR**
   - L'IR est du texte brut plus des portées de style (gras/italique/barré/code/spoiler) et des portées de lien.
   - Les décalages (offsets) sont en unités de code UTF-16 afin que les plages de style de Signal correspondent à son API.
   - Les tableaux sont analysés uniquement lorsqu'un channel opte pour la conversion de tableaux.
2. **Découpage de l'IR (format prioritaire)**
   - Le découpage s'effectue sur le texte IR avant le rendu.
   - Le formatage en ligne ne se divise pas entre les segments ; les portées sont découpées par segment.
3. **Rendu par channel**
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

- Les adaptateurs sortants de Slack, Telegram et Signal effectuent le rendu à partir de l'IR.
- D'autres canaux (WhatsApp, iMessage, Microsoft Teams, Discord) utilisent toujours du texte brut ou leurs propres règles de formatage, avec la conversion de tableaux Markdown appliquée avant le découpage lorsque activée.

## Gestion des tableaux

Les tableaux Markdown ne sont pas pris en charge de manière cohérente sur les clients de chat. Utilisez `markdown.tables` pour contrôler la conversion par channel (et par compte).

- `code` : afficher les tableaux sous forme de blocs de code (par défaut pour la plupart des canaux).
- `bullets` : convertir chaque ligne en puces (par défaut pour Signal + WhatsApp).
- `off` : désactive l'analyse et la conversion des tableaux ; le texte brut du tableau passe tel quel.

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

- Les limites de découpage proviennent des adaptateurs/configurations de canal et sont appliquées au texte RI.
- Les blocs de code sont conservés comme un bloc unique avec une nouvelle ligne de fin pour que les canaux
  les rendent correctement.
- Les préfixes de liste et les préfixes de citation font partie du texte RI, donc le découpage
  ne coupe pas en milieu de préfixe.
- Les styles en ligne (gras/italique/barré/code en ligne/spoiler) ne sont jamais répartis sur
  plusieurs morceaux ; le moteur de rendu rouvre les styles dans chaque morceau.

Si vous avez besoin de plus d'informations sur le comportement du découpage entre les canaux, consultez
[Streaming + chunking](/fr/concepts/streaming).

## Politique de liens

- **Slack :** `[label](url)` -> `<url|label>` ; les URL nues restent nues. Le lien automatique
  est désactivé lors de l'analyse pour éviter les doubles liens.
- **Telegram :** `[label](url)` -> `<a href="url">label</a>` (mode d'analyse HTML).
- **Signal :** `[label](url)` -> `label (url)` sauf si le libellé correspond à l'URL.

## Divulgachis

Les marqueurs de divulgachis (`||spoiler||`) sont analysés uniquement pour Signal, où ils correspondent à
des plages de style SPOILER. Les autres canaux les traitent comme du texte brut.

## Comment ajouter ou mettre à jour un formateur de canal

1. **Analyser une seule fois :** utilisez l'assistant partagé `markdownToIR(...)` avec les options
   appropriées au canal (lien automatique, style de titre, préfixe de citation).
2. **Rendu :** implémentez un moteur de rendu avec `renderMarkdownWithMarkers(...)` et une
   carte de marqueurs de style (ou plages de style Signal).
3. **Découper :** appelez `chunkMarkdownIR(...)` avant le rendu ; rendez chaque morceau.
4. **Connecter l'adaptateur :** mettez à jour l'adaptateur sortant du canal pour utiliser le nouveau découpeur
   et le nouveau moteur de rendu.
5. **Tester :** ajoutez ou mettez à jour les tests de format et un test de livraison sortant si le
   canal utilise le découpage.

## Pièges courants

- Les jetons entre crochets de Slack (`<@U123>`, `<#C123>`, `<https://...>`) doivent être
  préservés ; échappez le HTML brut en toute sécurité.
- Le HTML de Telegram nécessite d'échapper le texte hors des balises pour éviter un balisage cassé.
- Les plages de style Signal dépendent des décalages UTF-16 ; n'utilisez pas les décalages de point de code.
- Conservez les nouvelles lignes de fin pour les blocs de code clôturés afin que les marqueurs de fermeture se retrouvent sur
  leur propre ligne.

## Connexes

- [Streaming and chunking](/fr/concepts/streaming)
- [System prompt](/fr/concepts/system-prompt)
