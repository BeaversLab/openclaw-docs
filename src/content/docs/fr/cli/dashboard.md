---
summary: "Référence CLI pour `openclaw dashboard` (ouvrir l'interface de contrôle)"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: "Dashboard"
---

# `openclaw dashboard`

Ouvrez l'interface de contrôle à l'aide de votre authentification actuelle.

```bash
openclaw dashboard
openclaw dashboard --no-open
```

Notes :

- `dashboard` résout les SecretRefs `gateway.auth.token` configurés lorsque cela est possible.
- `dashboard` suit `gateway.tls.enabled` : les passerilles activées TLS impriment/ouvrent
  les URL de l'interface de contrôle `https://` et se connectent via `wss://`.
- Si la livraison via le presse-papiers/le navigateur échoue pour une URL de tableau de bord authentifiée par jeton,
  `dashboard` consigne un indice d'authentification manuelle sécurisé nommant `OPENCLAW_GATEWAY_TOKEN`,
  `gateway.auth.token` et la clé de fragment `token` sans imprimer la valeur
  du jeton.
- Pour les jetons gérés par SecretRef (résolus ou non résolus), `dashboard` imprime/copie/ouvre une URL sans jeton pour éviter d'exposer des secrets externes dans la sortie du terminal, l'historique du presse-papiers ou les arguments de lancement du navigateur.
- Si `gateway.auth.token` est géré par SecretRef mais non résolu dans ce chemin de commande, la commande imprime une URL sans jeton et des instructions de remédiation explicites au lieu d'incorporer un espace réservé de jeton non valide.

## Connexes

- [Référence CLI](/fr/cli)
- [Tableau de bord](/fr/web/dashboard)
