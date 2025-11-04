import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

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
    footerPrivacyNotice: 'All processing is private and happens locally in your browser.',
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
    footerPrivacyNotice: 'Todo o processamento é privado e acontece localmente no teu navegador.',
    footerOpenSourceNotice: 'Este projeto é open source sob a licença MIT.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'pt' ? 'pt' : 'en') as Language;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
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
