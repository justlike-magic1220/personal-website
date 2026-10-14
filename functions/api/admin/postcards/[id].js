// PATCH  /api/admin/postcards/:id { hidden: true|false } -> hide or show (owner only)
// DELETE /api/admin/postcards/:id                        -> delete for good (owner only)
import { d1Repo, handleAdmin } from '../../../_lib/postcards.js';

export const onRequest = ({ request, env, params }) =>
  handleAdmin(request, d1Repo(env.DB), { password: env.ADMIN_PASSWORD, id: params.id });
