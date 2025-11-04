import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LANGUAGE_STORAGE_KEY = 'ppc-language';

const translations = {
  en: {
    appTitle: 'Product Poster Creator',
    formTitle: 'Items for Sale',
    title: 'Title',
    titlePlaceholder: 'Enter listing title',
    price: 'Price',
    pricePlaceholder: 'Digits only (currency prefix added automatically)',
    description: 'Description',
    descriptionPlaceholder: 'Write a description for your listing',
    location: 'Location',
    locationPlaceholder: 'Location',
    uploadPhotos: 'Select Photos',
    uploadHint: 'Up to 4 images',
    generate: 'Generate Image',
    download: 'Download Image',
    tooltipCopyToClipboard: 'Copy to Clipboard',
    clearInputsButton: 'Clear Inputs',
    footerBuiltBy: 'Built by',
    preview: 'Your Listing',
    maxChars: 'characters',
    chooseFiles: 'Select Photos',
    imagesSelected: 'image(s) selected',
    chooseLanguage: 'Choose language',
    selectCurrency: 'Select currency',
    priceFree: 'FREE',
    priceInvalid: '—',
    previewTitleFallback: 'Listing title',
    previewDescriptionFallback: 'Add your product description',
    previewHintPrimary: 'Select up to four images to see them arranged automatically.',
    previewHintSecondary: 'Drag or pinch to fine-tune the layout.',
    previewLoading: 'Refreshing preview...',
    resetLayout: 'Reset Layout',
    resizeHandleLabel: 'Resize image',
    toastLayoutError: 'Unable to prepare one of the images. Please try again.',
    toastGenerateError: 'Something went wrong while generating the preview.',
    toastDownloadSuccess: 'Listing image downloaded and details copied to clipboard!',
    toastCopySuccess: 'Listing details copied to clipboard!',
    toastCopyError: 'Unable to copy details to clipboard.',
    previewImageAlt: 'Generated listing preview',
    uploadedImageAltPrefix: 'Selected image',
    tooltipClearInputs: 'Clear Inputs',
    tooltipSelectLanguage: 'Select Language',
    tooltipToggleTheme: 'Change Theme',
    tooltipGeminiSettings: 'Configure AI settings',
    tooltipImproveTitle: 'Improve title with AI',
    tooltipImproveDescription: 'Improve description with AI',
    dialogGeminiTitle: 'Gemini API Key',
    dialogGeminiDescription: 'Enter your Gemini API key to unlock AI-powered assistance.',
    dialogGeminiInputLabel: 'Gemini API Key',
    dialogGeminiLocalNotice: 'Stored securely in your browser. Remove the key at any time.',
    dialogGeminiGenerateLink: 'Generate an API Key',
    dialogGeminiRemove: 'Remove Key',
    dialogGeminiSave: 'Save Key',
    toastGeminiSaved: 'Gemini API key saved.',
    toastGeminiCleared: 'Gemini API key removed.',
    toastGeminiMissingKey: 'Add a Gemini API key to use AI features.',
    toastGeminiTitleNeedsImage: 'Upload at least one photo before improving the title.',
    toastGeminiDescriptionNeedsContext: 'Provide a title or upload photos before improving the description.',
    toastGeminiTitleSuccess: 'Title refreshed with AI.',
    toastGeminiDescriptionSuccess: 'Description refreshed with AI.',
    toastGeminiAutoGenerateSuccess: 'Generated listing details from your photos.',
    toastGeminiError: 'Unable to generate AI suggestions right now.',
    footerPrivacyNotice: 'All processing is private and happens locally in your browser.',
    footerPrivacyNoticeWithAI:
      'Processing is private and happens locally in your browser & AI Generations are shared via Gemini API.',
    footerOpenSourceNotice: 'This project is open source under the MIT license.',
  },
  pt: {
    appTitle: 'Product Poster Creator',
    formTitle: 'Itens à venda',
    title: 'Título',
    titlePlaceholder: 'Insira o título do anúncio',
    price: 'Preço',
    pricePlaceholder: 'Apenas números (prefixo da moeda adicionado automaticamente)',
    description: 'Descrição',
    descriptionPlaceholder: 'Escreva uma descrição para o seu anúncio',
    location: 'Localização',
    locationPlaceholder: 'Localização',
    uploadPhotos: 'Selecionar fotos',
    uploadHint: 'Até 4 imagens',
    generate: 'Gerar Imagem',
    download: 'Descarregar Imagem',
    tooltipCopyToClipboard: 'Copiar para a área de transferência',
    clearInputsButton: 'Limpar campos',
    footerBuiltBy: 'Construído por',
    preview: 'A tua Listagem',
    maxChars: 'caracteres',
    chooseFiles: 'Selecionar fotos',
    imagesSelected: 'imagem(ns) selecionada(s)',
    chooseLanguage: 'Escolha o idioma',
    selectCurrency: 'Selecionar moeda',
    priceFree: 'OFERTA',
    priceInvalid: '—',
    previewTitleFallback: 'Título do anúncio',
    previewDescriptionFallback: 'Adicione a descrição do seu produto',
    previewHintPrimary: 'Selecione até quatro imagens para vê-las organizadas automaticamente.',
    previewHintSecondary: 'Mova ou redimensione para ajustar o layout.',
    previewLoading: 'Atualizando pré-visualização...',
    resetLayout: 'Reiniciar layout',
    resizeHandleLabel: 'Redimensionar imagem',
    toastLayoutError: 'Não foi possível preparar uma das imagens. Tente novamente.',
    toastGenerateError: 'Ocorreu um erro ao gerar a pré-visualização.',
    toastDownloadSuccess: 'Imagem da listagem descarregada e detalhes copiados para a área de transferência!',
    toastCopySuccess: 'Detalhes da listagem copiados para a área de transferência!',
    toastCopyError: 'Não foi possível copiar os detalhes para a área de transferência.',
    previewImageAlt: 'Prévia gerada do anúncio',
    uploadedImageAltPrefix: 'Imagem selecionada',
    tooltipClearInputs: 'Limpar campos',
    tooltipSelectLanguage: 'Selecionar idioma',
    tooltipToggleTheme: 'Alterar tema',
    tooltipGeminiSettings: 'Configurar definições de IA',
    tooltipImproveTitle: 'Melhorar título com IA',
    tooltipImproveDescription: 'Melhorar descrição com IA',
    dialogGeminiTitle: 'Chave API Gemini',
    dialogGeminiDescription: 'Introduz a tua chave API do Gemini para desbloquear assistentes de IA.',
    dialogGeminiInputLabel: 'Chave API Gemini',
    dialogGeminiLocalNotice: 'Guardada em segurança no teu navegador. Podes remover a chave a qualquer momento.',
    dialogGeminiGenerateLink: 'Gerar uma chave API',
    dialogGeminiRemove: 'Remover chave',
    dialogGeminiSave: 'Guardar chave',
    toastGeminiSaved: 'Chave API do Gemini guardada.',
    toastGeminiCleared: 'Chave API do Gemini removida.',
    toastGeminiMissingKey: 'Adiciona uma chave API do Gemini para usar as funcionalidades de IA.',
    toastGeminiTitleNeedsImage: 'Carrega pelo menos uma foto antes de melhorar o título.',
    toastGeminiDescriptionNeedsContext: 'Fornece um título ou carrega fotos antes de melhorar a descrição.',
    toastGeminiTitleSuccess: 'Título atualizado com IA.',
    toastGeminiDescriptionSuccess: 'Descrição atualizada com IA.',
    toastGeminiAutoGenerateSuccess: 'Detalhes da listagem gerados a partir das tuas fotos.',
    toastGeminiError: 'Não foi possível gerar sugestões de IA neste momento.',
    footerPrivacyNotice: 'Todo o processamento é privado e acontece localmente no teu navegador.',
    footerPrivacyNoticeWithAI:
      'O processamento é privado e acontece localmente no teu navegador & as gerações de IA são partilhadas via Gemini API.',
    footerOpenSourceNotice: 'Este projeto é open source sob a licença MIT.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'en';
    }

    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'pt' || stored === 'en') {
        return stored;
      }
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    } catch (error) {
      console.warn('Unable to read stored language, defaulting to English.', error);
    }

    return 'en';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.warn('Unable to persist language preference.', error);
    }

    document.documentElement.lang = language === 'pt' ? 'pt' : 'en';
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
