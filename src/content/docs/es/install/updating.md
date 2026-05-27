---
summary: "Actualizar OpenClaw de forma segura (instalación global o desde código fuente), además de estrategia de reversión"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Actualizando"
---

Mantenga OpenClaw actualizado.

## Recomendado: `openclaw update`

La forma más rápida de actualizar. Detecta su tipo de instalación (npm o git), busca la última versión, ejecuta `openclaw doctor` y reinicia el gateway.

```bash
openclaw update
```

Para cambiar de canales o apuntar a una versión específica:

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --dry-run   # preview without applying
```

`openclaw update` no acepta `--verbose`. Para el diagnóstico de actualizaciones, use
`--dry-run` para previsualizar las acciones planificadas, `--json` para resultados estructurados o
`openclaw update status --json` para inspeccionar el estado del canal y disponibilidad. El
instalador tiene su propia bandera `--verbose`, pero esa bandera no es parte de
`openclaw update`.

`--channel beta` prefiere beta, pero el tiempo de ejecución recurre a stable/latest cuando
la etiqueta beta falta o es más antigua que el último lanzamiento estable. Use `--tag beta`
si desea la etiqueta de distribución beta de npm cruda para una actualización de paquete única.

Use `--channel dev` para una copia de trabajo persistente y móvil de GitHub `main`. Para actualizaciones de paquetes, `--tag main` mapea a `github:openclaw/openclaw#main` para una ejecución, y las especificaciones de fuente GitHub/git se empaquetan en un archivo tar temporal antes de la instalación de npm por etapas.

Para complementos administrados, la alternativa al canal beta es una advertencia: la actualización del núcleo aún puede tener éxito mientras un complemento usa su versión predeterminada/más reciente registrada porque no hay ningún complemento beta disponible.

Consulte [Development channels](/es/install/development-channels) para conocer la semántica de los canales.

## Cambiar entre instalaciones npm y git

Use canales cuando desee cambiar el tipo de instalación. El actualizador mantiene su estado, configuración, credenciales y espacio de trabajo en `~/.openclaw`; solo cambia qué instalación de código de OpenClaw usan la CLI y la puerta de enlace.

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

El canal `dev` asegura una copia de trabajo de git, la compila e instala la CLI global desde esa copia. Los canales `stable` y `beta` usan instalaciones de paquetes. Si la puerta de enlace ya está instalada, `openclaw update` actualiza los metadatos del servicio y lo reinicia a menos que pase `--no-restart`.

Para instalaciones de paquetes con un servicio de puerta de enlace administrado, `openclaw update` apunta a la raíz del paquete utilizada por ese servicio. Si el comando de shell `openclaw` proviene de una instalación diferente, el actualizador imprime ambas raíces y la ruta de Node del servicio administrado. La actualización del paquete usa el administrador de paquetes que posee la raíz del servicio y verifica el Node del servicio administrado contra el motor de lanzamiento objetivo antes de reemplazar el paquete.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Agregue `--no-onboard` para omitir la incorporación. Para forzar un tipo de instalación específico a través del instalador, pase `--install-method git --no-onboard` o `--install-method npm --no-onboard`.

Si `openclaw update` falla después de la fase de instalación del paquete npm, vuelva a ejecutar el instalador. El instalador no llama al actualizador antiguo; ejecuta la instalación del paquete global directamente y puede recuperar una instalación npm actualizada parcialmente.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

Para fijar la recuperación a una versión o dist-tag específica, añada `--version`:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternativa: npm, pnpm o bun manual

```bash
npm i -g openclaw@latest
```

Se prefiere `openclaw update` para instalaciones supervisadas porque puede coordinar el intercambio de paquetes con el servicio Gateway en ejecución. Si actualiza manualmente en una instalación supervisada, detenga el Gateway gestionado antes de que el gestor de paquetes se inicie. Los gestores de paquetes reemplazan los archivos in situ y un Gateway en ejecución podría intentar cargar archivos principales o de complementos mientras el árbol de paquetes está temporalmente medio intercambiado. Reinicie el Gateway después de que el gestor de paquetes finalice para que el servicio tome la nueva instalación.

Para una instalación global del sistema de Linux propiedad de root, si `openclaw update` falla con `EACCES` y se recupera con el npm del sistema, mantenga el Gateway detenido durante el reemplazo manual del paquete. Utilice las mismas banderas de perfil `openclaw` o el entorno que normalmente usa para ese Gateway. Reemplace `/usr/bin/npm` con el npm del sistema que posee el prefijo global propiedad de root en su host:

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest
openclaw gateway install --force
openclaw gateway restart
```

Luego verifique el servicio:

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

Cuando `openclaw update` gestiona una instalación global de npm, instala el objetivo primero en un prefijo npm temporal, verifica el inventario `dist` empaquetado y luego intercambia el árbol de paquetes limpio en el prefijo global real. Eso evita que npm superponga un paquete nuevo sobre archivos obsoletos del paquete anterior. Si el comando de instalación falla, OpenClaw reintentará una vez con `--omit=optional`. Ese reintento ayuda a los hosts donde las dependencias opcionales nativas no pueden compilarse, manteniendo el fallo original visible si la alternativa también falla.

Los comandos de actualización de npm y de actualización de complementos gestionados por OpenClaw también borran la cuarentena `min-release-age` de npm para el proceso npm secundario. npm puede informar esa política como un corte derivado de `before`; ambos son útiles para políticas generales de cuarentena de la cadena de suministro, pero una actualización explícita de OpenClaw significa "instalar la versión seleccionada de OpenClaw ahora".

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Temas avanzados de instalación de npm

<AccordionGroup>
  <Accordion title="Árbol de paquetes de solo lectura">
    OpenClaw trata las instalaciones globales empaquetadas como de solo lectura en tiempo de ejecución, incluso cuando el directorio global de paquetes es escribible por el usuario actual. Las instalaciones de paquetes de complementos viven en raíces npm/git propiedad de OpenClaw bajo el directorio de configuración del usuario, y el inicio de Gateway no muta el árbol de paquetes de OpenClaw.

    Algunas configuraciones de npm en Linux instalan paquetes globales en directorios propiedad de root, como `/usr/lib/node_modules/openclaw`. OpenClaw admite ese diseño porque los comandos de instalación/actualización de complementos escriben fuera de ese directorio global de paquetes.

  </Accordion>
  <Accordion title="Unidades de systemd endurecidas">
    Otorgue a OpenClaw acceso de escritura a sus raíces de configuración/estado para que las instalaciones explícitas de complementos, las actualizaciones de complementos y la limpieza del doctor puedan persistir sus cambios:

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Verificación previa de espacio en disco">
    Antes de las actualizaciones de paquetes y las instalaciones explícitas de complementos, OpenClaw intenta una verificación de espacio en disco de mejor esfuerzo para el volumen de destino. Poco espacio produce una advertencia con la ruta verificada, pero no bloquea la actualización porque las cuotas del sistema de archivos, las instantáneas y los volúmenes de red pueden cambiar después de la verificación. La instalación real del administrador de paquetes y la verificación posterior a la instalación siguen siendo autoritativas.
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

| Canal    | Comportamiento                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `stable` | Espera `stableDelayHours`, luego aplica con fluctuación determinista a lo largo de `stableJitterHours` (despliegue escalonado). |
| `beta`   | Verifica cada `betaCheckIntervalHours` (predeterminado: cada hora) y aplica inmediatamente.                                     |
| `dev`    | Sin aplicación automática. Use `openclaw update` manualmente.                                                                   |

La puerta de enlace también registra una sugerencia de actualización al inicio (desactívela con `update.checkOnStart: false`).
Para una reversión o recuperación de incidentes, establezca `OPENCLAW_NO_AUTO_UPDATE=1` en el entorno de la puerta de enlace para bloquear las aplicaciones automáticas incluso cuando `update.auto.enabled` esté configurado. Las sugerencias de actualización al inicio aún pueden ejecutarse a menos que `update.checkOnStart` también esté desactivado.

Las actualizaciones del administrador de paquetes solicitadas a través del controlador del plano de control de la Gateway en vivo
no reemplazan el árbol de paquetes dentro del proceso de la Gateway en ejecución. En instalaciones
de servicio administrado, la Gateway inicia una transferencia desconectada, sale y permite que la
ruta normal de la CLI de `openclaw update --yes --json` detenga el servicio, reemplace el
paquete, actualice los metadatos del servicio, se reinicie, verifique la versión de la Gateway y
su accesibilidad, y recupere un LaunchAgent de macOS instalado pero no cargado cuando
sea posible. Si la Gateway no puede realizar esa transferencia de forma segura, `update.run` informa un
comando de shell seguro en lugar de ejecutar el administrador de paquetes en proceso.

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

Para volver a lo más reciente: `git checkout main && git pull`.

## Si estás atascado

- Ejecute `openclaw doctor` nuevamente y lea la salida cuidadosamente.
- Para `openclaw update --channel dev` en checkouts de código fuente, el actualizador arranca automáticamente `pnpm` cuando es necesario. Si ve un error de arranque de pnpm/corepack, instale `pnpm` manualmente (o reactive `corepack`) y vuelva a ejecutar la actualización.
- Consulte: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunte en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/es/install): todos los métodos de instalación.
- [Doctor](/es/gateway/doctor): verificaciones de estado después de las actualizaciones.
- [Migración](/es/install/migrating): guías de migración de versiones principales.
