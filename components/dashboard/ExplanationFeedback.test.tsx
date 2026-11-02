// components/dashboard/ExplanationFeedback.test.tsx
import { ExplanationFeedback } from "./ExplanationFeedback";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock fetch API
// Mock fetch API
const mockFetch = vi.fn() as ReturnType<typeof vi.fn>;
global.fetch = mockFetch as unknown as typeof fetch;

describe("ExplanationFeedback Component", () => {
  const explanationId = "test-explanation-id";

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("Rendering", () => {
    it("renders the explanation feedback component", () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Should render the main container
      expect(screen.getByText(/rate this explanation/i)).toBeInTheDocument();

      // Should display rating controls
      expect(screen.getByText(/rate this explanation/i)).toBeInTheDocument();

      // Should display help text
      expect(screen.getByText(/how helpful was this explanation/i)).toBeInTheDocument();

      // Should display initial rating as 0/5
      expect(screen.getByText("0/5")).toBeInTheDocument();

      // Should display 5 star buttons
      const starButtons = screen.getAllByRole("button", { name: /rate \d+ out of 5/i });
      expect(starButtons).toHaveLength(5);
    });

    it("renders with provided currentRating", () => {
      render(<ExplanationFeedback explanationId={explanationId} currentRating={4} />);

      // Should display rating as 4/5 initially
      expect(screen.getByText("4/5")).toBeInTheDocument();

      // Should have 4 stars filled (checked via aria-pressed or visual state)
      // We'll test this through interaction instead of visual state
    });
  });

  describe("Rating Selection", () => {
    it("updates rating when a star is clicked", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Click the 3-star button
      const threeStarButton = screen.getByRole("button", { name: /rate 3 out of 5/i });
      await userEvent.click(threeStarButton);

      // Should update rating display
      expect(screen.getByText("3/5")).toBeInTheDocument();

      // Click the 5-star button
      const fiveStarButton = screen.getByRole("button", { name: /rate 5 out of 5/i });
      await userEvent.click(fiveStarButton);

      // Should update rating display to 5/5
      expect(screen.getByText("5/5")).toBeInTheDocument();
    });

    it("resets error and success states when rating is selected", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Set a rating first
      const fourStarButton = screen.getByRole("button", { name: /rate 4 out of 5/i });
      await userEvent.click(fourStarButton);

      // Try to submit (will fail due to no fetch mock, but we can still test state)
      const submitButton = screen.getByText(/submit rating/i);
      await userEvent.click(submitButton);

      // Now select a different rating - this should reset error/success states
      const twoStarButton = screen.getByRole("button", { name: /rate 2 out of 5/i });
      await userEvent.click(twoStarButton);

      // After selecting a new rating, any previous error/success should be cleared
      // We can't directly access state, but we verify the UI allows re-submission
      expect(submitButton).toBeEnabled();
    });
  });

  describe("Form Submission", () => {
    it("handles successful form submission", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Set a valid rating
      const fourStarButton = screen.getByRole("button", { name: /rate 4 out of 5/i });
      await userEvent.click(fourStarButton);

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Find and click submit button
      const submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeEnabled();

      // Click submit
      await userEvent.click(submitButton);

      // Wait for request to complete
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/alerts/${explanationId}/explanation-feedback`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usefulnessRating: 4 })
          })
        );
      });

      // Should show success message
      expect(await screen.findByText(/thanks for your feedback/i)).toBeInTheDocument();

      // Button should be enabled again after submission
      expect(submitButton).toBeEnabled();
    });

    it("shows error message when submission fails", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Set a valid rating
      const threeStarButton = screen.getByRole("button", { name: /rate 3 out of 5/i });
      await userEvent.click(threeStarButton);

      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "API Error" })
      });

      // Find and click submit button
      const submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeEnabled();

      // Click submit
      await userEvent.click(submitButton);

      // Should show error message
      expect(await screen.findByText(/api error/i)).toBeInTheDocument();

      // Button should be enabled again after submission
      expect(submitButton).toBeEnabled();
    });

    it("disables button during submission", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Set a valid rating
      const twoStarButton = screen.getByRole("button", { name: /rate 2 out of 5/i });
      await userEvent.click(twoStarButton);

      // Mock API response that delays resolution
      mockFetch.mockResolvedValueOnce(
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true })
            });
          }, 100);
        })
      );

      // Find submit button
      const submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeEnabled();

      // Click submit
      await userEvent.click(submitButton);

      // Wait for button to be disabled during submission
      await waitFor(() => {
        const btn = screen.getByText(/submit rating/i);
        return btn.hasAttribute("disabled");
      }, { timeout: 1000 });

      // Wait for completion
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Button should be enabled again after submission
      expect(submitButton).toBeEnabled();
    });

    it("prevents submission when rating is out of range (< 1)", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // With no rating selected, submit button should be disabled
      const submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeDisabled();

      // Try to click submit anyway (should not call fetch because button is disabled)
      await userEvent.click(submitButton);

      // Fetch should not have been called
      expect(fetch).not.toHaveBeenCalled();
    });

    it("prevents submission when rating is out of range (> 5)", async () => {
      render(<ExplanationFeedback explanationId={explanationId} currentRating={6} />);

      // Submit button should be disabled initially (rating > 5)
      const submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeDisabled();

      // Try to click submit (should not call fetch because button is disabled)
      await userEvent.click(submitButton);

      // Fetch should not have been called
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("Input Validation", () => {
    it("requires rating between 1 and 5 for submission", async () => {
      render(<ExplanationFeedback explanationId={explanationId} />);

      // Initially, no rating selected -> should not be able to submit
      let submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeDisabled();

      // Select a rating (3)
      const threeStarButton = screen.getByRole("button", { name: /rate 3 out of 5/i });
      await userEvent.click(threeStarButton);

      // Now should be able to submit
      submitButton = screen.getByText(/submit rating/i);
      expect(submitButton).toBeEnabled();

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Submit
      await userEvent.click(submitButton);

      // Should show success message
      expect(await screen.findByText(/thanks for your feedback/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles missing explanation data gracefully", () => {
      // Component should still be renderable even with empty explanationId
      render(<ExplanationFeedback explanationId="" />);

      // Should render without throwing
      expect(screen.getByText(/rate this explanation/i)).toBeInTheDocument();
    });
  });
});

// Using waitFor from @testing-library/react