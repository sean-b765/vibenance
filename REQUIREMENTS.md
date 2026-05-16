# Personal Finance Modelling — Requirements

## 1. Overview

A local-first, single-user web application for modelling personal finances. Users track current net worth and project future financial scenarios over user-defined time horizons.

**Primary use cases:**

1. View current net worth at a glance on a dashboard.
2. Model and save/edit "scenarios" (investing monthly, taking a 1-year sabbatical, paying off loans early, job loss, etc.) and compare them against a base "current position".

## 2. Tech Stack

| Layer            | Choice                         |
| ---------------- | ------------------------------ |
| Framework        | Vue 3 + TypeScript             |
| Build tool       | Vite                           |
| State management | Pinia                          |
| Charting         | Apache ECharts via vue-echarts |
| UI components    | shadcn-vue                     |
| Styling          | Tailwind CSS                   |
| Persistence      | IndexedDB via Dexie.js         |
| Routing          | Vue Router                     |
| Testing          | Vitest                         |
| Package manager  | pnpm                           |
| Linter/formatter | Biome                          |
| Deployment       | Static site (user-handled)     |

No git hooks. No CI/CD. No backend. No authentication.

### 2.1 Folder Structure

Use a flat folder structure, according to the Nuxt 3 folder structure.

- ./types
- ./components
- ./stores
- ./layouts
- ./pages
- ./test
- ./utils
- ./core/engine
- ./core/schemas
- ...and so on...

## 2.1 Conventions

- Always use camel case naming.
- When importing, always use "@/" to scope to the root of the project. Do not use relative imports, unless absolutely necessary in the test folder.
- Use UUIDv7 whenever generating IDs.
- Always store dates as ISO-8601 timestamps.

## 3. Domain Model

### 3.1 Entity Discriminator Pattern

All cash-flow and account entities use a `type` discriminator field for variant behaviour. The entity class defines structure and behaviour; `type` distinguishes variants within that class.

### 3.2 Entities

#### Asset

```ts
{
  id: string
  name: string
  type: "account_cash" | "account_savings" | "account_offset" | "account_investment" | "property" | "vehicle" ...
  snapshots: Snapshot[]
  growth: Growth
  linkedLiabilityId?: string
  startDate: string
  endDate?: string
  tagIds: string[]
}
```

#### Liability

```ts
{
  id: string
  name: string
  type: "mortgage" | "personal_loan" | "credit_card" | "car_loan"
  snapshots: Snapshot[]
  growth: Growth
  startDate: string
  endDate?: string
  repayment: number
  paymentFrequency: Frequency
  sourceAccountId: string
  creditCardGracePeriodDays?: number
  creditCardRevolving?: boolean
  tagIds: string[]
}
```

#### Income

```ts
{
  id: string
  name: string
  type: "wage" | "winnings" | "inheritance" | ...
  amount: number
  pretax: boolean
  destinationAccountId: string
  frequency?: Frequency // null for one-off
  paymentDate?: string
  startDate: string
  endDate?: string
  tagIds: string[]
}
```

#### Expense

```ts
{
  id: string
  name: string
  type: string
  amount: number
  sourceAccountId: string
  frequency: Frequency
  paymentDate: string
  fixed: boolean
  startDate: string
  endDate?: string
  tagIds: string[]
}
```

#### Transfer

```ts
{
  id: string
  name: string
  type: "one-off" | "ongoing"
  sourceAccountId: string
  destinationAccountId: string
  amount: number
  frequency: Frequency
  startDate: string
  endDate?: string
  tagIds: string[]
}
```

#### Tag

```ts
{
	id: string
	name: string
	colour: string // hex
	system: boolean // true for built-in defaults
}
```

System tags (auto-created on first launch, renameable but not deletable): `Liability`, `Asset`, `Income`, `Expense`, `Transfer`.

#### Settings

```ts
export type settings = {
  "currency": "AUD"
  "inflationRate": number
  "taxConfig": { "jurisdiction": "AU", ... }
  "theme": "system" | "dark" | "light"
}
```

### 3.3 Frequency Type

```ts
type Frequency =
	| 'daily'
	| 'weekly'
	| 'fortnightly'
	| 'monthly'
	| 'quarterly'
	| 'semi-annually'
	| 'annually'
```

### 3.4 Interest Type(s)

```ts
export type GrowthType = 'simple' | 'compounding'

export type Growth = {
	type: GrowthType
	compoundingFrequency?: Frequency
	// The default interest rate
	rate: number
	// If rates change over time = variable interest rate
	variableRates?: RatePeriod[]
	// If the current day does not fall into any of the variable time-buckets, we default to the base interest rate
}

export type RatePeriod = {
	startDate: string
	endDate?: string
	rate: number
}
```

### 3.5 Snapshots

```ts
export type Snapshot = { date: string; value: number; actual: boolean }
```

- Append-only. Each time a user updates the balance of an entity, the update creates a new `{ date, value, actual: true }` entry.
- Projections are computed live, never persisted as snapshots.
- Projection always begins from the most recent snapshot per entity (not from "today" if snapshot is stale).
- Graph shows actual snapshots in past + computed projections going forward.

## 4. Scenarios

### 4.1 Storage Model

- Scenarios stored as `scenarios: Scenario[]` in Pinia + IndexedDB via Dexie.
- **Each scenario owns a full copy of all entities.** No shared references, no override layers.
- v1 ships with single-scenario UI; multi-scenario capability is in the data model from day one.

### 4.2 Scenario Schema

```ts
{
  id: string
  name: string
  colour: string                                  // hex, used in graph overlays
  favourite: boolean                              // pinned to dashboard
  horizonYears: number                            // user-defined
  inflationRate: number                           // overrides global default per scenario
  entities: {
    assets, liabilities, incomes, expenses, transfers
  }
  notes?: string
}
```

### 4.3 Base Scenario

- Always present, auto-created on first launch.
- Represents "do nothing" — entities exist but no future events. Only passive interest, appreciation, and configured recurring cash flows continue.
- Cannot be deleted.

### 4.4 Operations

- Create, duplicate, rename, delete (non-base), favourite, recolour.
- Clone individual entities between scenarios.
- Move entities between scenarios.

## 5. Simulation Engine

### 5.1 Time Step

**Daily.** 30-year horizon = ~10,950 steps per scenario. Target: <100ms for full projection.

### 5.2 Per-Day Loop

For each scenario, for each day from latest snapshot date to scenario end date:

1. Process any cash flows due that day (income, expense, transfer, loan repayment, investment contribution).
2. Apply daily interest accrual on accounts (using configured compounding frequency).
3. Apply daily interest accrual on loans, using `effectiveBalance = loanBalance - linkedOffsetBalance` where applicable.
4. Apply daily appreciation or depreciation (`growth` field) on assets.
5. Compute and emit net worth for the day.

### 5.3 Offset Account Logic

```
effectiveLoanBalance = loanBalance - sum(offsetAccountBalances where linkedLoanId == loan.id)
dailyInterest = effectiveLoanBalance * (annualRate / 365)
```

On scheduled repayment day:

```
principal = repayment - accruedInterest
loanBalance -= principal
```

Offset balance fluctuates with income/expense/transfer flows day by day.

### 5.4 Tax

- **Income tax only for v1.**
- Tax brackets loaded from JSON config (`config/tax/au-2026.json` etc.), jurisdiction selectable in settings.
- Wage income stored pretax; engine applies marginal brackets to compute net deposited each pay period.
- No CGT, no investment income tax, no super contribution tax.

### 5.5 Inflation

- Single global rate, default 2.5%, overridable per-scenario.
- Affects: expense growth (annually compounded), graph display toggle ("nominal $" vs "today's $").

### 5.6 Variable Rate Loans

Manual rate schedule: `variableRates: RatePeriod[]`. Engine looks up applicable rate by date. No base-rate linking, no macro modelling.

### 5.7 Net Worth Formula

```
netWorth = sum(assets) - sum(liabilities)
```

Income and expenses are not summed into _current_ net worth; they flow through accounts over time.

## 6. UI / UX

### 6.1 Routes

- `/` — Dashboard
- `/scenarios` — Scenario list, create, compare
- `/scenarios/:id` — Scenario detail (graph + entity panel)
- `/entities` — Flat entity list, filter by tag/type/name
- `/settings` — Tax config, inflation default, currency, dark mode, import/export, sample data toggle

### 6.2 Dashboard Tiles

- **Net worth headline** — large number, delta vs last month
- **Composition donut** — assets, liabilities
- **Favourite scenarios chart** — small graph showing 2–3 favourite scenarios over time
- **Warnings panel** — stale snapshots, financial red flags

### 6.3 Graph

- **Library**: Apache ECharts (vue-echarts).
- **Engine**: daily simulation; graph **downsamples** to chosen bucket (day / week / month) for render speed.
- **Y-axis modes**: net worth line (single) **or** stacked breakdown by entity type. Toggle.
- **Multi-scenario overlay**: selector above graph chooses scenarios; user picks colour per scenario. Lines render as overlay on same chart.
- **Diff table** below overlay graph: net worth per scenario at chosen milestone dates, with absolute and percent deltas.
- **Zoom and pan** built-in (ECharts native).

### 6.4 Empty State

Empty dashboard with two buttons: **"Try with sample data"** and **"Import JSON"**.

Sample dataset = realistic Australian mid-career profile (see §10).

### 6.5 Responsive Design

- **Desktop-first**, **mobile-readable**.
- Full editing UX targets desktop.
- Mobile: dashboard viewing, balance updates, graph interaction. No multi-field entity forms optimised for mobile in v1.

### 6.6 Dark Mode

System-default with manual override (`system / light / dark`). Persisted in localStorage. shadcn-vue + Tailwind `dark:` classes.

### 6.7 Number and Date Formatting

- **Currency**: `$1,234.56` via `Intl.NumberFormat` with `en-AU`. 2 decimals for display, full precision internally.
- **Large numbers on graph axes**: abbreviated (`$1.2M`, `$450K`).
- **Percentages**: 2 decimals for display, full precision internally.
- **Dates**: `12 May 2026` for display, `YYYY-MM-DD` (ISO) for inputs and storage.

### 6.8 Validation

- **Hard block** on structural impossibilities: missing required fields, `endDate < startDate`, negative balances where impossible.
- **Soft warnings** on financial red flags: repayment less than monthly interest, interest rate > 100%, stale snapshot date. Warning chips on entity rows and dashboard warnings panel.

### 6.9 Keyboard Shortcuts

Skip for v1.

### 6.10 Accessibility

**WCAG AA** target. Leverage shadcn-vue / Radix Vue defaults. Semantic HTML, labelled form inputs, focus states, sufficient colour contrast. No formal audit.

### 6.11 Undo / Redo, Bulk Operations

Skip for v1. Confirm dialogs on destructive actions.

## 7. Persistence

### 7.1 Local Storage

- **IndexedDB via Dexie.js** for all entity, scenario, tag, and settings data.
- Dexie versioned schema migrations.

### 7.2 Export / Import

JSON schema with top-level version:

```json
{
  "version": 1,
  "exportedAt": "2026-05-12T...",
  "scenarios": [...],
  "tags": [...],
  "settings": {
    "currency": "AUD",
    "inflationRate": 0.025,
    "taxConfig": { "jurisdiction": "AU", ... },
    "theme": "system"
  }
}
```

- Import detects version, runs migrations to current schema, writes upgraded version back.
- Round-trip export → import → export always yields latest schema.

## 8. Settings

- Currency: display only, default AUD. No multi-currency conversion.
- Inflation rate: default 2.5%, overridable globally and per scenario.
- Tax config: dropdown selecting from `config/tax/*.json` files.
- Theme: `system / light / dark`.
- Sample data toggle.
- Export JSON button.
- Import JSON button.

## 9. Testing

- **Vitest** for unit tests.
- Coverage targets: utils, stores, helpers, with **deep coverage on simulation engine** including:
  - Daily interest accrual (simple, compound, varying compounding frequencies)
  - Offset account interaction with loan
  - Variable rate schedule lookup
  - Tax bracket application
  - Inflation real-vs-nominal conversion
  - Snapshot interpolation and projection start logic
  - Frequency-based cash flow scheduling (every Thursday, fortnightly, monthly Nth, etc.)
  - Credit card grace period
  - Transfer entity affecting two account balances
  - Edge cases: zero-balance, negative interest, end dates in past, missing snapshots

## 10. Sample Dataset

Realistic AU mid-career single profile:

- **Loans**: 1 home loan ($600k, variable 6%, 25yr, offset-linked), 1 credit card ($0 balance, $10k limit, 55-day grace period)
- **Assets**: 1 property ($900k value, 4% appreciation), 1 cash account ($5k), 1 savings account ($30k), 1 offset account ($80k linked to home loan), 1 investment account ($50k balance, $1k/month contribution, 7% expected return)
- **Income**: 1 wage ($120k/yr pretax, fortnightly Thursdays, 3% growth)
- **Expenses**: 4 recurring (groceries, utilities, insurance, fuel)
- **Scenarios**: "Base" + "Pay extra $500/mo on mortgage"

## 11. MVP Scope

In:

- All entities above with CRUD
- Snapshot append-only history per entity
- Daily simulation engine with all features in §5
- Dashboard tiles (§6.2)
- Single scenario projection on graph
- Scenario multi-select overlay + diff table
- Tag system with system + custom tags
- JSON export / import with versioned migration
- Sample data
- Settings page
- Dark mode
- Validation
- Tax (income only, AU brackets default)
- Inflation toggle
- All listed routes

Out (post-MVP):

- Superannuation as dedicated entity (model with Investment for now)
- CGT, investment income tax
- Multi-currency
- Backend sync, auth, sharing
- Mobile-optimised editing
- Undo/redo
- Bulk operations
- Keyboard shortcuts / command palette
- E2E tests

## 12. Open Questions / Future Considerations

- How to handle cash flows that fall on weekends or public holidays (currently ignored; flow occurs on configured day regardless).
