/**
 * TruthChain Smart Contract Integration Examples
 *
 * Complete TypeScript examples for integrating TruthChain Sui Move contracts
 * with frontend applications, Walrus storage, and Seal encryption.
 */

import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Network configuration
  rpcUrl: 'https://fullnode.mainnet.sui.io',

  // Deployed contract addresses (update after deployment)
  packageId: '0x...', // TruthChain package ID

  // Shared objects
  provenanceRegistry: '0x...', // ProvenanceRegistry shared object
  verificationNetwork: '0x...', // VerificationNetwork shared object
  oracleRegistry: '0x...', // OracleRegistry shared object
  accessRegistry: '0x...', // AccessRegistry shared object

  // System objects
  clockId: '0x6', // Sui Clock object (constant)

  // Walrus configuration
  walrusApiUrl: 'https://api.walrus.sui',

  // Seal configuration
  sealApiUrl: 'https://api.seal.io',
};

// ============================================================================
// INITIALIZE CLIENT
// ============================================================================

const client = new SuiClient({ url: CONFIG.rpcUrl });

// ============================================================================
// 1. PROVENANCE REGISTRY - CONTENT REGISTRATION
// ============================================================================

/**
 * Upload content to Walrus and register on TruthChain
 */
async function registerContent(
  signer: Ed25519Keypair,
  contentBuffer: Buffer,
  mimeType: string,
  description: string
): Promise<{ txDigest: string; contentProofId: string; walrusBlobId: string }> {

  // Step 1: Upload to Walrus
  const walrusResponse = await fetch(`${CONFIG.walrusApiUrl}/v1/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: contentBuffer,
  });

  const walrusData = await walrusResponse.json();
  const walrusBlobId = walrusData.newlyCreated.blobObject.blobId;

  // Step 2: Generate content hash
  const crypto = require('crypto');
  const contentHash = crypto.createHash('sha256').update(contentBuffer).digest();

  // Step 3: Encrypt with Seal
  const sealResponse = await fetch(`${CONFIG.sealApiUrl}/encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: contentBuffer.toString('base64'),
      conditions: { owner: signer.getPublicKey().toSuiAddress() },
    }),
  });

  const sealData = await sealResponse.json();
  const sealEncryptionKey = sealData.encryptionKey;

  // Step 4: Register on TruthChain
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::provenance_registry::register_content`,
    arguments: [
      tx.object(CONFIG.provenanceRegistry),
      tx.pure(Array.from(contentHash)),
      tx.pure(Array.from(Buffer.from('SHA256'))),
      tx.pure(Array.from(Buffer.from(walrusBlobId))),
      tx.pure(Array.from(Buffer.from(sealEncryptionKey))),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  // Extract created ContentProof object ID
  const contentProofId = result.objectChanges?.find(
    (change) => change.type === 'created' && change.objectType.includes('ContentProof')
  )?.objectId || '';

  return {
    txDigest: result.digest,
    contentProofId,
    walrusBlobId,
  };
}

/**
 * Update content metadata
 */
async function updateMetadata(
  signer: Ed25519Keypair,
  contentProofId: string,
  key: string,
  value: string
): Promise<string> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::provenance_registry::update_metadata`,
    arguments: [
      tx.object(contentProofId),
      tx.pure(Array.from(Buffer.from(key))),
      tx.pure(Array.from(Buffer.from(value))),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });

  return result.digest;
}

/**
 * Record verification result
 */
async function recordVerification(
  signer: Ed25519Keypair,
  contentProofId: string,
  trustScore: number // 0-100
): Promise<string> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::provenance_registry::record_verification`,
    arguments: [
      tx.object(contentProofId),
      tx.pure(trustScore),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });

  return result.digest;
}

// ============================================================================
// 2. VERIFICATION NETWORK - STAKING AND VOTING
// ============================================================================

/**
 * Register as a verifier with stake
 */
async function registerVerifier(
  signer: Ed25519Keypair,
  stakeAmountMist: string // In MIST (1 SUI = 1,000,000,000 MIST)
): Promise<{ txDigest: string; verifierId: string }> {

  const tx = new TransactionBlock();

  // Split coin for stake
  const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure(stakeAmountMist)]);

  tx.moveCall({
    target: `${CONFIG.packageId}::verification_network::register_verifier`,
    arguments: [
      tx.object(CONFIG.verificationNetwork),
      stakeCoin,
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const verifierId = result.objectChanges?.find(
    (change) => change.type === 'created' && change.objectType.includes('Verifier')
  )?.objectId || '';

  return {
    txDigest: result.digest,
    verifierId,
  };
}

/**
 * Create verification task with payment
 */
async function createVerificationTask(
  signer: Ed25519Keypair,
  contentId: string,
  paymentAmountMist: string
): Promise<{ txDigest: string; taskId: string }> {

  const tx = new TransactionBlock();

  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure(paymentAmountMist)]);

  tx.moveCall({
    target: `${CONFIG.packageId}::verification_network::create_verification_task`,
    arguments: [
      tx.object(CONFIG.verificationNetwork),
      tx.pure(contentId),
      paymentCoin,
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const taskId = result.objectChanges?.find(
    (change) => change.type === 'created' && change.objectType.includes('VerificationTask')
  )?.objectId || '';

  return {
    txDigest: result.digest,
    taskId,
  };
}

/**
 * Cast vote on verification task
 */
async function castVote(
  signer: Ed25519Keypair,
  verifierId: string,
  taskId: string,
  vote: boolean // true = approve, false = reject
): Promise<string> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::verification_network::cast_vote`,
    arguments: [
      tx.object(verifierId),
      tx.object(taskId),
      tx.pure(vote),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });

  return result.digest;
}

/**
 * Claim verification reward
 */
async function claimReward(
  signer: Ed25519Keypair,
  verifierId: string,
  taskId: string
): Promise<string> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::verification_network::claim_reward`,
    arguments: [
      tx.object(CONFIG.verificationNetwork),
      tx.object(verifierId),
      tx.object(taskId),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });

  return result.digest;
}

// ============================================================================
// 3. TRUTH ORACLE - AI DETECTION
// ============================================================================

/**
 * Register as an AI oracle
 */
async function registerAIOracle(
  signer: Ed25519Keypair,
  name: string,
  modelType: string,
  version: string
): Promise<{ txDigest: string; oracleId: string }> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::truth_oracle::register_oracle`,
    arguments: [
      tx.object(CONFIG.oracleRegistry),
      tx.pure(Array.from(Buffer.from(name))),
      tx.pure(Array.from(Buffer.from(modelType))),
      tx.pure(Array.from(Buffer.from(version))),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const oracleId = result.objectChanges?.find(
    (change) => change.type === 'created' && change.objectType.includes('AIOracle')
  )?.objectId || '';

  return {
    txDigest: result.digest,
    oracleId,
  };
}

/**
 * Submit AI detection result
 */
async function submitDetection(
  signer: Ed25519Keypair,
  oracleId: string,
  resultId: string,
  isAIGenerated: boolean,
  confidence: number // 0-100
): Promise<string> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::truth_oracle::submit_detection`,
    arguments: [
      tx.object(CONFIG.oracleRegistry),
      tx.object(oracleId),
      tx.object(resultId),
      tx.pure(isAIGenerated),
      tx.pure(confidence),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });

  return result.digest;
}

// ============================================================================
// 4. ACCESS CONTROL - PERMISSIONS AND ENCRYPTION
// ============================================================================

/**
 * Create access policy for content
 */
async function createAccessPolicy(
  signer: Ed25519Keypair,
  contentId: string,
  sealEncryptionKey: string,
  isPublic: boolean
): Promise<{ txDigest: string; policyId: string }> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::access_control::create_policy`,
    arguments: [
      tx.object(CONFIG.accessRegistry),
      tx.pure(contentId),
      tx.pure(Array.from(Buffer.from(sealEncryptionKey))),
      tx.pure(Array.from(Buffer.from('AES256'))),
      tx.pure(isPublic),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const policyId = result.objectChanges?.find(
    (change) => change.type === 'created' && change.objectType.includes('AccessPolicy')
  )?.objectId || '';

  return {
    txDigest: result.digest,
    policyId,
  };
}

/**
 * Grant access to user
 */
async function grantAccess(
  signer: Ed25519Keypair,
  policyId: string,
  granteeAddress: string,
  role: number, // 0=OWNER, 1=ADMIN, 2=VIEWER, 3=VERIFIER
  expiryDurationMs: number,
  decryptionKeyFragment: string
): Promise<string> {

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${CONFIG.packageId}::access_control::grant_access`,
    arguments: [
      tx.object(policyId),
      tx.pure(granteeAddress),
      tx.pure(role),
      tx.pure(expiryDurationMs),
      tx.pure(Array.from(Buffer.from(decryptionKeyFragment))),
      tx.object(CONFIG.clockId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });

  return result.digest;
}

// ============================================================================
// 5. EVENT SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to content registration events
 */
async function subscribeToRegistrations(
  callback: (event: any) => void
): Promise<() => Promise<void>> {

  const filter = {
    Package: CONFIG.packageId,
    Module: 'provenance_registry',
    EventType: 'ContentRegistered',
  };

  const unsubscribe = await client.subscribeEvent({
    filter,
    onMessage: (event) => {
      const data = event.parsedJson;
      callback({
        contentId: data.content_id,
        contentHash: data.content_hash,
        creator: data.creator,
        timestamp: data.timestamp,
        walrusBlobId: data.walrus_blob_id,
      });
    },
  });

  return unsubscribe;
}

/**
 * Subscribe to consensus events
 */
async function subscribeToConsensus(
  callback: (event: any) => void
): Promise<() => Promise<void>> {

  const filter = {
    Package: CONFIG.packageId,
    Module: 'truth_oracle',
    EventType: 'ConsensusReached',
  };

  const unsubscribe = await client.subscribeEvent({
    filter,
    onMessage: (event) => {
      const data = event.parsedJson;
      callback({
        resultId: data.result_id,
        contentId: data.content_id,
        verdict: data.verdict,
        confidence: data.confidence,
        submissionCount: data.submission_count,
        timestamp: data.timestamp,
      });
    },
  });

  return unsubscribe;
}

// ============================================================================
// 6. QUERY FUNCTIONS
// ============================================================================

/**
 * Get content proof details
 */
async function getContentProof(contentProofId: string): Promise<any> {
  const object = await client.getObject({
    id: contentProofId,
    options: { showContent: true },
  });

  return object.data?.content;
}

/**
 * Get verification task status
 */
async function getTaskStatus(taskId: string): Promise<{
  isFinalized: boolean;
  result: boolean;
  votesFor: number;
  votesAgainst: number;
}> {
  const object = await client.getObject({
    id: taskId,
    options: { showContent: true },
  });

  const fields = (object.data?.content as any)?.fields;

  return {
    isFinalized: fields.is_finalized,
    result: fields.result,
    votesFor: parseInt(fields.votes_for),
    votesAgainst: parseInt(fields.votes_against),
  };
}

// ============================================================================
// 7. COMPLETE WORKFLOW EXAMPLE
// ============================================================================

/**
 * Complete workflow: Upload, register, verify, and grant access
 */
async function completeWorkflow(
  userSigner: Ed25519Keypair,
  contentBuffer: Buffer
): Promise<void> {

  console.log('1. Registering content...');
  const registration = await registerContent(
    userSigner,
    contentBuffer,
    'image/jpeg',
    'Sample image for verification'
  );
  console.log(`   Content registered: ${registration.contentProofId}`);
  console.log(`   Walrus blob: ${registration.walrusBlobId}`);

  console.log('2. Creating verification task...');
  const task = await createVerificationTask(
    userSigner,
    registration.contentProofId,
    '10000000' // 0.01 SUI
  );
  console.log(`   Task created: ${task.taskId}`);

  console.log('3. Waiting for verifications...');
  // In real app, wait for verifier votes

  console.log('4. Creating access policy...');
  const policy = await createAccessPolicy(
    userSigner,
    registration.contentProofId,
    'seal_key_xyz',
    false // private
  );
  console.log(`   Policy created: ${policy.policyId}`);

  console.log('5. Granting access...');
  const grantTx = await grantAccess(
    userSigner,
    policy.policyId,
    '0x...', // grantee address
    2, // VIEWER role
    86400000, // 24 hours
    'key_fragment_abc'
  );
  console.log(`   Access granted: ${grantTx}`);

  console.log('Workflow complete!');
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  // Configuration
  CONFIG,

  // Provenance Registry
  registerContent,
  updateMetadata,
  recordVerification,

  // Verification Network
  registerVerifier,
  createVerificationTask,
  castVote,
  claimReward,

  // Truth Oracle
  registerAIOracle,
  submitDetection,

  // Access Control
  createAccessPolicy,
  grantAccess,

  // Events
  subscribeToRegistrations,
  subscribeToConsensus,

  // Queries
  getContentProof,
  getTaskStatus,

  // Complete workflow
  completeWorkflow,
};
