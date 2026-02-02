> [!NOTE]
> 本页正在翻译中。

---
summary: "macOS 上 OpenClaw 的菜单栏图标状态与动画"
read_when:
  - 修改菜单栏图标行为
---
# 菜单栏图标状态

作者：steipete · 更新：2025-12-06 · 范围：macOS 应用（`apps/macos`）

- **Idle：** 正常图标动画（眨眼、偶尔抖动）。
- **Paused：** 状态栏项使用 `appearsDisabled`；无动画。
- **Voice trigger（大耳朵）：** 语音唤醒检测在听到唤醒词时调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕获话语期间保持 `earBoostActive=true`。耳朵放大（1.9x）、为可读性加入圆形耳洞，然后在 1 秒静默后通过 `stopVoiceEars()` 恢复。仅由应用内语音管线触发。
- **Working（代理运行中）：** `AppState.isWorking=true` 驱动“尾巴/腿快速摆动”的微动作：更快的腿部抖动与轻微位移。当前在 WebChat 代理运行期间切换；接入其他长任务时同样加上切换。

接线点
- 语音唤醒：runtime/tester 在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，在 1 秒静默后调用 `stopVoiceEars()` 以匹配捕获窗口。
- 代理活动：在工作区间周围设置 `AppStateStore.shared.setWorking(true/false)`（WebChat 代理调用已做）。确保区间短，并在 `defer` 中重置，避免动画卡住。

形状与尺寸
- 基础图标由 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)` 绘制。
- 耳朵缩放默认 `1.0`；语音增强设置 `earScale=1.9` 并切换 `earHoles=true`，不改变整体画幅（18×18 pt 模板图渲染到 36×36 px Retina backing store）。
- 奔跑效果使用腿部抖动至约 1.0，并加入轻微水平抖动；它会叠加到任何现有的 idle 抖动上。

行为说明
- 外部 CLI/broker 不提供耳朵/工作状态的开关；保持内部信号，避免误触发。
- TTL 保持较短（<10s），避免任务挂起时图标长时间不恢复。
