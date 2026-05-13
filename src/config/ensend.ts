import { Client } from 'ensend';

const ensendSecretKey = process.env.ENSEND_SECRET;

if (!ensendSecretKey) {
  throw new Error('Ensend config data missing!');
}

const ensend = new Client({
  secret: ensendSecretKey,
});

export default ensend;
