import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FeedbackItem {
  id: string;
  rating: number;
  category: string;
  content: string;
  email: string;
  createdAt: string;
}

const STORAGE_KEY = 'ai-assistant-feedbacks';
const SESSION_KEY = 'ai-assistant-feedback-given';

const CATEGORIES = [
  '功能建议',
  'Bug反馈',
  '体验优化',
  '内容质量',
  '其他',
] as const;

const STAR_EMOJIS = ['😞', '😐', '🙂', '😊', '🤩'] as const;

const STAR_LABELS = ['很差', '较差', '一般', '满意', '非常满意'] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadFeedbacks(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFeedbacks(items: FeedbackItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function hasGivenFeedbackThisSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function markFeedbackGivenThisSession() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (r: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {STAR_EMOJIS.map((emoji, i) => {
        const value = i + 1;
        return (
          <motion.button
            key={value}
            type="button"
            whileHover={{ scale: 1.25 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(value)}
            className={`
              relative text-3xl cursor-pointer select-none
              transition-all duration-200
              ${rating === value ? 'scale-110' : 'opacity-50 hover:opacity-80'}
            `}
            aria-label={STAR_LABELS[i]}
          >
            {emoji}
            {rating === value && (
              <motion.span
                layoutId="star-ring"
                className="absolute inset-0 rounded-full border-2 border-primary-500 dark:border-primary-400"
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function ThankYouAnimation({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col items-center gap-4 py-6"
    >
      {/* Animated checkmark circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center"
      >
        <motion.svg
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-8 h-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <motion.path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
        </motion.svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          感谢您的反馈！
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          您的意见对我们非常重要，我们会认真对待每一条反馈。
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClose}
        className="
          mt-2 px-6 py-2 rounded-lg text-sm font-medium
          bg-primary-600 text-white
          hover:bg-primary-700 dark:hover:bg-primary-500
          transition-colors duration-200
        "
      >
        关闭
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [showBadge, setShowBadge] = useState(false);

  /* Check badge visibility on mount */
  useEffect(() => {
    if (!hasGivenFeedbackThisSession()) {
      setShowBadge(true);
    }
  }, []);

  /* Listen for open-feedback custom event from CommandPalette */
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-feedback', handler);
    return () => window.removeEventListener('open-feedback', handler);
  }, []);

  /* Close panel on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = useCallback(() => {
    if (rating === 0) return;

    const feedback: FeedbackItem = {
      id: crypto.randomUUID(),
      rating,
      category: category || '其他',
      content: content.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };

    const existing = loadFeedbacks();
    saveFeedbacks([feedback, ...existing]);
    markFeedbackGivenThisSession();

    setSubmitted(true);
    setShowBadge(false);
  }, [rating, category, content, email]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Reset form after panel closes
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setCategory('');
      setContent('');
      setEmail('');
    }, 300);
  }, []);

  const canSubmit = rating > 0 && content.trim().length > 0;

  return (
    <>
      {/* ---------- Floating trigger button ---------- */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="用户反馈"
        className={`
          fixed bottom-28 right-4 z-40
          md:bottom-16 md:right-6
          w-12 h-12 rounded-full
          flex items-center justify-center
          bg-primary-600 dark:bg-primary-600
          text-white shadow-lg shadow-primary-600/30 dark:shadow-primary-600/20
          hover:bg-primary-700 dark:hover:bg-primary-500
          transition-colors duration-200
          group
        `}
      >
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20" />
        )}

        {/* Chat bubble icon */}
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-0' : 'group-hover:scale-110'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227
               1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443
               2.887 0 5.637-.504 7.687-1.429A3.375 3.375 0 0021.75 12.51V8.25
               A3.375 3.375 0 0018.375 4.875H5.625A3.375 3.375 0 002.25 8.25v3.51z"
          />
        </svg>

        {/* Badge */}
        <AnimatePresence>
          {showBadge && !open && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="
                absolute -top-1 -right-1
                w-5 h-5 rounded-full
                bg-red-500 dark:bg-red-500
                text-[10px] font-bold text-white
                flex items-center justify-center
                shadow-sm
              "
            >
              1
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ---------- Backdrop ---------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* ---------- Slide-up panel ---------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            role="dialog"
            aria-label="反馈面板"
            className="
              fixed z-50
              bottom-0 right-0
              mb-28 mr-4
              md:mb-16 md:mr-6
              w-[calc(100%-2rem)] max-w-md
              rounded-2xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700/60
              shadow-2xl shadow-black/10 dark:shadow-black/40
              overflow-hidden
            "
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  意见反馈
                </h3>
              </div>
              <button
                onClick={handleClose}
                aria-label="关闭"
                className="
                  w-8 h-8 rounded-lg
                  flex items-center justify-center
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-colors duration-150
                "
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <ThankYouAnimation key="thanks" onClose={handleClose} />
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-5"
                  >
                    {/* Star rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        您的体验如何？
                      </label>
                      <StarRating rating={rating} onChange={setRating} />
                      {rating > 0 && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1"
                        >
                          {STAR_LABELS[rating - 1]}
                        </motion.p>
                      )}
                    </div>

                    {/* Category dropdown */}
                    <div>
                      <label
                        htmlFor="fb-category"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      >
                        反馈类型
                      </label>
                      <select
                        id="fb-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="
                          w-full px-3 py-2 rounded-lg text-sm
                          bg-gray-50 dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                          dark:focus:ring-primary-400/40 dark:focus:border-primary-400
                          transition-colors duration-150
                          appearance-none
                          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]
                          bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat
                          pr-8
                        "
                      >
                        <option value="" disabled>
                          请选择反馈类型
                        </option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Text area */}
                    <div>
                      <label
                        htmlFor="fb-content"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      >
                        详细描述
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <textarea
                        id="fb-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        placeholder="请告诉我们您的想法、遇到的问题或改进建议..."
                        maxLength={1000}
                        className="
                          w-full px-3 py-2 rounded-lg text-sm resize-none
                          bg-gray-50 dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                          dark:focus:ring-primary-400/40 dark:focus:border-primary-400
                          transition-colors duration-150
                        "
                      />
                      <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {content.length} / 1000
                      </p>
                    </div>

                    {/* Optional email */}
                    <div>
                      <label
                        htmlFor="fb-email"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      >
                        联系邮箱
                        <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                          （选填）
                        </span>
                      </label>
                      <input
                        id="fb-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="方便我们跟进回复您"
                        className="
                          w-full px-3 py-2 rounded-lg text-sm
                          bg-gray-50 dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                          dark:focus:ring-primary-400/40 dark:focus:border-primary-400
                          transition-colors duration-150
                        "
                      />
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="button"
                      disabled={!canSubmit}
                      whileHover={canSubmit ? { scale: 1.02 } : undefined}
                      whileTap={canSubmit ? { scale: 0.98 } : undefined}
                      onClick={handleSubmit}
                      className={`
                        w-full py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-200
                        ${
                          canSubmit
                            ? 'bg-primary-600 text-white hover:bg-primary-700 dark:hover:bg-primary-500 cursor-pointer'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      提交反馈
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
