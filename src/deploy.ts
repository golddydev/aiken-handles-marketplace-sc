import {
  makeBlockfrostV0Client,
  makeEmulator,
  makeSimpleWallet,
  makeTxBuilder,
  NetworkName,
  restoreRootPrivateKey,
} from "@helios-lang/tx-utils";
import { Err, Ok, Result } from "ts-res";
import { AssetNameLabel, IS_PRODUCTION } from "@koralabs/kora-labs-common";
import {
  hashNativeScript,
  makeAddress,
  makeAssets,
  makeBeforeScript,
  makeNetworkParamsHelper,
  makePubKeyHash,
  makeTxOutput,
  makeValue,
} from "@helios-lang/ledger";

import { BuildTxError } from "./types.js";
import {
  AUTHORIZERS,
  HANDLE_POLICY_ID,
  MARKETPLACE_ADDRESS,
} from "./constants/index.js";
import { buildDatumForSCParameters } from "./datum.js";
import { decodeUplcProgramV2FromCbor } from "@helios-lang/uplc";

import { fetchNetworkParameter } from "./utils/index.js";
import blueprints from "../plutus-old.json" assert { type: "json" };
import { bytesToHex } from "@helios-lang/codec-utils";

makeEmulator()

/**
 * Configuration of function to deploy marketplace smart contract
 * @interface
 * @typedef {object} DeployConfig
 * @property {string} handleName Ada Handle Name to deploy with SC
 * @property {string} seed Seed phrase of wallet to deploy SC
 */
interface DeployConfig {
  handleName: string;
  seed: string;
}

/**
 * Deploy Marketplace Smart Contract
 * @param {DeployConfig} config
 * @param {NetworkName} network
 * @property {string} blockfrostApiKey Blockfrost API Key
 * @returns {Promise<Result<void,  Error>>}
 */

const deploy = async (
  config: DeployConfig,
  network: NetworkName,
  blockfrostApiKey: string
): Promise<Result<void, Error | BuildTxError>> => {
  const { handleName, seed } = config;
  const txBuilder = makeTxBuilder({ isMainnet: IS_PRODUCTION });
  const networkParamsResult = await fetchNetworkParameter(network);
  if (!networkParamsResult.ok)
    return Err(new Error(`Failed to fetch network "${network}" parameter`));
  const networkParameter = networkParamsResult.data;
  const networkParameterHelper = makeNetworkParamsHelper(networkParameter);

  const blockfrostApi = makeBlockfrostV0Client(network, blockfrostApiKey);
  const wallet = makeSimpleWallet(
    restoreRootPrivateKey(seed.split(" ")),
    blockfrostApi
  );
  const spareUtxos = await wallet.utxos;
  const changeAddress = wallet.address.toBech32();

  const compiledCode = blueprints.validators[0].compiledCode;
  const uplcProgram = decodeUplcProgramV2FromCbor(compiledCode);

  const failScriptAddress = makeAddress(
    network == "mainnet",
    makePubKeyHash(
      hashNativeScript(
        makeBeforeScript(networkParameterHelper.timeToSlot(Date.now()))
      )
    )
  );

  // deployed smart contract output
  const deployedTxOutputValue = makeValue(
    0n,
    makeAssets([
      [
        HANDLE_POLICY_ID,
        [
          [
            `${AssetNameLabel.LBL_222}${Buffer.from(handleName, "utf8").toString("hex")}`,
            1n,
          ],
        ],
      ],
    ])
  );
  const deployedTxOutput = makeTxOutput(
    failScriptAddress,
    deployedTxOutputValue,
    buildDatumForSCParameters(
      makeAddress(MARKETPLACE_ADDRESS),
      AUTHORIZERS.map((authorizer) => makePubKeyHash(authorizer))
    ),
    uplcProgram
  );
  deployedTxOutput.correctLovelace(networkParameter);
  txBuilder.addOutput(deployedTxOutput);

  // find ada handle input
  const handleInputIndex = spareUtxos.findIndex((utxo) =>
    utxo.value.isGreaterOrEqual(deployedTxOutputValue)
  );
  if (handleInputIndex < 0)
    return Err(new Error(`You don't have $${handleName} handle`));
  const handleInput = spareUtxos.splice(handleInputIndex, 1)[0];
  txBuilder.spendWithoutRedeemer(handleInput);

  const tx = await txBuilder.buildUnsafe({ spareUtxos, changeAddress });
  console.log(bytesToHex(tx.toCbor()));

  return Ok();
};

export type { DeployConfig };
export { deploy };
