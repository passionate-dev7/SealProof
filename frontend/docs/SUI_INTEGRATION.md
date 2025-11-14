# Sui Wallet Integration Guide

This document describes the Sui wallet integration setup for the TruthChain frontend.

## Overview

The project uses **two complementary approaches** for Sui wallet integration:

1. **@suiware/kit** - Higher-level abstraction (already integrated in `ClientProviders.tsx`)
2. **@mysten/dapp-kit** - Direct Mysten Labs integration (new files created)

Both approaches work together seamlessly, giving you flexibility in how you interact with Sui wallets.

## Installation

Dependencies are already installed:

```json
{
  "@mysten/dapp-kit": "^0.16.15",
  "@mysten/sui": "^1.36.0",
  "@mysten/wallet-standard": "^0.16.5",
  "@suiware/kit": "^0.10.0",
  "@tanstack/react-query": "^5.83.0"
}
```

## Architecture

### Provider Hierarchy

```
RootLayout (app/layout.tsx)
└── ClientProviders (app/providers/ClientProviders.tsx)
    ├── NextThemeProvider (next-themes)
    ├── ThemeProvider (custom theme provider)
    └── SuiProvider (@suiware/kit)
        └── Your App Components
```

### Alternative Direct Provider

For direct `@mysten/dapp-kit` integration:

```tsx
// src/providers/SuiProvider.tsx
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
```

## Network Configuration

### Existing Setup (via @suiware/kit)

Network configuration is managed in:
- `/src/app/config/network.ts` - Package IDs and explorer URLs
- `/src/app/hooks/useNetworkConfig.tsx` - Network configuration hook

Supports:
- Localnet (http://localhost:9000)
- Devnet
- Testnet
- Mainnet

### New Direct Setup

The new `SuiProvider.tsx` provides:

```typescript
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  localnet: { url: 'http://localhost:9000' },
};
```

## Components

### 1. Existing Wallet Connection (Header)

Location: `/src/app/components/layout/Header.tsx`

Already includes:
```tsx
import { ConnectButton } from '@mysten/dapp-kit';

<ConnectButton />
```

Features:
- Balance display
- Network type switcher
- Connect/disconnect wallet

### 2. New Standalone Wallet Component

Location: `/src/components/WalletConnect.tsx`

Usage:
```tsx
import { WalletConnect } from '@/components/WalletConnect';

<WalletConnect />
```

Shows:
- Truncated address when connected
- Connect button when disconnected

## Custom Hooks

### 1. useSui Hook

Location: `/src/hooks/useSui.ts`

Provides core Sui functionality:

```tsx
import { useSui } from '@/hooks/useSui';

const MyComponent = () => {
  const {
    account,
    isConnected,
    address,
    registerContent,
    verifyContent,
    queryContent
  } = useSui();

  // Register content on blockchain
  const handleRegister = async () => {
    const result = await registerContent(
      blobId,
      contentHash,
      packageId
    );
    console.log('Transaction:', result.digest);
  };

  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <p>Please connect wallet</p>
      )}
    </div>
  );
};
```

### 2. useWalrusUpload Hook

Location: `/src/hooks/useWalrusUpload.ts`

Complete upload workflow:

```tsx
import { useWalrusUpload } from '@/hooks/useWalrusUpload';

const UploadComponent = () => {
  const {
    uploadAndRegister,
    progress,
    result,
    isUploading,
    reset
  } = useWalrusUpload();

  const handleUpload = async (file: File) => {
    const uploadResult = await uploadAndRegister(
      file,
      'https://aggregator.walrus-testnet.walrus.space',
      packageId
    );

    console.log('Blob ID:', uploadResult.blobId);
    console.log('Transaction:', uploadResult.txDigest);
  };

  return (
    <div>
      <p>Status: {progress.stage}</p>
      {result && <p>Uploaded: {result.blobId}</p>}
    </div>
  );
};
```

## Complete Upload Component

Location: `/src/components/UploadToWalrus.tsx`

Full-featured upload component with UI:

```tsx
import { UploadToWalrus } from '@/components/UploadToWalrus';

<UploadToWalrus
  packageId="0x..."
  walrusAggregatorUrl="https://aggregator.walrus-testnet.walrus.space"
  onUploadComplete={(blobId, txDigest) => {
    console.log('Upload complete!', blobId, txDigest);
  }}
/>
```

Features:
- File selection
- Upload progress tracking
- Error handling
- Success feedback with blob ID and transaction digest
- Automatic wallet connection check

## Smart Contract Integration

### Move Contract Structure

Your Sui Move contract should have these functions:

```move
module truthchain::truthchain {
    public entry fun register_content(
        blob_id: String,
        content_hash: String,
        ctx: &mut TxContext
    ) {
        // Implementation
    }

    public fun verify_content(
        blob_id: String,
        ctx: &mut TxContext
    ): bool {
        // Implementation
    }

    public fun get_content(
        blob_id: String
    ): ContentMetadata {
        // Implementation
    }
}
```

### Package ID Configuration

Set in environment variables:

```bash
# .env.local
NEXT_PUBLIC_TESTNET_CONTRACT_PACKAGE_ID=0x...
NEXT_PUBLIC_MAINNET_CONTRACT_PACKAGE_ID=0x...
```

Import from config:
```typescript
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';
```

## Usage Examples

### Example 1: Basic Connection Check

```tsx
'use client';

import { useSui } from '@/hooks/useSui';

export default function MyPage() {
  const { isConnected, address } = useSui();

  return (
    <div>
      {isConnected ? (
        <p>Welcome {address}</p>
      ) : (
        <p>Please connect your wallet</p>
      )}
    </div>
  );
}
```

### Example 2: Upload and Register

```tsx
'use client';

import { UploadToWalrus } from '@/components/UploadToWalrus';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';

export default function UploadPage() {
  const handleComplete = (blobId: string, txDigest: string) => {
    console.log('Content registered!');
    console.log('Blob ID:', blobId);
    console.log('Transaction:', txDigest);

    // Navigate or show success message
  };

  return (
    <div className="container mx-auto p-8">
      <h1>Upload to TruthChain</h1>
      <UploadToWalrus
        packageId={TESTNET_CONTRACT_PACKAGE_ID}
        onUploadComplete={handleComplete}
      />
    </div>
  );
}
```

### Example 3: Manual Transaction

```tsx
'use client';

import { useSui } from '@/hooks/useSui';
import { TESTNET_CONTRACT_PACKAGE_ID } from '@/app/config/network';

export default function ManualTransaction() {
  const { registerContent, isConnected } = useSui();

  const handleRegister = async () => {
    if (!isConnected) return;

    try {
      const result = await registerContent(
        'blob_id_here',
        'content_hash_here',
        TESTNET_CONTRACT_PACKAGE_ID
      );

      console.log('Success:', result.digest);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <button onClick={handleRegister}>
      Register Content
    </button>
  );
}
```

## Walrus Integration

### Upload Flow

1. **Upload to Walrus**
   ```typescript
   const response = await fetch(`${walrusAggregatorUrl}/v1/store`, {
     method: 'PUT',
     body: file,
   });
   ```

2. **Extract Blob ID**
   ```typescript
   const blobId = data.newlyCreated?.blobObject?.blobId ||
                  data.alreadyCertified?.blobId;
   ```

3. **Register on Sui**
   ```typescript
   await registerContent(blobId, contentHash, packageId);
   ```

### Walrus Endpoints

- **Testnet**: `https://aggregator.walrus-testnet.walrus.space`
- **Mainnet**: `https://aggregator.walrus-mainnet.walrus.space` (when available)

## Styling

### Custom Wallet Button Styles

Already configured in `/src/app/styles/index.css`:

```css
.sds-connect-button-container {
  button {
    padding: 8px 16px !important;
    border-radius: 8px !important;
  }
  div {
    font-size: 16px !important;
    line-height: 24px !important;
    font-family: inherit !important;
  }
}
```

### Dapp Kit CSS

Imported in `ClientProviders.tsx`:
```tsx
import '@mysten/dapp-kit/dist/index.css';
```

## Testing Locally

1. **Start local Sui node** (if using localnet):
   ```bash
   sui start --with-faucet
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Connect wallet**:
   - Open http://localhost:3000
   - Click "Connect Wallet"
   - Select Sui Wallet (or compatible wallet)
   - Approve connection

4. **Test upload**:
   - Navigate to upload page
   - Select file
   - Upload to Walrus
   - Approve transaction
   - Verify registration on blockchain

## Troubleshooting

### Wallet Not Connecting

- Ensure Sui Wallet browser extension is installed
- Check network settings (testnet vs mainnet)
- Clear browser cache and reload

### Upload Fails

- Verify Walrus aggregator URL is correct
- Check file size limits
- Ensure wallet has sufficient SUI for gas

### Transaction Errors

- Verify package ID is correct
- Check Move contract function signatures match
- Ensure wallet is connected to correct network

## Best Practices

1. **Always check wallet connection** before operations
2. **Handle errors gracefully** with try/catch
3. **Show loading states** during uploads
4. **Verify transactions** after completion
5. **Use environment variables** for package IDs
6. **Test on testnet** before mainnet deployment

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [@mysten/dapp-kit Docs](https://sdk.mystenlabs.com/dapp-kit)
- [Walrus Documentation](https://docs.walrus.site/)
- [Sui TypeScript SDK](https://github.com/MystenLabs/sui/tree/main/sdk/typescript)

## Next Steps

1. Deploy your Move smart contract to testnet
2. Update `NEXT_PUBLIC_TESTNET_CONTRACT_PACKAGE_ID` in `.env.local`
3. Test upload workflow end-to-end
4. Add content verification features
5. Implement content querying/display
6. Deploy to production
