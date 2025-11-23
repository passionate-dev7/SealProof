import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useSuiWallet = () => {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isExecuting, setIsExecuting] = useState(false);

  const executeTransaction = useCallback(
    async (transaction: Transaction) => {
      if (!currentAccount) {
        toast.error('Please connect your wallet first');
        throw new Error('Wallet not connected');
      }

      setIsExecuting(true);
      try {
        const result = await signAndExecuteTransaction({
          transaction: transaction as unknown as Parameters<typeof signAndExecuteTransaction>[0]['transaction'],
          chain: 'sui:testnet',
        });

        // Wait for transaction to be confirmed
        await suiClient.waitForTransaction({
          digest: result.digest,
        });

        toast.success('Transaction successful!');
        return result;
      } catch (error) {
        console.error('Transaction failed:', error);
        toast.error('Transaction failed. Please try again.');
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [currentAccount, signAndExecuteTransaction, suiClient]
  );

  const getBalance = useCallback(async () => {
    if (!currentAccount) return null;

    try {
      const balance = await suiClient.getBalance({
        owner: currentAccount.address,
      });
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }, [currentAccount, suiClient]);

  const getOwnedObjects = useCallback(async () => {
    if (!currentAccount) return [];

    try {
      const objects = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
      });
      return objects.data;
    } catch (error) {
      console.error('Failed to get owned objects:', error);
      return [];
    }
  }, [currentAccount, suiClient]);

  return {
    account: currentAccount,
    address: currentAccount?.address,
    isConnected: !!currentAccount,
    isExecuting,
    executeTransaction,
    getBalance,
    getOwnedObjects,
  };
};
