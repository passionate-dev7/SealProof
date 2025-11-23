/**
 * Network configuration for SealProof
 */

// Sui network configuration
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

// Contract package variable names
export const CONTRACT_PACKAGE_VARIABLE_NAME = 'packageId';
export const EXPLORER_URL_VARIABLE_NAME = 'explorerUrl';
export const CONTRACT_PACKAGE_ID_NOT_DEFINED = '0x0';

// Smart contract package IDs for different networks
export const TESTNET_CONTRACT_PACKAGE_ID =
  process.env.NEXT_PUBLIC_TESTNET_CONTRACT_PACKAGE_ID ||
  '0xe9569b0c341e413a2a24742c797a40bf1445dd3775e025280c884060bc080146';

export const MAINNET_CONTRACT_PACKAGE_ID =
  process.env.NEXT_PUBLIC_MAINNET_CONTRACT_PACKAGE_ID || CONTRACT_PACKAGE_ID_NOT_DEFINED;

export const DEVNET_CONTRACT_PACKAGE_ID =
  process.env.NEXT_PUBLIC_DEVNET_CONTRACT_PACKAGE_ID || CONTRACT_PACKAGE_ID_NOT_DEFINED;

export const LOCALNET_CONTRACT_PACKAGE_ID =
  process.env.NEXT_PUBLIC_LOCALNET_CONTRACT_PACKAGE_ID || CONTRACT_PACKAGE_ID_NOT_DEFINED;

// Explorer URLs for different networks
export const TESTNET_EXPLORER_URL = 'https://testnet.suivision.xyz';
export const MAINNET_EXPLORER_URL = 'https://suivision.xyz';
export const DEVNET_EXPLORER_URL = 'https://devnet.suivision.xyz';
export const LOCALNET_EXPLORER_URL = 'http://localhost:9001';

// Walrus configuration
export const WALRUS_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space';

export const WALRUS_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space';

// Network endpoints
export const NETWORK_CONFIG = {
  testnet: {
    name: 'Sui Testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    faucetUrl: 'https://faucet.testnet.sui.io/gas',
    explorer: 'https://testnet.suivision.xyz',
  },
  mainnet: {
    name: 'Sui Mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    explorer: 'https://suivision.xyz',
  },
} as const;

export const getCurrentNetwork = () => {
  return NETWORK_CONFIG[SUI_NETWORK as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG.testnet;
};

// Feature flags
export const FEATURES = {
  // Enable blockchain registration (requires deployed contracts)
  BLOCKCHAIN_REGISTRATION: !!TESTNET_CONTRACT_PACKAGE_ID,

  // Enable Seal encryption (requires Seal setup)
  SEAL_ENCRYPTION: false,

  // Enable AI detection
  AI_DETECTION: false,
};
