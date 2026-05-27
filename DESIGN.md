---
omd: 0.1
brand: Taglow Survey Admin
bootstrapped_from: linear.app
bootstrapped_at: 2026-05-27T15:42:17Z
---

<!-- omd:limitation The local oh-my-design reference DESIGN.md for linear.app was not installed. This system uses the installed `linear.app` fingerprint plus Taglow PRD/TDD requirements. -->

# Taglow Survey Admin Design System

## 1. Product Role

Taglow Survey Admin is an analysis workbench for student organizations. It helps an admin move from survey creation to evidence-backed decisions without opening a separate spreadsheet, statistics tool, or report editor.

The first screen should answer one question:

> What needs attention right now?

The product should feel precise, quiet, and fast. It should not feel like a marketing site, a generic form builder, or an academic statistics package.

## 2. Design Direction

Base reference: `linear.app`

Use Linear's discipline, not a clone:

- compact surfaces,
- calm contrast,
- crisp hierarchy,
- restrained accent color,
- low-noise borders,
- fast command-oriented controls.

Taglow-specific adjustment:

- default to a light analytical canvas for long reading,
- use near-black chrome for navigation and focus,
- reserve the indigo accent for selected state and primary action,
- use semantic colors for status, warning, danger, and evidence.

## 3. Token Contract

All UI styling should consume CSS variables from `src/components/css/design-tokens.css`.

Do not hard-code hex values, font stacks, shadows, spacing, or radii in page/component CSS unless the token does not exist and the new value is added to the token file first.

Token naming:

```text
--tg-color-*
--tg-text-*
--tg-bg-*
--tg-border-*
--tg-space-*
--tg-radius-*
--tg-shadow-*
--tg-font-*
--tg-duration-*
```

Semantic token usage wins over raw palette usage. For example, use `--tg-bg-panel` before `--tg-color-white`.

## 4. Color

### Palette

| Role | Token | Value | Use |
|---|---:|---|---|
| App canvas | `--tg-bg-app` | `#F7F8FA` | Main workspace background |
| Panel | `--tg-bg-panel` | `#FFFFFF` | Cards, tables, forms |
| Raised panel | `--tg-bg-raised` | `#FBFCFE` | Slightly elevated surfaces |
| Inset | `--tg-bg-inset` | `#F1F3F7` | Filters, code-like metadata, empty slots |
| Chrome | `--tg-bg-chrome` | `#0D0E12` | Sidebar, command bar, dark preview shell |
| Text strong | `--tg-text-strong` | `#111217` | Primary text |
| Text body | `--tg-text-body` | `#343741` | Body and table text |
| Text muted | `--tg-text-muted` | `#6B7280` | Secondary labels |
| Text faint | `--tg-text-faint` | `#9AA1AF` | Helper text |
| Border | `--tg-border-subtle` | `#E6E8EF` | Default separators |
| Strong border | `--tg-border-strong` | `#D1D5E0` | Inputs, selected containers |
| Accent | `--tg-accent` | `#5E6AD2` | Primary action, selected tab, focus |
| Accent soft | `--tg-accent-soft` | `#EEF0FF` | Selected row/background |
| Success | `--tg-success` | `#18805C` | Published, valid, complete |
| Warning | `--tg-warning` | `#B7791F` | Low-N, interpretation caution |
| Danger | `--tg-danger` | `#C2413B` | Blocking validation, destructive |
| Info | `--tg-info` | `#2472B8` | Neutral analysis info |

### Rules

- Most screens should read as neutral, not purple or blue.
- Accent color should cover less than 8% of a normal dashboard viewport.
- Warning and danger must be semantic only. Do not use them for decoration.
- Low-N warnings use amber, not red, unless the result is blocked.
- Published/valid states use green, not the primary accent.
- Tables and charts should prefer neutral ink with one semantic highlight.

## 5. Typography

Font stack:

```css
Inter, Pretendard, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Use zero letter spacing. Do not use Linear's negative tracking because this admin app needs Korean/English mixed readability.

| Role | Size | Line | Weight | Use |
|---|---:|---:|---:|---|
| Page title | 24px | 32px | 650 | Route-level titles |
| Section title | 18px | 26px | 620 | Dashboard/card groups |
| Card title | 15px | 22px | 620 | Analysis card titles |
| Body | 14px | 22px | 450 | Default UI text |
| Dense body | 13px | 20px | 450 | Tables and side panels |
| Caption | 12px | 18px | 500 | Labels, metadata, badges |
| Metric | 28px | 34px | 660 | Primary stat values |
| Mono | 12px | 18px | 500 | Slugs, ids, keys, code-like values |

Rules:

- Use smaller, tighter headings inside dashboards and panels.
- Do not use hero-scale type inside operational screens.
- Use `tabular-nums` for metrics, counts, rankings, and table numerals.
- Korean labels should be direct and short; avoid ornate nouns.

## 6. Spacing And Layout

Base spacing scale:

```text
2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48
```

Layout tokens:

- sidebar width: 248px,
- collapsed sidebar width: 64px,
- top bar height: 56px,
- filter bar height: 48px minimum,
- page max width: 1440px,
- dense panel width: 360px,
- right inspector width: 400px.

Rules:

- Dashboard pages are dense but breathable.
- Use page CSS for route grid and component CSS for internal layout.
- Keep table rows 40-44px high.
- Keep filter chips and badges stable; text changes must not shift surrounding layout.
- Sticky Global Filter Bar should remain visually quiet and never cover content.

## 7. Radius, Border, Shadow

Radii:

| Token | Value | Use |
|---|---:|---|
| `--tg-radius-xs` | 4px | Small controls, badges |
| `--tg-radius-sm` | 6px | Buttons, inputs |
| `--tg-radius-md` | 8px | Cards, panels, modals |
| `--tg-radius-pill` | 999px | Pills, status badges only |

Cards must stay at 8px or below.

Borders carry most depth. Shadows are rare and shallow.

Shadows:

- `--tg-shadow-xs`: focusable popovers, menus,
- `--tg-shadow-sm`: modals and floating panels,
- avoid large decorative shadows.

## 8. Components

### Buttons

- Primary: indigo fill, white text, used for one main action per screen.
- Secondary: white panel, strong border, strong text.
- Ghost: transparent, muted text, subtle hover.
- Danger: red only for irreversible or destructive actions.

Buttons should use icons for common commands when an icon is clear: copy, download, close, search, filter, preview, publish, archive.

### Inputs And Forms

- Inputs are 36-40px high.
- Labels use caption style and sit above controls.
- Validation errors show below the field and in the page validation panel when publish-blocking.
- Required state is explicit but not loud.
- Use segmented controls for locale, device, and view mode.

### Cards

Cards are white panels with a subtle border and 8px radius.

Card anatomy:

```text
title row
primary metric or table
evidence metadata
status/warning footer when needed
```

Never nest decorative cards inside cards. Use bands, rows, or divided sections.

### Tables

- Use 13px dense body.
- Row height: 40-44px.
- Header text: 12px, muted, medium weight.
- Numeric columns: right-aligned, tabular numbers.
- Low-N rows show amber badge and muted text, not a blocking red state.

### Badges

Status colors:

- draft: neutral,
- published: success,
- closed: muted,
- archived: faint,
- low-N: warning,
- blocking validation: danger,
- preview: accent.

Badges should be compact and stable.

## 9. Admin Page Patterns

### Survey Dashboard

The survey dashboard is an action summary, not a feature menu.

Priority order:

1. survey status and response count,
2. publish URL/QR action,
3. low-N warning,
4. improvement TOP 5,
5. recent activity.

### Builder

Use a three-zone workbench:

```text
sections/questions navigation
main editor
metadata/validation/preview inspector
```

Builder UI should keep analysis linkage visible: metric type, topic key, space key.

### Preview

Preview must feel like a real participant screen inside an admin shell.

- The admin chrome stays quiet.
- The preview area uses device sizing.
- Validation warnings sit beside or below the preview.
- Preview mode must be visibly marked.

### Analysis Workbench

Analysis screens start with the Global Filter Bar, then decision cards.

Priority order:

1. Improvement Priority TOP 5,
2. section/question averages,
3. group differences,
4. Borich/Locus,
5. text evidence,
6. heatmap evidence.

### Report Draft

Report draft screens should feel like assembling evidence, not designing a poster.

- Cards remain data-first.
- Every block keeps N, filters, and evidence.
- Export controls stay explicit.

## 10. Data Visualization

Charts must explain, not decorate.

Rules:

- Always show N near the chart title or legend.
- Show active filters near the chart.
- Use neutral axes and one accent highlight.
- Use semantic warning treatment for low sample sizes.
- Avoid gradients except heatmap density rendering.
- Heatmaps use normalized `x_ratio` and `y_ratio`.
- Tooltips show original context: group, N, score, and representative text when available.

Chart colors:

```text
primary series: --tg-accent
comparison series: --tg-chart-teal, --tg-chart-blue, --tg-chart-violet, --tg-chart-amber
warning: --tg-warning
danger: --tg-danger
neutral: --tg-chart-neutral
```

## 11. Voice

Voice is operational, exact, and calm.

Use:

- "해석 주의"
- "응답 수"
- "개선 우선순위"
- "근거 보기"
- "미리보기"
- "게시 전 검증"

Avoid:

- academic-first wording such as "통계적 유의성" unless paired with plain explanation,
- vague praise such as "좋은 인사이트",
- alarming copy for small samples,
- decorative metaphors.

Korean copy should use short noun phrases for labels and concise sentences for help text.

Example:

```text
N=4라 해석에 주의가 필요합니다.
```

Do not say:

```text
이 결과는 위험합니다.
```

## 12. States

### Loading

Use skeletons for table/card surfaces. Keep dimensions stable.

### Empty

Empty states should name the next action:

```text
아직 응답이 없습니다. 설문을 게시하면 응답 현황이 여기에 표시됩니다.
```

### Error

Errors should identify the failing action and recovery path.

### Low Sample

Low sample is a caution state, not a failure.

### Validation

Publish-blocking validation is red and actionable. Non-blocking recommendations are amber or neutral.

## 13. Motion

Motion should make state changes legible.

Tokens:

- fast: 120ms,
- base: 180ms,
- slow: 240ms,
- easing: `cubic-bezier(0.2, 0, 0, 1)`.

Rules:

- Hover and focus transitions use 120-180ms.
- Panel open/close uses 180-240ms.
- Avoid bouncing, overshoot, or decorative motion.
- Respect `prefers-reduced-motion`.

## 14. Accessibility

- Text contrast must meet WCAG AA.
- Focus states use the accent ring and must remain visible on light and dark chrome.
- Interactive elements must be semantic buttons/links/inputs.
- Charts need text summaries.
- Heatmap points need keyboard-accessible lists or an equivalent evidence panel.
- Korean pages use `lang="ko"` where applicable.

## 15. Implementation Contract

Global CSS entry:

```css
@import "./components/css/base.css";
```

Token file:

```text
src/components/css/design-tokens.css
```

Rules:

- Add new visual values to `design-tokens.css` first.
- Page CSS consumes tokens for layout and page composition.
- Component CSS consumes tokens for component internals.
- Shared tokens belong in `src/components/css`.
- Feature styles stay under `src/view/**`.
- If DESIGN.md changes, update token CSS and oh-my-design shims in the same change.
