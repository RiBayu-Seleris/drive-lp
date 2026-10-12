# DRIVE incident-to-road content map

Updated 12 October 2026 for the user's authoritative specification: `/Users/asani/.codex/attachments/84029b90-7178-42c7-871c-595e8e0a8631/Pasted text.txt`. The audience is the vehicle owner; the public brand is **DRIVE**. The story follows an insured vehicle from an incident through assessment, paid detail, claim, service authorization, repair, and a return to the road.

This specification replaces the general introduction built around repair / buying a policy / submitting a claim. Buying a policy remains an application capability, but it is not a branch of this incident story. Existing coverage is used; the page does not suggest that insurance purchased after an incident covers that incident.

## Eight-scene story contract

| Chapter | User-facing meaning | Required boundary |
| --- | --- | --- |
| 01 — Incident | Something has happened to the vehicle; the owner needs a next step. | The vehicle is a narrative anchor, not a showroom product. No graphic crash. |
| 02 — Identify & check coverage | Enter vehicle data, photograph the plate, read its data, and use it for an insurance lookup. | The image identifies a plate; it does not visually reveal insurance. The example finds existing coverage. |
| 03 — Scan damaged areas | Photograph damaged sides or components and send the photos for analysis. | Follow application guidance. Ordinary damage checks can skip undamaged sides. |
| 04 — General AI result | Present a general assessment with detailed findings still locked. | Detailed components, recommendations and costs are unavailable before payment. |
| 05 — Unlock & decide | Payment opens total and per-photo percentages, components, repair/replace recommendations and repair-cost estimates. Then branch to a claim or personally funded repair. | **Every user pays to unlock full detail, including insured users.** The main story follows the insured route. |
| 06 — Claim & smart approval | Choose a policy, enter chronology and required details, upload documents, and submit to the insurer. | Auto approval must be enabled by the insurer for that product and its rules must pass. Other products or claims need manual review. |
| 07 — Workshop & towing | After approval, choose a registered DRIVE partner workshop, then deliver independently or request towing. | Search nearby first and expand when no suitable provider is available. No fixed ETA or guaranteed availability. |
| 08 — One ticket / back on the road | One approved ticket passes through towing and the workshop; the repaired vehicle returns to the road. | QR/barcode scans have a manual-code fallback. The same service ticket is used at both handoffs, subject to approved coverage. |

Supporting content summarizes three consecutive phases: assessment, claim, and repair services. The ending is the owner's repaired vehicle and continued journey, not an architecture diagram.

## Current application evidence

The specification determines the narrative. These active source locations substantiate capabilities and boundaries; source inspection does not prove production readiness.

| Capability | Source |
| --- | --- |
| DRIVE branding across customer app and backoffice | [webapp Logo.tsx](../autoclaim-webapp-v2/src/components/brand/Logo.tsx#L4), [admin Logo.tsx](../autoclaim-admin/src/components/Logo.tsx#L5) |
| Data, plate, damage capture and analysis routes | [routes.ts](../autoclaim-webapp-v2/src/app/routes.ts#L33) |
| Plate recognition and confirmation before capture | [LicensePlatePage.tsx](../autoclaim-webapp-v2/src/features/checkup/pages/LicensePlatePage.tsx#L91) |
| Insurance lookup accepts plate data | [backend.ts](../autoclaim-webapp-v2/src/features/vehicle-scan/services/backend.ts#L39) |
| Guided side capture and undamaged-side choice | [VehicleSidesPage.tsx](../autoclaim-webapp-v2/src/features/checkup/pages/VehicleSidesPage.tsx#L92) |
| Overall percentage, per-side severity, components, repair/replace and cost fields | [types.ts](../autoclaim-webapp-v2/src/features/damage/types.ts#L3) |
| General summary with locked full detail | [types.ts](../autoclaim-webapp-v2/src/features/damage/types.ts#L25), [DamageAnalysisPage.tsx](../autoclaim-webapp-v2/src/features/damage/pages/DamageAnalysisPage.tsx#L372) |
| Report payment tied to the assessment; estimates require unlocked detail | [DamageAnalysisPage.tsx](../autoclaim-webapp-v2/src/features/damage/pages/DamageAnalysisPage.tsx#L259), [EstimatedCostPage.tsx](../autoclaim-webapp-v2/src/features/damage/pages/EstimatedCostPage.tsx#L124) |
| Policy selection, chronology, documents, review and service ticket | [routes.ts](../autoclaim-webapp-v2/src/app/routes.ts#L68) |
| Insurer product settings and conditional auto approval | [insurance-products/page.tsx](../autoclaim-admin/src/app/(dashboard)/insurance-products/page.tsx#L237), [claim_auto_approval_model.go](../autoclaim-service-gateway/internal/api/model/claim_auto_approval_model.go#L125) |
| Policy validity, vehicle identity, inference and coverage checks | [claim_auto_approval_model.go](../autoclaim-service-gateway/internal/api/model/claim_auto_approval_model.go#L98) |
| Workshop choice and towing order | [routes.ts](../autoclaim-webapp-v2/src/app/routes.ts#L52), [WorkshopDetailPage.tsx](../autoclaim-webapp-v2/src/features/workshop/pages/WorkshopDetailPage.tsx#L133) |
| Radius tiers expand when nearer results are empty | [recommendation_handler.go](../autoclaim-service-gateway/internal/api/handler/recommendation_handler.go#L17) |
| Dispatch also considers provider eligibility, insurer relationships and distance | [towing_dispatch_model.go](../autoclaim-service-gateway/internal/api/model/towing_dispatch_model.go#L69) |
| One claim identifier deliberately reused by towing and workshop scans | [ClaimTicketPage.tsx](../autoclaim-webapp-v2/src/features/claim/pages/ClaimTicketPage.tsx#L198) |
| Workshop camera scan and manual fallback | [ScanTicketSheet.tsx](../autoclaim-webapp-v2/src/features/mitra-portal/components/ScanTicketSheet.tsx#L124) |
| Driver camera scan and manual entry | [DriverTasksPage.tsx](../autoclaim-webapp-v2/src/features/driver/pages/DriverTasksPage.tsx#L1698) |
| Receipt, repair completion and remaining customer payment | [WorkshopJobDetailPage.tsx](../autoclaim-webapp-v2/src/features/mitra-portal/pages/workshop/WorkshopJobDetailPage.tsx#L59) |

The applications also support operations outside this sequence, including buying a policy and requesting towing while a claim is under review. The approved-claim storyline is an example route, not the only permitted sequence of every application operation.

## Payment and ticket distinctions

1. **AI detail payment** occurs before the illustrated claim and is required for every user. It opens the complete assessment; insurance coverage does not waive it.
2. **The approved service ticket** connects a claim to towing and workshop handling. The same QR/barcode or manually entered code follows both handoffs. When towing is covered, the ticket supports its authorization/payment flow. It does not make all services free or remove customer amounts outside coverage.

The internal inference ticket associated with a report purchase is not presented as the approved service ticket. Payment for a report does not approve an insurance claim.

## Supporting actors

The specified ecosystem includes the customer, DRIVE, Super Admin, insurer, workshop, towing company and towing driver. Concise supporting content groups related service roles for readability:

- The owner provides photos and details, unlocks the result, submits the claim, and chooses the service route.
- DRIVE connects the journey; Super Admin supports platform operations in the background.
- The insurer configures product rules and evaluates claims.
- A registered workshop checks the service ticket and handles receipt and repair.
- The towing company and driver arrange pickup and delivery using the same service authorization.

Role-scoped evidence: [routes.ts](../autoclaim-webapp-v2/src/app/routes.ts#L96), [Sidebar.tsx](../autoclaim-admin/src/components/Sidebar.tsx#L51). Supporting roles must not displace the user-centered ending.

## CTA destinations

Links derive from `VITE_DRIVE_APP_URL` and the partner override. Configure the intended public app origin for deployment; protected routes retain their own login flow.

| CTA | Route |
| --- | --- |
| Mulai pemeriksaan | `/check-condition` |
| Buka klaim saya | `/claims` |
| Cari bengkel mitra | `/workshop-recommendations` |
| Masuk | `/login/user` |
| Daftar sebagai mitra | `/register/mitra` |

Source: [routes.ts](../autoclaim-webapp-v2/src/app/routes.ts). The landing page does not submit claims, make payments, place orders, or issue usable tickets.

## Simulation and asset boundaries

Percentages, repair costs, distances, ETA values, plate data, provider names and ticket codes in the scenes are **simulation examples**. They are not actual assessments, quotations, live availability, guaranteed response times or redeemable authorizations. The FAQ states this; scene data should also carry a nearby simulation label.

An illustrated approval belongs to an eligible insurer-enabled product. Other products still require manual review. An estimate may change after direct workshop inspection: [ClaimApprovedPage.tsx](../autoclaim-webapp-v2/src/features/claim/pages/ClaimApprovedPage.tsx#L77).

These content changes need no additional bitmap assets or GPT web-chat prompts. Existing assets and code-generated interfaces can support them. Vehicle provenance remains in the separate attribution files. Reference artwork stays outside production assets as art direction.

This document records source inspection and the user's product specification. It does not claim new browser tests, live AI accuracy, production availability or deployed integration verification.
