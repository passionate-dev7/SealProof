'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

export function useSui() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  /**
   * Register content on Walrus with Sui smart contract
   * @param blobId - The Walrus blob ID
   * @param contentHash - Hash of the content
   * @param packageId - Sui package ID for the smart contract
   * @returns Transaction result
   */
  const registerContent = async (
    blobId: string,
    contentHash: string,
    packageId: string
  ) => {
    if (!account) throw new Error('Wallet not connected');

    const tx = new Transaction();

    // Call the smart contract function to register content
    // Adjust module and function names based on your Move contract
    tx.moveCall({
      target: `${packageId}::truthchain::register_content`,
      arguments: [
        tx.pure.string(blobId),
        tx.pure.string(contentHash),
      ],
    });

    return await signAndExecute({
      transaction: tx,
    });
  };

  /**
   * Verify content on the blockchain
   * @param blobId - The Walrus blob ID to verify
   * @param packageId - Sui package ID
   * @returns Transaction result
   */
  const verifyContent = async (
    blobId: string,
    packageId: string
  ) => {
    if (!account) throw new Error('Wallet not connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::truthchain::verify_content`,
      arguments: [
        tx.pure.string(blobId),
      ],
    });

    return await signAndExecute({
      transaction: tx,
    });
  };

  /**
   * Query content metadata from the blockchain
   * @param client - SuiClient instance
   * @param packageId - Sui package ID
   * @param blobId - The Walrus blob ID
   * @returns Content metadata object
   */
  const queryContent = async (
    client: SuiClient,
    packageId: string,
    blobId: string
  ) => {
    // Query the blockchain for content metadata
    // This is a placeholder - adjust based on your contract structure
    const result = await client.devInspectTransactionBlock({
      transactionBlock: (() => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::truthchain::get_content`,
          arguments: [tx.pure.string(blobId)],
        });
        return tx;
      })(),
      sender: account?.address || '0x0',
    });

    return result;
  };

  return {
    account,
    isConnected: !!account,
    address: account?.address,
    registerContent,
    verifyContent,
    queryContent,
  };
}
