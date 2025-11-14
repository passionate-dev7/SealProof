'use client';

import { useState } from 'react';
import { useSui } from './useSui';

interface UploadResult {
  blobId: string;
  contentHash: string;
  txDigest?: string;
}

interface UploadProgress {
  stage: 'idle' | 'uploading' | 'registering' | 'complete' | 'error';
  message: string;
  error?: string;
}

/**
 * Custom hook for uploading content to Walrus and registering on Sui blockchain
 */
export function useWalrusUpload() {
  const { registerContent, isConnected } = useSui();
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    message: '',
  });
  const [result, setResult] = useState<UploadResult | null>(null);

  /**
   * Upload file to Walrus and register on blockchain
   * @param file - File to upload
   * @param walrusAggregatorUrl - Walrus aggregator URL (default: testnet)
   * @param packageId - Sui package ID for smart contract
   */
  const uploadAndRegister = async (
    file: File,
    walrusAggregatorUrl: string = 'https://aggregator.walrus-testnet.walrus.space',
    packageId: string
  ): Promise<UploadResult> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      // Stage 1: Upload to Walrus
      setProgress({
        stage: 'uploading',
        message: 'Uploading to Walrus...',
      });

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${walrusAggregatorUrl}/v1/store`, {
        method: 'PUT',
        body: file,
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

      // Calculate content hash (simplified - use proper hash in production)
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Stage 2: Register on Sui blockchain
      setProgress({
        stage: 'registering',
        message: 'Registering on blockchain...',
      });

      const txResult = await registerContent(blobId, contentHash, packageId);

      const uploadResult: UploadResult = {
        blobId,
        contentHash,
        txDigest: txResult.digest,
      };

      setResult(uploadResult);
      setProgress({
        stage: 'complete',
        message: 'Upload and registration complete!',
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
   * Reset the upload state
   */
  const reset = () => {
    setProgress({ stage: 'idle', message: '' });
    setResult(null);
  };

  return {
    uploadAndRegister,
    progress,
    result,
    reset,
    isUploading: progress.stage === 'uploading' || progress.stage === 'registering',
  };
}
