# Salesforce Google Drive Integration — Card Panel Analysis

**Date:** 2026-03-22
**Status:** Analysis / Feasibility Study
**Component:** `kanbanCardPanel` (Card Overlay)

---

## Executive Summary

Can we use Salesforce's out-of-the-box Google Drive integration (Files Connect) in our card panel overlay? **Short answer: No — not directly.** Files Connect provides org-level Google Drive access through external objects, but there is no drop-in LWC component that renders a Google Drive file browser or uploader inline. Embedding Google Drive functionality in our card panel requires custom development regardless of the approach chosen.

---

## What Salesforce Offers Out of the Box

### 1. Files Connect

Salesforce's native external file integration feature. Connects Google Drive as an external data source and exposes files as external objects.

**What it does:**
- Browse Google Drive files from the Salesforce Files tab
- Attach external file references to records via the standard Files related list
- Search Google Drive content via SOSL (limited)
- Per-user or org-wide authentication via OAuth

**What it does NOT do:**
- Provide an embeddable LWC component for custom UIs
- Support file uploads from Salesforce to Google Drive
- Offer file preview in custom components (preview only works in Reference mode on standard pages)
- Reflect file revisions from Google Drive automatically
- Support custom Google Drive file properties
- Provide sortable SOQL queries on external file objects

**Setup complexity:** High — requires Google Cloud Console OAuth app, Salesforce Auth Provider, External Data Source definition, permission set assignments, and per-user authentication flows.

### 2. `lightning-file-upload` (Base LWC Component)

Uploads files to **Salesforce Files** (ContentVersion/ContentDocument), not to Google Drive. Max 2 GB. Could be used to attach Salesforce-hosted files to Card__c records but has zero Google Drive awareness.

### 3. `lightning:fileCard` (Aura Only)

Displays a file card thumbnail for ContentDocument records. Aura-only — no LWC equivalent. Only works with Salesforce-hosted files, not external Google Drive files.

### 4. Salesforce Connect Custom Adapter (Apex)

Salesforce provides a Google Drive custom adapter example for Salesforce Connect that uses Apex callouts + OAuth. This creates external objects queryable via SOQL but still requires a custom UI layer — there's no component you can just drop onto a page.

### 5. Data Cloud Google Drive Connector (Beta)

Ingests Google Drive content (CSV, spreadsheets, PDFs, docs) into Data Cloud / Data 360. Not relevant for our use case — this is for analytics pipelines, not record-level file attachment.

---

## Our Card Panel: Current State

The `kanbanCardPanel` is a slide-out detail panel rendering editable fields for `Card__c` records. Key characteristics:

- Fields configured via `KanbanBoardSettings__mdt` custom metadata
- Updates flow through Redux store → `KanbanBoardController.updateCard()` → platform events
- Uses `lightning-input-field` inside `lightning-record-edit-form`
- No existing file/attachment/document functionality
- `LinkedRecord__c` junction object exists for linking cards to other Salesforce records, but not files

---

## Options for Adding Google Drive to the Card Panel

### Option A: Files Connect + Custom LWC (Semi-Native)

**Approach:** Enable Files Connect for Google Drive, then build a custom LWC section in the card panel that queries external objects via Apex and renders file links.

| Aspect | Detail |
|--------|--------|
| **Setup** | Google Cloud OAuth app → SF Auth Provider → External Data Source → Permission Sets |
| **Apex** | Custom controller methods to query `ContentVersion` where `ExternalDataSourceId != null` and `LinkedEntityId = cardId` |
| **LWC** | Custom file list component with download links, file type icons |
| **Upload** | Not supported — Files Connect is read-only for Google Drive |
| **Preview** | Not available in custom LWC — would need iframe or Google Drive embed URL |
| **Effort** | Medium-High (2-3 sprints) |
| **Pros** | Uses Salesforce-managed OAuth, files appear in standard Files related list too |
| **Cons** | Read-only, no upload, no inline preview, complex setup, per-user auth required, limited query capabilities |

### Option B: Direct Google Drive API via Apex Callouts

**Approach:** Build a fully custom integration using Google Drive REST API v3 via Apex HTTP callouts, with a custom LWC UI in the card panel.

| Aspect | Detail |
|--------|--------|
| **Setup** | Google Cloud service account or OAuth app, Named Credential in Salesforce |
| **Apex** | Service class wrapping Google Drive API (list, upload, download, create folder) |
| **LWC** | Custom file browser/uploader component embedded in card panel |
| **Upload** | Supported (with governor limits — 6MB heap for synchronous, 12MB async) |
| **Preview** | Google Drive embed URLs or thumbnail API |
| **Effort** | High (3-4 sprints) |
| **Pros** | Full control, upload + download, folder-per-card pattern, inline preview possible |
| **Cons** | Custom auth management, governor limits on file size, maintenance burden, CORS issues with client-side uploads |

### Option C: Salesforce Files (ContentDocument) — No Google Drive

**Approach:** Use standard Salesforce Files attached to Card__c records. Drop `lightning-file-upload` into the card panel.

| Aspect | Detail |
|--------|--------|
| **Setup** | Minimal — just add the component |
| **Apex** | Query `ContentDocumentLink` where `LinkedEntityId = cardId` |
| **LWC** | `lightning-file-upload` + custom file list using `NavigationMixin` for preview |
| **Upload** | Native, up to 2 GB |
| **Preview** | Native Salesforce file preview (PDF, images, Office docs) |
| **Effort** | Low (1 sprint) |
| **Pros** | Fully native, minimal code, file preview works, no external dependencies |
| **Cons** | Files stored in Salesforce (counts against org storage), no Google Drive sync |

### Option D: Third-Party AppExchange Connector

**Approach:** Install a managed package like CloudFiles or Drive Connect that provides pre-built LWC widgets for Google Drive.

| Aspect | Detail |
|--------|--------|
| **Setup** | Package install + configuration |
| **LWC** | Embed vendor's component or use their API |
| **Upload** | Supported (vendor-managed) |
| **Preview** | Supported (vendor-managed) |
| **Effort** | Low-Medium (1-2 sprints for integration) |
| **Pros** | Rich feature set, maintained by vendor, inline preview + upload |
| **Cons** | License cost, dependency on third party, may conflict with namespace `OpenSF`, styling may not match our card panel UI, limited customization |

---

## Recommendation

**Start with Option C (Salesforce Files), consider Option B later.**

Rationale:

1. **Option C is the fastest path to value.** Adding `lightning-file-upload` and a file list to the card panel is straightforward, fully native, and gives users file attach/preview capabilities immediately. No external dependencies, no OAuth setup, no governor limit gymnastics.

2. **Files Connect (Option A) is not worth the complexity.** It's read-only for Google Drive, requires per-user auth, has no embeddable LWC component, and the query capabilities are limited. The "out-of-the-box" label is misleading — significant custom work is still needed, and you get less functionality than a custom integration.

3. **Option B (Direct API) is the right choice IF Google Drive is a hard requirement.** Use a Named Credential with a service account for org-wide access, build an Apex service class (similar pattern to our `RecordLinkingService`), and create a `cardPanelFiles` child component. But this is 3-4 sprints of work and should be driven by actual user demand.

4. **Option D (AppExchange) has namespace risk.** Our `OpenSF` namespace may cause conflicts with managed packages. Evaluate only if Option B's effort is prohibitive and Google Drive is non-negotiable.

---

## Implementation Sketch (Option C — Recommended)

### New LWC: `cardPanelFiles`

```
Card Panel (existing)
├── Field sections (existing)
├── Files Section (NEW)
│   ├── lightning-file-upload (recordId = cardId)
│   ├── File list (query ContentDocumentLink)
│   │   ├── File name + icon
│   │   ├── Preview link (NavigationMixin)
│   │   └── Delete button
│   └── Empty state message
└── Footer buttons (existing)
```

### Apex Addition

```apex
@AuraEnabled(cacheable=true)
public static List<ContentDocumentLink> getCardFiles(Id cardId) {
    return [
        SELECT ContentDocumentId, ContentDocument.Title,
               ContentDocument.FileType, ContentDocument.ContentSize,
               ContentDocument.CreatedDate
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :cardId
        ORDER BY ContentDocument.CreatedDate DESC
    ];
}
```

### Estimated Effort

- Apex controller method + tests: 0.5 days
- `cardPanelFiles` LWC component: 1-2 days
- Integration into `kanbanCardPanel`: 0.5 days
- E2E tests: 1 day
- **Total: ~1 sprint**

---

## Open Questions

1. **Storage limits** — Does the org have sufficient Salesforce file storage, or is Google Drive needed to offload storage costs?
2. **Collaboration** — Do users need to co-edit documents in Google Drive, or is attach-and-view sufficient?
3. **Existing workflows** — Are teams already using Google Drive for project documents that should be linked to cards?
4. **File size** — What's the typical file size? Salesforce handles up to 2 GB natively; Google Drive API via Apex is limited to ~6-12 MB per callout.
5. **Scratch org testing** — Files Connect requires additional setup in scratch org definitions (`features: ["FilesConnect"]`) which may complicate CI.
