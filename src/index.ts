import fetch from 'node-fetch';

type Response = {
  name: string;
  job: string;
  id: string;
  createdAt: string;
};

const CONTRACT_ADDRESS = '';
const HOST = 'https://nodes-keeper.wavesnodes.com/';

export class WavesNameService {
  async lookup(name: string) {
    try {
      const response = await fetch(`${HOST}/utils/script/evaluate/${CONTRACT_ADDRESS}`,
        {
          method: 'POST',
          body: JSON.stringify({
            expr: `lookup(${name})`
          })
        },);

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

      const result = (await response.json()) as Response;
      return result;
    } catch (err) {
      console.log(err);
    }
  }

  async reverseLookup(address: string) {
  }

  async createBidTx(name: string, amount: number, auctionId: number) {

  }
}

export default WavesNameService;