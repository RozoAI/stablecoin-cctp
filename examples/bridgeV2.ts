/*
 * Copyright (c) 2025, Circle Internet Financial LTD All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { minimist } from "zx";
import {
  depositForBurnSol,
  depositForBurnSolWithHook,
  receiveMessageSol,
  reclaimEventAccount,
} from "./v2/solana";
import {
  depositForBurnEvm,
  depositForBurnEvmWithHook,
  receiveMessageEvm,
} from "./v2/evm";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { CHAIN_CONFIG, DEFAULT_MAX_FEE, DEFAULT_MIN_FINALITY_THRESHOLD } from "./constants";
import { ethers } from "ethers";

export const IRIS_API_URL =
  process.env.IRIS_API_URL ?? "https://iris-api.circle.com";

enum CommandName {
  Sol2Base = "sol2base",
  Sol2Eth = "sol2eth",
  Sol2Arb = "sol2arb",
  Sol2Poly = "sol2poly",
  Base2Sol = "base2sol",
  Eth2Sol = "eth2sol",
  Arb2Sol = "arb2sol",
  Poly2Sol = "poly2sol",
  ReclaimEventAccount = "reclaim",
}

interface ParsedArgs {
  amount: number;
  maxFee: number;
  minFinalityThreshold: number;
  hookData: string;
  attestation: string;
  destinationMessage: string;
  messageSentEventAccount: string;
  destinationChain?: string; // For sol2evm transfers
}

interface IrisMessage {
  message: string;
  eventNonce: string;
  attestation: string;
  decodedMessage: {
    sourceDomain: string;
    destinationDomain: string;
    nonce: string;
    sender: string;
    recipient: string;
    messageBody: string;
  };
  status: string;
}

interface IrisResponse {
  messages: IrisMessage[];
}

const getChainConfig = (command: CommandName) => {
  switch (command) {
    case CommandName.Base2Sol:
      return CHAIN_CONFIG.base;
    case CommandName.Eth2Sol:
      return CHAIN_CONFIG.ethereum;
    case CommandName.Arb2Sol:
      return CHAIN_CONFIG.arbitrum;
    case CommandName.Poly2Sol:
      return CHAIN_CONFIG.polygon;
    case CommandName.Sol2Base:
    case CommandName.Sol2Eth:
    case CommandName.Sol2Arb:
    case CommandName.Sol2Poly:
      return null; // Handle in the main function
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
};

const main = async () => {
  const commandName: CommandName = process.argv.slice(2)[0] as CommandName;

  const rawArgs = minimist(process.argv.slice(3), {
    string: ["amount", "maxFee", "minFinalityThreshold", "hookData", "attestation", "destinationMessage", "messageSentEventAccount", "destinationChain"],
    default: {
      maxFee: DEFAULT_MAX_FEE.toString(),
      minFinalityThreshold: DEFAULT_MIN_FINALITY_THRESHOLD.toString(),
    },
  });

  const args: ParsedArgs = {
    amount: Number(rawArgs.amount),
    maxFee: Number(rawArgs.maxFee),
    minFinalityThreshold: Number(rawArgs.minFinalityThreshold),
    hookData: rawArgs.hookData,
    attestation: rawArgs.attestation,
    destinationMessage: rawArgs.destinationMessage,
    messageSentEventAccount: rawArgs.messageSentEventAccount,
    destinationChain: rawArgs.destinationChain,
  };

  if (commandName === CommandName.ReclaimEventAccount) {
    const reclaimTxHash = await reclaimEventAccount(
      Buffer.from(args.attestation.replace("0x", ""), "hex"),
      Buffer.from(args.destinationMessage.replace("0x", ""), "hex"),
      new PublicKey(args.messageSentEventAccount)
    );
    console.log("ReclaimEventAccount txHash:", reclaimTxHash);
    return;
  }

  // Handle Solana to EVM transfer
  if (commandName === CommandName.Sol2Base || 
      commandName === CommandName.Sol2Eth || 
      commandName === CommandName.Sol2Arb || 
      commandName === CommandName.Sol2Poly) {
    
    let destChain;
    switch(commandName) {
      case CommandName.Sol2Base:
        destChain = CHAIN_CONFIG.base;
        break;
      case CommandName.Sol2Eth:
        destChain = CHAIN_CONFIG.ethereum;
        break;
      case CommandName.Sol2Arb:
        destChain = CHAIN_CONFIG.arbitrum;
        break;
      case CommandName.Sol2Poly:
        destChain = CHAIN_CONFIG.polygon;
        break;
    }

    // Set environment variables based on destination chain
    process.env.REMOTE_EVM_DOMAIN = destChain.domain.toString();
    process.env.REMOTE_TOKEN_HEX = destChain.usdc;
    process.env.REMOTE_EVM_TOKEN_MESSENGER_ADDRESS = destChain.tokenMessenger;
    process.env.REMOTE_EVM_MESSAGE_TRANSMITTER_ADDRESS = destChain.messageTransmitter;
    process.env.REMOTE_EVM_RPC_URL = destChain.rpcUrl;

    // Use the EVM wallet address as the destinationCaller
    const evmWallet = new ethers.Wallet(
      process.env.REMOTE_EVM_PRIVATE_KEY,
      new ethers.JsonRpcProvider(destChain.rpcUrl)
    );
    
    const txHash = await depositForBurnSol(
      new BN(args.amount),
      new BN(args.maxFee),
      args.minFinalityThreshold || DEFAULT_MIN_FINALITY_THRESHOLD,
      evmWallet.address // Pass the EVM wallet address as destinationCaller
    );

    console.log("DepositForBurn txHash:", txHash);
    const { message, attestation } = await fetchAttestation(txHash, destChain.domain, commandName);
    const receiveTxHash = await receiveMessageEvm(
      message,
      attestation
    );
    console.log("ReceiveMessage txHash:", receiveTxHash);
    return;
  }

  // Handle EVM to Solana transfer
  const sourceChain = getChainConfig(commandName);
  if (!sourceChain) {
    console.error(
      "Command must be one of: ",
      Object.values(CommandName).join(", ")
    );
    process.exit(1);
  }

  console.log(`Initiating transfer from ${sourceChain.name} to Solana...`);
  console.log(`Source chain details:`, {
    name: sourceChain.name,
    domain: sourceChain.domain,
    usdc: sourceChain.usdc,
    tokenMessenger: sourceChain.tokenMessenger,
  });

  // Set environment variables based on source chain
  process.env.REMOTE_EVM_DOMAIN = sourceChain.domain.toString();
  process.env.REMOTE_TOKEN_HEX = sourceChain.usdc;
  process.env.REMOTE_EVM_TOKEN_MESSENGER_ADDRESS = sourceChain.tokenMessenger;
  process.env.REMOTE_EVM_MESSAGE_TRANSMITTER_ADDRESS = sourceChain.messageTransmitter;
  process.env.REMOTE_EVM_RPC_URL = sourceChain.rpcUrl;
  process.env.REMOTE_EVM_ADDRESS = sourceChain.usdc;

  const depositTxHash = args.hookData
    ? await depositForBurnEvmWithHook(
        args.amount,
        args.maxFee,
        args.minFinalityThreshold,
        args.hookData
      )
    : await depositForBurnEvm(
        args.amount,
        args.maxFee,
        args.minFinalityThreshold
      );
  console.log("DepositForBurn txHash:", depositTxHash);
  const { message, attestation } = await fetchAttestation(depositTxHash, sourceChain.domain, commandName);
  const receiveTxHash = await receiveMessageSol(
    message,
    attestation
  );
  console.log("ReceiveMessage txHash:", receiveTxHash);
};

const fetchAttestation = async (txHash: string, domainId: number, commandName: CommandName) => {
  console.log(`Fetching attestation for transaction ${txHash} on domain ${domainId}...`);
  
  // Always use domain 5 for sol2* commands
  const useDomainId = commandName.toString().startsWith('sol2') ? 5 : domainId;
  
  const maxAttempts = 60; // 2 minutes total with 2s delay
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    const url = `${IRIS_API_URL}/v2/messages/${useDomainId}?transactionHash=${txHash}`;
    console.log("Fetching from:", url);
    
    try {
      const response = await fetch(url);
      const data = await response.json() as IrisResponse;
      console.log(`Attempt ${attempt}/${maxAttempts}:`, JSON.stringify(data, null, 2));

      if (data.messages && data.messages[0]) {
        const message = data.messages[0];
        
        if (message.status === "complete" && message.attestation !== "PENDING") {
          console.log("Attestation received successfully!");
          console.log("Message details:", {
            sourceDomain: message.decodedMessage.sourceDomain,
            destinationDomain: message.decodedMessage.destinationDomain,
            status: message.status,
            nonce: message.decodedMessage.nonce
          });
          return {
            message: message.message,
            attestation: message.attestation
          };
        }
        
        console.log(`Attestation pending (attempt ${attempt}/${maxAttempts}), status: ${message.status}`);
      }
    } catch (error) {
      console.error(`Error fetching attestation (attempt ${attempt}/${maxAttempts}):`, error);
    }

    attempt++;
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }

  throw new Error(`Failed to get attestation after ${maxAttempts} attempts`);
};

main();