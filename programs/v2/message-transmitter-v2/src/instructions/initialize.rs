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

//! Initialize instruction handler

use {
    crate::{
        error::MessageTransmitterError,
        events::{AttesterEnabled, AttesterManagerUpdated},
        program,
        state::MessageTransmitter,
        utils,
    },
    anchor_lang::prelude::*,
};

// Instruction accounts
#[event_cpi]
#[derive(Accounts)]
pub struct InitializeContext<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account()]
    pub upgrade_authority: Signer<'info>,

    // MessageTransmitter state account
    #[account(
        init,
        payer = payer,
        space = utils::DISCRIMINATOR_SIZE + MessageTransmitter::INIT_SPACE,
        seeds = [b"message_transmitter"],
        bump
    )]
    pub message_transmitter: Box<Account<'info, MessageTransmitter>>,

    // Ensure only upgrade_authority can call initialize
    #[account(constraint = message_transmitter_program_data.upgrade_authority_address == Some(upgrade_authority.key()))]
    pub message_transmitter_program_data: Account<'info, ProgramData>,

    pub message_transmitter_program: Program<'info, program::MessageTransmitterV2>,

    pub system_program: Program<'info, System>,
}

// Instruction parameters
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct InitializeParams {
    pub local_domain: u32,
    pub attester: Pubkey,
    pub max_message_body_size: u64,
    pub version: u32,
}

// Instruction handler
pub fn initialize(ctx: Context<InitializeContext>, params: &InitializeParams) -> Result<()> {
    // Validate message_transmitter_program_data
    if let Some(programdata_address) = ctx
        .accounts
        .message_transmitter_program
        .programdata_address()?
    {
        require_keys_eq!(
            programdata_address,
            ctx.accounts.message_transmitter_program_data.key(),
            ErrorCode::InvalidProgramExecutable
        );
    }

    // record message_transmitter state
    let authority = ctx.accounts.upgrade_authority.key();
    let message_transmitter = ctx.accounts.message_transmitter.as_mut();
    message_transmitter.owner = authority;
    message_transmitter.pending_owner = Pubkey::default();
    message_transmitter.attester_manager = authority;
    message_transmitter.pauser = authority;
    message_transmitter.paused = false;
    message_transmitter.local_domain = params.local_domain;
    message_transmitter.version = params.version;
    message_transmitter.signature_threshold = 1;
    message_transmitter.enabled_attesters.push(params.attester);
    message_transmitter.max_message_body_size = params.max_message_body_size;

    // validate the state
    require!(
        message_transmitter.validate(),
        MessageTransmitterError::InvalidMessageTransmitterState
    );

    emit_cpi!(AttesterEnabled {
        attester: params.attester
    });

    emit_cpi!(AttesterManagerUpdated {
        previous_attester_manager: Pubkey::default(),
        new_attester_manager: authority
    });

    Ok(())
}
