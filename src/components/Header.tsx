import { Moon, Sun, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useResetForm } from '@/contexts/ResetContext';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const resetForm = useResetForm();

  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

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
