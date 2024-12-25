pub fn trace_if_false(predicate: Bool, msg: String) -> Bool {
  if predicate {
    True
  } else {
    trace msg
    False
  }
}
