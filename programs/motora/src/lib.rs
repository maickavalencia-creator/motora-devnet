//! MOTORA — verifiable motorcycle maintenance histories and linked warranties.
//!
//! Design notes
//! ------------
//! * The physical vehicle identifier (VIN) is NEVER stored on-chain. Only a
//!   32-byte SHA-256 digest supplied by the client is kept. That digest is also
//!   part of the Motorcycle PDA seed, which makes registration of the same
//!   physical bike globally unique (two owners cannot register the same VIN).
//! * Every state transition is constrained by PDA seeds, signer checks and
//!   explicit ownership checks. No rule is delegated to the frontend.
//! * Counters kept on Motorcycle / ServiceRecord make the business guards
//!   (pending services, open claims) explicit and cheap to validate.

use anchor_lang::prelude::*;

declare_id!("EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU");

/// Maximum accepted odometer reading (10 million km / mi).
pub const MAX_MILEAGE: u64 = 10_000_000;
/// Warranty window measured from the moment a service is finalized (90 days).
pub const WARRANTY_WINDOW_SECONDS: i64 = 90 * 24 * 60 * 60;

pub const MAX_BRAND_LEN: usize = 48;
pub const MAX_MODEL_LEN: usize = 48;
pub const MAX_WORKSHOP_NAME_LEN: usize = 64;
pub const MAX_SERVICE_TYPE_LEN: usize = 64;
pub const MAX_DESCRIPTION_LEN: usize = 256;
pub const MAX_CLAIM_DESCRIPTION_LEN: usize = 512;
pub const MAX_RESOLUTION_LEN: usize = 256;

/// Instruction arguments are not covered by the account-level `#[max_len]`
/// attribute, so string bounds are enforced explicitly (and identically) here.
fn require_len(value: &str, max: usize) -> Result<()> {
    require!(value.len() <= max, ErrorCode::InvalidStringLength);
    Ok(())
}

#[program]
pub mod motora {
    use super::*;

    /// Creates the singleton protocol account. Idempotency is provided by the
    /// `init` constraint: a second call fails with AccountAlreadyInUse.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.authority = ctx.accounts.authority.key();
        protocol.total_motorcycles = 0;
        protocol.active_motorcycles = 0;
        protocol.total_workshops = 0;
        protocol.total_service_records = 0;
        protocol.total_warranty_claims = 0;
        protocol.bump = ctx.bumps.protocol;

        emit!(ProtocolInitialized {
            authority: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    /// Registers a motorcycle. `identifier_hash` is a SHA-256 digest of the
    /// normalized VIN plus a client-side salt; the VIN itself never goes on-chain.
    pub fn register_motorcycle(
        ctx: Context<RegisterMotorcycle>,
        identifier_hash: [u8; 32],
        brand: String,
        model: String,
        year: u16,
        initial_mileage: u64,
    ) -> Result<()> {
        require!(!brand.trim().is_empty() && !model.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&brand, MAX_BRAND_LEN)?;
        require_len(&model, MAX_MODEL_LEN)?;
        require!(initial_mileage <= MAX_MILEAGE, ErrorCode::InvalidMileage);

        let now = Clock::get()?.unix_timestamp;
        let current_year = (1970i64 + now / 31_536_000) as u16;
        require!(
            (1900..=current_year.saturating_add(1)).contains(&year),
            ErrorCode::InvalidYear
        );

        let motorcycle = &mut ctx.accounts.motorcycle;
        motorcycle.owner = ctx.accounts.owner.key();
        motorcycle.identifier_hash = identifier_hash;
        motorcycle.brand = brand;
        motorcycle.model = model;
        motorcycle.year = year;
        motorcycle.current_mileage = initial_mileage;
        motorcycle.active = true;
        motorcycle.created_at = now;
        motorcycle.service_count = 0;
        motorcycle.pending_services = 0;
        motorcycle.open_claims = 0;
        motorcycle.bump = ctx.bumps.motorcycle;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_motorcycles = protocol
            .total_motorcycles
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        protocol.active_motorcycles = protocol
            .active_motorcycles
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(MotorcycleRegistered {
            motorcycle: motorcycle.key(),
            owner: motorcycle.owner,
            identifier_hash,
            timestamp: now,
        });
        Ok(())
    }

    /// Updates mutable descriptive data and the odometer. Mileage may never
    /// decrease, and may only be changed by the recorded owner.
    pub fn update_motorcycle(
        ctx: Context<UpdateMotorcycle>,
        brand: String,
        model: String,
        new_mileage: u64,
    ) -> Result<()> {
        require!(!brand.trim().is_empty() && !model.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&brand, MAX_BRAND_LEN)?;
        require_len(&model, MAX_MODEL_LEN)?;
        require!(new_mileage <= MAX_MILEAGE, ErrorCode::InvalidMileage);
        require!(
            new_mileage >= ctx.accounts.motorcycle.current_mileage,
            ErrorCode::InvalidMileage
        );

        let motorcycle = &mut ctx.accounts.motorcycle;
        motorcycle.brand = brand;
        motorcycle.model = model;
        motorcycle.current_mileage = new_mileage;

        emit!(MotorcycleUpdated {
            motorcycle: motorcycle.key(),
            owner: motorcycle.owner,
            mileage: new_mileage,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Registers a workshop. One workshop per authority (PDA seed).
    pub fn register_workshop(
        ctx: Context<RegisterWorkshop>,
        name: String,
    ) -> Result<()> {
        require!(!name.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&name, MAX_WORKSHOP_NAME_LEN)?;

        let workshop = &mut ctx.accounts.workshop;
        workshop.authority = ctx.accounts.authority.key();
        workshop.name = name;
        workshop.active = true;
        workshop.created_at = Clock::get()?.unix_timestamp;
        workshop.services_completed = 0;
        workshop.claims_resolved = 0;
        workshop.bump = ctx.bumps.workshop;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_workshops = protocol
            .total_workshops
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(WorkshopRegistered {
            workshop: workshop.key(),
            authority: workshop.authority,
            timestamp: workshop.created_at,
        });
        Ok(())
    }

    /// Activates or deactivates a workshop. Only its own authority may do so.
    pub fn set_workshop_status(ctx: Context<SetWorkshopStatus>, active: bool) -> Result<()> {
        let workshop = &mut ctx.accounts.workshop;
        require!(workshop.active != active, ErrorCode::InvalidState);
        workshop.active = active;

        emit!(WorkshopStatusChanged {
            workshop: workshop.key(),
            active,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Creates a maintenance intervention. The record id must be the next
    /// sequential id of the motorcycle, which fixes the PDA deterministically.
    pub fn create_service_record(
        ctx: Context<CreateServiceRecord>,
        record_id: u64,
        mileage: u64,
        service_type: String,
        description: String,
    ) -> Result<()> {
        require!(!service_type.trim().is_empty(), ErrorCode::EmptyField);
        require!(!description.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&service_type, MAX_SERVICE_TYPE_LEN)?;
        require_len(&description, MAX_DESCRIPTION_LEN)?;
        require!(mileage <= MAX_MILEAGE, ErrorCode::InvalidMileage);
        require!(mileage >= ctx.accounts.motorcycle.current_mileage, ErrorCode::InvalidMileage);
        require!(ctx.accounts.motorcycle.active, ErrorCode::MotorcycleInactive);
        require!(ctx.accounts.workshop.active, ErrorCode::WorkshopInactive);
        require!(
            record_id == ctx.accounts.motorcycle.service_count.saturating_add(1),
            ErrorCode::InvalidRecordId
        );

        let now = Clock::get()?.unix_timestamp;
        let record = &mut ctx.accounts.service_record;
        record.motorcycle = ctx.accounts.motorcycle.key();
        record.workshop = ctx.accounts.workshop.key();
        record.authority = ctx.accounts.authority.key();
        record.record_id = record_id;
        record.mileage = mileage;
        record.service_type = service_type;
        record.description = description;
        record.status = ServiceStatus::Pending;
        record.claim_count = 0;
        record.open_claim = false;
        record.created_at = now;
        record.updated_at = now;
        record.bump = ctx.bumps.service_record;

        let motorcycle = &mut ctx.accounts.motorcycle;
        motorcycle.service_count = motorcycle
            .service_count
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        motorcycle.pending_services = motorcycle
            .pending_services
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_service_records = protocol
            .total_service_records
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(ServiceRecordCreated {
            service_record: record.key(),
            motorcycle: record.motorcycle,
            workshop: record.workshop,
            record_id,
            timestamp: now,
        });
        Ok(())
    }

    /// Modifies a pending intervention. Only the workshop that authored it may
    /// modify it, and finalized records are immutable.
    pub fn update_service_record(
        ctx: Context<UpdateServiceRecord>,
        mileage: u64,
        service_type: String,
        description: String,
    ) -> Result<()> {
        require!(!service_type.trim().is_empty(), ErrorCode::EmptyField);
        require!(!description.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&service_type, MAX_SERVICE_TYPE_LEN)?;
        require_len(&description, MAX_DESCRIPTION_LEN)?;
        require!(mileage <= MAX_MILEAGE, ErrorCode::InvalidMileage);
        require!(mileage >= ctx.accounts.motorcycle.current_mileage, ErrorCode::InvalidMileage);

        let record = &mut ctx.accounts.service_record;
        require!(record.status == ServiceStatus::Pending, ErrorCode::ServiceFinalized);
        require!(
            ctx.accounts.authority.key() == record.authority,
            ErrorCode::UnauthorizedWorkshop
        );

        record.mileage = mileage;
        record.service_type = service_type;
        record.description = description;
        record.updated_at = Clock::get()?.unix_timestamp;

        emit!(ServiceRecordUpdated {
            service_record: record.key(),
            authority: record.authority,
            timestamp: record.updated_at,
        });
        Ok(())
    }

    /// Finalizes a pending intervention. This is the moment a warranty window
    /// starts and the odometer of the motorcycle advances.
    pub fn finalize_service_record(ctx: Context<FinalizeServiceRecord>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let record = &mut ctx.accounts.service_record;
        require!(record.status == ServiceStatus::Pending, ErrorCode::ServiceFinalized);
        require!(
            ctx.accounts.authority.key() == record.authority,
            ErrorCode::UnauthorizedWorkshop
        );
        require!(ctx.accounts.workshop.active, ErrorCode::WorkshopInactive);
        record.status = ServiceStatus::Finalized;
        record.updated_at = now;

        let motorcycle = &mut ctx.accounts.motorcycle;
        motorcycle.pending_services = motorcycle
            .pending_services
            .checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        if record.mileage > motorcycle.current_mileage {
            motorcycle.current_mileage = record.mileage;
        }

        let workshop = &mut ctx.accounts.workshop;
        workshop.services_completed = workshop
            .services_completed
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(ServiceRecordFinalized {
            service_record: record.key(),
            motorcycle: record.motorcycle,
            workshop: record.workshop,
            timestamp: now,
        });
        Ok(())
    }

    /// Opens a warranty claim. It must be tied to a finalized service, be
    /// opened by the motorcycle owner, be inside the warranty window and there
    /// may be only one open claim per service record.
    pub fn create_warranty_claim(
        ctx: Context<CreateWarrantyClaim>,
        claim_id: u64,
        description: String,
    ) -> Result<()> {
        require!(!description.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&description, MAX_CLAIM_DESCRIPTION_LEN)?;

        let now = Clock::get()?.unix_timestamp;
        let motorcycle_key = ctx.accounts.motorcycle.key();
        let service_key = ctx.accounts.service_record.key();
        let workshop_key = ctx.accounts.service_record.workshop;
        let claimant_key = ctx.accounts.claimant.key();
        let claim_bump = ctx.bumps.warranty_claim;

        require!(claimant_key == ctx.accounts.motorcycle.owner, ErrorCode::NotMotorcycleOwner);
        require!(ctx.accounts.motorcycle.active, ErrorCode::MotorcycleInactive);
        require!(
            ctx.accounts.service_record.motorcycle == motorcycle_key,
            ErrorCode::AccountMismatch
        );

        let record = &mut ctx.accounts.service_record;
        require!(
            record.status == ServiceStatus::Finalized,
            ErrorCode::ServiceNotFinalized
        );
        require!(!record.open_claim, ErrorCode::ClaimAlreadyOpen);
        require!(
            claim_id == record.claim_count.saturating_add(1),
            ErrorCode::InvalidClaimId
        );
        require!(
            now.saturating_sub(record.updated_at) <= WARRANTY_WINDOW_SECONDS,
            ErrorCode::ClaimWindowExpired
        );

        let claim = &mut ctx.accounts.warranty_claim;
        claim.motorcycle = motorcycle_key;
        claim.service_record = service_key;
        claim.claimant = claimant_key;
        claim.workshop = workshop_key;
        claim.claim_id = claim_id;
        claim.description = description;
        claim.status = ClaimStatus::Open;
        claim.resolution = String::new();
        claim.created_at = now;
        claim.resolved_at = None;
        claim.bump = claim_bump;

        record.open_claim = true;
        record.claim_count = record
            .claim_count
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let motorcycle = &mut ctx.accounts.motorcycle;
        motorcycle.open_claims = motorcycle
            .open_claims
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_warranty_claims = protocol
            .total_warranty_claims
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(WarrantyClaimCreated {
            warranty_claim: claim.key(),
            service_record: claim.service_record,
            claimant: claim.claimant,
            timestamp: now,
        });
        Ok(())
    }

    /// Resolves an open claim. Only the authority of the workshop responsible
    /// for the linked service may resolve it.
    pub fn resolve_warranty_claim(
        ctx: Context<ResolveWarrantyClaim>,
        resolution: String,
    ) -> Result<()> {
        require!(!resolution.trim().is_empty(), ErrorCode::EmptyField);
        require_len(&resolution, MAX_RESOLUTION_LEN)?;

        let now = Clock::get()?.unix_timestamp;
        let claim = &mut ctx.accounts.warranty_claim;
        require!(claim.status == ClaimStatus::Open, ErrorCode::ClaimNotOpen);
        require!(
            ctx.accounts.workshop.key() == claim.workshop,
            ErrorCode::AccountMismatch
        );
        require!(
            ctx.accounts.authority.key() == ctx.accounts.workshop.authority,
            ErrorCode::UnauthorizedWorkshop
        );
        require!(
            ctx.accounts.service_record.key() == claim.service_record,
            ErrorCode::AccountMismatch
        );
        require!(
            ctx.accounts.motorcycle.key() == claim.motorcycle,
            ErrorCode::AccountMismatch
        );

        claim.status = ClaimStatus::Resolved;
        claim.resolution = resolution;
        claim.resolved_at = Some(now);

        let service_record = &mut ctx.accounts.service_record;
        service_record.open_claim = false;

        let motorcycle = &mut ctx.accounts.motorcycle;
        motorcycle.open_claims = motorcycle
            .open_claims
            .checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let workshop = &mut ctx.accounts.workshop;
        workshop.claims_resolved = workshop
            .claims_resolved
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(WarrantyClaimResolved {
            warranty_claim: claim.key(),
            workshop: workshop.key(),
            timestamp: now,
        });
        Ok(())
    }

    /// Conditional archival. A motorcycle can only be archived by its owner,
    /// when it has neither open warranty claims nor pending interventions.
    /// The account is retained so the maintenance history stays verifiable.
    pub fn archive_motorcycle(
        ctx: Context<ArchiveMotorcycle>,
        identifier_hash: [u8; 32],
    ) -> Result<()> {
        let motorcycle = &mut ctx.accounts.motorcycle;
        require!(motorcycle.active, ErrorCode::AlreadyArchived);
        require!(
            motorcycle.identifier_hash == identifier_hash,
            ErrorCode::AccountMismatch
        );
        require!(
            ctx.accounts.owner.key() == motorcycle.owner,
            ErrorCode::NotMotorcycleOwner
        );
        require!(motorcycle.open_claims == 0, ErrorCode::OpenClaimsExist);
        require!(motorcycle.pending_services == 0, ErrorCode::PendingServicesExist);

        motorcycle.active = false;

        let protocol = &mut ctx.accounts.protocol;
        protocol.active_motorcycles = protocol
            .active_motorcycles
            .checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        emit!(MotorcycleArchived {
            motorcycle: motorcycle.key(),
            owner: motorcycle.owner,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Protocol {
    pub authority: Pubkey,
    pub total_motorcycles: u64,
    pub active_motorcycles: u64,
    pub total_workshops: u64,
    pub total_service_records: u64,
    pub total_warranty_claims: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Motorcycle {
    pub owner: Pubkey,
    pub identifier_hash: [u8; 32],
    #[max_len(MAX_BRAND_LEN)]
    pub brand: String,
    #[max_len(MAX_MODEL_LEN)]
    pub model: String,
    pub year: u16,
    pub current_mileage: u64,
    pub active: bool,
    pub created_at: i64,
    pub service_count: u64,
    pub pending_services: u64,
    pub open_claims: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Workshop {
    pub authority: Pubkey,
    #[max_len(MAX_WORKSHOP_NAME_LEN)]
    pub name: String,
    pub active: bool,
    pub created_at: i64,
    pub services_completed: u64,
    pub claims_resolved: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ServiceRecord {
    pub motorcycle: Pubkey,
    pub workshop: Pubkey,
    pub authority: Pubkey,
    pub record_id: u64,
    pub mileage: u64,
    #[max_len(MAX_SERVICE_TYPE_LEN)]
    pub service_type: String,
    #[max_len(MAX_DESCRIPTION_LEN)]
    pub description: String,
    pub status: ServiceStatus,
    pub claim_count: u64,
    pub open_claim: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct WarrantyClaim {
    pub motorcycle: Pubkey,
    pub service_record: Pubkey,
    pub claimant: Pubkey,
    pub workshop: Pubkey,
    pub claim_id: u64,
    #[max_len(MAX_CLAIM_DESCRIPTION_LEN)]
    pub description: String,
    pub status: ClaimStatus,
    #[max_len(MAX_RESOLUTION_LEN)]
    pub resolution: String,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ServiceStatus {
    Pending,
    Finalized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ClaimStatus {
    Open,
    Resolved,
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(identifier_hash: [u8; 32])]
pub struct RegisterMotorcycle<'info> {
    #[account(mut, seeds = [b"protocol"], bump = protocol.bump)]
    pub protocol: Account<'info, Protocol>,
    #[account(
        init,
        payer = owner,
        space = 8 + Motorcycle::INIT_SPACE,
        seeds = [b"motorcycle", identifier_hash.as_ref()],
        bump
    )]
    pub motorcycle: Account<'info, Motorcycle>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMotorcycle<'info> {
    #[account(
        mut,
        seeds = [b"motorcycle", motorcycle.identifier_hash.as_ref()],
        bump = motorcycle.bump,
        constraint = motorcycle.owner == owner.key() @ ErrorCode::NotMotorcycleOwner
    )]
    pub motorcycle: Account<'info, Motorcycle>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RegisterWorkshop<'info> {
    #[account(mut, seeds = [b"protocol"], bump = protocol.bump)]
    pub protocol: Account<'info, Protocol>,
    #[account(
        init,
        payer = authority,
        space = 8 + Workshop::INIT_SPACE,
        seeds = [b"workshop", authority.key().as_ref()],
        bump
    )]
    pub workshop: Account<'info, Workshop>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetWorkshopStatus<'info> {
    #[account(
        mut,
        seeds = [b"workshop", authority.key().as_ref()],
        bump = workshop.bump,
        constraint = workshop.authority == authority.key() @ ErrorCode::UnauthorizedWorkshop
    )]
    pub workshop: Account<'info, Workshop>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(record_id: u64)]
pub struct CreateServiceRecord<'info> {
    #[account(mut, seeds = [b"protocol"], bump = protocol.bump)]
    pub protocol: Account<'info, Protocol>,
    #[account(mut, seeds = [b"motorcycle", motorcycle.identifier_hash.as_ref()], bump = motorcycle.bump)]
    pub motorcycle: Account<'info, Motorcycle>,
    #[account(
        seeds = [b"workshop", workshop.authority.as_ref()],
        bump = workshop.bump,
        constraint = workshop.authority == authority.key() @ ErrorCode::UnauthorizedWorkshop
    )]
    pub workshop: Account<'info, Workshop>,
    #[account(
        init,
        payer = authority,
        space = 8 + ServiceRecord::INIT_SPACE,
        seeds = [b"service", motorcycle.key().as_ref(), record_id.to_le_bytes().as_ref()],
        bump
    )]
    pub service_record: Account<'info, ServiceRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateServiceRecord<'info> {
    #[account(
        mut,
        seeds = [b"service", motorcycle.key().as_ref(), service_record.record_id.to_le_bytes().as_ref()],
        bump = service_record.bump,
        constraint = service_record.motorcycle == motorcycle.key() @ ErrorCode::AccountMismatch,
        constraint = service_record.workshop == workshop.key() @ ErrorCode::AccountMismatch
    )]
    pub service_record: Account<'info, ServiceRecord>,
    pub motorcycle: Account<'info, Motorcycle>,
    pub workshop: Account<'info, Workshop>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeServiceRecord<'info> {
    #[account(
        mut,
        seeds = [b"service", motorcycle.key().as_ref(), service_record.record_id.to_le_bytes().as_ref()],
        bump = service_record.bump,
        constraint = service_record.motorcycle == motorcycle.key() @ ErrorCode::AccountMismatch,
        constraint = service_record.workshop == workshop.key() @ ErrorCode::AccountMismatch
    )]
    pub service_record: Account<'info, ServiceRecord>,
    #[account(mut, seeds = [b"motorcycle", motorcycle.identifier_hash.as_ref()], bump = motorcycle.bump)]
    pub motorcycle: Account<'info, Motorcycle>,
    #[account(
        mut,
        seeds = [b"workshop", workshop.authority.as_ref()],
        bump = workshop.bump,
        constraint = workshop.authority == authority.key() @ ErrorCode::UnauthorizedWorkshop
    )]
    pub workshop: Account<'info, Workshop>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(claim_id: u64)]
pub struct CreateWarrantyClaim<'info> {
    #[account(mut, seeds = [b"protocol"], bump = protocol.bump)]
    pub protocol: Account<'info, Protocol>,
    #[account(
        mut,
        seeds = [b"motorcycle", motorcycle.identifier_hash.as_ref()],
        bump = motorcycle.bump,
        constraint = claimant.key() == motorcycle.owner @ ErrorCode::NotMotorcycleOwner
    )]
    pub motorcycle: Account<'info, Motorcycle>,
    #[account(
        mut,
        seeds = [b"service", motorcycle.key().as_ref(), service_record.record_id.to_le_bytes().as_ref()],
        bump = service_record.bump,
        constraint = service_record.motorcycle == motorcycle.key() @ ErrorCode::AccountMismatch
    )]
    pub service_record: Account<'info, ServiceRecord>,
    #[account(
        init,
        payer = claimant,
        space = 8 + WarrantyClaim::INIT_SPACE,
        seeds = [b"warranty", service_record.key().as_ref(), claim_id.to_le_bytes().as_ref()],
        bump
    )]
    pub warranty_claim: Account<'info, WarrantyClaim>,
    #[account(mut)]
    pub claimant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveWarrantyClaim<'info> {
    #[account(
        mut,
        seeds = [b"warranty", service_record.key().as_ref(), warranty_claim.claim_id.to_le_bytes().as_ref()],
        bump = warranty_claim.bump,
        constraint = warranty_claim.service_record == service_record.key() @ ErrorCode::AccountMismatch,
        constraint = warranty_claim.motorcycle == motorcycle.key() @ ErrorCode::AccountMismatch,
        constraint = warranty_claim.workshop == workshop.key() @ ErrorCode::AccountMismatch
    )]
    pub warranty_claim: Account<'info, WarrantyClaim>,
    #[account(
        mut,
        seeds = [b"service", motorcycle.key().as_ref(), service_record.record_id.to_le_bytes().as_ref()],
        bump = service_record.bump
    )]
    pub service_record: Account<'info, ServiceRecord>,
    #[account(mut, seeds = [b"motorcycle", motorcycle.identifier_hash.as_ref()], bump = motorcycle.bump)]
    pub motorcycle: Account<'info, Motorcycle>,
    #[account(
        mut,
        seeds = [b"workshop", workshop.authority.as_ref()],
        bump = workshop.bump,
        constraint = workshop.authority == authority.key() @ ErrorCode::UnauthorizedWorkshop
    )]
    pub workshop: Account<'info, Workshop>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(identifier_hash: [u8; 32])]
pub struct ArchiveMotorcycle<'info> {
    #[account(
        mut,
        seeds = [b"motorcycle", motorcycle.identifier_hash.as_ref()],
        bump = motorcycle.bump,
        constraint = motorcycle.owner == owner.key() @ ErrorCode::NotMotorcycleOwner
    )]
    pub motorcycle: Account<'info, Motorcycle>,
    #[account(mut, seeds = [b"protocol"], bump = protocol.bump)]
    pub protocol: Account<'info, Protocol>,
    pub owner: Signer<'info>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct ProtocolInitialized {
    pub authority: Pubkey,
}

#[event]
pub struct MotorcycleRegistered {
    pub motorcycle: Pubkey,
    pub owner: Pubkey,
    pub identifier_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct MotorcycleUpdated {
    pub motorcycle: Pubkey,
    pub owner: Pubkey,
    pub mileage: u64,
    pub timestamp: i64,
}

#[event]
pub struct WorkshopRegistered {
    pub workshop: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WorkshopStatusChanged {
    pub workshop: Pubkey,
    pub active: bool,
    pub timestamp: i64,
}

#[event]
pub struct ServiceRecordCreated {
    pub service_record: Pubkey,
    pub motorcycle: Pubkey,
    pub workshop: Pubkey,
    pub record_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct ServiceRecordUpdated {
    pub service_record: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ServiceRecordFinalized {
    pub service_record: Pubkey,
    pub motorcycle: Pubkey,
    pub workshop: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WarrantyClaimCreated {
    pub warranty_claim: Pubkey,
    pub service_record: Pubkey,
    pub claimant: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WarrantyClaimResolved {
    pub warranty_claim: Pubkey,
    pub workshop: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MotorcycleArchived {
    pub motorcycle: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum ErrorCode {
    #[msg("The signer is not authorized for this operation")]
    UnauthorizedWorkshop,
    #[msg("The signer is not the owner of this motorcycle")]
    NotMotorcycleOwner,
    #[msg("The workshop is not active")]
    WorkshopInactive,
    #[msg("The motorcycle is archived")]
    MotorcycleInactive,
    #[msg("The odometer reading is invalid or lower than the current one")]
    InvalidMileage,
    #[msg("The manufacturing year is invalid")]
    InvalidYear,
    #[msg("Text fields cannot be empty")]
    EmptyField,
    #[msg("A text field exceeds the maximum length allowed by the account")]
    InvalidStringLength,
    #[msg("The service record is already finalized and cannot be modified")]
    ServiceFinalized,
    #[msg("The linked service record is not finalized")]
    ServiceNotFinalized,
    #[msg("The service record id does not match the motorcycle sequence")]
    InvalidRecordId,
    #[msg("The warranty claim id does not match the service sequence")]
    InvalidClaimId,
    #[msg("This service already has an open warranty claim")]
    ClaimAlreadyOpen,
    #[msg("The warranty claim is not open")]
    ClaimNotOpen,
    #[msg("The warranty window has expired")]
    ClaimWindowExpired,
    #[msg("The motorcycle has open warranty claims")]
    OpenClaimsExist,
    #[msg("The motorcycle has pending maintenance interventions")]
    PendingServicesExist,
    #[msg("The motorcycle is already archived")]
    AlreadyArchived,
    #[msg("Accounts passed to this instruction do not belong together")]
    AccountMismatch,
    #[msg("The requested workshop status is already active")]
    InvalidState,
    #[msg("Arithmetic overflow while updating a counter")]
    ArithmeticOverflow,
}
