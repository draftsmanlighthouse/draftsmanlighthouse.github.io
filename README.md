# Workbench: Shaping Session Summary

*October 14, 2025*

## Executive Summary

Workbench is een geïntegreerde knowledge base en project management tool die de kloof tussen documentatie en projectwerk oplost. Door gebruik te maken van “micro-docs” als atomaire kenniseenheden, gecombineerd met Shape Up methodologie, blijft documentatie actueel en contextrijk.

## Core Concept

### Micro-Docs as Knowledge Atoms

- **Types**: pitch, ADR, principle, fat-marker-sketch, breadboard, reference card, tasks, domain-element, heartbeat
- **Eigenschappen**:
  - Content ondersteund door wizards/templates
  - Soft limits om “micro” te blijven
  - Tagged en linked → knowledge graph
  - Altijd gecreëerd vanuit context (nooit standalone)

### Drie Perspectieven

**1. What Might Be (Shaping)**

- Nieuwe micro-docs worden geïntegreerd met bestaande
- Wolkje van ideeën gekoppeld aan een pitch
- Validatie: breken nieuwe concepten de oude niet?

**2. What Is (Building)**

- Pitch wordt project → tags veranderen van “might be” naar “why”
- Wolkje wordt gerefined en uitgebreid
- Analyse voedt knowledge base met nieuwe kennis

**3. What Is Now (Documentation)**

- Huidige staat van het systeem
- Out of scope voor handmatige updates
- Idealiter gegenereerd uit code/model

## Key Design Decisions

### 1. Document Bloat Prevention

**Probleem**: Hoe blijven micro-docs “micro”?

**Oplossing**:

- Real-time soft nudges tijdens schrijven
- “Je begint lang van stof te worden, weet je zeker dat je het bij de kern houdt?”
- Sociale druk mechanismen:
  - Reading time indicator (zichtbaar voor anderen)
  - Stats: “gemiddelde micro-doc in deze categorie is 200 woorden, jij zit op 800”

### 2. Orphaned Documents

**Definitie**: Docs zonder inkomende of uitgaande links

**Inzicht**: In Workbench zou dit een bug zijn, geen feature. Docs worden altijd vanuit context gecreëerd (pitch, ADR, taak).

**Oplossing**: “Lost & Found” (tongue-in-cheek naming)

- Orphaned docs worden naar aparte categorie verplaatst
- Niet zichtbaar in standaard zoekresultaten
- Opt-in via “search Lost & Found as well”
- Wijst op: broken links, migratie issues, edge cases

**Alternatieve namen overwogen**: Unlinked, Detached, Stranded, Disconnected, Floating, The Backburner, The Vault

### 3. C4 Model Integration

**Niet**: C4 uit code genereren (te complex, te fragiel)

**Wel**: C4 als afgeleide visualisatie van beslissingen

- ADR: “Component X wordt geïntroduceerd” → Component in C4
- ADR: “Component X en Y wisselen info via REST” → Link in C4
- C4 wordt navigatielaag in knowledge graph
- Zoeken op component, technologie (REST), onderwerp (Integratie)

### 4. Navigation & Views

**Vier navigatie-stijlen**:

1. **Wiki style** - Vrij browsen door kennisgraaf
1. **Project management view** - What is happening right now
1. **Domain view** - Entry via domain-element micro-docs (C2/C3 diagrammen, mogelijk C1)
1. **Curated documents** - Compositie van geselecteerde micro-docs voor specifiek doel (dev onboarding, DHT meeting)

**Filtering**: Perspectief is grofmazige filter, daarna verder verfijnen op tags/type/etc.

## Tracepaper as Case Study

### Why Tracepaper Needs Workbench

**Tracepaper** is een IDE voor model-driven development van event-driven, serverless systemen. Het biedt een monolithisch programmeermodel voor gedistribueerde runtime.

**Complexity drivers**:

- Event sourcing + CQRS architectuur
- DDD en Event Storming concepten
- AWS serverless deployment (CloudFormation, Lambda, DynamoDB, AppSync)
- Educatieve component voor gebruikers
- Evolving patterns en features
- Technical depth van high-level tot implementatie details

**Waarom traditionele tools falen**:

- **Basecamp**: Te vrijblijvend, niet gestructureerd genoeg voor kennisbeheer
- **Notion**: Mega-pages die niemand leest
- **Confluence**: Documentatie raakt verouderd, niemand weet welke versie actueel is
- **GitHub Issues**: Te granulaar, geen overzicht
- **Slack**: Verloren na 90 dagen

### Workbench Would Enable

**Voor Tracepaper documentatie**:

- ADR: “Waarom single table design?” → linked naar domain elements → referenced in onboarding
- Pitch: “Nested CloudFormation stacks” → evolved naar implementation → linked to code patterns
- Reference card: “Behavior test syntax” → linked to examples → updated as features evolve
- Principle: “Business logic in boxes, distribution in lines” → referenced across system

**Perspectives in actie**:

- **What might be**: Nieuwe features in shaping (bijv. “Real-time collaboration in modeler”)
- **What is**: Huidige Tracepaper capabilities (Commands, Aggregates, Views, Projections, Notifiers)
- **Documentation**: Gegenereerde API docs, deployment guides

**Knowledge graph navigatie**:

- Via domain: “Show me all docs related to Event Sourcing”
- Via technology: “What ADRs touch DynamoDB?”
- Via project: “What changed in the last 6-week cycle?”

### Technical Architecture Decisions (from Tracepaper)

Deze beslissingen informeren Workbench’s eigen architectuur:

**1. Nested CloudFormation Stacks**

- **Why**: AWS limiet op resources per stack (200)
- **Bonus**: Granulaire deployment control
- **Structure**: Root → Read/Write split → Subdomain stacks → Aggregate stacks → Lambda per behavior
- **Mental model**: Stack structure mirrors folder structure

**2. Single Table Design (DynamoDB)**

- **Why**: Voorkomt explosie van tables (47 aggregates ≠ 47 tables)
- **Abstraction**: Weggeabstraheerd in model concepten (Aggregates, Views, Projections)
- **User experience**: Modelleren in domain termen, niet database schema’s

**3. AppSync for GraphQL**

- **Why**: Serverless-optimized, realtime subscriptions, native DynamoDB/Lambda integration
- **Better than**: API Gateway REST voor event-driven + CQRS systemen

**4. Cognito + Dynamic Roles**

- **Auth flow**: Static pages (no auth) → API calls (bearer token)
- **RBAC**: Command/Query level permissions
- **Multi-tenancy**: Dynamic role expressions (user.tenantId == doc.tenantId)
- **Role mapping**: Lambda trigger on Cognito + DynamoDB lookup

**5. Alpine.js + DaisyUI + VineJS Stack**

- **Why**: Ship features, not configure bundlers
- **Alpine**: Reactivity zonder React/Vue complexity
- **DaisyUI**: Tailwind components zonder reinventing wheel
- **VineJS**: Client-side HTML composition (components zonder build step)
- **Deployment**: S3 + CloudFront static hosting

**6. GUI Scaffold as Opt-in**

- **Philosophy**: “Here’s something that works, replace it when you want”
- **Not**: Core value proposition
- **Is**: Technical enabler + working example
- **Message**: UI/UX is specific, we give you the starting point

### Feedback Loops (TDD for Distributed Systems)

**Three levels of validation**:

1. **Model Validation (real-time in IDE)**
- Structure, syntax, dependencies checked instantly
- Prevents basic errors before build
1. **Behavior Specs (during build)**
- Test case: Trigger Message + Initial State → Behavior Flow (black box) → Domain Events + End State
- Converted to tests in build agent
- Validates business logic correctness
1. **Scenarios (QA gate to production)**
- API call chains against staging environment
- End-to-end validation before production deployment
- Results in DynamoDB + CloudWatch logs

**Migration/Versioning Strategy**:

- Event field added? → Provide default value for hydration
- Document mapping changed? → Model validator forces conscious fix
- Tooling enforces thinking about schema evolution before deployment

## Bootstrap Strategy

### Phase 1: Prototype (Current)

- **Tool**: HTML + Alpine.js
- **Goal**: Discover UX, validate workflows, fail fast
- **Output**: Requirements for backend

### Phase 2: Backend Modeling

- **Tool**: Tracepaper (dogfooding)
- **Goal**:
  - Validate Tracepaper with real-world complex use case
  - Discover pain points in Tracepaper itself
  - Extract requirements for Tracepaper improvements

### Phase 3: Production Deployment

- **Generated**: Python/CloudFormation via Tracepaper
- **Result**:
  - Working Workbench instance
  - Validation of Tracepaper’s capabilities
  - Showcase architecture for event-driven systems

### Phase 4: Frontend Polish

- **Base**: Tracepaper-generated scaffold for CRUD operations
- **Custom**: Knowledge graph navigation, C4 visualization, perspective switching, tag management
- **Hosting**: S3 + CloudFront static hosting

## Open Questions

### Primary Challenge

**Flow + UX combination** - Hoe voelt de gebruikerservaring aan bij het navigeren tussen perspectieven, het creëren van micro-docs, en het volgen van de knowledge graph?

**Approach**: Prototyping is nodig. “Zoiets moet je voelen.”

### Secondary Questions

1. **Onboarding**: Hoe leren nieuwe gebruikers het mental model van perspectives + micro-docs?
1. **Search**: Welke zoek-interface past bij knowledge graph navigatie?
1. **Collaboration**: Real-time editing? Comments? Versioning?
1. **Permissions**: Granulariteit van access control per doc/tag/perspective?
1. **Export**: Kunnen teams hun knowledge base exporteren? (Lock-in prevention)

## Success Metrics (Proposed)

### Adoption

- Teams die Shape Up draaien én worstelen met Confluence-rot
- Engineering teams die event-driven architectures bouwen
- Solo developers/small teams die structured thinking willen

### Value Indicators

- Docs blijven actueel (update frequency vs creation date)
- Knowledge graph grows organically (links per doc, orphaned rate)
- Cross-referencing tussen old/new knowledge (perspective transitions tracked)
- Time from pitch → documented decision reduced

## Next Steps

1. **HTML/Alpine prototype** - Focus op core flows:
- Create micro-doc vanuit pitch
- Navigate knowledge graph
- Switch tussen perspectives
- Tag management
1. **Test with Tracepaper documentation** - Document eerste pitch voor Tracepaper feature
- ADRs voor key decisions
- Reference cards voor patterns
- Validate mental model
1. **Extract backend requirements** - Wat moet API kunnen?
- CRUD for micro-docs
- Graph queries (links, tags, perspectives)
- Search/filter capabilities
- C4 generation from ADRs
1. **Model in Tracepaper** - Dogfood intensely
- Document what works/doesn’t
- Use findings to improve both tools

## Meta-Observation

Dit gesprek demonstreerde precies het probleem dat Workbench oplost:

**We bespraken**:

- Workbench concept (what might be)
- Tracepaper details (what is)
- Implementation decisions (how it works)
- ADR-like reasoning (why these choices)

**In traditionele tools zou dit verspreid zijn over**:

- Slack threads → verloren na 90 dagen
- Confluence pages → niemand weet welke actueel is
- GitHub issues → te granulaar, geen context
- Notion doc → één persoon’s brain dump

**In Workbench zou het zijn**:

- Pitch: “Workbench integrated knowledge base” (root)
- ADRs: “Why Alpine + DaisyUI”, “Auth strategy”, “C4 as derived visualization”
- Reference cards: “Tracepaper deployment flow”, “Cognito integration pattern”
- Tags: `#architecture`, `#frontend`, `#auth`, `#tracepaper-integration`
- Navigation: Via perspectives of via knowledge graph
- Context: Altijd zichtbaar welke docs elkaar informeren

-----

*This document itself is a micro-doc of type “shaping-summary” tagged with `#workbench`, `#shaping`, `#tracepaper`, `#case-study`*