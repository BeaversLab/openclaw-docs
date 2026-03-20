---
summary: "Panneau Canvas contrôlé par l'agent et intégré via WKWebView + schéma d'URL personnalisé"
read_when:
  - Implémentation du panneau Canvas macOS
  - Ajout de contrôles d'agent pour l'espace de travail visuel
  - Débogage des chargements de canvas WKWebView
title: "Canvas"
---

# Canvas (application macOS)

L'application macOS intègre un **panneau Canvas** contrôlé par l'agent en utilisant `WKWebView`. Il
s'agit d'un espace de travail visuel léger pour HTML/CSS/JS, A2UI et de petites surfaces
d'interface utilisateur interactives.

## Emplacement de Canvas

L'état de Canvas est stocké sous Application Support :

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Le panneau Canvas sert ces fichiers via un **schéma d'URL personnalisé** :

- `openclaw-canvas://<session>/<path>`

Exemples :

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

Si aucun `index.html` n'existe à la racine, l'application affiche une **page d'échafaudage intégrée**.

## Comportement du panneau

- Panneau redimensionnable sans bordure, ancré près de la barre de menus (ou du curseur de la souris).
- Mémorise la taille/la position par session.
- Recharge automatiquement lorsque les fichiers canvas locaux changent.
- Un seul panneau Canvas est visible à la fois (la session est changée si nécessaire).

Canvas peut être désactivé depuis Paramètres → **Autoriser Canvas**. Lorsqu'il est désactivé, les commandes
de nœud de canvas renvoient `CANVAS_DISABLED`.

## Surface API de l'agent

Canvas est exposé via le **WebSocket Gateway**, ce qui permet à l'agent de :

- afficher/masquer le panneau
- naviguer vers un chemin ou une URL
- évaluer du JavaScript
- capturer une image instantanée

Exemples CLI :

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

Notes :

- `canvas.navigate` accepte les **chemins de canvas locaux**, les URL `http(s)` et les URL `file://`.
- Si vous transmettez `"/"`, le Canvas affiche l'échafaudage local ou `index.html`.

## A2UI dans Canvas

A2UI est hébergé par l'hôte de canvas Gateway et rendu dans le panneau Canvas.
Lorsque Gateway annonce un hôte Canvas, l'application macOS navigue automatiquement vers
la page de l'hôte A2UI lors de la première ouverture.

URL de l'hôte A2UI par défaut :

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### Commandes A2UI (v0.8)

Canvas accepte actuellement les messages serveur→client **A2UI v0.8** :

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

`createSurface` (v0.9) n'est pas pris en charge.

Exemple CLI :

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

Test rapide :

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## Déclenchement d'exécutions d'agent depuis Canvas

Canvas peut déclencher de nouvelles exécutions d'agent via des liens profonds :

- `openclaw://agent?...`

Exemple (en JS) :

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

L'application demande confirmation, sauf si une clé valide est fournie.

## Notes de sécurité

- Le schéma Canvas bloque le parcours de répertoires ; les fichiers doivent se trouver sous la racine de la session.
- Le contenu local Canvas utilise un schéma personnalisé (aucun serveur de bouclage requis).
- Les URLs externes `http(s)` sont autorisées uniquement lors d'une navigation explicite.

import fr from "/components/footer/fr.mdx";

<fr />
