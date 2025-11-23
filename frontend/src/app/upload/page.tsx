'use client';

import { UploadToWalrus } from '@/components/UploadToWalrus';
import { WalletConnect } from '@/components/WalletConnect';
import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '../config/network';
import { useState } from 'react';

export default function UploadPage() {
  const { isConnected, address } = useSui();
  const [lastUpload, setLastUpload] = useState<{
    blobId: string;
    txDigest: string;
  } | null>(null);

  const handleUploadComplete = (blobId: string, txDigest: string) => {
    setLastUpload({ blobId, txDigest });
    console.log('Upload completed successfully!');
    console.log('Blob ID:', blobId);
    console.log('Transaction Digest:', txDigest);
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold">SealProof Upload</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload files to Walrus and register on Sui blockchain
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-2 text-lg font-semibold">Connection Status</h2>
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Connected: <code className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">{address}</code>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Not connected. Please connect your wallet to upload files.
            </span>
          </div>
        )}
      </div>

      {/* Upload Component */}
      <UploadToWalrus
        packageId={TESTNET_CONTRACT_PACKAGE_ID || ''}
        walrusPublisherUrl="https://publisher.walrus-testnet.walrus.space"
        onUploadComplete={handleUploadComplete}
      />

      {/* Recent Upload History */}
      {lastUpload && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold">Last Upload</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Blob ID
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700">
                  {lastUpload.blobId}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(lastUpload.blobId)}
                  className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Transaction Digest
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700">
                  {lastUpload.txDigest}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(lastUpload.txDigest)}
                  className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="pt-2">
              <a
                href={`https://testnet.suivision.xyz/txblock/${lastUpload.txDigest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                View on Sui Explorer →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
        <h2 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
          How It Works
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>Connect your Sui wallet using the button above</li>
          <li>Select a file to upload (any file type supported)</li>
          <li>Click &quot;Upload to Walrus &amp; Register&quot; to start the process</li>
          <li>The file will be uploaded to Walrus decentralized storage</li>
          <li>The content metadata will be registered on the Sui blockchain</li>
          <li>You&apos;ll receive a Blob ID and transaction digest for verification</li>
        </ol>
      </div>
    </div>
  );
}
