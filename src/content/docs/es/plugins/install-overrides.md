---
summary: "Probar las anulaciones de instalación de paquetes de complementos con flujos de instalación en tiempo de configuración"
read_when:
  - Testing onboarding or setup flows against a locally packed plugin
  - Verifying a plugin package before publishing it
  - Replacing an automatic plugin install with a test artifact
title: "Anulaciones de instalación de complementos"
sidebarTitle: "Anulaciones de instalación"
---

Las anulaciones de instalación de complementos permiten a los mantenedores probar las instalaciones de complementos en tiempo de configuración contra
un paquete npm específico o un archivo tar local de npm-pack. Están destinadas solo para E2E y validación
de paquetes. Los usuarios normales deben instalar complementos con
[`openclaw plugins install`](/es/cli/plugins).

<Warning>Las anulaciones ejecutan código de complemento desde la fuente que proporciones. Úsalas solo en un directorio de estado aislado o en una máquina de prueba desechable.</Warning>

## Entorno

Las anulaciones están deshabilitadas a menos que se establezcan ambas variables:

```bash
export OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1
export OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{
  "codex": "npm-pack:/tmp/openclaw-codex-2026.5.8.tgz",
  "openclaw-web-search": "npm:@openclaw/web-search@2026.5.8"
}'
```

El mapa de anulaciones es JSON con clave por id de complemento. Los valores admiten:

- `npm:<registry-spec>` para paquetes de registro y versiones exactas o etiquetas
- `npm-pack:<path.tgz>` para archivos tar locales producidos por `npm pack`

Las rutas relativas `npm-pack:` se resuelven desde el directorio de trabajo actual.

## Comportamiento

Cuando un flujo en tiempo de configuración solicita instalar un complemento cuyo id aparece en el mapa,
OpenClaw usa la fuente de anulación en lugar del catálogo, el empaquetado o la fuente
npm predeterminada. Esto se aplica a la incorporación y otros flujos que utilizan el instalador
compartido de complementos en tiempo de configuración.

Las anulaciones aún hacen cumplir el id de complemento esperado. Un archivo tar asignado a `codex`
debe instalar un complemento cuyo id de manifiesto sea `codex`.

Las anulaciones no heredan el estado oficial de fuente confiable. Incluso cuando la entrada
del catálogo normalmente representa un paquete propiedad de OpenClaw, una anulación se trata como
entrada de prueba proporcionada por el operador.

Los archivos `.env` del espacio de trabajo no pueden habilitar las anulaciones de instalación. Establezca estas variables en
el shell de confianza, trabajo de CI o comando de prueba remoto que inicia OpenClaw.

## E2E de paquetes

Use un directorio de estado aislado para que las instalaciones de paquetes y los registros de instalación no
toquen su estado normal de OpenClaw:

```bash
npm pack extensions/codex --pack-destination /tmp

OPENCLAW_STATE_DIR="$(mktemp -d)" \
OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1 \
OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{"codex":"npm-pack:/tmp/openclaw-codex-2026.5.8.tgz"}' \
pnpm openclaw onboard --mode local
```

Verifique el paquete instalado en el directorio de estado:

```bash
find "$OPENCLAW_STATE_DIR/npm/projects" -path '*/node_modules/@openclaw/codex/package.json' -print
grep -R '"@openclaw/codex"' "$OPENCLAW_STATE_DIR/npm/projects"/*/package-lock.json
```

Para E2E de proveedores en vivo, obtenga la clave API real de un shell de confianza o secreto de CI antes de lanzar el comando de prueba. No imprima claves; reporte solo la fuente y si la clave estaba presente.
