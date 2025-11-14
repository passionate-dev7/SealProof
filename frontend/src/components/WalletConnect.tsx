'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function WalletConnect() {
  const account = useCurrentAccount();

  return (
    <div className="flex items-center gap-4">
      {account ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
          <ConnectButton />
        </div>
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}
