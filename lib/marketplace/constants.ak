use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address, from_verification_key, with_delegation_key}

pub const marketplace_addr_payment_cred_verification_key_hash: VerificationKeyHash =
  #"84cc25ea4c29951d40b443b95bbc5676bc425470f96376d1984af9ab"

pub const marketplace_addr_stake_cred_verification_key_hash: VerificationKeyHash =
  #"2c967f4bd28944b06462e13c5e3f5d5fa6e03f8567569438cd833e6d"

pub fn marketplace_addr() -> Address {
  from_verification_key(marketplace_addr_payment_cred_verification_key_hash)
    |> with_delegation_key(marketplace_addr_stake_cred_verification_key_hash)
}

pub fn authorizers() -> List<VerificationKeyHash> {
  [
    #"15df89fe62968415bac4de9d8576da39c34db4717f46332572aca3eb",
    #"53391ebae9fa352a1108e2769df9baf0d3efcab0f49404bd6ac56bd4",
  ]
}
