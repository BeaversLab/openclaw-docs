---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde código fuente), más estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

Mantenga OpenClaw actualizado.

## Recomendado: `openclaw update`

La forma más rápida de actualizar. Detecta su tipo de instalación (npm o git), busca la última versión, ejecuta `openclaw doctor` y reinicia la puerta de enlace.

```bash
openclaw update
```

Para cambiar de canales o apuntar a una versión específica:

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` prefiere beta, pero el tiempo de ejecución vuelve a estable/latest cuando
la etiqueta beta falta o es más antigua que la última versión estable. Use `--tag beta`
si desea la etiqueta de distribución beta de npm pura para una actualización de paquete única.

Vea [Canales de desarrollo](/es/install/development-channels) para la semántica de canales.

## Cambiar entre instalaciones npm y git

Use canales cuando quiera cambiar el tipo de instalación. El actualizador mantiene su
estado, configuración, credenciales y espacio de trabajo en `~/.openclaw`; solo cambia
qué instalación de código de OpenClaw usan la CLI y la puerta de enlace.

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

Ejecute con `--dry-run` primero para previsualizar el cambio exacto del modo de instalación:

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

El canal `dev` asegura una comprobación git, la compila e instala la CLI global
desde esa comprobación. Los canales `stable` y `beta` usan instalaciones de paquetes. Si la
puerta de enlace ya está instalada, `openclaw update` actualiza los metadatos del servicio
y la reinicia a menos que pase `--no-restart`.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Añada `--no-onboard` para omitir la incorporación. Para forzar un tipo de instalación específico a través
del instalador, pase `--install-method git --no-onboard` o
`--install-method npm --no-onboard`.

Si `openclaw update` falla después de la fase de instalación del paquete npm, vuelva a ejecutar el
instalador. El instalador no llama al antiguo actualizador; ejecuta la instalación
del paquete global directamente y puede recuperar una instalación npm parcialmente actualizada.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Para fijar la recuperación a una versión o etiqueta de distribución específica, añada `--version`:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternativa: npm, pnpm o bun manual

```bash
npm i -g openclaw@latest
```

Cuando `openclaw update` gestiona una instalación global de npm, primero instala el objetivo en
un prefijo npm temporal, verifica el inventario empaquetado de `dist` y luego intercambia
el árbol de paquetes limpio en el prefijo global real. Esto evita que npm superponga un
nuevo paquete sobre archivos obsoletos del paquete anterior. Si el comando de instalación falla,
OpenClaw reintenta una vez con `--omit=optional`. Ese reintento ayuda a los hosts donde las
dependencias opcionales nativas no pueden compilarse, manteniendo el fallo original visible
si la alternativa también falla.

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Temas avanzados de instalación de npm

<AccordionGroup>
  <Accordion title="Árbol de paquetes de solo lectura">
    OpenClaw trata las instalaciones globales empaquetadas como de solo lectura en tiempo de ejecución, incluso cuando el directorio del paquete global es escribible por el usuario actual. Las dependencias de tiempo de ejecución del complemento empaquetado se preparan en un directorio de tiempo de ejecución escribible en lugar de mutar el árbol de paquetes. Esto evita que `openclaw update` compita con una puerta de enlace en ejecución o un agente local que está reparando las dependencias del complemento durante la misma instalación.

    Algunas configuraciones de npm en Linux instalan paquetes globales en directorios propiedad de root, como `/usr/lib/node_modules/openclaw`. OpenClaw admite ese diseño a través de la misma ruta de preparación externa.

  </Accordion>
  <Accordion title="Unidades de systemd reforzadas">
    Establezca un directorio de etapa escribible que se incluya en `ReadWritePaths`:

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    `OPENCLAW_PLUGIN_STAGE_DIR` también acepta una lista de rutas. OpenClaw resuelve las dependencias de tiempo de ejecución del complemento empaquetado de izquierda a derecha en las raíces listadas, trata las raíces anteriores como capas preinstaladas de solo lectura e instala o repara solo en la raíz escribible final:

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    Si `OPENCLAW_PLUGIN_STAGE_DIR` no está establecido, OpenClaw usa `$STATE_DIRECTORY` cuando systemd lo proporciona, y luego recurre a `~/.openclaw/plugin-runtime-deps`. El paso de reparación trata esa etapa como una raíz de paquete local propiedad de OpenClaw e ignora el prefijo de usuario de npm y la configuración global, por lo que la configuración de npm de instalación global no redirige las dependencias del complemento empaquetado a `~/node_modules` ni al árbol de paquetes global.

  </Accordion>
  <Accordion title="Verificación previa del espacio en disco">
    Antes de las actualizaciones de paquetes y las reparaciones de dependencias del entorno de ejecución incluidas, OpenClaw intenta realizar una verificación de mejor esfuerzo del espacio en disco en el volumen de destino. Poco espacio genera una advertencia con la ruta verificada, pero no bloquea la actualización porque las cuotas del sistema de archivos, las instantáneas y los volúmenes de red pueden cambiar después de la verificación. La instalación, copia y verificación posterior a la instalación real de npm siguen siendo autoritativas.
  </Accordion>
  <Accordion title="Dependencias del entorno de ejecución de complementos incluidos">
    Las instalaciones empaquetadas mantienen las dependencias del entorno de ejecución de los complementos incluidos fuera del árbol de paquetes de solo lectura. Al iniciar y durante `openclaw doctor --fix`, OpenClaw repara las dependencias del entorno de ejecución solo para los complementos incluidos que están activos en la configuración, activos a través de la configuración del canal heredado o habilitados por su valor predeterminado de manifiesto incluido. El estado de autenticación del canal persistente por sí solo no activa la reparación de dependencias del entorno de ejecución al iniciar Gateway.

    La desactivación explícita tiene prioridad. Un complemento o canal desactivado no recibe la reparación de sus dependencias del entorno de ejecución solo porque existe en el paquete. Los complementos externos y las rutas de carga personalizadas aún usan `openclaw plugins install` o `openclaw plugins update`.

  </Accordion>
</AccordionGroup>

## Actualizador automático

El actualizador automático está desactivado de forma predeterminada. Actívelo en `~/.openclaw/openclaw.json`:

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| Canal    | Comportamiento                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| `stable` | Espera `stableDelayHours`, luego aplica con un jitter determinista en `stableJitterHours` (despliegue escalonado). |
| `beta`   | Verifica cada `betaCheckIntervalHours` (predeterminado: cada hora) y aplica inmediatamente.                        |
| `dev`    | Sin aplicación automática. Use `openclaw update` manualmente.                                                      |

El gateway también registra una sugerencia de actualización al inicio (desactívela con `update.checkOnStart: false`).
Para la recuperación de incidentes o degradación, establezca `OPENCLAW_NO_AUTO_UPDATE=1` en el entorno del gateway para bloquear las aplicaciones automáticas incluso cuando `update.auto.enabled` está configurado. Las sugerencias de actualización al inicio aún pueden ejecutarse a menos que `update.checkOnStart` también esté desactivado.

## Después de actualizar

<Steps>

### Ejecutar doctor

```bash
openclaw doctor
```

Migra la configuración, audita las políticas de DM y verifica el estado de la puerta de enlace. Detalles: [Doctor](/es/gateway/doctor)

### Reiniciar la puerta de enlace

```bash
openclaw gateway restart
```

### Verificar

```bash
openclaw health
```

</Steps>

## Revertir

### Fijar una versión (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>`npm view openclaw version` muestra la versión publicada actual.</Tip>

### Fijar un commit (fuente)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

Para volver a la última versión: `git checkout main && git pull`.

## Si estás atascado

- Ejecuta `openclaw doctor` de nuevo y lee la salida cuidadosamente.
- Para `openclaw update --channel dev` en descargas de código fuente, el actualizador autoinicializa `pnpm` cuando es necesario. Si ves un error de arranque de pnpm/corepack, instala `pnpm` manualmente (o vuelve a habilitar `corepack`) y vuelve a ejecutar la actualización.
- Consulta: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunta en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/es/install): todos los métodos de instalación.
- [Doctor](/es/gateway/doctor): comprobaciones de estado después de las actualizaciones.
- [Migración](/es/install/migrating): guías de migración de versiones principales.
