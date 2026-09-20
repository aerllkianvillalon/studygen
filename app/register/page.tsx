import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <>
      <SiteHeader email={null} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>Only needed if you want to save sets.</CardDescription>
          </CardHeader>
          <CardBody className="pt-0">
            <Suspense fallback={null}>
              <AuthForm mode="register" />
            </Suspense>
          </CardBody>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have one?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
