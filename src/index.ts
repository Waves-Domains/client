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

const INVOKE_TX_TYPE = 16;
const INVOKE_FUNCTION_BID = 'bid';
const CONTRACT_ADDRESS = '';
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
      'mainnet': PROD_HOST,
      'testnet': TEST_HOST,
      'stagenet': STAGE_HOST,
    }

    this.config = {
      version: 2,
      type: 16,
      HOST: HOST_ENTRIES[config.network],
      AUCTION_DURANCE,
      CONTRACT_ADDRESS,
      ...config,
    };
  }

  async lookup(name: string) {
    try {
      const response = await fetch(
        `${this.config.HOST}/utils/script/evaluate/${CONTRACT_ADDRESS}`,
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

  private convertNumber(n: Long) {
    const maxJsNumber = 2 ** 53 - 1;

    return n.toNumber() > maxJsNumber ? n.toString() : n.toNumber();
  }

  async makeBidTx(name: string, amount: Long, auctionId: number) {
    try {
      const nameBytes = libCrypto.stringToBytes(name);
      const amountBytes = libCrypto.stringToBytes(`${this.convertNumber(amount)}`);
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

  async reverseLookup(address: string) {
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

  async getCurrentAuctionId() {
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

  private logger = (error: unknown) => {
    console.log('wns-js-library error:', error);
  };
}

export default WavesNameService;
