'use client';

import { WalletConnect } from '@/components/WalletConnect';
import { useState } from 'react';
import { SuiClient } from '@mysten/sui/client';

const REGISTRY_ID = '0x24f8c18a8e43b977e93651b3594ce45d63a8934bd091513973f9eee23f6324f3';

interface ProofData {
  contentHash: string;
  walrusBlobId: string;
  isEncrypted: boolean;
  creator: string;
  registrationTimestamp: number;
  verificationCount: number;
  trustScore: number;
  aiDetectionScore?: number;
  isAiGenerated?: boolean;
  nautilusAttestation?: string;
  transactionDigest?: string;
}

export default function AuthenticatePage() {
  const [blobId, setBlobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofData, setProofData] = useState<ProofData | null>(null);

  const verifyContent = async () => {
    if (!blobId.trim()) {
      setError('Please enter a Blob ID');
      return;
    }

    setLoading(true);
    setError(null);
    setProofData(null);

    try {
      const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

      // Query ContentProof objects by filtering all objects with ContentProof type
      // Since ContentProof objects are transferred to creators, we need to query by type
      const packageId = '0x5d562b619595ae7021aa0c409d5b55bfb73d5553ba7be3369ae39a2d71f9c6d0';

      // Query using multiGetObjects - we'll search through events to find the object ID
      // First, get ContentRegistered events from the package
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::provenance_registry::ContentRegistered`,
        },
        limit: 50,
        order: 'descending',
      });

      console.log('Found events:', events.data.length);

      // Find the event with matching blob ID
      let foundProof: ProofData | null = null;
      let contentObjectId: string | null = null;

      for (const event of events.data) {
        if (event.parsedJson) {
          const eventData = event.parsedJson as Record<string, unknown>;
          const eventBlobId = eventData.walrus_blob_id as string;

          if (eventBlobId === blobId) {
            contentObjectId = eventData.content_id as string;
            console.log('Found matching content object:', contentObjectId);
            break;
          }
        }
      }

      if (!contentObjectId) {
        setError('Content not found on blockchain. This content may not be registered or the Blob ID is incorrect.');
        return;
      }

      // Now fetch the actual ContentProof object
      const contentObject = await client.getObject({
        id: contentObjectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (contentObject.data?.content && 'fields' in contentObject.data.content) {
        const fields = contentObject.data.content.fields as Record<string, unknown>;

        // Parse Option<u64> fields - they come as objects like { vec: [value] } or { vec: [] }
        const parseOptionU64 = (field: unknown): number | undefined => {
          if (!field) return undefined;
          const optionField = field as { vec: number[] };
          return optionField.vec && optionField.vec.length > 0 ? optionField.vec[0] : undefined;
        };

        const parseOptionBool = (field: unknown): boolean | undefined => {
          if (!field) return undefined;
          const optionField = field as { vec: boolean[] };
          return optionField.vec && optionField.vec.length > 0 ? optionField.vec[0] : undefined;
        };

        const parseOptionVector = (field: unknown): string | undefined => {
          if (!field) return undefined;
          const optionField = field as { vec: number[][] };
          if (optionField.vec && optionField.vec.length > 0) {
            return Array.from(optionField.vec[0]).map(b => b.toString(16).padStart(2, '0')).join('');
          }
          return undefined;
        };

        foundProof = {
          contentHash: Array.from(fields.content_hash as number[]).map(b => b.toString(16).padStart(2, '0')).join(''),
          walrusBlobId: fields.walrus_blob_id as string,
          isEncrypted: fields.is_encrypted as boolean,
          creator: fields.creator as string,
          registrationTimestamp: parseInt(fields.registration_timestamp as string),
          verificationCount: parseInt(fields.verification_count as string),
          trustScore: parseInt(fields.trust_score as string),
          aiDetectionScore: parseOptionU64(fields.ai_detection_score),
          isAiGenerated: parseOptionBool(fields.is_ai_generated),
          nautilusAttestation: parseOptionVector(fields.nautilus_attestation),
        };

        console.log('Parsed proof data:', foundProof);
      }

      if (!foundProof) {
        setError('Content not found on blockchain. This content may not be registered or the Blob ID is incorrect.');
        return;
      }

      setProofData(foundProof);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify content');
    } finally {
      setLoading(false);
    }
  };

  const downloadProofCertificate = () => {
    if (!proofData) return;

    const certificate = {
      certificate_type: 'SealProof Authenticity Certificate',
      generated_at: new Date().toISOString(),
      blockchain_network: 'Sui Testnet',
      proof_details: {
        walrus_blob_id: proofData.walrusBlobId,
        content_hash: proofData.contentHash,
        hash_algorithm: 'SHA-256',
        creator_address: proofData.creator,
        registration_timestamp: new Date(proofData.registrationTimestamp).toISOString(),
        is_encrypted: proofData.isEncrypted,
        encryption_method: proofData.isEncrypted ? 'Seal IBE (Identity-Based Encryption)' : 'None',
      },
      ai_detection: {
        score: proofData.aiDetectionScore,
        classification: proofData.isAiGenerated ? 'AI-Generated' : 'Human-Generated',
        confidence: proofData.aiDetectionScore ? `${proofData.aiDetectionScore}%` : 'N/A',
      },
      trust_metrics: {
        verification_count: proofData.verificationCount,
        trust_score: proofData.trustScore,
        blockchain_attestation: proofData.nautilusAttestation ? 'Verified with Nautilus' : 'On-chain only',
      },
      verification_url: `https://testnet.suivision.xyz/object/${REGISTRY_ID}`,
      walrus_url: `https://aggregator.walrus-testnet.walrus.space/v1/${proofData.walrusBlobId}`,
    };

    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sealproof-certificate-${proofData.walrusBlobId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Authenticate Content</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Verify content authenticity and provenance on the blockchain
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* Explanation Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
        <h2 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
          🏆 Provably Authentic Track - How It Works
        </h2>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>
            <strong>SealProof provides cryptographic proof of content authenticity through blockchain attestation:</strong>
          </p>
          <ul className="list-inside list-disc space-y-1 ml-4">
            <li><strong>Immutable Record</strong>: Content hash + AI detection score stored on Sui blockchain (tamper-proof)</li>
            <li><strong>AI Detection</strong>: Heuristic analysis (5 algorithms) determines if content is AI-generated with confidence score</li>
            <li><strong>Seal Encryption</strong>: Identity-Based Encryption proves creator ownership with threshold decryption</li>
            <li><strong>Walrus Storage</strong>: Decentralized blob storage ensures content availability and censorship resistance</li>
            <li><strong>Trust Score</strong>: On-chain verification count builds reputation over time</li>
            <li><strong>Nautilus Integration</strong>: (Coming soon) Verifiable off-chain computation for advanced AI model attestation</li>
          </ul>
        </div>
      </div>

      {/* Verification Input */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold">Verify Content Provenance</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="blobId" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Walrus Blob ID
            </label>
            <input
              type="text"
              id="blobId"
              value={blobId}
              onChange={(e) => setBlobId(e.target.value)}
              placeholder="Enter Blob ID from upload (e.g., BhQW8pSLVz...)"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={verifyContent}
            disabled={loading || !blobId.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying on Blockchain...' : 'Verify Authenticity'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Proof Display */}
      {proofData && (
        <div className="space-y-6">
          {/* Authenticity Status */}
          <div className="rounded-lg border-2 border-green-500 bg-white p-6 shadow-md dark:border-green-600 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                ✅ Content Authenticated
              </h3>
              <button
                onClick={downloadProofCertificate}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                📥 Download Certificate
              </button>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This content has been verified on the Sui blockchain with cryptographic proof of authenticity.
            </p>
          </div>

          {/* AI Detection Results */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">🤖 AI Detection Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md bg-gray-50 p-4 dark:bg-gray-700">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Classification</div>
                  <div className="mt-1 text-lg font-bold">
                    {proofData.isAiGenerated ? (
                      <span className="text-orange-600 dark:text-orange-400">🤖 AI-Generated Content</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">✍️ Human-Generated Content</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Confidence Score</div>
                  <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {proofData.aiDetectionScore ?? 0}%
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>How AI Detection Works:</strong> SealProof uses 5 heuristic algorithms to analyze content patterns,
                  linguistic markers, and statistical anomalies. The score is stored immutably on the blockchain at upload time,
                  providing cryptographic proof of the analysis result.
                </p>
              </div>
            </div>
          </div>

          {/* Blockchain Provenance */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">🔗 Blockchain Provenance</h3>
            <div className="space-y-3">
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <div className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Content Hash (SHA-256)</div>
                <code className="block break-all font-mono text-xs text-purple-600 dark:text-purple-400">
                  {proofData.contentHash}
                </code>
              </div>
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <div className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Walrus Blob ID</div>
                <code className="block break-all font-mono text-xs text-blue-600 dark:text-blue-400">
                  {proofData.walrusBlobId}
                </code>
              </div>
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <div className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Creator Address</div>
                <code className="block break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                  {proofData.creator}
                </code>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                  <div className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Registration Time</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(proofData.registrationTimestamp).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                  <div className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Encryption</div>
                  <div className="text-sm">
                    {proofData.isEncrypted ? (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">🔒 Seal IBE</span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">Unencrypted</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Metrics */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">📊 Trust Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-900/20 dark:to-blue-800/20">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Trust Score</div>
                <div className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {proofData.trustScore}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">out of 100</div>
              </div>
              <div className="rounded-md bg-gradient-to-br from-green-50 to-green-100 p-4 dark:from-green-900/20 dark:to-green-800/20">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Verifications</div>
                <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                  {proofData.verificationCount}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">on-chain checks</div>
              </div>
            </div>
          </div>

          {/* Provenance Timeline */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">⏱️ Provenance Timeline</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">1</div>
                  <div className="h-full w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                </div>
                <div className="flex-1 pb-8">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Content Created</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    File uploaded by {proofData.creator.slice(0, 8)}...{proofData.creator.slice(-6)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(proofData.registrationTimestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">2</div>
                  <div className="h-full w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                </div>
                <div className="flex-1 pb-8">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">AI Detection Analysis</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Heuristic algorithms analyzed content: {proofData.isAiGenerated ? 'AI-generated' : 'Human-generated'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Score: {proofData.aiDetectionScore ?? 0}% confidence
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">3</div>
                  <div className="h-full w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                </div>
                <div className="flex-1 pb-8">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Blockchain Registration</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Content hash and AI score recorded immutably on Sui blockchain
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Registry: {REGISTRY_ID.slice(0, 8)}...{REGISTRY_ID.slice(-6)}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">4</div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Decentralized Storage</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Content stored on Walrus for censorship-resistant availability
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Blob ID: {proofData.walrusBlobId.slice(0, 16)}...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* External Links */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">🔍 Verify on External Platforms</h3>
            <div className="space-y-2">
              <a
                href={`https://testnet.suivision.xyz/object/${REGISTRY_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md bg-blue-50 p-3 text-sm text-blue-600 hover:bg-blue-100 hover:underline dark:bg-blue-900/20 dark:text-blue-400"
              >
                📍 View on Sui Explorer (Blockchain Record) →
              </a>
              <a
                href={`https://aggregator.walrus-testnet.walrus.space/v1/${proofData.walrusBlobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md bg-green-50 p-3 text-sm text-green-600 hover:bg-green-100 hover:underline dark:bg-green-900/20 dark:text-green-400"
              >
                💾 Access on Walrus Storage (Decentralized Content) →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* How to Use */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-900/20">
        <h2 className="mb-3 text-lg font-semibold text-purple-900 dark:text-purple-100">
          📚 How to Use This Page
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-purple-800 dark:text-purple-200">
          <li>Copy a Blob ID from the Upload page after uploading content</li>
          <li>Paste it into the verification input above and click &quot;Verify Authenticity&quot;</li>
          <li>View the complete provenance record including AI detection results</li>
          <li>Download a JSON certificate with cryptographic proof for evidence/auditing</li>
          <li>Share the certificate to prove content authenticity to third parties</li>
        </ol>
      </div>
    </div>
  );
}
