use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address}

pub type Payout {
  address: Address,
  amount_lovelace: Int,
}

/// A listing requires a datum that has
/// the owner's payment key and a list of payouts.
/// We do not need to specify the marketplace payout
/// in `payouts` even though it will be in
/// one of the outputs.
pub type MarketplaceDatum {
  /// Does not contain the marketplace payout.
  /// This is usually royalty and seller payouts.
  payouts: List<Payout>,
  /// Flexible to allow discounts
  /// The key that listed the NFT
  owner: VerificationKeyHash,
}
