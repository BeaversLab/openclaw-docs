---
summary: "2026年5月性能、包大小、依赖和收缩包清理的可视化摘要和技术证据"
read_when:
  - You are validating the May 2026 performance and package-size cleanup
  - You need the numbers behind the OpenClaw performance and dependency blog post
  - You are changing release gates, package shrinkwrap, or plugin dependency boundaries
title: "发布性能扫描"
---

本页面记录了2026年5月OpenClaw性能、包大小、依赖和收缩包清理背后的证据。这是公开博客文章的技术伴侣。

此处结合了两项审计：

- **Release performance sweep:** GitHub Releases from GitHub`v2026.5.28` back through
  stable `v2026.4.23`, using the `OpenClaw Performance` workflow,
  `profile=smoke`, mock-提供商 lane. Most tag rows are one sample; the
  `v2026.5.27` and `v2026.5.28` rows use the latest repeat-3 release-branch
  artifacts.
- **Earlier April context:** published `clawgrit-reports` mock-提供商
  baselines from `v2026.4.1` through `v2026.5.2`, used only to avoid treating
  the broken late-April releases as the public performance baseline.
- **Install footprint sweep:** fresh `npm install --ignore-scripts` installs
  into temporary packages, with `du -sk node_modules` for size and a
  `node_modules` walk for package-instance counts.
- **npm package size sweep:** npm`npm pack openclaw@<version> --dry-run --json`
  for published releases, recording compressed tarball size, unpacked size, and
  file count.

<Warning>The main performance sweep uses one smoke sample per tag, except the `v2026.5.27` and `v2026.5.28` rows, which use the latest repeat-3 release-branch artifacts. Earlier April context uses published repeat-3 medians from `clawgrit-reports`. Treat the numbers as trend evidence and regression-hunting signal, not as release-gate statistics.</Warning>

## 快照

Performance coverage: **77 requested releases**, **74 artifact-backed points**,
and **3 unavailable CI runs**. Latest stable measured point: `v2026.5.28`.

<CardGroup cols={2}>
  <Card title="Stable agent turn" icon="gauge">
    **5.1x faster cold turn**

    - `v2026.4.14`: 9.8s
    - `v2026.5.28`: 1.9s

  </Card>
  <Card title="Published package" icon="package">
    **17.9MB tarball**

    Latest stable package, down from the 43.3MB March package-size peak.

  </Card>
  <Card title="Latest stable install" icon="hard-drive">
    **361.7MiB 全新安装**

    `v2026.5.28` 大幅削减了嵌套的 OpenClaw 依赖树，但在本地安装审计中，
    仍残留一个较小的 259.7MiB 嵌套树。

  </Card>
  <Card title="Dependency graph" icon="boxes">
    **300 个已安装包**

    最新稳定版发布，以禁用脚本后的全新安装中唯一的包名称/版本根节点进行测量。

  </Card>
</CardGroup>

## 安装占用时间线

<CardGroup cols={2}>
  <Card title="Monthly high" icon="triangle-alert">
    **645 个依赖项**

    `2026.2.26` 是此样本中依赖项数量的月度最高值。

  </Card>
  <Card title="Shrinkwrap introduced" icon="lock">
    **1,020.6MB 安装**

    `2026.5.22` 添加了根 shrinkwrap 并暴露了一个包形状问题：
    911.8MB 落在了嵌套的 `openclaw/node_modules` 下。

  </Card>
  <Card title="Latest stable" icon="tag">
    **361.7MiB 安装**

    `2026.5.28` 将全新安装大小较 `2026.5.27` 减少了 52.8%，但仍
    安装了一个 259.7MiB 的嵌套 OpenClaw 树。

  </Card>
  <Card title="Dependency graph" icon="scissors">
    **300 个包根节点**

    `2026.5.28` 比 `2026.5.27` 少安装了 71 个唯一的包名称/版本根节点。

  </Card>
</CardGroup>

<Tip>Shrinkwrap 本身并不是问题所在。糟糕的包形状才是。 `v2026.5.28` 仍然附带 shrinkwrap，但嵌套依赖树要小得多，且本地审计中全平台 canvas 扩散已不复存在。</Tip>

## 5.28 版本中的变更

`v2026.5.27` 和 `v2026.5.28` 之间的清理工作减少了默认安装图，而不是移除功能本身。

<CardGroup cols={2}>
  <Card title="Root default graph" icon="git-branch">
    唯一的包名称/版本根目录从 **371** 降至 **300**。包实例从 **372** 降至 **301**。
  </Card>
  <Card title="Nested tree" icon="unplug">
    在相同的本地安装审计中，嵌套的 `openclaw/node_modules` 从 **656.1MiB** 降至 **259.7MiB**。
  </Card>
  <Card title="Native optional cones" icon="cpu">
    所有平台的 `@napi-rs/canvas` 原生包锥体不再包含在默认安装中。
  </Card>
  <Card title="Supply-chain surface" icon="shield">
    默认包变少意味着更少的 tarball、维护者、原生二进制文件、 安装时行为以及默认情况下需要信任的传递性更新路径。
  </Card>
</CardGroup>

## 头条数据

不要将 4 月下旬损坏的行作为公共性能基准。`v2026.4.23` 和 `v2026.4.29` 是有用的回归证据，但巨大的 `14x` 式增量主要描述了从糟糕的发布版本中恢复的情况。

对于博客叙事，请使用四月初发布的基准作为衡量标准：

| 指标             | 四月初基准 | `v2026.5.28` |                  增量 |
| ---------------- | ---------: | -----------: | --------------------: |
| 冷代理轮次       |    9,819ms |      1,908ms | 降低 80.6%，快 5.1 倍 |
| Agent 热启动轮次 |    7,458ms |      1,870ms | 降低 74.9%，快 4.0 倍 |
| Agent 峰值 RSS   |    686.2MB |      581.0MB |            降低 15.3% |

较早的 4 月基准是已发布的 `clawgrit-reports` 模拟提供商运行中的 `v2026.4.14`。该运行使用了重复 3 次，失败仅因为未发出诊断时间线；冷启动、热启动和 RSS 中位数仍可用作粗略的规模参考。请将其视为叙述性背景，而非发布门槛统计数据。

在 5 月扫描中，最新的发布分支行从 `v2026.5.2` 有了显著变化：

| 指标             | `v2026.5.2` | `v2026.5.28` |       差值 |
| ---------------- | ----------: | -----------: | ---------: |
| Agent 冷启动轮次 |     3,897ms |      1,908ms | 降低 51.0% |
| Agent 热启动轮次 |     3,610ms |      1,870ms | 降低 48.2% |
| Agent 峰值 RSS   |     613.7MB |      581.0MB |  降低 5.3% |

与之前的稳定版本相比：

| 指标             | `v2026.5.27` | `v2026.5.28` |       差值 |
| ---------------- | -----------: | -----------: | ---------: |
| Agent 冷启动轮次 |      2,231ms |      1,908ms | 降低 14.5% |
| Agent 热启动轮次 |      2,226ms |      1,870ms | 降低 16.0% |
| Agent 峰值 RSS   |      649.0MB |      581.0MB | 降低 10.5% |

### 安装占用

| 指标                                            |      基线 | `v2026.5.28` |       差值 |
| ----------------------------------------------- | --------: | -----------: | ---------: |
| 从 `2026.5.22` 峰值以来的安装大小               | 1,020.6MB |     361.7MiB | 降低 64.6% |
| 最新版本 `2026.5.27` 的安装体积                 |  767.1MiB |     361.7MiB | 降低 52.8% |
| 月度峰值 `2026.2.26` 的依赖项                   |       645 |          300 | 降低 53.5% |
| 最新版本 `2026.5.27` 的依赖项                   |       371 |          300 | 降低 19.1% |
| 来自 `2026.5.22` 的嵌套 `openclaw/node_modules` |   911.8MB |     259.7MiB | 降低 71.5% |
| 来自 `2026.5.27` 的嵌套 `openclaw/node_modules` |  656.1MiB |     259.7MiB | 降低 60.4% |

### npm 包大小

| 版本        | 压缩包 |  解压包 |   文件 | 备注                     |
| ----------- | -----: | ------: | -----: | ------------------------ |
| `2026.1.30` | 12.8MB |  33.5MB |  4,607 | 早期重新命名的包         |
| `2026.2.26` | 23.6MB |  82.9MB | 10,125 | 功能增长                 |
| `2026.3.31` | 43.3MB | 182.6MB | 21,037 | 包大小高点               |
| `2026.4.29` | 22.9MB |  74.6MB |  9,309 | 包修剪效果可见           |
| `2026.5.12` | 23.4MB |  80.1MB | 12,035 | 主要外部插件拆分         |
| `2026.5.22` | 17.2MB |  76.9MB | 12,386 | 已从包中排除 docs/assets |
| `2026.5.27` | 17.8MB |  79.0MB | 12,509 | 之前的稳定包             |
| `2026.5.28` | 17.9MB |  81.0MB |  9,082 | 最新的稳定包             |

`2026.5.12` 是变更日志中可见的插件提取里程碑：Amazon Bedrock、Bedrock Mantle、Slack、OpenShell 沙箱、Anthropic Vertex、Matrix 和 WhatsApp 已从核心依赖路径中移出，因此它们的依赖关系锥体随这些插件一起安装，而不是随每次核心安装安装。

## Kova 代理轮次摘要

4 月的稳定线包含两个不同的故事。4 月初虽然缓慢但尚可识别。4 月下旬则成为了回归悬崖。`v2026.5.2` 是模拟提供商通道首次降至 3-5 秒范围并开始在提供的扫描中持续通过的位置。

之前发布的上下文：

| 版本         | Kova | 冷启动轮次 | 预热轮次 | 代理峰值 RSS |
| ------------ | ---- | ---------: | -------: | -----------: |
| `v2026.4.10` | 失败 |   11,031ms |  7,962ms |      679.0MB |
| `v2026.4.12` | 失败 |   11,965ms |  8,289ms |      713.5MB |
| `v2026.4.14` | 失败 |    9,819ms |  7,458ms |      686.2MB |
| `v2026.4.20` | 失败 |   22,314ms | 18,811ms |      810.8MB |
| `v2026.4.22` | 失败 |    9,630ms |  7,459ms |      743.0MB |

提供的扫描：

| 版本                | Kova | 冷启动轮次 |   预热轮次 | 代理峰值 RSS |
| ------------------- | ---- | ---------: | ---------: | -----------: |
| `v2026.4.23`        | 失败 |   47,847ms |    8,010ms |    1,082.7MB |
| `v2026.4.24`        | 失败 |   48,264ms |   25,483ms |      996.0MB |
| `v2026.4.25`        | 失败 |   81,080ms |   59,172ms |    1,113.9MB |
| `v2026.4.26`        | 失败 | 76,771毫秒 | 54,941毫秒 |    1,140.8MB |
| `v2026.4.27`        | 失败 | 60,902毫秒 | 33,699毫秒 |    1,156.0MB |
| `v2026.4.29`        | 失败 | 94,031毫秒 | 57,334毫秒 |    3,613.7MB |
| `v2026.5.2`         | 通过 |  3,897毫秒 |  3,610毫秒 |      613.7MB |
| `v2026.5.7`         | 通过 |  3,923毫秒 |  3,693毫秒 |      654.1MB |
| `v2026.5.12`        | 通过 |  7,248毫秒 |  6,629毫秒 |      834.8MB |
| `v2026.5.18`        | 通过 |  3,301毫秒 |  2,913毫秒 |      630.3MB |
| `v2026.5.20`        | 通过 |  3,413毫秒 |  2,952毫秒 |      643.2MB |
| `v2026.5.22`        | 通过 |  4,494毫秒 |  4,093毫秒 |      654.3MB |
| `v2026.5.26`        | 通过 |  2,626毫秒 |  2,282毫秒 |      660.4MB |
| `v2026.5.27-beta.1` | 通过 |  2,575毫秒 |  2,217毫秒 |      635.3MB |
| `v2026.5.27`        | 通过 |  2,231毫秒 |  2,226毫秒 |      649.0MB |
| `v2026.5.28`        | 通过 |  1,908毫秒 |  1,870毫秒 |      581.0MB |

## 源探针

由于 17 个成功的旧引用尚未包含所需的探针入口点，因此跳过了它们的源探针。但这些引用仍存在代理轮次指标。

具有代表性的源探针点：

| 版本                | 默认 `readyz` p50 | 50 个插件 `readyz` p50 | CLI 运行状况 p50 | 插件最大 RSS |
| ------------------- | ----------------: | ---------------------: | ---------------: | -----------: |
| `v2026.4.29`        |         2,819毫秒 |              2,618毫秒 |        1,679毫秒 |      389.0MB |
| `v2026.5.2`         |         2,324毫秒 |              2,013毫秒 |        1,384毫秒 |      377.2MB |
| `v2026.5.7`         |         1,649毫秒 |              1,540毫秒 |        1,175毫秒 |      387.6MB |
| `v2026.5.18`        |         1,942毫秒 |              1,927毫秒 |          607毫秒 |      426.5MB |
| `v2026.5.20`        |         1,966毫秒 |              1,987毫秒 |          621毫秒 |      455.0MB |
| `v2026.5.22`        |         2,081毫秒 |              1,884毫秒 |        5,095毫秒 |      444.2MB |
| `v2026.5.26`        |         1,546毫秒 |              1,634毫秒 |          656毫秒 |      400.4MB |
| `v2026.5.27-beta.1` |         1,462毫秒 |              1,548毫秒 |          548毫秒 |      394.0MB |
| `v2026.5.27`        |         1,491毫秒 |              1,571毫秒 |          553毫秒 |      401.5MB |
| `v2026.5.28`        |         1,457毫秒 |              1,474毫秒 |          623毫秒 |      386.1MB |

即使代理轮次通道通过了，`v2026.5.22`CLICLI CLI 运行状况的峰值在此表中仍然可见。在调查特定的 CLI 或网关回归时，请保留源探针。

## 安装占用空间审核

依赖项样本每月使用一个稳定版本，外加 `2026.5.22` shrinkwrap-introduction 事件和最新的 `2026.5.28` 版本。

| 时间点              | 已安装依赖 |  全新安装 | OpenClaw 包 | 嵌套 `openclaw/node_modules` | 根 shrinkwrap | Canvas 安装行为                       |
| ------------------- | ---------: | --------: | ----------: | ---------------------------: | ------------- | ------------------------------------- |
| `2026.1.30` 年 1 月 |        605 |   438.4MB |      45.8MB |                        2.4MB | 否            | 顶层包装器 + `darwin-arm64`           |
| `2026.2.26` 年 2 月 |        645 |   575.7MB |     110.1MB |                        3.5MB | 否            | 顶层包装器 + `darwin-arm64`           |
| `2026.3.31` 年 3 月 |        438 |   584.1MB |     234.8MB |                          0MB | 否            | 顶层包装器 + `darwin-arm64`           |
| `2026.4.29` 年 4 月 |        392 |   335.0MB |      97.4MB |                          0MB | 否            | 未安装                                |
| `2026.5.22`         |        401 | 1,020.6MB |   1,020.4MB |                      911.8MB | 是            | 嵌套：所有 12 个 `@napi-rs/canvas` 包 |
| `2026.5.26` 年 5 月 |        371 |   767.5MB |     767.4MB |                      656.4MB | 是            | 嵌套：所有 12 个 `@napi-rs/canvas` 包 |
| `2026.5.27`         |        371 |  767.1MiB |    766.9MiB |                     656.1MiB | 是            | 嵌套：所有 12 个 `@napi-rs/canvas` 包 |
| 最新的 `2026.5.28`  |        300 |  361.7MiB |    361.6MiB |                     259.7MiB | 是            | 未安装                                |

### Shrinkwrap 边界

<CardGroup cols={2}>
  <Card title="Shrinkwrap 之前" icon="unlock">
    `2026.5.20` 没有根 shrinkwrap，也没有大型嵌套 OpenClaw 依赖树。
  </Card>
  <Card title="已引入" icon="lock">
    `2026.5.22` 添加了根 shrinkwrap，并在嵌套 `openclaw/node_modules` 下安装了 911.8MB。
  </Card>
  <Card title="最新稳定版" icon="tag">
    `2026.5.28` 保留了 shrinkwrap，并仍在嵌套 `openclaw/node_modules` 下安装了 259.7MiB。
  </Card>
  <Card title="CanvasCanvas fanout fixed" icon="check">
    `2026.5.28` 不再在本地 全新安装审核中安装任何 `@napi-rs/canvas` 包。
  </Card>
</CardGroup>

对已发布 tarball 的检查验证了边界：

| 版本        | 是否发布了稳定版？ | 根 `npm-shrinkwrap.json` | 备注                              |
| ----------- | ------------------ | ------------------------ | --------------------------------- |
| `2026.5.20` | 是                 | 否                       | shrinkwrap 之前的最后一个稳定版本 |
| `2026.5.21` | 否                 | n/a                      | 没有稳定的 npm 版本               |
| `2026.5.22` | 是                 | 是                       | 引入了 shrinkwrap                 |
| `2026.5.23` | 否                 | n/a                      | 没有稳定的 npm 版本               |
| `2026.5.24` | 否                 | 不适用                   | 没有稳定的 npm 版本               |
| `2026.5.25` | 否                 | n/a                      | 没有稳定的 npm 版本               |
| `2026.5.26` | 是                 | 是                       | 嵌套依赖树仍然存在                |
| `2026.5.27` | 是                 | 是                       | 嵌套依赖树仍然存在                |
| `2026.5.28` | 是                 | 是                       | 嵌套依赖树小了很多                |

重要的区别在于：**shrinkwrap 本身并不是问题所在**。
`v2026.5.28`npmOpenClaw 仍然附带根 shrinkwrap。问题在于包的形态导致
npm 实例化了一个巨大的嵌套 OpenClaw 依赖树以及所有 12 个
`@napi-rs/canvas` 平台包。在 `v2026.5.28` 中，嵌套树变小了，
并且 canvas 平台分支不再出现在本地审核中。

有关 shrinkwrap 的通俗解释以及维护者级别的包检查，请参阅 [npm shrinkwrap](npm/en/gateway/security/shrinkwrap)。

## 供应链解读

依赖数量是一个运营安全指标，而不仅仅是安装大小指标。
每个包都会增加维护者、tarball、传递性更新、可选原生二进制文件
以及运维人员必须信任的安装时行为的集合。

清理的方向是：

- 将繁重和可选的功能保留在默认核心安装之外
- 使插件包拥有其自己的运行时依赖关系图
- 避免在 Gateway(网关) 启动期间进行运行时包管理器修复
- 在保持确定性安装的同时，避免导致所有平台的本机包具体化
- 在包验收和测量路径中保持安装脚本处于禁用状态
- 在发布之前捕获嵌套的依赖关系树和本机可选依赖项激增

相关文档：

- [插件依赖解析](/zh/plugins/dependency-resolution)
- [插件清单](/zh/plugins/plugin-inventory)
- [完整发布验证](/zh/reference/full-release-validation)
