import libCrypto from '@waves/ts-lib-crypto';
import Long from 'long';

type EvaluateResponse = {
  address: string;
  expr: string;
  result: {
    type: string;
    value: string;
  };
};

type NumEntry = string | number | BigInt;

const INVOKE_TX_TYPE = 16;
const INVOKE_FUNCTION_BID = 'bid';
const CONTRACT_ADDRESS = '3MxssetYXJfiGwzo9pqChsSwYj3tCYq5FFH';
const PROD_HOST = 'https://nodes-keeper.wavesnodes.com/';
const TEST_HOST = 'https://nodes-testnet.wavesnodes.com/';
const STAGE_HOST = 'https://nodes-stagenet.wavesnodes.com/';
const AUCTION_DURANCE = 518400000;

interface Config {
  dApp: string;
  version?: number;
  type?: number;
  network: 'mainnet' | 'testnet' | 'stagenet';
  HOST?: string;
  AUCTION_DURANCE?: string;
  CONTRACT_ADDRESS?: number;
}

export class WavesNameService {
  config: Config;

  constructor(config) {
    const HOST_ENTRIES = {
      mainnet: PROD_HOST,
      testnet: TEST_HOST,
      stagenet: STAGE_HOST,
    };

    this.config = {
      version: 2,
      type: 16,
      HOST: HOST_ENTRIES[config.network] || HOST_ENTRIES['testnet'],
      AUCTION_DURANCE,
      CONTRACT_ADDRESS,
      ...config,
    };
  }

  private isNaturalNumber(value: NumEntry) {
    const n = value.toString();
    var n1 = Math.abs(+n),
      n2 = parseInt(n, 10);
    return !isNaN(n1) && n2 === n1 && n1.toString() === n;
  }

  private validate({
    value,
    type,
  }: {
    value: string | NumEntry;
    type: 'name' | 'amount';
  }) {
    switch (type) {
      case 'name':
        return (value as string).match(/[a-z0-9_]/g);
      case 'amount':
        return this.isNaturalNumber(value);
      default:
        return true;
    }
  }

  private getLong(n: NumEntry) {
    if (
      typeof n === 'string' ||
      (typeof n === 'bigint' && typeof n !== 'number')
    ) {
      return Long.fromString(n.toString());
    }

    return Long.fromNumber(n as number);
  }

  private logger = (error: unknown, value?: unknown) => {
    console.error(
      'wns-js-library error: ',
      error,
      value ? ' value: ' + value : ''
    );
  };

  public async lookup(name: string) {
    try {
      const response = await fetch(
        `${this.config.HOST}/utils/script/evaluate/${this.config.CONTRACT_ADDRESS}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `lookup(${name})`,
          }),
        }
      );

      if (!response.ok) {
        this.logger(Error(`${response.status}`));
        return null;
      }

      return (await response.json()) as EvaluateResponse;
    } catch (err) {
      this.logger(err);
    }

    return null;
  }

  public async makeBidTx(name: string, amount: NumEntry, auctionId: number) {
    if (!this.validate({ value: name, type: 'name' })) {
      this.logger(Error('name is not valid'), name);
      return null;
    }
    if (!this.validate({ value: amount, type: 'amount' })) {
      this.logger(Error('amount is not valid'), amount);
      return null;
    }

    try {
      const amountArrayNumbers = this.getLong(amount);
      const amountArrayBytes = amountArrayNumbers.toBytes();
      const amountBytes = Uint8Array.from(amountArrayBytes);
      const nameBytes = libCrypto.stringToBytes(name);
      const hash = libCrypto.blake2b(
        libCrypto.keccak(libCrypto.concat(amountBytes, nameBytes))
      );

      const encoded58hash = libCrypto.base58Encode(hash);

      return {
        type: INVOKE_TX_TYPE,
        version: this.config.version,
        dApp: this.config.dApp,
        call: {
          function: INVOKE_FUNCTION_BID,
          args: [
            {
              type: 'integer',
              value: auctionId,
            },
            {
              type: 'string',
              value: `${encoded58hash}`,
            },
          ],
        },
        payments: [
          {
            amount,
            assetId: null,
          },
        ],
      };
    } catch (error) {
      this.logger(error);
    }

    return null;
  }

  public async reverseLookup(address: string) {
    try {
      const response = await fetch(
        `${this.config.HOST}utils/script/evaluate/${CONTRACT_ADDRESS}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `reverseLookup(${address})`,
          }),
        }
      );

      if (!response.ok) {
        this.logger(`${response.status}`);

        return null;
      }

      return await response.json();
    } catch (err) {
      this.logger(err);
    }

    return null;
  }

  public async getCurrentAuctionId() {
    try {
      const response = await fetch(
        `${this.config.HOST}/addresses/data/${this.config.CONTRACT_ADDRESS}/init_timestamp`
      );
      if (!response.ok) {
        this.logger(Error(`${response.status}`));
        return null;
      }

      const firstAuctionTimestamp = await response.json();
      const currentTimeStamp = Date.now();
      const auctionDifference = currentTimeStamp - firstAuctionTimestamp;
      const auctionId = Math.floor(auctionDifference / AUCTION_DURANCE);
      return auctionId;
    } catch (error) {
      this.logger(error);
    }

    return null;
  }
}

export default WavesNameService;
