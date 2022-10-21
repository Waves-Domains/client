# @waves-domains/client

## Overview

[Waves Domains](https://waves.domains/) is a naming service on the Waves
blockchain.

`@waves-domains/client` is a JavaScript library that provides
functions to interact with that service.

## Getting Started

First, install it using npm:

```sh
npm i @waves-domains/client
```

or using yarn:

```sh
yarn add @waves-domains/client
```

Next, create an instance of `WavesDomainsClient` for the network you're planning
to work with:

Mainnet:

```javascript
import { WavesDomainsClient } from '@waves-domains/client';

const client = new WavesDomainsClient();
```

Testnet:

```javascript
import { WavesDomainsClient } from '@waves-domains/client';

const client = new WavesDomainsClient({ network: 'testnet' });
```

## API

`WavesDomainsClient` has the following methods:

- [resolve](#resolve)
- [whoIs](#whois)

### resolve

Returns the assigned blockchain address for a certain domain as a string, if it
exists, otherwise it returns `null`:

```javascript
const address = await client.resolve('test.waves');

console.log(address);
// 3NBKzyQx8pAvaR444dDKuJT397DAdXURPLQ
```

### whoIs

Returns additional info about name:

```javascript
const whoIsResult = await client.whoIs('test.waves');

console.log(whoIsResult);
/*
{
  createdAt: 10000000,
  expiresAt: 31546000000,
  owner: '3NBKzyQx8pAvaR444dDKuJT397DAdXURPLQ',
  resolver: null,
  status: 'REGISTERED'
}
*/
```

`status` can be either `'REGISTERED'` or `'NOT_REGISTERED'`, you can also use
`WhoIsStatus` enum to avoid typos:

```javascript
import { WhoIsStatus } from '@waves-domains/client';

if (whoIsResult.status === WhoIsStatus.Registered) {
  console.log('It is registered');
}

if (whoIsResult.status === WhoIsStatus.NotRegistered) {
  console.log('It is not registered');
}
```
