import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Draft Mode — Build Your Dream XI',
  description: 'Draft 11 iconic football players across history, maximize club & nation chemistry, and simulate a full 38-game league campaign in MY-11 Draft Mode.',
  openGraph: {
    title: 'Draft Mode — 38-Game Football Simulation | MY-11',
    description: 'Draft your dream XI from 3,200+ iconic player seasons and conquer the 38-game league campaign.',
    images: ['/og-image.png'],
  },
};

export default function DraftLayout({ children }: { children: React.ReactNode }) {
  return children;
}
