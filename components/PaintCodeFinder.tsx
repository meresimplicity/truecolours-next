'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  getBrandNames,
  getModelsForBrand,
  getMarketsForVehicle,
  findColorsForVehicle,
  searchByCode,
  type PaintColor,
} from '@/data/paint-codes-data';
import { siteConfig } from '@/config/site';

const WHATSAPP_NUMBER = siteConfig?.whatsappNumber || '27672885241';

type Mode = 'vehicle' | 'code';

function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function ResultRow({
  item,
  subtitle,
  message,
}: {
  item: PaintColor;
  subtitle: string;
  message: string;
}) {
  return (
    <li className="tcf-result">
      <span className="tcf-swatch" style={{ background: item.hex }} aria-hidden="true" />
      <div className="tcf-result-info">
        <strong>{item.name}</strong>
        <span className="tcf-code">Code: {item.code}</span>
        <span className="tcf-vehicle">{subtitle}</span>
        {item.finish && <span className="tcf-finish">Finish: {item.finish}</span>}
        {!item.verified && <span className="tcf-flag">Unverified entry</span>}
      </div>
      <a className="tcf-whatsapp" href={buildWhatsAppLink(message)} target="_blank" rel="noopener noreferrer">
        Check on WhatsApp
      </a>
    </li>
  );
}

export default function PaintCodeFinder() {
  const [mode, setMode] = useState<Mode>('vehicle');

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [market, setMarket] = useState('South Africa');
  const [codeQuery, setCodeQuery] = useState('');

  const [hasSearched, setHasSearched] = useState(false);
  const [vehicleResults, setVehicleResults] = useState<PaintColor[]>([]);
  const [codeResults, setCodeResults] = useState<ReturnType<typeof searchByCode>>([]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => currentYear + 1 - i),
    [currentYear]
  );

  const brands = useMemo(() => getBrandNames(), []);
  const models = useMemo(() => (brand ? getModelsForBrand(brand) : []), [brand]);
  const markets = useMemo(() => (brand && model ? getMarketsForVehicle(brand, model) : []), [brand, model]);

  function switchMode(next: Mode) {
    setMode(next);
    setHasSearched(false);
  }

  function handleBrandChange(next: string) {
    setBrand(next);
    setModel('');
    setMarket('South Africa');
    setHasSearched(false);
  }

  function handleModelChange(next: string) {
    setModel(next);
    setMarket('South Africa');
    setHasSearched(false);
  }

  function handleFindByVehicle(e: FormEvent) {
    e.preventDefault();
    if (!brand || !model || !year) return;
    setVehicleResults(findColorsForVehicle(brand, model, Number(year), market || 'South Africa'));
    setHasSearched(true);
  }

  function handleFindByCode(e: FormEvent) {
    e.preventDefault();
    if (!codeQuery.trim()) return;
    setCodeResults(searchByCode(codeQuery));
    setHasSearched(true);
  }

  const vehicleEmpty = mode === 'vehicle' && hasSearched && vehicleResults.length === 0;
  const codeEmpty = mode === 'code' && hasSearched && codeResults.length === 0;

  return (
    <section className="tcf" aria-labelledby="tcf-heading">
      <div className="tcf-head">
        <h2 id="tcf-heading">FIND COLOR</h2>
      </div>

      <div className="tcf-steps" aria-label="Paint finder steps">
        <div className="tcf-step">
          <div className="tcf-step-icon" aria-hidden="true">
            <svg viewBox="0 0 84 84" className="icon car-icon">
              <path d="M16 44l12-20h28l11 20v14H16V44Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M25 42h34l-4-9H29l-4 9Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="29" cy="58" r="6" fill="none" stroke="currentColor" strokeWidth="3.5"/>
              <circle cx="55" cy="58" r="6" fill="none" stroke="currentColor" strokeWidth="3.5"/>
            </svg>
          </div>
          <div className="tcf-step-number">1</div>
          <div className="tcf-step-label">Select Brand</div>
        </div>

        <div className="tcf-step">
          <div className="tcf-step-icon" aria-hidden="true">
            <svg viewBox="0 0 84 84" className="icon hand-icon">
              <path d="M27 41V24c0-4 3-7 7-7s7 3 7 7v8m0-8c0-4 3-7 7-7s7 3 7 7v8m0-11c0-4 3-7 7-7s7 3 7 7v21c0 14-11 26-26 26H37c-9 0-16-7-16-16v-7c0-6 5-11 11-11h7v-6c0-4 3-7 7-7s7 3 7 7v7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M34 38h17" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="tcf-step-number active">2</div>
          <div className="tcf-step-label">Find Your Color</div>
        </div>

        <div className="tcf-step">
          <div className="tcf-step-icon" aria-hidden="true">
            <svg viewBox="0 0 84 84" className="icon truck-icon">
              <path d="M14 30h29v16h-8l-6 9h-15V30Zm29 0h12l11 14v11H43V30Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="27" cy="58" r="6" fill="none" stroke="currentColor" strokeWidth="3.5"/>
              <circle cx="58" cy="58" r="6" fill="none" stroke="currentColor" strokeWidth="3.5"/>
            </svg>
          </div>
          <div className="tcf-step-number">3</div>
          <div className="tcf-step-label">Order</div>
        </div>
      </div>

      <div className="tcf-mode" role="group" aria-label="Search method">
        <button
          type="button"
          className={mode === 'vehicle' ? 'is-active' : ''}
          aria-pressed={mode === 'vehicle'}
          onClick={() => switchMode('vehicle')}
        >
          Search by vehicle
        </button>
        <button
          type="button"
          className={mode === 'code' ? 'is-active' : ''}
          aria-pressed={mode === 'code'}
          onClick={() => switchMode('code')}
        >
          I have my code
        </button>
      </div>

      {mode === 'vehicle' ? (
        <form className="tcf-form" onSubmit={handleFindByVehicle}>
          <label className="tcf-field tcf-field--full">
            <select value={brand} onChange={(e) => handleBrandChange(e.target.value)} required>
              <option value="" disabled>
                Select Brand
              </option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="tcf-field tcf-field--full">
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              required
              disabled={!brand}
            >
              <option value="" disabled>
                {brand ? 'Select Model' : 'Select Model'}
              </option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="tcf-field tcf-field--full">
            <select value={year} onChange={(e) => setYear(e.target.value)} required>
              <option value="" disabled>
                Select Year
              </option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="tcf-submit">
            Find Color
          </button>
        </form>
      ) : (
        <form className="tcf-form tcf-form--code" onSubmit={handleFindByCode}>
          <label className="tcf-field tcf-field--full">
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="Enter paint code or colour name"
              required
            />
          </label>
          <button type="submit" className="tcf-submit">
            Search
          </button>
        </form>
      )}

      {mode === 'vehicle' && hasSearched && vehicleResults.length > 0 && (
        <ul className="tcf-results">
          {vehicleResults.map((c, i) => (
            <ResultRow
              key={`${c.code}-${i}`}
              item={c}
              subtitle={`${brand} ${model} · ${year} · ${market || 'South Africa'}`}
              message={`Hi TRUECOLOURS, I'd like to check stock/pricing for my ${brand} ${model} (${year}) — ${c.name}, code ${c.code}.`}
            />
          ))}
        </ul>
      )}

      {mode === 'code' && hasSearched && codeResults.length > 0 && (
        <ul className="tcf-results">
          {codeResults.map((c, i) => (
            <ResultRow
              key={`${c.code}-${c.brand}-${c.model}-${i}`}
              item={c}
              subtitle={`${c.brand} ${c.model} · ${c.yearFrom}–${c.yearTo}`}
              message={`Hi TRUECOLOURS, I'd like to check stock/pricing for ${c.brand} ${c.model} — ${c.name}, code ${c.code}.`}
            />
          ))}
        </ul>
      )}

      {(vehicleEmpty || codeEmpty) && (
        <div className="tcf-empty">
          <p>Paint information not yet verified for this vehicle.</p>
          <p>Send us a photo of your paint code, fuel cap, or vehicle and our team will match it in-store.</p>
          <a
            className="tcf-whatsapp"
            href={buildWhatsAppLink(
              "Hi TRUECOLOURS, I couldn't find my paint code on the site — can you help me match it?"
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Send it on WhatsApp
          </a>
        </div>
      )}

      <details className="tcf-locate">
        <summary>Where do I find my paint code?</summary>
        <p>
          It&apos;s usually printed on a small sticker or plate, and the exact spot depends on
          your manufacturer. Common places to check:
        </p>
        <ul>
          <li>Inside the engine bay, near the right-hand strut tower or radiator support</li>
          <li>Driver&apos;s side door jamb, often on the same sticker as tyre pressure info</li>
          <li>Glovebox lid, or behind the glovebox</li>
          <li>Boot area — under the floor mat, on the spare wheel well, or the rear panel</li>
        </ul>
        <p>Can&apos;t find it? Bring the car, a fuel cap, or a photo in-store and we&apos;ll match it directly.</p>
      </details>

      <p className="tcf-disclaimer">
        Screen colours are a guide only. OEM paint codes are displayed as the manufacturer-facing reference,
        while the swatch is only a digital approximation.
      </p>

      <style jsx>{`
        .tcf {
          --tcf-ink: #171412;
          --tcf-line: #2d2d2d;
          --tcf-paper: #f3f0ed;
          --tcf-soft: #f7f6f4;
          --tcf-subtle: #9f9f9f;
          --tcf-red: #e52452;
          --tcf-pink: #f0566d;
          --tcf-orange: #db5b40;
          --tcf-shadow: rgba(20, 20, 20, 0.09);
          width: min(100%, 1160px);
          color: var(--tcf-ink);
          background: transparent;
          padding: 0;
        }

        .tcf-head {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .tcf-head h2 {
          margin: 0;
          font-size: clamp(2.5rem, 4vw, 4rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
          font-weight: 900;
          color: #111111;
          text-align: center;
        }

        .tcf-head::after {
          content: "";
          display: block;
          width: 100%;
          max-width: 360px;
          height: 5px;
          background: #111111;
          border-radius: 999px;
          margin: 16px auto 0;
        }

        .tcf-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin: 26px 0 30px;
        }

        .tcf-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }

        .tcf-step-icon {
          width: clamp(5.75rem, 12vw, 8.75rem);
          height: clamp(5.75rem, 12vw, 8.75rem);
          border-radius: 50%;
          border: 3px solid var(--tcf-red);
          background: rgba(255,255,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--tcf-red);
          box-shadow: inset 0 0 0 1px rgba(229, 36, 82, 0.12);
        }

        .icon {
          width: clamp(2.3rem, 4vw, 3.1rem);
          height: clamp(2.3rem, 4vw, 3.1rem);
          display: block;
        }

        .tcf-step-number {
          font-size: clamp(2rem, 3vw, 2.6rem);
          line-height: 1;
          font-weight: 800;
          color: #111111;
        }

        .tcf-step-number.active {
          color: var(--tcf-red);
        }

        .tcf-step-label {
          font-size: clamp(1.05rem, 1.7vw, 1.5rem);
          line-height: 1.1;
          font-weight: 700;
          color: #111111;
          letter-spacing: -0.04em;
        }

        .tcf-mode {
          display: none;
        }

        .tcf-form {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .tcf-field {
          display: flex;
          flex-direction: column;
        }

        .tcf-field--full {
          width: 100%;
        }

        .tcf-field select,
        .tcf-field input {
          width: 100%;
          min-height: 64px;
          border: 2px solid #1b1b1b;
          border-radius: 16px;
          background: rgba(255,255,255,0.18);
          color: #111111;
          font-size: 1.1rem;
          font-weight: 500;
          padding: 0 20px;
          appearance: none;
          -webkit-appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, #111 50%), linear-gradient(135deg, #111 50%, transparent 50%);
          background-position: calc(100% - 20px) calc(50% - 5px), calc(100% - 15px) calc(50% - 5px);
          background-size: 8px 8px;
          background-repeat: no-repeat;
          box-shadow: none;
        }

        .tcf-field input::placeholder {
          color: #666666;
        }

        .tcf-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          width: min(100%, 220px);
          min-height: 60px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(226, 73, 97, 0.96), rgba(214, 90, 60, 0.96));
          color: #ffffff;
          font-size: 1.05rem;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.03em;
          box-shadow: 0 8px 14px rgba(214, 90, 60, 0.18);
          justify-self: center;
          grid-column: 1 / -1;
        }

        .tcf-results {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 12px;
        }

        .tcf-result {
          display: grid;
          grid-template-columns: 54px 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 12px 14px;
          border: 1px solid var(--tcf-line);
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
        }

        .tcf-swatch {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          display: block;
        }

        .tcf-result-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tcf-code,
        .tcf-vehicle,
        .tcf-finish,
        .tcf-flag {
          font-size: 0.8rem;
          color: var(--tcf-muted);
        }

        .tcf-whatsapp {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(40, 159, 91, 0.12);
          color: #d8ffe8;
          padding: 0.65rem 0.9rem;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .tcf-empty,
        .tcf-locate {
          margin-top: 18px;
          border: 1px solid var(--tcf-line);
          border-radius: 12px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.02);
        }

        .tcf-empty p,
        .tcf-locate p,
        .tcf-locate li {
          color: var(--tcf-muted);
        }

        .tcf-locate summary {
          cursor: pointer;
          font-weight: 700;
          color: var(--tcf-paper);
        }

        .tcf-disclaimer {
          margin-top: 18px;
          font-size: 0.78rem;
          color: var(--tcf-muted);
        }

        @media (max-width: 640px) {
          .tcf {
            padding: 18px;
          }

          .tcf-form {
            grid-template-columns: 1fr;
          }

          .tcf-field--wide,
          .tcf-form--code {
            grid-column: auto;
            grid-template-columns: 1fr;
          }

          .tcf-result {
            grid-template-columns: 46px 1fr;
          }

          .tcf-whatsapp {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </section>
  );
}