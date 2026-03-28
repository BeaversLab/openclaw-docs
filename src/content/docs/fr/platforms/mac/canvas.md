---
summary: "Panneau Canvas contrôlé par un agent et intégré via WKWebView + schéma d'URL personnalisé"
read_when:
  - Implementing the macOS Canvas panel
  - Adding agent controls for visual workspace
  - Debugging WKWebView canvas loads
title: "Canvas"
---

# Canvas (application macOS)

L'application macOS intègre un **panneau Canvas** contrôlé par un agent en utilisant `WKWebView`. C'est un espace de travail visuel léger pour HTML/CSS/JS, A2UI, et de petites surfaces UI interactives.

## Emplacement de Canvas

L'état de Canvas est stocké dans Application Support :

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Le panneau Canvas sert ces fichiers via un **schéma d'URL personnalisé** :

- `openclaw-canvas://<session>/<path>`

Exemples :

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

Si aucun `index.html` n'existe à la racine, l'application affiche une **page de structure intégrée**.

## Comportement du panneau

- Panneau sans bordure, redimensionnable, ancré près de la barre de menus (ou du curseur de la souris).
- Mémorise la taille et la position par session.
- Recharge automatiquement lorsque les fichiers canvas locaux changent.
- Un seul panneau Canvas est visible à la fois (la session est changée si nécessaire).

Canvas peut être désactivé depuis Paramètres → **Autoriser Canvas**. Lorsqu'il est désactivé, les commandes de nœud canvas renvoient `CANVAS_DISABLED`.

## Surface de l'API de l'agent

Canvas est exposé via le **WebSocket Gateway**, donc l'agent peut :

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

Remarques :

- `canvas.navigate` accepte les **chemins canvas locaux**, les URLs `http(s)` et les URLs `file://`.
- Si vous passez `"/"`, le Canvas affiche la structure locale ou `index.html`.

## A2UI dans Canvas

A2UI est hébergé par l'hôte canvas du Gateway et rendu à l'intérieur du panneau Canvas. Lorsque le Gateway annonce un hôte Canvas, l'application macOS navigue automatiquement vers la page d'hôte A2UI lors de la première ouverture.

URL de l'hôte A2UI par défaut :

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### Commandes A2UI (v0.8)

Canvas accepte actuellement les messages serveur→client Canvas v0.8 :

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

L'application demande confirmation sauf si une clé valide est fournie.

## Notes de sécurité

- Le schéma Canvas bloque le traversée de répertoires ; les fichiers doivent se trouver sous la racine de la session.
- Le contenu Canvas local utilise un schéma personnalisé (aucun serveur de bouclage requis).
- Les URLs `http(s)` externes sont autorisées uniquement lorsqu'elles sont explicitement naviguées.
