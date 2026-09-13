'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OceanCommandCenter } from '@/components/bob/ocean/ocean-command-center';

function AssistantWorkspace() {
  const searchParams = useSearchParams();
  const urlShipmentId = searchParams.get('shipment_id');

  return <OceanCommandCenter initialShipmentId={urlShipmentId} />;
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <span>INITIALIZING BOB OCEAN INTELLIGENCE CANVAS...</span>
        </div>
      }
    >
      <AssistantWorkspace />
    </Suspense>
  );
}
