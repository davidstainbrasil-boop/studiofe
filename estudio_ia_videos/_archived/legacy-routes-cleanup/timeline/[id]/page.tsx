'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Dynamically import editor with SSR disabled to prevent window/document errors
const ProfessionalTimelineEditor = dynamic(
  () => import('@components/timeline/ProfessionalTimelineEditor'),
  { ssr: false }
);

export default function TimelineEditorPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <ProfessionalTimelineEditor projectId={id} />
    </div>
  );
}
