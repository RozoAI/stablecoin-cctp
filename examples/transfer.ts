import 'dotenv/config';
import { createWalletClient, http, encodeFunctionData, WalletClient, Hash } from 'viem';
import { type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, polygon, mainnet, arbitrum } from 'viem/chains';
import axios from 'axios';
import { CHAIN_CONFIG, ChainConfig, BRIDGE_TYPES, BridgeType, DEFAULT_MAX_FEE, DEFAULT_MIN_FINALITY_THRESHOLD, ATTESTATION_API } from './constants.js';

console.log('Script started...');
console.log('Checking environment...');

// Debug: Log chain config
console.log('Chain Config:', CHAIN_CONFIG);
console.log('Bridge Types:', BRIDGE_TYPES);

interface AttestationMessage {
  message: string;
  attestation: string;
  status: string;
}

// Authentication
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env file');
  process.exit(1);
}
console.log('✅ Found PRIVATE_KEY');

// Destination address
const DESTINATION_ADDRESS = process.env.DESTINATION_ADDRESS || '0xa85160a17bFF4B2924881bB4C1708177927643b7';
console.log('✅ Using destination address:', DESTINATION_ADDRESS);

let account: Account;
try {
  account = privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`);
  console.log('✅ Account created:', account.address);
} catch (error) {
  console.error('❌ Error creating account:', (error as Error).message);
  process.exit(1);
}

// Chain mapping for viem
const CHAIN_MAPPING = {
  base,
  polygon,
  ethereum: mainnet,
  arbitrum
};

// Debug: Log chain mapping
console.log('Chain Mapping:', Object.keys(CHAIN_MAPPING));

// Helper function to format address to bytes32
const addressToBytes32 = (address: string): `0x${string}` => `0x000000000000000000000000${address.slice(2)}` as `0x${string}`;

async function approveUSDC(client: WalletClient, sourceConfig: ChainConfig, amount: bigint): Promise<Hash> {
  console.log(`Approving USDC transfer on ${sourceConfig.name}...`);
  
  try {
    const approveTx = await client.sendTransaction({
      account,
      chain: null,
      to: sourceConfig.usdc as `0x${string}`,
      data: encodeFunctionData({
        abi: [{
          type: 'function',
          name: 'approve',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        }],
        functionName: 'approve',
        args: [sourceConfig.tokenMessenger! as `0x${string}`, 10_000_000_000n],
      }),
    });
    console.log(`✅ USDC Approval Tx on ${sourceConfig.name}: ${approveTx}`);
    return approveTx;
  } catch (error) {
    console.error(`❌ Error approving USDC on ${sourceConfig.name}:`, (error as Error).message);
    throw error;
  }
}

async function burnUSDC(client: WalletClient, sourceConfig: ChainConfig, destConfig: ChainConfig, amount: bigint, destinationAddress: string): Promise<Hash> {
  console.log(`Burning USDC on ${sourceConfig.name}...`);
  
  try {
    const burnTx = await client.sendTransaction({
      account,
      chain: null,
      to: sourceConfig.tokenMessenger! as `0x${string}`,
      data: encodeFunctionData({
        abi: [{
          type: 'function',
          name: 'depositForBurn',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'mintRecipient', type: 'bytes32' },
            { name: 'burnToken', type: 'address' },
            { name: 'destinationCaller', type: 'bytes32' },
            { name: 'maxFee', type: 'uint256' },
            { name: 'minFinalityThreshold', type: 'uint32' },
          ],
          outputs: [],
        }],
        functionName: 'depositForBurn',
        args: [
          amount,
          destConfig.domain,
          addressToBytes32(destinationAddress),
          sourceConfig.usdc as `0x${string}`,
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          DEFAULT_MAX_FEE,
          DEFAULT_MIN_FINALITY_THRESHOLD,
        ],
      }),
    });
    console.log(`Burn Tx on ${sourceConfig.name}: ${burnTx}`);
    return burnTx;
  } catch (error) {
    console.error(`❌ Error burning USDC on ${sourceConfig.name}:`, (error as Error).message);
    throw error;
  }
}

async function retrieveAttestation(sourceDomain: number, transactionHash: string): Promise<AttestationMessage> {
  console.log('Retrieving attestation...');
  
  const url = `${ATTESTATION_API}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;
  console.log('Attestation URL:', url);
  
  while (true) {
    try {
      const response = await axios.get(url);
      
      if (response.status === 404) {
        console.log('Waiting for attestation...');
      } else if (response.data?.messages?.[0]?.status === 'complete') {
        console.log('Attestation retrieved successfully!');
        return response.data.messages[0];
      } else {
        console.log('Waiting for attestation...');
      }
      
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      if ((error as any).response?.status === 404) {
        console.log('Waiting for attestation...');
      } else {
        console.error('Error fetching attestation:', (error as Error).message);
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

async function mintUSDC(client: WalletClient, destConfig: ChainConfig, attestation: AttestationMessage): Promise<Hash> {
  console.log(`Minting USDC on ${destConfig.name}...`);
  
  try {
    const mintTx = await client.sendTransaction({
      account,
      chain: null,
      to: destConfig.messageTransmitter! as `0x${string}`,
      data: encodeFunctionData({
        abi: [{
          type: 'function',
          name: 'receiveMessage',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'message', type: 'bytes' },
            { name: 'attestation', type: 'bytes' },
          ],
          outputs: [],
        }],
        functionName: 'receiveMessage',
        args: [attestation.message as `0x${string}`, attestation.attestation as `0x${string}`],
      }),
      gas: 300000n,
    });
    console.log(`Mint Tx on ${destConfig.name}: ${mintTx}`);
    return mintTx;
  } catch (error) {
    console.error(`Error minting USDC on ${destConfig.name}:`, error);
    throw error;
  }
}

async function transfer(fromChain: string, toChain: string, amount: string, bridgeType: BridgeType = BRIDGE_TYPES.CCTP_V2): Promise<void> {
  console.log('\n=== CCTP Transfer Started ===');
  console.log('Configuration:');
  console.log(`• From Chain: ${fromChain}`);
  console.log(`• To Chain: ${toChain}`);
  console.log(`• Amount: ${amount} USDC base units (${Number(amount) / 1_000_000} USDC)`);
  console.log(`• Bridge Type: ${bridgeType}`);
  console.log(`• Destination Address: ${DESTINATION_ADDRESS}`);
  console.log('=========================\n');

  // Validate chains
  if (!CHAIN_CONFIG[fromChain]) {
    console.error(`❌ Invalid source chain: ${fromChain}`);
    console.error('Supported chains: base, ethereum, polygon, arbitrum, solana');
    process.exit(1);
  }

  if (!CHAIN_CONFIG[toChain]) {
    console.error(`❌ Invalid destination chain: ${toChain}`);
    console.error('Supported chains: base, ethereum, polygon, arbitrum, solana');
    process.exit(1);
  }

  // Validate bridge type
  if (bridgeType !== BRIDGE_TYPES.CCTP_V2) {
    console.error('❌ Invalid bridge type. Only CCTP_V2 is supported currently');
    process.exit(1);
  }

  // Check if Solana is involved
  if (fromChain === 'solana' || toChain === 'solana') {
    console.error('❌ Solana transfers are not implemented in this version');
    process.exit(1);
  }

  const sourceConfig = CHAIN_CONFIG[fromChain];
  const destConfig = CHAIN_CONFIG[toChain];
  const amountBigInt = BigInt(amount);

  console.log('🔍 Checking configuration...');
  console.log(`• Source Chain: ${sourceConfig.name} (Domain: ${sourceConfig.domain})`);
  console.log(`• Destination Chain: ${destConfig.name} (Domain: ${destConfig.domain})`);
  console.log(`• From Address: ${account.address}`);
  console.log(`• To Address: ${DESTINATION_ADDRESS}`);
  console.log(`• USDC Contract on ${sourceConfig.name}: ${sourceConfig.usdc}`);
  console.log(`• Token Messenger on ${sourceConfig.name}: ${sourceConfig.tokenMessenger}\n`);

  // Create wallet clients
  console.log('🔌 Setting up network connections...');
  let sourceClient: WalletClient, destClient: WalletClient;
  
  try {
    console.log('sourceConfig.CHAIN_MAPPING', CHAIN_MAPPING[fromChain as keyof typeof CHAIN_MAPPING]);
    sourceClient = createWalletClient({
      chain: CHAIN_MAPPING[fromChain as keyof typeof CHAIN_MAPPING],
      transport: http(),
      account,
    });
    console.log(`✅ Connected to ${sourceConfig.name}`);

    destClient = createWalletClient({
      chain: CHAIN_MAPPING[toChain as keyof typeof CHAIN_MAPPING],
      transport: http(),
      account,
    });
    console.log(`✅ Connected to ${destConfig.name}\n`);
  } catch (error) {
    console.error('❌ Error setting up network connections:', (error as Error).message);
    process.exit(1);
  }

  try {
    // Step 1: Approve USDC
    console.log('🔄 Step 1/4: Approving USDC transfer...');
    const approveTx = await approveUSDC(sourceClient, sourceConfig, amountBigInt);
    console.log(`✅ Approval transaction hash: ${approveTx}\n`);
    
    // Wait for approval confirmation
    console.log('⏳ Waiting for approval confirmation (30 seconds)...');
    await new Promise((resolve) => setTimeout(resolve, 30000));
    console.log('✅ Approval confirmed\n');
    
    // Step 2: Burn USDC
    console.log('🔄 Step 2/4: Burning USDC...');
    const burnTx = await burnUSDC(sourceClient, sourceConfig, destConfig, amountBigInt, DESTINATION_ADDRESS);
    console.log(`✅ Burn transaction hash: ${burnTx}\n`);
    
    // Step 3: Retrieve attestation
    console.log('🔄 Step 3/4: Waiting for attestation...');
    const attestation = await retrieveAttestation(sourceConfig.domain, burnTx);
    console.log('✅ Attestation received\n');
    
    // Step 4: Mint USDC
    console.log('🔄 Step 4/4: Minting USDC...');
    const mintTx = await mintUSDC(destClient, destConfig, attestation);
    console.log(`✅ Mint transaction hash: ${mintTx}\n`);
    
    console.log('=== Transfer Summary ===');
    console.log(`✅ Successfully transferred ${Number(amount) / 1_000_000} USDC`);
    console.log(`• From: ${sourceConfig.name} (${account.address})`);
    console.log(`• To: ${destConfig.name} (${DESTINATION_ADDRESS})`);
    console.log(`• Transactions:`);
    console.log(`  - Approve: ${approveTx}`);
    console.log(`  - Burn: ${burnTx}`);
    console.log(`  - Mint: ${mintTx}`);
    console.log('====================\n');
  } catch (error) {
    console.error('\n❌ Transfer failed:');
    console.error((error as Error).message);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('1. Check your USDC balance on the source chain');
    console.error('2. Check your gas token balance on both chains');
    console.error('3. Verify your private key and RPC endpoints');
    console.error('4. Make sure the attestation service is available');
    process.exit(1);
  }
}

// If running directly from command line
if (process.argv[1].endsWith('transfer.ts')) {
  console.log('Command line arguments:', process.argv.slice(2));
  const [fromChain, toChain, amount] = process.argv.slice(2);
  
  if (!fromChain || !toChain || !amount) {
    console.log('Usage: ts-node transfer.ts <fromChain> <toChain> <amount>');
    console.log('Supported chains: base, ethereum, polygon, arbitrum');
    console.log('Example: ts-node transfer.ts base polygon 100000  # Transfer 0.1 USDC');
    process.exit(1);
  }

  console.log('Starting transfer with parameters:');
  console.log('- From Chain:', fromChain);
  console.log('- To Chain:', toChain);
  console.log('- Amount:', amount);
  
  transfer(fromChain, toChain, amount)
    .then(() => {
      console.log('Transfer completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Unhandled error:', (error as Error).message);
      process.exit(1);
    });
} else {
  console.log('Module imported, not running directly');
}

export default transfer; 