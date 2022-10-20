interface EvaluateResponse {
  address: string;
  expr: string;
  result: {
    type: string;
    value: string;
  };
}

export interface WhoIsData {
  registrantAddress: string;
  resolverAddress: string;
  createdAt: string;
  expiresAt: string;
  status: 'REGISTERED' | 'NOT_REGISTERED';
}

interface NetworkConfig {
  contractAddress: string;
  nodeBaseUrl: string;
  rootRegistrarAddress: string;
}

const NETWORK_CONFIGS: Record<'mainnet' | 'testnet', NetworkConfig> = {
  mainnet: {
    contractAddress: '',
    nodeBaseUrl: 'https://nodes.wavesnodes.com',
    rootRegistrarAddress: '',
  },
  testnet: {
    contractAddress: '3MxssetYXJfiGwzo9pqChsSwYj3tCYq5FFH',
    nodeBaseUrl: 'https://nodes-testnet.wavesnodes.com',
    rootRegistrarAddress: '3MvCgypmBZFTRqL5HuRwCgS7maC7Fkv7pZY',
  },
};

export interface WavesNameServiceConfig {
  network?: keyof typeof NETWORK_CONFIGS;
}

export class WavesNameService {
  #config: NetworkConfig;

  constructor({ network = 'mainnet' }: WavesNameServiceConfig = {}) {
    this.#config = NETWORK_CONFIGS[network];
  }

  #checkEmptyUint(value: string | number | object) {
    return typeof value === 'object' && !Object.keys(value).length
      ? null
      : value;
  }

  #logger = (error: unknown, value?: unknown) => {
    console.error(
      'wns-js-library error: ',
      error,
      value ? ' value: ' + value : ''
    );
  };

  async lookup(name: string) {
    try {
      const response = await fetch(
        new URL(
          `/utils/script/evaluate/${this.#config.contractAddress}`,
          this.#config.nodeBaseUrl
        ),
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `whoIs(${name})`,
          }),
        }
      );

      if (!response.ok) {
        this.#logger(Error(`${response.status}`));
        return null;
      }

      return (await response.json()) as EvaluateResponse;
    } catch (err) {
      this.#logger(err);
    }

    return null;
  }

  async reverseLookup(address: string) {
    try {
      const response = await fetch(
        new URL(
          `/utils/script/evaluate/${this.#config.contractAddress}`,
          this.#config.nodeBaseUrl
        ),
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `reverseLookup(${address})`,
          }),
        }
      );

      if (!response.ok) {
        this.#logger(`${response.status}`);

        return null;
      }

      return await response.json();
    } catch (err) {
      this.#logger(err);
    }

    return null;
  }

  async evaluateScript(
    expr: string,
    dApp: string = this.#config.contractAddress
  ) {
    const requestUrl = new URL(
      `/utils/script/evaluate/${dApp}`,
      this.#config.nodeBaseUrl
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
      this.#logger(`${response.status}`);

      return null;
    }

    return await response.json();
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async whoIs(name: string, domain: string): Promise<WhoIsData | {}> {
    try {
      const data = await this.evaluateScript(
        `whoIs("${name}${domain}")`,
        this.#config.rootRegistrarAddress
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
        registrantAddress: this.#checkEmptyUint(registrantAddress),
        resolverAddress: this.#checkEmptyUint(resolverAddress),
        createdAt: this.#checkEmptyUint(createdAt),
        expiresAt: this.#checkEmptyUint(expiresAt),
        status: this.#checkEmptyUint(registrantAddress)
          ? 'REGISTERED'
          : 'NOT_REGISTERED',
      };
    } catch (error) {
      this.#logger(error);
      throw error;
    }
  }

  async available(name: string, domain: string): Promise<WhoIsData> {
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
        status: this.#checkEmptyUint(isAvailable)
          ? 'REGISTERED'
          : 'NOT_REGISTERED',
      };
    } catch (error) {
      this.#logger(error);
      throw error;
    }
  }
}

export default WavesNameService;
