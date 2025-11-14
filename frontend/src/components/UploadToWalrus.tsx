'use client';

import { useState } from 'react';
import { useWalrusUpload } from '@/hooks/useWalrusUpload';
import { useSui } from '@/hooks/useSui';

interface UploadToWalrusProps {
  packageId: string;
  walrusAggregatorUrl?: string;
  onUploadComplete?: (blobId: string, txDigest: string) => void;
}

export function UploadToWalrus({
  packageId,
  walrusAggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space',
  onUploadComplete,
}: UploadToWalrusProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isConnected, address } = useSui();
  const { uploadAndRegister, progress, result, reset, isUploading } = useWalrusUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      reset();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !isConnected) return;

    try {
      const uploadResult = await uploadAndRegister(
        selectedFile,
        walrusAggregatorUrl,
        packageId
      );

      if (onUploadComplete && uploadResult.txDigest) {
        onUploadComplete(uploadResult.blobId, uploadResult.txDigest);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const getStatusColor = () => {
    switch (progress.stage) {
      case 'uploading':
      case 'registering':
        return 'text-blue-600';
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <h3 className="text-lg font-semibold">Upload to Walrus</h3>

      {!isConnected ? (
        <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please connect your wallet to upload files
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Select File
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload to Walrus & Register'}
          </button>

          {progress.message && (
            <div className={`text-sm ${getStatusColor()}`}>
              <p className="font-medium">{progress.message}</p>
              {progress.error && (
                <p className="mt-1 text-xs text-red-600">{progress.error}</p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <h4 className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">
                Upload Successful!
              </h4>
              <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                <p>
                  <span className="font-medium">Blob ID:</span>{' '}
                  <code className="rounded bg-green-100 px-1 py-0.5 dark:bg-green-900/40">
                    {result.blobId}
                  </code>
                </p>
                <p>
                  <span className="font-medium">Content Hash:</span>{' '}
                  <code className="rounded bg-green-100 px-1 py-0.5 dark:bg-green-900/40">
                    {result.contentHash.slice(0, 16)}...
                  </code>
                </p>
                {result.txDigest && (
                  <p>
                    <span className="font-medium">Transaction:</span>{' '}
                    <code className="rounded bg-green-100 px-1 py-0.5 dark:bg-green-900/40">
                      {result.txDigest}
                    </code>
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
