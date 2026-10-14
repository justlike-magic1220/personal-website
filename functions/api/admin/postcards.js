// GET /api/admin/postcards -> every visitor postcard, including hidden ones (owner only)
import { d1Repo, handleAdmin } from '../../_lib/postcards.js';

export const onRequest = ({ request, env }) => handleAdmin(request, d1Repo(env.DB), { password: env.ADMIN_PASSWORD });
