import { bytesToHex } from "@helios-lang/codec-utils";
import {
  makeAddress,
  makeAssets,
  makeDummyTxId,
  makeTxOutputId,
} from "@helios-lang/ledger";
import { makeEmulator, NetworkName } from "@helios-lang/tx-utils";
import { decodeUplcProgramV2FromCbor } from "@helios-lang/uplc";
import {
  AssetNameLabel,
  ScriptDetails,
  ScriptType,
} from "@koralabs/kora-labs-common";
import { Parameters } from "types.js";
import { test } from "vitest";

import {
  AUTHORIZERS,
  HANDLE_POLICY_ID,
  MARKETPLACE_ADDRESS,
} from "../src/constants/index.js";
import { unoptimizedCompiledCode } from "../src/contracts/plutus-v2/contract.js";
import { makeSCParametersUplcValues } from "../src/datum.js";
import { deploy } from "../src/deploy.js";
import { invariant } from "../src/helpers/index.js";

const network: NetworkName = "preview";
const ACCOUNT_LOVELACE = 500_000_000n;

const setup = async () => {
  const emulator = makeEmulator();

  const deployedHandleName = "mp_contract";
  const testHandleName = "test";
  const fundWallet = emulator.createWallet(
    ACCOUNT_LOVELACE,
    makeAssets([
      [
        HANDLE_POLICY_ID,
        [
          [
            `${AssetNameLabel.LBL_222}${Buffer.from(deployedHandleName, "utf8").toString("hex")}`,
            1n,
          ],
        ],
      ],
    ])
  );
  emulator.tick(200);
  const user1Wallet = emulator.createWallet(
    ACCOUNT_LOVELACE,
    makeAssets([
      [
        HANDLE_POLICY_ID,
        [
          [
            `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
            1n,
          ],
        ],
      ],
    ])
  );
  emulator.tick(200);
  const user2Wallet = emulator.createWallet(ACCOUNT_LOVELACE);
  emulator.tick(200);
  const user3Wallet = emulator.createWallet(ACCOUNT_LOVELACE);
  emulator.tick(200);
  const user4Wallet = emulator.createWallet(ACCOUNT_LOVELACE);
  emulator.tick(200);

  const fundWalletUtxos = await emulator.getUtxos(fundWallet.address);
  const deployTxResult = await deploy(
    {
      changeBech32Address: fundWallet.address.toBech32(),
      handleName: deployedHandleName,
      cborUtxos: fundWalletUtxos.map((utxo) => bytesToHex(utxo.toCbor(true))),
    },
    network
  );
  invariant(
    deployTxResult.ok && typeof deployTxResult.data == "object",
    "Failed to deploy"
  );

  // sign and submit deploy tx
  const tx = deployTxResult.data;
  tx.addSignatures(await fundWallet.signTx(tx));
  const txId = await fundWallet.submitTx(tx);
  emulator.tick(200);
  console.log("Deployed!!!");
  const referenceScriptUTxO = await emulator.getUtxo(makeTxOutputId(txId, 0));

  /// build smart contract parameters
  const parameters: Parameters = {
    marketplaceAddress: MARKETPLACE_ADDRESS,
    authorizers: AUTHORIZERS,
  };
  const parametersUplcValues = makeSCParametersUplcValues(parameters);

  /// make unoptimized uplc program
  const upoptimizedUplcProgram = decodeUplcProgramV2FromCbor(
    unoptimizedCompiledCode
  ).apply(parametersUplcValues);

  /// make ref script detail
  const refScriptDetail: ScriptDetails = {
    handle: deployedHandleName,
    handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(deployedHandleName, "utf8").toString("hex")}`,
    type: ScriptType.MARKETPLACE_CONTRACT,
    validatorHash: bytesToHex(referenceScriptUTxO.output.refScript!.hash()),
    cbor: bytesToHex(referenceScriptUTxO.output.refScript!.toCbor()),
    unoptimizedCbor: bytesToHex(upoptimizedUplcProgram.toCbor()),
    datumCbor: bytesToHex(referenceScriptUTxO.datum!.toCbor()),
    latest: true,
    refScriptAddress: makeAddress(referenceScriptUTxO.address).toBech32(),
    refScriptUtxo: `${txId.toString()}#0`,
    txBuildVersion: 1,
  };

  return {
    emulator,
    parameters,
    deployedHandleName,
    testHandleName,
    referenceScriptUTxO,
    refScriptDetail,
    fundWallet,
    user1Wallet,
    user2Wallet,
    user3Wallet,
    user4Wallet,
    network,
    txIds: {
      listingTxId: makeDummyTxId(),
    },
  };
};

const myTest = test.extend(await setup());

export { myTest };
