import { bytesToHex } from "@helios-lang/codec-utils";
import { makeTxOutputId } from "@helios-lang/ledger";
import { AssetNameLabel } from "@koralabs/kora-labs-common";
import { invariant } from "helpers/index.js";
import { assert, describe } from "vitest";

import { buy, BuyConfig } from "../src/buy.js";
import { list, ListConfig } from "../src/list.js";
import { myTest } from "./setup.js";

describe.sequential("Koralab Marketplace smart contract test", () => {
  myTest(
    "user_1 list <test> handle for 100 ada, 10% of it should go to user_3 as royalty",
    async ({
      emulator,
      user1Wallet,
      user3Wallet,
      testHandleName,
      network,
      refScriptDetail,
      txIds,
    }) => {
      const userUtxos = await emulator.getUtxos(user1Wallet.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const listConfig: ListConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: user1Wallet.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        payouts: [
          {
            address: user1Wallet.address.toBech32(),
            amountLovelace: 90_000_000n,
          },
          {
            address: user3Wallet.address.toBech32(),
            amountLovelace: 10_000_000n,
          },
        ],
        customRefScriptDetail: refScriptDetail,
      };
      const listTxResult = await list(listConfig, network);
      invariant(listTxResult.ok, "List Tx Failed");

      const { tx: listTx } = listTxResult.data;
      listTx.addSignatures(await user1Wallet.signTx(listTx));
      const txId = await user1Wallet.submitTx(listTx);
      emulator.tick(200);
      txIds.listingTxId = txId;
    }
  );

  myTest(
    "user_2 buy <test> handle",
    async ({
      emulator,
      parameters,
      user1Wallet,
      user2Wallet,
      user3Wallet,
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
      const userUtxos = await emulator.getUtxos(user2Wallet.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const buyConfig: BuyConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: user2Wallet.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        listingCborUtxo: bytesToHex(listingUtxo.toCbor(true)),
        customRefScriptDetail: refScriptDetail,
      };
      const buyTxResult = await buy(buyConfig, network);
      invariant(buyTxResult.ok, "Buy Tx Failed");

      const { tx: buyTx } = buyTxResult.data;
      buyTx.addSignatures(await user2Wallet.signTx(buyTx));
      const txId = await user2Wallet.submitTx(buyTx);
      emulator.tick(200);

      const [marketplaceOutput, user1Output, user3Output] = await Promise.all([
        emulator.getUtxo(makeTxOutputId(txId, 0)),
        emulator.getUtxo(makeTxOutputId(txId, 1)),
        emulator.getUtxo(makeTxOutputId(txId, 2)),
      ]);

      assert(
        marketplaceOutput.address.toString() ===
          parameters.marketplaceAddress &&
          marketplaceOutput.value.lovelace >= (100_000_000n * 50n) / 49n / 50n,
        "Marketplace Fee Output is not valid"
      );
      assert(
        user1Output.address.toString() === user1Wallet.address.toString() &&
          user1Output.value.lovelace == 90_000_000n,
        "User_1 Output is not valid"
      );
      assert(
        user3Output.address.toString() === user3Wallet.address.toString() &&
          user3Output.value.lovelace == 10_000_000n,
        "User_3 Output is not valid"
      );
    }
  );
});
