import * as libCrypto from '@waves/ts-lib-crypto';
import Long from 'long';

type EvaluateResponse = {
  address: string;
  expr: string;
  result: {
    type: string;
    value: string;
  };
};

interface GetNftsItem {
  assetId: string;
  decimals: 0;
  description: string;
  issueHeight: number;
  issueTimestamp: number;
  issuer: string;
  issuerPublicKey: string;
  minSponsoredAssetFee: null;
  name: string;
  originTransactionId: string;
  quantity: 1;
  reissuable: false;
  scripted: boolean;
}

type GetNftsResponse = GetNftsItem[];

export interface NameEntry {
  name: string;
}

type NumEntry = string | number | BigInt;

const INVOKE_TX_TYPE = 16;
const INVOKE_FUNCTION_BID = 'bid';
const CONTRACT_ADDRESS = '3MxssetYXJfiGwzo9pqChsSwYj3tCYq5FFH';
const REGISTRAR_ADDRESS = '3NA73oUXjqp7SpudXWV1yMFuKm9awPbqsVz';
const ROOT_RESOLVER_ADDRESS = '3MwsyDjSTFfcbxaGnwD9YLMMfXSu4K74HT9';
const PROD_HOST = 'https://nodes-keeper.wavesnodes.com';
const TEST_HOST = 'https://nodes-testnet.wavesnodes.com';
const STAGE_HOST = 'https://nodes-stagenet.wavesnodes.com';
const AUCTION_DURATION = 518400000;
const INIT_TIMESTAMP = 1664125224707;
const REVEAL_DURATION = 180000;
const BID_DURATION = 180000;

export interface AuctionData {
  auctionId: number;
  phase: 'BID' | 'REVEAL';
  bidStart: string;
  revealStart: string;
  auctionEnd: string;
}

export interface WhoIsData {
  registrantAddress: string;
  resolverAddress: string;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
}

interface Config {
  version?: number;
  type?: number;
  network?: 'mainnet' | 'testnet' | 'stagenet';
  HOST?: string;
  AUCTION_DURATION: number;
  CONTRACT_ADDRESS: string;
  ROOT_RESOLVER_ADDRESS: string;
  REVEAL_DURATION: number;
  INIT_TIMESTAMP: number;
  BID_DURATION: number;
}

const HOST_ENTRIES = {
  mainnet: PROD_HOST,
  testnet: TEST_HOST,
  stagenet: STAGE_HOST,
};

export class WavesNameService {
  config: Config;

  constructor(config: Partial<Config> = {}) {
    this.config = {
      version: 2,
      type: 16,
      HOST: HOST_ENTRIES[config.network || 'testnet'],
      AUCTION_DURATION,
      CONTRACT_ADDRESS,
      ROOT_RESOLVER_ADDRESS,
      REVEAL_DURATION,
      INIT_TIMESTAMP,
      BID_DURATION,
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
            expr: `whoIs(${name})`,
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

      const bidTx = {
        type: INVOKE_TX_TYPE,
        version: this.config.version,
        dApp: this.config.CONTRACT_ADDRESS,
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
        payment: [
          {
            amount,
            assetId: null,
          },
        ],
      };

      return { bidTx, hash: encoded58hash }
    } catch (error) {
      this.logger(error);
    }

    return {};
  }

  public async reverseLookup(address: string) {
    try {
      const response = await fetch(
        `${this.config.HOST}/utils/script/evaluate/${this.config.CONTRACT_ADDRESS}`,
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

  async evaluateScript(expr: string, dApp: string = this.config.CONTRACT_ADDRESS) {
    const requestUrl = new URL(
      `/utils/script/evaluate/${dApp}`,
      this.config.HOST
    );

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expr }),
    });

    if (!response.ok) {
      this.logger(`${response.status}`);

      return null;
    }

    return await response.json();
  }

  public async getAuction(): Promise<AuctionData | null> {
    try {
      const response = await this.evaluateScript('getAuction()');

      const {
        result: {
          value: {
            _1: { value: auctionId },
            _2: { value: phase },
            _3: { value: bidStart },
            _4: { value: revealStart },
            _5: { value: auctionEnd },
          },
        },
      } = response;

      return {
        auctionId,
        phase,
        bidStart,
        revealStart,
        auctionEnd,
      };
    } catch (err) {
      this.logger(err);
    }

    return null;
  }

  public async getBlockchainTimestamp() {
    try {
      const response = await fetch(`${this.config.HOST}/blocks/headers/last`);
      let result = await response.json();
      return result.timestamp;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public getStatus(auctionId: number, blockchainTimestamp: number) {
    let currentPeriodStart =
      auctionId * (this.config.BID_DURATION + this.config.REVEAL_DURATION) +
      this.config.INIT_TIMESTAMP;
    let currentAuctionTime = blockchainTimestamp - currentPeriodStart;
    let period = currentAuctionTime > BID_DURATION ? 'reveal' : 'bid';

    return period;
  }

  public async getNamesOwnedBy(address: string) {
    const nfts = await fetch(
      `${this.config.HOST}/assets/nft/${address}/limit/1000`
    ).then<GetNftsResponse>((response) => response.json());

    return nfts
      .filter((nft) => nft.issuer === REGISTRAR_ADDRESS)
      .map(
        (nft): NameEntry => ({
          name: nft.description,
        })
      );
  }

  public async whoIs(name: string, domain: string): Promise<WhoIsData> {
    try {
      const data = await this.evaluateScript(`whoIs(${name}${domain})`, this.config.ROOT_RESOLVER_ADDRESS);
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async reveal(auctionId: number, name: string, bidAmount: string) {
    try {
      const data = await this.evaluateScript(`reveal(${auctionId}, ${name}, ${bidAmount})`);
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async refund(auctionId: number, hashes: string[]) {
    try {
      const data = await this.evaluateScript(`finalize(${auctionId}, ${hashes})`);
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async claimNFT(name: string, walletAddress: string, createdAt: string) {
    try {
      const data = await this.evaluateScript(`registrer.addName(${name}, ${walletAddress}, ${createdAt})`);
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async reclaim(name: string) {
    try {
      const data = await this.evaluateScript(`registrer.reclaim(${name})`);
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }
}

export default WavesNameService;
