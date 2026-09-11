---
summary: "Index of the OpenClaw testing reference, one page per reader job"
read_when:
  - Running or fixing tests
title: "Tests"
---

- Full testing kit (suites, live, Docker): [Testing](/en/help/testing)
- Update and plugin package validation: [Testing updates and plugins](/en/help/testing-updates-plugins)

This page is an index. The testing reference is documented on six pages, one
per reader job. Open the page that matches your task.

| Page                                                           | Read it when                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Run tests locally](/en/reference/test/local)                     | The routine local order, the core command table, and the local PR gate.            |
| [Control UI, TUI, and E2E lanes](/en/reference/test/lanes)        | Control UI, TUI, extension, Gateway, and live lane commands and fixture rules.     |
| [Docker test suites](/en/reference/test/docker)                   | The weighted Docker scheduler, its knobs, and the notable Docker lanes.            |
| [Test performance and benchmarks](/en/reference/test/performance) | Import profiling, CPU and heap profiles, shard timings, and the benchmark scripts. |
| [Test runner internals](/en/reference/test/runner-internals)      | Shared build locks, isolated test state and homes, and JSON report merging.        |
| [Remote test proof](/en/reference/test/remote-proof)              | When agents use Crabbox or Testbox, and the wrapper, lease, and trust rules.       |

## Where each section moved

Every section heading from the previous single-page version keeps its anchor
here, so an existing link such as `/reference/test#core-commands` still
resolves. Each entry points at the page that now holds the content.

- <a id="agent-default" />[Agent default](/en/reference/test/remote-proof#agent-default)
- <a id="crabbox-repository-setup" />[Crabbox repository setup](/en/reference/test/remote-proof#crabbox-repository-setup)
- <a id="routine-local-order" />[Routine local order](/en/reference/test/local#routine-local-order)
- <a id="core-commands" />[Core commands](/en/reference/test/local#core-commands)
- <a id="source-tests-and-subprocess-builds" />[Source tests and subprocess builds](/en/reference/test/local#source-tests-and-subprocess-builds)
- <a id="shared-test-state-and-process-helpers" />[Shared test state and process helpers](/en/reference/test/runner-internals#shared-test-state-and-process-helpers)
- <a id="control-ui%2C-tui%2C-and-extension-lanes" /><a id="control-ui-tui-and-extension-lanes" />[Control UI, TUI, and extension lanes](/en/reference/test/lanes#control-ui-tui-and-extension-lanes)
- <a id="real-gateway-control-ui-fixture-lifetimes" />[Real-Gateway Control UI fixture lifetimes](/en/reference/test/lanes#real-gateway-control-ui-fixture-lifetimes)
- <a id="retained-mocked-control-ui-proof" /><a id="retained-control-ui-proof" />[Retained Control UI proof](/en/reference/test/lanes#retained-control-ui-proof)
- <a id="screenshots-during-chromium-recordings" />[Screenshots during Chromium recordings](/en/reference/test/lanes#screenshots-during-chromium-recordings)
- <a id="gateway-and-e2e" />[Gateway and E2E](/en/reference/test/lanes#gateway-and-e2e)
- <a id="full-docker-suite-(pnpm-test%3Adocker%3Aall)" /><a id="full-docker-suite-pnpm-testdockerall" />[Full Docker suite](/en/reference/test/docker#full-docker-suite-pnpm-testdockerall)
- <a id="notable-docker-lanes" />[Notable Docker lanes](/en/reference/test/docker#notable-docker-lanes)
- <a id="sandbox-compatibility-lanes" />[Sandbox compatibility lanes](/en/reference/test/docker#sandbox-compatibility-lanes)
- <a id="local-pr-gate" />[Local PR gate](/en/reference/test/local#local-pr-gate)
- <a id="json-reports-across-native-processes" />[JSON reports across native processes](/en/reference/test/runner-internals#json-reports-across-native-processes)
- <a id="test-performance-tooling" />[Test performance tooling](/en/reference/test/performance#test-performance-tooling)
- <a id="benchmarks" />[Benchmarks](/en/reference/test/performance#benchmarks)
- <a id="model-latency-scripts-bench-model-ts" />[Model latency benchmark](/en/reference/test/performance#model-latency-scripts-bench-model-ts)
- <a id="cli-startup-scripts-bench-cli-startup-ts" />[CLI startup benchmark](/en/reference/test/performance#cli-startup-scripts-bench-cli-startup-ts)
- <a id="gateway-startup-scripts-bench-gateway-startup-ts" />[Gateway startup benchmark](/en/reference/test/performance#gateway-startup-scripts-bench-gateway-startup-ts)
- <a id="gateway-restart-scripts-bench-gateway-restart-ts" />[Gateway restart benchmark](/en/reference/test/performance#gateway-restart-scripts-bench-gateway-restart-ts)
- <a id="onboarding-e2e-(docker)" /><a id="onboarding-e2e-docker" />[Onboarding E2E (Docker)](/en/reference/test/docker#onboarding-e2e-docker)
- <a id="qr-import-smoke-(docker)" /><a id="qr-import-smoke-docker" />[QR import smoke (Docker)](/en/reference/test/docker#qr-import-smoke-docker)

## Related

- [Testing](/en/help/testing)
- [Testing live](/en/help/testing-live)
- [Testing updates and plugins](/en/help/testing-updates-plugins)
