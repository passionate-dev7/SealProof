# TruthChain Sui Move Smart Contracts

Production-grade Sui Move smart contracts for the TruthChain content provenance and verification system.

## Overview

TruthChain provides a decentralized system for content authentication, verification, and provenance tracking on the Sui blockchain. The system integrates with Walrus for decentralized storage and Seal for encryption.

## Contracts

### 1. ProvenanceRegistry (`provenance_registry.move`)

Core content registration and verification system that stores cryptographic proofs and ownership records.

**Key Features:**
- Content registration with SHA256/BLAKE2b cryptographic proofs
- Ownership tracking and controlled transfers
- Trust scoring (0-100 scale)
- Metadata management
- Walrus blob ID integration
- Seal encryption key references
- Time-stamped verification records

**Main Functions:**
```move
// Register new content
public entry fun register_content(
    registry: &mut Registry,
    content_hash: vector<u8>,
    algorithm: vector<u8>,
    walrus_blob_id: vector<u8>,
    seal_encryption_key: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Update metadata
public entry fun update_metadata(
    content_proof: &mut ContentProof,
    key: vector<u8>,
    value: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Record verification
public entry fun record_verification(
    content_proof: &mut ContentProof,
    new_trust_score: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// Transfer ownership with capability
public entry fun create_transfer_cap(...)
public entry fun execute_transfer(...)
```

### 2. VerificationNetwork (`verification_network.move`)

Decentralized verifier network with staking, reputation, and consensus mechanisms.

**Key Features:**
- Verifier registration with minimum 1 SUI stake
- Reputation-weighted voting (0-1000 scale)
- Time-boxed verification tasks (24-hour voting period)
- Reward distribution (80% of fees to verifiers)
- Slashing mechanism (10% penalty for bad actors)
- Success rate tracking

**Main Functions:**
```move
// Register as verifier
public entry fun register_verifier(
    network: &mut VerificationNetwork,
    stake: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Create verification task
public entry fun create_verification_task(
    network: &mut VerificationNetwork,
    content_id: ID,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Cast vote
public entry fun cast_vote(
    verifier: &mut Verifier,
    task: &mut VerificationTask,
    vote: bool,
    clock: &Clock,
    ctx: &mut TxContext
)

// Claim rewards
public entry fun claim_reward(
    network: &mut VerificationNetwork,
    verifier: &mut Verifier,
    task: &VerificationTask,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### 3. TruthOracle (`truth_oracle.move`)

AI-powered content verification with multi-oracle consensus and time-weighted reputation.

**Key Features:**
- AI oracle registration with model versioning
- Detection result submission (AI-generated vs human-created)
- Confidence scoring (0-100%)
- Multi-verifier consensus (minimum 3 oracles, 66% threshold)
- Time-based reputation decay
- Emergency override capability

**Main Functions:**
```move
// Register AI oracle
public entry fun register_oracle(
    registry: &mut OracleRegistry,
    name: vector<u8>,
    model_type: vector<u8>,
    version: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Submit detection result
public entry fun submit_detection(
    registry: &mut OracleRegistry,
    oracle: &mut AIOracle,
    result: &mut DetectionResult,
    is_ai_generated: bool,
    confidence: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// Update oracle reputation
public entry fun update_oracle_reputation(
    oracle: &mut AIOracle,
    result: &DetectionResult,
    ctx: &mut TxContext
)
```

### 4. AccessControl (`access_control.move`)

Privacy and permission management with Seal encryption integration.

**Key Features:**
- Role-based access control (Owner, Admin, Viewer, Verifier)
- Conditional access policies
- Time-based access windows
- Seal encryption key management
- Access grant/revoke with expiration
- Privacy settings (public/private)

**Main Functions:**
```move
// Create access policy
public entry fun create_policy(
    registry: &mut AccessRegistry,
    content_id: ID,
    seal_encryption_key: vector<u8>,
    encryption_algorithm: vector<u8>,
    is_public: bool,
    clock: &Clock,
    ctx: &mut TxContext
)

// Grant access
public entry fun grant_access(
    policy: &mut AccessPolicy,
    to: address,
    role: u8,
    expiry_duration_ms: u64,
    decryption_key_fragment: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Add access condition
public entry fun add_condition(
    policy: &mut AccessPolicy,
    condition_type: vector<u8>,
    parameter: vector<u8>,
    value: u64,
    clock: &Clock,
    ctx: &mut TxContext
)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TruthChain System                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │ Provenance       │◄────►│ Access           │           │
│  │ Registry         │      │ Control          │           │
│  └────────┬─────────┘      └──────────────────┘           │
│           │                                                 │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │ Verification     │◄────►│ Truth            │           │
│  │ Network          │      │ Oracle           │           │
│  └──────────────────┘      └──────────────────┘           │
│           │                         │                      │
│           └─────────┬───────────────┘                      │
│                     ▼                                      │
│           ┌──────────────────┐                            │
│           │ Walrus Storage   │                            │
│           │ + Seal Encryption│                            │
│           └──────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### Walrus Integration
- Store blob IDs on-chain in `ContentProof`
- Reference large content stored on Walrus
- Verify content integrity with on-chain hashes

### Seal Integration
- Store encryption keys in `AccessPolicy`
- Distribute key fragments via `AccessGrant`
- Enable conditional decryption based on blockchain state

## Building and Testing

### Prerequisites
```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
```

### Build
```bash
cd truthchain/contracts
sui move build
```

### Test
```bash
sui move test
```

### Publish
```bash
sui client publish --gas-budget 100000000
```

## Security Features

1. **Capability Pattern**: Admin functions protected by capability objects
2. **Ownership Checks**: All mutations validate sender permissions
3. **Time Locks**: Transfer capabilities and access grants support expiration
4. **Rate Limiting**: Reputation decay prevents gaming
5. **Slashing**: Economic penalties for malicious behavior
6. **Emergency Controls**: Admin pause and override mechanisms

## Gas Optimization

- Efficient table-based indexing
- Minimal on-chain storage
- Batch operations support
- Event-based off-chain indexing
- Shared objects for concurrent access

## Events

All contracts emit comprehensive events for:
- Registration and updates
- Verification and voting
- Access grants and revocations
- Reputation changes
- Emergency actions

Frontend can subscribe to events for real-time updates.

## Error Codes

Each contract defines clear error codes:
- `E_NOT_AUTHORIZED` (1): Permission denied
- `E_ALREADY_REGISTERED` (2): Duplicate registration
- `E_INVALID_*` (3-5): Validation failures
- `E_INSUFFICIENT_*` (4-5): Resource requirements not met

## Constants

Key system parameters:
- `MIN_STAKE`: 1 SUI (1,000,000,000 MIST)
- `VOTING_PERIOD_MS`: 24 hours (86,400,000 ms)
- `CONSENSUS_THRESHOLD`: 66%
- `REWARD_POOL_PERCENTAGE`: 80%
- `SLASH_PERCENTAGE`: 10%

## Development Roadmap

- [x] Core contracts implementation
- [x] Comprehensive test coverage
- [x] Documentation
- [ ] Frontend SDK integration
- [ ] Mainnet deployment
- [ ] Governance mechanisms
- [ ] Cross-chain bridges

## License

MIT License

## Support

For issues and questions:
- GitHub Issues: [TruthChain Repository]
- Documentation: [docs.truthchain.io]
- Discord: [TruthChain Community]

---

Built with Sui Move Framework 1.0+
Integrated with Walrus + Seal
