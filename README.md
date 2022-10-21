# @waves-domains/client

## Overview

Waves Domains is a naming service on the Waves blockchain.

`wns-js-library` is a JavaScript library for Waves Domains. The library features obtaining blockchain address for a certain domain name (lookup) as well as to auction for domains.

⚠ The library is intended to work only in a browser, not on a server / in Node.js.

`wns-js-library` provides find the following functions:

- [lookup](#lookup)
- [getCurrentAuctionId](#getcurrentauctionid)
- [makeBidTx](#makebidtx)

## Getting Started

To install `wns-js-library`, use

```bash
npm i @waves-domains/client
```

Add library initialization to your app.

For Mainnet:

```javascript
import { WavesNameService } from '@waves-domains/client';

const wns = new WavesNameService({
  network: 'mainnet',
  // Specify the address of the root registrar of Waves Domains
  CONTRACT_ADDRESS: '3P....',
});
```

For Testnet:

```javascript
import { WavesNameService } from '@waves-domains/client';

const wns = new WavesNameService();
```

## Functions

### lookup

Returns the assigned blockchain address for a certain domain.

Usage:

```javascript
const address = await wns.lookup('some-name.waves');
```

### getCurrentAuctionId

Returns an ID and phase of currently active auction.

Usage:

```javascript
const data = await wns.getAuction();

const { auctionId, phase, bidStart, revealStart, auctionEnd } = data;
```

### makeBidTx

Returns transaction object that can be sent to [Signer](https://docs.waves.tech/en/building-apps/waves-api-and-sdk/client-libraries/signer#create-transactions).

Parameters:

- `name: string` — desired name.
- `amount: string|number| BigInt` — bid in WAVES.
- `auctionId: number` — auction ID.

The current auction ID can be obtained by the `getCurrentAuctionId()` function. Note that placing a bid is only allowed in the bid phase of the auction.

Usage:

```javascript
const invokeTx = await wns.makeBidTx('some-name', 12.75, 127);
```
