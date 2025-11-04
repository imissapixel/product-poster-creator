import { FormEvent, useEffect, useState } from 'react';
import { Moon, Sun, Globe, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useResetForm } from '@/contexts/ResetContext';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGeminiConfig } from '@/contexts/GeminiContext';

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const resetForm = useResetForm();
  const { apiKey, setApiKey, clearApiKey, isConfigured } = useGeminiConfig();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [localApiKey, setLocalApiKey] = useState('');

  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  useEffect(() => {
    if (isDialogOpen) {
      setLocalApiKey(apiKey ?? '');
    }
  }, [apiKey, isDialogOpen]);

  const handleSaveApiKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = localApiKey.trim();
    if (!trimmed) {
      return;
    }

    setApiKey(trimmed);
    setDialogOpen(false);
    toast.success(t('toastGeminiSaved'));
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setLocalApiKey('');
    setDialogOpen(false);
    toast.success(t('toastGeminiCleared'));
  };

  return (
    <header className="border-b border-border bg-card w-full">
      <div className="container mx-auto px-4 py-4 w-full">
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={resetForm} className="flex items-center gap-3 group">
                <img src={logoSrc} alt="Product Poster Creator logo" className="h-10 w-10 flex-shrink-0 object-contain transition group-hover:scale-105" />
                <h1 className="text-lg font-bold text-foreground sm:text-xl md:text-2xl">
                  {t('appTitle')}
                </h1>
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('tooltipClearInputs')}</TooltipContent>
          </Tooltip>
          
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('rounded-full', isConfigured && 'text-primary')}
                      aria-label={t('tooltipGeminiSettings')}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('tooltipGeminiSettings')}</TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('dialogGeminiTitle')}</DialogTitle>
                  <DialogDescription>{t('dialogGeminiDescription')}</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSaveApiKey}>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-api-key">{t('dialogGeminiInputLabel')}</Label>
                    <Input
                      id="gemini-api-key"
                      type="password"
                      value={localApiKey}
                      onChange={(event) => setLocalApiKey(event.target.value)}
                      autoComplete="off"
                      placeholder="AIza..."
                    />
                    <p className="text-xs text-muted-foreground">{t('dialogGeminiLocalNotice')}</p>
                    <a
                      href="https://aistudio.google.com/app/api-keys"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs font-medium text-primary underline underline-offset-4"
                    >
                      {t('dialogGeminiGenerateLink')}
                    </a>
                  </div>
                  <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Button type="button" variant="outline" onClick={handleClearApiKey} disabled={!isConfigured}>
                      {t('dialogGeminiRemove')}
                    </Button>
                    <Button type="submit" disabled={localApiKey.trim().length === 0}>
                      {t('dialogGeminiSave')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Select value={language} onValueChange={(val) => setLanguage(val as 'en' | 'pt')}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger
                    className="h-10 w-10 justify-center rounded-full border-0 bg-transparent hover:bg-accent [&>svg:last-child]:hidden"
                    aria-label={language === 'en' ? 'Change language (English selected)' : 'Mudar idioma (Português selecionado)'}
                  >
                    <Globe className="h-[18px] w-[18px] shrink-0" />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('tooltipSelectLanguage')}</TooltipContent>
              </Tooltip>
              <SelectContent align="end">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-full"
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('tooltipToggleTheme')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
};
