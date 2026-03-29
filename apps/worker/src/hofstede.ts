/**
 * Hofstede Cultural Dimensions — static data for 50 major markets.
 * Source: Hofstede Insights, 2023. Scores are 0-100.
 * PDI = Power Distance Index
 * IDV = Individualism
 * MAS = Masculinity
 * UAI = Uncertainty Avoidance Index
 * LTO = Long-Term Orientation
 */

export type HofstedeProfile = {
    country: string;
    country_code: string;
    pdi: number; // Power Distance
    idv: number; // Individualism
    mas: number; // Masculinity
    uai: number; // Uncertainty Avoidance
    lto: number; // Long-Term Orientation
};

export const HOFSTEDE_DATA: Record<string, HofstedeProfile> = {
    US:  { country: 'United States', country_code: 'US',  pdi: 40,  idv: 91, mas: 62, uai: 46, lto: 26 },
    GB:  { country: 'United Kingdom', country_code: 'GB', pdi: 35,  idv: 89, mas: 66, uai: 35, lto: 51 },
    DE:  { country: 'Germany', country_code: 'DE',        pdi: 35,  idv: 67, mas: 66, uai: 65, lto: 83 },
    JP:  { country: 'Japan', country_code: 'JP',          pdi: 54,  idv: 46, mas: 95, uai: 92, lto: 88 },
    CN:  { country: 'China', country_code: 'CN',          pdi: 80,  idv: 20, mas: 66, uai: 30, lto: 87 },
    FR:  { country: 'France', country_code: 'FR',         pdi: 68,  idv: 71, mas: 43, uai: 86, lto: 63 },
    NL:  { country: 'Netherlands', country_code: 'NL',    pdi: 38,  idv: 80, mas: 14, uai: 53, lto: 67 },
    SE:  { country: 'Sweden', country_code: 'SE',         pdi: 31,  idv: 71, mas: 5,  uai: 29, lto: 53 },
    KR:  { country: 'South Korea', country_code: 'KR',    pdi: 60,  idv: 18, mas: 39, uai: 85, lto: 100 },
    IN:  { country: 'India', country_code: 'IN',          pdi: 77,  idv: 48, mas: 56, uai: 40, lto: 51 },
    AU:  { country: 'Australia', country_code: 'AU',      pdi: 36,  idv: 90, mas: 61, uai: 51, lto: 21 },
    CA:  { country: 'Canada', country_code: 'CA',         pdi: 39,  idv: 80, mas: 52, uai: 48, lto: 36 },
    CH:  { country: 'Switzerland', country_code: 'CH',    pdi: 34,  idv: 68, mas: 70, uai: 58, lto: 74 },
    DK:  { country: 'Denmark', country_code: 'DK',        pdi: 18,  idv: 74, mas: 16, uai: 23, lto: 35 },
    NO:  { country: 'Norway', country_code: 'NO',         pdi: 31,  idv: 69, mas: 8,  uai: 50, lto: 35 },
    HK:  { country: 'Hong Kong', country_code: 'HK',      pdi: 68,  idv: 25, mas: 57, uai: 29, lto: 61 },
    SG:  { country: 'Singapore', country_code: 'SG',      pdi: 74,  idv: 20, mas: 48, uai: 8,  lto: 72 },
    BR:  { country: 'Brazil', country_code: 'BR',         pdi: 69,  idv: 38, mas: 49, uai: 76, lto: 44 },
    MX:  { country: 'Mexico', country_code: 'MX',         pdi: 81,  idv: 30, mas: 69, uai: 82, lto: 24 },
    RU:  { country: 'Russia', country_code: 'RU',         pdi: 93,  idv: 39, mas: 36, uai: 95, lto: 81 },
    ZA:  { country: 'South Africa', country_code: 'ZA',   pdi: 49,  idv: 65, mas: 63, uai: 49, lto: 34 },
    IT:  { country: 'Italy', country_code: 'IT',          pdi: 50,  idv: 76, mas: 70, uai: 75, lto: 61 },
    ES:  { country: 'Spain', country_code: 'ES',          pdi: 57,  idv: 51, mas: 42, uai: 86, lto: 48 },
    FI:  { country: 'Finland', country_code: 'FI',        pdi: 33,  idv: 63, mas: 26, uai: 59, lto: 38 },
    BE:  { country: 'Belgium', country_code: 'BE',        pdi: 65,  idv: 75, mas: 54, uai: 94, lto: 82 },
    AT:  { country: 'Austria', country_code: 'AT',        pdi: 11,  idv: 55, mas: 79, uai: 70, lto: 60 },
    PL:  { country: 'Poland', country_code: 'PL',         pdi: 68,  idv: 60, mas: 64, uai: 93, lto: 38 },
    PT:  { country: 'Portugal', country_code: 'PT',       pdi: 63,  idv: 27, mas: 31, uai: 104, lto: 28 },
    GR:  { country: 'Greece', country_code: 'GR',         pdi: 60,  idv: 35, mas: 57, uai: 112, lto: 45 },
    TW:  { country: 'Taiwan', country_code: 'TW',         pdi: 58,  idv: 17, mas: 45, uai: 69, lto: 93 },
    TH:  { country: 'Thailand', country_code: 'TH',       pdi: 64,  idv: 20, mas: 34, uai: 64, lto: 32 },
    ID:  { country: 'Indonesia', country_code: 'ID',      pdi: 78,  idv: 14, mas: 46, uai: 48, lto: 62 },
    MY:  { country: 'Malaysia', country_code: 'MY',       pdi: 100, idv: 26, mas: 50, uai: 36, lto: 41 },
    PH:  { country: 'Philippines', country_code: 'PH',    pdi: 94,  idv: 32, mas: 64, uai: 44, lto: 27 },
    SA:  { country: 'Saudi Arabia', country_code: 'SA',   pdi: 95,  idv: 25, mas: 60, uai: 80, lto: 36 },
    AE:  { country: 'UAE', country_code: 'AE',            pdi: 90,  idv: 25, mas: 50, uai: 80, lto: 36 },
    TR:  { country: 'Turkey', country_code: 'TR',         pdi: 66,  idv: 37, mas: 45, uai: 85, lto: 46 },
    AR:  { country: 'Argentina', country_code: 'AR',      pdi: 49,  idv: 46, mas: 56, uai: 86, lto: 20 },
    CO:  { country: 'Colombia', country_code: 'CO',       pdi: 67,  idv: 13, mas: 64, uai: 80, lto: 13 },
    CL:  { country: 'Chile', country_code: 'CL',          pdi: 63,  idv: 23, mas: 28, uai: 86, lto: 31 },
    NZ:  { country: 'New Zealand', country_code: 'NZ',    pdi: 22,  idv: 79, mas: 58, uai: 49, lto: 33 },
    IE:  { country: 'Ireland', country_code: 'IE',        pdi: 28,  idv: 70, mas: 68, uai: 35, lto: 24 },
    IL:  { country: 'Israel', country_code: 'IL',         pdi: 13,  idv: 54, mas: 47, uai: 81, lto: 38 },
    CZ:  { country: 'Czech Republic', country_code: 'CZ', pdi: 57,  idv: 58, mas: 57, uai: 74, lto: 70 },
    HU:  { country: 'Hungary', country_code: 'HU',        pdi: 46,  idv: 80, mas: 88, uai: 82, lto: 58 },
    RO:  { country: 'Romania', country_code: 'RO',        pdi: 90,  idv: 30, mas: 42, uai: 90, lto: 52 },
    EG:  { country: 'Egypt', country_code: 'EG',          pdi: 70,  idv: 25, mas: 45, uai: 80, lto: 7  },
    NG:  { country: 'Nigeria', country_code: 'NG',        pdi: 80,  idv: 30, mas: 60, uai: 55, lto: 13 },
    PK:  { country: 'Pakistan', country_code: 'PK',       pdi: 55,  idv: 14, mas: 50, uai: 70, lto: 50 },
    VN:  { country: 'Vietnam', country_code: 'VN',        pdi: 70,  idv: 20, mas: 40, uai: 30, lto: 57 },
};

// Exchange → country_code mapping
export const EXCHANGE_COUNTRY: Record<string, string> = {
    NASDAQ: 'US', NYSE: 'US', AMEX: 'US', OTC: 'US', 'OTC MARKETS': 'US',
    LSE: 'GB', 'LONDON STOCK EXCHANGE': 'GB',
    FSE: 'DE', XETRA: 'DE', 'FRANKFURT STOCK EXCHANGE': 'DE',
    TSE: 'JP', 'TOKYO STOCK EXCHANGE': 'JP', TYO: 'JP',
    SSE: 'CN', SZSE: 'CN',
    'PARIS STOCK EXCHANGE': 'FR', EURONEXT: 'FR', PAR: 'FR',
    AEX: 'NL', 'EURONEXT AMSTERDAM': 'NL',
    'STOCKHOLM STOCK EXCHANGE': 'SE', 'NASDAQ STOCKHOLM': 'SE',
    KOSPI: 'KR', KOSDAQ: 'KR',
    BSE: 'IN', NSE: 'IN',
    ASX: 'AU',
    TSX: 'CA', TSXV: 'CA',
    SIX: 'CH',
    HKEX: 'HK', 'HONG KONG STOCK EXCHANGE': 'HK',
    SGX: 'SG',
    MIL: 'IT', 'BORSA ITALIANA': 'IT',
    OSE: 'NO', 'OSLO STOCK EXCHANGE': 'NO',
    OMX: 'DK',
};

export function getCulturalProfile(exchange: string | null | undefined): HofstedeProfile | null {
    if (!exchange) return null;
    const upper = exchange.toUpperCase();
    // Direct lookup
    if (EXCHANGE_COUNTRY[upper]) return HOFSTEDE_DATA[EXCHANGE_COUNTRY[upper]] ?? null;
    // Partial match
    for (const key of Object.keys(EXCHANGE_COUNTRY)) {
        if (upper.includes(key)) return HOFSTEDE_DATA[EXCHANGE_COUNTRY[key]] ?? null;
    }
    return null;
}

export function buildCulturalImplications(profile: HofstedeProfile): string {
    const lines: string[] = [];
    lines.push(`📊 Cultural Market Context — ${profile.country}`);
    lines.push(`UAI ${profile.uai}/100: ${profile.uai > 65 ? 'High uncertainty avoidance — investors may overreact to ambiguous data or guidance misses.' : profile.uai < 40 ? 'Low uncertainty avoidance — market may be more tolerant of volatile earnings.' : 'Moderate uncertainty avoidance.'}`);
    lines.push(`IDV ${profile.idv}/100: ${profile.idv > 65 ? 'High individualism — investor decisions are independent, less herd-driven.' : profile.idv < 35 ? 'Collectivist market — institutional consensus and herd behaviour more common.' : 'Mixed individualism.'}`);
    lines.push(`LTO ${profile.lto}/100: ${profile.lto > 65 ? 'Long-term orientation — local investors favour compounding value over short-term gains.' : profile.lto < 35 ? 'Short-term orientation — earnings beats and buybacks drive local sentiment more than long-term strategy.' : 'Balanced time orientation.'}`);
    lines.push(`PDI ${profile.pdi}/100: ${profile.pdi > 65 ? 'High power distance — management decisions are trusted without challenge; less shareholder activism.' : profile.pdi < 35 ? 'Low power distance — management scrutinised; governance transparency matters more to local investors.' : 'Moderate power distance.'}`);
    return JSON.stringify({ country: profile.country, country_code: profile.country_code, pdi: profile.pdi, idv: profile.idv, mas: profile.mas, uai: profile.uai, lto: profile.lto, implications: lines });
}
