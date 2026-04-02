import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase-server';

export const onRequest = defineMiddleware(async (context, next) => {
  // Normalize: remove trailing slash (except root)
  const pathname = context.url.pathname.replace(/\/+$/, '') || '/';

  // Only gate /portal routes — strict prefix check to avoid matching /portalx etc.
  const isPortalRoute = pathname === '/portal' || pathname.startsWith('/portal/');
  const isPublicPortalRoute = pathname === '/portal/login' || pathname === '/portal/datenschutz';

  if (!isPortalRoute || isPublicPortalRoute) {
    return next();
  }

  const supabase = createSupabaseServerClient(context.request, context.cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return context.redirect('/portal/login');
  }

  context.locals.user = user;
  context.locals.supabase = supabase;

  return next();
});
