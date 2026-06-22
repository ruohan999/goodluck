import React from 'react';
import type { ReactNode } from 'react';

interface iShowProps {
  when: boolean;
  children: ReactNode | string | null;
  fallBack?: ReactNode | string | null;
}
export default function ElShow({
  when,
  children,
  fallBack = null,
}: iShowProps): ReactNode | null {
  return <>{when ? children : fallBack}</>;
}