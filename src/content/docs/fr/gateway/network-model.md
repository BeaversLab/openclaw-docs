---
summary: "Comment le Gateway, les nœuds et l'hôte du canvas se connectent."
read_when:
  - You want a concise view of the Gateway networking model
title: "Modèle de réseau"
---

# Modèle réseau

> Ce contenu a été fusionné dans [Network](/en/network#core-model). Consultez cette page pour le guide actuel.

La plupart des opérations transitent par la Gateway (Gateway) (`openclaw gateway`), un processus unique et de longue durée qui possède les connexions de canal et le plan de contrôle WebSocket.

## Règles de base

- Il est recommandé d'avoir une seule Gateway (Gateway) par hôte. C'est le seul processus autorisé à posséder la session Web WhatsApp. Pour les bots de secours ou une isolation stricte, exécutez plusieurs passerelles avec des profils et des ports isolés. Voir [Multiple gateways](/en/gateway/multiple-gateways).
- Bouclage en priorité : le WS de la Gateway (Gateway) est par défaut `ws://127.0.0.1:18789`. L'assistant génère un jeton de passerelle par défaut, même pour le bouclage. Pour l'accès au réseau de queue, exécutez `openclaw gateway --bind tailnet --token ...` car les jetons sont requis pour les liaisons non-bouclage.
- Les nœuds se connectent au WS de la Gateway (Gateway) via LAN, tailnet ou SSH selon les besoins. Le pont TCP hérité est obsolète.
- L'hôte Canvas est servi par le serveur HTTP de la Gateway (Gateway) sur le **même port** que la Gateway (Gateway) (défaut `18789`) :
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Lorsque `gateway.auth` est configuré et que la Gateway (Gateway) se lie au-delà du bouclage, ces routes sont protégées par l'authentification de la Gateway (Gateway). Les clients nœuds utilisent des URL de capacité étendues aux nœuds liées à leur session WS active. Voir [Configuration de la Gateway (Gateway)](/en/gateway/configuration) (`canvasHost`, `gateway`).
- L'utilisation à distance se fait généralement via un tunnel SSH ou un VPN tailnet. Voir [Accès à distance](/en/gateway/remote) et [Discovery](/en/gateway/discovery).
