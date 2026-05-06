import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ImageStyle =
  | 'realistic'
  | 'anime'
  | 'digital-art'
  | 'oil-painting'
  | 'watercolor'
  | 'sketch'
  | '3d-render'
  | 'pixel-art'
  | 'cyberpunk'
  | 'fantasy';

export type ImageSize =
  | '256x256'
  | '512x512'
  | '768x768'
  | '1024x1024'
  | '1024x768'
  | '768x1024';

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface ImageGeneration {
  id: string;
  prompt: string;
  negativePrompt?: string;
  style: ImageStyle;
  size: ImageSize;
  seed: number;
  status: GenerationStatus;
  resultUrl: string;
  createdAt: number;
  generationTime: number;
}

export interface ImageSettings {
  defaultStyle: ImageStyle;
  defaultSize: ImageSize;
  autoSave: boolean;
  showNegativePrompt: boolean;
}

interface ImageStore {
  generations: ImageGeneration[];
  settings: ImageSettings;
  gallery: string[];

  // Actions
  createGeneration: (params: Omit<ImageGeneration, 'id' | 'createdAt' | 'status' | 'resultUrl' | 'generationTime'>) => string;
  updateGenerationStatus: (
    id: string,
    status: GenerationStatus,
    resultUrl?: string,
    generationTime?: number
  ) => void;
  deleteGeneration: (id: string) => void;
  addToGallery: (id: string) => void;
  removeFromGallery: (id: string) => void;
  updateSettings: (settings: Partial<ImageSettings>) => void;
  clearHistory: () => void;
  getGenerationById: (id: string) => ImageGeneration | undefined;
  isInGallery: (id: string) => boolean;
}

// Style configurations for placeholder images
export const STYLE_CONFIGS: Record<
  ImageStyle,
  { bgColor: string; textColor: string; label: string; gradient: string }
> = {
  realistic: {
    bgColor: '3b82f6',
    textColor: 'ffffff',
    label: 'realistic',
    gradient: 'from-blue-500 to-cyan-500',
  },
  anime: {
    bgColor: 'ec4899',
    textColor: 'ffffff',
    label: 'anime',
    gradient: 'from-pink-500 to-rose-500',
  },
  'digital-art': {
    bgColor: '8b5cf6',
    textColor: 'ffffff',
    label: 'digital-art',
    gradient: 'from-violet-500 to-purple-500',
  },
  'oil-painting': {
    bgColor: 'd97706',
    textColor: 'ffffff',
    label: 'oil-painting',
    gradient: 'from-amber-600 to-yellow-500',
  },
  watercolor: {
    bgColor: '06b6d4',
    textColor: 'ffffff',
    label: 'watercolor',
    gradient: 'from-cyan-400 to-teal-400',
  },
  sketch: {
    bgColor: '6b7280',
    textColor: 'ffffff',
    label: 'sketch',
    gradient: 'from-gray-500 to-slate-500',
  },
  '3d-render': {
    bgColor: '10b981',
    textColor: 'ffffff',
    label: '3d-render',
    gradient: 'from-emerald-500 to-teal-500',
  },
  'pixel-art': {
    bgColor: 'ef4444',
    textColor: 'ffffff',
    label: 'pixel-art',
    gradient: 'from-red-500 to-orange-500',
  },
  cyberpunk: {
    bgColor: 'a855f7',
    textColor: 'ffffff',
    label: 'cyberpunk',
    gradient: 'from-fuchsia-500 to-purple-600',
  },
  fantasy: {
    bgColor: 'f59e0b',
    textColor: 'ffffff',
    label: 'fantasy',
    gradient: 'from-amber-500 to-orange-500',
  },
};

// Generate placeholder image URL
export const generatePlaceholderUrl = (
  size: ImageSize,
  style: ImageStyle,
  text?: string
): string => {
  const [width, height] = size.split('x').map(Number);
  const config = STYLE_CONFIGS[style];
  const displayText = text
    ? encodeURIComponent(text.slice(0, 20) + (text.length > 20 ? '...' : ''))
    : config.label;
  return `https://placehold.co/${width}x${height}/${config.bgColor}/${config.textColor}?text=${displayText}`;
};

// Parse size to dimensions
export const getSizeDimensions = (size: ImageSize): { width: number; height: number } => {
  const [width, height] = size.split('x').map(Number);
  return { width, height };
};

// Mock generations for demo
const createMockGenerations = (): ImageGeneration[] => {
  const now = Date.now();
  const mockData: Array<{
    prompt: string;
    style: ImageStyle;
    size: ImageSize;
    status: GenerationStatus;
    generationTime: number;
  }> = [
    {
      prompt: 'A beautiful sunset over mountains with golden clouds',
      style: 'realistic',
      size: '512x512',
      status: 'completed',
      generationTime: 3200,
    },
    {
      prompt: 'Cute anime character with blue hair and magical staff',
      style: 'anime',
      size: '512x512',
      status: 'completed',
      generationTime: 2800,
    },
    {
      prompt: 'Abstract digital art with neon colors and geometric shapes',
      style: 'digital-art',
      size: '768x768',
      status: 'completed',
      generationTime: 4100,
    },
    {
      prompt: 'Portrait of a woman in oil painting style',
      style: 'oil-painting',
      size: '512x512',
      status: 'completed',
      generationTime: 3500,
    },
    {
      prompt: 'Cherry blossoms by a serene lake',
      style: 'watercolor',
      size: '1024x768',
      status: 'completed',
      generationTime: 3800,
    },
    {
      prompt: 'Architectural sketch of a modern building',
      style: 'sketch',
      size: '768x1024',
      status: 'completed',
      generationTime: 2600,
    },
    {
      prompt: 'Futuristic cityscape with flying cars',
      style: 'cyberpunk',
      size: '1024x1024',
      status: 'failed',
      generationTime: 0,
    },
    {
      prompt: 'Dragon flying over a medieval castle',
      style: 'fantasy',
      size: '1024x768',
      status: 'completed',
      generationTime: 4500,
    },
  ];

  return mockData.map((item, index) => {
    const id = `mock-${index}-${now - index * 86400000}`;
    return {
      id,
      prompt: item.prompt,
      negativePrompt: index % 2 === 0 ? 'blurry, low quality, distorted' : undefined,
      style: item.style,
      size: item.size,
      seed: Math.floor(Math.random() * 1000000),
      status: item.status,
      resultUrl:
        item.status === 'completed'
          ? generatePlaceholderUrl(item.size, item.style, item.prompt)
          : '',
      createdAt: now - index * 86400000,
      generationTime: item.generationTime,
    };
  });
};

export const useImageStore = create<ImageStore>()(
  persist(
    (set, get) => ({
      generations: createMockGenerations(),
      settings: {
        defaultStyle: 'realistic',
        defaultSize: '512x512',
        autoSave: true,
        showNegativePrompt: false,
      },
      gallery: [],

      createGeneration: (params) => {
        const id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newGeneration: ImageGeneration = {
          ...params,
          id,
          status: 'generating',
          resultUrl: '',
          createdAt: Date.now(),
          generationTime: 0,
        };

        set((state) => ({
          generations: [newGeneration, ...state.generations],
        }));

        return id;
      },

      updateGenerationStatus: (id, status, resultUrl, generationTime) => {
        set((state) => ({
          generations: state.generations.map((gen) =>
            gen.id === id
              ? {
                  ...gen,
                  status,
                  resultUrl: resultUrl ?? gen.resultUrl,
                  generationTime: generationTime ?? gen.generationTime,
                }
              : gen
          ),
        }));
      },

      deleteGeneration: (id) => {
        set((state) => ({
          generations: state.generations.filter((gen) => gen.id !== id),
          gallery: state.gallery.filter((gid) => gid !== id),
        }));
      },

      addToGallery: (id) => {
        set((state) => ({
          gallery: state.gallery.includes(id) ? state.gallery : [...state.gallery, id],
        }));
      },

      removeFromGallery: (id) => {
        set((state) => ({
          gallery: state.gallery.filter((gid) => gid !== id),
        }));
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      clearHistory: () => {
        set(() => ({
          generations: [],
          gallery: [],
        }));
      },

      getGenerationById: (id) => {
        return get().generations.find((gen) => gen.id === id);
      },

      isInGallery: (id) => {
        return get().gallery.includes(id);
      },
    }),
    {
      name: 'ai-assistant-image-store',
      partialize: (state) => ({
        generations: state.generations,
        settings: state.settings,
        gallery: state.gallery,
      }),
    }
  )
);
