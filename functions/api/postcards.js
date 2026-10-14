// GET  /api/postcards  -> visible visitor postcards, newest first
// POST /api/postcards  -> send a postcard { from, note, image }
import { d1Repo, handleList, handleCreate } from '../_lib/postcards.js';
import { OPTION_IDS } from '../_generated/options.js';

export const onRequestGet = ({ env }) => handleList(d1Repo(env.DB));

export const onRequestPost = ({ request, env }) =>
  handleCreate(request, d1Repo(env.DB), { optionIds: OPTION_IDS, salt: env.IP_SALT || '' });
