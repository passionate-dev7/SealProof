'use client';

import { Shield, Download, Calendar, Hash, User, ExternalLink } from 'lucide-react';
import { formatDate, truncateHash } from '../lib/formatters';

interface ProvenanceCertificateProps {
  data: {
    contentId: string;
    contentHash: string;
    registrationDate: string;
    walrusUrl: string;
    suiObjectId: string;
    transactionDigest: string;
    metadata?: {
      title?: string;
      author?: string;
      description?: string;
    };
  };
  onDownload?: () => void;
}

export default function ProvenanceCertificate({ data, onDownload }: ProvenanceCertificateProps) {
  return (
    <div className="card space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary-600 rounded-xl">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Provenance Certificate
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verified on TruthChain
            </p>
          </div>
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="btn btn-outline flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        )}
      </div>

      {/* Certificate Details */}
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 mb-2">
            <Hash className="h-4 w-4" />
            <span className="text-sm font-medium">Content Hash</span>
          </div>
          <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
            {data.contentHash}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Registration Date</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(data.registrationDate)}
            </p>
          </div>

          {data.metadata?.author && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Author</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.metadata.author}
              </p>
            </div>
          )}
        </div>

        {data.metadata?.title && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {data.metadata.title}
            </p>
          </div>
        )}

        {data.metadata?.description && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {data.metadata.description}
            </p>
          </div>
        )}
      </div>

      {/* Blockchain Details */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Blockchain Details
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sui Object ID</span>
            <a
              href={`https://suiexplorer.com/object/${data.suiObjectId}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <span className="font-mono">{truncateHash(data.suiObjectId)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Transaction</span>
            <a
              href={`https://suiexplorer.com/txblock/${data.transactionDigest}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <span className="font-mono">{truncateHash(data.transactionDigest)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Walrus Storage</span>
            <a
              href={data.walrusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <span>View Content</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Verification Badge */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
              Verified Provenance
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              This content is cryptographically verified and stored on Sui blockchain
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
