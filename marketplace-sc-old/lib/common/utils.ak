use aiken/builtin.{blake2b_256, serialise_data}
use aiken/transaction.{Datum,
  InlineDatum, OutputReference, ScriptPurpose, Spend}

pub fn get_spending_output_reference(purpose: ScriptPurpose) -> OutputReference {
  when purpose is {
    Spend(out_ref) -> out_ref
    _ -> fail @"must be executed as a spending validator"
  }
}

pub fn build_datum_tag(output_ref: OutputReference) -> Datum {
  output_ref
    |> serialise_data
    |> blake2b_256
    |> InlineDatum
}
