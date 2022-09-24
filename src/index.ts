import fetch from 'node-fetch';

type EvaluateResponse = {
  address: string;
  expr: string;
  result: {
    type: string;
    value: string;
  }
};

const CONTRACT_ADDRESS = '';
const HOST = 'https://nodes-keeper.wavesnodes.com/';

export class WavesNameService {
  async lookup(name: string) {
    try {
      const response = await fetch(`${HOST}utils/script/evaluate/${CONTRACT_ADDRESS}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `lookup(${name})`
          })
        },);

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

      return (await response.json()) as EvaluateResponse;
    } catch (err) {
      console.log(err);
    }

    return null;
  }

  async reverseLookup(address: string) {
    try {
      const response = await fetch(`${HOST}utils/script/evaluate/${CONTRACT_ADDRESS}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `reverseLookup(${address})`
          })
        },);

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.log(err);
    }

    return null;
  }

  async createBidTx(name: string, amount: number, auctionId: number) {
  }
}

export default WavesNameService;