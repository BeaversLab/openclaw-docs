---
summary: "Comment le Gateway, les nœuds et l'hôte du canvas se connectent."
read_when:
  - Vous souhaitez une vue concise du modèle réseau du Gateway
title: "Network model"
---

La plupart des opérations passent par le Gateway (`openclaw gateway`), un processus unique de longue durée
qui possède les connexions de canal et le plan de contrôle WebSocket.

## Règles de base

- Un seul Gateway par hôte est recommandé. C'est le seul processus autorisé à posséder la session Web WhatsApp. Pour les bots de secours ou une isolation stricte, exécutez plusieurs passerelles avec des profils et des ports isolés. Voir [Multiple gateways](/fr/gateway/multiple-gateways).
- Bouclage en priorité : le WS du Gateway est par défaut `ws://127.0.0.1:18789`. L'assistant génère un jeton de passerelle par défaut, même pour le bouclage. Pour l'accès au réseau tailnet, exécutez `openclaw gateway --bind tailnet --token ...` car les jetons sont requis pour les liaisons non bouclées.
- Les nœuds se connectent au Gateway WS via LAN, tailnet ou SSH selon les besoins. Le pont TCP hérité est déconseillé.
- L'hôte du Canvas est servi par le serveur HTTP du Gateway sur le **même port** que le Gateway (par défaut `18789`) :
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Lorsque `gateway.auth` est configuré et que le Gateway se lie au-delà du bouclage, ces routes sont protégées par l'authentification du Gateway. Les clients nœud utilisent des URL de capacité étendues au nœud liées à leur session WS active. Voir [Gateway configuration](/fr/gateway/configuration) (`canvasHost`, `gateway`).
- L'utilisation à distance se fait généralement via un tunnel SSH ou un VPN tailnet. Voir [Remote access](/fr/gateway/remote) et [Discovery](/fr/gateway/discovery).

import en from "/components/footer/en.mdx";

<en />
