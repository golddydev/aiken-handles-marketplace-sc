import { bytesToHex } from "@helios-lang/codec-utils";
import { makeTxOutputId } from "@helios-lang/ledger";
import { AssetNameLabel } from "@koralabs/kora-labs-common";
import { invariant } from "helpers/index.js";
import { describe } from "vitest";

import { buy, BuyConfig } from "../src/buy.js";
import { list, ListConfig } from "../src/list.js";
import { myTest } from "./setup.js";

describe.sequential("Koralab Marketplace smart contract test", () => {
  myTest(
    "user_1 list <test> handle for 100 ada, 10% of it should go to user_3 as royalty",
    async ({
      emulator,
      userWallet1,
      userWallet3,
      testHandleName,
      network,
      refScriptDetail,
      txIds,
    }) => {
      const userUtxos = await emulator.getUtxos(userWallet1.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const listConfig: ListConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: userWallet1.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        payouts: [
          {
            address: userWallet1.address.toBech32(),
            amountLovelace: 90_000_000n,
          },
          {
            address: userWallet3.address.toBech32(),
            amountLovelace: 10_000_000n,
          },
        ],
        customRefScriptDetail: refScriptDetail,
      };
      const listTxResult = await list(listConfig, network);
      invariant(listTxResult.ok, "List Tx Failed");

      const { tx: listTx } = listTxResult.data;
      listTx.addSignatures(await userWallet1.signTx(listTx));
      const txId = await userWallet1.submitTx(listTx);
      emulator.tick(200);
      txIds.listingTxId = txId;
    }
  );

  myTest(
    "user_2 buy <test> handle",
    async ({
      emulator,
      userWallet1,
      userWallet2,
      userWallet3,
      testHandleName,
      network,
      refScriptDetail,
      txIds,
    }) => {
      const { listingTxId } = txIds;
      invariant(listingTxId, "Listing is not happened");

      const listingUtxo = await emulator.getUtxo(
        makeTxOutputId(listingTxId, 0)
      );
      const userUtxos = await emulator.getUtxos(userWallet2.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const buyConfig: BuyConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: userWallet2.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        listingCborUtxo: bytesToHex(listingUtxo.toCbor(true)),
        customRefScriptDetail: refScriptDetail,
      };
      const buyTxResult = await buy(buyConfig, network);
      invariant(buyTxResult.ok, "Buy Tx Failed");

      const { tx: buyTx } = buyTxResult.data;
      buyTx.addSignatures(await userWallet2.signTx(buyTx));
      const txId = await userWallet2.submitTx(buyTx);
      emulator.tick(200);
      console.log(txId.toHex());
    }
  );
});
