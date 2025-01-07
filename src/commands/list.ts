import { makeBlockfrostV0Client } from '@helios-lang/tx-utils';
import { loadConfig } from '../../src/config';
// import { list, ListConfig } from '../../src/list';
import { adaToLovelace } from '../../src/utils';
import program from '../cli';

import { AssetNameLabel } from '@koralabs/kora-labs-common';
import { makeAddress } from '@helios-lang/ledger';
import { bytesToHex } from '@helios-lang/codec-utils';

const buyCommand = program
  .command('list')
  .description('List Handle NFT on Marketplace')
  .argument('<address>', 'Address to perform listing')
  .argument('<handle-name>', 'Ada Handle Name to list on marketplace')
  .argument('<price>', 'Price in ada')
  .argument('<creator-address>', 'Address of artist who create this NFT')
  .action(
    async (
      bech32Address: string,
      handleName: string,
      priceString: string,
      creatorBech32Address: string
    ) => {
      const configResult = loadConfig();
      if (!configResult.ok) return program.error(configResult.error);
      const config = configResult.data;

      const api = makeBlockfrostV0Client(
        config.network,
        config.blockfrostApiKey
      );
      const utxos = await api.getUtxos(makeAddress(bech32Address));
      // const listConfig: ListConfig = {
      //   changeBech32Address: bech32Address,
      //   cborUtxos: utxos.map((utxo) => bytesToHex(utxo.toCbor())),
      //   handleHex: `${AssetNameLabel.LBL_222}${Buffer.from(
      //     handleName,
      //     'utf8'
      //   ).toString('hex')}`,
      //   payouts: [
      //     {
      //       address: bech32Address,
      //       amountLovelace: adaToLovelace(Number(priceString) * 0.9),
      //     },
      //     {
      //       address: creatorBech32Address,
      //       amountLovelace: adaToLovelace(Number(priceString) * 0.1),
      //     },
      //   ],
      // };

      // const txResult = await list(listConfig, config.network);
      // if (!txResult.ok) console.log(txResult.error);
      // else console.log(txResult.data);
    }
  );

export default buyCommand;
