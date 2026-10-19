export function getLanguageFlag(lang: string | undefined): string {
  if (!lang) return "🌐";
  const l = lang.trim().toLowerCase();
  switch (l) {
    case "fr":
      return "🇫🇷";
    case "us":
    case "en":
      return "🇺🇸";
    case "de":
      return "🇩🇪";
    case "br":
      return "🇧🇷";
    case "ca":
      return "🇨🇦";
    case "za":
      return "🇿🇦";
    case "au":
      return "🇦🇺";
    case "gb":
    case "uk":
      return "🇬🇧";
    case "es":
      return "🇪🇸";
    case "it":
      return "🇮🇹";
    case "jp":
      return "🇯🇵";
    case "ua":
      return "🇺🇦";
    case "kr":
      return "🇰🇷";
    case "cn":
      return "🇨🇳";
    case "pt":
      return "🇵🇹";
    default:
      return "🌐";
  }
}
