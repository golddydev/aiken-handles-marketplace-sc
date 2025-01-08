// import { buy, BuyConfig, buyWithAuth, BuyWithAuthConfig } from '../../src/buy';
import { bytesToHex } from "@helios-lang/codec-utils";
import { makeAddress, makeTxOutputId } from "@helios-lang/ledger";
import { makeBlockfrostV0Client } from "@helios-lang/tx-utils";
import { AssetNameLabel } from "@koralabs/kora-labs-common";

import { loadConfig } from "../../src/config.js";
import program from "../cli.js";

program
  .command("buy")
  .description("Buy Handle NFT on Marketplace")
  .argument("<address>", "Address to perform buying")
  .argument("<handle-name>", "Ada Handle Name to buy on marketplace")
  .argument("<utxo-tx-hash>", "Transaction Hash of UTxO where handle is")
  .argument("<utxo-tx-index>", "Transaction Index of UTxO where handle is")
  .action(
    async (
      bech32Address: string,
      handleName: string,
      txHash: string,
      txIndex: string
    ) => {
      const configResult = loadConfig();
      if (!configResult.ok) return program.error(configResult.error);
      const config = configResult.data;

      const api = makeBlockfrostV0Client(
        config.network,
        config.blockfrostApiKey
      );
      const utxos = await api.getUtxos(makeAddress(bech32Address));
      const handleUtxo = await api.getUtxo(
        makeTxOutputId(`${txHash}#${txIndex}`)
      );

      // const buyConfig: BuyConfig = {
      //   changeBech32Address: bech32Address,
      //   cborUtxos: utxos.map((utxo) => bytesToHex(utxo.toCbor())),
      //   handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(
      //     handleName,
      //     'utf8'
      //   ).toString('hex')}`,
      //   listingUtxo: {
      //     address: handleUtxo.address.toString(),
      //     datum: bytesToHex(handleUtxo.output.datum?.data?.toCbor() || []),
      //     index: handleUtxo.id.index,
      //     tx_id: handleUtxo.id.txId.toHex(),
      //     lovelace: Number(handleUtxo.value.lovelace),
      //   },
      // };

      // const txResult = await buy(buyConfig, config.network);
      // if (!txResult.ok) return program.error(txResult.error.message);
      // console.log('\nTransaction CBOR Hex, copy and paste to wallet\n');
      // console.log(txResult.data);
    }
  );

program
  .command("buy-with-auth")
  .description("Buy Handle NFT on Marketplace with Authorizer")
  .argument("<address>", "Address to perform buying")
  .argument("<handle-name>", "Ada Handle Name to buy on marketplace")
  .argument("<utxo-tx-hash>", "Transaction Hash of UTxO where handle is")
  .argument("<utxo-tx-index>", "Transaction Index of UTxO where handle is")
  .argument("<authorizer-pubkey-hash>", "Authorizer's Pub Key Hash")
  .action(
    async (
      bech32Address: string,
      handleName: string,
      txHash: string,
      txIndex: string,
      authorizerPubKeyHash: string
    ) => {
      const configResult = loadConfig();
      if (!configResult.ok) return program.error(configResult.error);
      const config = configResult.data;

      const api = makeBlockfrostV0Client(
        config.network,
        config.blockfrostApiKey
      );
      const utxos = await api.getUtxos(makeAddress(bech32Address));
      const handleUtxo = await api.getUtxo(
        makeTxOutputId(`${txHash}#${txIndex}`)
      );

      // const buyWithAuthConfig: BuyWithAuthConfig = {
      //   changeBech32Address: bech32Address,
      //   cborUtxos: utxos.map((utxo) => bytesToHex(utxo.toCbor())),
      //   handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(
      //     handleName,
      //     'utf8'
      //   ).toString('hex')}`,
      //   listingUtxo: {
      //     address: handleUtxo.address.toString(),
      //     datum: bytesToHex(handleUtxo.output.datum?.toCbor() || []),
      //     index: handleUtxo.id.index,
      //     tx_id: handleUtxo.id.txId.toHex(),
      //     lovelace: Number(handleUtxo.output.value.lovelace),
      //   },
      //   authorizerPubKeyHash,
      // };

      // const txResult = await buyWithAuth(buyWithAuthConfig, config.network);
      // if (!txResult.ok) console.log(txResult.error);
      // else console.log(txResult.data);
    }
  );
