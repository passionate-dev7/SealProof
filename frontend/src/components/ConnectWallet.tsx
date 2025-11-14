'use client';

import { useCurrentAccount, useDisconnectWallet, ConnectButton } from '@mysten/dapp-kit';
import { Wallet, LogOut } from 'lucide-react';
import { truncateHash } from '../lib/formatters';

export default function ConnectWallet() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (!currentAccount) {
    return (
      <ConnectButton
        connectText="Connect Wallet"
        className="btn btn-primary flex items-center space-x-2"
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </ConnectButton>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="px-4 py-2 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-200 dark:border-primary-800">
        <div className="flex items-center space-x-2">
          <Wallet className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
            {truncateHash(currentAccount.address)}
          </span>
        </div>
      </div>
      <button
        onClick={() => disconnect()}
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        aria-label="Disconnect wallet"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}
