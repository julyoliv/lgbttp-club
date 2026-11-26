import { useCallback, useEffect, useState } from "react";
import { reviewsApi } from "../api/client";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function MeetingCard({ clubId, meeting, hideDate = false }) {
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const isPast = new Date(meeting.scheduled_at) < new Date();

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setReviewError("");
    try {
      const revData = await reviewsApi.list(clubId, meeting.id);
      setReviews(revData.reviews || []);
    } catch (err) {
      console.error(err);
      setReviewError("Erro ao carregar resenhas");
    } finally {
      setLoading(false);
    }
  }, [clubId, meeting.id]);

  useEffect(() => {
    if (expanded) loadDetails();
  }, [expanded, loadDetails]);

  async function handleReviewSubmit(e) {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError("");
    try {
      await reviewsApi.create(clubId, meeting.id, {
        rating: Number(rating),
        body,
      });
      setBody("");
      setRating(5);
      await loadDetails();
    } catch (err) {
      setReviewError(err.message || "Erro ao enviar resenha");
    } finally {
      setSubmittingReview(false);
    }
  }

  const dateFormatted = new Date(meeting.scheduled_at).toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-3 sm:mb-4 overflow-hidden transition-all">
      <div
        className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex-1">
          <h3 className="font-bold text-base sm:text-lg text-gray-800 flex flex-wrap items-baseline gap-1">
            {meeting.title}
            {meeting.author && (
              <span className="font-normal text-sm text-gray-500">
                {" "}
                - {meeting.author}
              </span>
            )}
          </h3>
          {!hideDate && (
            <p className="text-xs sm:text-sm text-gray-500 capitalize mt-1">
              {dateFormatted}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          {isPast ? (
            <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium border border-gray-200">
              Passado
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium border border-gray-200">
              Em breve
            </span>
          )}
          <span className="text-gray-400 p-1">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/50">
          {meeting.description && (
            <p className="text-gray-700 mb-4 sm:mb-5 whitespace-pre-wrap bg-white p-3 sm:p-4 rounded-lg border border-gray-100 text-sm">
              {meeting.description}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Carregando resenhas...</p>
          ) : (
            <div className="max-w-3xl">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                Resenhas da Obra
              </h4>

              {reviewError && (
                <p className="text-xs text-red-600 mb-3">{reviewError}</p>
              )}

              {isPast && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="mb-4 bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm"
                >
                  <p className="text-xs font-semibold mb-2 text-gray-600 uppercase tracking-wide">
                    Sua nota:
                  </p>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-2xl transition-colors ${star <= rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="O que você achou desta obra?"
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 resize-none focus:ring-gray-400 focus:border-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full text-xs font-medium bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingReview ? "Enviando..." : "Enviar Resenha"}
                  </button>
                </form>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.length === 0 && (
                  <p className="text-sm text-gray-400 italic">
                    Nenhuma resenha ainda.
                  </p>
                )}
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white p-3 sm:p-3.5 rounded-lg border border-gray-100 shadow-sm text-sm"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-gray-800">
                        {review.user_name}
                      </span>
                      <span className="text-yellow-500 text-[10px] sm:text-xs">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    {review.body && (
                      <p className="text-gray-600 text-xs leading-relaxed">
                        {review.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
