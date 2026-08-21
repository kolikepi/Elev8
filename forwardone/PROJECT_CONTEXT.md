# ForwardOne Project Context

## Overview
ForwardOne is a production-oriented logistics operations application for international courier, road freight, and customs coordination between Albania and Europe. Sprint 1 includes public marketing/tracking, credentials authentication, customer and business workspaces, administrator operations, quote workflows, shipment tracking, cloud document storage, and seeded demo operations.

## Visual System
- White backgrounds, dark navy `#0A1628` / `#1E3A5F`, green accent `#16A34A`.
- Inter typography, minimal enterprise SaaS style, glass-like white cards, low-contrast slate surfaces, compact status badges.
- Responsive layouts with a 1200px maximum content width and mobile off-canvas dashboard navigation.

## Architecture and Behavior
- Role paths: `/customer`, `/business`, `/admin`; `/dashboard` redirects by session role.
- Quote requests always start as `PENDING_REVIEW`. Customer pricing is not visible until an administrator approves and sends the manual quotation.
- Status workflow: `PENDING_REVIEW → QUOTED → ACCEPTED/REJECTED → BOOKED`.
- Quote references use atomic yearly counters: `FWD-YYYY-XXXXX`.
- Private supporting documents upload directly to cloud storage through presigned URLs; the database stores `cloud_storage_path` and access metadata. Saved files can be securely downloaded or reused on later quote requests.
- Rules-based suggestions only; no AI, payment, mapping, or live carrier API wiring in Sprint 1.
- Carrier placeholders live under `lib/carriers/`.
- Public tracking accepts a tracking number or quote reference.

## Pages and Navigation
- Public: homepage, services, tracking, login, signup, new quote.
- Customer: dashboard, quotes/detail, shipments, tracking, documents, saved addresses CRUD, support.
- Business: customer functionality plus enhanced address book, import/export views, saved reusable documents.
- Administrator: overview, quote search/filter and manual pricing, booking, customers, business customers, shipments and event updates, tracking, documents, invoices placeholder, support management, settings placeholder.

## Sprint 2 (completed, awaiting user approval)
All Sprint 2 deliverables implemented on top of Sprint 1 (preserved):
- **AI Shipment Assistant**: `app/api/ai/assistant/route.ts` (LLM gpt-5.4-mini, json_object). Extracts shipment fields, asks only for missing info, recommends services via deterministic `suggestServices()`, and NEVER outputs prices (verified). UI: `components/smart-quote-builder.tsx` + `app/quote/assistant/page.tsx`. "Continue to quote form" saves extracted fields to `sessionStorage['fwd_ai_prefill']` → `/quote/new?from=assistant` which prefills.
- **Admin Pricing Engine**: `app/api/admin/quotes/[id]/quotation/route.ts` full manual fee entry + calc. Calc order: base=carrierCost+pickup+delivery+remoteArea+insurance+dg+doc+customs+other; fuel=base×fuel%; markup=(base+fuel)×markup%; afterMarkup=base+fuel+markup; discount=afterMarkup×discount%; subtotal=afterMarkup−discount; vat=subtotal×vat%; final=subtotal+vat. UI in `components/admin-portal.tsx` AdminQuoteDetail.
- **Customer pricing profiles / price matrices / quotation templates**: APIs under `app/api/admin/pricing-profiles`, `.../price-matrices`, `.../quotation-templates`. Admin UI sections `pricing-profiles`, `price-matrices`, `templates` in admin-portal. Nav links added. Models: BusinessPricingProfile, PriceMatrix, QuotationTemplate. **ServiceType enum only: EXPRESS_COURIER, ECONOMY_COURIER, ROAD_FREIGHT.** NOTE: pricing-profiles GET uses `select` (no passwordHash leak).
- **Logistics Tools**: `app/tools/page.tsx` (public) + `components/logistics-tools.tsx` — 6 calculators (Volumetric, Weight/Dimension/Currency converters, Transit Time, Shipping Cost). Static/keyless rates. Linked from site-header + site-footer.
- **PDF documents**: `app/documents/page.tsx` (auth-gated) + `components/document-generator.tsx` — Commercial Invoice + Packing List, branded navy/green HTML → HTML2PDF API (2 routes: `app/api/generate-pdf` create + `app/api/generate-pdf/status`, client polls). Nav link "Invoice & Packing List" → `/documents` in customer+business nav.
- **Emails** (`lib/email.ts`, best-effort, branded HTML shell, 5 senders): emailQuoteReceived (quotes POST), emailQuoteReady (quotation approve), emailQuoteAccepted→owner kolikepi@gmail.com (quotes/[id] PATCH ACCEPTED), emailShipmentBooked (admin/shipments/book), emailShipmentDelivered (shipments POST status=DELIVERED). All wired.
- **Seed** (`scripts/safe-seed.ts`, upsert only): 6 QuotationTemplates, 4 PriceMatrix rows, 1 BusinessPricingProfile (Atlas / businesses[0]).
- Build check + test_nextjs_project pass; AI-no-price behavior, PDF create, admin data endpoints verified via API.

## Sprint 2 Staging Deployment (2026-08-04)
- Deployed to staging URL: https://forwardone-staging.abacusai.app (deployment_tag: staging).
- Added self-contained account-security / change-password feature (NOT a functionality change, requested for staging hardening):
  - `app/api/account/password/route.ts` — auth-gated POST; verifies current password via bcrypt, min 8 chars, must differ; updates hash.
  - `app/account/security/page.tsx` (server, getServerSession-gated) + `components/change-password-form.tsx` (client).
  - Middleware matcher extended with `/account/:path*`.
  - "Security" link added to `components/dashboard-shell.tsx` footer (above Sign out).
- Pre-deploy verification confirmed by reading code: middleware role gates (/admin, /business, /customer); all /api/admin routes enforce ADMINISTRATOR (guard()/inline 401); /api/quotes + /api/shipments filter by userId unless admin; /api/quotes/[id] + /api/files/[id] enforce ownership; presigned uploads auth-gated + isPublic=false; private files served via short-lived signed URLs (public path only for isPublic); email/PDF best-effort try/catch; DB fully migrated (all Sprint 2 tables seeded).
- Default admin password Admin123! must be changed by user via /account/security after first login (instructed in report).
- Demo data is clearly labeled at seed level ("Demo Sender/Receiver", quote-demo-* ids, "Demo shipment..." notes) — kept intentionally for staging testing.

## Sprint 2.1 — Dynamic Quotation & Tariff Engine (in progress)
Phased plan A→H, checkpoint after each. Additive DB migrations only; existing data preserved.

### Phase A DONE (checkpoint "Sprint 2.1 Phase A: data foundation")
- Added 9 enums (ServiceCategory{EXPRESS,ROAD_FREIGHT,AIR_FREIGHT,SEA_FREIGHT}, QuoteWorkflowStage, WeightUnit, DimensionUnit, TariffStatus, SurchargeBasis, ImportJobStatus, CalcStatus) — NEW parallel enums; existing ServiceType enum UNCHANGED.
- Extended Quote model with optional/defaulted fields (serviceCategory, workflowStage, carrierName, serviceName, currency, isCommercial, goodsDescription, origin/dest country/city/postal, bookingJson, draftJson, isDraft, needsReapproval) + relations to new models. Backward-compatible — existing POST /api/quotes still works.
- 17 new models: CarrierService, ShipmentPiece, VolumetricRule, ServiceRestriction, CountryZoneMapping, PostalCodeZone, TariffVersion, TariffRow(additionalKgRate), SurchargeRule, TariffImportJob, TariffImportError, QuoteCalculation, QuoteCalculationLine(customerVisible), PricingOverride, BookingChecklist, PackageValidationWarning, AuditLog. All use @map snake_case, Decimal @db.Decimal, cuid ids.
- DB now 31 tables. Seed (scripts/safe-seed.ts, MODIFIED not replaced, uses upserts) adds: 12 carrier_services, 4 volumetric_rules (Express div 5000, Air 6000, Road 3000, Sea 1000), 3 service_restrictions, 6 country_zone_mappings (AL/IT/DE/GR/AT/FR), 7 surcharge_rules (FUEL%,REMOTE,RESIDENTIAL,DG,INSURANCE%,OVERSIZE,CUSTOMS), 1 sample ACTIVE tariff_version (TNT Express AL→IT) + 5 tariff_rows.
- Seed command: `yarn prisma db seed`.

### Next: Phase B (dynamic service selection + Stage 1 conditional forms + save/resume draft), then C (multi-piece), D (tariff import wizard), E (auto-calc+surcharge+approval), F (booking checklist), G (AI update), H (full test + deploy staging).

## Sprint 2.1 Phase B (COMPLETE + checkpointed "Sprint 2.1 Phase B: dynamic service selection + drafts")
- Service-first quote flow: `components/quote-request-form.tsx` rewritten into 4-step form. Step1 = service category cards (Express/Road/Air/Sea; Sea = Coming soon placeholder) + carrier service dropdown (from /api/carrier-services filtered by category) + direction + pickup date. Step2 = conditional route/parties (Express/Air: origin country + receiver name/dest required, rest optional; Road: full loading+delivery addresses + handling equipment checkboxes; Sea: minimal). Step3 = cargo. Step4 = documents + summary.
- NEW API `app/api/carrier-services/route.ts` — GET active carrierServices + volumetricRules (serialized).
- NEW API `app/api/quotes/draft/route.ts` — GET list user drafts, POST upsert draft (DRAFT-<ts>-<rand> reference, never consumes FWD counter, isDraft=true, full form in draftJson), DELETE ?id=.
- MODIFIED `app/api/quotes/route.ts` — GET filters isDraft:false (drafts excluded from customer+admin lists). POST: conditional Stage-1 validation per serviceCategory, sets serviceCategory + derived serviceType + workflowStage=QUOTATION + carrier/service/currency/origin+dest fields + draftJson; accepts optional draftId to convert a draft into a real quote (real FWD reference, isDraft=false).
- Save draft button (from step1) + resume via ?draft=<id> query param.
- Category→ServiceType backward-compat map: EXPRESS/AIR_FREIGHT→EXPRESS_COURIER, ROAD_FREIGHT/SEA_FREIGHT→ROAD_FREIGHT.

## Sprint 2.1 Phase C (multi-piece engine) — DONE + checkpointed
- CREATED `lib/piece-calc.ts` — shared pure calc lib (client+server+AI). Exports PieceInput, PieceResult, ShipmentTotals, toCm/toKg, round2, resolveDivisor(rules,{serviceCategory,carrier}) (0 = not configured → callers flag), calcPiece, calcShipment(pieces,divisor)→{rows,totals}, ValidationWarning, validatePieces(pieces,restrictions,{serviceCategory,carrier,destCountry}). Chargeable = max(actual, volumetric) per unit × qty. Volume = LWH cm/1e6. Volumetric = LWH cm/divisor.
- CREATED `components/piece-builder.tsx` — exports PieceBuilder + emptyPiece. Multi-piece UI: add/duplicate/remove/clear/CSV+XLSX import (xlsx SheetJS)/XLSX template download; per-line packageType,quantity,LWH,dimUnit,weight,wtUnit,description,customerRef,stackable; shows per-line + totals panel + amber non-blocking warnings ("requires admin approval").
- MODIFIED carrier-services route (returns restrictions), quotes route (computes divisor+shipmentCalc, persists ShipmentPiece + PackageValidationWarning rows on create/update, derives pieces/weightKg from pieceRows), quote-request-form (Step-3 uses PieceBuilder, pieceRows in FormState, divisor/shipment memos).
- INSTALLED xlsx@0.18.5.
- GAP (address in Phase E): ShipmentPiece + PackageValidationWarning persisted but NOT yet displayed in admin/customer quote detail pages.

## Sprint 2.1 Phase D (DONE, checkpointed "Sprint 2.1 Phase D: tariff engine + import wizard + zones")
- lib/admin-api.ts: guardAdmin() (session+ADMINISTRATOR role), audit(), coercion helpers, const arrays CATEGORY/DIRECTION/BASIS/DIM_UNIT/WT_UNIT/TARIFF_STATUS.
- lib/admin-resources.ts: RESOURCES registry {model,label,orderBy,build(body)} for volumetric-rules, service-restrictions, surcharges, country-zones, carrier-services.
- API: /api/admin/config/[resource] (+[id]) generic CRUD; /api/admin/tariffs (+[id] action-based lifecycle validate/activate/deactivate/archive/duplicate/rollback/add-row/update-row/delete-row; +/compare); /api/admin/tariff-import (+[id]). All use @/lib/prisma, guardAdmin, audit.
- Components: admin-config.tsx (generic ConfigResource + section wrappers VolumetricAdmin/RestrictionsAdmin/SurchargesAdmin/CountryZonesAdmin/CarrierServicesAdmin, re-exports TariffsAdmin & TariffImportWizard); admin-tariffs.tsx (TariffsAdmin list+compare+NewTariff+TariffDetail lifecycle); admin-tariff-import.tsx (6-step wizard, client XLSX parse, import as NEW DRAFT version).
- admin-portal.tsx: imported new components, added 7 section render conditions (carrier-services, tariffs, tariff-import, country-zones, surcharges, volumetric, restrictions).
- lib/navigation.ts adminNav: added Carrier Services, Tariff Modules, Tariff Import, Country & Zones, Surcharges, Volumetric Rules, Package Rules.

## Sprint 2.1 — Phase E (auto base-rate + surcharge + admin breakdown vs customer view + approval audit) — COMPLETE
- `lib/rate-engine.ts`: pure carrier rate + surcharge engine. `matchTariffRow` (best active row by specificity + weight band), `computeBaseRate` (ratePerKg/flatRate/additionalKgRate/min-max clamp), `applySurcharges` (FIXED/PERCENTAGE/PER_KG/PER_CHARGEABLE_KG/PER_PIECE/PER_SHIPMENT/PER_PALLET, min/max clamp, matches by carrier/serviceCategory/direction/country/zone via eqOrNull), `buildRateResult` → RateResult status CALCULATED or MANUAL_REQUIRED (never invents figures when weight<=0 or no row match). All lines customerVisible:false.
- `app/api/admin/quotes/[id]/calculate/route.ts` POST (guardAdmin): computes chargeable weight (piece-calc + resolveDivisor), derives zone from countryZoneMapping by direction, gathers rows from ACTIVE TariffVersions, calls buildRateResult, applies commercial defaults markupPct=15/vatPct=20/discountPct=0 → suggestedPrice. Upserts QuoteCalculation (quoteId unique) + recreates lines. Audits `calculate:<status>`. NOTE: guardAdmin returns full session → use `admin?.user?.id` for actorId.
- `app/api/admin/quotes/[id]/quotation/route.ts`: on save, if finalPrice deviates from QuoteCalculation.suggestedPrice by >0.01, creates PricingOverride (field:finalPrice) + AuditLog 'price-override' with reason from body.overrideReason. Always audits approve-send/save-draft.
- `app/api/quotes/route.ts` GET: admin payload now includes shipmentPieces, validationWarnings, overrides, calculation{lines}. Customer payload UNCHANGED (no calculation → customer never sees carrier breakdown).
- `components/admin-portal.tsx` AdminQuoteDetail: manual-pricing useMemo renamed `pricing` (was colliding with new `calc` state). Added Pieces table, validation-warnings amber box, "Suggested carrier rate" panel (admin sees ALL lines + chargeable wt/divisor/zone + subtotal + suggestedPrice + Apply button; MANUAL_REQUIRED shows reason), "Auto-calculate suggested rate" button, override-reason input. `runCalc()` POSTs calculate; `applySuggested()` copies carrierCostSubtotal + markup/vat/discount into manual pricing panel.
- CORE RULE enforced: auto-calc = suggestion only, never auto-sends; admin reviews + may override (audited) + must approve.

## Sprint 2.1 — Phase F (COMPLETE)
Post-acceptance booking checklist + re-approval gating.
- **BookingChecklist model** (schema.prisma): quoteId @unique cascade, 8 booleans (senderComplete, receiverComplete, pickupAddressComplete, deliveryAddressComplete, contactsComplete, documentsComplete, packagesConfirmed, dataUnchangedConfirmed) all default false, completedAt, timestamps, @@map booking_checklists.
- **Quote fields:** workflowStage (QUOTATION|BOOKING), bookingJson Json?, needsReapproval Boolean default false, relation bookingChecklist.
- `app/api/admin/quotes/[id]/booking-checklist/route.ts` — guardAdmin; GET lazily creates+loads by quoteId; POST merges booleans, computes complete, upserts w/ completedAt, audits checklist:complete/update.
- `app/api/admin/shipments/book/route.ts` — TWO 409 guards before shipment creation: (a) quote.needsReapproval → "changed after acceptance, needs re-approval"; (b) checklist missing or not all 8 true → "complete the booking checklist".
- `calculate/route.ts` — post-acceptance (status ACCEPTED/BOOKED) recompute sets needsReapproval=true + audit reapproval-required.
- `quotation/route.ts` — approve action resets needsReapproval=false.
- `components/admin-portal.tsx` AdminQuoteDetail — checklist state + saveChecklist POST; amber needsReapproval banner; ACCEPTED branch shows 8-toggle checklist card + completeness indicator; Book button disabled until checklistDone && !needsReapproval.
- `app/api/quotes/route.ts` GET admin include has bookingChecklist:true (customer payload unchanged).

## Sprint 2.1 — Phase G (COMPLETE)
AI Shipment Assistant updated to be Sprint-2.1 aware.
- `app/api/ai/assistant/route.ts` — SYSTEM prompt now: maps to serviceCategory (EXPRESS|ROAD_FREIGHT|AIR_FREIGHT|SEA_FREIGHT, matching form CATEGORIES); extracts pieceRows array (one row per distinct package type; identical packages collapse into one row w/ quantity; unlimited rows; per-single-package dims in cm + weight kg; never fabricate dims); conditional requiredDocuments (commercial→Invoice+Packing List+Export decl; personal→Proforma; DG→MSDS; pallet/road→CMR); conditional questioning. Still NEVER outputs prices.
- Server post-processing: deriveCategory (maps legacy serviceType hint→category), normalisePieceRows (validates packageType against BOX/PALLET/CRATE/ENVELOPE/TUBE/BAG/DRUM/OTHER, clamps quantity, drops fabricated dims → '', shapes to PieceInput), recomputes pieces=sum(qty) & weightKg=sum(qty*weight). suggestServices called w/ serviceCategory as 3rd arg (wantsRoad works).
- extracted output now flows straight into form prefill (fwd_ai_prefill): serviceCategory + pieceRows consumed directly by quote-request-form prefill effect.
- `components/smart-quote-builder.tsx` — added Boxes import; Extracted panel shows Service (serviceCategory); new Packages card lists each pieceRow (qty × type, weight each, dims, description).

## Sprint 2.2 — Optional Carrier + Admin Final Decision (COMPLETE, deployed to staging)
- **Carrier preference is now OPTIONAL for customers.** Only mandatory field on quote step 1 = Service Category. `canContinue()` step 1 = `Boolean(form?.serviceCategory)` only.
- Quote form (`components/quote-request-form.tsx`): carrier label = "Preferred Carrier (Optional)"; empty option = "No preference — let ForwardOne choose the best service"; helper text added; review card shows preferred carrier if chosen else advisory that team will select. Note: file contains special chars `·` (U+00B7) and `…` (U+2026) — use python3 heredoc replaces, not batch_file_str_replace, for lines with them.
- **Schema additive fields** (nullable, pushed via `npx --yes prisma@5.22.0 db push`): `Quote.customerCarrierPreference` (customer_carrier_preference); `AdminQuotation.serviceSelected` (service_selected) + `AdminQuotation.overrideReason` (override_reason, @db.Text).
- `POST /api/quotes` stores `customerCarrierPreference` (null if none). `POST /api/admin/quotes/[id]/quotation` persists `serviceSelected` + `overrideReason` to AdminQuotation.
- **Admin final decision**: admin always decides Carrier/Service/Tariff/Transit/Final price. Customer choice never auto-becomes operational carrier. `AdminQuoteDetail` (inline in `components/admin-portal.tsx`) has a "Carrier decision" block (Customer preference / AI recommendation / Final selected carrier / Final selected service / Override reason) + pricing panel labels "Final carrier (admin decision)", "Final service (admin decision)" input, always-visible override reason. Both customer & admin sides verified in browser.

## Sprint 2.2 Phase A — AI Assistant → Full Quotation Wizard (completed)

Converted the AI Shipment Assistant into a complete quotation workflow (no app rebuild; all prior functionality preserved).

**Schema (additive, pushed):** Quote model gained `aiConversationJson Json?` and `submissionToken String?` (+ `@@index([submissionToken])`). A **partial unique index** `quotes_submission_token_unique ON quotes(submission_token) WHERE submission_token IS NOT NULL` was created via raw SQL (Prisma @unique on a new nullable col triggers a false data-loss warning, so it is kept as a plain field + manual partial index).

**New shared lib `lib/ai-quote.ts`:** `mapExtractedToForm(extracted)` → standard quote FormState shape; `normaliseAiPieceRows()` (never fabricates dims); `quotationMissing(form)` → mirrors POST /api/quotes quotation-stage validation + DG conditional. Single source of truth for Review render, direct submit and "Edit in standard form".

**`app/api/ai/assistant/route.ts`:** expanded extraction (postal codes, readyDate, currency, receiverName always, sender/receiver details, carrierPreference optional/never invented, specialInstructions). Now returns `form` + `missingMandatory` and overrides `readyToQuote = missingMandatory.length === 0` deterministically. AI still NEVER outputs prices.

**`app/api/quotes/draft/route.ts`:** persists `aiConversationJson` ({messages, extracted, ready}) so AI drafts are DB-backed (survive refresh/navigation/device/session). GET selects it.

**`app/api/quotes/route.ts`:** idempotency guard — if `submissionToken` replays for same user, returns existing quote (200, `idempotent:true`) instead of creating a duplicate. Stores `submissionToken` + `customerCarrierPreference` (from customerCarrierPreference||carrierName, kept SEPARATE from admin's final carrier). Verified via API: 2nd submit with same token returned same FWD ref, no duplicate.

**`components/smart-quote-builder.tsx`:** rewritten with `mode: chat|review`. readyToQuote shows 3 actions (Continue to Review Quote / Edit Shipment Details / Save Draft). Review screen groups fields into Mandatory / Optional / Required-after-acceptance, with Edit Quote (→ saves DB draft → /quote/new?draft=id, fully prefilled) + Submit Quote Request (idempotent token via useRef+crypto.randomUUID, 2-attempt retry, disabled while submitting, redirects to created quote detail). Save/Resume/Delete AI drafts UI. AI-failure fallback card ("Continue in standard form") preserves collected data. `app/quote/assistant/page.tsx` passes `?draft` as `initialDraftId`.

**IMPORTANT gotcha:** JSX text/attributes do NOT interpret `\uXXXX` escapes — they render literally. Always write actual UTF-8 chars (·, —, …, ', ×, €) in JSX. Fixed a batch of these in smart-quote-builder.

**Verification done (full):** tsc + production build pass; auth/idempotency/piece-storage/carrier-optional verified via real API calls; AI-failure fallback verified in browser. **Full AI→Review→Submit UI path verified live** (after credits restored): described a 2×BOX Road Freight Tirana→Milan shipment, AI extracted all fields correctly (ROAD_FREIGHT, 2×BOX 40×30×25 cm 8 kg, Marco Rossi receiver, Elira Hoxha sender, €500 commercial, cotton t-shirts, ready date, CMR + docs), readyToQuote activated, Review screen rendered all mandatory/optional/after-acceptance sections correctly, "Submit Quote Request" created FWD-2026-00017 (PENDING_REVIEW), redirected to `/customer/quotes/{id}` detail page. Carrier remains OPTIONAL throughout (not regressed).

## Sprint 2.2 Phase B — Carrier-specific volumetric calculations (COMPLETE, deployed to staging 2026-08-06)

- **Volumetric rules are DB records** (`VolumetricRule` model), NEVER hardcoded. Seeded in `scripts/safe-seed.ts` (13 rules): carrier+service (prio10) incl. TNT Economy÷4000, all others (FedEx Priority/Economy, DHL Express Worldwide, TNT Express)÷5000; carrier defaults (prio50)÷5000; category defaults (prio100) EXPRESS 5000/AIR_FREIGHT 6000/ROAD_FREIGHT 3000/SEA_FREIGHT 1000; global default (prio200)÷5000. Rule `service` values match `CarrierService.name` EXACTLY.
- **Engine:** `lib/piece-calc.ts` — `resolveVolumetricRule(rules,q)` does 5-level priority resolution (level 1 = carrier+service+origin+dest … level 5 = global default). Returns divisor, ruleName, priorityLevel/Label, formula, fallbackUsed (level>=4), conflict + conflictingRules, status ('RESOLVED'|'MANUAL_REQUIRED'), warnings. `calcShipment(pieces,divisor)` → per-row {actualWeight,volumetricWeight,chargeableWeight,volumeM3} (all ×qty) + totals; chargeable = max(actual, volumetric). `compareServices(...)` → admin-only per-service comparison rows. PieceInput uses length/width/height/weight (+ dimensionUnit/weightUnit), NOT lengthCm etc.
- **Calc route** `app/api/admin/quotes/[id]/calculate/route.ts` accepts body {carrier, service}; writes breakdownJson.volumetric (rule transparency) + breakdownJson.perPiece + breakdownJson.comparison; finalStatus uses 'MANUAL_REQUIRED' (CalcStatus enum has NO 'MANUAL' value — only CALCULATED/MANUAL_REQUIRED/OVERRIDDEN/APPROVED); needsReapproval set on recalc of ACCEPTED/BOOKED.
- **Admin transparency block** in `components/admin-portal.tsx` AdminQuoteDetail (after calc block): carrier/service/rule/priority/divisor/formula grid, fallback + conflict + warnings banners, per-piece table with totals, admin-only service comparison table (highlights selected service). Carrier & service are now DB-driven dropdowns fed by `/api/carrier-services`.
- **Customer safety:** `app/api/quotes/[id]/route.ts` returns calculation with a RESTRICTED select for non-admins (only status + total actual/volumetric/chargeable weight — never divisor, priority, costs, margin, comparison, breakdown). Customer QuoteDetail (`components/customer-portal.tsx`) shows a "Chargeable weight summary" (actual/volumetric/chargeable + final service) only after approval (status !== PENDING_REVIEW).
- Verified via throwaway resolver test (26 assertions all passing: each carrier divisor, multi-piece/identical-qty, priority, lane override, expired/inactive/no-rules→MANUAL, conflict, comparison) + tsc + prod build + auth smoke.

## Sprint 2.2 — Phase C (COMPLETE, deployed to staging)

### Service recommendation engine — `lib/service-recommendation.ts`
- `recommendServices(input, data)` — multi-factor scoring (NOT weight-only): +50 customer category, +30 carrier preference, +20 tariff availability, +10 divisor resolved, +5 zone/+5 zone-available, −3×soft warnings, −2 remote, chargeable-weight tiebreaker. Ineligible → −100−reasons.
- Respects customer serviceCategory: systemRecommendation = top eligible IN customer category; falls back to top eligible overall ONLY when the category has no configured service, and then sets `categoryWarning` (never silently replaces). Surfaces ineligible services with reasons + eligible alternatives.
- data loaded in calculate route: carrierServices, volumetricRules, restrictions (hard→ineligible / soft→warnings + dgEligible), zoneMaps (CountryZoneMapping), tariffVersions (ACTIVE + rows), surcharges. Uses piece-calc + rate-engine. Divisors always from DB VolumetricRule (never hardcoded).
- CRITICAL enum note: ServiceCategory enum = EXPRESS, ROAD_FREIGHT, AIR_FREIGHT, SEA_FREIGHT (NOT ROAD/AIR/SEA). Both Quote.serviceCategory and CarrierService.category use it.

### Schema additions (AdminQuotation, all nullable/additive — DB stayed 218 rows, no loss)
finalTransitTime String?, finalTariffVersionId String?, decidedBy String?, decidedAt DateTime?, decisionJson Json?

### Routes
- `calculate/route.ts`: reads prevCalc before upsert, builds `recommendation` + `recalcComparison` into breakdownJson. recalcComparison = null when no prevCalc, else {changed, serviceChanged, previous{...}, next{...}, chargeableWeightDelta, carrierCostDelta, suggestedPriceDelta}. Preserves prev approved calc in reapproval audit.
- `quotation/route.ts` (POST ADMINISTRATOR): builds decisionJson {originalCustomerPreference, originalAiRecommendation, originalSystemRecommendation, finalCarrier, finalService, isOverride, overrideReason, decidedBy, decidedAt, transitTime}. Reads body.transitTime/overrideReason/carrierSelected/serviceSelected. overrideReason stored (not mandatory).
- `app/api/quotes/[id]/route.ts` GET: FIXED privacy leak — was returning full adminQuotation to customers. Now non-admin gets customer-safe select (carrierSelected, serviceSelected, finalPrice, currency, subtotal, vat*, notes, finalTransitTime, status, timestamps); admin gets full. Mirrors calcSafe pattern.

### UI
- admin-portal AdminQuoteDetail: added Service-recommendation decision-support panel + Recalculation prev-vs-new panel + transit-time input.
- customer-portal QuoteDetail: added Service category + Preferred carrier (customer's own) to info grid; Carrier/Service/Transit time shown in quotation aside after approval; NO internal fields (cost/tariff/margin/score/override) exposed. Added `deciding` double-submit guard on Accept/Reject. Quote builder already had submissionToken idempotency (client + server-side lookup in quotes POST). UI language kept English to match existing app.

### Verification done
- tsc + prod build (14 routes) + auth smoke all pass. Recommendation engine verified end-to-end against real seeded DB data (Express stays Express; Road 2 pallets → Road, Express ineligible w/ girth reason; TNT Economy divisor 4000 vs others 5000; DG surfaced; categoryWarning on empty category). Recalc/reapproval + booking-checklist gate are build+logic verified, not live-UI verified.

## Sprint 2.2.1 Phase A — Quote Acceptance, Booking Details & Reapproval (COMPLETE, build-verified)

Separates QUOTE data from BOOKING data from ACTUAL SHIPMENT data. Customer provides booking details only AFTER acceptance. "Simple outside, powerful inside" — internal status codes never shown to customer.

### Schema (additive, nullable — no data loss)
- Quote: `bookingSubmittedAt DateTime?`, `bookingImpact String?`, `bookingChangesJson Json?` (bookingJson already existed, holds the customer booking payload).
- BookingChecklist: `customsInfoComplete Boolean @default(false)`, `dgRequirementsComplete Boolean @default(false)`, `customerSubmittedAt DateTime?`.
- No new QuoteStatus enum value. "Booking details required" is derived: `status===ACCEPTED && bookingSubmittedAt==null`.

### Change Impact Engine — lib/booking-impact.ts
`classifyBooking(quote, booking)` → `{changes: BookingChange[], overall: ImpactLevel}`. Levels: NO_PRICE_IMPACT / RECALCULATION_REQUIRED / MANUAL_REVIEW_REQUIRED (overall = max severity). Route country/city/postal + weight/pieces/dims/packageType/contentsType → RECALCULATION_REQUIRED; DG toggle/UN/class + isCommercial + incoterms → MANUAL_REVIEW_REQUIRED; contact/company/address/phone/email + goodsDescription + commercialValue → NO_PRICE_IMPACT. `customerImpactMessage(overall, submitted)` gives friendly text. WEIGHT_TOLERANCE 0.01.

### Customer flow
- `app/booking/[id]/page.tsx` — server gate (owner-only, status must be ACCEPTED, redirects if BOOKED). Passes safe quote (NO pricing) to form.
- `components/booking-details-form.tsx` — progressive-disclosure form; Road-freight logistics section only for ROAD_FREIGHT/SEA_FREIGHT. Save draft / Submit.
- `app/api/quotes/[id]/booking/route.ts` — owner-only POST `{booking, action:'save'|'confirm'}`. Stores booking→bookingJson (NEVER touches senderJson/receiverJson). On confirm: sets bookingSubmittedAt; RECALC/MANUAL → needsReapproval=true; NO_PRICE_IMPACT → auto-ticks customer checklist booleans + customerSubmittedAt; notifies customer+admins; audits.
- customer-portal.tsx: `<BookingSteps>` stepper + `<BookingCta>` (states: Complete Booking Details / reviewing / received / confirmed).

### Admin flow
- admin-portal.tsx: "Booking details vs accepted quote" panel — overall impact badge + change table (label/quoted/booked/impact). Checklist now includes conditional `customsInfoComplete` (when isCommercial) and `dgRequirementsComplete` (when dangerousGoods).
- booking-checklist route + shipments/book route: conditional required fields via `requiredFields(quote)`. Book route NOT hard-gated on bookingSubmittedAt (avoids deadlocking pre-existing accepted quotes).

Reuses existing needsReapproval loop (calculate sets it, quotation approve clears it) and all pricing/recommendation/volumetric/tariff/surcharge engines — NO parallel calc.

## Phase B — Quotation Versioning & Customer Reapproval (COMPLETED)

Quotations are versioned via AdminQuotation rows sharing one quoteId (no @unique on quoteId; @@unique[quoteId,versionNumber]). Key fields added: versionNumber, isCurrent, revisionReason, acceptedAt, rejectedAt, validUntil, internalNotes, includedServices, excludedServices, createdBy. 16 legacy rows backfilled as version=1/isCurrent=true. Additive migration only — no data loss.

Semantics:
- isCurrent = customer-facing head (exactly one). Unsent DRAFT has isCurrent=false; flips true on send.
- latestAcceptedVersion (highest ACCEPTED) = the ONLY booking source. Booking blocked when quote.needsReapproval=true.
- Customer PATCH /api/quotes/[id] with {status:'ACCEPTED'|'REJECTED'} (NOT {action}); gate requires current version status ∈ [SENT,APPROVED].
- Admin initial editor /api/admin/quotes/[id]/quotation refuses in-place edits of already-sent versions with code:'USE_REVISE' (409). Revisions go through /api/admin/quotes/[id]/revise (action 'draft'|'send', revisionReason required).
- revise 'send': prior versions isCurrent=false, new version isCurrent=true+SENT, quote.needsReapproval=true.
- Customer reject of a revision: version REJECTED, previous ACCEPTED preserved, quote stays ACCEPTED, needsReapproval=true (booking blocked). Reject with no prior accepted: quote REJECTED.

Customer-safe projection (lib/quotation-versions.ts customerSafeVersion + customer-service-label.ts): NEVER exposes carrierCost/markupPct/carrier brand/internal notes. Customer sees serviceLabel (brand-free), finalPrice, transit, validUntil, included/excluded, whatChanged (price/service/transit), and a version history (Version/Date/Price/Service/Status).

Libs: lib/quotation-versions.ts (version selection + customer-safe helpers), lib/quotation-build.ts (buildQuotationData — body keys match admin `values` state exactly). Frontends: components/customer-portal.tsx (QuoteDetail aside + history), components/admin-portal.tsx (AdminQuoteDetail line 19 — revise panel when alreadySent, version history table, info-only reapproval banner).

Verified end-to-end via HTTP (Aug 2026): version creation, no-overwrite, customer-safe (no leaks), whatChanged, accept→latestAccepted booking source, reject-preserves-previous, USE_REVISE guard, booking gate. All temp test data cleaned; DB at baseline (admin_quotations=16, quotes=25).

## Sprint 2.2.1 Phase C — Post-Booking Amendments, Shipment Lifecycle & Customer Tracking (COMPLETED, deployed to staging)
- Schema (additive/nullable only, no data loss): extended `ShipmentStatus` enum; added to `Shipment`: customsSubStatus, actionRequired/actionType/actionMessage, podPath, booked* snapshot (bookedWeightKg/bookedPieceCount/bookedService), actual* fields; added to `TrackingEvent`: country, customerDescription, internalDescription, carrierStatusCode, source, actionRequired; new models `ShipmentAmendment` + `ShipmentAdjustment`.
- Core lib: `lib/shipment-lifecycle.ts` (transitions, customer/admin labels, customs sub-status messages, amendment mode/classification, milestones). Reuses `lib/booking-impact.ts` ImpactLevel and `lib/customer-service-label.ts`.
- Admin API: shipments/book (snapshots booked*), shipments POST (lifecycle-validated status change + events + audit), [id]/amend, [id]/actual (never overwrites booked), [id]/adjustment (create+PATCH), [id]/cancel.
- Customer API: shipments GET (sanitized: customerServiceLabel, strips carrier cost/actual/booked service, hides internal event notes, filters adjustments), [id]/adjustment PATCH (approve/reject own charge), [id]/cancel-request POST.
- Public tracking API rewritten with friendly labels + milestones + customs messages + sanitized events.
- Admin UI: `components/admin-shipment-detail.tsx` (tabs: Lifecycle/Quoted-Booked-Actual/Timeline/Amendments/Charges) wired into admin-portal master-detail.
- Customer UI: `components/customer-portal.tsx` ShipmentDetail — added reload prop + 4 cards: pending charge approval, generic action-required, delivered/POD download, cancellation-request form; plus decided-charges history.
- KNOWN GAP: POD upload is NOT wired on the admin side yet (customer card displays podPath link only if set). Note for future sprint.

## Multiple Quote Options per Request (implemented)

One customer Quote Request can carry MULTIPLE offers. Flow: Quote Request → Admin Review → 1+ Quote Options → Customer selects ONE → existing Booking Flow.

Design = hybrid "primary + extras" (additive, backward-compatible; no parallel systems):
- New Prisma model `QuoteOption` (table `quote_options`): quoteId, adminQuotationId?, customerServiceId?, serviceName, transitTime?, sellingPrice, currency, carrierServiceId?, carrierName?, carrierService?, carrierCost, marginAmount, sortOrder, isSelected. Extras attach to the CURRENT head AdminQuotation id.
- The existing pricing panel is unchanged and produces the primary AdminQuotation head = "Offer 1".
- Admin adds EXTRA offers via `components/quote-options-builder.tsx` (rendered in AdminQuoteDetail). Save = POST replace-all to `app/api/admin/quotes/[id]/options`. Admin sees carrier cost + margin.
- Customer offer list = `buildCustomerOffers(current, currentExtras)` in `lib/quotation-versions.ts` = [primary from head via customerServiceLabel()] + [carrier-stripped extras via customerSafeOption()]. Customer payload NEVER contains carrierName/carrierCost/marginAmount/carrierService. Returned from BOTH `app/api/quotes` (list) and `app/api/quotes/[id]` (single) as `offers`.
- Customer selection PATCH sends `optionId`. If null/empty → accept head as today. If an extra → copy option values into the AdminQuotation head (sellingPrice→finalPrice, carrierName||current→carrierSelected, carrierService||serviceName→serviceSelected, transitTime→finalTransitTime, currency), toggle isSelected, then run existing ACCEPTED logic. Downstream (booking/revise/reapproval) unchanged — all keyed on AdminQuotation head.
- Re-review invalidation is automatic: options are keyed to a specific head id; a revision creates a new head so buildCustomerOffers only surfaces options where adminQuotationId === current.id. No extra code needed.
- Single-offer requests behave exactly as before.

Deployed to forwardone-staging.abacusai.app.

## Phase 2.5 — Master Data Management (completed)
Added a centralized, additive Location Master + admin management, backward-compatible with all existing free-text data.
- New Prisma models (all additive, isActive, snake_case @@map, FK onDelete Restrict/SetNull): Country, Region, City, PostalCode, PackageType, Currency. Kept SEPARATE from carrier zone/tariff tables (country_zone_mappings, postal_code_zones untouched).
- Seed data (scripts/safe-seed.ts, upsert-only): 250 ISO countries (scripts/iso-countries.ts, incl. Kosovo XK), 153 currencies (scripts/iso-currencies.ts), 10 package types (scripts/package-types.ts). Cities/Regions/PostalCodes intentionally NOT seeded (avoid inventing data) — architecture + admin import-ready. Recommended external source: GeoNames (free) for cities/postal.
- Public read APIs (session-guarded, return names/codes only): /api/locations/countries (?q), /api/locations/cities (?countryId&regionId&q), /api/locations/postal (?countryId&cityId&code).
- Admin CRUD via generic ConfigResource: lib/admin-resources.ts ResourceDef supports refGuard (prevents deleting referenced master data -> 409), filterFields, searchFields, take, include. Resources: countries, regions, cities, postal-codes, package-types, currencies. Routes: /api/admin/config/[resource] and /[id] (DELETE runs refGuard + catches P2003).
- Admin UI: components/admin-config.tsx wrappers (CountriesAdmin, RegionsAdmin, CitiesAdmin, PostalCodesAdmin, PackageTypesAdmin, CurrenciesAdmin), wired in admin-portal.tsx + navigation.ts (adminNav).
- Quote form (components/quote-request-form.tsx): CountryField/CityField/PostalField helpers use datalist (`<input list>`) fed by /api/locations/*; ANY typed value still accepted (back-compat). Wired into express/road/sea country+city+postal. Stored shape unchanged (sender/receiver stay string objects); /api/quotes untouched. Express "Preferred Service" dropdown stays configurable.
- DB after: 41 tables; countries 250, currencies 153, package_types 10; cities/regions/postal 0. No existing data changed. Verified: refGuard 409 on referenced-country delete, historical quotes load, tariff engine untouched.

## Phase 2.5 FINAL — GeoNames Location Master import (completed)
- Data source: GeoNames (geonames.org, CC BY 4.0). Importer: `nextjs_space/scripts/import-geonames.ts` (idempotent; reads /tmp/geo, GEO_DIR override). Datasets: admin1.txt, cities15000.txt, per-country postal <CC>.txt.
- Imported into existing Country/Region/City/PostalCode models (additive; NO carrier-zone/tariff-zone/remote-area tables touched): Regions 3865, Cities 33976, Postal 146368 (AL,IT,DE,GB,US,FR,ES,NL,BE,AT,CH,CZ,DK,IE,PL,SE). GR postal unavailable in GeoNames; PT excluded (street-level ~198k, disproportionate). More countries addable by dropping <CC>.txt into GEO_DIR and re-running (idempotent, dedups).
- Added nullable `PostalCode.placeName` (@map place_name) — GeoNames city name (e.g. "Milan") differs from postal place ("Milano"); placeName stores the postal town for `20121 — Milano` display. Postal cityId linked by countryId|lowercase(place) where names match; else null (placeName still shows).
- Dedup keys (models have NO unique except Region @@unique[countryId,name]): City = countryId|name|regionId; Postal = countryId|code.
- Public shared location APIs (all session-guarded, force-dynamic, from @/lib/prisma+@/lib/auth+@/lib/serialize): /api/locations/countries (q), /cities (countryId,regionId,q, returns region), /postal (countryId,cityId,code → returns placeName + matched flag), /regions (countryId,q) — NEW this phase. Reusable by Quote/Sender/Receiver/Booking/future Address Book/Shipment. take limits (50/100) — never loads all into browser.
- Quote form `components/quote-request-form.tsx`: CountryField = real searchable combobox (Popover + cmdk Command, selects from master, still displays historical free-text with "(free text)" tag). CityField = country-filtered datalist autocomplete showing "City — Region". PostalField = country/city-filtered datalist showing "code — placeName" + green ✓/amber "not in master" hint. All still accept free-typed values (backward-compatible; /api/quotes + sender/receiver string shape unchanged; historical quotes load fine).
- Verified test cases via preview: AL→Tirana ✓, IT→20121→Milano (matched) ✓, DE→Berlin→10115 ✓, GB→SW1→London areas ✓, US→California→Los Angeles→10001 ✓. Country search, region→city filter, 401 unauth all OK. DB additive-only (quotes 37, shipments 7, carrier/tariff zones intact). Deployed to forwardone-staging.abacusai.app. Phase 3 NOT started.

## Phase 3 — Core Operations MVP (Quote→Booking→Shipment→Delivered→Invoice) (COMPLETE, build+API verified)
Minimal core-operations layer to carry an ACCEPTED quote through booking, shipment lifecycle, documents and invoicing. Additive/backward-compatible only; no rebuild, no parallel systems; tariff engine untouched.

### Schema (additive, nullable — no data loss; pushed + generated; DB 43 tables)
- Shipment gained: `reference @unique` (FWD-YYYY-NNNNN), `awbNumber`, `customerServiceName`, `sellingPrice`/`sellingCurrency`, `operationalNotes`, relations `documents[]`, `invoices[]`. (booked*/actual* already existed from Phase 2.2.1 C.)
- NEW model `ShipmentDocument`: shipmentId, category, fileName, cloudStoragePath, contentType, sizeBytes, `isCustomerVisible` (default false — customer only sees visible docs), uploadedById, timestamps.
- NEW model `Invoice`: shipmentId, userId, customerName/Email, serviceName, sellingPrice, currency, `chargesJson` (Json[] line items), subtotal, total, notes, status (DRAFT|FINALIZED), createdById, finalizedAt, timestamps. Invoice created ONLY from a DELIVERED shipment; inherits reference/service/selling price. NO tax/fiscalization (operational invoice only).
- 7 existing shipments backfilled FWD-2026-00001…00007.

### References — lib/references.ts
`nextShipmentReference()` = FWD-YYYY-NNNNN, `nextInvoiceReference()` = FWD-INV-YYYY-NNNNN. Both derive next number by scanning the highest existing reference in that table (NOT a shared counter) → restore/import/delete safe (deleting the last invoice frees its number again). trackingNumber stays separate = `FWDTRK<digits>`.

### Libs
- lib/documents.ts — `documentCategoryLabel()` + category constants.
- lib/invoices.ts — invoice total/compute helpers (`computeTotals(sellingPrice, charges)` → {subtotal,total}), customer-safe shaping.

### API (all force-dynamic, session-guarded, customer-sanitized)
- POST /api/admin/shipments/book — creates Shipment from ACCEPTED quote + latestAcceptedVersion (guards: needsReapproval, full booking checklist). Sets reference, trackingNumber, customerServiceName (via customerServiceLabel — brand-free), sellingPrice/currency from accepted version, booked* snapshot. Idempotent (returns existing shipment if quote already booked).
- PATCH /api/admin/shipments/[id] — admin edits operational fields: status (lifecycle-validated), awbNumber, customerServiceName, sellingPrice, operationalNotes.
- /api/shipments/[id]/documents (GET list, POST create) + /[docId] (GET download → {url,fileName}, PATCH visibility). Customer GET filters `isCustomerVisible=true`; download blocked unless owner + visible. NO cloudStoragePath ever sent to customer.
- POST /api/admin/shipments/[id]/invoice — creates DRAFT invoice (409 unless shipment.status==='DELIVERED').
- /api/invoices (GET: admin=all, customer=own FINALIZED only) + /api/invoices/[id] (GET, PATCH action:'finalize' DRAFT→FINALIZED immutable). `customerSafeInvoice` returns {id, reference, shipmentReference (from shipment.reference), serviceName, sellingPrice, currency, charges (chargesJson), subtotal, total, status, createdAt, finalizedAt} — never carrier cost/margin/notes/DRAFT.

### UI
- Admin: `components/admin-portal.tsx` Operations table + `components/admin-shipment-detail.tsx` tabs (Lifecycle/Data/Timeline/**Documents**/**Invoice**/Amendments/Charges) — OperationalForm (edit awb/service/price/notes/status), DocumentsTab (upload/categorize/toggle visibility), InvoiceTab (create from delivered + finalize).
- Customer: `components/customer-portal.tsx` ShipmentDetail — header shows reference + customerServiceName; info grid shows Service/Current status/Tracking number/AWB (if set). Two NEW components appended before `function Empty`: `CustomerDocuments({shipmentId})` (GET /api/shipments/:id/documents, renders visible docs w/ documentCategoryLabel + Download via anchor click; renders nothing if 0/loading) and `CustomerInvoices({reference})` (GET /api/invoices filtered by shipmentReference===reference, renders FINALIZED invoice card: reference, serviceName, issued date, Finalized badge, service charge + chargesJson line items + Total using file-scope sym()/money(); nothing if 0/loading).

### Verification
- tsc + prod build (all routes) + auth smoke pass. Invoice backend verified end-to-end via real API (admin login → create invoice on DELIVERED FWD-2026-00007 → DRAFT FWD-INV-2026-00001 inheriting Express Economy/€200 → finalize → FINALIZED w/ finalizedAt → appears in GET /api/invoices). Customer-safe shapes confirmed by code + field-name audit. Test invoice deleted afterward (prod clean; next real invoice = FWD-INV-2026-00001). Customer document/invoice UI components build-clean; NOT yet browser-verified with live customer login (QA customer owns no delivered shipment).
- Customer sanitization rules enforced everywhere: never leak actualCarrierCost/actualCarrier*/bookedService/operationalNotes/carrier brand/DRAFT invoices/cloudStoragePath. AWB + tracking ARE customer-facing.

## Invoice Template & Company/Billing Profile (added)
- **Printable invoice template** (single-source A4 HTML in `lib/invoice-html.ts`) powers browser preview, Print and PDF download identically. Brand green #16A34A / navy #0A1628.
- `lib/invoice-view.ts` `buildInvoiceViewData(invoiceId, session)` assembles the view model AND enforces permissions in one place: admin sees any (DRAFT+FINALIZED); customer sees only own FINALIZED (else null→404). NEVER exposes carrier cost, ForwardOne margin, internal carrier, or internal/operational notes. Freight = sellingPrice as line 1; each chargesJson entry = qty-1 line. VAT is DISPLAY-ONLY informational text (engine has no VAT; computeTotals unchanged).
- Document endpoint: `GET /api/invoices/[id]/document` → `{ html, fileName }`, auth-gated.
- Viewer page `/invoices/[id]/view` (iframe srcDoc + floating toolbar). Shared `components/invoice-actions.tsx` (View/Print/Download PDF) wired into `customer-portal.tsx` (CustomerInvoices) and `admin-shipment-detail.tsx` (InvoiceTab). PDF via existing `/api/generate-pdf` (+ /status poll) — already wired, do NOT re-init html2pdf.
- **Centralized Company/Billing Profile**: singleton `CompanyProfile` model (id "forwardone"); `lib/company-profile.ts` merges DB row over defaults, `missingCompanyFields()` lists unconfigured legal fields. Admin editable at **/admin/settings** (`components/company-profile-admin.tsx` + `app/api/admin/company-profile` GET/PUT, guardAdmin). Company details on invoices come from here, never hardcoded.
- User model has 6 nullable billing fields (billingLegalName, billingTradingName, billingTaxId, billingAddress, billingCountry, billingPhone) for per-customer Bill-To; template falls back to invoice.customerName/user.name/email when empty.
- All changes additive/backward-compatible; existing invoice records render via fallbacks.

## Public Website Redesign + Public Tracking (completed)
Frontend/marketing-layer redesign of the PUBLIC site into a modern premium B2B logistics look, plus unauthenticated shipment tracking. Additive/backward-compatible; NO portal/auth/quote/booking/tariff/invoice/DB logic changed.

### Palette decision (IMPORTANT)
- Public marketing pages now use a royal/electric BLUE accent `#2563EB` (hover `#1D4ED8`, light `#60A5FA`) over the existing navy `#0A1628`/`#070E1C`.
- The shared green brand utilities in globals.css (`.btn-primary`, green `#16A34A` tokens) were LEFT UNTOUCHED, so Customer/Admin portals stay GREEN. Public site = blue, portals = green (intentional, user informed; offered to unify later).

### New/changed files
- `components/site-header.tsx` (NEW client) — sticky scroll-shadow header, full nav (Home, Services `/#services`, Why `/#why`, How It Works `/#how-it-works`, About `/#about`, Contact `/#contact`, Track Shipment `/tracking`), mobile menu toggle, Login + blue "Get a Quote" CTA. Logo = gradient navy Boxes icon + "Forward**One**" (One in blue).
- `components/site-footer.tsx` (rewritten) — dark `#070E1C`, columns Navigation/Customer/Legal, contact (Tirana, Albania; operations@forwardone.com; +355 4 000 0000 w/ suppressHydrationWarning). Links `/privacy` `/terms`. © 2026.
- `components/home-tracking.tsx` (NEW client) — home tracking box, placeholder `FWD-2026-________`, fetches `/api/tracking`, compact result + "View full timeline" → `/tracking`.
- `components/hero-network.tsx` (NEW server) — pure animated SVG network/route visual (Air/Road/Sea chips), no stock photos.
- `app/page.tsx` (rewritten) — all required sections: hero, tracking, values, services, why, how-it-works (steps 01–05, blue), platform, about, final CTA, contact. Removed old carrier-brand services + all fake stats.
- `app/services/page.tsx` (rewritten) — brand-free services, blue accents.
- `app/tracking/page.tsx` (restyled blue) + `components/tracking-search.tsx` (green→blue only; logic unchanged).
- `app/privacy/page.tsx` + `app/terms/page.tsx` (NEW) — minimal generic legal pages, non-fabricated.
- `app/globals.css` — added `.section-kicker-blue` + `.hero-grid-dark` (green utilities untouched).
- `app/layout.tsx` — metadata tagline "Smart logistics. One platform. Global reach."
- `components/hero-quote-form.tsx` now UNUSED (left on disk, harmless).

### Public tracking API (`app/api/tracking/route.ts`) — extended, leak-safe
- Already public + force-dynamic. Lookup now prioritised exact-match: trackingNumber → shipment.reference → quote.reference (was only trackingNumber || quote.reference). Added length guard (6–40 chars else generic 404) for anti-enumeration. Returned `reference` = shipment.reference (customer-facing ref).
- Still leak-safe via `customerServiceLabel(carrier)` (maps FedEx/TNT/DHL/UPS/GLS/DPD → Express/Express Economy/Express Priority/Road Freight/Groupage/Air/Sea). Verified rendered output + JSON scanned: NO carrier brands / cost / margin / operationalNotes / bookedService leaked.
- Reference namespace note: Shipment.reference and quote.reference both `FWD-YYYY-NNNNN` but DIFFERENT sequences; public tracking uses shipment.reference (matches portal/invoices).
- Only `tracking-search.tsx` + `home-tracking.tsx` consume `/api/tracking`; customer portal uses a separate data path (unchanged).

### Verification
- run_build_check + test_nextjs_project PASS (build, tsc, 16 routes, auth smoke). Browser-verified: desktop home all sections, home tracking box (FWD-2026-00001 → IN_TRANSIT, Road Freight, Vlorë→Vienna), /tracking full timeline, footer, leak scan clean, anti-enum (short/nonexistent → generic 404). Good test values: FWD-2026-00001 (IN_TRANSIT), FWD-2026-00005/00007/00008 (DELIVERED), FWDTRK20260001.
- Checkpoint saved. NOT yet deployed (awaiting user approval; target forwardone-staging.abacusai.app).

## Unified Multi Quote — Offer field parity (COMPLETE, build + full e2e test verified; NOT yet deployed)
Goal: Primary Quote (Offer 1) and Additional Offers (Offer 2, 3…) share the SAME reusable full-pricing calculator. Purely admin UX/field-parity on additional offers — downstream Quote→Accept→Booking→Shipment→Invoice was ALREADY multi-offer-ready and is UNCHANGED. Additive/backward-compatible only.

### Single pricing engine
- CREATED `lib/offer-pricing.ts` — pure client-safe `computeOfferPricing(inputs)` → `{carrierCost,base,fuelAmount,markupAmount,discountAmount,subtotal,vatAmount,final,marginAmount,marginPct}` + `amount()`, `round2()`. Mirrors `lib/quotation-build.ts` math EXACTLY (base→fuel→markup→discount→subtotal→VAT→final). NO second engine.
- Margin convention (applied everywhere): `marginAmount = subtotal − carrierCost`; `marginPct = subtotal>0 ? marginAmount/subtotal*100 : 0` (ex-VAT). `sellingPrice` stores the VAT-inclusive `final`.

### Schema (additive/nullable — pushed + generated, no data loss)
- `QuoteOption` gained (all `@default(0)` Decimal unless noted): pickupFee, deliveryFee, remoteAreaFee, insuranceFee, dgFee, documentationFee, customsFee, otherCharges, fuelSurcharge, markupPct, markupAmount, discountPct, discountAmount, vatPct, vatAmount, subtotal, marginPct, `validUntil DateTime?`, `notes String?`. (marginAmount, carrierCost, sellingPrice, serviceName already existed.)

### UI
- REWROTE `components/quote-options-builder.tsx` — full collapsible offer cards using `computeOfferPricing` for LIVE preview. `blankOffer()` defaults markup 15 / VAT 20. Actions: Add offer / Start blank / Duplicate last + per-card Duplicate/Delete/collapse. Fields: Customer Service dropdown, service label, transit, valid until, customer notes; internal-only section (carrier + service dropdowns + all fee inputs + fuel/markup/discount/vat %); live Selling Price / Margin € / Margin % + breakdown. `NumField` helper at bottom. Offer 1 shown read-only primary summary chip; additional offers labelled Offer 2,3… (i+2). Primary panel in admin-portal.tsx left as-is (already had full calculator).

### API
- `app/api/admin/quotes/[id]/options/route.ts` — POST rows.map now RECOMPUTES via `computeOfferPricing(o)`; stores sellingPrice=round2(final), all fee fields via dec(), breakdown+margin via round2, validUntil via dateOrNull, notes via strOrNull. Kept replace-all + isSelected preservation. Additional offers' selling price is now COMPUTED (not manually typed) — matches primary. imports added: dateOrNull (admin-api), computeOfferPricing/round2 (offer-pricing).
- `lib/quotation-versions.ts` `customerSafeOption` now also returns `notes` + `validUntil` (safe admin-authored customer-facing fields). Still NO carrier/cost/margin exposed.

### Downstream (UNCHANGED — verified)
- Accept PATCH `app/api/quotes/[id]/route.ts` copies chosen QuoteOption's sellingPrice/carrierName/carrierService||serviceName/finalTransitTime/currency into AdminQuotation head; sets isSelected; non-selected offers preserved. Booking reads head (customerServiceName via customerServiceLabel → brand-free), invoice inherits selling price. No changes needed.

### Verification
- run_build_check + test_nextjs_project PASS (tsc, prod build 16 routes, auth smoke). Full throwaway e2e test (ALL 24 checks PASSED, then cleaned up): 2 offers via real options API (Express Economy TNT + Road Groupage GLS), Road computed subtotal 76.47 / selling 91.77 / margin 16.47; customer saw 3 offers with NO carrier brand / carrierCost / marginAmount leaked; accept Road → head=91.77/GLS/Groupage/ACCEPTED, isSelected flags correct, non-selected preserved; booked shipment carried 91.77 + brand-free customerServiceName "Groupage"; invoice inherited 91.77. Temp test script deleted.
- NOT yet deployed — awaiting user approval (target forwardone-staging.abacusai.app).

## BUGFIX — Customer saw only 1 offer after a quote revision (FIXED, verified, deployed)
Symptom (user, live site): admin created 2 offers (Offer 1 primary + Offer 2 Express Economy), admin panel showed both, but the CUSTOMER quote page showed only the primary. Confirmed on FWD-2026-00042.
Root cause: `QuoteOption` rows carry `adminQuotationId` = the head version current at save time. The **revise** route creates a NEW head version (V1→V2→V3) but did NOT re-point existing options, so they stayed attached to the old version. Customer GET (`app/api/quotes/[id]/route.ts`) filtered extras by `adminQuotationId === current.id` → orphaned options dropped. Admin options builder loads by `quoteId` only, so admin still saw them (the mismatch).
Fix (options are a single replace-all set per quote, so everything is now quote-scoped):
- `app/api/quotes/[id]/route.ts` GET: `currentExtras = allOptions` (all quote options, not filtered by head id).
- Same file PATCH accept: `chosenOption` lookup by `o.id === optionId` only; both `isSelected`-reset `updateMany` calls now keyed by `quoteId` (was `adminQuotationId: current.id`).
- `app/api/admin/quotes/[id]/revise/route.ts` send transaction: added `prisma.quoteOption.updateMany({ where:{quoteId}, data:{ adminQuotationId: version.id }})` so options follow the new head (data hygiene).
- Data repair: re-pointed existing orphaned options to their current head — fixed FWD-2026-00042 (1) and FWD-2026-00037 (2).
Verified: throwaway repro (send v1 → save 2 offers → revise to v2 → customer GET) returns 3 offers (primary + 2 extras), NO carrier/cost/margin leak. tsc + prod build + auth smoke PASS. Deployed to forwardone-staging.abacusai.app.

## Customer Master + Address Book (COMPLETE, build + tsc + e2e 21/21 PASS; NOT deployed)
Goal: unify Customers area into a single Customer Master (self-registered + admin-created in ONE system, no duplicates), clickable Customer Profile with tabs, reusable Address Book. Additive/backward-compatible ONLY; `User` model IS the single customer master (no 2nd customer DB, no 2nd pricing engine). Address selection in Quote/Booking is explicitly OUT OF SCOPE for now.

### Schema (additive/nullable — pushed + generated, no data loss)
- `User` gained: contactPerson String?, phone String?, billingCity String?, billingZip String?. (billingLegalName/billingTradingName/billingTaxId/billingAddress/billingCountry/billingPhone already existed; billingTaxId reused for NIPT.)
- `Address` gained: addressLine2 String?, state String?, zip String?, kind String? (kind validated to SENDER/RECEIVER/BILLING).

### New/changed API
- `app/api/admin/users/route.ts` — GET select now includes billingLegalName/TradingName/TaxId/Country/contactPerson/phone; NEW POST (admin creates customer; random password via crypto.randomBytes if none; creates Organization for BUSINESS_CUSTOMER when company name present; 409 on dup email).
- `app/api/admin/users/[id]/route.ts` (NEW) — GET (full profile + addresses + pricingProfile + related quotes/shipments/invoices + computed `metrics`); PATCH (name/email/role/isActive/billing*/contactPerson/phone; 409 email clash; 404 if ADMINISTRATOR).
- `app/api/admin/users/[id]/addresses/route.ts` (NEW GET/POST) + `.../addresses/[addressId]/route.ts` (NEW PATCH/DELETE) — ownership-checked, kind-validated.

### UI
- `components/customer-profile.tsx` (NEW client) — tabbed: Overview (inline edit + stat cards), Addresses (CRUD), Quotes/Shipments/Invoices (tables linking to /admin/quotes/[id], /admin/shipments/[id], /invoices/[id]/view), Pricing (reuses /api/admin/pricing-profiles), Reports. GREEN portal styling.
- `components/admin-portal.tsx` — imports CustomerProfile; renders it when section==='customers'/'business-customers' && itemId, else enhanced Customers list. Customers list: search by name/legal/trading/NIPT, New-customer inline form (POST), clickable rows → /admin/{customers|business-customers}/{id}, columns Legal/Trading + NIPT. New props defaultRole, reload.

### Metrics rules (do NOT invent metrics — computed from existing data only)
- Revenue = sum of FINALIZED invoice.total only (Invoice.status String default "DRAFT"; FINALIZED=finalized).
- Quotes: Accepted counts ACCEPTED+BOOKED; Rejected counts REJECTED+CANCELLED; Pending counts PENDING_REVIEW+QUOTED.
- Shipments: Delivered counts DELIVERED+FINANCIALLY_CLOSED.

### Verification
- run_build_check + test_nextjs_project PASS (tsc exit 0, prod build 16 routes incl /admin/[[...section]], auth smoke OK). Throwaway e2e (scripts/qa-customer-master.mjs, since DELETED): 21 passed / 0 failed — admin create customer+NIPT+address, list/search fields, dup-email 409, profile GET metrics+arrays, PATCH persist, address create/list/patch, pricing upsert link, existing self-reg customer profile loads. Test data cleaned up.
- Checkpoint saved. NOT yet deployed — awaiting user approval (target forwardone-staging.abacusai.app).

## Admin Manual Quote + Accept-on-Behalf (COMPLETE, build + tsc + full e2e verified; NOT yet deployed)
Goal: Admin can (1) create a Quote Request manually when details arrive off-portal (WhatsApp/Email/Phone/Admin), and (2) accept a quotation ON BEHALF of the customer with an audit trail. Additive/backward-compatible ONLY — reuses the existing Quote → Multi-Offer → Booking → Shipment → Invoice flow. NO second quotation workflow, NO second pricing engine.

### Schema (additive/nullable — pushed + generated, no data loss)
- `Quote` gained: requestSource String?, internalRequestNotes String? @db.Text, createdByAdminId String?, acceptedOnBehalf Boolean @default(false), acceptedByAdminId String?, acceptedOnBehalfAt DateTime?, acceptanceSource String?, acceptanceReference String?, acceptanceNote String? @db.Text. (acceptedByAdmin is NOT a relation — only the scalar id; UI shows id as fallback.)

### New API
- `lib/quote-reference.ts` — nextQuoteReference(year) → FWD-YYYY-NNNNN, counter-synced, shared namespace.
- `app/api/admin/quotes/create/route.ts` (POST, guardAdmin) — requires customerId; mirrors the customer `/api/quotes` POST build EXACTLY (categoryFor/serviceTypeFor, resolveDivisor/calcShipment, progressive ROAD vs express validation, suggestServices, shipmentPiece rows + packageValidationWarning, reference retry loop). Reads pieceRows[] (fields: packageType, quantity, weight, length, width, height, dimensionUnit, weightUnit, stackable). Sets userId=customer.id, organizationId, status PENDING_REVIEW, requestSource (WHATSAPP/EMAIL/PHONE/ADMIN, default ADMIN), internalRequestNotes (from body.internalNotes), createdByAdminId. Creates customer notification + audit `admin-manual-create`.
- `app/api/admin/quotes/[id]/accept-on-behalf/route.ts` (POST, guardAdmin) — requires source (WHATSAPP/EMAIL/PHONE); loads quote+adminQuotations+quoteOptions+user; pickCurrentVersion must be SENT/APPROVED else 409; optional optionId resolves the chosen QuoteOption into the head exactly like the customer PATCH accept; marks AdminQuotation ACCEPTED + Quote ACCEPTED + needsReapproval false + audit fields (acceptedOnBehalf, acceptedByAdminId, acceptedOnBehalfAt, acceptanceSource, acceptanceReference, acceptanceNote). Does NOT block expired (records acceptedWhileExpired). Audit `admin-accept-on-behalf` + emailQuoteAccepted.

### UI
- `components/admin-manual-quote.tsx` (NEW client) — customer search (name/email/legal/trading/NIPT) + inline New-customer form (POST /api/admin/users → prepends+auto-selects); on select fetches /api/admin/users/[id]/addresses, per-party "Use a saved address" chips prefill sender/receiver; shipment fields mirror customer form via PieceBuilder (@/components/piece-builder, emptyPiece) + calcShipment/resolveDivisor (@/lib/piece-calc); requestSource dropdown, internalNotes; submit POST /api/admin/quotes/create → toast + router.push('/admin/quotes/'+id). Sends pieceRows[] + pieces + weightKg.
- `components/accept-on-behalf.tsx` (NEW client) — if quote.acceptedOnBehalf shows read-only audit block; else if head SENT/APPROVED & not ACCEPTED/BOOKED shows collapsible form: offer selector (primary + quote.quoteOptions), source (WhatsApp/Email/Phone), reference, note → POST accept-on-behalf → reload.
- `components/admin-portal.tsx` (EDITED) — imports both; `manualQuote` state toggles quotes-list between `<AdminManualQuote users .../>` and `<QuotesAdmin onNew=.../>`; QuotesAdmin gained onNew + a `+ New Quote Request` btn-primary (non-compact only); `<AcceptOnBehalf quote reload/>` inserted right after `<QuoteOptionsBuilder/>` in AdminQuoteDetail.

### Data contract note
- Admin single-quote view comes from shared `/api/quotes` list + GET `/api/quotes/[id]` isAdminView branch (returns raw quote incl. all new audit fields + adminQuotation head + quoteOptions). Customer branch uses customerSafeVersion/buildCustomerOffers with carrierSelected:null — NO carrier/cost/margin leak (re-verified as the real customer).

### Verification (this session)
- run_build_check + test_nextjs_project PASS (tsc exit 0, prod build 16 routes incl the 2 new endpoints, auth smoke OK). Throwaway e2e (login as admin → create BUSINESS_CUSTOMER + NIPT → POST manual quote source=WHATSAPP with pieceRows → send quotation (approve, GLS/Groupage) → add extra offer (TNT/Express Economy) → verified customer projection shows BOTH offers brand-free with NO leak (carrierSelected/carrierName null) → accept-on-behalf source=WHATSAPP ref=WA-CONF-123 → audit fields persisted, quote ACCEPTED → complete booking checklist → book shipment: BOOKED, trackingNumber, sellingPrice 82.8 inherited, customerServiceName "Groupage" brand-free). All test data (2 users, 1 quote, 1 shipment + cascade + org) DELETED after; DB confirmed clean.
- Checkpoint saved. NOT yet deployed — awaiting user approval (target forwardone-staging.abacusai.app).

## Invoice & Billing Finalization (COMPLETE, build+tsc+e2e PASS; NOT yet deployed)
Goal: make the existing Phase 3 Invoice/Billing flow a usable business invoice system — additive/backward-compatible ONLY, reuse existing invoice models/routes. NO second billing system, NO fiscalization/accounting, NO Auto Quote. Invoices always use the accepted SELLING price — never carrier cost/margin.

### Schema (additive/nullable — pushed + generated, no data loss)
- `Invoice` gained: vatPct Decimal?(5,2), vatAmount Decimal?(12,2), paymentTerms String?, dueDate DateTime?.
- `CompanyProfile` gained: defaultVatPct Decimal?(5,2), paymentTermsDays Int?.

### Logic
- `lib/invoices.ts` computeTotals(sellingPrice, charges, vatPct?) → {subtotal, vatPct, vatAmount, total}. subtotal(net)=sellingPrice+charges; vatAmount=round2(subtotal*pct/100); total=subtotal+vatAmount. vatPct default 0 → vatAmount 0, total=subtotal (backward compat). round2 helper added.
- `lib/invoice-eligibility.ts` (NEW, pure/client-safe) — invoiceEligibility(s)→{eligible,reason}; canInvoiceShipment(s). Rules: CANCELLED→never; IMPORT→status in IMPORT_INVOICEABLE_STATUSES (CUSTOMS_CLEARANCE, CUSTOMS_HOLD, OUT_FOR_DELIVERY, DELIVERED, FINANCIALLY_CLOSED); EXPORT→(actualWeightKg||actualChargeableWeightKg) AND sellingPrice present; unknown direction→require sellingPrice. Same helper used by API route AND InvoiceTab client (shipment rows carry quote.direction+actualWeightKg+sellingPrice).
- `lib/company-profile.ts` — CompanyProfile type + COMPANY_PROFILE_DEFAULTS gained defaultVatPct(0), paymentTermsDays(0); getCompanyProfile reads Number(...)||0.

### API
- `app/api/admin/shipments/[id]/invoice/route.ts` POST — includes quote:{direction}; replaced DELIVERED gate with invoiceEligibility()→409+reason; keeps duplicate prevention (findFirst returns existing). On create pulls company profile: vatPct=defaultVatPct||0, computeTotals with vat, termsDays=paymentTermsDays||0, paymentTerms='Net N' & dueDate=now+N days when N>0 else null; stores vatPct/vatAmount only when >0.
- `app/api/invoices/[id]/route.ts` PATCH edit — recomputes totals when charges OR vatPct change (reuses the unchanged one); handles paymentTerms (strOrNull) + dueDate (parse/null); stores vatPct/vatAmount null when 0. Finalize branch unchanged. customerSafeInvoice + `app/api/invoices/route.ts` list gained vatPct/vatAmount/paymentTerms/dueDate.
- `app/api/admin/company-profile/route.ts` PUT — numOrNull/intOrNull helpers; data includes defaultVatPct, paymentTermsDays. GET returns full raw row (new fields included).

### UI / PDF
- `lib/invoice-view.ts` — billTo gained city/zip; invoice gained vatPct/vatAmount/paymentTerms/dueDate; user select gained billingCity/billingZip.
- `lib/invoice-html.ts` — billTo shows [zip, city] line before country; metaLeft shows Payment Terms + Due Date rows (auto-hide empty); real VAT row (hasVat = vatPct>0 && vatAmount>0): subtotal label 'Net Subtotal' vs 'Subtotal', 'VAT (x%)' amount row. Navy #0A1628 + green #16A34A preserved. Bottom vatInfo note block unchanged. NOTE: word "margin" appears only as CSS style props (margin:0 auto etc.) — not a data leak.
- `components/admin-shipment-detail.tsx` InvoiceTab — uses invoiceEligibility client-side for empty-state message + create-button disable; DRAFT-only "VAT & payment terms" form (VAT rate %, Payment terms, Due date + Save billing settings → PATCH). Summary shows Net subtotal + VAT + Terms/Due when vatPct>0. Footer: "Selling-side figures only — internal carrier cost and margin are never shown."
- `components/company-profile-admin.tsx` — added defaultVatPct + paymentTermsDays fields to FIELDS array (admin-configurable).

### Verification (this session)
- run_build_check PASS; tsc --noEmit exit 0; prod build exit 0 (16 routes). test_nextjs_project: tsc+build+auth smoke PASS (the /api/auth/[...nextauth] __webpack_require__.C dev-mode message is a pre-existing harmless Next14+NextAuth artifact; auth smoke login 200 + valid session; no auth code touched).
- Throwaway e2e (qa-invoice.mjs, DELETED after): seeded customer w/ full NIPT+legal+billing address/city/zip, EXPORT quote ACCEPTED, DELIVERED shipment w/ actualWeightKg+sellingPrice 250 + internal carrier "INTERNAL-CARRIER-X"+cost 120 → create draft invoice (uses selling 250, DRAFT) → PATCH vatPct=20 → vatAmount 50, total 300 → GET document HTML asserts legal name, NIPT, billing address, city, zip, customer service, price 250, VAT(20%), total 300, payment terms present AND no carrier/cost leak → finalize → customer login views FINALIZED (no leak) → duplicate POST returns same invoice → non-eligible EXPORT shipment blocked 409. 27/27 real assertions passed (the 1 "margin" fail was CSS false positive). Test data cleaned up.
- Checkpoint saved. NOT yet deployed — awaiting user approval (target forwardone-staging.abacusai.app).

## Public Guest Quote Request (COMPLETE, build+tsc+e2e PASS; NOT yet deployed)
Goal: let non-logged-in visitors submit a quote request. Additive/backward-compatible ONLY — reuses the existing Quote → Admin Review → Multi-Offer → Acceptance → Booking → Shipment → Invoice flow. NO separate guest quotation DB or pricing path. No Auto Quote.

### Schema (additive/nullable — pushed + generated, no data loss)
- `UserRole` enum gained `GUEST`.
- `Quote` gained: isGuest Boolean @default(false), guestName String?, guestCompany String?, guestPhone String?, guestEmail String?, linkedToCustomerAt DateTime?, linkedByAdminId String?.
- `types/next-auth.d.ts` — added `'GUEST'` to the 3 role unions (User/Session/JWT) so authorize()'s `role: UserRole` stays assignable. (GUEST users never authenticate — isActive false.)

### Key design
- `Quote.userId` is a required FK, so ALL guest quotes attach to ONE sentinel "guest-pool" user (`lib/guest-user.ts` → getGuestPoolUserId(), email `guest-pool@forwardone.internal`, role GUEST, isActive false, unusable passwordHash). This keeps every existing userId-scoped query working and does NOT create a duplicate customer per guest. Real guest contact lives on the Quote row (guestName/Company/Phone/Email) and is PRESERVED forever (audit) even after an admin links the quote to a real customer.
- guestEmail always stored LOWERCASED → signup auto-link + link-customer match on lowercased email.

### New API
- `app/api/public/quotes/route.ts` (POST, NO session) — validates contact (fullName OR companyName required; phone + email mandatory; email regex; length caps 160/40), in-memory IP rate limit 8/10min (`lib/rate-limit.ts`), then MIRRORS `/api/quotes` POST logic exactly (categoryFor/serviceTypeFor, resolveDivisor/calcShipment with carrier:'' , progressive ROAD vs express required-field validation, suggestServices, FWD-YYYY-NNNNN counter-synced reference retry loop, shipmentPiece rows + packageValidationWarning). Sets userId=guest-pool, isGuest:true, requestSource:'PUBLIC_WEBSITE', status PENDING_REVIEW, guest fields. Creates notification + emailQuoteReceived({name,email}). Returns ONLY `{reference, email}` (no id → no enumeration/leak). `dynamic='force-dynamic'`.
- `app/api/public/quote-meta/route.ts` (GET, NO session) — returns `{countries, volumetricRules, restrictions, customerServices}`. CRITICAL leak-guard: volumetricRules filtered to `carrier:null, service:null` (the only rules that match when carrier:'' — same set server resolves against) and field-whitelisted; restrictions field-whitelisted WITHOUT the carrier column; customerServices only id/name/category/transitTime/displayOrder. NO carrier brand / cost / margin ever leaves the server.
- `app/api/admin/quotes/[id]/link-customer/route.ts` (POST, guardAdmin) — mode 'existing' (attach guest quote to an existing CUSTOMER/BUSINESS_CUSTOMER by userId) or 'create' (create customer from guest fields: role BUSINESS_CUSTOMER if guestCompany else CUSTOMER, random bcrypt password, Organization for business; if email already exists link to it, 409 if that account isn't a customer). Sets quote.userId + linkedToCustomerAt + linkedByAdminId, PRESERVES guest fields. audit() logged.
- `app/api/signup/route.ts` — after user.create, `quote.updateMany({where:{isGuest:true, guestEmail:email(lowercased), linkedToCustomerAt:null}, data:{userId:user.id, linkedToCustomerAt}})` in try/catch → new signups auto-adopt their prior guest quotes; guest fields preserved.

### UI
- `app/quote/start/page.tsx` (public choice; session→redirect /quote/new; else cards Continue-as-Guest→/quote/guest, Login→/login?callbackUrl=/quote/new). `app/quote/guest/page.tsx` (PublicQuoteHeader + GuestQuoteForm). `app/quote/guest/success/page.tsx` (server; reads searchParams ref/email; success + mono reference badge + Create-account CTA → /signup?email=<email>). All `dynamic='force-dynamic'`.
- `components/guest-quote-form.tsx` (client, sonner toast) — 4 progressive steps Contact→Route→Shipment→Review; reuses PieceBuilder/emptyPiece/calcShipment/resolveDivisor(carrier:'')/suggestServices; fetches /api/public/quote-meta; free-text city/postal + country combobox; POSTs /api/public/quotes → router.push('/quote/guest/success?ref=&email=').
- `components/public-quote-header.tsx` (logo + "Secure quote request").
- `components/guest-link-panel.tsx` (client, sonner) — in AdminQuoteDetail; shows guest badge + contact when quote.isGuest; if linked shows confirmation, else "Link to Customer Master" (create-new-customer button + existing-customer search via /api/admin/users) → POST link-customer.
- `components/admin-portal.tsx` — imports GuestLinkPanel, renders `<GuestLinkPanel quote reload/>` in AdminQuoteDetail after header Status block.
- `components/auth-form.tsx` — email input `defaultValue={search?.get?.('email') ?? ''}` (guest→signup prefill).
- Public "Get a Quote" CTAs redirected /quote/new→/quote/start in: site-header, site-footer, app/page, app/services/page, logistics-tools. Authed CTAs (dashboard-shell, customer-portal) LEFT at /quote/new (correct — logged-in flow unchanged).

### Verification (this session)
- run_build_check PASS (tsc exit 0). test_nextjs_project PASS (tsc+prod build 19+ routes incl /quote/start, /quote/guest, /quote/guest/success, /api/public/quotes, /api/public/quote-meta, /api/admin/quotes/[id]/link-customer; auth smoke login 200 + valid session).
- Throwaway e2e (qa-guest.mjs, DELETED after; test data cleaned incl leftover rate-limit quote): 34/34 PASS — quote-meta public + NO carrier/cost/margin leak (key-level + substring checks); valid guest submit 201 returning only {reference,email}; DB row isGuest/requestSource=PUBLIC_WEBSITE/PENDING_REVIEW/lowercased email/attached to GUEST pool user; missing phone/email/name+company & bad email → 400; rate limit → 429 after threshold; admin /api/quotes lists it; admin GET /api/quotes/[id] (nested under `quote`) exposes guest fields + source; link-customer create (new customer w/ guest email, guest fields preserved) + existing (link to real customer, preserved); signup with matching email auto-links guest quote. NOTE: guest-pool sentinel user is intentionally permanent.
- Checkpoint saved. NOT yet deployed — awaiting user approval (target forwardone-staging.abacusai.app).

## Public Website Finalization + Quick Quote (COMPLETE, build+tsc+test PASS; NOT yet deployed)
Goal: finalize the PUBLIC-facing website (not a redesign) + QA pass, on top of the already-built Guest Quote flow. Additive/backward-compatible ONLY. Premium navy/royal-blue design preserved (#0A1628 / #2563EB / #070E1C / #60A5FA). No invented facts/stats/certs.

### CTA terminology (site-wide)
- Standardized to ONLY "Get a Quote" and "Track Shipment". Eliminated "Request a Quote", "Get Quote", bare "Quote", "Explore Services". Verified via grep — none remain in any .tsx.

### New component
- `components/quick-quote.tsx` (NEW, client) — homepage Quick Quote entry: From/To (text), Shipment type (select EXPRESS/ROAD_FREIGHT/AIR_FREIGHT), Weight (number). On submit builds URLSearchParams and router.push('/quote/start?from=..&to=..&type=..&weight=..'). NO price calc. Premium blue light style matching tracking box.

### Modified
- `components/guest-quote-form.tsx` — added prefill useEffect (runs once on mount, BEFORE quote-meta fetch) reading window.location.search: from→sender.country, to→receiver.country (free text OK), type→serviceCategory (validated vs EXPRESS/ROAD_FREIGHT/AIR_FREIGHT/SEA_FREIGHT), weight→pieceRows[0].weight (string). try/catch, early-return if no params. Nothing else in the tested form changed.
- `app/quote/start/page.tsx` — now reads searchParams, builds guestHref=/quote/guest?<forwarded from/to/type/weight>; "Continue as guest" Link uses guestHref. Logged-in redirect to /quote/new unchanged (params dropped for logged-in — acceptable).
- `app/page.tsx` — (a) import QuickQuote + LogIn icon; (b) HERO secondary CTA "Explore Services"(/#services) → "Track Shipment"(/tracking, Radar icon); (c) NEW Quick Quote section after tracking box (heading "Start a quote in seconds" + note that no price is auto-calculated, an operator reviews every quotation); (d) SERVICES/FINAL/CONTACT CTAs → "Get a Quote"; (e) PLATFORM section = Business Customer CTA: "Ship regularly?" intro + Create Account (/signup, btn-navy) + Login (/login, LogIn icon) + note "Registration is optional — you can always get a quote as a guest".
- `components/site-footer.tsx`, `app/services/page.tsx` — "Request a Quote" → "Get a Quote".
- `components/site-header.tsx` — mobile CTA label unified to "Get a Quote" (was "Quote").

### QA / Verification (this session)
- run_build_check PASS (tsc exit 0). test_nextjs_project PASS (tsc 0; prod build 19 routes; SSR lint clean; dev 200; auth smoke login 200 + valid admin session).
- Homepage mobile (390px) screenshot: clean, no horizontal overflow, all new sections stack well.
- Confirmed leak-safe (re-read): /api/tracking (customerServiceLabel brand-free, exact-match lookup, no internal descriptions) and /api/public/quote-meta (carrier-agnostic volumetric rules, restrictions w/o carrier column, customerServices id/name/category/transitTime/displayOrder). No carrier brand/cost/margin exposed publicly.
- Guest API validation relied on prior session's 34/34 e2e (unchanged). DB checked: no QA/RL leftover quotes. Temp qa/ screenshot dir removed.
- Checkpoint saved. NOT yet deployed — awaiting user approval (target forwardone-staging.abacusai.app).
