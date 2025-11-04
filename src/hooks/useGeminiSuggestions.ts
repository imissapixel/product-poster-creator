import { useCallback } from 'react';
import { useGeminiConfig } from '@/contexts/GeminiContext';

interface InlinePart {
  inline_data: {
    mime_type: string;
    data: string;
  };
}

interface ImageAttachment {
  file?: File;
  url?: string;
}

interface BaseContext {
  locale: string;
  currentTitle?: string;
  currentDescription?: string;
  description?: string;
  location?: string;
  attachments?: ImageAttachment[];
}

interface TitleSuggestionContext extends BaseContext {
  maxLength: number;
}

interface DescriptionSuggestionContext extends BaseContext {
  maxLength: number;
  minLength?: number;
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const trimToCharLimit = (input: string, maxLength: number) => {
  if (!input) {
    return '';
  }

  if (input.length <= maxLength) {
    return input.trim();
  }

  const truncated = input.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength - 20) {
    return truncated.slice(0, lastSpace).trim();
  }

  return truncated.trim();
};

const fileToInlinePart = (file: File): Promise<InlinePart> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read image contents for Gemini request.'));
        return;
      }

      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        inline_data: {
          mime_type: file.type || 'image/jpeg',
          data: base64,
        },
      });
    };
    reader.onerror = () => {
      reject(new Error('Unable to read image file.'));
    };
    reader.readAsDataURL(file);
  });
};

const urlToInlinePart = (url: string): Promise<InlinePart> => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch image from ${url}`);
        }
        return response.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Unable to read image contents for Gemini request.'));
            return;
          }

          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve({
            inline_data: {
              mime_type: blob.type || 'image/jpeg',
              data: base64,
            },
          });
        };
        reader.onerror = () => {
          reject(new Error('Unable to read image file.'));
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const gatherInlineParts = async (attachments?: ImageAttachment[]): Promise<InlinePart[]> => {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const unique: ImageAttachment[] = [];
  const seenFiles = new Set<string>();
  const seenUrls = new Set<string>();

  attachments.forEach((attachment) => {
    const { file, url } = attachment;
    if (!file && !url) {
      return;
    }

    if (file) {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (seenFiles.has(fileKey)) {
        return;
      }
      seenFiles.add(fileKey);
    }

    if (url) {
      if (seenUrls.has(url)) {
        return;
      }
      seenUrls.add(url);
    }

    unique.push(attachment);
  });

  if (unique.length === 0) {
    return [];
  }

  return Promise.all(
    unique.map((attachment) => {
      if (attachment.file) {
        return fileToInlinePart(attachment.file);
      }
      return urlToInlinePart(attachment.url as string);
    })
  );
};

export const useGeminiSuggestions = () => {
  const { apiKey } = useGeminiConfig();

  const requestGemini = useCallback(
    async (parts: Array<{ text?: string } | InlinePart>) => {
      if (!apiKey) {
        throw new Error('Missing Gemini API key.');
      }

      const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.error?.message || 'Failed to generate content with Gemini.';
        throw new Error(message);
      }

      const candidate = payload?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(candidate)
        ? candidate
            .map((part: { text?: string }) => part?.text?.trim())
            .filter(Boolean)
            .join(' ')
            .trim()
        : '';

      if (!text) {
        throw new Error('Gemini did not return any text.');
      }

      return text;
    },
    [apiKey]
  );

  const buildSharedPrompt = (context: BaseContext) => {
    const { currentTitle, currentDescription, location } = context;

    const summaries: string[] = [];

    if (currentTitle) {
      summaries.push(`Existing title: ${currentTitle}`);
    }
    if (currentDescription) {
      summaries.push(`Existing description: ${currentDescription}`);
    }
    if (location) {
      summaries.push(`Location: ${location}`);
    }

    return summaries;
  };

  const suggestTitle = useCallback(
    async (context: TitleSuggestionContext) => {
      const { locale, currentDescription, description, attachments, maxLength } = context;
      const attachmentCount = attachments?.length ?? 0;
      const inlineParts = await gatherInlineParts(attachments);

      const summaries = buildSharedPrompt(context);

      const parts: Array<{ text?: string } | InlinePart> = [
        {
          text: `You are an expert marketplace copywriter. Craft a compelling listing title in ${locale}.`,
        },
        {
          text: `Keep the title within ${maxLength} characters. Return only the improved title without quotes or commentary.`,
        },
        {
          text: `Max title characters allowed: ${maxLength}. Do not exceed this limit.`,
        },
        {
          text: 'Do not mention pricing, discounts, or currency details in the title.',
        },
        {
          text: `Reply exclusively in ${locale}.`,
        },
      ];

      if (summaries.length > 0 || currentDescription || description) {
        parts.push({
          text: `Context: ${[...summaries, currentDescription ? `Description: ${currentDescription}` : null, description ? `Draft description: ${description}` : null]
            .filter(Boolean)
            .join(' | ')}`,
        });
      }

      if (inlineParts.length > 0) {
        if (attachmentCount > 1) {
          parts.push({
            text: 'Multiple distinct items appear across the photos. Craft a title that reflects the collection rather than a single product.',
          });
        }
        parts.push({ text: 'Product photos are attached below. Incorporate any visual cues into the title when helpful.' });
        parts.push(...inlineParts);
      }

      parts.push({ text: 'Focus on clarity and appeal. Reply with the title only.' });

      const raw = await requestGemini(parts);
      return trimToCharLimit(raw, maxLength);
    },
    [requestGemini]
  );

  const suggestDescription = useCallback(
    async (context: DescriptionSuggestionContext) => {
      const { locale, description, attachments, maxLength, minLength } = context;
      const attachmentCount = attachments?.length ?? 0;
      const inlineParts = await gatherInlineParts(attachments);

      const summaries = buildSharedPrompt(context);

      const parts: Array<{ text?: string } | InlinePart> = [
        {
          text: `You are helping improve a marketplace listing description in ${locale}.`,
        },
        {
          text: `Write a descriptive, easy-to-read paragraph between ${minLength ?? 120} and ${maxLength} characters. Sound like an individual selling a gently used item, highlighting honest condition details, how it has been cared for, and why it is still useful.`,
        },
        {
          text: 'Use concise sentences, avoid marketing buzzwords or bullet points, and reply with the description text only.',
        },
        {
          text: `Max description characters allowed: ${maxLength}. Never exceed this limit.`,
        },
        {
          text: 'Do not mention pricing, discounts, or currency details in the description.',
        },
        {
          text: `Reply exclusively in ${locale}.`,
        },
      ];

      if (summaries.length > 0 || description) {
        parts.push({
          text: `Context: ${[...summaries, description ? `Draft description: ${description}` : null]
            .filter(Boolean)
            .join(' | ')}`,
        });
      }

      if (!description && context.currentTitle) {
        parts.push({
          text: `No draft description is available. Use the listing title "${context.currentTitle}" to infer product highlights and craft the response.`,
        });
      }

      if (inlineParts.length > 0) {
        if (attachmentCount > 1) {
          parts.push({
            text: 'Multiple different items are visible in the photos. Describe each item briefly and clarify if they are sold together.',
          });
        }
        parts.push({ text: 'Product photos are attached below. Highlight notable visual attributes if they strengthen the description.' });
        parts.push(...inlineParts);
      }

      const raw = await requestGemini(parts);
      return trimToCharLimit(raw, maxLength);
    },
    [requestGemini]
  );

  return {
    suggestTitle,
    suggestDescription,
  };
};
