import type { MoodBoardFeedback, MoodBoardFeedbackInput } from './types';

const FUNCTION_URL = '/portal/api/mood-board-feedback';

/**
 * Get feedback for a deliverable (all variants for current user)
 */
export async function getMoodBoardFeedback(deliverableId: string, token: string): Promise<MoodBoardFeedback[]> {
  const response = await fetch(`${FUNCTION_URL}?deliverable_id=${deliverableId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feedback: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save or update a single variant's feedback (vote + comments)
 */
export async function saveMoodBoardFeedback(
  input: MoodBoardFeedbackInput,
  token: string
): Promise<MoodBoardFeedback> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to save feedback: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Submit feedback (mark all variants as submitted, lock editing)
 */
export async function submitMoodBoardFeedback(
  feedbackIds: string[],
  token: string
): Promise<void> {
  const results = await Promise.all(
    feedbackIds.map(id =>
      fetch(`${FUNCTION_URL}/${id}/submit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    )
  );

  for (const response of results) {
    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
  }
}

/**
 * Unlock feedback for editing (admin only)
 */
export async function unlockMoodBoardFeedback(feedbackId: string, token: string): Promise<MoodBoardFeedback> {
  const response = await fetch(`${FUNCTION_URL}/${feedbackId}/unlock`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to unlock feedback: ${response.statusText}`);
  }

  return response.json();
}
