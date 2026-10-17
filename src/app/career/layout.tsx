import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Career Mode — Manage Your Club',
  description: 'Step into the dugout in MY-11 Career Mode. Take charge of 20 English clubs, navigate the transfer market, survive deadline day, and lead your squad to silverware.',
  openGraph: {
    title: 'Career Mode — Multi-Season Football Manager | MY-11',
    description: 'Multi-season football management with 20 clubs, 25-man squad caps, real transfer negotiations, and cup tournaments.',
    images: ['/og-image.png'],
  },
};

export default function CareerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
