'use client';

import { Brain, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatConfidence } from '../lib/formatters';

interface AIDetectionResultsProps {
  isAiGenerated: boolean;
  confidence: number;
  model?: string;
  details?: {
    patterns?: string[];
    analysis?: string;
  };
}

export default function AIDetectionResults({
  isAiGenerated,
  confidence,
  model,
  details,
}: AIDetectionResultsProps) {
  const getStatusColor = () => {
    if (!isAiGenerated) {
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-900 dark:text-green-100',
        iconBg: 'bg-green-100 dark:bg-green-900',
        iconColor: 'text-green-600 dark:text-green-400',
      };
    }
    if (confidence >= 0.8) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-900 dark:text-red-100',
        iconBg: 'bg-red-100 dark:bg-red-900',
        iconColor: 'text-red-600 dark:text-red-400',
      };
    }
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    };
  };

  const colors = getStatusColor();
  const Icon = isAiGenerated
    ? (confidence >= 0.8 ? XCircle : AlertCircle)
    : CheckCircle;

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
          <Brain className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Detection Analysis
          </h3>
          {model && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Model: {model}
            </p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 ${colors.iconBg} rounded-full ${colors.iconColor} mt-1`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`font-semibold ${colors.text}`}>
                {isAiGenerated ? 'AI-Generated Content Detected' : 'Human-Created Content'}
              </p>
              <p className={`text-sm ${colors.text} opacity-75 mt-1`}>
                {isAiGenerated
                  ? 'This content shows signs of AI generation'
                  : 'No significant AI generation patterns detected'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${colors.text}`}>
              {formatConfidence(confidence)}
            </p>
            <p className={`text-xs ${colors.text} opacity-75`}>Confidence</p>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            Detection Confidence
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {formatConfidence(confidence)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              isAiGenerated ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Details */}
      {details && (
        <div className="space-y-3">
          {details.patterns && details.patterns.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Detected Patterns:
              </p>
              <ul className="space-y-1">
                {details.patterns.map((pattern, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start"
                  >
                    <span className="mr-2">•</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {details.analysis && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Analysis:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {details.analysis}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> AI detection is probabilistic and should be used as one of multiple
          verification methods. Results indicate likelihood but are not definitive proof.
        </p>
      </div>
    </div>
  );
}
