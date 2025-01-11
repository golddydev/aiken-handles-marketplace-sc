import { bytesToHex } from "@helios-lang/codec-utils";
import { makeTxOutputId } from "@helios-lang/ledger";
import { AssetNameLabel } from "@koralabs/kora-labs-common";
import { assert, describe } from "vitest";

import { buy, BuyConfig } from "../src/buy.js";
import { invariant } from "../src/helpers/index.js";
import { list, ListConfig } from "../src/list.js";
import { withdraw, WithdrawConfig } from "../src/withdraw.js";
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
      txOutputIds,
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
      txOutputIds.listingTxOutputId = makeTxOutputId(txId, 0);
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
      txOutputIds,
    }) => {
      const { listingTxOutputId } = txOutputIds;
      invariant(listingTxOutputId, "Listing is not happened");

      const listingUtxo = await emulator.getUtxo(listingTxOutputId);
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

      txOutputIds.listingTxOutputId = undefined;
    }
  );

  myTest(
    "user_2 list <test> handle for 1000 ada, 10% of it should go to user_3 as royalty - (too expensive to buy)",
    async ({
      emulator,
      user2Wallet,
      user3Wallet,
      testHandleName,
      network,
      refScriptDetail,
      txOutputIds,
    }) => {
      const userUtxos = await emulator.getUtxos(user2Wallet.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const listConfig: ListConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: user2Wallet.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        payouts: [
          {
            address: user2Wallet.address.toBech32(),
            amountLovelace: 900_000_000n,
          },
          {
            address: user3Wallet.address.toBech32(),
            amountLovelace: 100_000_000n,
          },
        ],
        customRefScriptDetail: refScriptDetail,
      };
      const listTxResult = await list(listConfig, network);
      invariant(listTxResult.ok, "List Tx Failed");

      const { tx: listTx } = listTxResult.data;
      listTx.addSignatures(await user2Wallet.signTx(listTx));
      const txId = await user2Wallet.submitTx(listTx);
      emulator.tick(200);
      txOutputIds.listingTxOutputId = makeTxOutputId(txId, 0);
    }
  );

  myTest(
    "user_4 fails to buy <test> handle, because that is too expensive",
    async ({
      emulator,
      user4Wallet,
      testHandleName,
      network,
      refScriptDetail,
      txOutputIds,
    }) => {
      const { listingTxOutputId } = txOutputIds;
      invariant(listingTxOutputId, "Listing is not happened");

      const listingUtxo = await emulator.getUtxo(listingTxOutputId);
      const userUtxos = await emulator.getUtxos(user4Wallet.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const buyConfig: BuyConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: user4Wallet.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        listingCborUtxo: bytesToHex(listingUtxo.toCbor(true)),
        customRefScriptDetail: refScriptDetail,
      };
      const buyTxResult = await buy(buyConfig, network);
      invariant(!buyTxResult.ok);
      console.info("Error:", buyTxResult.error.message);
    }
  );

  myTest(
    "user_2 withdraw <test> handle - (that is too expensive to buy)",
    async ({
      emulator,
      user2Wallet,
      testHandleName,
      network,
      refScriptDetail,
      txOutputIds,
    }) => {
      const { listingTxOutputId } = txOutputIds;
      invariant(listingTxOutputId, "Listing is not happened");

      const listingUtxo = await emulator.getUtxo(listingTxOutputId);
      const userUtxos = await emulator.getUtxos(user2Wallet.address);
      const userCborUtxos = userUtxos.map((utxo) =>
        bytesToHex(utxo.toCbor(true))
      );
      const withdrawConfig: WithdrawConfig = {
        cborUtxos: userCborUtxos,
        changeBech32Address: user2Wallet.address.toBech32(),
        handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(testHandleName, "utf8").toString("hex")}`,
        listingCborUtxo: bytesToHex(listingUtxo.toCbor(true)),
        customRefScriptDetail: refScriptDetail,
      };
      const withdrawTxResult = await withdraw(withdrawConfig, network);
      invariant(withdrawTxResult.ok, "Withdraw Tx Failed");

      const { tx: withdrawTx } = withdrawTxResult.data;
      withdrawTx.addSignatures(await user2Wallet.signTx(withdrawTx));
      emulator.tick(200);
      txOutputIds.listingTxOutputId = undefined;
    }
  );
});
