export interface ChainConfig {
  name: string;
  domain: number;
  usdc: string;
  tokenMessenger?: string;
  messageTransmitter?: string;
  rpcUrl: string;
}

export interface ChainConfigs {
  [key: string]: ChainConfig;
}

export const CHAIN_CONFIG: ChainConfigs = {
  base: {
    name: 'Base',
    domain: Number(process.env.BASE_DOMAIN) || 6,
    usdc: process.env.BASE_USDC || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tokenMessenger: process.env.BASE_TOKEN_MESSENGER || '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: process.env.BASE_MESSAGE_TRANSMITTER || '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  },
  ethereum: {
    name: 'Ethereum',
    domain: Number(process.env.ETH_DOMAIN) || 0,
    usdc: process.env.ETH_USDC || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    tokenMessenger: process.env.ETH_TOKEN_MESSENGER || '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: process.env.ETH_MESSAGE_TRANSMITTER || '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    rpcUrl: process.env.ETH_RPC_URL || 'https://rpc.payload.de'
  },
  polygon: {
    name: 'Polygon',
    domain: Number(process.env.POLYGON_DOMAIN) || 7,
    usdc: process.env.POLYGON_USDC || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    tokenMessenger: process.env.POLYGON_TOKEN_MESSENGER || '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: process.env.POLYGON_MESSAGE_TRANSMITTER || '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
  },
  arbitrum: {
    name: 'Arbitrum',
    domain: Number(process.env.ARBITRUM_DOMAIN) || 3,
    usdc: process.env.ARBITRUM_USDC || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenMessenger: process.env.ARBITRUM_TOKEN_MESSENGER || '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: process.env.ARBITRUM_MESSAGE_TRANSMITTER || '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
  },
  solana: {
    name: 'Solana',
    domain: Number(process.env.SOLANA_DOMAIN) || 5,
    usdc: process.env.SOLANA_USDC_ADDRESS || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  }
};

export const BRIDGE_TYPES = {
  CCTP_V2: 'CCTP_V2'
} as const;

export type BridgeType = typeof BRIDGE_TYPES[keyof typeof BRIDGE_TYPES];

// Common constants
export const DEFAULT_MAX_FEE = BigInt(process.env.DEFAULT_MAX_FEE || 500); // 0.0005 USDC
export const DEFAULT_MIN_FINALITY_THRESHOLD = Number(process.env.DEFAULT_MIN_FINALITY_THRESHOLD || 1000); // For fast transfers
export const ATTESTATION_API = process.env.IRIS_API_URL || 'https://iris-api.circle.com'; 