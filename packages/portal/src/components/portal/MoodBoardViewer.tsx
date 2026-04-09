'use client';

import { useState } from 'react';
import MoodBoardFeedback from './MoodBoardFeedback';
import type { MoodBoardFeedback as MoodBoardFeedbackType } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface Props {
  variantData: Record<string, string>;
  activeVariant: string;
  deliverableId: string;
  variants: string[];
  isAdmin: boolean;
  feedbackData: MoodBoardFeedbackType[];
  authToken: string;
}

export default function MoodBoardViewer({
  variantData,
  activeVariant: initialVariant,
  deliverableId,
  variants,
  isAdmin,
  feedbackData,
  authToken,
}: Props) {
  const [activeVariant, setActiveVariant] = useState(initialVariant);

  function handleVariantChange(variant: string) {
    setActiveVariant(variant);
    // Update URL param
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant);
    window.history.replaceState({}, '', url);
    // Dispatch event for MoodBoardFeedback to listen to
    document.dispatchEvent(
      new CustomEvent('mood-board-variant-changed', { detail: { variant } })
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(variantData).map((variant) => (
            <Button
              key={variant}
              variant={variant === activeVariant ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleVariantChange(variant)}
            >
              {variant}
            </Button>
          ))}
        </div>
        <div className="flex justify-center">
          <iframe
            srcDoc={variantData[activeVariant]}
            sandbox="allow-scripts"
            className="border border-border rounded-lg"
            style={{ width: '100%', minHeight: '80vh' }}
          />
        </div>
      </div>
      <MoodBoardFeedback
        deliverableId={deliverableId}
        variants={variants}
        isAdmin={isAdmin}
        currentVariant={activeVariant}
        feedbackData={feedbackData}
        authToken={authToken}
      />
    </div>
  );
}
