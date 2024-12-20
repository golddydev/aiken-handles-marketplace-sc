use aiken/builtin.{tail_list}
use aiken/collection/dict
use cardano/assets.{ada_policy_id}
use cardano/transaction.{Datum, NoDatum, Output}
use marketplace/constants.{marketplace_addr}
use marketplace/types.{Payout}

/// Find the outputs that match the list of payouts.
/// We use a heuristic function combined with the given 
/// redeemer offset to jump 10 at a time towards first output to validate.
/// This saves a massive amount in budget allowing us to support 40+ inputs.
/// If the wrong offset is given then the script will fail or cost more.
/// The resulting `Output` list may contain more outputs than payouts. But
/// we expect the transaction to NOT have alternating payout outputs and random
/// outputs. This means you cannot construct transactions that have outputs
/// like this: `[payout, random, payout]`. An example of a valid set of outputs
/// would be: `[random, payout, payout, random]`.
/// This is pretty much `list.drop` but optimized for our situation.
pub fn find_payout_outputs(
  outputs: List<a>,
  payout_outputs_offset: Int,
) -> List<a> {
  if payout_outputs_offset >= 10 {
    outputs
      |> skip_10_items
      |> find_payout_outputs(payout_outputs_offset - 10)
  } else {
    do_find_payout_outputs(outputs, payout_outputs_offset)
  }
}

fn do_find_payout_outputs(outputs: List<a>, current_index: Int) -> List<a> {
  if current_index == 0 {
    outputs
  } else {
    outputs
      |> tail_list
      |> do_find_payout_outputs(current_index - 1)
  }
}

/// Small utility to skip 10 items in a list.
/// Used by `find_payout_outputs`.
fn skip_10_items(some_list: List<a>) -> List<a> {
  some_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
    |> tail_list
}

/// This function is used only if a discount
/// is not allowed (tx not signed by koralabs). The main difference
/// from `check_payouts` is that we make sure the
/// output address matches a hardcoded marketplace address
/// along with confirming that the output value equals
/// the marketplace_fee. In this case there is no `Payout`
/// to compare to.
pub fn check_marketplace_payout(
  output: Output,
  marketplace_fee: Int,
  datum_tag: Datum,
) -> Bool {
  let Output { address: output_address, value, datum, .. } = output

  let datum_check = datum == datum_tag

  // Match hardcoded marketplace address
  let address_check = output_address == marketplace_addr()

  expect [Pair(policy, tokens)] =
    value
      |> assets.to_dict
      |> dict.to_pairs

  expect [Pair(_, quantity)] = dict.to_pairs(tokens)

  let policy_check = policy == ada_policy_id

  // Output value quantity must equal the marketplace fee
  // this prevents people from not paying a fee by submitting
  // transactions not constructed by Koralabs.
  let quantity_check = quantity >= marketplace_fee

  datum_check && address_check && quantity_check && policy_check
}

/// Check that payouts and payout outputs
/// are correct. Payouts are stored in the datum
/// when assets are listed. On buy a transaction
/// with matching payout outputs needs to be constructed.
/// We also require that outputs are in the same order as the
/// payouts in the datum. Returns the sum of the payout amounts.
pub fn check_payouts(
  outputs: List<Output>,
  payouts: List<Payout>,
  datum_tag: Datum,
) -> Int {
  expect [first_output, ..rest_outputs] = outputs

  let Output { address: output_address, value, datum, .. } = first_output

  expect datum == datum_tag
  expect [payout, ..rest_payouts] = payouts

  let Payout { address: payout_address, amount_lovelace } = payout

  // The `Output` address must match
  // the address specified in the corresponding
  // payout from the datum.
  expect payout_address == output_address
  expect [Pair(policy, tokens)] =
    value
      |> assets.to_dict
      |> dict.to_pairs

  expect [Pair(_, quantity)] = dict.to_pairs(tokens)

  expect policy == ada_policy_id
  // The quantity in the output must equal
  // the amount specified in the corresponding
  // payout from the datum.
  expect quantity >= amount_lovelace && amount_lovelace > 0
  let rest_payouts_amount =
    when rest_payouts is {
      // the base case
      [] ->
        // if rest is empty we are done
        0
      _ ->
        // continue with remaining outputs and payouts
        check_payouts_aux(rest_outputs, rest_payouts)
    }

  amount_lovelace + rest_payouts_amount
}

pub fn check_payouts_aux(outputs: List<Output>, payouts: List<Payout>) -> Int {
  expect [first_output, ..rest_outputs] = outputs

  let Output { address: output_address, value, datum, .. } = first_output

  expect datum == NoDatum
  expect [payout, ..rest_payouts] = payouts

  let Payout { address: payout_address, amount_lovelace } = payout

  // The `Output` address must match
  // the address specified in the corresponding
  // payout from the datum.
  expect payout_address == output_address
  expect [Pair(policy, tokens)] =
    value
      |> assets.to_dict
      |> dict.to_pairs

  expect [Pair(_, quantity)] = dict.to_pairs(tokens)

  expect policy == ada_policy_id
  // The quantity in the output must equal
  // the amount specified in the corresponding
  // payout from the datum.
  expect quantity >= amount_lovelace && amount_lovelace > 0
  let rest_payouts_amount =
    when rest_payouts is {
      // the base case
      [] ->
        // if rest is empty we are done
        0
      _ ->
        // continue with remaining outputs and payouts
        check_payouts_aux(rest_outputs, rest_payouts)
    }

  amount_lovelace + rest_payouts_amount
}
