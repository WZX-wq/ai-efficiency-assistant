import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKnowledgeStore, type KnowledgeItem } from '../store/useKnowledgeStore';
import { useTranslation } from '../i18n';

interface KnowledgeEditorProps {
  open: boolean;
  onClose: () => void;
  editItem?: KnowledgeItem | null;
}

const TYPE_OPTIONS: { value: KnowledgeItem['type']; labelKey: string; icon: string }[] = [
  { value: 'note', labelKey: 'knowledge.type.note', icon: '📝' },
  { value: 'article', labelKey: 'knowledge.type.article', icon: '📰' },
  { value: 'snippet', labelKey: 'knowledge.type.snippet', icon: '💻' },
  { value: 'bookmark', labelKey: 'knowledge.type.bookmark', icon: '🔖' },
  { value: 'reference', labelKey: 'knowledge.type.reference', icon: '📚' },
];

export default function KnowledgeEditor({ open, onClose, editItem }: KnowledgeEditorProps) {
  const { t } = useTranslation();
  const { addItem, updateItem, categories } = useKnowledgeStore();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<KnowledgeItem['type']>('note');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset form when editing a different item
  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setType(editItem.type);
      setCategory(editItem.category);
      setTags([...editItem.tags]);
      setContent(editItem.content);
      setSource(editItem.source || '');
    } else {
      setTitle('');
      setType('note');
      setCategory(categories[0]?.id || 'notes');
      setTags([]);
      setContent('');
      setSource('');
    }
  }, [editItem, open, categories]);

  // Auto-focus title
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
      if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
        setTags(tags.slice(0, -1));
      }
    },
    [handleAddTag, tagInput, tags]
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    const itemData = {
      title: title.trim(),
      content,
      type,
      tags,
      category: category || categories[0]?.id || 'notes',
      source: source.trim() || undefined,
      summary: content.slice(0, 100).replace(/[#*`\n]/g, '').trim(),
      pinned: editItem?.pinned,
      favorite: editItem?.favorite,
    };

    if (editItem) {
      updateItem(editItem.id, itemData);
    } else {
      addItem(itemData);
    }
    onClose();
  }, [title, content, type, tags, category, source, editItem, addItem, updateItem, onClose, categories]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label={editItem ? t('knowledge.editItem') : t('knowledge.newItem')}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem ? t('knowledge.editItem') : t('knowledge.newItem')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('knowledge.title')} *
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('knowledge.titlePlaceholder')}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Type & Category Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('knowledge.type')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setType(opt.value)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          type === opt.value
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('knowledge.category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('knowledge.tags')}
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl min-h-[42px] items-center">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-lg"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? t('knowledge.tagPlaceholder') : ''}
                    className="flex-1 min-w-[100px] bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">{t('knowledge.tagHint')}</p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('knowledge.content')}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('knowledge.contentPlaceholder')}
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm leading-relaxed"
                />
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('knowledge.sourceUrl')}
                  <span className="text-gray-400 font-normal ml-1">({t('common.optional')})</span>
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm hover:shadow-md"
              >
                {t('common.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
