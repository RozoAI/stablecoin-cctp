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

//! Events

use anchor_lang::prelude::*;

#[event]
pub struct OwnershipTransferStarted {
    pub previous_owner: Pubkey,
    pub new_owner: Pubkey,
}

#[event]
pub struct OwnershipTransferred {
    pub previous_owner: Pubkey,
    pub new_owner: Pubkey,
}

#[event]
pub struct DepositForBurn {
    pub burn_token: Pubkey,
    pub amount: u64,
    pub depositor: Pubkey,
    pub mint_recipient: Pubkey,
    pub destination_domain: u32,
    pub destination_token_messenger: Pubkey,
    pub destination_caller: Pubkey,
    pub max_fee: u64,
    pub min_finality_threshold: u32,
    pub hook_data: Vec<u8>,
}

#[event]
pub struct MintAndWithdraw {
    pub mint_recipient: Pubkey,
    pub amount: u64,
    pub mint_token: Pubkey,
    pub fee_collected: u64,
}

#[event]
pub struct RemoteTokenMessengerAdded {
    pub domain: u32,
    pub token_messenger: Pubkey,
}

#[event]
pub struct RemoteTokenMessengerRemoved {
    pub domain: u32,
    pub token_messenger: Pubkey,
}

#[event]
pub struct DenylisterChanged {
    pub old_denylister: Pubkey,
    pub new_denylister: Pubkey,
}

#[event]
pub struct Denylisted {
    pub account: Pubkey,
}

#[event]
pub struct UnDenylisted {
    pub account: Pubkey,
}

#[event]
pub struct FeeRecipientSet {
    pub new_fee_recipient: Pubkey,
}

#[event]
pub struct MinFeeControllerSet {
    pub new_min_fee_controller: Pubkey,
}

#[event]
pub struct MinFeeSet {
    pub new_min_fee: u32,
}
