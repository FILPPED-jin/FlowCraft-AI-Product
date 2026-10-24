# FlowCraft AI Resume Project Brief
> Purpose: This document is the factual source for writing a Chinese resume entry for an AI Product Manager role. Do not invent production-scale results, online revenue, user growth, or unfinished Benchmark metrics.

## 1. Project positioning

**Project name:** FlowCraft AI

**Role positioning:** AI Product Manager / AI product and engineering hybrid

**One-line description:** A multi-agent interaction-prototype generation and evaluation platform that converts screenshots, product requirements, and interaction priorities into runnable HTML prototypes, then evaluates their task coverage, state completeness, visual fidelity, and semantic fidelity.

FlowCraft AI was developed from a screenshot-to-code foundation. The product problem was not simply to reproduce pixels. Traditional screenshot-to-code tools often generate static pages, copy the reference product's business language, and provide no reliable way to determine whether the resulting prototype can complete the user's intended task. FlowCraft therefore reframed the workflow from "copy a page" to "understand a task, migrate a design language, generate an interactive experience, and evaluate whether it works."

## 2. User and business problem

### Target users

- Product managers who need to turn product ideas into testable prototypes quickly.
- Designers who want to reuse a reference design language without copying its original business content.
- AI application teams that need a measurable generation and evaluation workflow rather than one-off prompt demos.

### Core pain points

1. Static screenshot reproduction does not guarantee that a core business task can be completed.
2. A model may copy source-page text and semantics even when the user wants a different product scenario.
3. Prompt-only generation lacks explicit states such as validation, confirmation, loading, failure, recovery, and success.
4. Visual quality and functional quality are often judged subjectively and cannot be compared consistently.
5. Repeated full-page regeneration increases model cost and may damage parts that were already correct.

## 3. Requirement definition and prioritization

The product brief was structured into four inputs:

- **Core Task:** the primary user outcome that the generated prototype must support.
- **Required Details:** mandatory business states, fields, validations, recovery paths, and confirmation steps.
- **Reference Evidence:** screenshot-derived layout, density, typography, colors, spacing, components, and visual hierarchy.
- **Scenario Template:** supplementary domain guidance rather than the source of truth.

The generation authority was explicitly defined as:

1. Core Task
2. Required Details
3. Screenshot visual and layout evidence
4. Scenario-template suggestions

This priority prevents a generic template from overriding an explicit user request. It also separates visual migration from semantic migration: the system may preserve the reference page's structural language while replacing its content and interaction logic with the target business scenario.

## 4. Agent architecture

The workflow contains four principal capability stages.

### 4.1 Visual analysis

The visual-analysis stage converts screenshots into a structured `ReferenceDesignSpec`, including:

- layout pattern and normalized regions;
- column proportions and spacing rhythm;
- information density and typography hierarchy;
- color, border, radius, shadow, and component patterns;
- desktop/mobile structural evidence.

For dense grid references, noisy OCR fragments are consolidated into stable structural regions such as title, view tabs, filters, grouped data area, and contextual overlay. This normalization applies only when the screenshot evidence indicates a dense grid; it is not a universal page template.

### 4.2 Semantic mapping

`SemanticMappingSpec` maps source visual regions to target business meanings. Screenshot pixels and OCR text are treated as visual evidence, not as target copy. High-priority layout characteristics are retained while source-brand terms and source workflows are removed.

Three fidelity modes support different product intents:

- Inspired: reuse broad visual ideas.
- Balanced: preserve recognizable structure while allowing adaptation.
- Faithful: preserve high-priority structure and design language while replacing business semantics.

### 4.3 Prototype generation

The generation stage produces runnable HTML through the configured model path, with DeepSeek supported through an OpenAI-compatible provider. Prompts include the product brief, structured design evidence, semantic mapping, responsive requirements, and interaction-state expectations.

Generation validation was updated to accept complete HTML documents that use valid non-`main` roots, avoiding false rejection of otherwise runnable outputs. Prompt compaction and provider compatibility were also improved to reduce avoidable failures and paid retries.

### 4.4 Evaluation and repair direction

Evaluation is being upgraded from keyword presence checks to task- and state-oriented assessment. The target loop is:

`Generate -> Execute task -> Detect gaps -> Apply local repair -> Re-evaluate -> Compare`

The architecture keeps generation quality and evaluation logic conceptually separate: evaluation observes the generated prototype and reports gaps; it does not silently weaken or rewrite the user's original product requirements. Any repair should be bounded, compared with the original result, and rolled back if the page breaks or the score falls.

## 5. Evaluation framework

### 5.1 Product-quality funnel

The intended funnel metrics are:

1. Input parsing success rate
2. Requirement-structuring completeness
3. First-pass generation success rate
4. Core-task completion rate
5. Required-state coverage
6. Visual-fidelity pass rate
7. Semantic-migration pass rate
8. Repair success rate
9. Human acceptance rate

### 5.2 Quality dimensions

- **Core task coverage:** whether the prototype supports the requested business outcome.
- **Required state coverage:** whether validation, confirmation, loading, error, success, and recovery states exist where required.
- **Behavior validity:** whether controls cause observable and correct state transitions.
- **Visual structure similarity:** whether major regions, proportions, density, and hierarchy match the reference intention.
- **Design-system consistency:** whether typography, spacing, borders, radii, colors, and components form a coherent system.
- **Semantic fidelity:** whether target business concepts are present and source-product concepts are absent.
- **Responsive quality:** whether desktop and mobile layouts remain usable.

### 5.3 Commercial and risk metrics

These metrics are defined for the five-scenario Benchmark but have not yet been fully measured:

- model cost per generation;
- cost per human-accepted prototype;
- average token use and model-call count;
- average generation and repair latency;
- manual prototyping time saved;
- retry rate and runtime-error rate;
- score-regression rate after repair;
- source-semantic leakage rate;
- human rejection rate.

Recommended calculation examples:

- `Effective prototype cost = total model cost / human-accepted outputs`
- `Time saved = manual baseline time - AI generation and correction time`
- `Repair ROI = value of manual time saved by repair - incremental model cost`

The product should use P95/P99 latency, token ceilings, runtime errors, semantic leakage, and human rejection as guardrail metrics. Do not claim these as measured production results yet.

## 6. Verified implementation and result

### Completed and verified

- Established the requirement priority: Core Task > Required Details > visual evidence > template guidance.
- Implemented structured visual evidence through `ReferenceDesignSpec`.
- Implemented semantic-region mapping through `SemanticMappingSpec`.
- Added Inspired, Balanced, and Faithful reference-fidelity modes.
- Prevented raw screenshot OCR/business copy from being treated as target-product content.
- Added visual-structure and design-system scoring utilities to the Benchmark data model.
- Improved DeepSeek compatibility, HTML validation, and prompt compaction.
- Preserved desktop and mobile output requirements.
- Integrated the sandboxed changes into the main local repository.
- Passed 3 targeted test suites containing 8 automated tests during the integration verification.

### Representative end-to-end scenario

A complex SaaS onboarding and workspace-launch scenario was generated and inspected end to end. Its requirements included:

- create a Q4 Launch workspace;
- invite a product designer;
- assign and review an Editor permission;
- create a launch-readiness task with owner, due date, and blocking dependency;
- expose invalid-email and duplicate-email validation;
- support confirmation, retry, resend, revoke, and back-to-edit paths;
- remain usable on desktop and mobile.

The generated result contained the target concepts `Q4 Launch`, `Editor`, `Invite`, `Blocking`, and `workspace`. Source-reference concepts such as `Sprint board`, `Launch new feature`, `Maintain service`, `Sprint 2`, and `Backlog` were absent. This provides evidence of combined visual-structure migration and business-semantic migration for one representative case.

### Current measurement boundary

- One representative complex SaaS case has been run end to end.
- A full five-scenario Benchmark has **not** been completed.
- An interim automated report displayed 71% overall coverage and 77% state coverage, but code inspection found evaluator false negatives. These percentages must not be presented as final business results.
- There is no production user sample, revenue lift, retention lift, or statistically valid A/B test.
- The five-scenario Benchmark should later supply first-pass success, task completion, repair uplift, latency, token cost, and human acceptance data.

## 7. Product decisions that demonstrate AI PM capability

1. **Changed the product objective:** from pixel copying to task-complete interactive prototyping.
2. **Defined authority boundaries:** explicit user requirements outrank model/template suggestions.
3. **Separated visual and semantic fidelity:** the system can preserve design language without copying source business content.
4. **Made quality measurable:** generation is evaluated across behavior, state coverage, visual structure, semantics, and responsiveness.
5. **Introduced cost awareness:** the Benchmark design records calls, tokens, latency, retries, repair uplift, and human acceptance.
6. **Added risk controls:** bounded repair rounds, regression comparison, failure rollback direction, and human evaluation alongside automatic scores.
7. **Avoided metric inflation:** one verified case is reported as a case validation, not as production-scale performance.

## 8. Resume-ready Chinese version

**FlowCraft AI | 多 Agent 交互原型生成与评测平台 | AI 产品经理**

**项目背景：** 针对传统 Screen-to-Code 仅能复刻静态页面、业务语义理解弱且生成质量缺乏统一标准的问题，主导设计从视觉参考到可交互 HTML 原型的生成与评测平台。

**需求定义：** 将需求拆解为核心任务、必要状态、视觉约束与交互策略，确立“核心任务 > 必要状态 > 视觉证据 > 场景模板”的优先级，覆盖异常校验、失败恢复及多端适配。

**Agent 架构：** 设计视觉解析、语义映射、代码生成与质量评测链路；以 ReferenceDesignSpec 提取布局、密度和设计令牌，通过 SemanticMappingSpec 完成业务内容映射，避免复制参考页面原始语义。

**评测体系：** 从关键词检查升级为任务状态覆盖评测，围绕任务完成度、必要状态、异常恢复、视觉结构相似度及设计系统一致性识别缺口；设计生成、评测、局部修复与复测机制，并设置 Token、时延和运行错误护栏。

**项目结果：** 跑通复杂 SaaS 场景端到端验证，覆盖邀请、权限复核、异常校验、任务及依赖配置等 4 类关键交互；完成 5 类页面结构的视觉迁移、目标业务语义替换和桌面/移动端适配，源业务关键词残留为 0，并通过 3 个测试套件共 8 项自动化测试。

## 9. Metrics to replace after the five-scenario Benchmark

Only replace the final resume result after collecting real data. The desired format is:

> 在自建 5 类业务场景 Benchmark 中，首次生成成功率为 [A]%，自动修复后核心任务完成率由 [B]% 提升至 [C]%；单次有效原型模型成本为 [D] 元，平均交付时间由人工基线 [E] 小时缩短至 [F] 分钟，人工验收通过率为 [G]%。

Required raw fields per case:

| Field | Definition |
| --- | --- |
| First-pass runnable | Generated HTML loads without a critical error |
| Core-task completion | Required business path can be completed |
| Required-state coverage | Covered required states / total required states |
| Repair uplift | Post-repair score minus first-pass score |
| Human acceptance | Human reviewer accepts visual, interaction, and business quality |
| Model calls | Total generation, evaluation, and repair calls |
| Token usage | Input and output tokens per accepted prototype |
| Latency | End-to-end generation and repair duration |
| Model cost | Provider cost for the complete case |
| Manual baseline | Time needed to build an equivalent prototype manually |

## 10. Prompt for ChatGPT

Use the following prompt together with this document:

> 请基于这份项目事实，为 AI 产品经理岗位撰写一段 350-450 字的中文简历项目经历。必须包含项目背景、需求定义、Agent 架构、评测体系搭建和项目结果，突出商业指标意识、业务漏斗、实验护栏与 AI 不确定性治理。只允许使用文档中标记为已完成或已验证的事实；不得虚构线上用户量、收入、A/B 测试结论或尚未完成的 5 场景 Benchmark 数据。表达要像成熟 AI 产品经理的简历，而不是功能清单；使用“问题-决策-机制-结果”结构，并准备 3 个面试追问及对应回答。
