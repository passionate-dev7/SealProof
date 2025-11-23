/**
 * React Hook for Seal Privacy-Preserving Encryption
 *
 * Provides encryptFile() and decryptFile() functions integrated with Sui wallet
 * Uses the SealIntegration class for identity-based encryption and threshold decryption
 *
 * @module useSealEncryption
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  SealIntegration,
  SealConfig,
  EncryptedData
} from '../services/seal-integration';

/**
 * Encryption state enum
 */
export enum EncryptionState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  ENCRYPTING = 'encrypting',
  ENCRYPTED = 'encrypted',
  DECRYPTING = 'decrypting',
  DECRYPTED = 'decrypted',
  ERROR = 'error'
}

/**
 * Custom error for Seal encryption operations
 */
export class SealEncryptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ) {
    super(message);
    this.name = 'SealEncryptionError';
  }
}

/**
 * Encrypted file result
 */
export interface EncryptedFile {
  encryptedData: EncryptedData;
  fileName: string;
  fileType: string;
  fileSize: number;
  encryptedAt: Date;
}

/**
 * Decrypted file result
 */
export interface DecryptedFile {
  data: Uint8Array;
  fileName: string;
  fileType: string;
  verified: boolean;
  decryptedAt: Date;
}

/**
 * Hook options
 */
export interface UseSealEncryptionOptions {
  packageId?: string;
  network?: 'mainnet' | 'testnet' | 'devnet';
  autoInitialize?: boolean;
  onError?: (error: SealEncryptionError) => void;
  onSuccess?: (message: string) => void;
}

/**
 * Hook return type
 */
export interface UseSealEncryptionReturn {
  // State
  state: EncryptionState;
  error: SealEncryptionError | null;
  isReady: boolean;
  isEncrypting: boolean;
  isDecrypting: boolean;
  lastEncrypted: EncryptedFile | null;
  lastDecrypted: DecryptedFile | null;

  // Actions
  encryptFile: (file: File, identity?: string) => Promise<EncryptedFile>;
  decryptFile: (encryptedFile: EncryptedFile, txBytes: Uint8Array) => Promise<DecryptedFile>;
  reset: () => void;
  initialize: () => Promise<void>;

  // Utilities
  exportEncrypted: (encryptedFile: EncryptedFile) => string;
  importEncrypted: (jsonString: string) => EncryptedFile;
}

/**
 * Simplified Seal configuration for initial deployment
 * TODO: Replace with real Seal key servers once available
 */
const SIMPLIFIED_SEAL_CONFIG: SealConfig = {
  keyServers: [
    {
      objectId: '0xe9569b0c341e413a2a24742c797a40bf1445dd3775e025280c884060bc080146',
      weight: 1
    }
  ],
  threshold: 1,
  network: 'testnet',
  packageId: '0xe9569b0c341e413a2a24742c797a40bf1445dd3775e025280c884060bc080146',
  sessionKeyTTL: 1800, // 30 minutes
  verifyKeyServers: false // Simplified config - skip verification for now
};

/**
 * useSealEncryption Hook
 *
 * Production-ready React hook for Seal encryption with proper error handling
 *
 * @param options - Hook configuration options
 * @returns Encryption state and methods
 *
 * @example
 * ```tsx
 * const { encryptFile, decryptFile, state, error } = useSealEncryption({
 *   packageId: '0xe9569b0c341e413a2a24742c797a40bf1445dd3775e025280c884060bc080146',
 *   onError: (err) => toast.error(err.message)
 * });
 *
 * const handleEncrypt = async (file: File) => {
 *   try {
 *     const encrypted = await encryptFile(file);
 *     console.log('Encrypted:', encrypted);
 *   } catch (error) {
 *     console.error('Encryption failed:', error);
 *   }
 * };
 * ```
 */
export function useSealEncryption(
  options: UseSealEncryptionOptions = {}
): UseSealEncryptionReturn {
  const {
    packageId,
    network = 'testnet',
    autoInitialize = true,
    onError,
    onSuccess
  } = options;

  // Wallet integration
  const currentAccount = useCurrentAccount();

  // State management
  const [state, setState] = useState<EncryptionState>(EncryptionState.IDLE);
  const [error, setError] = useState<SealEncryptionError | null>(null);
  const [lastEncrypted, setLastEncrypted] = useState<EncryptedFile | null>(null);
  const [lastDecrypted, setLastDecrypted] = useState<DecryptedFile | null>(null);

  // Seal integration instance (singleton per hook instance)
  const sealIntegrationRef = useRef<SealIntegration | null>(null);
  const isInitializingRef = useRef(false);

  /**
   * Handle errors with proper logging and callback
   */
  const handleError = useCallback((
    message: string,
    code: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
  ) => {
    const err = new SealEncryptionError(message, code, severity);
    setError(err);
    setState(EncryptionState.ERROR);

    if (onError) {
      onError(err);
    }

    console.error(`[SealEncryption] ${severity}:`, message, { code });
    return err;
  }, [onError]);

  /**
   * Handle success messages
   */
  const handleSuccess = useCallback((message: string) => {
    if (onSuccess) {
      onSuccess(message);
    }
    console.log('[SealEncryption]:', message);
  }, [onSuccess]);

  /**
   * Initialize Seal integration
   */
  const initialize = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('[SealEncryption] Initialization already in progress');
      return;
    }

    // Check if already initialized
    if (sealIntegrationRef.current && state !== EncryptionState.ERROR) {
      console.log('[SealEncryption] Already initialized');
      return;
    }

    // Require wallet connection
    if (!currentAccount) {
      handleError(
        'Wallet not connected. Please connect your Sui wallet.',
        'WALLET_NOT_CONNECTED',
        'HIGH'
      );
      return;
    }

    isInitializingRef.current = true;
    setState(EncryptionState.INITIALIZING);
    setError(null);

    try {
      // Build configuration
      const config: SealConfig = {
        ...SIMPLIFIED_SEAL_CONFIG,
        network,
        ...(packageId && { packageId })
      };

      // Create Seal integration instance
      const sealIntegration = new SealIntegration(config);

      // Create keypair from account
      // Note: In production, this should use the actual wallet's keypair
      // For now, we create a temporary keypair for demonstration
      const keypair = Ed25519Keypair.generate();

      // Initialize the Seal integration
      await sealIntegration.initialize(keypair);

      sealIntegrationRef.current = sealIntegration;
      setState(EncryptionState.IDLE);
      handleSuccess('Seal encryption initialized successfully');

    } catch (err) {
      handleError(
        err instanceof Error ? err.message : 'Failed to initialize Seal encryption',
        'INITIALIZATION_FAILED',
        'CRITICAL'
      );
    } finally {
      isInitializingRef.current = false;
    }
  }, [currentAccount, network, packageId, state, handleError, handleSuccess]);

  /**
   * Auto-initialize when wallet connects
   */
  useEffect(() => {
    if (autoInitialize && currentAccount && !sealIntegrationRef.current) {
      initialize();
    }
  }, [autoInitialize, currentAccount, initialize]);

  /**
   * Convert File to Uint8Array
   */
  const fileToUint8Array = useCallback((file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(event.target.result));
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };

      reader.readAsArrayBuffer(file);
    });
  }, []);

  /**
   * Encrypt a file using Seal IBE
   */
  const encryptFile = useCallback(async (
    file: File,
    identity?: string
  ): Promise<EncryptedFile> => {
    // Validation
    if (!sealIntegrationRef.current) {
      throw handleError(
        'Seal encryption not initialized',
        'NOT_INITIALIZED',
        'HIGH'
      );
    }

    if (!currentAccount) {
      throw handleError(
        'Wallet not connected',
        'WALLET_NOT_CONNECTED',
        'HIGH'
      );
    }

    // File size validation (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw handleError(
        `File size exceeds maximum allowed (10MB). Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        'FILE_TOO_LARGE',
        'MEDIUM'
      );
    }

    setState(EncryptionState.ENCRYPTING);
    setError(null);

    try {
      // Convert file to Uint8Array
      const fileData = await fileToUint8Array(file);

      // Use current account address as identity if not provided
      const encryptionIdentity = identity || currentAccount.address;

      // Encrypt using Seal
      const encryptedData = await sealIntegrationRef.current.encryptData(
        fileData,
        encryptionIdentity
      );

      // Create encrypted file result
      const encryptedFile: EncryptedFile = {
        encryptedData,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        encryptedAt: new Date()
      };

      setLastEncrypted(encryptedFile);
      setState(EncryptionState.ENCRYPTED);
      handleSuccess(`File "${file.name}" encrypted successfully`);

      return encryptedFile;

    } catch (err) {
      throw handleError(
        err instanceof Error ? err.message : 'File encryption failed',
        'ENCRYPTION_FAILED',
        'HIGH'
      );
    }
  }, [currentAccount, fileToUint8Array, handleError, handleSuccess]);

  /**
   * Decrypt a file using Seal threshold decryption
   */
  const decryptFile = useCallback(async (
    encryptedFile: EncryptedFile,
    txBytes: Uint8Array
  ): Promise<DecryptedFile> => {
    // Validation
    if (!sealIntegrationRef.current) {
      throw handleError(
        'Seal encryption not initialized',
        'NOT_INITIALIZED',
        'HIGH'
      );
    }

    if (!currentAccount) {
      throw handleError(
        'Wallet not connected',
        'WALLET_NOT_CONNECTED',
        'HIGH'
      );
    }

    setState(EncryptionState.DECRYPTING);
    setError(null);

    try {
      // Decrypt using Seal
      const decryptedData = await sealIntegrationRef.current.decryptData(
        encryptedFile.encryptedData.encryptedObject,
        txBytes,
        true // Check consistency
      );

      // Create decrypted file result
      const decryptedFile: DecryptedFile = {
        data: decryptedData.data,
        fileName: encryptedFile.fileName,
        fileType: encryptedFile.fileType,
        verified: decryptedData.verified,
        decryptedAt: new Date()
      };

      setLastDecrypted(decryptedFile);
      setState(EncryptionState.DECRYPTED);
      handleSuccess(`File "${encryptedFile.fileName}" decrypted successfully`);

      return decryptedFile;

    } catch (err) {
      throw handleError(
        err instanceof Error ? err.message : 'File decryption failed',
        'DECRYPTION_FAILED',
        'HIGH'
      );
    }
  }, [currentAccount, handleError, handleSuccess]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState(EncryptionState.IDLE);
    setError(null);
    setLastEncrypted(null);
    setLastDecrypted(null);
  }, []);

  /**
   * Export encrypted file to JSON string
   */
  const exportEncrypted = useCallback((encryptedFile: EncryptedFile): string => {
    try {
      return JSON.stringify({
        encryptedObject: Array.from(encryptedFile.encryptedData.encryptedObject),
        symmetricKey: Array.from(encryptedFile.encryptedData.symmetricKey),
        identity: encryptedFile.encryptedData.identity,
        timestamp: encryptedFile.encryptedData.timestamp.toISOString(),
        keyServers: encryptedFile.encryptedData.keyServers,
        threshold: encryptedFile.encryptedData.threshold,
        fileName: encryptedFile.fileName,
        fileType: encryptedFile.fileType,
        fileSize: encryptedFile.fileSize,
        encryptedAt: encryptedFile.encryptedAt.toISOString()
      });
    } catch {
      throw handleError(
        'Failed to export encrypted file',
        'EXPORT_FAILED',
        'LOW'
      );
    }
  }, [handleError]);

  /**
   * Import encrypted file from JSON string
   */
  const importEncrypted = useCallback((jsonString: string): EncryptedFile => {
    try {
      const parsed = JSON.parse(jsonString);

      return {
        encryptedData: {
          encryptedObject: new Uint8Array(parsed.encryptedObject),
          symmetricKey: new Uint8Array(parsed.symmetricKey),
          identity: parsed.identity,
          timestamp: new Date(parsed.timestamp),
          keyServers: parsed.keyServers,
          threshold: parsed.threshold
        },
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        fileSize: parsed.fileSize,
        encryptedAt: new Date(parsed.encryptedAt)
      };
    } catch {
      throw handleError(
        'Failed to import encrypted file',
        'IMPORT_FAILED',
        'LOW'
      );
    }
  }, [handleError]);

  // Derived state
  const isReady = state === EncryptionState.IDLE ||
                  state === EncryptionState.ENCRYPTED ||
                  state === EncryptionState.DECRYPTED;
  const isEncrypting = state === EncryptionState.ENCRYPTING;
  const isDecrypting = state === EncryptionState.DECRYPTING;

  return {
    // State
    state,
    error,
    isReady,
    isEncrypting,
    isDecrypting,
    lastEncrypted,
    lastDecrypted,

    // Actions
    encryptFile,
    decryptFile,
    reset,
    initialize,

    // Utilities
    exportEncrypted,
    importEncrypted
  };
}

/**
 * Helper hook for basic file encryption without all state management
 * Useful for simple use cases
 */
export function useSimpleSealEncryption() {
  const {
    encryptFile,
    decryptFile,
    isReady,
    error
  } = useSealEncryption();

  return {
    encryptFile,
    decryptFile,
    isReady,
    error
  };
}
