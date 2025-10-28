# nog te shapen
- Taken in board ipv lijst?
- currated docs (referenties naar secties)
- taken/notes/questions
- constraints
- technical debt items (tactisch) + registry (vlaggetje op ADR, causes technical debt)
- breadboards?
- templates aanscherpen.
- comments
- C4 "ordenen"

⚙️ Constraints — “rules that travel with the system”

🎯 Wat je nu bedoelt

Een constraint hoort bij een pitch (shapingfase), maar blijft meeliften met het systeem via tags en boundaries.

🔩 Model-gedrag
	•	Type: constraint (micro-doc type)
	•	Links:
	•	origin: [pitch]
	•	applies_to: [C4 system/container/component]
	•	Automatische herbruikbaarheid:
Als een nieuw pitch-document een component raakt met bestaande constraints, krijgt het deze in context te zien (met een “these constraints apply” banner).

💡 UX-gedrag
	•	Tijdens shaping: “⚠️ This component has 3 existing constraints.”
	•	Tijdens editing: auto-suggest constraints bij het taggen van C4-onderdelen.
	•	View per component: Principles + Constraints + ADR’s + Technical Debt → vormt letterlijk de architectuur van dat component.

⸻

🧾 Technical Debt Items — “architecture with scars”

🎯 Wat je nu bedoelt

Een flag op ADR’s die bewust een suboptimale keuze vastleggen.

🔩 Model-gedrag
	•	Eigenschap op ADR: causes_technical_debt: true
	•	Derived View: Technical Debt Registry = query op ADR’s met die flag.
	•	Extra metadata (optioneel):
	•	impact_scope: [component/system]
	•	expected_repay_cycle: [6-weeks-cycle-id]
	•	repayed_by: [ADR]

💡 UX-gedrag
	•	Filter/overview: “Show all ADRs with Technical Debt Flag.”
	•	Component-view: badge ⚑ TD (2 open)
	•	Cycle-dashboard: “Debt introduced vs repaid this cycle.”

Zo wordt technical debt first-class — niet post-it’s in backlog, maar semantische entiteiten in de kennisgraaf.