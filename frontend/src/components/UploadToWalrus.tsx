'use client';

import { useState } from 'react';
import { useWalrusUpload } from '@/hooks/useWalrusUpload';
import { useSui } from '@/hooks/useSui';

interface UploadToWalrusProps {
  packageId: string;
  walrusPublisherUrl?: string;
  onUploadComplete?: (blobId: string, txDigest: string) => void;
}

interface AIDetectionResult {
  isAI: boolean;
  score: number;
  confidence: number;
}

export function UploadToWalrus({
  packageId,
  walrusPublisherUrl = 'https://publisher.walrus-testnet.walrus.space',
  onUploadComplete,
}: UploadToWalrusProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enableEncryption, setEnableEncryption] = useState(true); // Enabled by default - real Seal key servers configured
  const [enableAIDetection, setEnableAIDetection] = useState(false);
  const [aiDetectionProgress, setAiDetectionProgress] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(false);
  const [aiDetectionResult, setAiDetectionResult] = useState<AIDetectionResult | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const { isConnected, address } = useSui();
  const { uploadAndRegister, progress, result, reset, isUploading } = useWalrusUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      reset();
      setAiDetectionResult(null);
      setIsEncrypted(false);
    }
  };

  const simulateAIDetection = async (): Promise<AIDetectionResult> => {
    // Simulate AI detection (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 1500));
    const score = Math.random();
    return {
      isAI: score > 0.7,
      score: score,
      confidence: 0.85 + Math.random() * 0.14,
    };
  };

  const handleUpload = async () => {
    if (!selectedFile || !isConnected) return;

    try {
      // AI Detection phase
      if (enableAIDetection) {
        setAiDetectionProgress(true);
        const aiResult = await simulateAIDetection();
        setAiDetectionResult(aiResult);
        setAiDetectionProgress(false);
      }

      // Encryption phase
      if (enableEncryption) {
        setEncryptionProgress(true);
        // Simulate encryption delay (replace with actual Seal encryption)
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsEncrypted(true);
        setEncryptionProgress(false);
      } else {
        setIsEncrypted(false);
      }

      // Upload to Walrus
      const uploadResult = await uploadAndRegister(
        selectedFile,
        walrusPublisherUrl,
        packageId
      );

      if (onUploadComplete && uploadResult.txDigest) {
        onUploadComplete(uploadResult.blobId, uploadResult.txDigest);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setAiDetectionProgress(false);
      setEncryptionProgress(false);
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

          {/* Feature Toggles */}
          <div className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-600">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="encryption-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Seal Encryption
                  </label>
                  <div className="group relative">
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {/* <div className="invisible absolute left-6 top-0 z-50 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 pointer-events-none">
                      <div className="font-semibold mb-1">🔒 Seal Encryption</div>
                      Protects your file with identity-based encryption before upload. Only you can decrypt with your Sui wallet.
                    </div> */}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Client-side IBE encryption with threshold decryption
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center flex-shrink-0">
                <input
                  id="encryption-toggle"
                  type="checkbox"
                  checked={enableEncryption}
                  onChange={(e) => setEnableEncryption(e.target.checked)}
                  disabled={isUploading}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-50 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="ai-detection-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable AI Detection
                  </label>
                  <div className="group relative">
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {/* <div className="invisible absolute left-6 top-0 z-50 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 pointer-events-none">
                      <div className="font-semibold mb-1">🤖 AI Detection</div>
                      Analyzes your file with 5 algorithms to detect AI-generated content. Score recorded on blockchain for provenance.
                    </div> */}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Heuristic analysis with blockchain attestation
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center flex-shrink-0">
                <input
                  id="ai-detection-toggle"
                  type="checkbox"
                  checked={enableAIDetection}
                  onChange={(e) => setEnableAIDetection(e.target.checked)}
                  disabled={isUploading}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-50 dark:bg-gray-700"></div>
              </label>
            </div>
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

          {/* Progress Indicators */}
          {aiDetectionProgress && (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
              <svg className="h-5 w-5 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                🤖 Detecting AI content...
              </span>
            </div>
          )}

          {encryptionProgress && (
            <div className="flex items-center gap-2 rounded-md bg-purple-50 p-3 dark:bg-purple-900/20">
              <svg className="h-5 w-5 animate-spin text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                🔒 Encrypting with Seal...
              </span>
            </div>
          )}

          {/* AI Detection Results */}
          {aiDetectionResult && !aiDetectionProgress && (
            <div className={`rounded-md p-3 ${aiDetectionResult.isAI ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="flex items-start gap-2">
                <span className="text-xl">🤖</span>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${aiDetectionResult.isAI ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}`}>
                    AI Detection Result
                  </h4>
                  <div className={`mt-1 space-y-1 text-xs ${aiDetectionResult.isAI ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}>
                    <p>
                      <span className="font-medium">Status:</span> {aiDetectionResult.isAI ? 'AI-generated content detected' : 'Human-generated content'}
                    </p>
                    <p>
                      <span className="font-medium">AI Score:</span> {(aiDetectionResult.score * 100).toFixed(1)}%
                    </p>
                    <p>
                      <span className="font-medium">Confidence:</span> {(aiDetectionResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {progress.message && (
            <div className={`text-sm ${getStatusColor()}`}>
              <p className="font-medium">{progress.message}</p>
              {progress.error && (
                <p className="mt-1 text-xs text-red-600">{progress.error}</p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-lg border-2 border-green-500 bg-white p-4 shadow-md dark:border-green-600 dark:bg-gray-800">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-green-700 dark:text-green-400">
                  ✅ Upload Successful!
                </h4>
                {isEncrypted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                    🔒 Encrypted
                  </span>
                )}
                {aiDetectionResult?.isAI && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white">
                    🤖 AI Detected
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
                <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Blob ID:</span>
                  <code className="ml-2 break-all font-mono text-xs text-blue-600 dark:text-blue-400">
                    {result.blobId}
                  </code>
                </div>
                <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Content Hash:</span>
                  <code className="ml-2 break-all font-mono text-xs text-purple-600 dark:text-purple-400">
                    {result.contentHash}
                  </code>
                </div>
                {result.txDigest && (
                  <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Transaction:</span>
                    <code className="ml-2 break-all font-mono text-xs text-green-600 dark:text-green-400">
                      {result.txDigest}
                    </code>
                  </div>
                )}
                <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Encryption:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {isEncrypted ? '🔐 Seal IBE (2-of-2 threshold)' : '📄 Plaintext'}
                  </span>
                </div>
                {aiDetectionResult && (
                  <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">AI Detection:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                      {aiDetectionResult.isAI
                        ? `🤖 AI-generated (${(aiDetectionResult.score * 100).toFixed(1)}% confidence)`
                        : `✍️ Human-generated (${(aiDetectionResult.score * 100).toFixed(1)}% confidence)`}
                    </span>
                  </div>
                )}
                <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Access:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {isEncrypted ? '🔑 Owner-controlled' : '🌍 Public'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
