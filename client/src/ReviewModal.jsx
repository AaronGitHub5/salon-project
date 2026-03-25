import { useState } from 'react';
import API_URL from './config';

export default function ReviewModal({ bookingId, token, onClose }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_id: parseInt(bookingId), rating, comment }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {submitted ? (
          <div className="text-center">
            <div className="text-4xl mb-4">⭐</div>
            <h2 className="text-xl font-bold uppercase tracking-widest mb-2">Thank You!</h2>
            <p className="text-gray-500 text-sm mb-6">Your review has been submitted and is awaiting approval.</p>
            <button
              onClick={onClose}
              className="bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest">Leave a Review</h2>
                <p className="text-gray-400 text-xs mt-1">How was your appointment?</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-black text-xl">×</button>
            </div>

            {/* Star Rating */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl transition"
                >
                  {star <= (hovered || rating) ? '★' : '☆'}
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              className="w-full border border-gray-200 rounded p-3 text-sm bg-gray-50 resize-none focus:outline-none focus:border-black"
              rows={4}
              placeholder="Tell us about your experience (optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-black text-white py-3 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 text-xs font-bold uppercase tracking-widest border border-gray-200 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
