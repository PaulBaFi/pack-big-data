import type { APIRoute } from 'astro';
import { authenticateUser, createSessionToken } from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { login, password } = body;

    const authResult = await authenticateUser(login, password);

    if (!authResult.success || !authResult.user) {
      const status = authResult.blocked ? 403 : 401;
      return new Response(
        JSON.stringify({ ok: false, error: authResult.error, blocked: authResult.blocked }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const token = await createSessionToken(authResult.user);

    cookies.set('castillon_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return new Response(JSON.stringify({ ok: true, user: authResult.user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
