# Sui Wallet Integration - Usage Examples

## Table of Contents
1. [Basic Wallet Connection](#basic-wallet-connection)
2. [File Upload to Walrus](#file-upload-to-walrus)
3. [Content Registration](#content-registration)
4. [Content Verification](#content-verification)
5. [Custom Transaction Handling](#custom-transaction-handling)

---

## Basic Wallet Connection

### Example 1: Display Connection Status

```tsx
'use client';

import { useSui } from '@/hooks/useSui';

export default function ConnectionStatus() {
  const { isConnected, address, account } = useSui();

  return (
    <div className="rounded-lg border p-4">
      {isConnected ? (
        <div className="space-y-2">
          <p className="text-green-600">✓ Wallet Connected</p>
          <p className="text-sm">Address: {address}</p>
          <p className="text-xs text-gray-500">
            {address?.slice(0, 16)}...{address?.slice(-16)}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-red-600">✗ Wallet Not Connected</p>
          <p className="text-sm">Please connect your Sui wallet</p>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Conditional Rendering Based on Connection

```tsx
'use client';

import { useSui } from '@/hooks/useSui';
import { WalletConnect } from '@/components/WalletConnect';

export default function ProtectedContent() {
  const { isConnected } = useSui();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p>Please connect your wallet to continue</p>
        <WalletConnect />
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome! Your wallet is connected.</h1>
      {/* Your protected content here */}
    </div>
  );
}
```

---

## File Upload to Walrus

### Example 3: Simple Upload Component

```tsx
'use client';

import { UploadToWalrus } from '@/components/UploadToWalrus';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';

export default function SimpleUpload() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-6 text-2xl font-bold">Upload to SealProof</h1>
      <UploadToWalrus
        packageId={TESTNET_CONTRACT_PACKAGE_ID}
        onUploadComplete={(blobId, txDigest) => {
          alert(`Upload successful! Blob ID: ${blobId}`);
        }}
      />
    </div>
  );
}
```

### Example 4: Upload with Progress Tracking

```tsx
'use client';

import { useWalrusUpload } from '@/hooks/useWalrusUpload';
import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';
import { useState } from 'react';

export default function UploadWithProgress() {
  const { isConnected } = useSui();
  const { uploadAndRegister, progress, result, isUploading } = useWalrusUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!selectedFile || !isConnected) return;

    try {
      await uploadAndRegister(
        selectedFile,
        'https://aggregator.walrus-testnet.walrus.space',
        TESTNET_CONTRACT_PACKAGE_ID
      );
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        disabled={isUploading}
      />

      <button
        onClick={handleUpload}
        disabled={!selectedFile || !isConnected || isUploading}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>

      {progress.message && (
        <div>
          <p>Stage: {progress.stage}</p>
          <p>Message: {progress.message}</p>
        </div>
      )}

      {result && (
        <div className="rounded border border-green-500 p-4">
          <p>✓ Upload Complete!</p>
          <p className="text-sm">Blob ID: {result.blobId}</p>
          <p className="text-sm">Tx: {result.txDigest}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 5: Multi-File Upload

```tsx
'use client';

import { useWalrusUpload } from '@/hooks/useWalrusUpload';
import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';
import { useState } from 'react';

interface UploadedFile {
  name: string;
  blobId: string;
  txDigest?: string;
}

export default function MultiFileUpload() {
  const { isConnected } = useSui();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const uploadNextFile = async () => {
    if (currentIndex >= files.length) return;

    const file = files[currentIndex];
    const { uploadAndRegister } = useWalrusUpload();

    try {
      const result = await uploadAndRegister(
        file,
        'https://aggregator.walrus-testnet.walrus.space',
        TESTNET_CONTRACT_PACKAGE_ID
      );

      setUploadedFiles(prev => [...prev, {
        name: file.name,
        blobId: result.blobId,
        txDigest: result.txDigest,
      }]);

      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        onChange={(e) => {
          const fileList = Array.from(e.target.files || []);
          setFiles(fileList);
          setCurrentIndex(0);
          setUploadedFiles([]);
        }}
      />

      <button
        onClick={uploadNextFile}
        disabled={!isConnected || currentIndex >= files.length}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Upload Next File ({currentIndex + 1}/{files.length})
      </button>

      <div>
        <h3>Uploaded Files:</h3>
        {uploadedFiles.map((file, i) => (
          <div key={i} className="border-b py-2">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-600">{file.blobId}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Content Registration

### Example 6: Manual Content Registration

```tsx
'use client';

import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';
import { useState } from 'react';

export default function ManualRegistration() {
  const { registerContent, isConnected } = useSui();
  const [blobId, setBlobId] = useState('');
  const [contentHash, setContentHash] = useState('');
  const [txDigest, setTxDigest] = useState('');

  const handleRegister = async () => {
    if (!isConnected || !blobId || !contentHash) return;

    try {
      const result = await registerContent(
        blobId,
        contentHash,
        TESTNET_CONTRACT_PACKAGE_ID
      );

      setTxDigest(result.digest);
      alert('Content registered successfully!');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. See console for details.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Blob ID</label>
        <input
          type="text"
          value={blobId}
          onChange={(e) => setBlobId(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Enter Walrus blob ID"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Content Hash</label>
        <input
          type="text"
          value={contentHash}
          onChange={(e) => setContentHash(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Enter content hash"
        />
      </div>

      <button
        onClick={handleRegister}
        disabled={!isConnected || !blobId || !contentHash}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Register Content
      </button>

      {txDigest && (
        <div className="rounded border border-green-500 p-4">
          <p>Transaction Digest: {txDigest}</p>
          <a
            href={`https://testnet.suivision.xyz/txblock/${txDigest}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View on Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
```

---

## Content Verification

### Example 7: Verify Content on Blockchain

```tsx
'use client';

import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';
import { useState } from 'react';

export default function VerifyContent() {
  const { verifyContent, isConnected } = useSui();
  const [blobId, setBlobId] = useState('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!isConnected || !blobId) return;

    try {
      const result = await verifyContent(
        blobId,
        TESTNET_CONTRACT_PACKAGE_ID
      );

      setVerificationResult(result.digest);
      alert('Verification transaction submitted!');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed. Content may not exist on chain.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Blob ID to Verify</label>
        <input
          type="text"
          value={blobId}
          onChange={(e) => setBlobId(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Enter blob ID"
        />
      </div>

      <button
        onClick={handleVerify}
        disabled={!isConnected || !blobId}
        className="rounded bg-green-600 px-4 py-2 text-white"
      >
        Verify Content
      </button>

      {verificationResult && (
        <div className="rounded border border-green-500 p-4">
          <p>✓ Verification Complete</p>
          <p className="text-sm">Transaction: {verificationResult}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 8: Query Content Metadata

```tsx
'use client';

import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { useState } from 'react';

export default function QueryContent() {
  const { isConnected, queryContent } = useSui();
  const [blobId, setBlobId] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  const handleQuery = async () => {
    if (!isConnected || !blobId) return;

    try {
      const client = new SuiClient({
        url: getFullnodeUrl('testnet'),
      });

      const result = await queryContent(
        client,
        TESTNET_CONTRACT_PACKAGE_ID,
        blobId
      );

      setMetadata(result);
    } catch (error) {
      console.error('Query failed:', error);
      alert('Failed to query content metadata');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Blob ID</label>
        <input
          type="text"
          value={blobId}
          onChange={(e) => setBlobId(e.target.value)}
          className="w-full rounded border p-2"
        />
      </div>

      <button
        onClick={handleQuery}
        disabled={!isConnected || !blobId}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Query Metadata
      </button>

      {metadata && (
        <pre className="rounded border bg-gray-100 p-4 text-xs">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

---

## Custom Transaction Handling

### Example 9: Custom Move Call

```tsx
'use client';

import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';

export default function CustomTransaction() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const handleCustomCall = async () => {
    if (!account) return;

    const tx = new Transaction();

    // Example: Call a custom function
    tx.moveCall({
      target: `${TESTNET_CONTRACT_PACKAGE_ID}::truthchain::custom_function`,
      arguments: [
        tx.pure.string('param1'),
        tx.pure.u64(12345),
      ],
    });

    try {
      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('Transaction result:', result);
      alert('Transaction successful!');
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <button
      onClick={handleCustomCall}
      disabled={!account}
      className="rounded bg-purple-600 px-4 py-2 text-white"
    >
      Execute Custom Transaction
    </button>
  );
}
```

### Example 10: Batch Transactions

```tsx
'use client';

import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';

export default function BatchTransactions() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const handleBatchRegister = async (items: Array<{blob: string, hash: string}>) => {
    if (!account) return;

    const tx = new Transaction();

    // Add multiple calls in one transaction
    items.forEach(item => {
      tx.moveCall({
        target: `${TESTNET_CONTRACT_PACKAGE_ID}::truthchain::register_content`,
        arguments: [
          tx.pure.string(item.blob),
          tx.pure.string(item.hash),
        ],
      });
    });

    try {
      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('Batch transaction result:', result);
      alert(`Registered ${items.length} items!`);
    } catch (error) {
      console.error('Batch transaction failed:', error);
    }
  };

  const demoItems = [
    { blob: 'blob1', hash: 'hash1' },
    { blob: 'blob2', hash: 'hash2' },
    { blob: 'blob3', hash: 'hash3' },
  ];

  return (
    <button
      onClick={() => handleBatchRegister(demoItems)}
      disabled={!account}
      className="rounded bg-indigo-600 px-4 py-2 text-white"
    >
      Batch Register (3 items)
    </button>
  );
}
```

---

## Complete Integration Example

### Example 11: Full-Featured Upload Page

```tsx
'use client';

import { useState } from 'react';
import { useSui } from '@/hooks/useSui';
import { useWalrusUpload } from '@/hooks/useWalrusUpload';
import { WalletConnect } from '@/components/WalletConnect';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';

export default function CompleteUploadPage() {
  const { isConnected, address } = useSui();
  const { uploadAndRegister, progress, result, reset, isUploading } = useWalrusUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadHistory, setUploadHistory] = useState<Array<{
    name: string;
    blobId: string;
    txDigest?: string;
    timestamp: Date;
  }>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
        'https://aggregator.walrus-testnet.walrus.space',
        TESTNET_CONTRACT_PACKAGE_ID
      );

      setUploadHistory(prev => [...prev, {
        name: selectedFile.name,
        blobId: uploadResult.blobId,
        txDigest: uploadResult.txDigest,
        timestamp: new Date(),
      }]);

      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">SealProof Upload Center</h1>
        <WalletConnect />
      </header>

      {!isConnected ? (
        <div className="rounded-lg bg-yellow-50 p-6">
          <p>Please connect your wallet to continue</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-xl font-semibold">Upload File</h2>

            <input
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              className="mb-4 w-full"
            />

            {selectedFile && (
              <p className="mb-4 text-sm">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="rounded bg-blue-600 px-6 py-2 text-white disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload & Register'}
            </button>

            {progress.message && (
              <div className="mt-4">
                <p className="font-medium">{progress.message}</p>
                {progress.error && (
                  <p className="text-red-600">{progress.error}</p>
                )}
              </div>
            )}

            {result && (
              <div className="mt-4 rounded bg-green-50 p-4">
                <p className="font-semibold text-green-800">✓ Upload Complete!</p>
                <p className="text-sm">Blob ID: {result.blobId}</p>
                <p className="text-sm">Tx: {result.txDigest}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-xl font-semibold">Upload History</h2>
            {uploadHistory.length === 0 ? (
              <p className="text-gray-500">No uploads yet</p>
            ) : (
              <div className="space-y-3">
                {uploadHistory.map((item, i) => (
                  <div key={i} className="border-b pb-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.blobId}</p>
                    <p className="text-xs text-gray-500">
                      {item.timestamp.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Testing Tips

1. **Always check connection** before operations
2. **Handle errors gracefully** with try/catch
3. **Show loading states** during async operations
4. **Verify transactions** on Sui explorer
5. **Test with small files** first
6. **Use testnet** for development

## Next Steps

- Review the [Integration Guide](/docs/SUI_INTEGRATION.md)
- Deploy your smart contract
- Test these examples in your app
- Build custom features on top of these patterns
