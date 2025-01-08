use aiken/transaction/credential.{
  Address, from_verification_key, with_delegation_key,
}
use marketplace/types.{VerificationKeyHash}

// marketplace address (bech32 format) is
// addr_test1qpzxs06vn7qagrqsm7wtquul8s5drxzk82wwr9qx3886m8lv7yv3mukuwdkne3v3va8dgd3xjkzqv90pu9gsc8hrl2xs9yqkej 

pub const marketplace_addr_payment_cred_verification_key_hash: VerificationKeyHash =
  #"44683f4c9f81d40c10df9cb0739f3c28d198563a9ce1940689cfad9f"

pub const marketplace_addr_stake_cred_verification_key_hash: VerificationKeyHash =
  #"ecf1191df2dc736d3cc591674ed4362695840615e1e1510c1ee3fa8d"

pub fn marketplace_addr() -> Address {
  from_verification_key(marketplace_addr_payment_cred_verification_key_hash)
    |> with_delegation_key(marketplace_addr_stake_cred_verification_key_hash)
}

pub fn authorizers() -> List<VerificationKeyHash> {
  [#"0c0647ff15d2df88897eb2471d9aba909cdcc842ad7c387ec0712725"]
}
