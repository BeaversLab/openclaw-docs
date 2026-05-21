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
openclaw update --tag main
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

Para los complementos administrados, la alternativa al canal beta es una advertencia: la actualización del núcleo aún puede tener éxito mientras un complemento usa su versión predeterminada/más reciente registrada porque no hay una versión beta del complemento disponible.

Consulte [Canales de desarrollo](/es/install/development-channels) para conocer la semántica de los canales.

## Cambiar entre instalaciones npm y git

Use canales cuando desee cambiar el tipo de instalación. El actualizador mantiene su
estado, configuración, credenciales y espacio de trabajo en `~/.openclaw`; solo cambia
qué instalación de código de OpenClaw usan la CLI y el gateway.

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

El canal `dev` asegura una descarga de git, la construye e instala la CLI global
desde esa descarga. Los canales `stable` y `beta` usan instalaciones de paquetes. Si el
gateway ya está instalado, `openclaw update` actualiza los metadatos del servicio
y lo reinicia a menos que pase `--no-restart`.

Para instalaciones de paquetes con un servicio Gateway administrado, `openclaw update` apunta
a la raíz del paquete utilizado por ese servicio. Si el comando de shell `openclaw` proviene
de una instalación diferente, el actualizador imprime ambas raíces y la ruta de Node del
servicio administrado. La actualización del paquete utiliza el administrador de paquetes que posee la
raíz del servicio y verifica el Node del servicio administrado contra el motor de la versión
objetivo antes de reemplazar el paquete.

## Alternativa: volver a ejecutar el instalador

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Añada `--no-onboard` para omitir el onboarding. Para forzar un tipo de instalación específico a través
del instalador, pase `--install-method git --no-onboard` o
`--install-method npm --no-onboard`.

Si `openclaw update` falla después de la fase de instalación del paquete npm, vuelva a ejecutar el
instalador. El instalador no llama al antiguo actualizador; ejecuta la instalación del
paquete global directamente y puede recuperar una instalación npm parcialmente actualizada.

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

Prefiera `openclaw update` para instalaciones supervisadas porque puede coordinar el
intercambio de paquetes con el servicio Gateway en ejecución. Si actualiza manualmente en una
instalación supervisada, detenga el Gateway administrado antes de que inicie el administrador de paquetes.
Los administradores de paquetes reemplazan archivos en su lugar y, de lo contrario, un Gateway en ejecución podría intentar
cargar archivos principales o de complementos mientras el árbol de paquetes está temporalmente medio intercambiado.
Reinicie el Gateway después de que termine el administrador de paquetes para que el servicio adopte
la nueva instalación.

Para una instalación global del sistema Linux propiedad de root, si `openclaw update` falla con
`EACCES` y se recupera con el npm del sistema, mantenga el Gateway detenido durante el
reemplazo manual del paquete. Use los mismos indicadores de perfil `openclaw` o entorno
que normalmente usa para ese Gateway. Reemplace `/usr/bin/npm` con el npm del sistema
que posee el prefijo global propiedad de root en su host:

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

Cuando `openclaw update` gestiona una instalación global de npm, primero instala el objetivo en un prefijo temporal de npm, verifica el inventario empaquetado de `dist` y luego intercambia el árbol de paquetes limpio en el prefijo global real. Esto evita que npm superponga un paquete nuevo sobre archivos obsoletos del paquete anterior. Si el comando de instalación falla, OpenClaw reintentará una vez con `--omit=optional`. Ese reintento ayuda en los hosts donde las dependencias opcionales nativas no se pueden compilar, manteniendo el fallo original visible si la alternativa también falla.

Los comandos de actualización de npm y actualización de complementos gestionados por OpenClaw también borran la cuarentena de `min-release-age` para el proceso hijo de npm. npm puede informar esa política como un corte derivado de `before`; ambos son útiles para las políticas generales de cuarentena de la cadena de suministro, pero una actualización explícita de OpenClaw significa "instalar la versión seleccionada de OpenClaw ahora".

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Temas avanzados de instalación de npm

<AccordionGroup>
  <Accordion title="Árbol de paquetes de solo lectura">
    OpenClaw trata las instalaciones globales empaquetadas como de solo lectura en tiempo de ejecución, incluso cuando el directorio del paquete global es escribible por el usuario actual. Las instalaciones de paquetes de complementos residen en raíces npm/git propiedad de OpenClaw bajo el directorio de configuración del usuario, y el inicio de Gateway no muta el árbol de paquetes de OpenClaw.

    Algunas configuraciones de npm en Linux instalan paquetes globales en directorios propiedad de root, como `/usr/lib/node_modules/openclaw`. OpenClaw admite ese diseño porque los comandos de instalación/actualización de complementos escriben fuera de ese directorio de paquetes global.

  </Accordion>
  <Accordion title="Unidades de systemd endurecidas">
    Conceda a OpenClaw acceso de escritura a sus raíces de configuración/estado para que las instalaciones explícitas de complementos, las actualizaciones de complementos y la limpieza del doctor puedan persistir sus cambios:

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Verificación previa del espacio en disco">
    Antes de las actualizaciones de paquetes y las instalaciones explícitas de complementos, OpenClaw intenta realizar una verificación de mejor esfuerzo del espacio en disco para el volumen de destino. Poco espacio produce una advertencia con la ruta verificada, pero no bloquea la actualización porque las cuotas del sistema de archivos, las instantáneas y los volúmenes de red pueden cambiar después de la verificación. La instalación real del administrador de paquetes y la verificación posterior a la instalación siguen siendo definitivas.
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

| Canal    | Comportamiento                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `stable` | Espera `stableDelayHours`, luego aplica con una fluctuación determinista en `stableJitterHours` (despliegue escalonado). |
| `beta`   | Verifica cada `betaCheckIntervalHours` (predeterminado: cada hora) y aplica inmediatamente.                              |
| `dev`    | Sin aplicación automática. Use `openclaw update` manualmente.                                                            |

La puerta de enlace también registra un mensaje de actualización al inicio (desactívelo con `update.checkOnStart: false`).
Para la reversión o recuperación de incidentes, configure `OPENCLAW_NO_AUTO_UPDATE=1` en el entorno de la puerta de enlace para bloquear las aplicaciones automáticas incluso cuando `update.auto.enabled` esté configurado. Los mensajes de actualización al inicio aún pueden ejecutarse a menos que `update.checkOnStart` también esté desactivado.

Las actualizaciones del administrador de paquetes solicitadas a través del controlador del plano de control de la Gateway en vivo
no reemplazan el árbol de paquetes dentro del proceso de la Gateway en ejecución. En instalaciones
de servicios administrados, la Gateway inicia un traspaso separado, sale y permite que
la ruta normal de la CLI `openclaw update --yes --json` detenga el servicio, reemplace el
paquete, actualice los metadatos del servicio, se reinicie, verifique la versión de la Gateway y
la accesibilidad, y recupere un LaunchAgent de macOS instalado pero no cargado cuando
sea posible. Si la Gateway no puede realizar ese traspaso de manera segura, `update.run` reporta un
comando de shell seguro en lugar de ejecutar el administrador de paquetes dentro del proceso.

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

## Reversión

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
- Para `openclaw update --channel dev` en checkouts de fuente, el actualizador auto-inicializa `pnpm` cuando es necesario. Si ves un error de inicialización de pnpm/corepack, instala `pnpm` manualmente (o vuelve a habilitar `corepack`) y vuelve a ejecutar la actualización.
- Consulta: [Solución de problemas](/es/gateway/troubleshooting)
- Pregunta en Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Relacionado

- [Resumen de instalación](/es/install): todos los métodos de instalación.
- [Doctor](/es/gateway/doctor): comprobaciones de salud después de las actualizaciones.
- [Migración](/es/install/migrating): guías de migración de versiones principales.
