'use client';

import { useState } from 'react';
import { Search, Upload, Hash, Link as LinkIcon, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import FileUploader from '../../components/FileUploader';
import VerificationBadge from '../../components/VerificationBadge';
import ChainOfCustody from '../../components/ChainOfCustody';
import AIDetectionResults from '../../components/AIDetectionResults';
import { useProvenance } from '../../hooks/useProvenance';
import { isValidContentHash } from '../../lib/formatters';

type SearchMethod = 'hash' | 'url' | 'file';

export default function Verify() {
  const { verifyContent } = useProvenance();
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('hash');
  const [searchValue, setSearchValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleVerify = async () => {
    setIsSearching(true);
    setVerificationResult(null);

    try {
      let data: any = {};

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
      } else {
        toast.error('Content could not be verified');
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setSearchValue('');
    setSelectedFile(null);
    setVerificationResult(null);
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
