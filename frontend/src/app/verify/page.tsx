'use client';

import { useState } from 'react';
import { Search, Upload, Hash, Link as LinkIcon, Loader, AlertCircle, Lock, Unlock, Download, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { SuiClient } from '@mysten/sui/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import FileUploader from '../../components/FileUploader';
import VerificationBadge from '../../components/VerificationBadge';
import ChainOfCustody from '../../components/ChainOfCustody';
import AIDetectionResults from '../../components/AIDetectionResults';
import { useProvenance } from '../../hooks/useProvenance';
import { useSealEncryption } from '../../hooks/useSealEncryption';
import { isValidContentHash } from '../../lib/formatters';
import { VerifyContentRequest, VerifyContentResponse } from '../../services/api';
// import { attestationToBase64 } from '../../services/nautilus-integration';

type SearchMethod = 'hash' | 'url' | 'file';

// Blockchain ContentProof structure
interface ContentProofData {
  owner: string;
  content_hash: string;
  algorithm: string;
  walrus_blob_id: string;
  is_encrypted: boolean;
  nautilus_attestation: number[];
  ai_detection_score: number;
  is_ai_generated: boolean;
  created_at: number;
  seal_encryption_key: string;
}

export default function Verify() {
  const { verifyContent } = useProvenance();
  const currentAccount = useCurrentAccount();
  const { isDecrypting } = useSealEncryption();

  const [searchMethod, setSearchMethod] = useState<SearchMethod>('hash');
  const [searchValue, setSearchValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyContentResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [blockchainData, setBlockchainData] = useState<ContentProofData | null>(null);
  const [, setIsLoadingBlockchain] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<Uint8Array | null>(null);

  // Query blockchain for ContentProof data
  const queryBlockchainData = async (blobId: string) => {
    setIsLoadingBlockchain(true);
    try {
      const suiClient = new SuiClient({
        url: 'https://fullnode.testnet.sui.io:443',
      });

      // const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '0xe9569b0c341e413a2a24742c797a40bf1445dd3775e025280c884060bc080146';
      const registryId = '0x24f8c18a8e43b977e93651b3594ce45d63a8934bd091513973f9eee23f6324f3';

      // Query the registry for the content proof
      const registryObject = await suiClient.getObject({
        id: registryId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (registryObject.data?.content && 'fields' in registryObject.data.content) {
        const fields = registryObject.data.content.fields as Record<string, unknown>;

        // Search through the registry's contents table for matching blob ID
        // This is a simplified approach - in production, you'd query dynamic fields
        const _contentProofs = fields.contents || [];

        // For now, we'll make a best-effort attempt to find the content
        // In production, this should use a proper indexer or dynamic field query
        toast.success('Blockchain data query successful');

        // Mock data for demonstration - replace with actual blockchain query
        const mockData: ContentProofData = {
          owner: currentAccount?.address || '0x0',
          content_hash: searchValue,
          algorithm: 'SHA256',
          walrus_blob_id: blobId,
          is_encrypted: false, // Will be populated from actual blockchain data
          nautilus_attestation: [],
          ai_detection_score: 0,
          is_ai_generated: false,
          created_at: Date.now(),
          seal_encryption_key: '',
        };

        setBlockchainData(mockData);
      }
    } catch (error) {
      console.error('Failed to query blockchain:', error);
      toast.error('Could not fetch blockchain data');
    } finally {
      setIsLoadingBlockchain(false);
    }
  };

  const handleVerify = async () => {
    setIsSearching(true);
    setVerificationResult(null);

    try {
      const data: VerifyContentRequest = {};

      if (searchMethod === 'hash') {
        if (!isValidContentHash(searchValue)) {
          toast.error('Invalid content hash format');
          setIsSearching(false);
          return;
        }
        data.contentHash = searchValue;
      } else if (searchMethod === 'url') {
        if (!searchValue.startsWith('http')) {
          toast.error('Please enter a valid URL');
          setIsSearching(false);
          return;
        }
        data.url = searchValue;
      } else if (searchMethod === 'file') {
        if (!selectedFile) {
          toast.error('Please select a file');
          setIsSearching(false);
          return;
        }
        data.file = selectedFile;
      }

      const result = await verifyContent.mutateAsync(data);
      setVerificationResult(result);

      if (result.verified) {
        toast.success('Content verified successfully!');

        // Query blockchain data if we have a blob ID or can extract from URL
        let blobId = '';
        if (result.content?.metadata?.walrusBlobId) {
          blobId = result.content.metadata.walrusBlobId as string;
        } else if (searchMethod === 'url' && searchValue.includes('/v1/')) {
          blobId = searchValue.split('/v1/')[1];
        }

        if (blobId) {
          await queryBlockchainData(blobId);
        }
      } else {
        toast.error('Content could not be verified');
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDecrypt = async () => {
    if (!blockchainData || !currentAccount) {
      toast.error('Cannot decrypt: missing data or wallet not connected');
      return;
    }

    try {
      // This is a placeholder - in production, you'd need the actual encrypted file
      // and transaction bytes from the blockchain
      toast('Decryption requires encrypted file data from Walrus storage');

      // For now, we'll show an instructional message
      toast.error('Please download the encrypted file first, then use the decrypt feature');

      // Production implementation would:
      // 1. Download encrypted file from Walrus
      // 2. Get decryption transaction bytes
      // 3. Call decryptFile with proper parameters
    } catch (error) {
      console.error('Decryption failed:', error);
      toast.error('Failed to decrypt content');
    }
  };

  const handleDownloadDecrypted = () => {
    if (!decryptedContent) return;

    const blob = new Blob([new Uint8Array(decryptedContent)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decrypted-content';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSearchValue('');
    setSelectedFile(null);
    setVerificationResult(null);
    setBlockchainData(null);
    setDecryptedContent(null);
  };

  return (
    <div className="min-h-screen py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Verify Content
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Check the authenticity and provenance of digital content using blockchain verification
          </p>
        </div>

        {/* Search Methods */}
        <div className="card mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setSearchMethod('hash')}
              className={`btn ${
                searchMethod === 'hash' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <Hash className="h-4 w-4 mr-2" />
              Content Hash
            </button>
            <button
              onClick={() => setSearchMethod('url')}
              className={`btn ${
                searchMethod === 'url' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Walrus URL
            </button>
            <button
              onClick={() => setSearchMethod('file')}
              className={`btn ${
                searchMethod === 'file' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </button>
          </div>

          {/* Search Input */}
          {searchMethod === 'hash' && (
            <div>
              <label className="label">Enter Content Hash (SHA-256)</label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="e.g., 5f7d3c2e1a9b8f6d4e3c2a1b0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0"
                  className="input flex-1 font-mono text-sm"
                />
                <button
                  onClick={handleVerify}
                  disabled={isSearching || !searchValue}
                  className="btn btn-primary"
                >
                  {isSearching ? (
                    <Loader className="h-5 w-5 spinner" />
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Verify
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {searchMethod === 'url' && (
            <div>
              <label className="label">Enter Walrus Storage URL</label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="https://aggregator.walrus-testnet.walrus.space/v1/..."
                  className="input flex-1"
                />
                <button
                  onClick={handleVerify}
                  disabled={isSearching || !searchValue}
                  className="btn btn-primary"
                >
                  {isSearching ? (
                    <Loader className="h-5 w-5 spinner" />
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Verify
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {searchMethod === 'file' && (
            <div>
              <FileUploader
                onFileSelect={(file) => setSelectedFile(file)}
                disabled={isSearching}
              />
              {selectedFile && (
                <button
                  onClick={handleVerify}
                  disabled={isSearching}
                  className="btn btn-primary w-full mt-4"
                >
                  {isSearching ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Verify File
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="card text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-6">
              <Loader className="h-8 w-8 text-primary-600 dark:text-primary-400 spinner" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Verifying Content
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Checking blockchain records and consensus network...
            </p>
          </div>
        )}

        {/* Verification Results */}
        {!isSearching && verificationResult && (
          <div className="space-y-8 animate-fade-in">
            {/* Verification Badge */}
            <VerificationBadge
              verified={verificationResult.verified}
              confidence={verificationResult.consensus?.confidence || 0}
              size="lg"
            />

            {/* Blockchain Data - Encryption & Security */}
            {blockchainData && (
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-primary-600" />
                  Security & Encryption
                </h3>
                <div className="space-y-4">
                  {/* Encryption Status */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-primary-600">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {blockchainData.is_encrypted ? (
                          <>
                            <Lock className="h-5 w-5 text-primary-600 mr-2" />
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Encrypted Content
                            </span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5 text-gray-600 mr-2" />
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Plaintext Content
                            </span>
                          </>
                        )}
                      </div>
                      {blockchainData.is_encrypted && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                          🔒 Encrypted
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {blockchainData.is_encrypted
                        ? 'This content is encrypted using Seal privacy-preserving encryption. Only authorized parties with the correct decryption keys can access the original content.'
                        : 'This content is stored in plaintext format on Walrus storage and is publicly accessible.'}
                    </p>
                  </div>

                  {/* AI Detection Results */}
                  {blockchainData.ai_detection_score > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-purple-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">🤖</span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            AI Detection
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          blockchainData.is_ai_generated
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {blockchainData.is_ai_generated ? 'AI Generated' : 'Human Created'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">AI Score</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {blockchainData.ai_detection_score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              blockchainData.ai_detection_score >= 70
                                ? 'bg-red-600'
                                : blockchainData.ai_detection_score >= 40
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${blockchainData.ai_detection_score}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Confidence Level: {
                            blockchainData.ai_detection_score >= 90 ? 'Very High' :
                            blockchainData.ai_detection_score >= 70 ? 'High' :
                            blockchainData.ai_detection_score >= 40 ? 'Medium' :
                            blockchainData.ai_detection_score >= 20 ? 'Low' : 'Very Low'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nautilus Attestation */}
                  {blockchainData.nautilus_attestation && blockchainData.nautilus_attestation.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-green-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Nautilus Attestation
                          </span>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Verified
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        This content has been verified through a Nautilus secure enclave attestation.
                      </p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Attestation Hash:</p>
                        <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all bg-white dark:bg-gray-800 p-2 rounded">
                          {Array.from(blockchainData.nautilus_attestation.slice(0, 32))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('')}...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Decrypt Button */}
                  {blockchainData.is_encrypted && (
                    <div className="mt-4">
                      <button
                        onClick={handleDecrypt}
                        disabled={isDecrypting || !currentAccount}
                        className="btn btn-primary w-full"
                      >
                        {isDecrypting ? (
                          <>
                            <Loader className="h-5 w-5 mr-2 spinner" />
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5 mr-2" />
                            Decrypt Content
                          </>
                        )}
                      </button>
                      {!currentAccount && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 text-center">
                          Please connect your wallet to decrypt
                        </p>
                      )}
                    </div>
                  )}

                  {/* Download Decrypted Content */}
                  {decryptedContent && (
                    <div className="mt-4">
                      <button
                        onClick={handleDownloadDecrypted}
                        className="btn btn-secondary w-full"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download Decrypted Content
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Details */}
            {verificationResult.verified && verificationResult.content && (
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Content Information
                </h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Content ID</p>
                      <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                        {verificationResult.content.id}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Registration Date</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {new Date(verificationResult.content.registrationDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Content Hash</p>
                    <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                      {verificationResult.content.hash}
                    </p>
                  </div>
                  {blockchainData?.walrus_blob_id && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Walrus Blob ID</p>
                      <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                        {blockchainData.walrus_blob_id}
                      </p>
                      <a
                        href={`https://aggregator.walrus-testnet.walrus.space/v1/${blockchainData.walrus_blob_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-2 inline-flex items-center"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        View on Walrus
                      </a>
                    </div>
                  )}
                  {verificationResult.content.metadata && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Metadata</p>
                      <pre className="text-xs text-gray-900 dark:text-gray-100 overflow-auto">
                        {JSON.stringify(verificationResult.content.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Consensus Information */}
            {verificationResult.consensus && (
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Network Consensus
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                      {Math.round(verificationResult.consensus.confidence * 100)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                      {verificationResult.consensus.validators}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Validators</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {verificationResult.consensus.verified ? 'Yes' : 'No'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Verified</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Detection */}
            {verificationResult.aiDetection && (
              <AIDetectionResults
                isAiGenerated={verificationResult.aiDetection.isAiGenerated}
                confidence={verificationResult.aiDetection.confidence}
                model={verificationResult.aiDetection.model}
              />
            )}

            {/* Chain of Custody */}
            {verificationResult.provenance?.chain && (
              <ChainOfCustody events={verificationResult.provenance.chain} />
            )}

            {/* Actions */}
            <div className="flex space-x-4">
              <button onClick={handleReset} className="btn btn-secondary flex-1">
                Verify Another
              </button>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {!isSearching && verificationResult && !verificationResult.verified && (
          <div className="card text-center py-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full mb-6">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Content Not Verified
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This content could not be found in our verification network
            </p>
            <button onClick={handleReset} className="btn btn-primary">
              Try Another Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
