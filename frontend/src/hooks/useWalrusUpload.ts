'use client';

import { useState } from 'react';
import { useSui } from './useSui';
import { useSealEncryption, EncryptedFile } from './useSealEncryption';
import {
  NautilusIntegrationService,
  DetectionResult,
  DetectionModel
} from '../services/nautilus-integration';

interface UploadResult {
  blobId: string;
  contentHash: string;
  txDigest?: string;
  isEncrypted?: boolean;
  nautilusAttestation?: NautilusAttestation;
  encryptedFile?: EncryptedFile;
}

interface NautilusAttestation {
  aiScore: number;
  confidenceLevel: string;
  attestationBytes: string;
  model: string;
  timestamp: string;
}

interface UploadProgress {
  stage: 'idle' | 'ai-detecting' | 'encrypting' | 'uploading' | 'registering' | 'complete' | 'error';
  message: string;
  error?: string;
}

interface UploadConfig {
  enableEncryption?: boolean;
  enableAIDetection?: boolean;
  accessPolicy?: string[];
  nautilusConfig?: {
    enclaveEndpoint?: string;
    apiKey?: string;
    model?: DetectionModel;
  };
}

/**
 * Custom hook for uploading content to Walrus with optional Seal encryption and Nautilus AI detection
 *
 * @example
 * ```tsx
 * const { uploadAndRegister, progress } = useWalrusUpload();
 *
 * const result = await uploadAndRegister(
 *   file,
 *   walrusUrl,
 *   packageId,
 *   {
 *     enableEncryption: true,
 *     enableAIDetection: true,
 *     accessPolicy: ['0x123...']
 *   }
 * );
 * ```
 */
export function useWalrusUpload() {
  const { registerContent, isConnected } = useSui();
  const { encryptFile, isReady: sealReady } = useSealEncryption({
    autoInitialize: true
  });
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    message: '',
  });
  const [result, setResult] = useState<UploadResult | null>(null);

  /**
   * Converts file to text content for AI detection
   */
  const fileToText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsText(file);
    });
  };

  /**
   * Upload file to Walrus and register on blockchain with optional encryption and AI detection
   * @param file - File to upload
   * @param walrusPublisherUrl - Walrus publisher URL (default: testnet)
   * @param packageId - Sui package ID for smart contract
   * @param config - Optional configuration for encryption and AI detection
   */
  const uploadAndRegister = async (
    file: File,
    walrusPublisherUrl: string = 'https://publisher.walrus-testnet.walrus.space',
    packageId: string,
    config: UploadConfig = {}
  ): Promise<UploadResult> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    const {
      enableEncryption = true,
      enableAIDetection = false,
      accessPolicy = [],
      nautilusConfig = {}
    } = config;

    // Validate Seal encryption is ready if encryption is enabled
    if (enableEncryption && !sealReady) {
      throw new Error('Seal encryption not initialized. Please wait or connect wallet.');
    }

    try {
      let nautilusAttestation: NautilusAttestation | undefined;
      let encryptedFile: EncryptedFile | undefined;
      let fileToUpload: File | Blob = file;

      // Step 1: Calculate content hash of original file (before any modifications)
      const originalArrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', originalArrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Step 2: Optional AI Detection (if enabled)
      if (enableAIDetection) {
        setProgress({
          stage: 'ai-detecting',
          message: 'Running AI detection...',
        });

        try {
          // Initialize Nautilus service
          const nautilusService = new NautilusIntegrationService({
            enclaveEndpoint: nautilusConfig.enclaveEndpoint,
            apiKey: nautilusConfig.apiKey,
            defaultModel: nautilusConfig.model || DetectionModel.ENSEMBLE
          });

          // Read file content for AI detection
          const fileContent = await fileToText(file);

          // Run AI detection
          const detectionResult: DetectionResult = await nautilusService.detectAI({
            content: fileContent,
            model: nautilusConfig.model,
            includeMetadata: true
          });

          // Convert attestation bytes to base64 for storage
          const attestationBase64 = btoa(
            String.fromCharCode(...Array.from(detectionResult.attestation.bytes))
          );

          nautilusAttestation = {
            aiScore: detectionResult.aiScore,
            confidenceLevel: detectionResult.confidenceLevel,
            attestationBytes: attestationBase64,
            model: detectionResult.model,
            timestamp: detectionResult.timestamp
          };

          console.log('AI Detection completed:', {
            score: detectionResult.aiScore,
            confidence: detectionResult.confidenceLevel
          });

        } catch (aiError) {
          console.warn('AI detection failed, continuing without attestation:', aiError);
          // Continue with upload even if AI detection fails
        }
      }

      // Step 3: Optional Encryption (if enabled)
      if (enableEncryption) {
        setProgress({
          stage: 'encrypting',
          message: 'Encrypting file with Seal...',
        });

        try {
          // Encrypt the file using Seal
          const identity = accessPolicy.length > 0 ? accessPolicy[0] : undefined;
          encryptedFile = await encryptFile(file, identity);

          // Convert encrypted data to Blob for upload
          const encryptedBlob = new Blob([encryptedFile.encryptedData.encryptedObject], {
            type: 'application/octet-stream'
          });

          fileToUpload = encryptedBlob;

          console.log('File encrypted successfully:', {
            fileName: encryptedFile.fileName,
            originalSize: encryptedFile.fileSize,
            encryptedSize: encryptedBlob.size
          });

        } catch (encryptError) {
          const errorMessage = encryptError instanceof Error ? encryptError.message : 'Unknown encryption error';
          throw new Error(`Encryption failed: ${errorMessage}`);
        }
      }

      // Step 4: Upload to Walrus
      setProgress({
        stage: 'uploading',
        message: enableEncryption ? 'Uploading encrypted file to Walrus...' : 'Uploading to Walrus...',
      });

      // Use /v1/blobs endpoint on publisher
      const uploadResponse = await fetch(`${walrusPublisherUrl}/v1/blobs`, {
        method: 'PUT',
        body: fileToUpload,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Walrus upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      const blobId = uploadData.newlyCreated?.blobObject?.blobId ||
                     uploadData.alreadyCertified?.blobId;

      if (!blobId) {
        throw new Error('Failed to get blob ID from Walrus response');
      }

      // Step 5: Register on Sui blockchain (optional if packageId is valid)
      let txDigest: string | undefined;

      if (packageId && packageId !== '0x000000000000000000000000000000000000000000000000000000notdefined') {
        setProgress({
          stage: 'registering',
          message: 'Registering on blockchain...',
        });

        // TODO: Enhanced registerContent should accept encryption status and Nautilus attestation
        // For now, we use the existing registerContent method
        const txResult = await registerContent(blobId, contentHash, packageId);
        txDigest = txResult.digest;
      } else {
        console.warn('Package ID not configured - skipping blockchain registration');
      }

      // Step 6: Build result
      const uploadResult: UploadResult = {
        blobId,
        contentHash,
        txDigest,
        isEncrypted: enableEncryption,
        nautilusAttestation,
        encryptedFile
      };

      setResult(uploadResult);
      setProgress({
        stage: 'complete',
        message: buildCompleteMessage(txDigest, enableEncryption, enableAIDetection),
      });

      return uploadResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setProgress({
        stage: 'error',
        message: 'Upload failed',
        error: errorMessage,
      });
      throw error;
    }
  };

  /**
   * Build completion message based on operations performed
   */
  const buildCompleteMessage = (
    txDigest: string | undefined,
    encrypted: boolean,
    aiDetected: boolean
  ): string => {
    const parts: string[] = [];

    if (encrypted) parts.push('encrypted');
    if (aiDetected) parts.push('AI-verified');
    parts.push('uploaded');

    const operationsText = parts.join(', ');

    if (txDigest) {
      return `File ${operationsText} and registered on blockchain!`;
    } else {
      return `File ${operationsText} to Walrus! (Blockchain registration skipped)`;
    }
  };

  /**
   * Reset the upload state
   */
  const reset = () => {
    setProgress({ stage: 'idle', message: '' });
    setResult(null);
  };

  /**
   * Check if any upload stage is in progress
   */
  const isUploading =
    progress.stage === 'ai-detecting' ||
    progress.stage === 'encrypting' ||
    progress.stage === 'uploading' ||
    progress.stage === 'registering';

  return {
    uploadAndRegister,
    progress,
    result,
    reset,
    isUploading,
    sealReady,
  };
}
