# Alex Pricing Strategy — From Free App to Paid Product

**Date:** March 22, 2026

---

## Part 1: What You Need Before Salesforce Lets You Charge Money

Alex is currently a free managed package on AppExchange. Moving to paid listings requires meeting Salesforce's ISV (Independent Software Vendor) partner requirements. Here's everything you need to arrange.

### 1.1 Legal Entity (KVK Registration — Netherlands)

You need a registered business entity. In the Netherlands, this means a **KVK (Kamer van Koophandel)** registration.

**Options:**

| Entity Type | KVK Cost | Setup Time | Notes |
|-------------|----------|------------|-------|
| **Eenmanszaak** (Sole proprietorship) | Free | 1 week | Simplest. You're personally liable. Fine to start with. |
| **BV** (Private limited company) | ~€500–2,000 (notary) | 2–4 weeks | Limited liability. Required if you want investors or want to separate personal from business risk. |

**Recommendation:** Start with an **eenmanszaak**. You can convert to a BV later when revenue justifies it. An eenmanszaak is sufficient for Salesforce's ISV partnership and for invoicing customers.

**What you get from KVK:**
- KVK number (required for invoicing in the EU)
- BTW-nummer (VAT number) — issued by Belastingdienst after KVK registration
- Legal standing to enter into commercial agreements (including Salesforce's partner agreement)

**Action items:**
1. Register at [kvk.nl](https://kvk.nl) — you can do this online or book an appointment at a KVK office
2. Choose your SBI code (business activity code): **6201 — Computer programming** or **6209 — Other IT services**
3. After registration, register for BTW (VAT) with the Belastingdienst — this usually happens automatically
4. Open a business bank account (Bunq, N26, or any Dutch bank)

### 1.2 Salesforce Partner Program

You need to be in the **Salesforce Partner Program** as an **ISV Partner** (not just a consulting partner).

**Steps:**

1. **Join the Salesforce Partner Community** at [partners.salesforce.com](https://partners.salesforce.com)
   - Apply as an ISV (Independent Software Vendor)
   - Requires a business entity (your KVK registration)
   - Free to join at the base tier

2. **Upgrade to ISV Partner** (if not already)
   - The AppExchange Partner Program is free to join
   - You get access to: Partner Business Org, License Management Org (LMO), Environment Hub
   - This is where you manage licenses, assign trials, and track installations

3. **Security Review**
   - Required for ALL paid AppExchange listings (and recommended for free ones)
   - Salesforce security team reviews your managed package for vulnerabilities
   - Costs: **$2,700 USD one-time fee** for the initial review (as of 2026)
   - Timeline: **4–8 weeks** after submission
   - They check: SOQL injection, XSS, CRUD/FLS enforcement, sharing rules, hardcoded credentials, governor limits
   - Alex's codebase is clean, but you'll need to prepare documentation and may need to make minor adjustments

4. **Trialforce / License Management**
   - Set up a **License Management Org (LMO)** — Salesforce provides this free to ISV partners
   - Configure your license types (free trial, paid editions, feature-gated licenses)
   - The LMO tracks every installation and manages license keys

5. **Listing Agreement**
   - Sign the AppExchange Listing Agreement (commercial terms)
   - Salesforce takes a **15% revenue share** on all AppExchange sales
   - You can also sell direct and bypass AppExchange (0% revenue share), but lose the marketplace visibility

### 1.3 Billing & Payment Infrastructure

You need a way to collect money from customers.

**Options:**

| Approach | Pros | Cons |
|----------|------|------|
| **Salesforce Checkout (AppExchange)** | Frictionless for customers, built into install flow | 15% revenue share, Salesforce controls the relationship |
| **Stripe / Paddle** (direct billing) | Lower fees (2.9% + €0.25), you own the customer relationship | Requires building a licensing portal, customers pay outside Salesforce |
| **Hybrid** | AppExchange for discovery + direct billing for enterprise | More complexity, best economics |

**Recommendation:** Start with **Salesforce Checkout via AppExchange** for simplicity. The 15% cut hurts, but it eliminates the need to build billing infrastructure. Move to direct billing for enterprise customers once you have a sales motion.

### 1.4 EU Compliance

As a Netherlands-based business selling to EU and international customers:

- **GDPR compliance** — Alex processes data inside the customer's own Salesforce org, so the customer is the data controller. You need a Data Processing Agreement (DPA) template and a privacy policy.
- **VAT (BTW)** — B2B sales within the EU use reverse-charge VAT. B2B sales outside the EU are zero-rated. You need VAT invoicing that handles this correctly. A tool like **Moneybird** or **e-Boekhouden** handles Dutch VAT compliance automatically.
- **Terms of Service** — Already exists (`terms_and_conditions.md`). Review with a Dutch lawyer to ensure it covers paid services, SLA commitments, and refund policy.

### 1.5 Checklist: Free → Paid

| # | Item | Status | Blocking? |
|---|------|--------|-----------|
| 1 | KVK registration (eenmanszaak or BV) | Not started | Yes |
| 2 | Business bank account | Not started | Yes |
| 3 | BTW/VAT registration | Not started | Yes |
| 4 | Salesforce ISV Partner application | Not started | Yes |
| 5 | License Management Org (LMO) setup | Not started | Yes |
| 6 | Security Review submission ($2,700) | Not started | Yes |
| 7 | Security Review passed | Not started | Yes |
| 8 | AppExchange Listing Agreement signed | Not started | Yes |
| 9 | Billing infrastructure chosen | Not started | Yes |
| 10 | GDPR/DPA documentation | Not started | No |
| 11 | Terms of Service review (lawyer) | Partial | No |
| 12 | VAT-compliant invoicing setup | Not started | No |

**Estimated timeline:** 2–3 months from KVK registration to first paid listing live on AppExchange.

**Estimated upfront cost:** ~€3,000–5,000 (security review + notary if BV + accountant setup + lawyer review).

---

## Part 2: Pricing Tiers

### Philosophy

Alex's pricing follows the **land-and-expand** model:
1. **Free tier** gets teams in the door — zero risk, zero friction
2. **Paid tier** activates when teams outgrow the free limits or need advanced features
3. **Extensions** let teams pay only for what they use
4. **Future premium** (quantum) captures enterprise value at scale

The free Agentforce integration is the strategic differentiator. Every competitor charges for AI features. Alex gives them away to build the install base.

### Tier Structure

#### Free Tier — €0/month
**"Everything a small team needs to run agile on Salesforce."**

| Included | Limit |
|----------|-------|
| Kanban boards | Up to 3 boards |
| Users | Up to 10 users |
| Sprint planning & analytics | Full |
| Backlog management | Full |
| Retrospectives | Full |
| Planning Poker | Full |
| Real-time collaboration | Full |
| Agentforce integration | Full (standard) |
| Drag-and-drop, LexoRank | Full |

**Why give Agentforce away free:** It's the hook. Teams try Alex for the free agile board, discover the AI features, and get locked in. When they grow past 10 users or need advanced features, they convert.

#### Base Tier — €7/user/month
**"Growing teams that need more boards, more users, and operational features."**

Everything in Free, plus:

| Feature | Details |
|---------|---------|
| Unlimited boards | No 3-board cap |
| Unlimited users | No 10-user cap |
| WIP limits | Column-level enforcement |
| Quick filters | Board + backlog |
| Card coloring | By priority, type, epic |
| Labels / tags | Lightweight categorization |
| Sprint goals | Alignment text on sprint board |
| @Mentions | In card comments, with notifications |
| Board templates | Scrum, Kanban, Support Triage |
| Scope change tracking | Sprint disruption visibility |

**Positioning:** This is the "we're a real team now" upgrade. The features here are table-stakes agile capabilities that growing teams expect.

#### Full Package — €29/user/month
**"The complete agile platform for Salesforce teams."**

Everything in Base, plus all current and future extensions bundled:

| Feature | Details |
|---------|---------|
| Swimlanes | Group by epic, assignee, priority, type |
| Custom fields on cards | Text, number, date, picklist — configurable per board |
| Subtasks | Child cards within cards |
| Cycle time & lead time analytics | Process health metrics |
| Cumulative flow diagram | Bottleneck visualization |
| Dependency mapping | Blocks / is blocked by relationships |
| Approval gates | Column transitions with Salesforce approvals |
| Experience Cloud boards | Customer-facing project visibility |
| Salesforce report types | Native dashboards with card/sprint/epic data |
| "My Cards" component | Lightning Home page presence |
| Cross-board search | Org-wide card search |
| Timeline / Gantt view | Visual project timeline |
| Priority support | 24-hour response SLA |

**Positioning:** For teams that want everything without worrying about which extensions to buy. Simpler than à la carte, and cheaper if you'd pick 3+ extensions.

#### À La Carte Extensions (alternative to Full Package)

For teams on the Base tier who only need specific capabilities. Base tier (€7) + extensions:

| Extension | Price | Features Included |
|-----------|-------|-------------------|
| **Analytics Pro** | €5/user/month | Cycle time, lead time, cumulative flow diagram, scope change tracking |
| **Custom Fields** | €4/user/month | Custom fields on cards (text, number, date, picklist) |
| **Subtasks & Dependencies** | €4/user/month | Child cards, dependency mapping (blocks/blocked by) |
| **Swimlanes & Views** | €3/user/month | Swimlanes, timeline/Gantt view, cross-board search |
| **Enterprise Governance** | €6/user/month | Approval gates, Experience Cloud boards, Salesforce report types |

**Break-even point:** If a team picks 3+ extensions, the Full Package (€29) is cheaper. This naturally pushes larger teams toward the bundle.

### Price Comparison vs. Competitors

| Tool | Price | What You Get |
|------|-------|-------------|
| **Alex Free** | €0 | Full agile board + Agentforce AI for up to 10 users |
| **Alex Base** | €7/user/month | Growing team essentials |
| **Alex Full** | €29/user/month | Complete agile platform |
| **Jira Standard** | €8.15/user/month | Basic Jira, no AI, no Salesforce integration |
| **Jira Premium** | €16/user/month | Advanced Jira + Atlassian Intelligence |
| **Monday.com Standard** | €12/user/month | No Salesforce integration |
| **Linear** | €8/user/month | Developer-focused, no Salesforce integration |
| **Copado** | ~€50+/user/month | Salesforce DevOps (different scope) |

**Key message:** Alex Full at €29 includes AI (Agentforce) and native Salesforce integration. To get comparable functionality with Jira, a Salesforce customer pays Jira Premium (€16) + a Salesforce-Jira connector (~€10–15/user) + maintenance overhead = €26–31/user/month with worse integration.

---

## Part 3: Revenue Projections

### Conservative Scenario

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free installs | 500 | 2,000 | 5,000 |
| Paid conversions (5%) | 25 orgs | 100 orgs | 250 orgs |
| Avg users per paid org | 15 | 20 | 25 |
| Avg revenue per user | €15/month | €18/month | €22/month |
| Monthly recurring revenue (MRR) | €5,625 | €36,000 | €137,500 |
| Annual recurring revenue (ARR) | €67,500 | €432,000 | €1,650,000 |
| After AppExchange cut (15%) | €57,375 | €367,200 | €1,402,500 |

### Key Assumptions
- Free-to-paid conversion rate of 5% (industry average for freemium SaaS is 2–5%)
- Average blended revenue per user assumes a mix of Base (€7) and Full (€29) customers
- AppExchange 15% cut applied uniformly (direct enterprise deals would improve margins)

---

## Part 4: Future — Quantum Computing Extensions

### The Long Game

Today's free Agentforce integration builds the install base. The standard paid tiers capture value from growing teams. But the real cash cow is **quantum computing extensions** — enterprise-grade features that solve genuinely hard computational problems.

### Why Quantum + Project Management?

Many core project management problems are **NP-hard** — they're computationally intractable at enterprise scale with classical computers:

| Problem | Classical Approach | Quantum Advantage |
|---------|-------------------|-------------------|
| **Resource allocation** — assign 200 people to 500 tasks across 12 sprints with skill constraints, availability, and dependencies | Heuristic approximation (greedy algorithms) — produces "good enough" results | Quantum annealing finds optimal or near-optimal solutions in polynomial time |
| **Portfolio optimization** — prioritize 300 epics across 15 teams with interdependencies and business value constraints | Manual prioritization or simplified scoring models | Quantum optimization evaluates the full constraint space simultaneously |
| **Monte Carlo sprint forecasting** — simulate 10,000 delivery scenarios with variable velocity, scope creep, and dependency chains | Classical Monte Carlo — slow at high dimensionality | Quantum-accelerated sampling — quadratic speedup on high-dimensional simulations |
| **Dependency resolution** — find the critical path through 1,000+ work items with complex blocking relationships | Topological sort + heuristics — breaks down with circular soft-dependencies | Quantum graph algorithms handle larger dependency networks |

These aren't hypothetical — they're real problems that enterprise PMOs face today and solve poorly with spreadsheets and gut feel.

### Quantum Tier — Premium Enterprise Pricing

**Target:** €100–200/user/month (or custom enterprise contracts)

**Target customer:** Large enterprises (500+ Salesforce users) with complex portfolios, multiple teams, and strategic planning needs.

| Feature | Description |
|---------|-------------|
| **Quantum Resource Optimizer** | Optimal team/task assignment across sprints — accounts for skills, capacity, dependencies, time zones, and business priority |
| **Portfolio Quantum Solver** | Optimal epic/initiative prioritization across the entire org — evaluates trade-offs humans can't compute |
| **Predictive Delivery Engine** | Quantum-accelerated Monte Carlo forecasting — "What's the probability we ship the Q3 roadmap by September?" with confidence intervals |
| **Dependency Network Analysis** | Quantum graph analysis on large-scale dependency networks — find hidden critical paths and risk clusters |
| **What-If Scenario Engine** | Instantly model organizational changes — "If we move 3 engineers from Team A to Team B, what happens to both portfolios?" |

### Why This Works as a Cash Cow

1. **High willingness to pay** — Enterprise PMOs already pay $50–200/user/month for portfolio planning tools (Planview, Broadcom Rally, Planisware). Quantum-powered planning at similar pricing with Salesforce-native integration is compelling.

2. **Defensible moat** — Quantum computing expertise is scarce. First-mover advantage in quantum-powered project management creates a moat competitors can't easily cross.

3. **Natural upsell** — The customer journey is: Free → Base → Full → Quantum. By the time they need Quantum, they have years of project data in Alex, making migration unthinkable.

4. **Platform lock-in** — Quantum features use historical Alex data (velocity trends, cycle times, dependency patterns) to make predictions. The more data, the better the predictions. This creates compounding lock-in.

### Timeline

Quantum computing for enterprise optimization is not ready today, but the trajectory is clear:

| Timeframe | Milestone |
|-----------|-----------|
| **2026–2027** | Build the install base with Free + Base + Full tiers. Accumulate project data across thousands of orgs. |
| **2027–2028** | Classical approximations of quantum algorithms (simulated annealing, quantum-inspired optimization). Ship as "Quantum-Ready" tier — the algorithms are ready, running on classical hardware with future quantum acceleration. |
| **2028–2030** | Integrate with quantum cloud services (IBM Quantum, AWS Braket, Azure Quantum) for genuine quantum advantage on optimization problems. |
| **2030+** | Full quantum tier — real quantum speedup on resource allocation, portfolio optimization, and predictive modeling. |

### The Pyramid

```
                  ╔══════════════════╗
                  ║     Quantum      ║  €100–200/user/month
                  ║   Enterprise     ║  (500+ user orgs)
                ╔═╩══════════════════╩═╗
                ║   Full Package       ║  €29/user/month
                ║   (all features)     ║
              ╔═╩══════════════════════╩═╗
              ║  Base + Extensions       ║  €7 + à la carte
              ║  (pick what you need)    ║
            ╔═╩══════════════════════════╩═╗
            ║  Free Tier (10 users)        ║  €0
            ║  + Free Agentforce AI        ║
            ╚══════════════════════════════╝
```

**Free AI gets them in. Extensions keep them paying. Quantum is the endgame.**

---

## Part 5: Immediate Action Plan

### Month 1: Business Foundation
- [ ] Register eenmanszaak at KVK (SBI code 6201)
- [ ] Open business bank account
- [ ] Register for BTW/VAT with Belastingdienst
- [ ] Apply to Salesforce Partner Program as ISV
- [ ] Set up bookkeeping (Moneybird or e-Boekhouden)

### Month 2: Salesforce Partner Setup
- [ ] Set up License Management Org (LMO)
- [ ] Configure license types (Free, Base, Full)
- [ ] Prepare security review documentation
- [ ] Submit security review ($2,700)
- [ ] Draft GDPR/DPA documentation

### Month 3: Go-to-Market
- [ ] Security review passed (fingers crossed)
- [ ] Sign AppExchange Listing Agreement
- [ ] Create paid listing on AppExchange
- [ ] Update AppExchange listing with tier comparison
- [ ] Set up Salesforce Checkout for payment processing
- [ ] Review Terms of Service with Dutch lawyer
- [ ] Announce paid tiers to existing install base (grandfather early adopters?)

### Ongoing
- [ ] Ship Tier 1 table-stakes features (WIP limits, filters, labels, etc.) — these justify the Base tier price
- [ ] Ship Tier 2 features (swimlanes, custom fields, subtasks) — these justify the Full tier price
- [ ] Track conversion metrics: free installs → trial → paid → expansion
- [ ] Begin quantum-inspired algorithm R&D (classical approximations first)
