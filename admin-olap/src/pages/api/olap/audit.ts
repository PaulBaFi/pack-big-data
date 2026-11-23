import type { APIRoute } from 'astro';
import { runQualityAudit } from '../../../lib/olap-auditor';
import { logAdminAction } from '../../../lib/auth';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const auditData = await runQualityAudit();
    const user = locals.user;
    if (user) {
      await logAdminAction(user.id, user.email, 'AUDIT_RUN', { score: auditData.score });
    }
    return new Response(JSON.stringify(auditData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = GET;
