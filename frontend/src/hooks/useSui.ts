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
   * @param contentHash - Hash of the content (as hex string)
   * @param packageId - Sui package ID for the smart contract
   * @param isEncrypted - Whether the content is encrypted
   * @param nautilusAttestation - Optional Nautilus attestation data
   * @param aiScore - AI verification score (0-100, defaults to 0 if not available)
   * @returns Transaction result
   */
  const registerContent = async (
    blobId: string,
    contentHash: string,
    packageId: string,
    isEncrypted: boolean,
    nautilusAttestation: Uint8Array | null = null,
    aiScore: number = 0
  ) => {
    if (!account) throw new Error('Wallet not connected');

    // Registry shared object ID from deployment
    const REGISTRY_ID = '0xaf077d541b6b72cc4c88ee12a3df856518537a39560f0400aae0d7d6afe0440b';

    // Convert hex hash to bytes
    const hashBytes = Array.from(
      contentHash.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Convert nautilus attestation to array or empty array if null
    const attestationBytes = nautilusAttestation
      ? Array.from(nautilusAttestation)
      : [];

    const tx = new Transaction();

    // Call the smart contract function to register content
    // Function signature: register_content(
    //   registry, content_hash, algorithm, walrus_blob_id,
    //   seal_encryption_key, is_encrypted, nautilus_attestation,
    //   ai_score, clock, ctx
    // )
    tx.moveCall({
      target: `${packageId}::provenance_registry::register_content`,
      arguments: [
        tx.object(REGISTRY_ID), // registry: &mut Registry
        tx.pure.vector('u8', hashBytes), // content_hash: vector<u8>
        tx.pure.vector('u8', Array.from(new TextEncoder().encode('SHA256'))), // algorithm: vector<u8>
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(blobId))), // walrus_blob_id: vector<u8>
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(''))), // seal_encryption_key: vector<u8> (empty for now)
        tx.pure.bool(isEncrypted), // is_encrypted: bool
        tx.pure.vector('u8', attestationBytes), // nautilus_attestation: vector<u8>
        tx.pure.u64(aiScore), // ai_score: u64
        tx.object('0x6'), // clock: &Clock (standard Sui clock object)
      ],
    });

    return await signAndExecute({
      transaction: tx as unknown as Parameters<typeof signAndExecute>[0]['transaction'],
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
      transaction: tx as unknown as Parameters<typeof signAndExecute>[0]['transaction'],
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
