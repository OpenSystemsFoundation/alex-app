# Integration Architecture: MPS Tensor Network + OpenQASM Bridge

**Date:** 2026-03-21
**Status:** Concept / Design
**Domain:** System Architecture × Quantum-Classical Hybrid

## Problem

The three innovations — Quantum Sprint Planning, Entangled Card Dependencies, and Superposition Backlog — each require both **browser-side tensor computation** (MPS) and **cloud-side quantum execution** (IBM Quantum). These need to integrate cleanly with Alex's existing LWC + Redux + Apex architecture without breaking the real-time collaboration model.

Key constraints:

- LWC Locker Service / Lightning Web Security restricts WebGL and Worker access
- IBM Quantum jobs are asynchronous (seconds to minutes)
- MPS training must not block the UI thread
- Real-time collaboration must reflect quantum state changes across users
- Data stays within Salesforce (enterprise security requirement)

## Solution

A **hybrid architecture** using an iframe-embedded ML engine for GPU-accelerated tensor computation, Apex callouts for IBM Quantum API integration, and Platform Events for propagating quantum state updates to all connected users.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  LWC Layer (Lightning Web Security sandbox)              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ kanban   │  │ kanban   │  │ quantumPlanningPanel  │  │
│  │ Board    │  │ Store    │  │ (new component)       │  │
│  │          │  │ (Redux)  │  │                       │  │
│  └────┬─────┘  └────┬─────┘  └───────────┬───────────┘  │
│       │              │                    │              │
│       │         ┌────┴─────────┐    postMessage          │
│       │         │ quantumStore │          │              │
│       │         │ (new reducer)│          │              │
│       │         └────┬─────────┘          │              │
│       │              │                    │              │
├───────┼──────────────┼────────────────────┼──────────────┤
│       │              │                    │              │
│  ┌────┴──────────────┴────────────────────┴───────────┐  │
│  │  Visualforce / iframe: Tensor-Quantum Engine       │  │
│  │                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │ MPS Engine   │  │ QUBO Encoder │               │  │
│  │  │ (TF.js or   │  │ (Pure JS)    │               │  │
│  │  │  pure JS)    │  │              │               │  │
│  │  │ WebGPU accel │  │              │               │  │
│  │  └──────┬───────┘  └──────┬───────┘               │  │
│  │         │                 │                        │  │
│  │         │    ┌────────────┴──────────┐             │  │
│  │         │    │ OpenQASM Generator    │             │  │
│  │         │    │ (circuit synthesis)   │             │  │
│  │         │    └────────────┬──────────┘             │  │
│  │         │                 │                        │  │
│  │  ┌──────┴─────────────────┴──────────┐             │  │
│  │  │ postMessage API (bidirectional)   │             │  │
│  │  └───────────────────────────────────┘             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Apex Layer                                              │
│                                                          │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │ QuantumJob       │  │ QuantumResultEvent__e      │   │
│  │ Controller.cls   │  │ (Platform Event)           │   │
│  │                  │  │                            │   │
│  │ submitCircuit()  │  │ Published when IBM Quantum │   │
│  │ getJobStatus()   │  │ job completes              │   │
│  │ getJobResult()   │  └────────────────────────────┘   │
│  └────────┬─────────┘                                    │
│           │                                              │
│  ┌────────┴─────────┐                                    │
│  │ IBM Quantum API  │                                    │
│  │ (Named Cred.)    │                                    │
│  │                  │                                    │
│  │ POST /jobs       │                                    │
│  │ GET /jobs/{id}   │                                    │
│  └──────────────────┘                                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Data Layer                                              │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ QuantumJob__c  │  │ MPSModel__c  │  │ CardState__c │ │
│  │                │  │              │  │              │ │
│  │ CircuitQASM__c │  │ Tensors__c   │  │ Amplitudes   │ │
│  │ Status__c      │  │ BondDim__c   │  │ (JSON blob)  │ │
│  │ Result__c      │  │ Ordering__c  │  │              │ │
│  │ JobId__c       │  │ TrainedAt__c │  │              │ │
│  └────────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1. Tensor-Quantum Engine (iframe)

**Hosted as:** Visualforce page with static resource JS bundle

**Responsibilities:**
- MPS tensor storage, contraction, and training
- Mutual Information computation
- QUBO matrix construction from card data
- OpenQASM circuit generation for QAOA
- GPU-accelerated matrix operations (WebGPU / WebGL fallback)

**Communication protocol (postMessage):**

```javascript
// LWC → Engine: request
{
  type: 'MPS_TRAIN',
  payload: { cardHistory: [...], bondDimension: 8 }
}

// Engine → LWC: response
{
  type: 'MPS_TRAIN_COMPLETE',
  payload: { modelId: 'mps_v3', accuracy: 0.87, timestamp: '...' }
}

// LWC → Engine: query
{
  type: 'CASCADE_PREDICT',
  payload: { cardId: '00542...', newState: 'blocked' }
}

// Engine → LWC: prediction
{
  type: 'CASCADE_RESULT',
  payload: {
    affectedCards: [
      { cardId: '00538...', blockedProb: 0.73, delta: +0.41 },
      { cardId: '00541...', blockedProb: 0.55, delta: +0.28 }
    ]
  }
}

// LWC → Engine: plan request
{
  type: 'GENERATE_QAOA_CIRCUIT',
  payload: { cards: [...], sprintCapacity: 40, constraints: {...} }
}

// Engine → LWC: circuit
{
  type: 'QAOA_CIRCUIT_READY',
  payload: { qasm: 'OPENQASM 3.0; ...', qubits: 24, depth: 3 }
}
```

#### 2. Quantum Store (Redux extension)

New reducer added to the existing kanbanStore:

```javascript
// quantumReducer.js — new reducer in kanbanStore/state/reducers/

const initialState = {
  // MPS model state
  mpsModelStatus: 'idle',        // idle | training | ready | error
  mpsModelVersion: null,
  lastTrainedAt: null,

  // Card quantum states (amplitudes)
  cardAmplitudes: {},             // cardId → { priority: {...}, effort: {...}, value: {...} }
  entanglementMap: {},            // cardId → [{ cardId, mi, strength }]

  // Cascade predictions
  activeCascade: null,            // current cascade prediction result
  cascadeHistory: [],

  // Quantum job state
  quantumJobs: {},                // jobId → { status, circuit, result }
  planCandidates: [],             // top-K sprint plans from Sampler

  // UI state
  showQuantumOverlay: false,
  selectedPlanIndex: null
};
```

**New action types:**

```javascript
// actionTypes.js additions
MPS_TRAINING_STARTED
MPS_TRAINING_COMPLETE
MPS_TRAINING_FAILED
CASCADE_DETECTED
CASCADE_DISMISSED
QUANTUM_JOB_SUBMITTED
QUANTUM_JOB_COMPLETED
PLAN_CANDIDATES_RECEIVED
PLAN_SELECTED
CARD_AMPLITUDES_UPDATED
ENTANGLEMENT_MAP_UPDATED
```

#### 3. Apex Quantum Integration

**QuantumJobController.cls:**

```
@AuraEnabled methods:
- submitQuantumJob(String qasmCircuit, String primitive, Map<String,Object> options)
    → Calls IBM Quantum API via Named Credential
    → Creates QuantumJob__c record
    → Returns jobId

- getJobStatus(String jobId)
    → Polls IBM Quantum API
    → Returns status + partial results

- getJobResult(String jobId)
    → Returns final measurement results
    → Publishes QuantumResultEvent__e
```

**Named Credential configuration:**

```
Named Credential: IBM_Quantum_Platform
  URL: https://api.quantum-computing.ibm.com
  Auth: OAuth 2.0 or API Token
  Callout: Enabled
```

#### 4. Real-Time Quantum Event Flow

When quantum results affect the board, all connected users must see updates:

```
User A requests quantum sprint plan
        │
        ▼
Apex submits job to IBM Quantum
        │
        ▼
(async — seconds to minutes)
        │
        ▼
Apex polls job status (scheduled or platform event callback)
        │
        ▼
Job complete → Apex publishes QuantumResultEvent__e
        │
        ▼
All connected clients receive event via EMP API
        │
        ▼
subscriptionManager dispatches PLAN_CANDIDATES_RECEIVED
        │
        ▼
quantumReducer updates state
        │
        ▼
All users see plan candidates in Sprint Planning view
```

### Data Model (New Objects)

**QuantumJob__c:**

| Field | Type | Description |
|-------|------|-------------|
| Name | Auto-number | QJ-0001, QJ-0002, ... |
| CircuitQASM__c | Long Text | OpenQASM 3.0 circuit source |
| Primitive__c | Picklist | Sampler, Estimator |
| Status__c | Picklist | Queued, Running, Completed, Failed |
| IBMJobId__c | Text | IBM Quantum job identifier |
| Result__c | Long Text | JSON measurement results |
| Board__c | Lookup(Board__c) | Associated board |
| Sprint__c | Lookup(Sprint__c) | Associated sprint (if planning job) |
| SubmittedBy__c | Lookup(User) | Who triggered the job |
| SubmittedAt__c | DateTime | Submission timestamp |
| CompletedAt__c | DateTime | Completion timestamp |

**MPSModel__c:**

| Field | Type | Description |
|-------|------|-------------|
| Name | Auto-number | MPS-0001, MPS-0002, ... |
| Board__c | Lookup(Board__c) | Associated board |
| BondDimension__c | Number | D value (4, 8, 16) |
| ChainLength__c | Number | Number of cards in model |
| Ordering__c | Long Text | JSON array of card IDs in MI order |
| TrainedAt__c | DateTime | Last training timestamp |
| Accuracy__c | Percent | Training accuracy metric |
| ModelData__c | Long Text | Serialized MPS tensors (JSON) |

**CardQuantumState__c:**

| Field | Type | Description |
|-------|------|-------------|
| Card__c | Lookup(Card__c) | Associated card |
| PriorityAmplitudes__c | Text | JSON: {"critical":0.1,"high":0.6,...} |
| EffortAmplitudes__c | Text | JSON: {"3":0.4,"5":0.35,"8":0.25} |
| ValueAmplitudes__c | Text | JSON: {"high":0.45,"medium":0.55} |
| CollapsePercent__c | Percent | How much of the state is measured |
| LastMeasuredAt__c | DateTime | Last ceremony that measured this card |

### Performance Considerations

| Operation | Location | Expected Latency |
|-----------|----------|-----------------|
| MPS contraction (cascade prediction) | Browser (iframe, WebGPU) | < 100ms for N=50, D=8 |
| MPS training (ALS sweeps) | Browser (iframe, WebGPU) | 2-10s for N=50, D=8 |
| MI computation (pairwise) | Browser (iframe) | < 1s for N=50 |
| QUBO encoding | Browser (iframe) | < 100ms |
| QAOA circuit generation | Browser (iframe) | < 500ms |
| IBM Quantum job (simulator) | Cloud (IBM) | 5-30s |
| IBM Quantum job (real hardware) | Cloud (IBM) | 1-60 min (queue dependent) |
| postMessage round-trip | Browser | < 5ms |
| Apex callout to IBM | Salesforce → IBM | 1-3s |
| Platform Event propagation | Salesforce | < 2s |

### Fallback Strategy

```
Primary:  IBM Quantum hardware (real quantum computation)
    │
    ▼ (if queue > 5 min or hardware unavailable)
Secondary: IBM Quantum simulator (Aer, cloud-hosted)
    │
    ▼ (if API unavailable)
Tertiary:  Browser-side QAOA simulation (iframe, ≤ 20 qubits)
    │
    ▼ (if all quantum paths fail)
Classical: Greedy heuristic sprint planning (existing behavior)
```

### Security

| Concern | Mitigation |
|---------|-----------|
| IBM API credentials | Stored in Salesforce Named Credential (encrypted, admin-only) |
| Card data in quantum circuits | QUBO uses anonymized indices, not card content |
| MPS model data | Stored per-board in Salesforce; governed by sharing rules |
| iframe communication | Origin-validated postMessage; CSP headers restrict sources |
| Quantum job results | Stored in QuantumJob__c; field-level security applies |
