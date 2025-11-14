import { useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER_URL = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';

export interface WalrusUploadResult {
  blobId: string;
  url: string;
  size: number;
  contentType: string;
}

export const useWalrus = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  /**
   * Upload file to Walrus storage
   */
  const upload = useCallback(async (file: File): Promise<WalrusUploadResult> => {
    setIsUploading(true);
    try {
      const response = await axios.put(
        `${WALRUS_PUBLISHER_URL}/v1/store`,
        file,
        {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        }
      );

      if (response.data.newlyCreated) {
        const blobId = response.data.newlyCreated.blobObject.blobId;
        const result: WalrusUploadResult = {
          blobId,
          url: `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
          size: file.size,
          contentType: file.type,
        };
        toast.success('File uploaded to Walrus successfully!');
        return result;
      } else if (response.data.alreadyCertified) {
        const blobId = response.data.alreadyCertified.blobId;
        const result: WalrusUploadResult = {
          blobId,
          url: `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
          size: file.size,
          contentType: file.type,
        };
        toast.info('File already exists in Walrus storage');
        return result;
      }

      throw new Error('Unexpected response from Walrus');
    } catch (error) {
      console.error('Walrus upload failed:', error);
      toast.error('Failed to upload to Walrus storage');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Fetch file from Walrus storage
   */
  const fetch = useCallback(async (blobId: string): Promise<Blob> => {
    setIsFetching(true);
    try {
      const response = await axios.get(
        `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Walrus fetch failed:', error);
      toast.error('Failed to fetch from Walrus storage');
      throw error;
    } finally {
      setIsFetching(false);
    }
  }, []);

  /**
   * Get Walrus URL for a blob ID
   */
  const getUrl = useCallback((blobId: string): string => {
    return `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
  }, []);

  /**
   * Upload multiple files
   */
  const uploadMultiple = useCallback(async (files: File[]): Promise<WalrusUploadResult[]> => {
    const results = await Promise.all(files.map(file => upload(file)));
    return results;
  }, [upload]);

  return {
    upload,
    fetch,
    getUrl,
    uploadMultiple,
    isUploading,
    isFetching,
  };
};
