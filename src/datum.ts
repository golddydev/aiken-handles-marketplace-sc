import { blake2b } from "@helios-lang/crypto";
import {
  Address,
  decodeTxOutputDatum,
  InlineTxOutputDatum,
  makeAddress,
  makeInlineTxOutputDatum,
  PubKeyHash,
  TxOutputId,
} from "@helios-lang/ledger";
import {
  expectByteArrayData,
  expectIntData,
  expectListData,
  makeByteArrayData,
  makeIntData,
  makeListData,
} from "@helios-lang/uplc";

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
          makeByteArrayData(makeAddress(payout.address).bytes),
          makeIntData(payout.amountLovelace),
        ])
      )
    ),
    makeByteArrayData(datum.owner),
  ]);
  return makeInlineTxOutputDatum(data);
};

const decodeDatum = (datum: InlineTxOutputDatum): MarketplaceDatum => {
  const data = datum.data;
  const listData = expectListData(data, "Datum must be List");
  const payoutsData = expectListData(
    listData.items[0],
    "Payouts Data must be List"
  );
  const ownerData = expectByteArrayData(
    listData.items[1],
    "Owner Data must be ByteArray"
  );

  const payouts = payoutsData.items.map((itemData) => {
    const payoutData = expectListData(itemData, "Payout Data must be List");
    const addressData = expectByteArrayData(
      payoutData.items[0],
      "Payout Address must be ByteArray"
    );
    const amountData = expectIntData(
      payoutData.items[1],
      "Amount Data must be Int"
    );
    return {
      address: makeAddress(addressData).toBech32(),
      amountLovelace: amountData.value,
    } as Payout;
  });

  return {
    payouts,
    owner: ownerData.toHex(),
  };
};

const buildSCParametersDatum = (
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

const decodeSCParametersDatum = (cbor: string): Parameters => {
  const decoded = decodeTxOutputDatum(cbor);
  if (!decoded.data) throw new Error("Parameter Datum Cbor is not correct");
  const listData = expectListData(decoded.data, "Parameter Datum must be List");
  const marketplaceAddressData = expectByteArrayData(
    listData.items[0],
    "Marketplace Address Data must be ByteArray"
  );
  const authorizersData = expectListData(
    listData.items[1],
    "Authorizers Data must be List"
  );

  const marketplaceAddress = makeAddress(marketplaceAddressData).toBech32();
  const authorizers: string[] = authorizersData.items.map((item) =>
    expectByteArrayData(item, "Authorizer Data must be ByteArray").toHex()
  );

  return {
    marketplaceAddress,
    authorizers,
  };
};

export {
  buildDatum,
  buildDatumTag,
  buildSCParametersDatum,
  decodeDatum,
  decodeSCParametersDatum,
};
