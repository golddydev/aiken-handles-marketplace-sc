import { NetworkParams } from "@helios-lang/ledger";
import { NetworkName } from "@helios-lang/tx-utils";
import { decodeUplcProgramV2FromCbor, UplcProgramV2 } from "@helios-lang/uplc";
import { Result } from "ts-res";

import { optimizedCompiledCode } from "../contracts/plutus-v2/contract.js";
import { mayFail, mayFailAsync } from "../helpers/index.js";

const NETWORK_PARAMETER_URL = (network: NetworkName) =>
  `https://network-status.helios-lang.io/${network}/config`;

const fetchNetworkParameters = async (
  network: NetworkName
): Promise<Result<NetworkParams, string>> => {
  return await mayFailAsync(
    async () =>
      (
        await fetch(NETWORK_PARAMETER_URL(network))
      ).json() as unknown as NetworkParams
  ).complete();
};

// TODO:
// add arguments of
// parameters: Parameters
// version: "PlutusV2" | "PlutusV3"
const getUplcProgram = async (): Promise<Result<UplcProgramV2, string>> => {
  return mayFail(() => decodeUplcProgramV2FromCbor(optimizedCompiledCode));
};

export { fetchNetworkParameters, getUplcProgram };
