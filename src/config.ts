import { BLOCKFROST_API_KEY } from './constants';
import { getNetwork } from './helpers';

import { Ok } from 'ts-res';

const loadConfig = () => {
  const network = getNetwork(BLOCKFROST_API_KEY);

  return Ok({
    blockfrostApiKey: BLOCKFROST_API_KEY,
    network,
  });
};

export { loadConfig };
