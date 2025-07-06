import { createPublicClient, http, formatUnits } from 'viem'
import { arbitrum, base, mainnet, polygon } from 'viem/chains'
import { CHAIN_CONFIG } from './constants.js'

const ADDRESS = '0xa85160a17bFF4B2924881bB4C1708177927643b7'

async function checkBalance(chain, chainConfig) {
  const client = createPublicClient({
    chain,
    transport: http()
  })

  try {
    const balance = await client.readContract({
      address: chainConfig.usdc,
      abi: [{
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }],
      functionName: 'balanceOf',
      args: [ADDRESS]
    })

    console.log(`\n${chainConfig.name}:`)
    console.log(`Raw balance: ${balance} base units`)
    console.log(`USDC Balance: ${formatUnits(balance, 6)} USDC`)
  } catch (error) {
    console.log(`\n${chainConfig.name}: Error checking balance -`, error.message)
  }
}

async function checkAllBalances() {
  console.log('Checking USDC balances for', ADDRESS)
  console.log('================================')
  
  await checkBalance(arbitrum, CHAIN_CONFIG.arbitrum)
  await checkBalance(base, CHAIN_CONFIG.base)
  await checkBalance(mainnet, CHAIN_CONFIG.ethereum)
  await checkBalance(polygon, CHAIN_CONFIG.polygon)
}

checkAllBalances().catch(console.error) 