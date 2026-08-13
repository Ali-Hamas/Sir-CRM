import { ReactNode } from 'react';

import { AppLayout } from '../../components/layout/AppLayout';

export default function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { orgSlug: string };
}) {
  return (
    <AppLayout orgSlug={params.orgSlug}>
      {children}
    </AppLayout>
  );
}
