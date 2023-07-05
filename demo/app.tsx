import { useState } from 'react';
import { WavesDomainsClient, WhoIsResult } from '../src';

const wavesDomainsClient = new WavesDomainsClient({ network: 'testnet' });

export function App() {
  const [resolveOutput, setResolveOutput] = useState<string | null>(null);
  const [whoIsOutput, setWhoIsOutput] = useState<WhoIsResult | null>(null);

  return (
    <div>
      <form
        onSubmit={async event => {
          event.preventDefault();

          const input = event.currentTarget.elements.namedItem(
            'resolveNameInput',
          ) as HTMLInputElement;

          setResolveOutput(await wavesDomainsClient.resolve(input.value));
        }}
      >
        <h2>Resolve</h2>
        <label htmlFor="resolveNameInput">Name</label>:{' '}
        <input id="resolveNameInput" />
        <button type="submit">Go</button>
        {resolveOutput && (
          <div>
            <output>
              <pre>{JSON.stringify(resolveOutput, null, 2)}</pre>
            </output>
          </div>
        )}
      </form>

      <form
        onSubmit={async event => {
          event.preventDefault();

          const input = event.currentTarget.elements.namedItem(
            'whoIsNameInput',
          ) as HTMLInputElement;

          setWhoIsOutput(await wavesDomainsClient.whoIs(input.value));
        }}
      >
        <h2>Who Is</h2>
        <label htmlFor="whoIsNameInput">Name</label>:{' '}
        <input id="whoIsNameInput" />
        <button type="submit">Go</button>
        {whoIsOutput && (
          <div>
            <output>
              <pre>{JSON.stringify(whoIsOutput, null, 2)}</pre>
            </output>
          </div>
        )}
      </form>
    </div>
  );
}
