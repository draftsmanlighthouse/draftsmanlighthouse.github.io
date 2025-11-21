const PRINCIPLE = `### Statement
Describe **what** the principle enforces, in a clear, normative way.
Use active voice — e.g. *“To ensure X, we design Y as Z.”*
This line should stand on its own and express the core architectural stance.

> Example: To ensure domain clarity, each functional area is designed as an autonomous module with its own data model and lifecycle.

### Rationale
Explain **why** this principle exists — what value or trade-off it supports.
Optionally include examples to make the motivation tangible.
Keep it factual and reusable; others should be able to cite this principle as precedent.

> Example: Clear separation reduces coupling and prevents changes in one area from unexpectedly impacting another.
> It supports independent evolution, parallel development, and cleaner reasoning about behaviour.
> In practice, this helps teams avoid “god modules” and accidental shared state.

### Implication / Acceptance
Describe **what this principle implies** or **what we accept as a consequence**.
This section makes the trade-offs explicit, ensuring the principle isn’t interpreted as dogma.

> Example: We accept additional integration work between modules, such as explicit APIs or events.
> We also accept that cross-module operations may require coordination rather than shared access.

/*
# EAP-001 — Functional Boundaries and Organisational Flexibility

### Statement
To achieve clear functional boundaries, **Draftsman products are designed as separate systems**.

### Rationale
This separation provides **organisational flexibility**, allowing each product to evolve independently — both technically and legally.
For example, we can use separate legal entities ("rechtsvormen") for different products, enabling isolation where needed.

### Implication / Acceptance
We accept that this design prevents us from **bundling our software** (e.g. *“pay once and access both Tracepaper and Workbench”*).
Each product must therefore justify its own value proposition and pricing model.
*/