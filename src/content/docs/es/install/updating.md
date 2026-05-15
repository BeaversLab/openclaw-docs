---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde el código fuente), además de la estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

Mantenga OpenClaw actualizado.

## Recomendado: `openclaw update`

La forma más rápida de actualizar. Detecta su tipo de instalación (npm o git), obtiene la última versión, ejecuta `openclaw doctor` y reinicia la puerta de enlace.

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

`openclaw update` no acepta `--verbose`. Para el diagnóstico de actualizaciones, use
`--dry-run` para previsualizar las acciones planificadas, `--json` para resultados estructurados, o
`openclaw update status --json` para inspeccionar el estado del canal y la disponibilidad. El
instalador tiene su propia opción `--verbose`, pero esa opción no es parte de
`openclaw update`.

`--channel beta` prefiere beta, pero el tiempo de ejecución vuelve a stable/latest cuando
la etiqueta beta falta o es más antigua que la última versión estable. Use `--tag beta`
si desea la etiqueta de distribución beta de npm pura para una actualización de paquete única.

Consulte [Canales de desarrollo](/es/install/development-channels) para conocer la semántica de los canales.

## Cambiar entre instalaciones de npm y git

Use canales cuando desee cambiar el tipo de instalación. El actualizador mantiene su
estado, configuración, credenciales y espacio de trabajo en `~/.openclaw`; solo cambia
qué instalación de código de OpenClaw usan la CLI y el portal.

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

Ejecute con `--dry-run` primero para obtener una vista previa del cambio exacto del modo de instalación:

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

El canal `dev` garantiza una extracción de git, la compila e instala la CLI global
desde esa extracción. Los canales `stable` y `beta` utilizan instalaciones de paquetes. Si el
puerta de enlace ya está instalado, `openclaw update` actualiza los metadatos del servicio
y lo reinicia a menos que pases `--no-restart`.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Añade `--no-onboard` para omitir el onboarding. Para forzar un tipo de instalación específico a través
del instalador, pasa `--install-method git --no-onboard` o
`--install-method npm --no-onboard`.

Si `openclaw update` falla después de la fase de instalación del paquete npm, vuelve a ejecutar el
instalador. El instalador no llama al antiguo actualizador; ejecuta la instalación
global del paquete directamente y puede recuperar una instalación npm parcialmente actualizada.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Para fijar la recuperación a una versión específica o dist-tag, añada `--version`:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternativa: npm, pnpm o bun manual

```bash
npm i -g openclaw@latest
```

Se prefiere `openclaw update` para instalaciones supervisadas porque puede coordinar el intercambio de paquetes con el servicio Gateway en ejecución. Si actualiza manualmente mientras un Gateway administrado se está ejecutando, reinicie el Gateway inmediatamente después de que el gestor de paquetes finalice para que el proceso antiguo no siga sirviendo desde los archivos del paquete reemplazados.

Cuando `openclaw update` gestiona una instalación global de npm, primero instala el objetivo en
un prefijo temporal de npm, verifica el inventario empaquetado de `dist`, y luego intercambia
el árbol de paquetes limpio en el prefijo global real. Esto evita que npm superponga un
nuevo paquete sobre archivos obsoletos del paquete anterior. Si el comando de instalación falla,
OpenClaw reintenta una vez con `--omit=optional`. Ese reintento ayuda en los hosts donde las
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
    OpenClaw trata las instalaciones globales empaquetadas como de solo lectura en tiempo de ejecución, incluso cuando el directorio de paquetes global es escribible por el usuario actual. Las instalaciones de paquetes de complementos residen en raíces npm/git propiedad de OpenClaw bajo el directorio de configuración del usuario, y el inicio de Gateway no muta el árbol de paquetes de OpenClaw.

    Algunas configuraciones de npm en Linux instalan paquetes globales en directorios propiedad de root, como `/usr/lib/node_modules/openclaw`. OpenClaw admite ese diseño porque los comandos de instalación/actualización de complementos escriben fuera de ese directorio de paquetes global.

  </Accordion>
  <Accordion title="Unidades systemd endurecidas">
    Concede a OpenClaw acceso de escritura a sus raíces de configuración/estado para que las instalaciones explícitas de complementos, las actualizaciones de complementos y la limpieza del doctor puedan conservar sus cambios:

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Verificación previa del espacio en disco">
    Antes de las actualizaciones de paquetes y las instalaciones explícitas de complementos, OpenClaw intenta realizar una verificación de espacio en disco de mejor esfuerzo para el volumen de destino. Poco espacio produce una advertencia con la ruta verificada, pero no bloquea la actualización porque las cuotas del sistema de archivos, las instantáneas y los volúmenes de red pueden cambiar después de la verificación. La instalación real del administrador de paquetes y la verificación posterior a la instalación siguen siendo las autorizadas.
  </Accordion>
</AccordionGroup>

## Actualización automática

El actualizador automático está desactivado de forma predeterminada. Actívalo en `~/.openclaw/openclaw.json`:

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

| Canal    | Comportamiento                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| `stable` | Espera `stableDelayHours` y luego aplica con fluctuación determinista en `stableJitterHours` (despliegue escalonado). |
| `beta`   | Comprueba cada `betaCheckIntervalHours` (predeterminado: cada hora) y aplica inmediatamente.                          |
| `dev`    | Sin aplicación automática. Use `openclaw update` manualmente.                                                         |

La puerta de enlace también registra una sugerencia de actualización al inicio (desactívela con `update.checkOnStart: false`).
Para la degradación o la recuperación de incidentes, establezca `OPENCLAW_NO_AUTO_UPDATE=1` en el entorno de la puerta de enlace para bloquear las aplicaciones automáticas incluso cuando `update.auto.enabled` esté configurado. Las sugerencias de actualización al inicio aún pueden ejecutarse a menos que `update.checkOnStart` también esté desactivado.

Las actualizaciones del gestor de paquetes solicitadas a través del controlador
activo del plano de control del Gateway fuerzan un reinicio de actualización
sin aplazamiento y sin tiempo de espera después del intercambio de paquetes. Eso
evita dejar un proceso antiguo en memoria el tiempo suficiente para cargar
perezamente fragmentos de un árbol de paquetes que ya ha sido reemplazado. La
shell `openclaw update` sigue siendo la ruta preferida para las
instalaciones supervisadas porque puede detener y reiniciar el servicio
alrededor de la actualización.

## Después de actualizar

<Steps>

### Ejecutar doctor

```bash
openclaw doctor
```

Migra la configuración, audita las políticas de DM y comprueba el estado del
gateway. Detalles: [Doctor](/es/gateway/doctor)

### Reiniciar el gateway

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

## Si te atascas

- Ejecuta `openclaw doctor` de nuevo y lee la salida cuidadosamente.
- Para `openclaw update --channel dev` en checkouts de código fuente, el actualizador auto-inicializa `pnpm` cuando es necesario. Si ve un error de arranque de pnpm/corepack, instale `pnpm` manualmente (o vuelva a habilitar `corepack`) y ejecute la actualización nuevamente.
- Consulte: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunte en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/es/install): todos los métodos de instalación.
- [Doctor](/es/gateway/doctor): verificaciones de salud después de las actualizaciones.
- [Migración](/es/install/migrating): guías de migración de versiones principales.
