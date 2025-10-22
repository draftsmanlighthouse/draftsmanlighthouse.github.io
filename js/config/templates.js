const PRINCIPLE = `### Statement
Describe **what** the principle enforces, in a clear, normative way.
Use active voice — e.g. *“To ensure X, we design Y as Z.”*
This line should stand on its own and express the core architectural stance.

### Rationale
Explain **why** this principle exists — what value or trade-off it supports.
Optionally include examples to make the motivation tangible.
Keep it factual and reusable; others should be able to cite this principle as precedent.

> Example: “This separation provides organisational flexibility, allowing each system to evolve independently — both technically and legally.”

### Implication / Acceptance
Describe **what this principle implies** or **what we accept as a consequence**.
This section makes the trade-offs explicit, ensuring the principle isn’t interpreted as dogma.

> Example: “We accept that this design prevents us from bundling our software into a single product.”`

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