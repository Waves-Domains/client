import * as libCrypto from '@waves/ts-lib-crypto';
import {
  DataTransactionEntry,
  DataTransactionEntryString,
} from '@waves/ts-types';
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

interface NameDetails {
  createdAt: number;
  expiresAt: number;
  token: string;
}

export interface NameEntry extends NameDetails {
  name: string;
}

type NumEntry = string | number | bigint;

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
  status: 'REGISTERED' | 'NOT_REGISTERED';
}

interface NetworkConfig {
  auctionDuration: number;
  bidDuration: number;
  contractAddress: string;
  initTimestamp: number;
  nodeBaseUrl: string;
  registrarAddress: string;
  revealDuration: number;
  rootRegistrarAddress: string;
  rootResolverAddress: string;
}

const NETWORK_CONFIGS: Record<'mainnet' | 'testnet', NetworkConfig> = {
  mainnet: {
    auctionDuration: 518400000,
    bidDuration: 180000,
    contractAddress: '',
    initTimestamp: 1664125224707,
    nodeBaseUrl: 'https://nodes.wavesnodes.com',
    registrarAddress: '',
    revealDuration: 180000,
    rootRegistrarAddress: '',
    rootResolverAddress: '',
  },
  testnet: {
    auctionDuration: 518400000,
    bidDuration: 180000,
    contractAddress: '3MxssetYXJfiGwzo9pqChsSwYj3tCYq5FFH',
    initTimestamp: 1664125224707,
    nodeBaseUrl: 'https://nodes-testnet.wavesnodes.com',
    registrarAddress: '3NA73oUXjqp7SpudXWV1yMFuKm9awPbqsVz',
    revealDuration: 180000,
    rootRegistrarAddress: '3MvCgypmBZFTRqL5HuRwCgS7maC7Fkv7pZY',
    rootResolverAddress: '3MwsyDjSTFfcbxaGnwD9YLMMfXSu4K74HT9',
  },
};

export interface WavesNameServiceConfig {
  network?: keyof typeof NETWORK_CONFIGS;
}

export class WavesNameService {
  config: NetworkConfig;

  constructor({ network = 'mainnet' }: WavesNameServiceConfig = {}) {
    this.config = NETWORK_CONFIGS[network];
  }

  private isNaturalNumber(value: NumEntry) {
    const n = value.toString();
    const n1 = Math.abs(+n),
      n2 = parseInt(n, 10);
    return !isNaN(n1) && n2 === n1 && n1.toString() === n;
  }

  private checkEmptyUint(value: string | number | object) {
    return typeof value === 'object' && !Object.keys(value).length
      ? null
      : value;
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
        new URL(
          `/utils/script/evaluate/${this.config.contractAddress}`,
          this.config.nodeBaseUrl
        ),
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
        type: 16,
        version: 2,
        dApp: this.config.contractAddress,
        call: {
          function: 'bid',
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

      return { bidTx, hash: encoded58hash };
    } catch (error) {
      this.logger(error);
    }

    return {};
  }

  public async reverseLookup(address: string) {
    try {
      const response = await fetch(
        new URL(
          `/utils/script/evaluate/${this.config.contractAddress}`,
          this.config.nodeBaseUrl
        ),
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

  async evaluateScript(
    expr: string,
    dApp: string = this.config.contractAddress
  ) {
    const requestUrl = new URL(
      `/utils/script/evaluate/${dApp}`,
      this.config.nodeBaseUrl
    );

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
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
      const response = await fetch(
        new URL('/blocks/headers/last', this.config.nodeBaseUrl)
      );
      const result = await response.json();
      return result.timestamp;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public getStatus(auctionId: number, blockchainTimestamp: number) {
    const currentPeriodStart =
      auctionId * (this.config.bidDuration + this.config.revealDuration) +
      this.config.initTimestamp;
    const currentAuctionTime = blockchainTimestamp - currentPeriodStart;
    const period =
      currentAuctionTime > this.config.bidDuration ? 'reveal' : 'bid';

    return period;
  }

  private async getNfts(address: string) {
    const response = await fetch(
      new URL(`/assets/nft/${address}/limit/1000`, this.config.nodeBaseUrl)
    );

    if (!response.ok) {
      throw new Error(
        `Could not fetch nfts (${response.status} ${
          response.statusText
        }): ${await response.text()}`
      );
    }

    const nfts: GetNftsItem[] = await response.json();

    return nfts;
  }

  private async getRegistrarNamesFromNfts(nfts: GetNftsItem[]) {
    const registrarNfts = nfts.filter(
      nft => nft.issuer === this.config.registrarAddress
    );

    if (registrarNfts.length === 0) {
      return [];
    }

    const response = await fetch(
      new URL(
        `/addresses/data/${this.config.registrarAddress}`,
        this.config.nodeBaseUrl
      ),
      {
        method: 'POST',
        headers: {
          accept: 'application/json; large-significand-format=string',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          keys: registrarNfts.map(nft => `Token_${nft.assetId}_name`),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not fetch registrar token entries (${response.status} ${
          response.statusText
        }): ${await response.text()}`
      );
    }

    const dataEntries: DataTransactionEntryString[] = await response.json();

    return dataEntries.map(entry => entry.value);
  }

  private async getRegistrarNamesDetails(names: string[]) {
    if (names.length === 0) {
      return {};
    }

    const createdAtKey = (name: string) => `Name_${name}_createdAt`;
    const expiresAtKey = (name: string) => `Name_${name}_expiresAt`;
    const tokenKey = (name: string) => `Name_${name}_token`;

    const response = await fetch(
      new URL(
        `/addresses/data/${this.config.registrarAddress}`,
        this.config.nodeBaseUrl
      ),
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          keys: names.flatMap(name => [
            createdAtKey(name),
            expiresAtKey(name),
            tokenKey(name),
          ]),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not fetch names details (${response.status} ${
          response.statusText
        }): ${await response.text()}`
      );
    }

    const dataEntries: DataTransactionEntry<number>[] = await response.json();

    const entriesRecord = Object.fromEntries(
      dataEntries.map(entry => [entry.key, entry.value])
    );

    return Object.fromEntries(
      names.map((name): [string, NameDetails] => [
        name,
        {
          createdAt: Number(entriesRecord[createdAtKey(name)]),
          expiresAt: Number(entriesRecord[expiresAtKey(name)]),
          token: String(entriesRecord[tokenKey(name)]),
        },
      ])
    );
  }

  public async getNamesOwnedBy(address: string) {
    const nfts = await this.getNfts(address);
    const registrarNames = await this.getRegistrarNamesFromNfts(nfts);
    const namesDetails = await this.getRegistrarNamesDetails(registrarNames);

    return registrarNames.map(
      (name): NameEntry => ({
        name,
        ...namesDetails[name],
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public async whoIs(name: string, domain: string): Promise<WhoIsData | {}> {
    try {
      const data = await this.evaluateScript(
        `whoIs("${name}${domain}")`,
        this.config.rootRegistrarAddress
      );

      if (data.error) {
        throw new Error(data.error);
      }

      const {
        result: {
          value: {
            _2: {
              value: {
                _1: { value: registrantAddress },
                _2: { value: resolverAddress },
                _3: { value: createdAt },
                _4: { value: expiresAt },
              },
            },
          },
        },
      } = data;

      return {
        registrantAddress: this.checkEmptyUint(registrantAddress),
        resolverAddress: this.checkEmptyUint(resolverAddress),
        createdAt: this.checkEmptyUint(createdAt),
        expiresAt: this.checkEmptyUint(expiresAt),
        status: this.checkEmptyUint(registrantAddress)
          ? 'REGISTERED'
          : 'NOT_REGISTERED',
      };
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async reveal(
    auctionId: number,
    name: string,
    domain: string,
    bidAmount: string
  ) {
    try {
      const data = await this.evaluateScript(
        `reveal(${auctionId}, "${name}${domain}", ${bidAmount})`
      );
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async refund(auctionId: number, hashes: string[]) {
    try {
      const data = await this.evaluateScript(
        `finalize(${auctionId}, ${hashes})`
      );
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async available(name: string, domain: string): Promise<WhoIsData> {
    try {
      const data = await this.evaluateScript(`available("${name}${domain}")`);

      if (data.error) {
        throw new Error(data.error);
      }

      const {
        result: {
          value: {
            _2: { value: isAvailable },
          },
        },
      } = data;

      return {
        registrantAddress: '',
        resolverAddress: '',
        createdAt: '',
        expiresAt: '',
        status: this.checkEmptyUint(isAvailable)
          ? 'REGISTERED'
          : 'NOT_REGISTERED',
      };
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async claimNFT(
    name: string,
    domain: string,
    walletAddress: string,
    createdAt: string
  ) {
    try {
      const data = await this.evaluateScript(
        `addName("${name}${domain}", ${walletAddress}, ${createdAt})`
      );
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }

  public async reclaim(name: string, domain: string) {
    try {
      const data = await this.evaluateScript(`reclaim("${name}${domain}")`);
      return data;
    } catch (error) {
      this.logger(error);
      throw error;
    }
  }
}

export default WavesNameService;
