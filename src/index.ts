import libCrypto from '@waves/ts-lib-crypto';

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
const HOST = 'https://nodes-keeper.wavesnodes.com/';
const AUCTION_DURANCE = 518400000;

interface Config {
  dApp: string;
  version?: number;
  type?: number;
}

export class WavesNameService {
  config: Config;

  constructor(config) {
    this.config = {
      version: 2,
      type: 16,
      auctionDurance: 518400000,
      ...config,
    };
  }

  async lookup(name: string) {
    try {
      const response = await fetch(
        `${HOST}/utils/script/evaluate/${CONTRACT_ADDRESS}`,
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

  async makeBidTx(
    name: string,
    amount: BigInt | number | string,
    auctionId: number
  ) {
    try {
      const { address } = libCrypto.crypto({ output: 'Bytes' });
      const nameBytes = address(name);
      const amountBytes = address(amount);
      const hash = libCrypto.blake2b(
        libCrypto.keccak(nameBytes(amountBytes + nameBytes))
      );

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
              value: `${hash}`,
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
        `${HOST}utils/script/evaluate/${CONTRACT_ADDRESS}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `reverseLookup(${address})`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.log(err);
    }

    return null;
  }

  async getCurrentAuctionId() {
    try {
      const response = await fetch(
        `${HOST}/addresses/data/${CONTRACT_ADDRESS}/init_timestamp`
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
