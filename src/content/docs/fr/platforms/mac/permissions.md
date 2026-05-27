---
summary: "Persistance des permissions macOS (TCC) et exigences de signature"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Deciding whether to grant Accessibility to node or a CLI runtime
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS permissions"
---

macOS permission grants are fragile. TCC associates a permission grant with the
app's code signature, bundle identifier, and on-disk path. If any of those change,
macOS treats the app as new and may drop or hide prompts.

## Requirements for stable permissions

- Same path: run the app from a fixed location (for OpenClaw, `dist/OpenClaw.app`).
- Same bundle identifier: changing the bundle ID creates a new permission identity.
- Signed app: unsigned or ad-hoc signed builds do not persist permissions.
- Consistent signature: use a real Apple Development or Developer ID certificate
  so the signature stays stable across rebuilds.

Ad-hoc signatures generate a new identity every build. macOS will forget previous
grants, and prompts can disappear entirely until the stale entries are cleared.

## Autorisations d'accessibilité pour Node et les runtimes CLI

Il est préférable d'accorder l'accessibilité à OpenClaw.app, Peekaboo.app, ou à un autre assistant signé
ayant son propre identifiant de bundle, plutôt qu'à un binaire générique `node`.

Le TCC de macOS accorde l'accessibilité à l'identité de code du processus qu'il voit. Si un
workflow Homebrew, nvm, pnpm ou npm amène un exécutable partagé `node` à
recevoir l'accessibilité, tout package JavaScript lancé via ce même
exécutable peut hériter de privilèges d'automatisation de l'interface graphique.

Considérez une entrée `node` dans les réglages système comme une autorisation large pour ce runtime
Node, et non comme une autorisation pour un seul package npm. Évitez d'accorder l'accessibilité à
`node` sauf si vous faites confiance à chaque script et package lancé via cette installation
précise de Node.

Si vous avez accidentellement accordé l'accessibilité à `node`, supprimez cette entrée de
Réglages système -> Confidentialité et sécurité -> Accessibilité. Accordez ensuite l'accessibilité à l'application
signée ou à l'assistant qui doit posséder l'automatisation de l'interface utilisateur.

## Liste de contrôle de récupération lorsque les invites disparaissent

1. Quittez l'application.
2. Supprimez l'entrée de l'application dans Réglages système -> Confidentialité et sécurité.
3. Relancez l'application à partir du même chemin et accordez à nouveau les autorisations.
4. Si l'invite n'apparaît toujours pas, réinitialisez les entrées TCC avec `tccutil` et réessayez.
5. Certaines autorisations ne réapparaissent qu'après un redémarrage complet de macOS.

Exemples de réinitialisations (remplacez l'identifiant de bundle si nécessaire) :

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## Autorisations de fichiers et dossiers (Bureau/Documents/Téléchargements)

macOS peut également restreindre l'accès au Bureau, aux Documents et aux Téléchargements pour les processus en arrière-plan/le terminal. Si les lectures de fichiers ou les listages de répertoires bloquent, accordez l'accès au même contexte de processus qui effectue les opérations sur fichiers (par exemple Terminal/iTerm, application lancée via LaunchAgent, ou processus SSH).

Solution de contournement : déplacez les fichiers vers l'espace de travail OpenClaw (`~/.openclaw/workspace`) si vous souhaitez éviter d'accorder des autorisations par dossier.

Si vous testez les autorisations, signez toujours avec un vrai certificat. Les builds
ad-hoc ne sont acceptables que pour des exécutions locales rapides où les autorisations n'importent pas.

## Connexes

- [application macOS](macOS/en/platforms/macos)
- [signature macOS](macOS/en/platforms/mac/signing)
