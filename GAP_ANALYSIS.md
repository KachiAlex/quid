# Quid MVP Gap Analysis Report
**SRS v2.0 vs Current Implementation**
**Date: June 1, 2026**

## Executive Summary

The current implementation has ** foundational infrastructure in place** but is missing **critical MVP features** required for launch. Approximately **40% of P0 (highest priority) requirements** are implemented, with significant gaps in switching, renewal protection, and analytics features.

---

## 1. User Registration and Authentication (FR-001 to FR-006)

### Status: PARTIALLY IMPLEMENTED (5/6 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-001: Email/password registration | ✅ IMPLEMENTED | Backend route exists, frontend form complete |
| FR-002: Google OAuth login | ✅ IMPLEMENTED | Backend routes exist, frontend has Google button |
| FR-003: MFA via SMS or authenticator | ⚠️ PARTIAL | Authenticator app implemented, SMS MFA missing |
| FR-004: Biometric authentication | ✅ IMPLEMENTED | WebAuthn integration complete |
| FR-005: Session timeout (30 min) | ❌ MISSING | JWT expiry set to 24h, no inactivity timeout |
| FR-006: Password reset via email | ✅ IMPLEMENTED | Flow complete with dev mode fallback |

**Gaps:**
- No SMS MFA option (Twilio integration exists but not used for MFA)
- No 30-minute inactivity timeout enforcement
- MFA redirect page not implemented (TODO in Login.tsx line 24)

---

## 2. Open Banking Integration (FR-010 to FR-016)

### Status: IMPLEMENTED (6/6 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-010: TrueLayer integration | ✅ IMPLEMENTED | Complete OAuth flow |
| FR-011: Bank selection UI | ⚠️ PARTIAL | Redirects to TrueLayer, no custom bank list |
| FR-012: OAuth 2.0 consent flow | ✅ IMPLEMENTED | User authenticates with their bank |
| FR-013: 12 months transaction history | ✅ IMPLEMENTED | Fetches and stores transactions |
| FR-014: Token expiry handling | ✅ IMPLEMENTED | Refresh token logic exists |
| FR-015: Multiple bank accounts | ✅ IMPLEMENTED | Supported in schema |
| FR-016: Revoke consent | ✅ IMPLEMENTED | Endpoint exists |

**Gaps:**
- No custom bank selection UI (relies entirely on TrueLayer's interface)
- No 7-day expiry notification system

---

## 3. Product Detection Engine (FR-020 to FR-026)

### Status: PARTIALLY IMPLEMENTED (4/6 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-020: Classification into categories | ✅ IMPLEMENTED | Rule-based classification for 7 categories |
| FR-021: Extract provider name | ✅ IMPLEMENTED | Extraction logic present |
| FR-022: Extract annual cost | ✅ IMPLEMENTED | Annualisation logic present |
| FR-023: Flag low-confidence classifications | ❌ MISSING | No user confirmation flow |
| FR-024: Classify-and-discard architecture | ✅ IMPLEMENTED | Raw transactions purged within 24h |
| FR-025: Reclassify on reconnect/90-day | ⚠️ PARTIAL | Manual reclassify endpoint exists, no auto-reclassify |
| FR-026: Detect duplicate/dormant | ❌ MISSING | Not implemented |

**Gaps:**
- No low-confidence confirmation UI
- No automatic reclassification at 90-day intervals
- No duplicate charge detection
- No dormant subscription detection
- Classification accuracy not tested against 85% target

---

## 4. Comparison Engine (FR-030 to FR-036)

### Status: PARTIALLY IMPLEMENTED (3/6 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-030: Whole-of-market comparison | ❌ MISSING | Rate database exists but not populated |
| FR-031: Rank by saving only | ❌ MISSING | No ranking algorithm implemented |
| FR-032: Display current vs best | ⚠️ PARTIAL | Comparison results table exists, no UI |
| FR-033: Daily rate updates | ❌ MISSING | No background job to update rates |
| FR-034: Display rate timestamp | ❌ MISSING | Not shown in UI |
| FR-035: Total overpayment display | ❌ MISSING | Not calculated or displayed |
| FR-036: Per-product saving display | ⚠️ PARTIAL | Stored in DB, not shown in UI |

**Gaps:**
- **CRITICAL**: No actual rate data in database
- No rate update job/scheduler
- No independent audit of ranking algorithm
- Comparison and Switch pages are stubs (only show product ID)
- No total overpayment calculation on dashboard

---

## 5. One-Tap Switching (FR-040 to FR-048)

### Status: NOT IMPLEMENTED (0/8 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-040: Commission disclosure | ❌ MISSING | No disclosure UI |
| FR-041: Pre-filled switching form | ❌ MISSING | No form implementation |
| FR-042: Affiliate-tracked link routing | ❌ MISSING | No Awin integration |
| FR-043: Record switch intent | ❌ MISSING | Switch events table exists but unused |
| FR-044: Record confirmed switch | ❌ MISSING | No affiliate webhook handling |
| FR-045: Switch confirmation screen | ❌ MISSING | Switch page is a stub |
| FR-046: Cancel switch intent | ❌ MISSING | No cancel flow |
| FR-047: Insurance switching | ❌ MISSING | No provider integration |
| FR-048: Energy switching | ❌ MISSING | No provider integration |

**Gaps:**
- **CRITICAL**: Entire switching flow is missing
- No affiliate network integration (Awin)
- No commission disclosure UI (regulatory requirement)
- No pre-filled forms
- Switch page is a placeholder

---

## 6. Quid Shield — Renewal Protection (FR-050 to FR-054)

### Status: NOT IMPLEMENTED (0/4 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-050: Detect upcoming renewals | ❌ MISSING | No detection logic |
| FR-051: Alert at 60/14 days | ❌ MISSING | No alert system |
| FR-052: Alert on price hikes >10% | ❌ MISSING | No price monitoring |
| FR-053: Surface best alternative | ❌ MISSING | Not implemented |
| FR-054: Automatic switching | ❌ MISSING | Deferred to V2 |

**Gaps:**
- Database table exists but no logic to populate it
- No renewal detection algorithm
- No email alert system for renewals
- No price hike monitoring

---

## 7. Hidden Money Finder (FR-060 to FR-063)

### Status: NOT IMPLEMENTED (0/4 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-060: Detect duplicate charges | ❌ MISSING | Not implemented |
| FR-061: Detect dormant subscriptions | ❌ MISSING | Not implemented |
| FR-062: Detect loyalty penalties | ❌ MISSING | Not implemented |
| FR-063: Generate recommendations | ❌ MISSING | Not implemented |

**Gaps:**
- No duplicate charge detection logic
- No dormant subscription detection
- No loyalty penalty comparison
- No dedicated "Hidden Money" section in UI

---

## 8. Financial Health Score (FR-070 to FR-074)

### Status: NOT IMPLEMENTED (0/4 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-070: Overall score (0-100) | ❌ MISSING | Not calculated |
| FR-071: Savings efficiency sub-score | ❌ MISSING | Not implemented |
| FR-072: Overpayment risk sub-score | ❌ MISSING | Not implemented |
| FR-073: Switching opportunity sub-score | ❌ MISSING | Not implemented |
| FR-074: Score trend over time | ❌ MISSING | Not implemented |

**Gaps:**
- No scoring algorithm
- No score display in dashboard
- No historical score tracking

---

## 9. Subscription Management (FR-080 to FR-083)

### Status: PARTIALLY IMPLEMENTED (1/4 P0 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-080: Display all subscriptions | ⚠️ PARTIAL | Products shown, no dedicated view |
| FR-081: Cancellation guidance | ❌ MISSING | Not implemented |
| FR-082: Mark as intentional | ❌ MISSING | Exclusion field exists in DB, no UI |
| FR-083: Track cost changes | ❌ MISSING | Not implemented |

**Gaps:**
- No dedicated subscription management page
- No provider-specific cancellation instructions
- No UI to exclude products from overpayment calculation
- No price change tracking

---

## 10. AI Financial Coach (FR-090 to FR-093)

### Status: NOT IMPLEMENTED (0/4 requirements)

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-090: Personalised recommendations | ❌ MISSING | No AI integration |
| FR-091: Overpayment context | ❌ MISSING | Not implemented |
| FR-092: Product-specific guidance | ❌ MISSING | Not implemented |
| FR-093: Regulatory language compliance | ❌ MISSING | Not applicable (no AI) |

**Gaps:**
- No AI service integration
- No recommendation engine
- No contextual guidance UI

---

## 11. Non-Functional Requirements

### Security (NFR-010 to NFR-018)

| Requirement | Status | Notes |
|------------|--------|-------|
| NFR-010: HTTPS/TLS 1.3 | ⚠️ PARTIAL | Helmet configured, but deployment SSL not verified |
| NFR-011: Data at rest encryption | ❌ MISSING | No KMS encryption configured |
| NFR-012: Field-level encryption | ❌ MISSING | PII not encrypted at field level |
| NFR-013: Session tokens | ✅ IMPLEMENTED | JWT with 24h expiry, refresh tokens |
| NFR-014: Classify-and-discard | ✅ IMPLEMENTED | Raw transactions purged |
| NFR-015: Security audit | ❌ MISSING | No penetration test completed |
| NFR-016: CSRF protection | ❌ MISSING | No CSRF tokens |
| NFR-017: Rate limiting | ✅ IMPLEMENTED | Express-rate-limit configured |
| NFR-018: Dependency scanning | ❌ MISSING | No automated scanning in CI |

### Privacy and GDPR (NFR-020 to NFR-027)

| Requirement | Status | Notes |
|------------|--------|-------|
| NFR-020: ICO registration | ❌ MISSING | Not registered |
| NFR-021: DPIA | ❌ MISSING | Not completed |
| NFR-022: Privacy Policy | ❌ MISSING | Not written |
| NFR-023: Right to deletion | ✅ IMPLEMENTED | Account deletion endpoint exists |
| NFR-024: Data minimisation | ✅ IMPLEMENTED | Classify-and-discard enforced |
| NFR-025: Consent logging | ✅ IMPLEMENTED | Consent logs table exists |
| NFR-026: Data portability | ❌ MISSING | Export endpoint not implemented |
| NFR-027: Cookie consent | ❌ MISSING | No cookie banner |

### Performance (NFR-001 to NFR-006)

| Requirement | Status | Notes |
|------------|--------|-------|
| NFR-001: Page load < 2.5s | ❌ UNTESTED | No performance monitoring |
| NFR-002: Bank to dashboard < 30s | ❌ UNTESTED | No end-to-end testing |
| NFR-003: Classification < 60s | ❌ UNTESTED | No performance logging |
| NFR-004: Comparison API < 3s | ❌ UNTESTED | No monitoring |
| NFR-005: 99.5% uptime | ❌ UNTESTED | No uptime monitoring |
| NFR-006: 500 concurrent users | ❌ UNTESTED | No load testing |

### Accessibility (NFR-030 to NFR-034)

| Requirement | Status | Notes |
|------------|--------|-------|
| NFR-030: WCAG 2.1 AA | ❌ UNTESTED | No accessibility audit |
| NFR-031: Keyboard navigation | ❌ UNTESTED | Not verified |
| NFR-032: Screen reader compatibility | ❌ UNTESTED | Not tested |
| NFR-033: Colour contrast | ❌ UNTESTED | Not verified |
| NFR-034: Responsive design | ⚠️ PARTIAL | Tailwind used, but not tested at 320px |

---

## 12. Regulatory Compliance

| Requirement | Status | Notes |
|------------|--------|-------|
| ICO registration | ❌ MISSING | Week 1 action not completed |
| TrueLayer DPA | ❌ MISSING | Not signed |
| FCA boundary opinion | ❌ MISSING | No legal review |
| DPIA | ❌ MISSING | Not completed |
| Privacy Policy | ❌ MISSING | Not drafted |
| FCA AR application | ❌ MISSING | Not submitted |
| Security penetration test | ❌ MISSING | Not completed |
| Commission disclosure | ❌ MISSING | Not implemented |

---

## Critical Path to MVP Launch

### Must Complete Before Launch (P0):

1. **Switching Flow** (FR-040 to FR-048)
   - Implement commission disclosure UI
   - Integrate Awin affiliate network
   - Build pre-filled switching forms
   - Implement switch event tracking
   - Build switch confirmation screen

2. **Comparison Engine** (FR-030 to FR-036)
   - Populate rate database with real market data
   - Implement daily rate update job
   - Build comparison UI with current vs best
   - Calculate and display total overpayment
   - Independent audit of ranking algorithm

3. **Renewal Protection** (FR-050 to FR-053)
   - Implement renewal detection algorithm
   - Build email alert system (60/14 days)
   - Implement price hike monitoring
   - Surface best alternatives in alerts

4. **Regulatory Compliance**
   - Register with ICO (£40)
   - Complete DPIA
   - Draft Privacy Policy (solicitor review)
   - Sign TrueLayer DPA
   - Obtain FCA boundary opinion
   - Apply for FCA AR status
   - Complete security penetration test

5. **Security & Privacy**
   - Implement field-level encryption for PII
   - Add CSRF protection
   - Implement data export endpoint
   - Add cookie consent banner
   - Set up dependency scanning in CI

6. **Performance & Monitoring**
   - Set up performance monitoring (CloudWatch/Sentry)
   - Conduct load testing
   - Implement uptime monitoring
   - Add performance logging

### Should Complete Before Launch (P1):

1. **Hidden Money Finder** (FR-060 to FR-063)
   - Duplicate charge detection
   - Dormant subscription detection
   - Loyalty penalty detection

2. **Subscription Management** (FR-080 to FR-083)
   - Dedicated subscription view
   - Cancellation guidance
   - Product exclusion UI

3. **Financial Health Score** (FR-070 to FR-074)
   - Scoring algorithm
   - Dashboard display

4. **Accessibility Audit**
   - WCAG 2.1 AA compliance
   - Screen reader testing

---

## Estimated Effort

| Feature | Estimated Effort | Priority |
|---------|------------------|----------|
| Switching flow | 3-4 weeks | P0 |
| Comparison engine (data + UI) | 2-3 weeks | P0 |
| Renewal protection | 2 weeks | P0 |
| Regulatory compliance | 4-6 weeks (includes external) | P0 |
| Security enhancements | 1-2 weeks | P0 |
| Hidden money finder | 1-2 weeks | P1 |
| Financial health score | 1 week | P1 |
| Subscription management UI | 1 week | P1 |
| Performance monitoring | 1 week | P0 |
| Accessibility audit | 1 week | P1 |

**Total Estimated Time to MVP: 10-14 weeks**

---

## Recommendations

1. **Immediate Actions (Week 1-2):**
   - Register with ICO
   - Begin FCA AR application process
   - Implement commission disclosure UI
   - Start rate database population

2. **Short-term (Week 3-6):**
   - Complete switching flow
   - Build comparison UI
   - Implement renewal detection
   - Complete security enhancements

3. **Medium-term (Week 7-10):**
   - Regulatory compliance tasks
   - Performance monitoring setup
   - Hidden money finder
   - Accessibility audit

4. **Launch Readiness (Week 11-14):**
   - Security penetration test
   - Load testing
   - Legal review of all copy
   - Beta testing with real users

---

## Conclusion

The current implementation provides a **solid foundation** with authentication, Open Banking integration, and basic product classification. However, **critical revenue-generating features** (switching, comparison UI, renewal alerts) are missing. The application is approximately **40% complete** for MVP launch.

**Key blockers:**
- No switching capability (core revenue mechanism)
- No comparison UI (core value proposition)
- No regulatory compliance (legal requirement)
- No rate data (comparison engine needs data)

**Recommended focus:** Prioritize switching flow and comparison engine, as these are the core value proposition and revenue mechanism. Regulatory compliance should run in parallel as it has external dependencies.
