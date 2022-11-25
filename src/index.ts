import { extractSEItemValue, SETuple } from './utils';

type EvaluateResponse = { address: string; expr: string } & (
  | { complexity: number; result: SETuple }
  | { error: number; message: string }
);

export enum WhoIsStatus {
  Registered = 'REGISTERED',
  NotRegistered = 'NOT_REGISTERED',
}

export interface WhoIsResult {
  createdAt: number | null;
  expiresAt: number | null;
  owner: string | null;
  resolver: string | null;
  tokenId: string | null;
  status: WhoIsStatus;
}

interface NetworkConfig {
  nodeBaseUrl: string;
  rootRegistryAddress: string;
}

const NETWORK_CONFIGS: Record<'mainnet' | 'testnet', NetworkConfig> = {
  mainnet: {
    nodeBaseUrl: 'https://nodes.wavesnodes.com',
    rootRegistryAddress: '3P24S1EVZadwzmfKSNWUZyLjjqp5DcHY4hE',
  },
  testnet: {
    nodeBaseUrl: 'https://nodes-testnet.wavesnodes.com',
    rootRegistryAddress: '3MvCgypmBZFTRqL5HuRwCgS7maC7Fkv7pZY',
  },
};

export interface WavesDomainsClientConfig {
  network?: keyof typeof NETWORK_CONFIGS;
}

type ResolveEvaluateResult = [actions: [], callbackData: string | null];

type WhoIsEvaluateResult = [
  actions: [],
  returnValue: [
    owner: string | null,
    resolver: string | null,
    createdAt: string | null,
    expiresAt: string | null,
    tokenId: string | null
  ]
];

export class WavesDomainsClient {
  #config: NetworkConfig;

  constructor({ network = 'mainnet' }: WavesDomainsClientConfig = {}) {
    this.#config = NETWORK_CONFIGS[network];
  }

  async #evaluate<Values>(dApp: string, expression: string) {
    const response = await fetch(
      new URL(`/utils/script/evaluate/${dApp}`, this.#config.nodeBaseUrl),
      {
        method: 'POST',
        headers: {
          accept: 'application/json; large-significand-format=string',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ expr: expression }),
      }
    );

    if (!response.ok) {
      throw new Error(`Evaluate script failed: ${await response.text()}`);
    }

    const json: EvaluateResponse = await response.json();

    if ('error' in json) {
      throw new Error(json.message);
    }

    return extractSEItemValue(json.result) as Values;
  }

  async resolve(
    name: string,
    interfaceId:
      | 'owner'
      | 'resolver'
      | 'createdAt'
      | 'expiresAt'
      | 'tokenId' = 'owner'
  ) {
    const [, callbackData] = await this.#evaluate<ResolveEvaluateResult>(
      this.#config.rootRegistryAddress,
      `resolve(${JSON.stringify(name)}, ${JSON.stringify(interfaceId)}, nil)`
    );

    return callbackData;
  }

  async whoIs(name: string): Promise<WhoIsResult> {
    const [, [owner, resolver, createdAt, expiresAt, tokenId]] =
      await this.#evaluate<WhoIsEvaluateResult>(
        this.#config.rootRegistryAddress,
        `whoIs(${JSON.stringify(name)})`
      );

    return {
      createdAt: createdAt == null ? null : Number(createdAt),
      expiresAt: expiresAt == null ? null : Number(expiresAt),
      owner,
      resolver,
      tokenId,
      status: owner ? WhoIsStatus.Registered : WhoIsStatus.NotRegistered,
    };
  }
}
