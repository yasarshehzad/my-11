import type { Metadata } from 'next';
import { ProgressDashboard } from '../../components/ProgressDashboard';

export const metadata: Metadata = {
  title: 'Manager Progress',
  description: 'Track your MY-11 manager level, achievements, collection and daily challenge record.',
  alternates: {
    canonical: 'https://my-11.com/progress',
  },
};

export default function ProgressPage() {
  return <ProgressDashboard />;
}
