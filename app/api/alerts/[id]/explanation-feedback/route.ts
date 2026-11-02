// app/api/alerts/[id]/explanation-feedback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import type { ExplanationFeedback } from '@/lib/api/settings/types';
import { ExplanationFeedbackQueries } from '@/lib/api/settings/queries';
import { FeedbackProcessor } from '@/lib/detection/feedback/feedback-processor';
import { ExplanationConfigurationQueries } from '@/lib/api/settings/queries';
import type { AdaptiveLearningConfig } from '@/lib/detection/adaptive-learning-config';
import { getShopIdFromSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

/**
 * POST endpoint for submitting explanation usefulness feedback
 * Validates shop access, stores feedback, and processes it through FeedbackProcessor
 * to update adaptive learning configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the shop ID from session to validate shop access
    const cookieStore = await cookies();
    const shopId = await getShopIdFromSession(cookieStore);

    if (!shopId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id: findingId } = await params;

    // Parse request body
    const body = await request.json();

    // Validate usefulness rating
    const usefulnessRating = body.usefulnessRating;
    if (usefulnessRating === undefined || usefulnessRating === null) {
      return NextResponse.json(
        { error: 'usefulnessRating is required' },
        { status: 400 }
      );
    }

    if (typeof usefulnessRating !== 'number' || usefulnessRating < 1 || usefulnessRating > 5) {
      return NextResponse.json(
        { error: 'usefulnessRating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Optional feedback comment
    const feedbackComment = body.feedbackComment || undefined;

    // Create feedback object
    const feedback: ExplanationFeedback = {
      id: `feedback-${findingId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      shopId,
      findingId,
      usefulnessRating,
      isHelpful: usefulnessRating >= 3, // 3-5 is helpful, 1-2 is not helpful
      feedbackComment,
      submittedAt: new Date()
    };

    // Save feedback to database
    await ExplanationFeedbackQueries.saveFeedback(feedback);

    // Get current adaptive learning configuration for the shop
    // In a real implementation, we would fetch this from the database
    // For now, we'll use default values (matching ExplanationConfigurationQueries.getOrCreateConfiguration behavior)
    const currentConfig: AdaptiveLearningConfig = {
      enabled: true,
      learningRate: 0.1,
      seasonalWindow: 30, // days
      minSamples: 10,
      outlierStdDevMultiplier: 2,
      seasonalDetectionEnabled: true,
      thresholdAdjustmentEnabled: true,
      performanceWindow: 30, // days
      explanationFeedbackProcessing: {
        enabled: true,
        feedbackWeight: 0.1,
        minFeedbackSamples: 5,
        usefulnessThreshold: 3
      },
      feedbackProcessing: {
        enabled: true,
        feedbackWeight: 0.1,
        minFeedbackSamples: 5
      },
      anomalyConfidenceMultiplier: 0.5
    };

    // Process the explanation usefulness feedback through FeedbackProcessor
    // This updates the adaptive learning configuration based on the feedback
    const updatedConfig = FeedbackProcessor.processExplanationUsefulnessFeedback(
      usefulnessRating,
      currentConfig
    );

    // Get current explanation configuration for the shop
    const currentExplanationConfig = await ExplanationConfigurationQueries.getOrCreateConfiguration(shopId);

    // Create updated explanation configuration based on the processed feedback
    const updatedExplanationConfig = {
      ...currentExplanationConfig,
      // Update feedback collection settings based on explanation feedback processing
      collectExplanationFeedback: updatedConfig.explanationFeedbackProcessing?.enabled ?? true,
      feedbackCollectionEnabled: updatedConfig.explanationFeedbackProcessing?.enabled ?? true,
      // Adjust explanation level based on learning rate
      // High learning rate (explanations not useful) -> more basic explanations
      // Low learning rate (explanations useful) -> more detailed explanations
      explanationLevel: updatedConfig.learningRate > 0.3
        ? 'basic' as const
        : updatedConfig.learningRate < 0.1
        ? 'detailed' as const
        : (currentExplanationConfig.explanationLevel as 'basic' | 'detailed' | 'full'),
      // Update timestamp to track when configuration was last modified
      updatedAt: new Date()
    };

    // Save the updated explanation configuration
    await ExplanationConfigurationQueries.saveConfiguration(updatedExplanationConfig);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Explanation feedback submitted successfully',
      feedbackId: feedback.id
    });
  } catch (error) {
    console.error('Error processing explanation feedback:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}