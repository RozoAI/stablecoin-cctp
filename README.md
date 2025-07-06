# CCTP Cross-Chain Transfer Examples

This directory contains examples for performing CCTP (Cross-Chain Transfer Protocol) transfers between different chains.

## Supported Chains

- Base
- Ethereum
- Polygon
- Arbitrum
- Solana (coming soon)

## Prerequisites

1. Node.js installed (v16 or higher)
2. Environment variables configured (copy `.env.example` to `.env` and fill in your values)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
- Your private key
- RPC URLs (optional - defaults provided)
- Destination addresses

## Usage

### Command Line

You can use the transfer script directly from the command line:

```bash
tsx transfer.ts <fromChain> <toChain> <amount>
```

Parameters:
- `fromChain`: Source chain (base, ethereum, polygon, arbitrum)
- `toChain`: Destination chain (base, ethereum, polygon, arbitrum)
- `amount`: Amount in USDC base units (6 decimals)

Example:
```bash
# Transfer 1 USDC from Base to Polygon
tsx transfer.ts base polygon 100000
```

For solana:
```bash
# Solana to other chains
npm run bridge-v2 sol2base -- --amount 1000 --maxFee 100
npm run bridge-v2 sol2eth -- --amount 1000 --maxFee 100
npm run bridge-v2 sol2arb -- --amount 1000 --maxFee 100
npm run bridge-v2 sol2poly -- --amount 1000 --maxFee 100

# Other chains to Solana
npm run bridge-v2 base2sol -- --amount 1000 --maxFee 100
npm run bridge-v2 eth2sol -- --amount 1000 --maxFee 100
npm run bridge-v2 arb2sol -- --amount 1000 --maxFee 100
npm run bridge-v2 poly2sol -- --amount 1000 --maxFee 100
```

### Programmatic Usage

You can also import the transfer function in your code:

```javascript
import transfer from './transfer.js'

// Transfer 1 USDC from Base to Polygon
await transfer('base', 'polygon', '1000000')
```

## Supported Transfers

The script supports transfers between any combination of the following chains:
- Base ↔️ Ethereum
- Base ↔️ Polygon
- Base ↔️ Arbitrum
- Ethereum ↔️ Polygon
- Ethereum ↔️ Arbitrum
- Polygon ↔️ Arbitrum

Solana integration is planned for a future update.

## Important Notes

1. Amounts should be specified in USDC base units (6 decimals)
   - 1 USDC = 1000000 base units
   - 0.1 USDC = 100000 base units

2. The script uses Circle's CCTP V2 bridge by default

3. Make sure you have enough USDC on the source chain and native tokens on both chains for gas fees

4. The transfer process has multiple steps:
   - Approve USDC spending
   - Burn USDC on source chain
   - Wait for attestation
   - Mint USDC on destination chain

5. The entire process can take several minutes to complete

## Error Handling

The script includes comprehensive error handling and logging. If a transfer fails, check:
1. Your account has sufficient USDC balance
2. Your account has sufficient gas tokens on both chains
3. The RPC endpoints are responsive
4. The attestation service is available 
