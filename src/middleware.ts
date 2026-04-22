import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/courses/:path*',
    '/api/quiz/:path*',
    '/api/chat/:path*',
  ],
};
