import { bytesToHex } from "@helios-lang/codec-utils";
import {
  decodeTxInput,
  hashNativeScript,
  makeAddress,
  makeAfterScript,
  makeAllScript,
  makeAssets,
  makeNetworkParamsHelper,
  makePubKeyHash,
  makeSigScript,
  makeTxOutput,
  makeTxOutputId,
  makeValue,
  Tx,
} from "@helios-lang/ledger";
import {
  BlockfrostV0Client,
  makeSimpleWallet,
  makeTxBuilder,
  NetworkName,
  restoreRootPrivateKey,
} from "@helios-lang/tx-utils";
import { decodeUplcProgramV2FromCbor } from "@helios-lang/uplc";
import {
  AssetNameLabel,
  IS_PRODUCTION,
  ScriptDetails,
  ScriptType,
} from "@koralabs/kora-labs-common";
import fs from "fs/promises";
import { mayFailAsync } from "helpers/index.js";
import { Err, Ok, Result } from "ts-res";

import {
  AUTHORIZERS,
  HANDLE_POLICY_ID,
  MARKETPLACE_ADDRESS,
} from "./constants/index.js";
import {
  optimizedCompiledCode,
  unoptimizedCompiledCode,
} from "./contracts/plutus-v2/contract.js";
import { buildSCParametersDatum } from "./datum.js";
import { BuildTxError } from "./types.js";
import { fetchNetworkParameters, sleep } from "./utils/index.js";

/**
 * Configuration of function to deploy marketplace smart contract
 * @interface
 * @typedef {object} DeployConfig
 * @property {string} handleName Ada Handle Name to deploy with SC
 * @property {string} changeBech32Address Change address of wallet who is performing `deploy`
 * @property {string[]} cborUtxos UTxOs (cbor format) of wallet
 * @property {string | undefined} seed Seed phrase of wallet to deploy SC
 */
interface DeployConfig {
  handleName: string;
  changeBech32Address: string;
  cborUtxos: string[];
  seed?: string | undefined;
}

/**
 * Deploy Marketplace Smart Contract
 * @param {DeployConfig} config
 * @param {NetworkName} network
 * @param {BlockfrostV0Client | undefined} blockfrostApi Blockfrost V0 Client
 * @returns {Promise<Result<void | Tx,  Error>>}
 */

const deploy = async (
  config: DeployConfig,
  network: NetworkName,
  blockfrostApi?: BlockfrostV0Client
): Promise<Result<void | Tx, Error | BuildTxError>> => {
  console.log(`Deploying to ${network} network...`);

  const { handleName, changeBech32Address, seed, cborUtxos } = config;
  const txBuilder = makeTxBuilder({ isMainnet: IS_PRODUCTION });

  // fetch network parameters
  const networkParametersResult = await fetchNetworkParameters(network);
  if (!networkParametersResult.ok)
    return Err(new Error("Failed to fetch network parameter"));
  const networkParameters = networkParametersResult.data;
  const networkParameterHelper = makeNetworkParamsHelper(networkParameters);

  const changeAddress = makeAddress(changeBech32Address);
  const spareUtxos = cborUtxos.map(decodeTxInput);

  if (changeAddress.spendingCredential.kind != "PubKeyHash")
    return Err(new Error("Must be Base wallet to deploy"));

  const uplcProgram = decodeUplcProgramV2FromCbor(optimizedCompiledCode);
  const unoptimizedUplcProgram = decodeUplcProgramV2FromCbor(
    unoptimizedCompiledCode
  );

  const lockerScriptAddress = makeAddress(
    network == "mainnet",
    makePubKeyHash(
      hashNativeScript(
        makeAllScript([
          makeAfterScript(networkParameterHelper.timeToSlot(Date.now())),
          makeSigScript(changeAddress.spendingCredential.toHex()),
        ])
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
    lockerScriptAddress,
    deployedTxOutputValue,
    buildSCParametersDatum(
      makeAddress(MARKETPLACE_ADDRESS),
      AUTHORIZERS.map((authorizer) => makePubKeyHash(authorizer))
    ),
    uplcProgram
  );
  deployedTxOutput.correctLovelace(networkParameters);
  txBuilder.addOutput(deployedTxOutput);

  // find ada handle input
  const handleInputIndex = spareUtxos.findIndex((utxo) =>
    utxo.value.isGreaterOrEqual(deployedTxOutputValue)
  );
  if (handleInputIndex < 0)
    return Err(new Error(`You don't have $${handleName} handle`));
  const handleInput = spareUtxos.splice(handleInputIndex, 1)[0];
  txBuilder.spendUnsafe(handleInput);

  const tx = await txBuilder.build({ spareUtxos, changeAddress });

  if (!seed || !blockfrostApi) return Ok(tx);

  /// sign and submit
  const wallet = makeSimpleWallet(
    restoreRootPrivateKey(seed.split(" ")),
    blockfrostApi
  );
  tx.addSignatures(await wallet.signTx(tx));

  console.log("Submitting Tx...");
  const txId = await wallet.submitTx(tx);
  console.log("Waiting for Transaction to be confirmed...");

  while (true) {
    const utxoResult = await mayFailAsync(() =>
      blockfrostApi.getUtxo(makeTxOutputId(txId, 0))
    ).complete();
    if (!utxoResult.ok) {
      await sleep(10_000); // sleep 10 seconds
      continue;
    }

    console.log("Transaction confirmed, saving to file...");
    const utxo = utxoResult.data;
    const scriptDetail: ScriptDetails = {
      handle: handleName,
      handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(handleName, "utf8").toString("hex")}`,
      type: ScriptType.MARKETPLACE_CONTRACT,
      validatorHash: bytesToHex(uplcProgram.hash()),
      cbor: utxo.output.refScript
        ? bytesToHex(utxo.output.refScript.toCbor())
        : undefined,
      unoptimizedCbor: bytesToHex(unoptimizedUplcProgram.toCbor()),
      datumCbor: utxo.datum ? bytesToHex(utxo.datum.toCbor()) : undefined,
      latest: true,
      refScriptAddress: lockerScriptAddress.toBech32(),
      refScriptUtxo: `${txId.toString()}#0`,
      txBuildVersion: 1,
    };
    await fs.writeFile(
      `${network}-deployed.json`,
      JSON.stringify(scriptDetail)
    );
    console.log(`Saved ScriptDetail to ${network}-deployed.json`);
    break;
  }

  return Ok();
};

export type { DeployConfig };
export { deploy };
