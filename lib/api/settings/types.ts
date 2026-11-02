// lib/api/settings/types.ts
/**
 * Types for explanation feedback and configuration settings.
 */

export interface ExplanationFeedback {
  id: string;
  shopId: string;
  findingId: string; // Reference to the finding this feedback is about
  usefulnessRating: number; // 1-5 scale, where 5 is most useful
  isHelpful: boolean; // Whether the explanation was helpful
  feedbackComment?: string; // Optional comment from merchant
  submittedAt: Date;
}

export interface ExplanationFeedbackQueryResult {
  feedback: ExplanationFeedback[];
  totalCount: number;
  hasMore: boolean;
}

export interface ExplanationConfiguration {
  id: string;
  shopId: string;
  // Explanation generation settings
  explanationEnabled: boolean;
  explanationLevel: 'basic' | 'detailed' | 'full';
  includeTechnicalDetails: boolean;
  enableConfidenceScoring: boolean;
  enableHistoricalContext: boolean;
  enableEnhancedEvidence: boolean;
  explanationFormat: 'technical' | 'merchant-friendly' | 'both';
  // Feedback settings
  collectExplanationFeedback: boolean;
  feedbackCollectionEnabled: boolean;
  // Created/updated timestamps
  createdAt: Date;
  updatedAt: Date;
}