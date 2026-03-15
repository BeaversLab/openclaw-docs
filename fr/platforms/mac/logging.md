---
summary: "Journalisation OpenClaw : fichier journal de diagnostic rotatif + indicateurs de confidentialité du journal unifié"
read_when:
  - Capturing macOS logs or investigating private data logging
  - Debugging voice wake/session lifecycle issues
title: "Journalisation macOS"
---

# Journalisation (macOS)

## Fichier journal de diagnostic rotatif (volet Débogage)

OpenClaw achemine les journaux d'application macOS via swift-log (journalisation unifiée par défaut) et peut écrire un fichier journal local rotatif sur le disque lorsque vous avez besoin d'une capture durable.

- Verbosité : **Volet Débogage → Journaux → Journalisation des applications → Verbosité**
- Activer : **Volet Débogage → Journaux → Journalisation des applications → « Écrire un journal de diagnostic rotatif (JSONL) »**
- Emplacement : `~/Library/Logs/OpenClaw/diagnostics.jsonl` (rotation automatique ; les anciens fichiers sont suffixés avec `.1`, `.2`, …)
- Effacer : **Volet Débogage → Journaux → Journalisation des applications → « Effacer »**

Notes :

- Cette option est **désactivée par défaut**. Activez-la uniquement lors d'un débogage actif.
- Traitez le fichier comme sensible ; ne le partagez pas sans révision.

## Données privées de journalisation unifiée sur macOS

La journalisation unifiée masque la plupart des charges utiles, sauf si un sous-système opte pour `privacy -off`. Selon l'article de Peter sur les [turbulences de confidentialité de la journalisation](https://steipete.me/posts/2025/logging-privacy-shenanigans) macOS (2025), cela est contrôlé par un plist dans `/Library/Preferences/Logging/Subsystems/` indexé par le nom du sous-système. Seuls les nouveaux enregistrements de journal prennent en compte l'indicateur, alors activez-le avant de reproduire un problème.

## Activer pour OpenClaw (`ai.openclaw`)

- Écrivez d'abord le plist dans un fichier temporaire, puis installez-le de manière atomique en tant que root :

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- Aucun redémarrage n'est requis ; logd détecte le fichier rapidement, mais seules les nouvelles lignes de journal incluront des charges utiles privées.
- Affichez la sortie enrichie avec l'assistant existant, par exemple `./scripts/clawlog.sh --category WebChat --last 5m`.

## Désactiver après le débogage

- Supprimez la substitution : `sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`.
- Exécutez éventuellement `sudo log config --reload` pour forcer logd à abandonner immédiatement la substitution.
- N'oubliez pas que cette surface peut inclure des numéros de téléphone et le corps des messages ; ne conservez le plist en place que tant que vous avez activement besoin du détail supplémentaire.

import fr from '/components/footer/fr.mdx';

<fr />
