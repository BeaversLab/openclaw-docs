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

- Un Gateway par hôte est recommandé. C'est le seul processus autorisé à posséder la session Web WhatsApp. Pour les bots de secours ou une isolation stricte, exécutez plusieurs passerelles avec des profils et des ports isolés. Voir [Multiple gateways](/en/gateway/multiple-gateways).
- Bouclage en priorité : le Gateway WS est par défaut sur `ws://127.0.0.1:18789`. L'assistant crée une authentification par secret partagé par défaut et génère généralement un jeton, même pour le bouclage. Pour un accès non-bouclage, utilisez un chemin d'authentification passerelle valide : authentification par jeton/mot de passe secret partagé, ou un déploiement non-bouclage `trusted-proxy` correctement configuré. Les configurations Tailnet/mobile fonctionnent généralement mieux via Tailscale Serve ou un autre point de terminaison `wss://` au lieu du `ws://` tailnet brut.
- Les nœuds se connectent au WS Gateway via LAN, tailnet ou SSH selon les besoins. Le
  pont TCP hérité a été supprimé.
- L'hôte Canvas est servi par le serveur HTTP Gateway sur le **même port** que le Gateway (par défaut `18789`) :
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Lorsque `gateway.auth` est configuré et que le Gateway se lie au-delà du bouclage, ces routes sont protégées par l'authentification Gateway. Les clients nœud utilisent des URL de capacité étendues aux nœuds liées à leur session WS active. Voir [Gateway configuration](/en/gateway/configuration) (`canvasHost`, `gateway`).
- L'utilisation à distance se fait généralement via un tunnel SSH ou un VPN tailnet. Voir [Remote access](/en/gateway/remote) et [Discovery](/en/gateway/discovery).
