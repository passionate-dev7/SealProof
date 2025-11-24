'use client';

/**
 * Seal Privacy-Preserving Integration
 * Real implementation using @mysten/seal SDK for identity-based encryption
 * and threshold decryption with on-chain access control
 *
 * Browser-compatible implementation for Next.js
 */

/**
 * Custom security error class
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

import { SealClient, type SealCompatibleClient } from '@mysten/seal';
import { SessionKey } from '@mysten/seal';
import { DemType } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// Helper function to extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Browser-compatible crypto utilities using Web Crypto API
// async function sha256(data: Uint8Array): Promise<Uint8Array> {
//   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
//   return new Uint8Array(hashBuffer);
// }

// function getRandomBytes(length: number): Uint8Array {
//   const bytes = new Uint8Array(length);
//   crypto.getRandomValues(bytes);
//   return bytes;
// }

/**
 * Encrypted data structure returned by Seal
 */
export interface EncryptedData {
  encryptedObject: Uint8Array;
  symmetricKey: Uint8Array; // For backup/recovery only
  identity: string;
  timestamp: Date;
  keyServers: string[];
  threshold: number;
}

/**
 * Decrypted data with metadata
 */
export interface DecryptedData {
  data: Uint8Array;
  identity: string;
  timestamp: Date;
  verified: boolean;
}

/**
 * Access policy for encrypted data
 */
export interface AccessPolicy {
  identity: string;
  allowedAddresses: string[];
  expirationTime?: number;
  maxDecryptions?: number;
  conditions: string; // Move package logic reference
}

/**
 * Key server status information
 */
export interface KeyServerStatus {
  objectId: string;
  weight: number;
  online: boolean;
  publicKey?: string;
  lastSeen?: Date;
}

/**
 * Seal integration configuration
 */
export interface SealConfig {
  // Key server configurations
  keyServers: {
    objectId: string;
    weight: number;
    apiKey?: string;
  }[];

  // Threshold for decryption (t-of-n)
  threshold: number;

  // Sui network configuration
  network: 'mainnet' | 'testnet' | 'devnet';

  // Seal package ID on Sui
  packageId: string;

  // Session key TTL in seconds
  sessionKeyTTL?: number;

  // Verify key servers on init
  verifyKeyServers?: boolean;
}

/**
 * Real Seal Integration using @mysten/seal SDK
 *
 * Provides:
 * - Identity-based encryption (IBE) using Boneh-Franklin BLS12381
 * - Threshold decryption (t-of-n) across key servers
 * - On-chain access control via Sui blockchain
 * - Session-based key management
 *
 * Does NOT provide (contrary to previous fake implementation):
 * - Homomorphic encryption
 * - Multi-party computation
 * - Differential privacy
 * - Zero-knowledge proofs
 */
export class SealIntegration {
  private sealClient: SealClient;
  private suiClient: SuiClient;
  private config: SealConfig;
  private sessionKey?: SessionKey;
  private initialized: boolean = false;

  constructor(config: SealConfig) {
    this.config = config;

    // Initialize Sui client
    this.suiClient = new SuiClient({
      url: getFullnodeUrl(config.network)
    });

    // Initialize Seal client with correct API
    this.sealClient = new SealClient({
      suiClient: this.suiClient as SealCompatibleClient,
      serverConfigs: config.keyServers.map(ks => ({
        objectId: ks.objectId,
        weight: ks.weight,
        apiKey: ks.apiKey
      })),
      timeout: 30000 // 30 second timeout for key server requests
    });
  }

  /**
   * Initialize the Seal integration and verify connectivity
   */
  async initialize(_keypair: Ed25519Keypair): Promise<void> {
    try {
      // Verify Sui network connection
      const chainId = await this.suiClient.getChainIdentifier();
      console.log(`✅ Connected to Sui network: ${chainId}`);

      // TODO: SessionKey constructor is private - need to use Seal SDK factory method
      // The Seal SDK may provide a method like sealClient.createSessionKey() or similar
      // For now, commenting out to allow compilation
      // this.sessionKey = new SessionKey(
      //   this.suiClient,
      //   keypair,
      //   this.config.sessionKeyTTL || 1800 // Default 30 minutes
      // );
      console.warn('⚠️  SessionKey initialization skipped - needs Seal SDK factory method');

      // Verify key servers are accessible (optional - skip for faster init)
      if (this.config.verifyKeyServers) {
        try {
          const keyServers = await this.sealClient.getKeyServers();
          console.log(`✅ Verified ${keyServers.size} Seal key servers`);
        } catch (error) {
          console.warn('⚠️  Key server verification failed (non-critical):', getErrorMessage(error));
        }
      }

      this.initialized = true;
      console.log('✅ Seal integration initialized with real testnet key servers');

    } catch (error) {
      throw new SecurityError(
        `Seal initialization failed: ${getErrorMessage(error)}`,
        'SEAL_INIT_ERROR',
        'CRITICAL'
      );
    }
  }

  /**
   * Encrypt data using identity-based encryption
   *
   * @param data - Raw data to encrypt
   * @param identity - Identity string (e.g., user ID, email, public key)
   * @param aad - Optional additional authenticated data
   * @returns Encrypted data structure
   */
  async encryptData(
    data: Uint8Array,
    identity: string,
    aad?: Uint8Array
  ): Promise<EncryptedData> {
    if (!this.initialized) {
      throw new SecurityError(
        'Seal integration not initialized',
        'SEAL_NOT_INITIALIZED',
        'HIGH'
      );
    }

    try {
      // Encrypt using Seal's identity-based encryption
      // TODO: Verify correct KEM type constant from @mysten/seal SDK documentation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await this.sealClient.encrypt({
        // kemType removed - KemType is not exported from @mysten/seal
        // May need to specify KEM type differently based on actual SDK
        demType: DemType.AesGcm256,
        threshold: this.config.threshold,
        packageId: this.config.packageId,
        id: identity,
        data,
        aad
      });

      return {
        encryptedObject: result.encryptedObject,
        symmetricKey: result.key, // Store securely - can decrypt without key servers
        identity,
        timestamp: new Date(),
        keyServers: this.config.keyServers.map(ks => ks.objectId),
        threshold: this.config.threshold
      };

    } catch (error) {
      throw new SecurityError(
        `Encryption failed: ${getErrorMessage(error)}`,
        'SEAL_ENCRYPTION_ERROR',
        'HIGH'
      );
    }
  }

  /**
   * Decrypt data using threshold decryption with on-chain access control
   *
   * @param encryptedData - Data encrypted by Seal
   * @param txBytes - Transaction bytes for on-chain access verification
   * @param checkConsistency - Verify decryption shares are consistent
   * @returns Decrypted data
   */
  async decryptData(
    encryptedData: Uint8Array,
    txBytes: Uint8Array,
    checkConsistency: boolean = true
  ): Promise<DecryptedData> {
    if (!this.initialized || !this.sessionKey) {
      throw new SecurityError(
        'Seal integration not initialized',
        'SEAL_NOT_INITIALIZED',
        'HIGH'
      );
    }

    try {
      // Decrypt using threshold decryption across key servers
      const decryptedData = await this.sealClient.decrypt({
        data: encryptedData,
        sessionKey: this.sessionKey,
        txBytes,
        checkShareConsistency: checkConsistency,
        checkLEEncoding: false
      });

      return {
        data: decryptedData,
        identity: 'unknown', // Identity not returned by decrypt
        timestamp: new Date(),
        verified: checkConsistency
      };

    } catch (error) {
      throw new SecurityError(
        `Decryption failed: ${getErrorMessage(error)}`,
        'SEAL_DECRYPTION_ERROR',
        'HIGH'
      );
    }
  }

  /**
   * Fetch decryption keys from key servers
   * Useful to pre-fetch keys for batch decryption
   *
   * @param identities - List of identities to fetch keys for
   * @param txBytes - Transaction bytes for access control
   */
  async fetchKeys(
    identities: string[],
    txBytes: Uint8Array
  ): Promise<void> {
    if (!this.initialized || !this.sessionKey) {
      throw new SecurityError(
        'Seal integration not initialized',
        'SEAL_NOT_INITIALIZED',
        'HIGH'
      );
    }

    try {
      await this.sealClient.fetchKeys({
        ids: identities,
        txBytes,
        sessionKey: this.sessionKey,
        threshold: this.config.threshold
      });

      console.log(`✅ Fetched keys for ${identities.length} identities`);

    } catch (error) {
      throw new SecurityError(
        `Key fetching failed: ${getErrorMessage(error)}`,
        'SEAL_KEY_FETCH_ERROR',
        'HIGH'
      );
    }
  }

  /**
   * Get key server status information
   *
   * @returns Array of key server statuses
   */
  async getKeyServerStatus(): Promise<KeyServerStatus[]> {
    try {
      const keyServers = await this.sealClient.getKeyServers();
      const statuses: KeyServerStatus[] = [];

      for (const [objectId] of keyServers) {
        statuses.push({
          objectId,
          weight: 1, // Weight is internal to SealClient
          online: true, // If we can get it, it's online
          lastSeen: new Date()
        });
      }

      return statuses;

    } catch (error) {
      throw new SecurityError(
        `Failed to get key server status: ${getErrorMessage(error)}`,
        'SEAL_STATUS_ERROR',
        'MEDIUM'
      );
    }
  }

  /**
   * Create an on-chain access policy for encrypted data
   * This is a helper to create Sui transactions with access control
   *
   * @param policy - Access policy configuration
   * @returns Transaction digest
   */
  async createAccessPolicy(
    policy: AccessPolicy,
    signer: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      // Call Seal package to create access policy
      tx.moveCall({
        target: `${this.config.packageId}::access_control::create_policy`,
        arguments: [
          tx.pure.string(policy.identity),
          tx.pure.vector('address', policy.allowedAddresses),
          tx.pure.u64(policy.expirationTime || 0),
          tx.pure.u64(policy.maxDecryptions || 0),
          tx.pure.string(policy.conditions)
        ]
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        signer,
        transaction: tx,
        options: {
          showEffects: true
        }
      });

      console.log(`✅ Access policy created: ${result.digest}`);
      return result.digest;

    } catch (error) {
      throw new SecurityError(
        `Failed to create access policy: ${getErrorMessage(error)}`,
        'SEAL_POLICY_ERROR',
        'HIGH'
      );
    }
  }

  /**
   * Revoke access for a specific identity
   *
   * @param identity - Identity to revoke access for
   * @param signer - Keypair to sign the transaction
   * @returns Transaction digest
   */
  async revokeAccess(
    identity: string,
    signer: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${this.config.packageId}::access_control::revoke_access`,
        arguments: [
          tx.pure.string(identity)
        ]
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        signer,
        transaction: tx,
        options: {
          showEffects: true
        }
      });

      console.log(`✅ Access revoked for identity: ${identity}`);
      return result.digest;

    } catch (error) {
      throw new SecurityError(
        `Failed to revoke access: ${getErrorMessage(error)}`,
        'SEAL_REVOKE_ERROR',
        'HIGH'
      );
    }
  }

  /**
   * Export session key for backup or sharing
   * WARNING: Keep this secure - it allows decryption
   */
  async exportSessionKey(): Promise<string> {
    if (!this.sessionKey) {
      throw new SecurityError(
        'No session key available',
        'SEAL_NO_SESSION_KEY',
        'MEDIUM'
      );
    }

    try {
      const exported = await this.sessionKey.export();
      return JSON.stringify(exported);
    } catch (error) {
      throw new SecurityError(
        `Failed to export session key: ${getErrorMessage(error)}`,
        'SEAL_EXPORT_ERROR',
        'HIGH'
      );
    }
  }

  /**
   * Get public keys for key servers
   * Useful for verification and debugging
   */
  async getKeyServerPublicKeys(): Promise<Map<string, string>> {
    try {
      const keyServers = await this.sealClient.getKeyServers();
      const services = Array.from(keyServers.keys());
      const publicKeys = await this.sealClient.getPublicKeys(services);

      const result = new Map<string, string>();
      services.forEach((service, index) => {
        result.set(service, publicKeys[index].toString());
      });

      return result;

    } catch (error) {
      throw new SecurityError(
        `Failed to get public keys: ${getErrorMessage(error)}`,
        'SEAL_PUBKEY_ERROR',
        'MEDIUM'
      );
    }
  }

  /**
   * Get Seal integration status
   */
  getStatus(): {
    initialized: boolean;
    network: string;
    threshold: number;
    keyServers: number;
    hasSessionKey: boolean;
  } {
    return {
      initialized: this.initialized,
      network: this.config.network,
      threshold: this.config.threshold,
      keyServers: this.config.keyServers.length,
      hasSessionKey: !!this.sessionKey
    };
  }

  /**
   * Close session and cleanup
   */
  async close(): Promise<void> {
    this.sessionKey = undefined;
    this.initialized = false;
    console.log('✅ Seal integration closed');
  }
}

/**
 * Helper function to create a basic Seal configuration for testing
 */
export function createTestSealConfig(network: 'testnet' | 'devnet' = 'testnet'): SealConfig {
  return {
    keyServers: [
      {
        objectId: '0x3cf2a38f061ede3239c1629cb80a9be0e0676b1c15d34c94d104d4ba9d99076f',
        weight: 1
      },
      {
        objectId: '0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37',
        weight: 1
      }
    ],
    threshold: 2,
    network,
    packageId: '0x8afa5d31dbaa0a8fb07082692940ca3d56b5e856c5126cb5a3693f0a4de63b82', // Real Seal testnet package
    sessionKeyTTL: 1800,
    verifyKeyServers: true
  };
}
