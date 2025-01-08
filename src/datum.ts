import { bytesToHex, hexToBytes } from "@helios-lang/codec-utils";
import { blake2b } from "@helios-lang/crypto";
import {
  Address,
  decodeAddress,
  InlineTxOutputDatum,
  makeAddress,
  makeInlineTxOutputDatum,
  makePubKeyHash,
  PubKeyHash,
  TxOutputId,
} from "@helios-lang/ledger";
import {
  makeByteArrayData,
  makeIntData,
  makeListData,
} from "@helios-lang/uplc";
import { decodeCborToJson } from "@koralabs/kora-labs-common";

import { MarketplaceDatum, Parameters, Payout } from "./types.js";

const buildDatumTag = (outputRef: TxOutputId): InlineTxOutputDatum => {
  const cbor = outputRef.toUplcData().toCbor();
  const hashed = blake2b(cbor);
  return makeInlineTxOutputDatum(makeByteArrayData(hashed));
};

const buildDatum = (datum: MarketplaceDatum): InlineTxOutputDatum => {
  const data = makeListData([
    makeListData(
      datum.payouts.map((payout) =>
        makeListData([
          makeByteArrayData(decodeAddress(payout.address).bytes),
          makeIntData(payout.amountLovelace),
        ])
      )
    ),
    makeByteArrayData(hexToBytes(datum.owner)),
  ]);
  return makeInlineTxOutputDatum(data);
};

const buildParametersDatum = (parameters: Parameters): InlineTxOutputDatum => {
  const { authorizers, marketplaceAddress } = parameters;
  const data = makeListData([
    makeListData(
      authorizers.map((authorizer) => makeByteArrayData(hexToBytes(authorizer)))
    ),
    makeByteArrayData(decodeAddress(marketplaceAddress).bytes),
  ]);
  return makeInlineTxOutputDatum(data);
};

const decodeDatum = async (
  datum: InlineTxOutputDatum
): Promise<MarketplaceDatum> => {
  const datumDataCborHex = bytesToHex(datum.data.toCbor());
  const decoded = await decodeCborToJson({
    cborString: datumDataCborHex,
  });

  const owner = makePubKeyHash(decoded[1].slice(2)).toHex();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payouts: Payout[] = decoded[0].map((rawPayout: any) => {
    const address = makeAddress(rawPayout[0].slice(2)).toBech32();
    const amountLovelace = BigInt(rawPayout[1]) as bigint;
    return { address, amountLovelace } as Payout;
  });

  return {
    payouts,
    owner,
  };
};

const decodeParametersDatum = async (cbor: string): Promise<Parameters> => {
  const decoded = await decodeCborToJson({
    cborString: cbor,
  });

  const authorizers: string[] = decoded[0].map((item: string) => item.slice(2));
  const marketplaceAddress = makeAddress(decoded[1].slice(2)).toBech32();

  return {
    authorizers,
    marketplaceAddress,
  };
};

const buildDatumForSCParameters = (
  marketplaceAddress: Address,
  authorizers: PubKeyHash[]
) => {
  const data = makeListData([
    makeByteArrayData(marketplaceAddress.bytes),
    makeListData(
      authorizers.map((authorizer) => makeByteArrayData(authorizer.bytes))
    ),
  ]);
  return makeInlineTxOutputDatum(data);
};

export {
  buildDatum,
  buildDatumForSCParameters,
  buildDatumTag,
  buildParametersDatum,
  decodeDatum,
  decodeParametersDatum,
};
