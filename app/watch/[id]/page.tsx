import { Suspense } from 'react';
import { Metadata } from 'next';
import { WatchClient } from './WatchClient';

interface WatchPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Watch Course (${id}) | ytChaptered`,
    description: `Structured chaptered course and playback for YouTube video ${id}.`,
  };
}

async function WatchContent({ params, searchParams }: WatchPageProps) {
  const { id } = await params;
  const { t } = await searchParams;

  return <WatchClient videoId={id} initialTimeParam={t} />;
}

export default function WatchPage(props: WatchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d5c46]" />
        </div>
      }
    >
      <WatchContent {...props} />
    </Suspense>
  );
}
