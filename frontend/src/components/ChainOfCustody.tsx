'use client';

import { Calendar, User, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDate, formatRelativeTime } from '../lib/formatters';

interface ChainEvent {
  timestamp: string;
  action: string;
  actor: string;
  verified: boolean;
  details?: string;
}

interface ChainOfCustodyProps {
  events: ChainEvent[];
}

export default function ChainOfCustody({ events }: ChainOfCustodyProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Chain of Custody
      </h3>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={index} className="relative flex items-start space-x-4">
              {/* Timeline Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  event.verified
                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                }`}
              >
                {event.verified ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0 pb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* Action & Status */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {event.action}
                      </p>
                      {event.details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {event.details}
                        </p>
                      )}
                    </div>
                    <span
                      className={`badge ${
                        event.verified ? 'badge-success' : 'badge-error'
                      }`}
                    >
                      {event.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>

                  {/* Actor & Timestamp */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{event.actor}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatRelativeTime(event.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              No custody events recorded yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
