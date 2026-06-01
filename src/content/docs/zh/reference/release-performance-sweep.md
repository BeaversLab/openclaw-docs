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

- **发布性能扫描：** 从 GitHub`v2026.5.27` 回溯至
  稳定版 `v2026.4.23` 的 GitHub 发布，使用 `OpenClaw Performance` 工作流，
  `profile=smoke`、`repeat=1`、mock-提供商 通道。
- **4月初的背景：** 从 `v2026.4.1` 到 `v2026.5.2` 发布了 `clawgrit-reports` mock-提供商
  基准，仅用于避免将
  损坏的4月下旬发布版本作为公共性能基准。
- **安装占用空间扫描：** 将全新的 `npm install --ignore-scripts` 安装
  到临时包中，使用 `du -sk node_modules` 检查大小，并使用
  `node_modules` 遍历统计包实例数量。
- **npm 包大小扫描：** 针对已发布发布版本的 npm`npm pack openclaw@<version> --dry-run --json`
  ，记录压缩的 tarball 大小、解压大小和
  文件数量。

<Warning>主要性能扫描对每个标签使用一个冒烟样本。4月初的背景 使用来自 `clawgrit-reports` 的已发布重复3次的中位数。请将这些数字视为 趋势证据和回归搜索信号，而非发布门控统计数据。</Warning>

## 快照

性能覆盖范围：**76个请求的发布**，**73个由工件支持的点**，
以及 **3个不可用的 CI 运行**。最新测量的稳定版点：`v2026.5.27`。

<CardGroup cols={2}>
  <Card title="Stable agent turn" icon="gauge">
    **冷启动快 2.9 倍**

    - `v2026.4.14`: 9.8s
    - `v2026.5.27`: 3.4s

  </Card>
  <Card title="已发布的包" icon="package">
    **17.8MB 压缩包**

    最新的稳定包，较 3 月份 43.3MB 的包大小峰值有所下降。

  </Card>
  <Card title="最新稳定安装" icon="hard-drive">
    **786.9MB 全新安装**

    `v2026.5.27`OpenClaw 仍包含嵌套的 OpenClaw 依赖树。`main` 上的下一版本状态为 407.4MB。

  </Card>
  <Card title="依赖关系图" icon="boxes">
    **371 个已安装的包**

    最新的稳定版本。当前的 `main` 在后续依赖清理后已降至 314 个。

  </Card>
</CardGroup>

## 安装占用时间线

<CardGroup cols={2}>
  <Card title="月度高点" icon="triangle-alert">
    **645 个依赖项**

    `2026.2.26` 是此样本中月度依赖项数量的高点。

  </Card>
  <Card title="引入 Shrinkwrap" icon="lock">
    **1,020.6MB 安装**

    `2026.5.22` 添加了根 shrinkwrap 并暴露了一个包形状问题：911.8MB 落在了嵌套的 `openclaw/node_modules` 下。

  </Card>
  <Card title="最新稳定版" icon="tag">
    **786.9MB 安装**

    `2026.5.27`OpenClaw 降低了峰值，但仍安装了 675.9MB 的嵌套 OpenClaw 树。

  </Card>
  <Card title="下一版本状态" icon="scissors">
    **407.4MB 安装**

    当前的 `main` 保留了 shrinkwrap，移除了嵌套树，并安装了 314 个包。

  </Card>
</CardGroup>

<Tip>Shrinkwrap 本身并不是问题所在。糟糕的包结构才是。当前的 `main`npmOpenClaw 仍然附带 shrinkwrap，但 npm 在安装过程中不再物化第二个 OpenClaw 依赖树。</Tip>

## 5.27 之后的变化

在 `v2026.5.27` 和当前 `main` 之间的清理工作移除了重复的
默认安装图，而不是移除这些功能本身。

<CardGroup cols={2}>
  <Card title="Root default graph" icon="git-branch">
    Root shrinkwrap 包路径从 **372** 下降到 **331**。唯一包 名称从 **357** 下降到 **318**。
  </Card>
  <Card title="Direct root dependencies" icon="unplug">
    `@earendil-works/pi-agent-core`、`@earendil-works/pi-ai`、 `@earendil-works/pi-coding-agent` 和 `pdfjs-dist` 离开了默认根 依赖路径。
  </Card>
  <Card title="Native optional cones" icon="cpu">
    全平台的 `@napi-rs/canvas` 和 `@mariozechner/clipboard` 原生 包锥体不再落入默认安装中。
  </Card>
  <Card title="Supply-chain surface" icon="shield">
    默认包变少意味着更少的 tarball、维护者、原生二进制文件、 安装时行为以及默认情况下需要信任的传递性更新路径。
  </Card>
</CardGroup>

## 头条数据

不要将四月下旬的损坏行作为公开的性能基准。
`v2026.4.23` 和 `v2026.4.29` 是有用的回归证据，但巨大的
`14x` 样式的增量主要描述了从一个糟糕的发布版本行的恢复情况。

对于博客叙事，请使用四月初发布的基准作为衡量标准：

| 指标             | 四月初基准 | `v2026.5.27` |                  增量 |
| ---------------- | ---------: | -----------: | --------------------: |
| 冷代理轮次       |    9,819ms |      3,378ms | 降低 65.6%，快 2.9 倍 |
| Agent 热启动轮次 |    7,458ms |      2,973ms | 降低 60.1%，快 2.5 倍 |
| Agent 峰值 RSS   |    686.2MB |      635.5MB |             降低 7.4% |

较早的四月基线是已发布的 `v2026.4.14` mock-提供商 运行中的 `clawgrit-reports`。该运行使用了 repeat 3 并仅因未输出诊断时间线而失败；冷启动、热启动和 RSS 的中位数仍可作为大致规模的参考。请将其视为叙述性背景，而非发布门禁统计信息。

在单样本五月份稳定版本扫描中，曲线变动较为温和：

| 指标             | `v2026.5.2` | `v2026.5.27` |       差值 |
| ---------------- | ----------: | -----------: | ---------: |
| Agent 冷启动轮次 |     3,897ms |      3,378ms | 降低 13.3% |
| Agent 热启动轮次 |     3,610ms |      2,973ms | 降低 17.6% |
| Agent 峰值 RSS   |     613.7MB |      635.5MB |  增加 3.6% |

单样本扫描中最佳的预发布节点：

| 指标             | `v2026.5.27` | `v2026.5.27-beta.1` |       差值 |
| ---------------- | -----------: | ------------------: | ---------: |
| Agent 冷启动轮次 |      3,378ms |             2,575ms | 降低 23.8% |
| Agent 热启动轮次 |      2,973ms |             2,217ms | 降低 25.4% |
| Agent 峰值 RSS   |      635.5MB |             635.3MB |       持平 |

### 安装占用

| 指标                                            |      基线 | 当前 main 分支 |       差值 |
| ----------------------------------------------- | --------: | -------------: | ---------: |
| 从 `2026.5.22` 峰值开始的安装大小               | 1,020.6MB |        407.4MB | 降低 60.1% |
| 从最新版本 `2026.5.27` 开始的安装大小           |   786.9MB |        407.4MB | 降低 48.2% |
| 从月度高点 `2026.2.26` 开始的依赖项             |       645 |            314 | 降低 51.3% |
| 从最新版本 `2026.5.27` 开始的依赖项             |       371 |            314 | 降低 15.4% |
| 来自 `2026.5.22` 的嵌套 `openclaw/node_modules` |   911.8MB |            0MB |     已移除 |
| 来自 `2026.5.27` 的嵌套 `openclaw/node_modules` |   675.9MB |            0MB |     已移除 |

### npm 包大小

| 版本        | 压缩包 |  解压包 |   文件 | 备注                     |
| ----------- | -----: | ------: | -----: | ------------------------ |
| `2026.1.30` | 12.8MB |  33.5MB |  4,607 | 早期重新命名的包         |
| `2026.2.26` | 23.6MB |  82.9MB | 10,125 | 功能增长                 |
| `2026.3.31` | 43.3MB | 182.6MB | 21,037 | 包大小高点               |
| `2026.4.29` | 22.9MB |  74.6MB |  9,309 | 包修剪效果可见           |
| `2026.5.12` | 23.4MB |  80.1MB | 12,035 | 主要外部插件拆分         |
| `2026.5.22` | 17.2MB |  76.9MB | 12,386 | 已从包中排除 docs/assets |
| `2026.5.27` | 17.8MB |  79.0MB | 12,509 | 最新的稳定包             |

`2026.5.12` 是变更日志中可见的插件提取里程碑：
Amazon Bedrock、Bedrock Mantle、Slack、OpenShell sandbox、Anthropic Vertex、
Matrix 和 WhatsApp 已从核心依赖路径中移出，因此它们的依赖
锥体与这些插件一起安装，而不是在每次核心安装时安装。

## Kova Agent 轮次摘要

4 月稳定线包含两个不同的故事。4 月初速度较慢
但可以识别。4 月下旬成为回归悬崖。`v2026.5.2` 是
mock-提供商 lane 首次降至 3-5 秒范围并开始
在提供的扫描中持续通过的节点。

先前发布的背景：

| 发布         | Kova |   冷轮次 |   热轮次 | Agent 峰值 RSS |
| ------------ | ---- | -------: | -------: | -------------: |
| `v2026.4.10` | 失败 | 11,031ms |  7,962ms |        679.0MB |
| `v2026.4.12` | 失败 | 11,965ms |  8,289ms |        713.5MB |
| `v2026.4.14` | 失败 |  9,819ms |  7,458ms |        686.2MB |
| `v2026.4.20` | 失败 | 22,314ms | 18,811ms |        810.8MB |
| `v2026.4.22` | 失败 |  9,630ms |  7,459ms |        743.0MB |

提供的单样本扫描：

| 发布                | Kova |   冷轮次 |   热轮次 | Agent 峰值 RSS |
| ------------------- | ---- | -------: | -------: | -------------: |
| `v2026.4.23`        | 失败 | 47,847ms |  8,010ms |      1,082.7MB |
| `v2026.4.24`        | 失败 | 48,264ms | 25,483ms |        996.0MB |
| `v2026.4.25`        | 失败 | 81,080ms | 59,172ms |      1,113.9MB |
| `v2026.4.26`        | 失败 | 76,771ms | 54,941ms |      1,140.8MB |
| `v2026.4.27`        | 失败 | 60,902ms | 33,699ms |      1,156.0MB |
| `v2026.4.29`        | 失败 | 94,031ms | 57,334ms |      3,613.7MB |
| `v2026.5.2`         | 通过 |  3,897ms |  3,610ms |        613.7MB |
| `v2026.5.7`         | 通过 |  3,923ms |  3,693ms |        654.1MB |
| `v2026.5.12`        | 通过 |  7,248ms |  6,629ms |        834.8MB |
| `v2026.5.18`        | 通过 |  3,301ms |  2,913ms |        630.3MB |
| `v2026.5.20`        | 通过 |  3,413ms |  2,952ms |        643.2MB |
| `v2026.5.22`        | 通过 |  4,494ms |  4,093ms |        654.3MB |
| `v2026.5.26`        | 通过 |  2,626ms |  2,282ms |        660.4MB |
| `v2026.5.27-beta.1` | 通过 |  2,575ms |  2,217ms |        635.3MB |
| `v2026.5.27`        | 通过 |  3,378ms |  2,973ms |        635.5MB |

## Source probes

由于 17 个成功的旧引用尚不具备所需的探测入口点，因此跳过了这些引用的 Source probes。这些引用仍存在 Agent-turn 指标。

具有代表性的 Source-probe 点：

| Release             | Default `readyz` p50 | 50 plugins `readyz` p50 | CLI health p50 | Plugin max RSS |
| ------------------- | -------------------: | ----------------------: | -------------: | -------------: |
| `v2026.4.29`        |              2,819ms |                 2,618ms |        1,679ms |        389.0MB |
| `v2026.5.2`         |              2,324ms |                 2,013ms |        1,384ms |        377.2MB |
| `v2026.5.7`         |              1,649ms |                 1,540ms |        1,175ms |        387.6MB |
| `v2026.5.18`        |              1,942ms |                 1,927ms |          607ms |        426.5MB |
| `v2026.5.20`        |              1,966ms |                 1,987ms |          621ms |        455.0MB |
| `v2026.5.22`        |              2,081ms |                 1,884ms |        5,095ms |        444.2MB |
| `v2026.5.26`        |              1,546ms |                 1,634ms |          656ms |        400.4MB |
| `v2026.5.27-beta.1` |              1,462ms |                 1,548ms |          548ms |        394.0MB |
| `v2026.5.27`        |              1,874ms |                 1,925ms |          660ms |        398.0MB |

即使 agent-turn lane 仍然通过，`v2026.5.22` CLI health 峰值在此表中也是可见的。在调查定向的 CLI 或 gateway 回退时，请保留 source probes。

## Install footprint audit

依赖样本每月使用一个 stable release，加上 `2026.5.22` shrinkwrap-introduction 事件、最新的 `2026.5.27` 和当前的 `main`。

| Point              | Installed deps | Fresh install | OpenClaw package | Nested `openclaw/node_modules` | Root shrinkwrap | Canvas install behavior                   |
| ------------------ | -------------: | ------------: | ---------------: | -----------------------------: | --------------- | ----------------------------------------- |
| Jan `2026.1.30`    |            605 |       438.4MB |           45.8MB |                          2.4MB | no              | top-level wrapper + `darwin-arm64`        |
| Feb `2026.2.26`    |            645 |       575.7MB |          110.1MB |                          3.5MB | no              | top-level wrapper + `darwin-arm64`        |
| Mar `2026.3.31`    |            438 |       584.1MB |          234.8MB |                            0MB | no              | top-level wrapper + `darwin-arm64`        |
| `2026.4.29`月      |            392 |       335.0MB |           97.4MB |                            0MB | no              | none installed                            |
| `2026.5.22`        |            401 |     1,020.6MB |        1,020.4MB |                        911.8MB | yes             | nested: all 12 `@napi-rs/canvas` packages |
| `2026.5.26`月      |            371 |       767.5MB |          767.4MB |                        656.4MB | yes             | nested: all 12 `@napi-rs/canvas` packages |
| Latest `2026.5.27` |            371 |       786.9MB |          786.7MB |                        675.9MB | yes             | nested: all 12 `@napi-rs/canvas` packages |
| Current `main`     |            314 |       407.4MB |          101.0MB |                            0MB | yes             | top-level wrapper + `darwin-arm64`        |

### Shrinkwrap boundary

<CardGroup cols={2}>
  <Card title="Before shrinkwrap" icon="unlock">
    `2026.5.20` has no root shrinkwrap and no large nested OpenClaw dependency tree.
  </Card>
  <Card title="Introduced" icon="lock">
    `2026.5.22` adds root shrinkwrap and installs 911.8MB under nested `openclaw/node_modules`.
  </Card>
  <Card title="Latest stable" icon="tag">
    `2026.5.27` keeps shrinkwrap and still installs 675.9MB under nested `openclaw/node_modules`.
  </Card>
  <Card title="Current main" icon="check">
    `main` keeps shrinkwrap and removes the nested OpenClaw dependency tree.
  </Card>
</CardGroup>

Published tarball inspection verifies the boundary:

| Version     | Published stable? | Root `npm-shrinkwrap.json` | Notes                                 |
| ----------- | ----------------- | -------------------------- | ------------------------------------- |
| `2026.5.20` | yes               | no                         | last stable release before shrinkwrap |
| `2026.5.21` | no                | n/a                        | no stable npm release                 |
| `2026.5.22` | yes               | yes                        | shrinkwrap introduced                 |
| `2026.5.23` | 否                | 不适用                     | 没有稳定的 npm 版本                   |
| `2026.5.24` | 否                | 不适用                     | 没有稳定的 npm 版本                   |
| `2026.5.25` | 否                | 不适用                     | 没有稳定的 npm 版本                   |
| `2026.5.26` | 是                | 是                         | 嵌套依赖树仍然存在                    |
| `2026.5.27` | 是                | 是                         | 嵌套依赖树仍然存在                    |
| `main`      | 不适用            | 是                         | 嵌套依赖树已移除                      |

重要的区别在于：**shrinkwrap 本身并不是问题所在**。当前的 `main` 仍然附带了根 shrinkwrap。问题在于包的形状导致 npm 实例化了一个庞大的嵌套 OpenClaw 依赖树以及所有 12 个 `@napi-rs/canvas` 平台包。

有关 shrinkwrap 的通俗解释以及维护者级别的包检查，请参阅 [npm shrinkwrap](/zh/gateway/security/shrinkwrap)。

## 供应链解读

依赖数量是一个操作安全指标，而不仅仅是一个安装大小指标。每个包都会扩展维护者、tar 包、传递性更新、可选原生二进制文件以及操作员必须信任的安装时行为的集合。

清理方向为：

- 将繁重的和可选的功能保留在默认核心安装之外
- 使插件包拥有其运行时依赖关系图
- 避免在 Gateway(网关) 启动期间进行运行时包管理器修复
- 保持确定性安装，同时避免导致所有平台的原生包实例化
- 在包接受和测量路径中保持禁用安装脚本
- 在发布之前捕获嵌套依赖树和原生可选依赖的激增

相关文档：

- [插件依赖解析](/zh/plugins/dependency-resolution)
- [插件清单](/zh/plugins/plugin-inventory)
- [完整发布验证](/zh/reference/full-release-validation)

## 不可用的性能运行

| 发布                | 运行                                                                         | 结果   | 原因                                                                       |
| ------------------- | ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `v2026.5.3-1`       | [26561664645](https://github.com/openclaw/openclaw/actions/runs/26561664645) | 失败   | mock-提供商 作业失败：CLI 启动超时，等待 qa-渠道 就绪；未报告 qa-渠道 账户 |
| `v2026.5.3`         | [26561666722](https://github.com/openclaw/openclaw/actions/runs/26561666722) | 失败   | mock-提供商 作业失败：CLI 启动超时，等待 qa-渠道 就绪；未报告 qa-渠道 账户 |
| `v2026.4.29-beta.2` | [26561683635](https://github.com/openclaw/openclaw/actions/runs/26561683635) | 已取消 | 可选基线获取在上传产物之前挂起                                             |

## 后续检查

根据此次扫描建议的版本检查：

1. 为发布候选版本运行 mock-提供商 性能冒烟测试并保留产物。
2. 跟踪冷启动、热启动、代理 RSS、Gateway Gateway(网关)`readyz`CLI 和 CLI 运行状况。
3. 在禁用脚本的情况下全新安装打包的 tarball。
4. 记录已安装的依赖项数量、安装大小、程序包大小、嵌套 `openclaw/node_modules` 大小以及本机可选程序包形态。
5. 当嵌套依赖树或所有平台本机程序包意外出现时，失败或暂停发布审查。
