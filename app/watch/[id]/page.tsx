import { Suspense, ViewTransition } from 'react';
import { Metadata } from 'next';
import { DirectionalTransition } from '../../../components/DirectionalTransition';
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
  const [{ id }, { t }] = await Promise.all([params, searchParams]);

  return <WatchClient videoId={id} initialTimeParam={t} />;
}

export default function WatchPage(props: WatchPageProps) {
  return (
    <DirectionalTransition>
      <Suspense
        fallback={
          <ViewTransition exit="slide-down">
            <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <WatchContent {...props} />
        </ViewTransition>
      </Suspense>
    </DirectionalTransition>
  );
}
