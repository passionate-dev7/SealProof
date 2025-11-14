'use client';

import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatConfidence } from '../lib/formatters';

interface VerificationBadgeProps {
  verified: boolean;
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function VerificationBadge({
  verified,
  confidence,
  size = 'md',
  showDetails = true,
}: VerificationBadgeProps) {
  const getStatus = () => {
    if (!verified) return 'unverified';
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  };

  const status = getStatus();

  const sizes = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const configs = {
    high: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      icon: <CheckCircle className={iconSizes[size]} />,
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      label: 'Verified',
      description: 'High confidence verification',
    },
    medium: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      icon: <AlertTriangle className={iconSizes[size]} />,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      label: 'Partially Verified',
      description: 'Medium confidence verification',
    },
    low: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-900 dark:text-orange-100',
      icon: <AlertTriangle className={iconSizes[size]} />,
      iconBg: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
      label: 'Low Confidence',
      description: 'Low confidence verification',
    },
    unverified: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: <XCircle className={iconSizes[size]} />,
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Not Verified',
      description: 'Content could not be verified',
    },
  };

  const config = configs[status];

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg ${sizes[size]}`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 ${config.iconBg} rounded-full ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${config.text}`}>{config.label}</p>
          {showDetails && (
            <div className="flex items-center space-x-2 mt-1">
              <p className={`text-xs ${config.text} opacity-75`}>{config.description}</p>
              {verified && (
                <span className={`text-xs font-mono ${config.text} opacity-75`}>
                  {formatConfidence(confidence)}
                </span>
              )}
            </div>
          )}
        </div>
        {verified && (
          <div className="flex items-center space-x-2">
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90" width="64" height="64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - confidence)}`}
                  className={config.iconColor}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${config.text}`}>
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
