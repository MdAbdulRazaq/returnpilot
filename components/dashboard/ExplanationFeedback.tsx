// components/dashboard/ExplanationFeedback.tsx
'use client';

import { useState } from 'react';

/**
 * ExplanationFeedback React component that displays current explanation and rating controls
 * Allows merchants to rate explanation usefulness (1-5 scale) in dashboard
 */
interface ExplanationFeedbackProps {
  explanationId: string;
  currentRating?: number;
}

export function ExplanationFeedback({ explanationId, currentRating }: ExplanationFeedbackProps) {
  const [rating, setRating] = useState<number>(currentRating ?? 0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const handleRatingSelect = (newRating: number) => {
    setRating(newRating);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setSubmitError('Please select a rating between 1 and 5');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Call the explanation feedback API
      const response = await fetch(`/api/alerts/${explanationId}/explanation-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usefulnessRating: rating,
          // Optional comment could be added here
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      await response.json();
      setSubmitSuccess(true);

      // Optionally show a success message for a few seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <dt className="text-sm font-medium text-gray-500">Rate this explanation</dt>
        {submitSuccess && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            Thanks for your feedback!
          </span>
        )}
      </div>

      {/* Rating stars */}
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingSelect(star)}
            disabled={submitting}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
              rating >= star
                ? 'bg-amber-500 text-white'
                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
            }`}
            aria-label={`Rate ${star} out of 5`}
          >
            {rating >= star ? '★' : '☆'}
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating}/5
        </span>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500">
        How helpful was this explanation in understanding the alert?
      </p>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating < 1 || rating > 5}
        className={`w-full mt-4 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          submitting ? 'opacity-50' : ''
        }`}
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>

      {/* Error state */}
      {submitError && (
        <p className="text-xs text-red-600 mt-2">
          {submitError}
        </p>
      )}
    </div>
  );
}